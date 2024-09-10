import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import { hash, compare } from 'bcrypt';

const companySchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    companyName: {
        type: String,
        lowercase: true,
        unique: true,
        required: true
    },
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    noOfEmployees: {
        type: Number,
        default: 0
    },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true })

// To perform encryption

companySchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // for checking password modification not to change everytime
    this.password = await hash(this.password, 10)
    next()
})

companySchema.methods.isPasswordCorrect = async function (password) {
    return await compare(password, this.password)
}

// Access Token
companySchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        companyName: this.companyName
    },
        process.env.COMPANY_ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

companySchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id
    },
        process.env.COMPANY_REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const Company = model("Company", companySchema)