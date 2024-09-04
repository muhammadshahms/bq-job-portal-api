import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateOTP } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { TemporaryUser } from "../models/TemporaryUser.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validBeforeSave: false }) // for preventing to update other fields

        return { accessToken, refreshToken }

    } catch (error) {
        throw new Error(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { phoneNumber, password, confirmPassword } = req.body;

    if (!phoneNumber || !password || !confirmPassword)
        return next(new ApiError(400, "All fields are required"));

    if (password !== confirmPassword)
        return next(new ApiError(400, "Passwords do not match"));

    const existingTempUser = await TemporaryUser.findOne({ phoneNumber });

    if (existingTempUser) {
        if (existingTempUser.otpExpires < Date.now()) {

            const otp = generateOTP();
            const otpExpires = Date.now() + 60 * 1000;

            existingTempUser.otp = otp;
            existingTempUser.otpExpires = otpExpires;
            await existingTempUser.save();

            await sendOTPSMS(phoneNumber, otp);

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

    const file = req?.file?.path;
    if (!file)
        return next(new ApiError(400, "Please upload resume"));

    const result = await uploadOnCloudinary(file);

    if (!result)
        return next(new ApiError(500, "Failed to upload resume"));

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    const resume = {
        public_id: result?.public_id,
        url: result?.url,
    };

    await TemporaryUser.create({
        phoneNumber,
        password,
        resume,
        otp,
        otpExpires,
    });

    await sendOTPSMS(phoneNumber, otp);

    return res.status(201).json(
        new ApiResponse(
            201,
            "User registered successfully. OTP sent to your phoneNumber. Please verify it.")
    );
});

const verifyOTP = asyncHandler(async (req, res, next) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return next(new ApiError(400, "Phone number and OTP are required"));
    }

    const tempUser = await TemporaryUser.findOne({ phoneNumber, otp, otpExpires: { $gt: Date.now() } });

    if (!tempUser) {
        return next(new ApiError(400, "Invalid OTP or OTP expired"));
    }

    const resume = {
        public_id: tempUser?.resume?.public_id,
        url: tempUser?.resume?.url,
    };

    const user = await User.create({
        phoneNumber: tempUser.phoneNumber,
        password: tempUser.password,
        resume,
        otp: tempUser.otp,
        otpExpires: tempUser.otpExpires,
    });

    await TemporaryUser.deleteOne({ phoneNumber });

    res.status(200).json(new ApiResponse(200, { user }, "User verified successfully"));
});

const login = asyncHandler(async (req, res, next) => {

    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password)
        return next(new ApiError(400, "All fields are required"));

    const user = await User.findOne({ phoneNumber });

    if (!user)
        return next(new ApiError(401, "User not found"));

    if (!user.isVerified)
        return next(new ApiError(401, "User is not verified"));

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid)
        return next(new ApiError(401, "Invalid credentials"));

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedIn = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedIn, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const resendOTP = asyncHandler(async (req, res, next) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return next(new ApiError(400, "Phone Number required"));
    }

    const user = await TemporaryUser.findOne({ phoneNumber });

    if (!user) {
        return next(new ApiError(401, "User Already Verified"));
    }

    const resendAttempts = user.resendAttempts || 0;
    const currentTime = Date.now();
    const lastResendTime = new Date(user.lastResend).getTime();

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

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.lastResend = currentTime;
    user.resendAttempts += 1;

    await user.save();

    await sendOTPSMS(phoneNumber, otp);

    return res.status(200).json({
        message: 'OTP resent successfully',
        resendAttempts: user.resendAttempts,
        nextResendIn: `${requiredWaitTime + 5} minutes`
    });
});

const logout = asyncHandler(async (req, res, next) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // value to update
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})

export {
    registerUser,
    verifyOTP,
    login,
    resendOTP,
    logout
}