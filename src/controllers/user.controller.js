import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateOTP, validatePassword } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { TemporaryUser } from "../models/TemporaryUser.model.js";
import { hash } from "bcrypt";

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
 
    const {               
        banoQabilId, 
        email, 
        password, 
        confirmPassword, 
    } = req.body;

    if (!banoQabilId || !email || !password || !confirmPassword) {
        return next(new ApiError(400, "All required fields must be provided"));
    }

    // const isBanoQabilStudent = await User.findOne({ banoQabilId });
    // if (isBanoQabilStudent) {
    //     return next(new ApiError(400, "You are not a BanoQabil student"));
    // }

    const isUserExists = await User.findOne({email});

    if (isUserExists) {
        return next(new ApiError(400, "User already exists"));
    }

    const { isValid, errorMessage } = validatePassword(password);
    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    if (password !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    const existingTempUser = await TemporaryUser.findOne({ email });
    console.log(existingTempUser)
    if (existingTempUser) {
        if (existingTempUser.otpExpires < Date.now()) {
            // If OTP expired, generate a new one
            const otp = generateOTP();
            const otpExpires = Date.now() + 60 * 1000;

            existingTempUser.otp = otp;
            existingTempUser.otpExpires = otpExpires;
            await existingTempUser.save();

            await sendOTPEmail(email, otp);

            return next(
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
        public_id: result?.public_id,
        url: result?.secure_url,
    };

    await TemporaryUser.create({
        banoQabilId,
        email,
        password,
        resume,
        otp,
        otpExpires,
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    // Respond with success message
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

    if (tempUser.otp !==otp) {
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

const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ApiError(400, "All fields are required"));
    }

    const user = await User.findOne({ 
        $or: [{banoQabilId: email}, {email}, {phoneNumber: email}]
     }).select("-password -refreshToken -otp -otpExpires");

    if (!user) {
        return next(new ApiError(401, "User not found"));
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return next(new ApiError(401, "Invalid credentials"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user?._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user }, "User logged In Successfully"));
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

    if (!user) {
        return next(new ApiError(404, "User not found"));
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000;

    if (user) {
        user.otp = otp;
        user.otpExpires = otpExpires;
        user.isVerified = false;
        await user.save();
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

    if (!user) {
        return next(new ApiError(404, "User not found"));
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

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "OTP verified successfully, you can now reset your password"));
});

const updatePassword = asyncHandler(async (req, res, next) => {
    const { newPassword, confirmPassword, email } = req.body;

    if (!newPassword || !confirmPassword || !email ) {
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
        { email},
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    const company = await Company.findOneAndUpdate(
        { email },
        { password: await hash(newPassword, 10), isVerified: true },
        { new: true }
    );

    if (!user) {
        return next(new ApiError(401, "User not found"));
    }

    if (!company) {
        return next(new ApiError(401, "Company not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const skillsMatch = asyncHandler(async (req, res, next) => {
  
    const { skills } = req.body;

    let skillArray = [];
    
    if (skills && skills.length > 0) {
        skillArray = skills.map(skill => skill.trim());
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let matchingJobs;
    
    if (skillArray.length > 0) {
        matchingJobs = await Job.find({
            skills: { $in: skillArray }
        })
        .skip(skip)
        .limit(limit);
    } else {
        matchingJobs = await Job.find()
        .skip(skip)
        .limit(limit);
    }

    if (!matchingJobs.length) {
        return next(new ApiError(404, `No Job Match your Skills`));
    }

    const totalJobs = await Job.countDocuments();
    const totalJobsPages = Math.ceil(totalJobs / limit);

    return res.status(200).json(
        new ApiResponse(200, {
            matchingJobs: matchingJobs,
            userPagination: {
                totalCount: totalJobs,
                totalPages: totalJobsPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        })
    );
});

const filterData = asyncHandler(async (req, res, next) => {
    const { job_type, location, last_date } = req.query;

    // Check if none of the filter parameters are provided
    if (!job_type && !location && !last_date) {
        return res.status(400).json({ message: 'At least one filter parameter is required' });
    }

    // Check if at least one filter has a valid length property
    if ((job_type && job_type.length === 0) || 
        (location && location.length === 0) || 
        (last_date && last_date.length === 0)) {
        return next(new ApiError(404, 'No Jobs found'));
    }

    // Fetch jobs based on the query (assuming `Job` is your database model)
    const jobs = await Job.find({job_type, location, last_date});

    // Check if no jobs were found
    if (!jobs || jobs.length === 0) {
        return next(new ApiError(404, 'No Jobs found'));
    }

    // Return the filtered jobs
    res.json(jobs);
});

const userProfile = asyncHandler(async (req, res) => {
    const id = req.body.id;
    if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    const user = await User.findById(id).select('-password -refreshToken'); // exclude password and refreshToken
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

   
    res.json(user);
    // res.json(req.user);
    // res.json(req.user._id);
    // res.json(req.user.refreshToken);

})

const userData= asyncHandler(async(req, res, next)=>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;


    const users = await User.find().skip(skip).limit(limit);
    if ( !users.length) {
        return next(new ApiError(404, `No User found`));
    }
    const totalUsers = await User.countDocuments();
    const totalUsersPages = Math.ceil(totalUsers / limit);
    return res.status(200).json(
        new ApiResponse(200,{
            users: users,
            userPagination: {
                totalCount: totalUsers,
                totalPages: totalUsersPages,
                currentPage: page,
                itemsPerPage: limit,
            }}));

   
});

const updateProfile = asyncHandler(async (req, res, next) => {
    
    const { name, email, skills, education, phoneNumber } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
        return next(new ApiError(404, "User not found"));
    }

    user.name = name || "";
    user.education = education || "";
    user.phoneNumber = phoneNumber || "";

    if (skills && skills.length > 0) {
        user.skills = Array.isArray(skills) 
            ? [...new Set([...user.skills, ...skills])] 
            : [...user.skills, skills]; 
    }

    if (req?.file) {
        const file = req?.file?.path;
        const result = await uploadOnCloudinary(file);
        if (!result) return next(new ApiError(500, "Failed to upload resume"));
        user.resume = {
            public_id: result?.public_id,
            url: result?.secure_url,
        };

        await deleteOnCloudinary(user?.resume?.public_id);

    } else {
        user.resume = user.resume || { public_id: "", url: "" };
    }

    await user.save();

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
    filterData,
    // userProfile
    userData,
    aplicationForm,
    updateProfile
 };
