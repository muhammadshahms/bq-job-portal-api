import { hash } from 'bcrypt';
import { Schema, model , mongoose } from "mongoose";

const TemporaryCompanySchema = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
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
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    description:{
        type: String,
        // required: true,
    },
    contactNumber:{
        type: String,
        // required: true,
    },
    location:{
        type: String,
        // required: true,
    },
    roll:{
        type: String,
        // required: true,
        enum: ['company', 'student'],
        default: 'company'
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

TemporaryCompanySchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // for checking password modification not to change everytime
    this.password = await hash(this.password, 10)
    next()
})

export const TemporaryCompany = model("TemporaryCompany", TemporaryCompanySchema)