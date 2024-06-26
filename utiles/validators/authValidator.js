// IMPORTING DEPENDENCIES
import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import customValidators from "../customValidators/CustomValidators.js";

// SIGNUP VALIDATORS
//@desc check if email exists:
export const isEmailExist = (error, results) => {
  if (error) {
    console.error("Error checking email existence:", error);
  } else if (results.length > 0) {
    // Email already exists, return error response
    console.error("Email already exists");
    return true;
  }
  return false;
};

//@desc check if national id exists:
export const isNationalIdExist = (error, results) => {
  if (error) {
    console.error("Error checking national id existence:", error);
  } else if (results.length > 0) {
    //*national id already exists, return error response
    console.error("national id already exists");
    return true;
  }
  return false;
};

//@desc check if data ids entered correctly:
export const isIDExist = (err, results) => {
  if (err) {
    // If there's an error, return false
    console.error(`Error checking id existence:`, err);
  } else if (results.length === 0) {
    // If the ID doesn't exist in the results, return true
    return true;
  }
  return false;
};

export const signupValidator = [
  check("userName")
    .notEmpty()
    .withMessage("user name required")
    .isLength({ min: 3 }),
  check("email")
    .notEmpty()
    .withMessage("email required")
    .isEmail()
    .custom(customValidators.isUniEmail)
    .withMessage("email should end with .helwan.edu.eg"),
  check("password")
    .notEmpty()
    .withMessage("password required")
    .isLength({ min: 8 })
    .withMessage("password should be 8 characters at least")
    .bail()
    .matches(/^[A-Z][a-z0-9#@]{7,39}$/)
    .withMessage(
      "Password should start with an uppercase letter and contain 8 to 40 characters with lowercase letters, numbers, or symbols #, @."
    ),
  check("national_id")
    .notEmpty()
    .withMessage("national id required")
    .isLength({ min: 14, max: 14 })
    .withMessage("national id should contain exactly 14 characters"),
  check("nationality_id").notEmpty().isNumeric(),
  check("level_id").notEmpty().isNumeric(),
  check("gov_id").notEmpty().isNumeric(),
  check("faculty_id").notEmpty().isNumeric(),
  check("gender")
    .notEmpty()
    .withMessage("gender required")
    .custom(customValidators.isArabic)
    .isIn("ذكر", "أنثي"),
  check("birthDay").isDate(),
  check("phoneNumber")
    .notEmpty()
    .withMessage("phone number required")
    .isMobilePhone("ar-EG"),
  check("userImage_file")
    .notEmpty()
    .withMessage("user profile photo is required"),
  check("national_id_file")
    .notEmpty()
    .withMessage("national id file is required"),
  check("fees_file").notEmpty().withMessage("fees file is required"),
  validatorMiddleware,
];

// LOGIN VALIDATOR
export const loginValidator = [
  check("email")
    .notEmpty()
    .withMessage("email is required")
    .bail()
    .isEmail()
    .withMessage("invalid email"),
  check("password")
    .notEmpty()
    .withMessage("password is required")
    .bail()
    .isLength({ min: 8 }),
  validatorMiddleware,
];

// SEND OTP VALIDATOR
export const forgetPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("email is required")
    .bail()
    .isEmail()
    .withMessage("invalid email"),
  check("OTP")
    .notEmpty()
    .withMessage("OTP is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("OTP should be 6 characters"),
  check("newPassword")
    .notEmpty()
    .withMessage("password is required")
    .bail()
    .matches(/^[A-Z][a-z0-9#@]{7,39}$/)
    .withMessage(
      "Password should start with an uppercase letter and contain 8 to 40 characters with lowercase letters, numbers, or symbols #, @."
    ),
  validatorMiddleware,
];

// FORGOT PASSWORD VALIDATOR
export const sendOtpValidator = [
  check("email")
    .notEmpty()
    .withMessage("email is required")
    .bail()
    .isEmail()
    .withMessage("invalid email")
    .custom(customValidators.isUniEmail)
    .withMessage("email should end with helwan.edu.eg"),
  validatorMiddleware,
];
