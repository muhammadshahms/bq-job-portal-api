import { Router } from 'express'
import {  register, resendOTP, verifyOTP, companies ,updateProfile} from '../controllers/company.controller.js';

const router = Router();

router.post('/register', register);
router.post('/verify', verifyOTP);
// router.post('/login', login);
router.post('/resend-otp', resendOTP);
router.get('/updateProfile', updateProfile);

// GET all companies
router.get('/', companies);


export default router