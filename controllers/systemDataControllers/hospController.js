import asyncHandler from "express-async-handler";
import db from "../../config/db.js";
import { StatusCode } from "../../utiles/statusCode.js";

//@desc     add new hospital
//@route    POST  /api/v1/sysdata/hospitals
//@access   private
const createHospital = asyncHandler(async (req, res) => {
  const { hospName } = req.body;
  const isExistSql = "SELECT * FROM external_hospitals WHERE hospName = ?";
  db.query(isExistSql, [hospName], (err, result) => {
    if (result.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ message: `مستشفى ${hospName} موجود بالفعل` });
    } else {
      const sql = "INSERT INTO external_hospitals (hospName) VALUES (?)";
      db.query(sql, [hospName], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          console.log("Hospital has been added successfully");
          res.status(StatusCode.CREATED).json({
            message: `تم اضافة مستشفى ${hospName} بنجاح`,
          });
        }
      });
    }
  });
});


//@desc     view list of hospitals
//@route    GET  /api/v1/sysdata/hospitals
//@access   private
const getAllhospitals = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM external_hospitals";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("Request created successfully");
      res.json(results);
    }
  });
});


//@desc     update hospital
//@route    GET  /api/v1/sysdata/hospitals
//@access   private
const updateHospital = asyncHandler(async (req, res) => {
  const { exHosp_id } = req.params;
  const { hospName } = req.body;

  const checkSql = "SELECT * FROM external_hospitals WHERE exHosp_id = ?";
  db.query(checkSql, [exHosp_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على المستشفى" });
    }
    const isExistSql = "SELECT * FROM external_hospitals WHERE hospName = ?";
    db.query(isExistSql, [hospName], (err, result) => {
      if (result.length > 0) {
        return res
          .status(StatusCode.CONFLICT)
          .json({ message: `مستشفى ${hospName} موجود بالفعل` });
      }

      const updateSql = "UPDATE external_hospitals SET hospName = ? WHERE exHosp_id = ?";
      db.query(updateSql, [hospName, exHosp_id], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res
            .status(StatusCode.OK)
            .json({ message: `تم تعديل المستشفى بنجاح`, hospName });
        }
      });
    });
  });
});



//@desc     delete one hospital
//@route    DELETE  /api/v1/sysdata/hospitals/:id
//@access   private
const deleteHospital = asyncHandler(async (req, res) => {
  const { exHosp_id } = req.params;

  const checkSql = "SELECT * FROM external_hospitals WHERE exHosp_id = ?";

  db.query(checkSql, [exHosp_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على المستشفى" });
    }
    const { hospName } = checkResult[0];

    const deleteSql = "DELETE FROM external_hospitals WHERE exHosp_id = ?";
    db.query(deleteSql, [exHosp_id], (err, result) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        res.status(StatusCode.OK).json({
          message: `تم حذف المستشفى ${hospName} بنجاح`,
          exHosp_id,
        });
      }
    });
  });
});

export{
  createHospital,
  getAllhospitals,
  deleteHospital,
  updateHospital
}

