//IMPORTING DEPENDENCIES
import asyncHandler from "express-async-handler";
import db from "../config/db.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import sanitizeFilename from "sanitize-filename";
import { StatusCode } from "../utiles/statusCode.js";
import { Roles } from "../utiles/Roles.js";


//!Emergency Reservations APIs
//@desc     submit medical examination request
//@route    POST  /api/v1/Reservations
//@access   private
const adminCreateRequest = asyncHandler(async (req, res) => {
  const { Name, national_id, level_id, clinic_id, gov_id, faculty_id, nationality_id } = req.body;

  const sql =
    "INSERT INTO emergency_reservations (Name,national_id,level_id,clinic_id,gov_id,faculty_id,nationality_id) VALUES (?, ?,?,?,?,?,?)";
  db.query(sql, [Name, national_id, level_id, clinic_id, gov_id, faculty_id, nationality_id], (err, result) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("Request created successfully");
      // Insert audit record
      const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin

      const auditData = {
        timestamp: new Date().toISOString(),
        method: "حجز كشف عاجل",
        body: {
          Name,
          national_id,
          level_id,
          clinic_id,
          gov_id,
          faculty_id,
          nationality_id
        },
        admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
        adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
      };
      const auditSql =
        "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
      db.query(
        auditSql,
        [
          auditData.admin_id,
          auditData.adminName,
          auditData.timestamp,
          auditData.method,
          JSON.stringify(auditData.body),
        ],
      );
      res.status(StatusCode.OK).json({ message: "تم الحجز بنجاح" });
    }
  });
});

//@desc     modify medical examination request
//@route    PUT  /api/v1/Reservations/:emergencyUser_id
//@access   private
const adminUpdateRequest = asyncHandler(async (req, res) => {
  const { emergencyUser_id } = req.params;
  const { Name, national_id, level_id, clinic_id, gov_id, faculty_id, nationality_id } = req.body;

  const checkSql = "SELECT * FROM emergency_reservations WHERE emergencyUser_id = ?";
  db.query(checkSql, [emergencyUser_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "Emergency Reservation ID not found" });
    }

    const updateSql = `
      UPDATE emergency_reservations 
      SET Name = ?, national_id = ?, level_id = ?, clinic_id = ?, gov_id = ?, faculty_id = ?, nationality_id = ?
      WHERE emergencyUser_id = ?
    `;
    db.query(
      updateSql,
      [Name, national_id, level_id, clinic_id, gov_id, faculty_id, nationality_id, emergencyUser_id],
      (err, result) => {
        if (err) {
          return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res.status(StatusCode.OK).json({
            message: "تم تعديل الحجز بنجاح",
          });

          const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin

          const auditData = {
            timestamp: new Date().toISOString(),
            method: "تعديل حجز كشف عاجل",
            body: { emergencyUser_id, Name, national_id, level_id, clinic_id, gov_id, faculty_id, nationality_id },
            admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
            adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
          };
          const auditSql = `
            INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) 
            VALUES (?, ?, ?, ?, ?)
          `;
          db.query(
            auditSql,
            [
              auditData.admin_id,
              auditData.adminName,
              auditData.timestamp,
              auditData.method,
              JSON.stringify(auditData.body),
            ],
            (auditErr, auditResult) => {
              if (auditErr) {
                console.error("Error creating audit record:", auditErr);
                return res.status(StatusCode.SERVICE_UNAVAILABLE).send(auditErr);
              }
              console.log("Audit record created successfully:", auditResult);
            }
          );
        }
      }
    );
  });
});

//@desc     view medical examination request
//@route    GET  /api/v1/Reservations/:emergencyUser_id
//@access   private
const adminViewRequest = asyncHandler(async (req, res) => {
  const emergencyUser_id = req.params.emergencyUser_id;
  const sql = "SELECT * FROM emergency_reservations WHERE emergencyUser_id = ?";
  db.query(sql, [emergencyUser_id], (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      res.status(StatusCode.OK).json(results);
    }
  });
});

