import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { generateOTP, validatePassword } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { Company } from "../models/company.model.js";
import { TemporaryCompany } from "../models/tempCompany.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await Company.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validBeforeSave: false }) // for preventing to update other fields

        return { accessToken, refreshToken }

    } catch (error) {
        throw new Error(500, "Something went wrong while generating refresh and access token")
    }
};

const register = asyncHandler(async (req, res, next) => {
    const { email, companyName, password, confirmPassword } = req.body;

    if (!email || !companyName || !password || !confirmPassword)
        return next(new ApiError(400, "All fields are required"));

    const { isValid, errorMessage } = validatePassword(password);

    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (password !== confirmPassword)
        return next(new ApiError(400, "Passwords do not match"));

    const existingTempCompany = await TemporaryCompany.findOne({ email });

    if (existingTempCompany) {
        if (existingTempCompany.otpExpires < Date.now()) {

            const otp = generateOTP();
            const otpExpires = Date.now() + 60 * 1000;

            existingTempCompany.otp = otp;
            existingTempCompany.otpExpires = otpExpires;
            await existingTempCompany.save();

            await sendOTPEmail(email, otp);

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {},
                    "OTP has expired. A new OTP has been sent. Please verify it."
                )
            );
        }

        return next(new ApiError(400, "OTP verification pending. Please verify your OTP."));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    await TemporaryCompany.create({
        email,
        password,
        companyName,
        otp,
        otpExpires,
    });

    await sendOTPEmail(email, otp);

    return res.status(201).json(
        new ApiResponse(
            201,
            "User registered successfully. OTP sent to your email. Please verify it.")
    );
});

const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return next(new ApiError(400, "Email and OTP are required"));
    }

    const tempCompany = await TemporaryCompany.findOne({ email });

    if (!tempCompany) {
        return next(new ApiError(400, "Company not found"));
    }

    if (tempCompany.otpExpires < Date.now()) {
        return next(new ApiError(400, "OTP has expired"));
    }

    if (tempCompany.otp !== otp) {
        return next(new ApiError(400, "Invalid OTP"));
    }

    const company = await Company.create({
        email: tempCompany.email,
        password: tempCompany.password,
        companyName: tempCompany.companyName,
        otp: tempCompany.otp,
        otpExpires: tempCompany.otpExpires,
        isVerified: true,
    });

    const newCompany = {
        _id: company._id,
        email: company.email,
        name: company.name,
        companyName: company.companyName,
        isVerified: company.isVerified,
    }

    await TemporaryCompany.deleteOne({ email });

    res.status(200).json(new ApiResponse(200, { newCompany }, "Company verified successfully"));
});

const login = asyncHandler(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password)
        return next(new ApiError(400, "All fields are required"));

    const user = await Company.findOne({ email });

    if (!user)
        return next(new ApiError(401, "Company not found"));

    if (!user.isVerified)
        return next(new ApiError(401, "Company is not verified"));

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid)
        return next(new ApiError(401, "Invalid credentials"));

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedIn = await Company.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("c_accessToken", accessToken, options)
        .cookie("c_refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedIn, accessToken, refreshToken
                },
                "Company logged In Successfully"
            )
        )

});

const resendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ApiError(400, "Emaiil required"));
    }

    const company = await TemporaryCompany.findOne({ email });

    if (!company) {
        return next(new ApiError(401, "Company Already Verified"));
    }

    if (company.otpExpires > Date.now()) {
        return next(new ApiError(401, "OTP is still valid. Wait for a minute before resending OTP."));
    }

    const resendAttempts = company.resendAttempts || 0;
    const currentTime = Date.now();
    const lastResendTime = new Date(company.lastResend).getTime();

    // Calculate the time difference in minutes
    const differenceInMinutes = (currentTime - lastResendTime) / (60 * 1000);

    const baseWaitTime = 1;
    const additionalWaitTime = resendAttempts * 5;
    const requiredWaitTime = (baseWaitTime + additionalWaitTime) - 1;

    if (differenceInMinutes < requiredWaitTime) {
        const remainingTime = requiredWaitTime - differenceInMinutes;
        return next(new ApiError(429, `Please wait ${Math.ceil(remainingTime)} minutes before resending OTP again.`));
    }

    const otp = generateOTP();
    const otpExpires = currentTime + 60 * 1000;

    company.otp = otp;
    company.otpExpires = otpExpires;
    company.lastResend = currentTime;
    company.resendAttempts += 1;

    await company.save();

    await sendOTPEmail(email, otp);

    return res.status(200).json({
        message: 'OTP resent successfully',
        resendAttempts: company.resendAttempts,
        nextResendIn: `${requiredWaitTime + 5} minutes`
    });
});


export {
    register,
    verifyOTP,
    login,
    resendOTP,
}