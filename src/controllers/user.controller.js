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

    if (tempUser.otp !==otp) {
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

    if (!email || !password) {
        return next(new ApiError(400, "All fields are required"));
    }

    const user = await User.findOne({ email });
    const company = await Company.findOne({ email });

    if (!user && !company) {
        return next(new ApiError(401, "User or Company not found"));
    }

    const isPasswordValid = user ? await user.isPasswordCorrect(password) : false;
    const isCompanyPasswordValid = company ? await company.isPasswordCorrect(password) : false;

    if (!isPasswordValid && !isCompanyPasswordValid) {
        return next(new ApiError(401, "Invalid credentials"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user ? user._id : company._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user, company }, "User logged In Successfully"));
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
        return next(new ApiError(400, "Email is required"));
    }

    const user = await User.findOne({ email });
    const company = await Company.findOne({ email });

    // Check if neither user nor company exists
    if (!user && !company) {
        return next(new ApiError(404, "User or Company not found"));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    // Set OTP and expiry for user if exists
    if (user) {
        user.otp = otp;
        user.otpExpires = otpExpires;
        user.isVerified = false; // Optional: depending on your requirements
        await user.save();
    }

    // Set OTP and expiry for company if exists
    if (company) {
        company.otp = otp;
        company.otpExpires = otpExpires;
        company.isVerified = false; // Optional: depending on your requirements
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

    // Check if user exists and verify OTP expiration and validity
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

    // Check if company exists and verify OTP expiration and validity
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

    // Check if all required fields are provided
    if (!newPassword || !confirmPassword || !email ) {
        return next(new ApiError(400, "All fields are required"));
    }

    // Validate the new password
    const { isValid, errorMessage } = validatePassword(newPassword);
    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    // Update password for user
    const user = await User.findOneAndUpdate(
        { email},
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    // Update password for company
    const company = await Company.findOne(
        { email },
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    // Check if neither user nor company was found
    if (!user && !company) {
        return next(new ApiError(401, "User or Company not found"));
    }

    // Return success response
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

        // Split the skills into an array and trim whitespace
        const skillArray = skills.split(',').map(skill => skill.trim());

        // Find jobs that require at least one of the specified skills
        const matchingJobs = await Job.find({
            skills: { $in: skillArray }
        });

        if (matchingJobs.length === 0) {
            return res.status(404).json({ message: `No jobs found with specified skills: ${skills}` });
        }

        res.status(200).json({
            message: 'Jobs found',
            data: matchingJobs
        });
    } catch (error) {
        next(new ApiError(500, error.message)); // Use your custom error handler
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
const updateProfile = asyncHandler(async (req, res, next) => {
    // Get user data from request body
    const { name, email, skills, education, contactNumber, resume } = req.body;

    // Find the user by email
    let user = await User.findOne({ email });

    // If user is not found
    if (!user) {
        return next(new ApiError(404, "User not found"));
    }

    // Update user fields if provided
    if (name) user.name = name;
    if (skills) user.skills = skills;
    if (education) user.education = education;
    if (contactNumber) user.contactNumber = contactNumber;

    // If resume is provided, handle cloudinary upload and update
    if (resume) {
        const file = req.file?.path; // Assuming the resume file is sent via multipart form-data
        if (file) {
            const result = await uploadOnCloudinary(file);
            if (!result) return next(new ApiError(500, "Failed to upload resume"));
            user.resume = {
                public_id: result.public_id,
                url: result.url,
            };
        }
    }

    // Save updated user information
    await user.save();

    // Return the updated user details
    return res.status(200).json(
        new ApiResponse(200, { user }, "Profile updated successfully")
    );
});
const aplicationForm = asyncHandler(async( req, res, next)=>{
    const {name, email, contactNumber, resume, education, skills}=req.body;
    let user = await User.findOne({ email });
    if(!user){
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
    resendOTP,
    logout,
    forgetPassword,
    verifyForgetOTP,
    updatePassword,
    skillsMatch,
    // userProfile
    companyAndJob,
    userData,
    updateProfile
 };
