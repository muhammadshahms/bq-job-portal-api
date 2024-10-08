import { Router } from "express";
import {
  register,
  resendOTP,
  verifyOTP,
  companies,
  updateProfile,
  logout,
  login,
  createProfile,
  getCompanyByName,
} from "../controllers/company.controller.js";
import { singleAvatar } from "../middlewares/multer.middleware.js";
import { verifyCompany } from "../middlewares/auth.middleware.js";

const router = Router();

router.post('/register', register);
router.post('/verify', verifyOTP);
router.post('/createProfile',singleAvatar, createProfile);
// router.post('/login', login);
// router.post('/resend-otp', resendOTP);
router.get('/updateProfile',verifyCompany , updateProfile);
router.get('/companyName', getCompanyByName)

// router.get('/', userData)
router.get('/companiesData', companies);
router.get('/logout', logout);


export default router;
