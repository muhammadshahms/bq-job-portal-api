import { Router } from "express";
import {
  register,
  resendOTP,
  verifyOTP,
  companies,
  updateProfile,
  logout,
  login,
} from "../controllers/company.controller.js";
import { verifyCompany } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyCompany, companies);
router.post("/register", register);
router.post("/verify", verifyOTP);
router.post("/login", login);
router.post("/resend-otp", resendOTP);
router.patch("/updateProfile", verifyCompany, updateProfile);
router.get("/logout", verifyCompany, logout);

export default router;
