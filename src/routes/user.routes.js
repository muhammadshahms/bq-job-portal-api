import { Router } from 'express'
import { singleAvatar, singleResume } from '../middlewares/multer.middleware.js';
import {
    forgetPassword,
    login,
    logout,
    registerUser,
    resendOTP,
    updatePassword,
    verifyForgetOTP,
    verifyOTP,
    skillsMatch

} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.get("/", (req, res) => {
    res.send("Hello, World!");
})
router.post('/register', singleResume, registerUser)
router.post('/verify', verifyOTP);
router.post('/login', login)
router.put('/resend-otp', resendOTP)
router.put('/forget-password', forgetPassword)
router.put('/verify-forget', verifyForgetOTP)
router.put('/update-password', updatePassword)
router.get('/Jobdata',skillsMatch)


// Secure routes

router.get('/logout', verifyJWT, logout)

export default router;