import express from "express";
const router = express.Router();

import {
  getStudentProfile,
  updateUserProfile,
  uploadUserImage,
  resizeImage,
  updateProfilePhoto,
} from "../controllers/userProfileController.js";

import {
  updateUserProfileValidator,
} from "../utiles/validators/userProfileValidator.js";
import { Protect } from "../middlewares/Auth/auth.js";
router
  .route("/:student_id")
  .get(Protect, getStudentProfile)
  .put(Protect, updateUserProfileValidator, updateUserProfile)
  .patch(Protect, uploadUserImage, resizeImage, updateProfilePhoto);

export default router;
