import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { generateOTP, validatePassword } from "../utils/helper.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/features.js"
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
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
const a ={ email, companyName, password, confirmPassword};
    // Check if all required fields are provided
    console.log(a);
    if (!email || !companyName || !password || !confirmPassword) {
        return next(new ApiError(400, "All fields are required"));
    }


    // Check if the company already exists in the main Company collection
    const companyMail = await Company.findOne({ email });    
    const userMail = await User.findOne({ email });    
    if (companyMail || userMail) {
        return next(new ApiError(400, "Company Or User  is already registered with this email."));
    }

    // Validate password
    const { isValid, errorMessage } = validatePassword(password);
    if (!isValid) {
        return next(new ApiError(400, errorMessage));
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return next(new ApiError(400, "Passwords do not match"));
    }

    // Check if the company name already exists in the temporary collection
    const existingCompany = await TemporaryCompany.findOne({ companyName });
    if (existingCompany) {
        // If the OTP has expired, regenerate OTP and notify the user
        if (existingCompany.otpExpires < Date.now()) {
            const otp = generateOTP();
            const otpExpires = Date.now() + 60 * 1000; // 1-minute OTP expiration

            existingCompany.otp = otp;
            existingCompany.otpExpires = otpExpires;
            await existingCompany.save();

            await sendOTPEmail(email, otp);

            return res.status(200).json(
                new ApiResponse(
                    200,
                    {},
                    "OTP has expired. A new OTP has been sent. Please verify it."
                )
            );
        }

        // If the OTP is still valid, notify the user
        return next(new ApiError(400, "OTP verification pending. Please verify your OTP."));
    }

    // Generate a new OTP and create a temporary company
    const otp = generateOTP();
    const otpExpires = Date.now() + 60 * 1000; // 1-minute OTP expiration

    await TemporaryCompany.create({
        email,
        companyName,
        password,
        otp,
        otpExpires,
    });

    await sendOTPEmail(email, otp);

    
        return res.status(201).json(
            new ApiResponse(
                201,
                {},
                "Company registered successfully. OTP sent to your email. Please verify it."
            )
        );
   
});

const verifyOTP = asyncHandler(async (req, res, next) => {
    const {email ,otp } = req.body;

    if (!email || !otp) {
        return next(new ApiError(400, "Email and OTP are required"));
    }

    const tempCompany = await TemporaryCompany.findOne({ email });

    if (!tempCompany ) {
        return next(new ApiError(404, `Company not found${tempCompany}`));
    }

    // Check if OTP matches
    if (tempCompany.otp != otp) {
        return next(new ApiError(400, `Invalid OTP${tempCompany.otp}`));
    }

    // Check if OTP has expired
    if (tempCompany.otpExpires < Date.now()) {
        return next(new ApiError(400, "OTP has expired"));
    }

    // Create the company if OTP is valid and not expired
    let newCompany;
    try {
        const company = await Company.create({
            email: tempCompany.email,
            password: tempCompany.password,
            companyName: tempCompany.companyName,
            isVerified: true,
        });

        // Sanitize the created company object for response
        newCompany = {
            _id: company._id,
            email: company.email,
            companyName: company.companyName,
            isVerified: company.isVerified,
        };
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Company name already exists" });
        }
        return res.status(500).json({ message: "Internal server error" });
    }

    // Delete the temporary company after successful verification
    await TemporaryCompany.deleteOne({ email });

    // Return the newly created company object
    res.status(200).json(new ApiResponse(200, { newCompany }, "Company verified successfully"));
});
const createProfile = asyncHandler(async(req, res, next) => {
    const {avatar, companyName, email, contactNumber, location} = res.body;
    if(!avatar || !email || !companyName || !contactNumber || !location){
        return next(new ApiError(400, "All fields are required"));
    }
    const company = await Company.findOneAndUpdate({ email }, {avatar, companyName, email, contactNumber, location}, {new: true, upsert: true});
    if(!company){
        return next(new ApiError(500, "Failed to create company profile"));
    }
    res.status(200).json(
        new ApiResponse(200, 
            {company}, 
            "Company profile created successfully"));
});

const login = asyncHandler(async (req, res, next) => {

    const { email, password } = req.body;

    if (!email || !password)
        return next(new ApiError(400, "All fields are required"));

    const company = await Company.findOne({ email });

    if (!company)
        return next(new ApiError(401, "Company not found"));

    if (!company.isVerified)
        return next(new ApiError(401, "Company is not verified"));

    const isPasswordValid = await company.isPasswordCorrect(password);

    if (!isPasswordValid)
        return next(new ApiError(401, "Invalid credentials"));

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(company?._id);

    const loggedIn = await Company.findById(company?._id).select("-password -refreshToken");

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
                    company: loggedIn, accessToken, refreshToken
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

const companies = asyncHandler(async (req, res, next) => {
    const companyData = await Company.find(); // Assuming you are fetching companies from the database

    if (!companyData) {
        return next(new ApiError(404, "No companies found"));
    }
    
    res.status(200).json({
        companyData
    });
});

const updateProfile = asyncHandler(async (req, res, next) => {

    const {
      email,
      companyName,
      description,
      noOfEmployees,
      industry,
      contactNumber,
      location,     
    } = req.body;
  
    if (!email || !companyName || !description || !noOfEmployees || !industry || !contactNumber || !location) {
      return next(new ApiError(400, "All fields are required"));
    }

    const company = await Company.findByIdAndUpdate(
        req?.company?._id,
       {
        $set: {
            email,
            companyName,
            description,
            noOfEmployees,
            industry,
            contactNumber,
            location,
        }
       },
         {
             new: true
         }
    ).select("-password -refreshToken");

    if (!company) {
        return next(new ApiError(404, "Company not found"));
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, company, "Account details updated successfully")
        );
    
  });
  
  const logout = asyncHandler(async (req, res, next) => {

    await Company.findByIdAndUpdate(
        req.company._id,
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
        .json(new ApiResponse(200, {}, "Company logged Out"))

})
  
export {
    register,
    verifyOTP,
    createProfile,
    login,
    resendOTP,
    updateProfile,
    companies ,
    logout
};
