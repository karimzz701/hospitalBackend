import express from "express";
import {
  createRequest,
  updateRequest,
  viewRequest,
  getMyReservations,
  cancelRequest,
} from "../controllers/UserReservationController.js";

// IMPORT VALIDATORS

import { Protect, allowedToUser } from "../middlewares/Auth/auth.js";
import { createRequestValidator } from "../utiles/validators/ReservationValidator.js";

const router = express.Router();

router
  .route("/:student_id")
  .post(Protect, allowedToUser('user'), createRequestValidator, createRequest)
  .get(Protect,getMyReservations);

router.route("/:student_id/:medicEx_id").put(updateRequest).get(viewRequest).delete(cancelRequest);

export default router;
