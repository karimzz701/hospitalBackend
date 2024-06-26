import express from "express";
import { createClinic, getAllClinics, deleteClinic, updateClinic } from "../../controllers/systemDataControllers/clinicsController.js";
import limiter from "../../services/limitReqsMiddleware.js";
import { Protect, allowedTo, allowedToUser } from "../../middlewares/Auth/auth.js";
import { clinicValidator } from "../../utiles/validators/sysDataValidator.js";
import { Roles } from "../../utiles/Roles.js";

const router = express.Router();

router.route("/clinics")
  .post(Protect, limiter, clinicValidator, createClinic)
  .get(getAllClinics);

router.route("/clinics/:clinic_id")
  .delete(Protect, deleteClinic)
  .put(Protect, limiter, clinicValidator, updateClinic);

export default router;
