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
} from "../controllers/company.controller.js";
import { verifyCompany } from "../middlewares/auth.middleware.js";
import { singleAvatar } from "../middlewares/multer.middleware.js";

const router = Router();

router.get("/", verifyCompany, companies);
router.post("/register",singleAvatar, register);
router.post("/verify", verifyOTP);
router.post("/login", login);
router.post("/login", createProfile);
router.post("/resend-otp", resendOTP);
router.patch("/updateProfile", verifyCompany, singleAvatar, updateProfile);
router.get("/logout", verifyCompany, logout);

export default router;
