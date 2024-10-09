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
import { companyGenerateAccessAndRefreshTokens } from "./company.controller.js";
import { hash } from "bcrypt";



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating user tokens:", error);
        throw new ApiError(500, "Something went wrong while generating user tokens");
    }
};
const registerUser = asyncHandler(async (req, res, next) => {
    const {
        banoQabilId,
        email,
        password,
        confirmPassword
    } = req.body;

    if (!banoQabilId || !email || !password || !confirmPassword) {
        return next(new ApiError(400, "All required fields must be provided"));
    }

    const studentId = await User.findOne({ banoQabilId });
    if (studentId) {
        return next(new ApiError(400, "Student ID already exists"));
    }

    

    const user = await User.findOne({ email });
    if (user) {
        return next(new ApiError(400, "Email already exists"));
    }

    const { isValid, errorMessage } = validatePassword(password);
    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (password !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

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
                new ApiResponse(200, {}, "OTP expired. A new OTP has been sent. Please verify it.")
            );
        }

        return next(new ApiError(400, "OTP verification pending. Please verify your OTP."));
    }

    const file = req?.file?.path;
    if (!file) {
        return next(new ApiError(400, "Please upload your resume"));
    }

    const result = await uploadOnCloudinary(file);
    if (!result) {
        return next(new ApiError(500, "Failed to upload resume"));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    const resume = {
        public_id: result.public_id,
        url: result.url,
    };

    await TemporaryUser.create({
        banoQabilId,
        email,
        password: await hash(password, 10),
        // skills,
        // education,
        resume,
        otp,
        otpExpires,
    });

    await sendOTPEmail(email, otp);

    return res.status(201).json(
        new ApiResponse(201, {}, "User registered successfully. OTP sent to your email. Please verify it.")
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

    if (tempUser.otp !== otp) {
        return next(new ApiError(400, "Invalid OTP"));
    }

    const resume = {
        public_id: tempUser?.resume?.public_id,
        url: tempUser?.resume?.url,
    };

    const user = await User.create({
        banoQabilId: tempUser.banoQabilId,
        name: tempUser.name,
        email: tempUser.email,
        password: tempUser.password,
        phoneNumber: tempUser.phoneNumber,
        skills: tempUser.skills,
        education: tempUser.education,
        resume,
        otp: tempUser.otp,
        otpExpires: tempUser.otpExpires,
        isVerified: true,
    });

    const newUser = {
        _id: user._id,
        banoQabilId: user.banoQabilId,
        name: user.name,
        email: user.email,
        skills: user.skills,
        name: user.name,
        phoneNumber: user.phoneNumber,
        education: user.education,
        resume: {
            public_id: user.resume.public_id,
            url: user.resume.url,
        },
        isVerified: user.isVerified,
    }

    await TemporaryUser.deleteOne({ email });

    res.status(200).json(new ApiResponse(200, { newUser }, "User verified successfully"));
});
const createUserProfile = asyncHandler(async (req, res, next) => {


    const { name, email, phoneNumber, skills, gender } = req.body;

    let avatarUrl = null;
    if (req.file) {
        const result = await uploadOnCloudinary(req.file.path); // Assuming uploadOnCloudinary returns an object with a URL
        if (!result) {
            return next(new ApiError(500, "Failed to upload avatar"));
        }
        avatarUrl = result.url;
    }

    if (!name || !email || !phoneNumber || !skills || !gender) {
        return next(new ApiError(400, "All fields are required"));
    }

    const user = await User.findOneAndUpdate(
        { email },
        { avatar: avatarUrl, name, email, phoneNumber, skills, gender },
        { new: true, upsert: true }
    );

    if (!user) {
        return next(new ApiError(400, "User not found or could not be created"));
    }

    res.status(200).json({
        success: true,
        user,
        message: "User Profile created or updated successfully",
    });
});
const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ApiError(400, "All fields are required"));
    }

    let user, company;

    try {
        user = await User.findOne({ email });
        company = await Company.findOne({ email });

        if (!user && !company) {
            return next(new ApiError(401, "User or Company not found"));
        }
    } catch (error) {
        console.error("Error finding user or company:", error);
        return next(new ApiError(500, "Internal Server Error while searching for user or company"));
    }

    const isPasswordValid = user ? await user.isPasswordCorrect(password) : false;
    const isCompanyPasswordValid = company ? await company.isPasswordCorrect(password) : false;

    if (!isPasswordValid && !isCompanyPasswordValid) {
        return next(new ApiError(401, "Invalid credentials"));
    }

    try {
        let accessToken, refreshToken;
        if (user) {
            ({ accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id));
        } else if (company) {
            ({ accessToken, refreshToken } = await companyGenerateAccessAndRefreshTokens(company._id));
        }

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict'
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(new ApiResponse(200, { user, company }, "User logged in successfully"));

    } catch (error) {
        console.error("Error generating tokens:", error);
        return next(new ApiError(500, "Internal Server Error while generating tokens"));
    }
});
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
                refreshToken: 1
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
        return next(new ApiError(400, "Email is required"));
    }

    const user = await User.findOne({ email });
    const company = await Company.findOne({ email });

    if (!user && !company) {
        return next(new ApiError(404, "User or Company not found"));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    if (user) {
        user.otp = otp;
        user.otpExpires = otpExpires;
        user.isVerified = false;
        await user.save();
    }

    if (company) {
        company.otp = otp;
        company.otpExpires = otpExpires;
        company.isVerified = false;
        await company.save();
    }

    await sendOTPEmail(email, otp);

    return res.status(200).json({
        message: 'OTP sent successfully',
    });
});
const verifyForgetOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return next(new ApiError(400, "Email and OTP are required"));
    }

    const user = await User.findOne({ email });
    const company = await Company.findOne({ email });

    if (!user && !company) {
        return next(new ApiError(404, "User or Company not found"));
    }

    if (user) {
        if (user.otpExpires < Date.now()) {
            return next(new ApiError(400, "OTP has expired for the user"));
        }

        if (user.otp !== otp) {
            return next(new ApiError(400, "Invalid OTP for the user"));
        }

        user.isVerified = true;
        await user.save();
    }

    if (company) {
        if (company.otpExpires < Date.now()) {
            return next(new ApiError(400, "OTP has expired for the company"));
        }

        if (company.otp !== otp) {
            return next(new ApiError(400, "Invalid OTP for the company"));
        }

        company.isVerified = true;
        await company.save();
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP verified successfully, you can now reset your password"));
});
const updatePassword = asyncHandler(async (req, res, next) => {
    const { newPassword, confirmPassword, email } = req.body;

    if (!newPassword || !confirmPassword || !email) {
        return next(new ApiError(400, "All fields are required"));
    }

    const { isValid, errorMessage } = validatePassword(newPassword);
    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (newPassword !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    const user = await User.findOneAndUpdate(
        { email },
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    const company = await Company.findOne(
        { email },
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    if (!user && !company) {
        return next(new ApiError(401, "User or Company not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const filterData = asyncHandler(async (req, res, next) => {
    const { job_type, location, last_date } = req.body;

    if (!job_type && !location && !last_date) {
        return res.status(400).json({ message: 'At least one filter parameter is required' });
    }

    let query = {};

    if (job_type) query.job_type = job_type;
    if (location) query.location = location;
    if (last_date) query.last_date = last_date;

    if ((job_type && job_type.length === 0) ||
        (location && location.length === 0) ||
        (last_date && last_date.length === 0)) {
        return next(new ApiError(404, 'No Jobs found'));
    }

    const jobs = await Job.find(query);

    if (!jobs || jobs.length === 0) {
        return next(new ApiError(404, 'No Jobs found'));
    }

    res.json(jobs);
});
const companyAndJob = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const skip = (page - 1) * limit;

    const companys = await Company.find().skip(skip).limit(limit);
    const jobs = await Job.find().skip(skip).limit(limit);

    if (!companys.length && !jobs.length) {
        return next(new ApiError(404, `No companies or jobs found`));
    }

    const totalCompanies = await Company.countDocuments();
    const totalJobs = await Job.countDocuments();

    const totalCompanyPages = Math.ceil(totalCompanies / limit);
    const totalJobPages = Math.ceil(totalJobs / limit);

    return res.status(200).json(
        new ApiResponse(200, {
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
const userData = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;


    const users = await User.find().skip(skip).limit(limit);
    if (!users.length) {
        return next(new ApiError(404, `No User found`));
    }
    const totalUsers = await User.countDocuments();
    const totalUsersPages = Math.ceil(totalUsers / limit);
    return res.status(200).json(
        new ApiResponse(200, {
            users: users,
            userPagination: {
                totalCount: totalUsers,
                totalPages: totalUsersPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        }));


});
const updateProfile = asyncHandler(async (req, res, next) => {
    const { name, email, skills, education, phoneNumber, resume } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
        return next(new ApiError(404, "User not found"));
    }

    user.name = name || "";
    user.skills = skills || "";
    user.education = education || "";
    user.phoneNumber = phoneNumber || "";

    if (resume && req.file) {
        const file = req.file.path;
        const result = await uploadOnCloudinary(file);
        if (!result) return next(new ApiError(500, "Failed to upload resume"));
        user.resume = {
            public_id: result.public_id,
            url: result.url,
        };
    } else {
        user.resume = user.resume || { public_id: "", url: "" };
    }

    await user.save();

    return res.status(200).json(
        new ApiResponse(200, { user }, "Profile updated successfully")
    );
});
const aplicationForm = asyncHandler(async (req, res, next) => {
    const { name, email, contactNumber, resume, education, skills } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
        return next(new ApiError(404, "User not found"));
    }
    if (name) user.name = name;
    if (skills) user.skills = skills;
    if (education) user.education = education;
    if (contactNumber) user.contactNumber = contactNumber;
})


export {
    registerUser,
    verifyOTP,
    login,
    createUserProfile,
    resendOTP,
    logout,
    forgetPassword,
    verifyForgetOTP,
    updatePassword,
    filterData,
    companyAndJob,
    userData,
    aplicationForm,
    updateProfile
};
