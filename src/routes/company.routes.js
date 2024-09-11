import { Router } from 'express'
import { login, register, resendOTP, verifyOTP } from '../controllers/company.controller.js';

const router = Router();

router.post('/register', register);
router.post('/verify', verifyOTP);
router.post('/login', login);
router.post('/resend-otp', resendOTP);


export default router