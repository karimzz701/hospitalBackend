import asyncHandler from "express-async-handler";
import db from "../../config/db.js";
import { StatusCode } from "../../utiles/statusCode.js";

//@desc     add new clinic
//@route    POST  /api/v1/sysdata/clinics
//@access   private
const createClinic = asyncHandler(async (req, res) => {
  const { clinicName } = req.body;
  const isExistSql = "SELECT * FROM clinics WHERE clinicName = ?";
  db.query(isExistSql, [clinicName], (err, result) => {
    if (result.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ message: `عيادة ${clinicName} موجودة بالفعل` });
    } else {
      const sql = "INSERT INTO clinics (clinicName) VALUES (?)";
      db.query(sql, [clinicName], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          console.log("clinic created successfully");
          res.status(StatusCode.CREATED).json({
            message: `تم اضافة عيادة ${clinicName} بنجاح`,
          });
        }
      });
    }
  });
});

//@desc     view list of clinics
//@route    GET  /api/v1/sysdata/clinics
//@access   private
const getAllClinics = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM clinics";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("request created successfully");
      res.status(StatusCode.OK).json(results);
    }
  });
});

//@desc     update clinic
//@route    GET  /api/v1/sysdata/clinics
//@access   private
const updateClinic = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const { clinicName } = req.body;

  const checkSql = "SELECT * FROM clinics WHERE clinic_id = ?";
  db.query(checkSql, [clinic_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على العيادة" });
    }

    const isExistSql =
      "SELECT * FROM clinics WHERE clinicName = ? AND clinic_id != ?";
    db.query(isExistSql, [clinicName, clinic_id], (err, result) => {
      if (result.length > 0) {
        return res
          .status(StatusCode.CONFLICT)
          .json({ message: `العيادة ${clinicName} موجودة بالفعل` });
      }

      const updateSql = "UPDATE clinics SET clinicName = ? WHERE clinic_id = ?";
      db.query(updateSql, [clinicName, clinic_id], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res
            .status(StatusCode.OK)
            .json({ message: `تم تعديل العيادة بنجاح`, clinicName });
        }
      });
    });
  });
});

//@desc     delete one clinic
//@route    DELETE  /api/v1/sysdata/clinics/:id
//@access   private
const deleteClinic = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;

  const checkSql = "SELECT * FROM clinics WHERE clinic_id = ?";

  db.query(checkSql, [clinic_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على العيادة" });
    }
    const { clinicName } = checkResult[0];

    const deleteSql = "DELETE FROM clinics WHERE clinic_id = ?";
    db.query(deleteSql, [clinic_id], (err, result) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        // Use clinicName in the response message
        res.status(StatusCode.OK).json({
          message: `تم حذف عيادة ${clinicName} بنجاح`,
          clinic_id,
        });
      }
    });
  });
});

export{
    createClinic,
    getAllClinics,
    deleteClinic,
    updateClinic
}
