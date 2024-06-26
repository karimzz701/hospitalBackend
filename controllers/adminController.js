import asyncHandler from "express-async-handler";
import db from "../config/db.js";
import bcrypt from "bcrypt";
import { log } from "util";
import { StatusCode } from "../utiles/statusCode.js";
import sendObservationMail from "../services/sendObservationemail.js";
import { Roles } from "../utiles/Roles.js";


//!! SUPER ADMIN
//? STATISTICS
const getStatistics = asyncHandler(async (req, res) => {
  try {
    const queries = {
      usersCount: "SELECT COUNT(*) AS value FROM students",
      reservationsCount: "SELECT COUNT(*) AS value FROM medical_examinations",
      clinicsCount: "SELECT COUNT(*) AS value FROM clinics",
      adminsCount: "SELECT COUNT(*) AS value FROM admins",
      superAdminsCount: "SELECT COUNT(*) AS value FROM superadmin",
      avgReservationsPerUser: `SELECT AVG(reservationsCount) AS value
                               FROM (SELECT COUNT(*) AS reservationsCount 
                                     FROM medical_examinations 
                                     GROUP BY student_id) AS reservationsPerUser`,
      avgReservationsPerClinic: `SELECT AVG(reservationsCount) AS value
                                 FROM (SELECT COUNT(*) AS reservationsCount 
                                       FROM medical_examinations 
                                       GROUP BY clinic_id) AS reservationsPerClinic`,
      mostReservedClinic: `SELECT clinics.clinicName AS clinicName, COUNT(*) AS value 
                           FROM medical_examinations 
                           JOIN clinics ON medical_examinations.clinic_id = clinics.clinic_id 
                           GROUP BY medical_examinations.clinic_id 
                           ORDER BY value DESC 
                           LIMIT 1`,
    };

    const labels = {
      usersCount: "عدد المستخدمين",
      reservationsCount: "عدد الحجوزات",
      clinicsCount: "عدد العيادات",
      adminsCount: "عدد الادمن",
      superAdminsCount: "عدد مديري النظام",
      avgReservationsPerUser: "متوسط الحجوزات لكل مستخدم",
      avgReservationsPerClinic: "متوسط الحجوزات لكل عيادة",
      mostReservedClinic: "العيادة الأكثر حجزاً"
    };

    const queryPromises = Object.keys(queries).map(key =>
      new Promise((resolve, reject) => {
        db.query(queries[key], (err, result) => {
          if (err) {
            reject({ key, err });
          } else {
            resolve({ key, result: result[0] });
          }
        });
      })
    );

    const results = await Promise.all(queryPromises);

    const statistics = results.map(({ key, result }) => {
      if (key === 'mostReservedClinic') {
        return {
          label: labels[key],
          clinicName: result.clinicName,
          value: result.value,
        };
      }
      return {
        label: labels[key],
        value: result.value,
      };
    });

    res.status(StatusCode.OK).json({ statistics });

  } catch (error) {
    console.error(`Error fetching ${error.key}:`, error.err);
    res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: `Failed to fetch ${error.key}` });
  }
});

