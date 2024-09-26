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
    // getUserAndCompany
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { singleResume } from '../middlewares/multer.middleware.js';

const router = Router();


router.get('/',companyAndJob)
router.post('/register', singleResume, registerUser)
router.post('/verify', verifyOTP);
router.post('/login', login)
router.put('/resend-otp', resendOTP)
router.put('/forget-password', forgetPassword)
router.put('/verify-forget', verifyForgetOTP)
router.put('/update-password', updatePassword)
router.get('/Jobdata/:skills',skillsMatch)
router.get('/users',userData)
// router.post('/getUserAndComp',userData)
// router.get('userProfile',userProfile)


// Secure routes

router.get('/logout', verifyJWT, logout)

export default router;