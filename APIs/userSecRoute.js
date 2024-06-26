import express from "express";
import { changeUserPassword } from "../controllers/userSecController.js";
import { Protect } from "../middlewares/Auth/auth.js";
import limiter from "../services/limitReqsMiddleware.js";

const router = express.Router();

router.route("/change/:student_id").post(limiter, changeUserPassword);

export default router;
