import { Router } from 'express';
import {
    companyAndJob,
    forgetPassword,
    login,
    logout,
    registerUser,
    resendOTP,
    updatePassword,
    verifyForgetOTP,
    verifyOTP,
    filterData,
    createUserProfile,
    updateProfile
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { singleAvatar, singleResume } from '../middlewares/multer.middleware.js';

const router = Router();


router.get('/',companyAndJob)
router.post('/register', singleResume, registerUser)
router.post('/verify', verifyOTP);
router.post('/createProfile',singleAvatar ,createUserProfile);
router.post('/login', login)
router.put('/resend-otp', resendOTP)
router.put('/forget-password', forgetPassword)
router.put('/verify-forget', verifyForgetOTP)
router.put('/update-password', updatePassword)
router.get('/filter', filterData)
router.get('/profile', updateProfile)




router.get('/logout', verifyJWT, logout)

export default router;