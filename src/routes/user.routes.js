import { Router } from "express";
import {
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
  filterData,
  updateProfile,
  // getUserAndCompany
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { singleResume } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register", singleResume, registerUser);
router.post("/verify", verifyOTP);
router.post("/login", login);
router.put("/resend-otp", resendOTP);
router.put("/forget-password", forgetPassword);
router.put("/verify-forget", verifyForgetOTP);
router.put("/update-password", updatePassword);
// router.post('/getUserAndComp',userData)
// router.get('userProfile',userProfile)

// Secure routes

router.get("/logout", verifyJWT, logout);
router.get("/getSkills", verifyJWT, skillsMatch);
router.get("/filter", verifyJWT, filterData);
router.put("/update-profile", verifyJWT, singleResume, updateProfile);

export default router;
