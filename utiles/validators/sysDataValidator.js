// IMPORTING DEPENDENCIES
import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import customValidators from "../customValidators/CustomValidators.js";

// CLINICS VALIDATOR
export const clinicValidator = [
  check("clinicName")
    .notEmpty()
    .withMessage("Clinic is Required")
    .custom(customValidators.isArabic)
    .withMessage("Clinic must be in arabic format"),
  validatorMiddleware,
];

// EXTERNAL HOSPITALS VALIDATOR
export const hospitalValidator = [
  check("hospName")
    .notEmpty()
    .withMessage("Hospital is Required")
    .custom(customValidators.isArabic)
    .withMessage("Hospital must be in arabic format"),
  validatorMiddleware,
];

// FACULTY VALIDATOR
export const facultyValidator = [
  check("facultyName")
    .notEmpty()
    .withMessage("The Name of Faculty is Required")
    .custom(customValidators.isArabic)
    .withMessage("The Name of Faculty must be in arabic format"),
  validatorMiddleware,
];

// LEVELS VALIDATOR
export const levelsValidator = [
  check("levelName")
    .notEmpty()
    .withMessage("level is required")
    .custom(customValidators.isArabic)
    .withMessage("level must be in arabic format"),
  validatorMiddleware,
];
