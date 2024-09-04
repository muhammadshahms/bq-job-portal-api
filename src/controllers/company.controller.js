import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { generateOTP } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { Company } from "../models/company.model.js";

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
}

const register = asyncHandler(async (req, res, next) => {

    const { companyName, email, password, confirmPassword } = req.body;

    if (!companyName || !email || !password || !confirmPassword)
        return next(new ApiError(400, "All fields are required"));

    if (password !== confirmPassword)
        return next(new ApiError(400, "Passwords do not match"));

    const existedUser = await Company.findOne({ email });

    if (existedUser)
        return next(new ApiError(400, "User already exists"));

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    const user = await Company.create({
        companyName,
        email,
        password,
        otp,
        otpExpires,
    });

    await sendOTPEmail(email, otp);

    const newUser = {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
    };

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                newUser,
                "Company registered successfully. OTP sent to your email. Please verify it.")
        );
});

const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp)
        return next(new ApiError(400, "All fields are required"));

    const user = await Company.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
    if (!user)
        return next(new ApiError(400, "Invalid OTP or OTP expired"));

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Company verified successfully' });
})

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

})

const resendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email)
        return next(new ApiError(400, "Phone Number required"));

    const user = await Company.findOne({ email });

    if (!user)
        return next(new ApiError(401, "User not found"));

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;

    await user.save();

    await sendOTPSMS(email, otp);

    res.status(200).json(
        new ApiResponse(
            200,
            {},
            "OTP sent to your email. Please verify it."
        )
    );

})


export {
    register,
    verifyOTP,
    login,
    resendOTP
}