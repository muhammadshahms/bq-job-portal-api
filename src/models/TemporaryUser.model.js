import { hash } from 'bcrypt';
import { Schema, model } from "mongoose";

const TemporaryUserSchema = new Schema({
    email: {
        type: Number,
        // required: true,
        lowercase: true,
        // index: true // For better optimization in searching context
    },
    title: {
        type: String,
        lowercase: true,
    },
    phoneNumber: {
        type: String,
        required: true,
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
}, { timestamps: true })

// To perform encryption

TemporaryUserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // for checking password modification not to change everytime
    this.password = await hash(this.password, 10)
    next()
})

export const TemporaryUser = model("TemporaryUser", TemporaryUserSchema)