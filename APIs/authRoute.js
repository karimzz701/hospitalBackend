import express from "express";
const router = express.Router();

import {
  uploadRegisterationFiles,
  resizeFiles,
  signup,
  login,
  forgetPassword,
} from "../controllers/authController.js";

// Import middlewares
import { activateEmail } from "../services/avtivateUserMiddleware.js";

// Import validators
import {
  signupValidator,
  sendOtpValidator,
  forgetPasswordValidator,
} from "../utiles/validators/authValidator.js";
import { sendOtp } from "../services/sendOTP_Middleware.js";
import limiter from "../services/limitReqsMiddleware.js";
import { confirmEmail } from "../services/confirmSuperAdmin.js";
import { Protect, allowedTo, allowedToUser } from "../middlewares/Auth/auth.js";
import { Roles } from "../utiles/Roles.js";

router
  .route("/signUp")
  .post(uploadRegisterationFiles, resizeFiles, signupValidator, signup);
router.get("/activate", activateEmail);

router
  .post("/sendOtp", sendOtpValidator, limiter, sendOtp)
  .post("/forgetPassword", forgetPasswordValidator, forgetPassword)
  .post("/login", login)
router.get("/confirmEmail", confirmEmail);

export default router;