//? get the number of reservations by each month from the beginning of the year
const getReservationsByMonth = asyncHandler(async (req, res) => {
  const sql = `
    WITH RECURSIVE Months AS (
      SELECT 1 AS month
      UNION ALL
      SELECT month + 1 FROM Months WHERE month < 12
    )
    SELECT 
      CASE Months.month
        WHEN 1 THEN 'January'
        WHEN 2 THEN 'February'
        WHEN 3 THEN 'March'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'May'
        WHEN 6 THEN 'June'
        WHEN 7 THEN 'July'
        WHEN 8 THEN 'August'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'October'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'December'
      END AS month_name, 
      COALESCE(COUNT(medical_examinations.medicEx_id), 0) AS reservationsCount
    FROM Months
    LEFT JOIN medical_examinations ON MONTH(medical_examinations.date) = Months.month AND YEAR(medical_examinations.date) = YEAR(CURDATE())
    GROUP BY Months.month;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching reservations by month:", err);
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }

    // Map the result to ensure all months are included
    const months = results.map(row => {
      return {
        month: row.month_name,
        reservationsCount: row.reservationsCount
      };
    });

    res.status(StatusCode.OK).json(months);
  });
});

//! Get Admin Logs For
const getAdminLogs = asyncHandler(async (req, res) => {
  // Parse query parameters for pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Query to fetch total count of admin logs
  const countSql = "SELECT COUNT(*) AS count FROM admin_log";

  // Query to fetch paginated admin logs
  const sql = "SELECT * FROM admin_log ORDER BY adminLog_id DESC LIMIT ? OFFSET ?";

  // Get the total count of admin logs
  db.query(countSql, (err, countResults) => {
    if (err) {
      console.error("Error fetching count of admin logs:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    db.query(sql, [limit, offset], (error, results) => {
      if (error) {
        console.error("Error fetching admin logs:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json({
        totalPages,
        currentPage: page,
        adminLogs: results
      });
    });
  });
});



//! Get Specific Admin Logs
const getSpecificAdminLogs = asyncHandler(async (req, res) => {
  const { admin_id } = req.params;
  const sql = "SELECT * FROM admin_log WHERE admin_id = ?";
  db.query(sql, [admin_id], (err, result) => {
    if (err) {
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "فشل في استرجاع العمليات المسجلة" });
    }
    res.status(StatusCode.OK).json(result);
  });
});

//! Clear History
const clearHistory = asyncHandler(async (req, res) => {
  const sql = "DELETE FROM admin_log";
  db.query(sql, (err, result) => {
    if (err) {
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "فشل في حذف العمليات المسجلة" });
    }
    res.status(StatusCode.OK).json({ message: "تم حذف العمليات المسجلة" });
  });
});

//! Clear Specific Admin History
const clearSpecificHistory = asyncHandler(async (req, res) => {
  const { admin_id } = req.params;

  const isExist = `SELECT * FROM admin_log WHERE admin_id = ?`;
  db.query(isExist, [admin_id], (err, result) => {
    if (err) {
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "Database query error" });
    }
    // Check if result is undefined or empty
    if (!result || result.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "العمليات الخاصة بهذا المستخدم غير موجودة" });
    }

    // If logs exist, proceed with deletion
    const sql = "DELETE FROM admin_log WHERE admin_id=?";
    db.query(sql, [admin_id], (deleteErr, deleteResult) => {
      if (deleteErr) {
        return res
          .status(StatusCode.INTERNAL_SERVER_ERROR)
          .json({ error: "Failed to clear admin logs" });
      }
      return res
        .status(StatusCode.OK)
        .json({ message: "تم حذف العمليات المسجلة" });
    });
  });
});

//@desc     add new admin
//@route    POST  /api/v1/admin
//@access   private
const addNewAdmin = asyncHandler(async (req, res) => {
  const { userName, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectSql = "SELECT userName, email, role FROM admins WHERE email = ?";
  db.query(selectSql, [email], (selectErr, selectResult) => {
    if (selectErr) {
      console.error("Error checking existing admin:", selectErr);
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "فشل في اضافة ادمن جديد" });
    }
    if (selectResult.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ error: "هذا الادمن موجود بالفعل" });
    }
    const insertSql =
      "INSERT INTO admins (userName, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(
      insertSql,
      [userName, email, hashedPassword, role],
      (err, result) => {
        if (err) {
          console.error("Error adding new admin:", err);
          return res
            .status(StatusCode.INTERNAL_SERVER_ERROR)
            .json({ error: "فشل في اضافة ادمن جديد" });
        }
        const auditData = {
          timestamp: new Date().toISOString(),
          method: "اضافة ادمن جديد",
          body: { userName, email, role },
          adminName: req.user[0].name,
          admin_id: req.user[0].superAdmin_id,
        };

        const auditSql =
          "INSERT INTO admin_log (admin_id,admin_name,timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
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
            } else {
              console.log("Audit record created successfully :", auditResult);
            }
          }
        );

        return res
          .status(StatusCode.CREATED)
          .json({ message: "تم اضافة ادمن جديد بنجاح", auditData });
      }
    );
  });
});

// !!
const addSuperAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectSql = "SELECT name, email, role FROM superadmin WHERE email = ?";
  db.query(selectSql, [email], (selectErr, selectResult) => {
    if (selectErr) {
      console.error("Error checking existing admin:", selectErr);
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "فشل في اضافة مدير نظام جديد" });
    }
    if (selectResult.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ error: "مدير النظام هذا موجود بالفعل" });
    }
    const insertSql =
      "INSERT INTO superadmin (name, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(insertSql, [name, email, hashedPassword, role], (err, result) => {
      if (err) {
        console.error("Error adding new superadmin:", err);
        return res
          .status(StatusCode.INTERNAL_SERVER_ERROR)
          .json({ error: "فشل في اضافة مدير نظام جديد" });
      } else {
        return res
          .status(StatusCode.CREATED)
          .json({ message: "تم اضافة مدير نظام جديد" });
      }
    });
  });
});

//@desc     update admin
//@route    PUT  /api/v1/admin/:user_id
//@access   private
// updateAdmin = asyncHandler(async (req, res) => {
//   const { user_id } = req.params;
//   const updateData = req.body;
//   let updateSet = "";
//   const updateValues = [];
//   // Build the SET clause for the update query
//   Object.entries(updateData).forEach(([field, value]) => {
//     updateSet += `${field} = ?, `;
//     updateValues.push(value);
//   });
//   // Remove the trailing comma from the SET clause
//   updateSet = updateSet.slice(0, -2);
//   // Update the admin in the database
//   const query = `UPDATE admins SET ${updateSet} WHERE user_id = ?`;
//   db.query(query, [...updateValues, user_id], (err, result) => {
//     if (err) {
//       return res.status(500).send(err);
//     }
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Admin not found" });
//     }
//     const selectSql =
//       "SELECT userName, email, role FROM admins WHERE user_id = ?";
//     db.query(selectSql, [user_id], (selectErr, selectResult) => {
//       if (selectErr) {
//         console.error("Error fetching updated admin details:", selectErr);
//         return res.status(500).send(selectErr);
//       }
//       if (selectResult.length === 0) {
//         return res.status(404).json({ message: "Admin not found" });
//       }
//       const { userName, email, role } = selectResult[0];
//       const auditData = {
//         timestamp: new Date().toISOString(),
//         method: "Update Admin",
//         body: {
//           updatedFields: updateData,
//           userName,
//           email,
//           role,
//         },
//         admin_id: req.user[0].user_id,
//         adminName: req.user[0].userName,
//       };
//       const auditSql =
//         "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
//       db.query(
//         auditSql,
//         [
//           auditData.admin_id,
//           auditData.adminName,
//           auditData.timestamp,
//           auditData.method,
//           JSON.stringify(auditData.body),
//         ],
//         (auditErr, auditResult) => {
//           if (auditErr) {
//             console.error("Error creating audit record:", auditErr);
//             return res.status(500).send(auditErr);
//           }
//           console.log("Audit record created successfully:", auditResult);
//           return res
//             .status(StatusCode.OK)
//             .json({ message: "Admin updated successfully", auditData });
//         }
//       );
//     });
//   });
// });
const updateAdmin = asyncHandler(async (req, res) => {
  const user_id = req.params.user_id;
  const { userName, email, role } = req.body;

  // Check if the admin exists
  const checkSql = "SELECT * FROM admins WHERE user_id = ?";
  db.query(checkSql, [user_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "الادمن غير موجود" });
    }

    // Update admin details
    const updateSql =
      "UPDATE admins SET userName = ?, email = ?, role = ? WHERE user_id = ?";
    db.query(updateSql, [userName, email, role, user_id], (err, result) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        // Create audit record
        const auditData = {
          timestamp: new Date().toISOString(),
          method: "تعديل الادمن",
          body: { user_id, userName, email, role },
          adminName: req.user[0].name,
          admin_id: req.user[0].superAdmin_id,
        };
        const auditSql = "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
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
            res
              .status(StatusCode.OK)
              .json({ message: "تم تعديل بيانات الادمن بنجاج", auditData });
          });
      }
    });
  });
});




//@desc     reset admin password
//@route    PATCH  /api/v1/admin/:user_id
//@access   private
const resetPassword = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 8);
  // Update password in the database
  const updatePasswordQuery = `UPDATE admins SET password = ? , password_changed_at = NOW() WHERE user_id = ?`;
  db.query(updatePasswordQuery, [hashedPassword, user_id], (err, result) => {
    if (err) {
      console.error("Error updating password:", err);
      return res
        .status(StatusCode.INTERNAL_SERVER_ERROR)
        .json({ error: "فشل في تحديث كلمة السر" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "الادمن غير موجود او لم يتم تحديث كلمة السر" });
    }
    const updateStatusQuery = "UPDATE admins SET status = 0 WHERE user_id = ?";
    db.query(updateStatusQuery, [user_id], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating admin status:", updateErr);
        return res
          .status(StatusCode.INTERNAL_SERVER_ERROR)
          .json({ error: "فشل في تحديث حالة الادمن" });
      }

      const auditData = {
        timestamp: new Date().toISOString(),
        method: "Reset Password",
        body: {
          user_id,
          newPassword: password,
        },
        admin_id: req.user[0].user_id,
        adminName: req.user[0].userName,
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
            return res
              .status(StatusCode.INTERNAL_SERVER_ERROR)
              .json({ error: "Failed to audit password reset" });
          }
          console.log("Audit record created successfully:", auditResult);
          return res
            .status(StatusCode.OK)
            .json({ message: "تم تغيير كلمة السر بنجاح", auditData });
        });
    });
  });
});

//@desc    view specific admin
//@route   GET /api/v1/admin/:user_id
//@access  private
const viewAdmin = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const sql = "SELECT * FROM admins WHERE user_id = ?";

  db.query(sql, [user_id], (err, result) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log(result);
      if (result.length === 0) {
        res.status(StatusCode.NOT_FOUND).json({ message: "الادمن غير موجود" });
      } else {
        res.status(StatusCode.OK).json(result);
      }
    }
  });
});

//@desc     view all admins
//@route    GET  /api/v1/admin
//@access   private
const getAllAdmin = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM admins";
  db.query(sql, (err, result) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("request created successfully");
      res.status(StatusCode.OK).json(result);
    }
  });
});

//@desc     delete admin
//@route    DELETE  /api/v1/admin/:user_id
//@access   private
const deleteAdmin = asyncHandler(async (req, res) => {
  const { user_id } = req.params;

  const selectSql =
    "SELECT userName, email, role FROM admins WHERE user_id = ?";
  db.query(selectSql, [user_id], (selectErr, selectResult) => {
    if (selectErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(selectErr);
    }
    if (selectResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "الادمن غير موجود" });
    }
    const { userName, email, role } = selectResult[0];
    const deleteSql = "DELETE FROM admins WHERE user_id = ?";
    db.query(deleteSql, [user_id], (deleteErr) => {
      if (deleteErr) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(deleteErr);
      }
      const auditData = {
        timestamp: new Date().toISOString(),
        method: "حذف ادمن",
        body: { userName, email, role },
        adminName: req.user[0].name,
        admin_id: req.user[0].superAdmin_id,
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
          } else {
            console.log("Audit record created successfully:", auditResult);
          }
        }
      );
      res
        .status(StatusCode.OK)
        .json({ message: "تم حذف الادمن بنجاح", auditData });
    });
  });
});


//! ADMIN PRVILIGES FROM HERE
//@desc     send observation to a user
//@route    PUT  /api/v1/admin/sendObservation/:id
//@access   private
const sendObservation = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const { observation } = req.body;
  const sql = "SELECT email, userName FROM students WHERE student_id = ?";
  db.query(sql, [student_id], (err, result) => {
    if (err) {
      console.error("Error querying user:", err);
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    }
    if (result.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ message: "المستخدم غير موجود" });
    }
    const { email, userName } = result[0];
    console.log(userName, email, observation);
    sendObservationMail(email, observation, userName);
    const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin

    const auditData = {
      timestamp: new Date().toISOString(),
      method: "ارسال ملاحظة للمستخدم",
      body: { student_id, observation },
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
        } else {
          console.log("Audit record created successfully:", auditResult);
        }
      }
    );
    res
      .status(StatusCode.OK)
      .json({ message: "تم تسجيل الملاحظة", user: result[0] });
  });
});


const acceptOrDecline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operation } = req.body;
  db.query(
    "SELECT * FROM medical_examinations WHERE medicEx_id = ?",
    [id],
    (error, results) => {
      if (error) {
        console.error("Error checking medical examination:", error);
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
      } else if (results.length === 0) {
        return res.status(StatusCode.NOT_FOUND).json({ error: `الكشف رقم ${id} غير موجود ` });
      }
      if (operation === 1) {
        db.query(
          'UPDATE medical_examinations SET status = "مقبول"  WHERE medicEx_id = ?',
          [id],
          (err, result) => {
            if (err) {
              console.error("Error updating medical examination status:", err);
              return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
            }

            const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
            const auditData = {
              timestamp: new Date().toISOString(),
              method: "قبول الكشف",
              body: { id },
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
                } else {
                  console.log("Audit record created successfully:", auditResult);
                }
              }
            );
            return res.status(StatusCode.OK).json({
              message: "تم قبول الكشف ",
              result,
            });
          }
        );
      } else if (operation === 0) {
        db.query(
          'UPDATE medical_examinations SET status = "مرفوض" WHERE medicEx_id = ?',
          [id],
          (err, result) => {
            if (err) {
              console.error("Error updating medical examination status:", err);
              return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
            }
            const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
            const auditData = {
              timestamp: new Date().toISOString(),
              method: "رفض الكشف",
              body: { id },
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
                } else {
                  console.log("Audit record created successfully:", auditResult);
                }
              }
            );
            return res.status(StatusCode.OK).json({
              message: "تم رفض الكشف ",
              result,
            });
          }
        );
      }
    }
  );
});


//@desc     view all user profiles
//@route    GET  /api/v1/admin
//@access   private
const getAllUserProfiles = asyncHandler(async (req, res) => {
  //pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit; // Calculate offset based on page and limit

  // Query to get the total count of students
  const countSql = 'SELECT COUNT(*) AS count FROM students';
  db.query(countSql, (err, results) => {
    if (err) {
      console.error("Error fetching count of students:", err);
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
    const countResults = results;
    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    let sql =
      "SELECT students.*, levels.levelName AS level_name, faculties.facultyName AS faculty_name,governorates.govName AS gov_name , nationality.nationalityName AS nationality_name FROM students";
    sql += " LEFT JOIN levels ON students.level_id = levels.level_id";
    sql += " LEFT JOIN governorates ON students.gov_id = governorates.gov_id";
    sql +=
      " LEFT JOIN nationality ON students.nationality_id = nationality.nationality_id";
    sql += " LEFT JOIN faculties ON students.faculty_id = faculties.faculty_id";
    sql += " LIMIT ? OFFSET ?";
    db.query(sql, [limit, offset], (err, students) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).json(err);
      } else {
        console.info("request created successfully");
        res.status(StatusCode.OK).json({ totalPages, currentPage: page, students });
      }
    });
  });
});

//@desc     add students
//@route    POST  /api/v1/admin
//@access   private
const addStudent = asyncHandler(async (req, res) => {
  const {
    userName,
    email,
    password,
    national_id,
    phone,
    level_id,
    gov_id,
    faculty_id,
  } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const checkSql = "SELECT * FROM students WHERE national_id = ?";
  db.query(checkSql, [national_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ error: "الرقم القومي موجود بالفعل" });
    }
    const insertSql =
      "INSERT INTO students (userName, email, password, national_id, phone, address, level_id, gov_id, faculty_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(
      insertSql,
      [userName, email, hashedPassword, national_id, phone, address, level_id, gov_id, faculty_id],
      (err, result) => {
        if (err) {
          return res.status(StatusCode.INTERNAL_SERVER_ERROR
          ).send(err);
        }
        return res
          .status(StatusCode.CREATED)
          .json({ message: "تم اضافة الطالب بنجاح" });
      }
    );
  });
});

//@desc     update user profiles
//@route    GET  /api/v1/admin
//@access   private
const updateUserProfile = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  //check if user already exists
  const checkSql = "SELECT * FROM students WHERE student_id = ?";
  db.query(checkSql, [student_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "المستخدم غير موجود" });
    }
    const { userName, email, password, national_id, phone, address, level_id, gov_id, faculty_id } = req.body;
    const updateSql = `UPDATE students SET userName = ?, email = ?, national_id = ?, phone = ?,  level_id = ?, gov_id = ? ,faculty_id WHERE student_id = ?`;
    //check if the national id is already exist
    const checkNationalId = "SELECT * FROM students WHERE national_id = ? AND student_id != ?";
    db.query(checkNationalId, [national_id, student_id], (checkNationalIdErr, checkNationalIdResult) => {
      if (checkNationalIdErr) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkNationalIdErr);
      }
      if (checkNationalIdResult.length > 0) {
        return res
          .status(StatusCode.CONFLICT)
          .json({ error: "الرقم القومي موجود بالفعل" });
      }
    });
    db.query(updateSql, [userName, email, national_id, phone, level_id, gov_id, faculty_id, student_id], (err, result) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      }
      return res
        .status(StatusCode.OK)
        .json({ message: "تم تعديل بيانات المستخدم بنجاح" });
    });
  });
});

//@desc     delete user profiles
//@route    GET  /api/v1/admin
//@access   private
const deleteUserProfile = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const checkSql = "SELECT * FROM students WHERE student_id = ?";
  db.query(checkSql, [student_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "المستخدم غير موجود" });
    }
    const { userName } = checkResult[0];
    const deleteSql = "DELETE FROM students WHERE student_id = ?";
    db.query(deleteSql, [student_id], (deleteErr) => {
      if (deleteErr) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(deleteErr);
      }
      return res
        .status(StatusCode.OK)
        .json({ message: `تم حذف  ${userName} بنجاح`, student_id, userName });
    });
  });
});

//!@desc PLUS    block the user from entering the system
//@route    GET  /api/v1/admin
//@access   private
const blockUser = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const checkSql = "SELECT * FROM students WHERE student_id = ?";

  db.query(checkSql, [student_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res.status(StatusCode.NOT_FOUND).json({ error: "المستخدم غير موجود" });
    }

    const { userName } = checkResult[0];
    const blockSql = "UPDATE students SET blocked = 1 WHERE student_id = ?";

    db.query(blockSql, [student_id], (blockErr) => {
      if (blockErr) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(blockErr);
      }

      const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
      const auditData = {
        timestamp: new Date().toISOString(),
        method: "حظر المستخدم",
        body: { userName },
        admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
        adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
      };

      const auditSql = "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";

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
          } else {
            console.log("Audit record created successfully:", auditResult);
          }
        }
      );

      return res.status(StatusCode.OK).json({ message: `تم حظر  ${userName} بنجاح`, student_id, userName });
    });
  });
});


//!@desc PLUS    unblock the user from entering the system
//@route    GET  /api/v1/admin
//@access   private
const unblockUser = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const checkSql = "SELECT * FROM students WHERE student_id = ?";
  db.query(checkSql, [student_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "المستخدم غير موجود" });
    }
    const { userName } = checkResult[0];
    const blockSql = "UPDATE students SET blocked = 0 WHERE student_id = ?";
    db.query(blockSql, [student_id], (blockErr) => {
      if (blockErr) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(blockErr);
      }
      const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
      const auditData = {
        timestamp: new Date().toISOString(),
        method: "فك حظر المستخدم",
        body: { userName },
        admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
        adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
      };

      const auditSql = "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";

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
          } else {
            console.log("Audit record created successfully:", auditResult);
          }
        }
      );

      return res
        .status(StatusCode.OK)
        .json({ message: `تم فك حظر  ${userName} بنجاح`, student_id, userName });
    });
  });
});

//search for students method
const searchStudent = asyncHandler(async (req, res) => {
  const { searchKey } = req.query;
  const sql =
    "SELECT * FROM students WHERE userName LIKE ? OR national_id LIKE ?";
  db.query(sql, [`%${searchKey}%`, `%${searchKey}%`], (err, results) => {
    if (err) {
      res.status(400).json({ msg: err.message });
    } else {
      if (results.length === 0) {
        res.status(404).json({ msg: "No students found" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  });
});

//advanced search method
const advancedSearch = asyncHandler(async (req, res) => {
  const queryParams = [];
  let query = `
  SELECT students.*, medical_examinations.*, clinics.clinicName AS clinic_name
  FROM students
  LEFT JOIN medical_examinations ON students.student_id = medical_examinations.student_id
  LEFT JOIN clinics ON medical_examinations.clinic_id = clinics.clinic_id
  WHERE`;
  let conditions = [];

  // Build the WHERE clause for the search query
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'page' && key !== 'limit' && value) { // Skip pagination params
      conditions.push(`${key} LIKE ?`);
      queryParams.push(`%${value}%`);
    }
  }

  // Check if any search criteria provided
  if (conditions.length === 0) {
    return res.status(StatusCode.NOT_FOUND).json({ message: "لا يوجد عنصر للبحث . برجاء اختيار عنصر واحد علي الاقل" });
  }
  query += " " + conditions.join(" AND ");

  query += " ORDER BY medical_examinations.medicEx_id DESC";

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Query to get the total count of results matching the search criteria
  const countQuery = `
  SELECT COUNT(*) AS count
  FROM students
  LEFT JOIN medical_examinations ON students.student_id = medical_examinations.student_id
  WHERE ${conditions.join(" AND ")}`;

  db.query(countQuery, queryParams, (err, countResults) => {
    if (err) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ message: "Database error", error: err });
    }

    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // Add pagination to the main query
    query += " LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    // Execute the search query with pagination
    db.query(query, queryParams, (err, search) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).json({ message: "Database error", error: err });
      }

      // Handle the response
      if (search.length === 0) {
        return res.status(StatusCode.NOT_FOUND).json({ msg: "لا يوجد نتائج بحث" });
      } else {
        // Format the dates
        const formattedResults = search.map(result => {
          if (result.date) {
            result.date = new Date(result.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
          }
          if (result.birthDay) {
            result.birthDay = new Date(result.birthDay).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
          }
          return result;
        });

        // Send the response
        return res.status(200).json({ totalPages, currentPage: page, data: formattedResults });
      }
    });
  });
});

export default advancedSearch;



// advancecSearch with column mapping
// const advancedSearch = asyncHandler(async (req, res) => {
//   const queryParams = [];
//   let query = `
//   SELECT students.*, medical_examinations.*
//   FROM students
//   LEFT JOIN medical_examinations ON students.student_id = medical_examinations.student_id
//   WHERE`;
//   let conditions = [];

//   // Mapping to specify the table for each searchable column
//   const columnMapping = {
//     student_id: 'students',
//     name: 'students',
//     birthDay: 'students',
//     // Add all columns from students table
//     examType: 'medical_examinations',
//     status: 'medical_examinations',
//     date: 'medical_examinations',
//     // Add all columns from medical_examinations table
//   };

//   // Build the WHERE clause for the search query
//   for (const [key, value] of Object.entries(req.query)) {
//     if (key !== 'page' && key !== 'limit' && value) { // Skip pagination params
//       const tableAlias = columnMapping[key];
//       if (tableAlias) {
//         conditions.push(`${tableAlias}.${key} LIKE ?`);
//         queryParams.push(`%${value}%`);
//       }
//     }
//   }

//   // Check if any search criteria provided
//   if (conditions.length === 0) {
//     return res.status(400).json({ message: "لا يوجد عنصر للبحث . برجاء اختيار عنصر واحد علي الاقل" });
//   }
//   query += " " + conditions.join(" AND ");

//   // Pagination
//   const page = parseInt(req.query.page, 10) || 1;
//   const limit = parseInt(req.query.limit, 10) || 10;
//   const offset = (page - 1) * limit;

//   // Query to get the total count of results matching the search criteria
//   const countQuery = `
//   SELECT COUNT(*) AS count
//   FROM students
//   LEFT JOIN medical_examinations ON students.student_id = medical_examinations.student_id
//   WHERE ${conditions.join(" AND ")}`;

//   db.query(countQuery, queryParams, (err, countResults) => {
//     if (err) {
//       return res.status(500).json({ message: "Database error", error: err });
//     }

//     const totalCount = countResults[0].count;
//     const totalPages = Math.ceil(totalCount / limit);

//     // Add pagination to the main query
//     query += " LIMIT ? OFFSET ?";
//     queryParams.push(limit, offset);

//     // Execute the search query with pagination
//     db.query(query, queryParams, (err, search) => {
//       if (err) {
//         return res.status(500).json({ message: "Database error", error: err });
//       }

//       // Handle the response
//       if (search.length === 0) {
//         return res.status(404).json({ msg: "لا يوجد نتائج بحث" });
//       } else {
//         // Format the dates
//         const formattedResults = search.map(result => {
//           if (result.date) {
//             result.date = new Date(result.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
//           }
//           if (result.birthDay) {
//             result.birthDay = new Date(result.birthDay).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
//           }
//           return result;
//         });

//         // Send the response
//         return res.status(200).json({ totalPages, currentPage: page, data: formattedResults });
//       }
//     });
//   });
// });



//filter students method
const filterStudents = asyncHandler(async (req, res) => {
  const filters = req.query;
  const values = [];
  const conditions = [];

  Object.entries(filters).forEach(([key, value]) => {
    conditions.push(`students.${key} = ?`);
    values.push(value);
  });

  let sql =
    "SELECT students.*, levels.levelName AS level_name, governorates.govName AS gov_name , nationality.nationalityName AS nationality_name FROM students";
  sql += " LEFT JOIN levels ON students.level_id = levels.level_id";
  sql += " LEFT JOIN governorates ON students.gov_id = governorates.gov_id";
  sql +=
    " LEFT JOIN nationality ON students.nationality_id = nationality.nationality_id";

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  db.query(sql, values, (err, results) => {
    if (err) {
      res.status(400).json({ msg: err.message });
    } else {
      if (!results || results.length === 0) {
        res.status(404).json({ msg: "No students found" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  });
});





//////////////////////// TEST FUNCTIONS //////////////////////////
// !TRANSFER
// Function to check the medical examination status
async function checkMedicalExamStatus(medicEx_id) {
  return new Promise((resolve, reject) => {
    db.query("SELECT status FROM medical_examinations WHERE medicEx_id = ? AND status = 'مقبول'", [medicEx_id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// Function to check if a student exists
async function checkStudentExist(student_id) {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM students WHERE student_id = ?", [student_id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

//Function to check if the clinic exists
async function checkClinicExist(clinic_id) {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM clinics WHERE clinic_id = ?", [clinic_id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  }
  );
}

// Function to check if the external hospital exists
async function checkExHospExist(exHosp_id) {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM external_hospitals WHERE exHosp_id = ?", [exHosp_id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  }
  );
}


// Function to check for existing transfers
// async function checkExistingTransfer(medicEx_id) {
//   return new Promise((resolve, reject) => {
//     db.query("SELECT * FROM transfers WHERE medicEx_id = ?", [medicEx_id], (error, results) => {
//       if (error) {
//         reject(error);
//       } else {
//         resolve(results);
//       }
//     });
//   });
// }

// Function to insert transfer records
async function insertTransferRecord(student_id, transferReason, notes, medicEx_id, clinic_id, exHosp_id) {
  return new Promise((resolve, reject) => {
    const transferQuery = "INSERT INTO transfers (student_id, transferReason, notes, medicEx_id, clinic_id, exHosp_id) VALUES (?, ?, ?, ?, ?, ?)";
    const values = [student_id, transferReason, notes, medicEx_id, clinic_id, exHosp_id];
    db.query(transferQuery, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// Function to insert audit logs
async function insertAuditLog(auditData) {
  return new Promise((resolve, reject) => {
    const auditSql = "INSERT INTO admin_log (admin_id, admin_name, timestamp, method, body) VALUES (?, ?, ?, ?, ?)";
    db.query(auditSql, [auditData.admin_id, auditData.adminName, auditData.timestamp, auditData.method, JSON.stringify(auditData.body)], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}
//transfer to external hospital
const transfer = asyncHandler(async (req, res) => {
  const {
    student_id,
    transferReason,
    notes,
    medicEx_id,
    clinic_id,
    exHosp_id,
  } = req.body;

  try {
    // Check if the medical examination status is 'مقبول'
    const medicalExamResult = await checkMedicalExamStatus(medicEx_id);
    if (medicalExamResult.length === 0) {
      throw new Error('Medical examination not accepted');
    }

    // Check if the student_id exists in the students table
    const studentResult = await checkStudentExist(student_id);
    if (studentResult.length === 0) {
      throw new Error('Invalid student_id');
    }

    // Check if the transfer has already been done
    // const existingTransfer = await checkExistingTransfer(medicEx_id);
    // if (existingTransfer.length > 0) {
    //   throw new Error('Transfer already done for this student');
    // }

    // Check if the clinic_id exists in the clinics table
    const clinicResult = await checkClinicExist(clinic_id);
    if (clinicResult.length === 0) {
      throw new Error('Invalid clinic_id');
    }

    // Check if the exHosp_id exists in the external_hospitals table
    const exHospResult = await checkExHospExist(exHosp_id);
    if (exHospResult.length === 0) {
      throw new Error('Invalid exHosp_id');
    }

    // Insert transfer record
    await insertTransferRecord(student_id, transferReason, notes, medicEx_id, clinic_id, exHosp_id);

    //update transfered value to 1
    const updateSql = "UPDATE medical_examinations SET transfered = 1 WHERE medicEx_id = ?";
    db.query(updateSql, [medicEx_id], (err, result) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      }
    });
    // Audit log
    const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
    const auditData = {
      timestamp: new Date().toISOString(),
      method: 'تحويل طالب',
      body: {
        student_id,
        transferReason,
        notes,
        medicEx_id,
        clinic_id,
        exHosp_id,
      },
      admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
      adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
    };
    await insertAuditLog(auditData);
    res.status(200).json({ message: 'تم التحويل بنجاح' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// get all transfered
const getTransfered = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const searchKey = req.query.searchKey || '';
  const offset = (page - 1) * limit;

  const searchParam = `%${searchKey}%`;
  const countSql = `
    SELECT COUNT(*) AS count 
    FROM medical_examinations 
    LEFT JOIN students ON medical_examinations.student_id = students.student_id 
    LEFT JOIN clinics ON medical_examinations.clinic_id = clinics.clinic_id
    LEFT JOIN levels ON students.level_id = levels.level_id
    LEFT JOIN transfers ON medical_examinations.medicEx_id = transfers.medicEx_id
    LEFT JOIN external_hospitals ON transfers.exHosp_id = external_hospitals.exHosp_id
    WHERE 
      medical_examinations.status = "مقبول" AND (
        medical_examinations.examType LIKE ? OR 
        medical_examinations.status LIKE ? OR 
        students.userName LIKE ? OR 
        students.email LIKE ? OR 
        students.national_id LIKE ? OR 
        students.nationality_id LIKE ? OR 
        students.level_id LIKE ? OR 
        students.gov_id LIKE ? OR 
        students.faculty_id LIKE ? OR 
        students.phoneNumber LIKE ? OR
        clinics.clinicName LIKE ? OR
        levels.levelName LIKE ? OR
        transfers.transferReason LIKE ? OR
        transfers.notes LIKE ? OR
        external_hospitals.hospName LIKE ?
      )
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
      medical_examinations.status = "مقبول" AND (
        medical_examinations.examType LIKE ? OR 
        medical_examinations.status LIKE ? OR 
        students.userName LIKE ? OR 
        students.email LIKE ? OR 
        students.national_id LIKE ? OR 
        students.nationality_id LIKE ? OR 
        students.level_id LIKE ? OR 
        students.gov_id LIKE ? OR 
        students.faculty_id LIKE ? OR 
        students.phoneNumber LIKE ? OR
        clinics.clinicName LIKE ? OR
        levels.levelName LIKE ? OR
        transfers.transferReason LIKE ? OR
        transfers.notes LIKE ? OR
        external_hospitals.hospName LIKE ?
      )
    ORDER BY
      medical_examinations.medicEx_id DESC
    LIMIT ? OFFSET ?
  `;

  // Get the total count of records matching the search criteria
  db.query(countSql, [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam], (err, countResults) => {
    if (err) {
      console.error("Error fetching count of examinations:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const totalCount = countResults[0].count;
    const totalPages = Math.ceil(totalCount / limit);

    // Check if totalCount is empty
    if (!totalCount) {
      return res.status(404).json({ msg: "No examinations found" });
    }

    // Get the paginated results with search criteria
    db.query(sql, [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, limit, offset], (error, results) => {
      if (error) {
        console.error("Error fetching examination data:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Converting the time-zone to Cairo time-zone
      results.forEach(result => {
        result.date = new Date(result.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
      });

      // Examinations found, return them
      res.status(200).json({
        totalPages,
        currentPage: page,
        data: results
      });
    });
  });
});




// update transfer
const updateTransfer = asyncHandler(async (req, res) => {
  const { transfer_id } = req.params;
  const { student_id, transferReason, notes, exHosp_id } = req.body;
  const checkSql = "SELECT * FROM transfers WHERE transfer_id=?";
  db.query(checkSql, [transfer_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res.status(StatusCode.NOT_FOUND).json({ error: "التحويل غير موجود" });
    }
    const updateSql = "UPDATE transfers SET student_id=?,transferReason=?,notes=?,exHosp_id=? WHERE transfer_id=?";
    db.query(updateSql, [student_id, transferReason, notes, exHosp_id, transfer_id], (err, result) => {
      if (err) {
        return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      }

      // Audit log
      const isSuperAdmin = req.user[0].role === Roles.SUPER_ADMIN; // Check if the user is a super admin
      const auditData = {
        timestamp: new Date().toISOString(),
        method: 'تعديل تحويل طالب',
        body: {
          student_id,
          transferReason,
          notes,
          exHosp_id,
        },
        admin_id: isSuperAdmin ? req.user[0].superAdmin_id : req.user[0].user_id,
        adminName: isSuperAdmin ? req.user[0].name : req.user[0].userName,
      };
      insertAuditLog(auditData);

      return res.status(StatusCode.OK).json({ message: "تم تعديل التحويل بنجاح" });
    });
  });
});

// Search with multiple fields
const reservationSearch = asyncHandler(async (req, res) => {
  const { searchKey } = req.query;
  const sql = "SELECT * FROM medical_examinations WHERE examType LIKE ? OR status LIKE ? OR transfered LIKE ? ";
  db.query(sql, [`%${searchKey}%`, `%${searchKey}%`, `%${searchKey}%`, `%${searchKey}%`], (err, results) => {
    if (err) {
      res.status(400).json({ msg: err.message });
    } else {
      if (results.length === 0) {
        res.status(404).json({ msg: "No students found" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  });
});

// Search students with multiple fields
const studentSearch = asyncHandler(async (req, res) => {
  const { searchKey } = req.query;
  const sql = `
  SELECT 
      * 
  FROM 
      students 
  WHERE 
      userName LIKE ? 
      OR email LIKE ? 
      OR national_id LIKE ? 
      OR nationality_id LIKE ? 
      OR level_id LIKE ? 
      OR gov_id LIKE ? 
      OR faculty_id LIKE ? 
      OR phoneNumber LIKE ?
`;
  db.query(sql, [
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`,
    `%${searchKey}%`
  ], (err, results) => {
    if (err) {
      res.status(400).json({ msg: err.message });
    } else {
      if (results.length === 0) {
        res.status(404).json({ msg: "No students found" });
      } else {
        res.status(200).json({ data: results });
      }
    }
  }
  );
})

export {
  resetPassword,
  viewAdmin,
  getAllAdmin,
  deleteAdmin,
  sendObservation,
  acceptOrDecline,
  getAllUserProfiles,
  addStudent,
  updateUserProfile,
  deleteUserProfile,
  blockUser,
  unblockUser,
  searchStudent,
  advancedSearch,
  filterStudents,
  transfer,
  updateTransfer,
  reservationSearch,
  studentSearch,
  getAdminLogs,
  getSpecificAdminLogs,
  clearHistory,
  clearSpecificHistory,
  addNewAdmin,
  addSuperAdmin,
  updateAdmin,
  getStatistics,
  getReservationsByMonth,
  getTransfered,
}