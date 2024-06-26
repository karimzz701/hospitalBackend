import express from "express";
const router = express.Router();

import {
  adminCreateRequest,
  adminUpdateRequest,
  adminViewRequest,
  adminDeleteRequest,
  adminGetAllReservations,
  adminGetAllEmergencyReservations,
} from "../controllers/AdminReservationController.js";

import { Protect, allowedTo } from "../middlewares/Auth/auth.js";
import { Roles } from "../utiles/Roles.js";

router
  .route("/")
  .post(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER), adminCreateRequest)
  .get(Protect,allowedTo(Roles.SUPER_ADMIN,Roles.COUNTER,Roles.OBSERVER), adminGetAllReservations);

router.route("/emergency").get(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER), adminGetAllEmergencyReservations);
router
  .route("/:emergencyUser_id")
  .put(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER), adminUpdateRequest)
  .get(adminViewRequest)
  .delete(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER), adminDeleteRequest);

export default router;
