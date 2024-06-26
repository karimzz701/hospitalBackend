// Importing dependencies
import express from "express";
import db from "../../config/db.js";
import ApiError from "../apiError.js";
import asyncHandler from "express-async-handler";

// To check if the code is in Arabic or not
export const isArabic = (value) => {
  if (!/^[؀-ۿـ\s]+$/u.test(value)) {
    throw new Error(`( ${value} ) format is not in Arabic!`);
  }
  return true;
};

// To validate appointment date
export const isValidDate = (value) => {
  // Parse the input value as a date
  const appointmentDate = new Date(value);

  // Check if the date is valid
  if (Number.isNaN(appointmentDate)) {
    throw new Error("Invalid date information");
  }

  // Get the current date
  const currentDate = new Date();

  // Check if the appointment date is in the future
  if (appointmentDate <= currentDate) {
    throw new Error("Invalid date information");
  }
  return true;
};

// To check if the account is verified
export const isVerified = (email) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT verified FROM students WHERE email = ?";
    db.query(sql, [email], (err, result) => {
      if (err) {
        reject(err);
      } else {
        if (result.length === 0 || result[0].verified === 0) {
          reject(new Error("Account is not activated. Please activate your account."));
        } else {
          resolve(true);
        }
      }
    });
  });
};

// To validate Helwan University account
export const isUniEmail = (value) => {
  const domain = value.split("@")[1];
  if (!domain.endsWith(".helwan.edu.eg")) {
    throw new Error("Invalid Helwan University account");
  }
  return true;
};

// Exporting the validators
export default {
  isArabic,
  isValidDate,
  isVerified,
  isUniEmail,
};
