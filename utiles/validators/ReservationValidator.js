// IMPORTING DEPENDENCIES
import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import customValidators from "../customValidators/CustomValidators.js";

//@desc   limit reservations to 50 requests per day
export const isLimitReached = (err, result) => {
  if (err) {
    console.error(`Error checking reservation limit:`, err);
  } else if (result.length >= 20) {
    return true;
  }
  return false;
};

export const createRequestValidator = [
  check("clinic_id").notEmpty().isNumeric(),
  check("date")
    .notEmpty()
    .withMessage("request date is required")
    .custom(customValidators.isValidDate),
  validatorMiddleware,
];
export const updateRequestValidator = [
  check("clinic_id").notEmpty().isNumeric(),
  check("date")
    .notEmpty()
    .withMessage("date for new reservation is required")
    .custom(customValidators.isValidDate),
  check("examType")
    .custom(customValidators.isArabic)
    .isIn(["كشف جديد", "متابعة"])
    .withMessage("error happened in taking exam type data")
    .optional(),
  validatorMiddleware,
];
export const deleteRequestValidator = [
  check("id").isInt().withMessage("invalid student id !"),
  validatorMiddleware,
];
