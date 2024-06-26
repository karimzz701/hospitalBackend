import asyncHandler from "express-async-handler";
import db from "../../config/db.js";
import { StatusCode } from "../../utiles/statusCode.js";

//@desc     add new faculty
//@route    POST  /api/v1/sysdata/faculties
//@access   private
const createFaculty = asyncHandler(async (req, res) => {
  const { facultyName } = req.body;
  const isExistSql = "SELECT * FROM faculties WHERE facultyName = ?";
  db.query(isExistSql, [facultyName], (err, result) => {
    if (result.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ message: `كلية ${facultyName} موجودة بالفعل` });
    } else {
      const sql = "INSERT INTO faculties (facultyName) VALUES (?)";
      db.query(sql, [facultyName], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          console.log("faculty created successfully");
          res.status(StatusCode.CREATED).json({
            message: `تم اضافة كلية ${facultyName} بنجاح`,
          });
        }
      });
    }
  });
});

//@desc     view list of faculties
//@route    GET  /api/v1/sysdata/faculties
//@access   private
const getAllFaculties = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM faculties";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("request created successfully");
      res.json(results);
    }
  });
});

//@desc     update faculty
//@route    GET  /api/v1/sysdata/faculties
//@access   private
const updateFaculty = asyncHandler(async (req, res) => {
  const { faculty_id } = req.params;
  const { facultyName } = req.body;

  const checkSql = "SELECT * FROM faculties WHERE faculty_id = ?";
  db.query(checkSql, [faculty_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res.status(StatusCode.NOT_FOUND).json({ error: "لم يتم العثور على الكلية" });
    }

    const isExistSql = "SELECT * FROM faculties WHERE facultyName = ? AND faculty_id != ?";
    db.query(isExistSql, [facultyName, faculty_id], (err, result) => {
      if (result.length > 0) {
        return res.status(StatusCode.CONFLICT).json({ message: `الكلية ${facultyName} موجودة بالفعل` });
      }

      const updateSql = "UPDATE faculties SET facultyName = ? WHERE faculty_id = ?";
      db.query(updateSql, [facultyName, faculty_id], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res.status(StatusCode.OK).json({ message: `تم تعديل الكلية بنجاح`, facultyName });
        }
      });
    });
  });
});


//@desc     delete one faculty
//@route    DELETE  /api/v1/sysdata/faculties/:id
//@access   private
const deleteFaculty = asyncHandler(async (req, res) => {
  const { faculty_id } = req.params;

  const checkSql = "SELECT * FROM faculties WHERE faculty_id = ?";

  db.query(checkSql, [faculty_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على الكلية" });
    }
    const { facultyName } = checkResult[0];

    const deleteSql = "DELETE FROM faculties WHERE faculty_id = ?";
    db.query(deleteSql, [faculty_id], (err, result) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        // Use facultyName in the response message
        res.status(StatusCode.OK).json({
          message: `تم حذف كلية ${facultyName} بنجاح`,
          faculty_id,
        });
      }
    });
  });
});

export{
    createFaculty,
    getAllFaculties,
    updateFaculty,
    deleteFaculty
}