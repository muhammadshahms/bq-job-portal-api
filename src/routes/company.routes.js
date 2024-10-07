import { Router } from 'express'
import {register, 
        // resendOTP,     
        verifyOTP, 
        companies ,
        updateProfile,
        logout
    } from '../controllers/company.controller.js';
    import { verifyCompany } from '../middlewares/auth.middleware.js';

import {userData,} from "../controllers/user.controller.js";


const router = Router();

router.post('/register', register);
router.post('/verify', verifyOTP);
// router.post('/login', login);
// router.post('/resend-otp', resendOTP);
router.get('/updateProfile',verifyCompany , updateProfile);
router.get('/', userData)
router.get('/companiesData', companies);
router.get('/logout', logout);



export default router