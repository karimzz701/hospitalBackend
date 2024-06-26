import asyncHandler from "express-async-handler";
import ApiError from "../../utiles/apiError.js";
import db from "../../config/db.js";
import jwt from "jsonwebtoken";
import { Roles } from "../../utiles/Roles.js";
import { StatusCode } from "../../utiles/statusCode.js";

const Protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new Error(
        "You are not logged in. Please login to access this route !"
      )
    );
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type === "admin") {
    console.log("admin access");
    const AdminSql = "SELECT * FROM admins WHERE userName = ?";
    db.query(AdminSql, [decoded.name], (err, currentUser) => {
      if (err) {
        return res.status(500).send(err);
      } else if (!currentUser || currentUser.length === 0) {
        return next(
          new ApiError(
            "The admin that belongs to this token no longer exists",
            401
          )
        );
      }
      if (currentUser[0].password_changed_at) {
        const passChangedTimestamp = Math.floor(
          new Date(currentUser[0].password_changed_at).getTime() / 1000
        );
        if (passChangedTimestamp > decoded.iat) {
          return res.status(401).json({
            status: "error",
            message:
              "Admin recently changed their password. Please Login again.",
          });
        }
      }
      req.user = currentUser;
      next();
    });
  } else if (decoded.type === "user") {
    console.log("user access");
    const userSql = "SELECT * FROM students WHERE student_id = ?";
    db.query(userSql, [decoded.userId], (err, currentUser) => {
      if (err) {
        return res.status(500).send(err);
      } else if (!currentUser || currentUser.length === 0) {
        return next(
          new ApiError(
            "The user that belongs to this token no longer exists",
            401
          )
        );
      }
      if (currentUser[0].password_changed_at) {
        const passChangedTimestamp = Math.floor(
          new Date(currentUser[0].password_changed_at).getTime() / 1000
        );
        if (passChangedTimestamp > decoded.iat) {
          return res.status(401).json({
            status: "error",
            message:
              "User recently changed their password. Please log in again.",
          });
        }
      }
      if (decoded.userId != req.params.student_id) {
        console.log(
          "user access denied" + decoded.userId + req.params.student_id
        );
        return next(
          new ApiError(
            "you are allowed to access your profile routes only 🤬",
            401
          )
        );
      }
      req.user = currentUser;
      next();
    });
  } else if (decoded.role === Roles.SUPER_ADMIN) {
    console.log("superAdmin access");
    const superAdminSql = "SELECT * FROM superadmin WHERE email = ?";
    db.query(superAdminSql, [decoded.email], (err, currentUser) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else if (!currentUser || currentUser.length === 0) {
        return next(
          new ApiError(
            "The superAdmin that belongs to this token no longer exists",
            401
          )
        );
      }
      if (currentUser[0].password_changed_at) {
        const passChangedTimestamp = Math.floor(
          new Date(currentUser[0].password_changed_at).getTime() / 1000
        );
        if (passChangedTimestamp > decoded.iat) {
          return res.status(401).json({
            status: "error",
            message:
              "SuperAdmin recently changed their password. Please Login again.",
          });
        }
      }
      req.user = currentUser;
      next();
    });
  }
});

const allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user[0].role)) {
      return next(
        new ApiError("You are not authorized to access this route!", StatusCode.FORBIDDEN)
      );
    }
    next();
  });

const allowedToUser = (...type) =>
  asyncHandler(async (req, res, next) => {
    if (!type.includes(req.user[0].type)) {
      return next(
        new ApiError(
          "You are not authorized to access this route!",
          StatusCode.FORBIDDEN
        )
      );
    }
    next();
  });

export { Protect, allowedTo, allowedToUser };