//@desc     view list of medical examinations
//@route    GET  /api/v1/Reservations
//@access   private
const adminGetAllReservations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const searchKey = req.query.searchKey || '';
  const offset = (page - 1) * limit;

  const searchParam = `%${searchKey}%`;
  const countSql = `
      SELECT COUNT(*) AS count 
      FROM medical_examinations 
      LEFT JOIN students ON medical_examinations.student_id = students.student_id 
      WHERE 
          medical_examinations.examType LIKE ? 
          OR medical_examinations.status LIKE ? 
          OR students.userName LIKE ? 
          OR students.email LIKE ? 
          OR students.national_id LIKE ? 
          OR students.nationality_id LIKE ? 
          OR students.level_id LIKE ? 
          OR students.gov_id LIKE ? 
          OR students.faculty_id LIKE ? 
          OR students.phoneNumber LIKE ?
  `;

  const sql = `
      SELECT 
          medical_examinations.*,  
          clinics.clinicName AS clinic_name, 
          levels.levelName AS level_name,
          students.userName AS student_name,
          students.userImage_file,
          students.national_id_file AS national_id_img,
          students.fees_file AS fees_file,
          students.email AS student_email,
          students.national_id AS national_id,
          transfers.transfer_id AS transfer_id,
          external_hospitals.hospName AS transfered_to,
          transfers.transferReason,
          transfers.notes

      FROM 
          medical_examinations 
          LEFT JOIN clinics ON medical_examinations.clinic_id = clinics.clinic_id
          LEFT JOIN students ON medical_examinations.student_id = students.student_id
          LEFT JOIN levels ON students.level_id = levels.level_id
          LEFT JOIN transfers ON medical_examinations.medicEx_id = transfers.medicEx_id
          LEFT JOIN external_hospitals ON transfers.exHosp_id = external_hospitals.exHosp_id


      WHERE 
          medical_examinations.examType LIKE ? 
          OR medical_examinations.status LIKE ? 
          OR students.userName LIKE ? 
          OR students.email LIKE ? 
          OR students.national_id LIKE ? 
          OR students.nationality_id LIKE ? 
          OR students.level_id LIKE ? 
          OR students.gov_id LIKE ? 
          OR students.faculty_id LIKE ? 
          OR students.phoneNumber LIKE ?
          OR clinics.clinicName LIKE ?
          OR levels.levelName LIKE ?
      ORDER BY
          medical_examinations.medicEx_id DESC
      LIMIT ? OFFSET ?
  `;
  // Get the total count of records matching the search criteria
  db.query(countSql, [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam], (err, countResults) => {
    if (err) {
      console.error("Error fetching count of examinations:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);
    // Get the paginated results with search criteria
    db.query(sql, [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, limit, offset], (error, results) => {
      if (error) {
        console.error("Error fetching examinations data:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      //converting the time-zone to Cairo time-zone
      results.map(result => {
        result.date = new Date(result.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
        return result;
      });
      // Examinations found, return them
      res.status(200).json({
        totalPages,
        currentPage: page,
        results
      });
    });
  });
});


//@desc     view list of emergency medical examinations
//@route    GET  /api/v1/EmergencyReservations
//@access   private
const adminGetAllEmergencyReservations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit; // Calculate offset based on page and limit

  // Query to get the total count of medical examinations
  const countSql = 'SELECT COUNT(*) AS count FROM emergency_reservations';
  db.query(countSql, (err, results) => {
    if (err) {
      console.error("Error fetching count of emergency examinations:", err);
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
    const countResults = results;
    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    let sql = `
    SELECT 
      emergency_reservations.*,  
      clinics.clinicName AS clinic_name,
      levels.levelName AS level_name,
      faculties.facultyName AS faculty_name,
      governorates.govName AS gov_name,
      nationality.nationalityName AS Nationlaity
    FROM 
      emergency_reservations 
      LEFT JOIN clinics ON emergency_reservations.clinic_id = clinics.clinic_id
      LEFT JOIN levels ON emergency_reservations.level_id = levels.level_id
      LEFT JOIN faculties ON emergency_reservations.faculty_id = faculties.faculty_id
      LEFT JOIN governorates ON emergency_reservations.gov_id = governorates.gov_id
      LEFT JOIN Nationality ON emergency_reservations.nationality_id =nationality.nationality_id
      ORDER BY
    emergency_reservations.emergencyUser_id DESC
    LIMIT ? OFFSET ?`;

    // Execute the SQL query with limit and offset parameters
    db.query(sql, [limit, offset], (error, results) => {
      if (error) {
        console.error("Error fetching emergency examinations data:", error);
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
      } else {
        results.map(result => {
          result.time = new Date(result.time).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
          return result;
        });
        // Examinations found, return them
        res.status(StatusCode.OK).json({
          totalPages,
          currentPage: page,
          results
        });
      }
    });
  });
});


//@desc     delete medical examination request
//@route    DELETE  /api/v1/Reservations/:emergencyUser_id
//@access   private
const adminDeleteRequest = asyncHandler(async (req, res) => {
  const emergencyUser_id = req.params.emergencyUser_id;

  const checkSql =
    "SELECT * FROM emergency_reservations WHERE emergencyUser_id = ?";
  db.query(checkSql, [emergencyUser_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "الكشف غير موجود " });
    }

    const deleteSql =
      "DELETE FROM emergency_reservations WHERE emergencyUser_id = ?";
    db.query(deleteSql, [emergencyUser_id], (err, result) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      }

      const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin

      const auditData = {
        timestamp: new Date().toISOString(),
        method: "حذف حجز كشف عاجل",
        body: {
          emergencyUser_id: emergencyUser_id,
          deletedCount: result.affectedRows,
        },
        admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
        adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
      };

      const auditSql =
        "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
      db.query(
        auditSql,
        [
          auditData.admin_id,
          auditData.adminName,
          auditData.timestamp,
          auditData.method,
          JSON.stringify(auditData.body),
        ],
        (auditErr, auditResult) => {
          if (auditErr) {
            console.error("Error creating audit record:", auditErr);
            return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(auditErr);
          }
          console.log("Audit record created successfully:", auditResult);
          res.status(StatusCode.OK).json({ message: "تم حذف الحجز بنجاح" });
        }
      );
    }
    );
  }
  );
}
);

export {
  adminCreateRequest,
  adminUpdateRequest,
  adminViewRequest,
  adminGetAllReservations,
  adminGetAllEmergencyReservations,
  adminDeleteRequest
}