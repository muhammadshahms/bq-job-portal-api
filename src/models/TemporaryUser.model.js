import { hash } from 'bcrypt';
import { Schema, model } from "mongoose";

const TemporaryUserSchema = new Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        unique: true, // Ensure no two users can register with the same email
        index: true // For better optimization in searching context
    },
    title: {
        type: String,
        lowercase: true,
    },
    phoneNumber: {
        type: String,
        required: [true, "Phone number is required"],
        unique: true, // Ensure uniqueness for phone numbers
        index: true // For better optimization in searching context
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
}, { timestamps: true });

// Pre-save hook for password hashing
TemporaryUserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // Check if the password is modified

    try {
        this.password = await hash(this.password, 10);
        next();
    } catch (error) {
        next(new Error("Error hashing password")); // Handle hashing error
    }
});

export const TemporaryUser = model("TemporaryUser", TemporaryUserSchema);
