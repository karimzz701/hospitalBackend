import express from "express";
const router = express.Router();

import {
  addNewAdmin,
  getAllAdmin,
  viewAdmin,
  updateAdmin,
  deleteAdmin,
  sendObservation,
  acceptOrDecline,
  resetPassword,
  getAdminLogs,
  getSpecificAdminLogs,
  clearHistory,
  clearSpecificHistory,
  searchStudent,
  advancedSearch,
  filterStudents,
  transfer,
  addSuperAdmin,
  getAllUserProfiles,
  deleteUserProfile,
  updateUserProfile,
  blockUser,
  unblockUser,
  updateTransfer,
  getStatistics,
  getReservationsByMonth,
  getTransfered,
} from "../controllers/adminController.js";

import {
  addNewAdminValidator,
  resetPasswordValidator,
  sendObservationValidator,
  addSuperAdminValidator,
} from "../utiles/validators/adminValidator.js";

import { Protect, allowedTo } from "../middlewares/Auth/auth.js";
import limiter from "../services/limitReqsMiddleware.js";
import { Roles } from "../utiles/Roles.js";

//Statistics
router.route("/statistics").get(Protect, allowedTo(Roles.SUPER_ADMIN), getStatistics);
router.route("/resbymonth").get(Protect, allowedTo(Roles.SUPER_ADMIN), getReservationsByMonth);

// ADMIN LOG ROUTERS
router.route("/logs")
  .get(Protect, allowedTo(Roles.SUPER_ADMIN), getAdminLogs)
  .delete(Protect, allowedTo(Roles.SUPER_ADMIN), clearHistory);

router.route("/logs/:admin_id")
  .get(getSpecificAdminLogs)
  .delete(clearSpecificHistory);

// GET ALL USER PROFILES
router.route("/userProfiles").get(Protect,allowedTo(Roles.SUPER_ADMIN,Roles.COUNTER),getAllUserProfiles);

router.route("/userProfiles/:student_id")
  .put(updateUserProfile)
  .delete(deleteUserProfile);

router.patch("/userProfiles/:student_id/block", Protect, allowedTo(Roles.SUPER_ADMIN, Roles.SECOND_MANAGER, Roles.COUNTER), blockUser);
router.patch("/userProfiles/:student_id/unblock", Protect, allowedTo(Roles.SUPER_ADMIN, Roles.SECOND_MANAGER, Roles.COUNTER), unblockUser);

// ADMIN CRUD ROUTERS
router.route("/")
  .post(Protect, allowedTo(Roles.SUPER_ADMIN), addNewAdminValidator, addNewAdmin);

router.route("/add")
  .post(Protect, addSuperAdminValidator, addSuperAdmin);

router.route("/all").get(Protect, allowedTo(Roles.SUPER_ADMIN), getAllAdmin);

router.route("/:user_id")
  .get(viewAdmin)
  .put(Protect, allowedTo(Roles.SUPER_ADMIN), updateAdmin)
  .patch(Protect, allowedTo(Roles.COUNTER, Roles.TRANSFER_CLERK, Roles.BADR_HOSPITAL_ADMIN, Roles.OBSERVER, Roles.SECOND_MANAGER), resetPasswordValidator, resetPassword)
  .delete(Protect, allowedTo(Roles.SUPER_ADMIN), deleteAdmin);

router.get("/filter", filterStudents);

// SYSTEM FEATURES ROUTERS
// TODO: Add allowedTo(Roles) to each route
router.route("/search").post(Protect, searchStudent);
router.route("/advancedSearch").post(Protect, advancedSearch);

// ADMIN MAIN ROUTERS
router.route("/acceptOrDecline/:id").patch(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER), acceptOrDecline);
router.route("/transfer").post(Protect, allowedTo(Roles.TRANSFER_CLERK, Roles.SUPER_ADMIN, Roles.BADR_HOSPITAL_ADMIN), transfer);

router.route("/transferdata").post(Protect,allowedTo(Roles.SUPER_ADMIN,Roles.BADR_HOSPITAL_ADMIN,Roles.TRANSFER_CLERK),getTransfered);
router.route("/transfer/:transfer_id").put(Protect, allowedTo(Roles.TRANSFER_CLERK, Roles.SUPER_ADMIN, Roles.BADR_HOSPITAL_ADMIN), updateTransfer);
router.route("/:student_id").post(Protect, allowedTo(Roles.SUPER_ADMIN, Roles.COUNTER, Roles.OBSERVER), sendObservationValidator, sendObservation);

export default router;
