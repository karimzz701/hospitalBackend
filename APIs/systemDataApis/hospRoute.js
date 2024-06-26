import express from "express";
import { createHospital, getAllhospitals, deleteHospital, updateHospital } from "../../controllers/systemDataControllers/hospController.js";
import { hospitalValidator } from "../../utiles/validators/sysDataValidator.js";
import limiter from "../../services/limitReqsMiddleware.js";
import { Protect, allowedTo } from "../../middlewares/Auth/auth.js";

const router = express.Router();

router.route("/hospitals")
  .post(Protect,limiter, hospitalValidator, createHospital)
  .get(getAllhospitals);

router.route("/hospitals/:exHosp_id")
  .delete(Protect,deleteHospital)
  .put(Protect,limiter, hospitalValidator, updateHospital);

export default router;
