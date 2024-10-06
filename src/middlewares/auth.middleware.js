import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { compareSync } from "bcrypt";
import { Company } from "../models/company.model.js";


export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            return next(new ApiError(401, "Unauthorized request"))
        }

        const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodeToken?._id).select("-password -refreshToken");

        if (!user) {
            return next(new ApiError(401, "Invalid Access Token"));
        }

        req.user = user;
        next();
    } catch (err) {
        return next(new ApiError(401, err?.message || "Invalid Access Token"));
    }

})

export const verifyCompany = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.c_accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            return next(new ApiError(401, "Unauthorized request"))
        }

        const decodeToken = jwt.verify(token, process.env.COMPANY_ACCESS_TOKEN_SECRET);

        const company = await Company.findById(decodeToken?._id).select("-password -refreshToken");

        if (!company) {
            return next(new ApiError(401, "Invalid Access Token"));
        }

        req.company = company;
        next();
    } catch (err) {
        return next(new ApiError(401, err?.message || "Invalid Access Token"));
    }

});
