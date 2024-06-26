import express from "express";
import { createLevel, GetAllLevels, updateLevel, DeleteLevel } from "../../controllers/systemDataControllers/levelsController.js";
import limiter from "../../services/limitReqsMiddleware.js";
import { Protect, allowedTo } from "../../middlewares/Auth/auth.js";
import { levelsValidator } from "../../utiles/validators/sysDataValidator.js";
import { Roles } from "../../utiles/Roles.js";

const router = express.Router();

router.route("/levels")
  .post( Protect,limiter, createLevel)
  .get(GetAllLevels);

router.route("/levels/:level_id")
  .delete(Protect,limiter, DeleteLevel)
  .put(Protect,limiter, levelsValidator, updateLevel);

export default router;
