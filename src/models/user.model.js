import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import { hash, compare } from 'bcrypt';

const userSchema = new Schema({
    banoQabilId: {
        type: String,
        // required: true,
        // unique: true,
    },
    fullName: {
        type: String,
    },
    email: {
        type: String,
        // required: true,
        // unique: false,
        // lowercase: true,
        // index: true // For better optimization in searching context
    },
    title: {
        type: String,
        lowercase: true,
    },
    gender: {
        type: String,
    },
    phoneNumber: {
        type: String,
        // required: true,
        // unique: true,
        // index: true // For better optimization in searching context
    },
    avatar: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    resume: {
        public_id: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    resendAttempts: {
        type: Number,
        default: 0
    },
    lastResend: {
        type: Date,   
        default: Date.now
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

// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next(); // for checking password modification not to change everytime
//     this.password = await hash(this.password, 10)
//     next()
// })

userSchema.methods.isPasswordCorrect = async function (password) {
    return await compare(password, this.password)
}

// Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        title: this.title,
        phoneNumber: this.phoneNumber
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = model("User", userSchema)