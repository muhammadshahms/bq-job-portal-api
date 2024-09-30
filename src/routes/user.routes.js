import { Router } from 'express';
import {
    companyAndJob,
    forgetPassword,
    login,
    logout,
    registerUser,
    resendOTP,
    skillsMatch,
    updatePassword,
    // userProfile,
    verifyForgetOTP,
    verifyOTP,
    userData,
    updateProfile
    // getUserAndCompany
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { singleResume } from '../middlewares/multer.middleware.js';

const router = Router();



// router.post('/getUserAndComp',userData)
// router.get('userProfile',userProfile)


// Secure routes

router.get('/logout', verifyJWT, logout)

export default router;