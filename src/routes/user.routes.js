import { Router } from 'express'
import { singleAvatar, singleResume } from '../middlewares/multer.middleware.js';
import { login, registerUser, resendOTP, verifyOTP } from '../controllers/user.controller.js';

const router = Router();

router.get("/", (req, res)=> {
    res.send("Hello, World!");
})
router.post('/register', singleResume, registerUser)
router.post('/verify', verifyOTP);
router.post('/login', login)
router.post('/resend-otp', resendOTP)

export default router;