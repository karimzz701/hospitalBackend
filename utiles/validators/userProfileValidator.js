// IMPORTING DEPENDENCIES
import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

export const updateUserProfileValidator = [
  check("userImage_file").optional(),
  check("phoneNumber")
    .optional()
    .isNumeric()
    .withMessage("phone number should contain numerical values")
    .isMobilePhone("ar-EG")
    .withMessage("phone number should be in egypt"),
  check("national_id")
    .optional()
    .isNumeric()
    .withMessage("National ID should contain numerical values")
    .isLength({ min: 14, max: 14 })
    .withMessage("National ID must be exactly 14 characters"),
  validatorMiddleware,
];
