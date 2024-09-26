import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateOTP, validatePassword } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { TemporaryUser } from "../models/TemporaryUser.model.js";
import { hash } from "bcrypt";

// TODO: Otp send with email and number
// TODO: OTP encryption

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
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword)
        return next(new ApiError(400, "All fields are required"));

    const { isValid, errorMessage } = validatePassword(password);

    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (password !== confirmPassword)
        return next(new ApiError(400, "Passwords do not match"));

    const existingTempUser = await TemporaryUser.findOne({ email });

    if (existingTempUser) {
        if (existingTempUser.otpExpires < Date.now()) {

            const otp = generateOTP();
            const otpExpires = Date.now() + 60 * 1000;

            existingTempUser.otp = otp;
            existingTempUser.otpExpires = otpExpires;
            await existingTempUser.save();

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
        email,
        password,
        resume,
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

    const tempUser = await TemporaryUser.findOne({ email });

    if (!tempUser) {
        return next(new ApiError(400, "User not found"));
    }

    if (tempUser.otpExpires < Date.now()) {
        return next(new ApiError(400, "OTP has expired"));
    }

    if (tempUser.otp ===!otp) {
        return next(new ApiError(400, "Invalid OTP"));
    }

    const resume = {
        public_id: tempUser?.resume?.public_id,
        url: tempUser?.resume?.url,
    };

    const user = await User.create({
        email: tempUser.email,
        password: tempUser.password,
        resume,
        otp: tempUser.otp,
        otpExpires: tempUser.otpExpires,
        isVerified: true,
    });

    const newUser = {
        _id: user._id,
        email: user.email,
        name: user.name,
        resume: {
            public_id: user.resume.public_id,
            url: user.resume.url,
        },
        isVerified: user.isVerified,
    }

    await TemporaryUser.deleteOne({ email });

    res.status(200).json(new ApiResponse(200, { newUser }, "User verified successfully"));
});

const login = asyncHandler(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password)
        return next(new ApiError(400, "All fields are required"));

    // const user = await User.findOne({ email });
    // const company = await company.findOne({ email });

    if (!User.email, !Company.email)
        return next(new ApiError(401, "User or Company not found"));

    if (!user.isVerified,!company.isVerified)
        return next(new ApiError(401, "User is not verified"));

    const isPasswordValid = await user.isPasswordCorrect(password);
    const isCompanyPasswordValid = await company.isPasswordCorrect(password);

    if (!isPasswordValid,isCompanyPasswordValid)
        return next(new ApiError(401, "Invalid credentials"));

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id,company._id);

    const loggedIn = await User.findById(user._id).select("-password -refreshToken");
    const companyloggedIn = await company.findById(company._id).select("-password -refreshToken");

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
                    user: loggedIn,companyloggedIn, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const resendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ApiError(400, "Phone Number required"));
    }

    const user = await TemporaryUser.findOne({ email });

    if (!user) {
        return next(new ApiError(401, "User Already Verified"));
    }

    if (user.otpExpires > Date.now()) {
        return next(new ApiError(401, "OTP is still valid. Wait for a minute before resending OTP."));
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

    await sendOTPEmail(email, otp);

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

const forgetPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ApiError(400, "Phone Number required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ApiError(401, "User not found"));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;

    user.isVerified = false;

    await user.save();

    await sendOTPEmail(email, otp);

    return res.status(200).json({
        message: 'OTP sent successfully',
    });
});

const verifyForgetOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return next(new ApiError(400, "Phone number and OTP are required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new ApiError(400, "User not found"));
    }

    if (user.otpExpires < Date.now()) {
        return next(new ApiError(400, "OTP has expired"));
    }

    if (user.otp !== otp) {
        return next(new ApiError(400, "Invalid OTP"));
    }

    user.isVerified = true;
    await user.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "OTP verified successfully, you can now reset your password")
        );
});

const updatePassword = asyncHandler(async (req, res, next) => {
    const { newPassword, confirmPassword, email, otp } = req.body;

    if (!newPassword || !confirmPassword || !email || !otp) {
        return next(new ApiError(400, "All fields are required"));
    }

    const { isValid, errorMessage } = validatePassword(newPassword);

    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (newPassword !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    const user = await User.findOneAndUpdate({ email, otp }, {
        password: await hash(newPassword, 10),
        isVerified: true,
    }, { new: true });

     if (!user) {
        return next(new ApiError(401, "User not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));

});
const skillsMatch = asyncHandler(async (req, res, next) => {
    try {
        const { skills } = req.body;
        if (!skills) {
            return res.status(400).json({ message: 'Skills query parameter is required' });
        }

        const skillArray = skills.split(',');
        const matchingUsers = await User.find({
            skills: { $in: skillArray }
        });

        if (matchingUsers.length === 0) {
            return res.status(404).json({ message: `No users found with ${skills} skills` });
        }

        res.status(200).json(matchingUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// const userProfile = asyncHandler(async (req, res) => {
//     const id = req.body.id;
//     if (!id) {
//         return res.status(400).json({ message: 'User ID is required' });
//     }
//     const user = await User.findById(id).select('-password -refreshToken'); // exclude password and refreshToken
//     if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//     }

   
//     res.json(user);
//     // res.json(req.user);
//     // res.json(req.user._id);
//     // res.json(req.user.refreshToken);

// })
const companyAndJob = asyncHandler(async (req, res, next) => {
    // Get pagination parameters from the query string, default to page 1 and 10 items per page
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    // Calculate the number of items to skip
    const skip = (page - 1) * limit;

    // Fetch company and job data with pagination
    const companys = await Company.find().skip(skip).limit(limit);
    const jobs = await Job.find().skip(skip).limit(limit);

    // Check if either companys or jobs is not found
    if (!companys.length && !jobs.length) {
        return next(new ApiError(404, `No companies or jobs found`));
    }

    // Get total counts for companies and jobs
    const totalCompanies = await Company.countDocuments();
    const totalJobs = await Job.countDocuments();

    // Calculate total pages
    const totalCompanyPages = Math.ceil(totalCompanies / limit);
    const totalJobPages = Math.ceil(totalJobs / limit);

    // Return the response with both company and job data, and pagination info
    return res.status(200).json(
        new ApiResponse(200,{
            companies: companys,
            jobs: jobs,
            companyPagination: {
                totalCount: totalCompanies,
                totalPages: totalCompanyPages,
                currentPage: page,
                itemsPerPage: limit,
            },
            jobPagination: {
                totalCount: totalJobs,
                totalPages: totalJobPages,
                currentPage: page,
                itemsPerPage: limit,
            },
        },
        `Data fetched successfully`
    )
    );
});
const userData= asyncHandler(async(req, res, next)=>{
    const user = await User.find();
    if(!user){
        return next(new ApiError(404, "No users found"));
    }
    return res.status(200).json(
        new ApiResponse(user));
});



export {
    registerUser,
    verifyOTP,
    login,
    resendOTP,
    logout,
    forgetPassword,
    verifyForgetOTP,
    updatePassword,
    skillsMatch,
    // userProfile
    companyAndJob,
    userData
 };
