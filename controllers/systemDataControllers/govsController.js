import asyncHandler from "express-async-handler";
import db from "../../config/db.js";
import { StatusCode } from "../../utiles/statusCode.js";

//@desc     add new governorate
//@route    POST  /api/v1/sysdata/governorates
//@access   private
const createGovernorate = asyncHandler(async (req, res) => {
  const { govName } = req.body;
  const isExistSql = "SELECT * FROM governorates WHERE govName = ?";
  db.query(isExistSql, [govName], (err, result) => {
    if (result.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ message: `محافظة ${govName} موجودة بالفعل` });
    } else {
      const sql = "INSERT INTO governorates (govName) VALUES (?)";
      db.query(sql, [govName], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          console.log("Governorate created successfully");
          res
            .status(StatusCode.CREATED)
            .json({ message: `تم اضافة محافظة ${govName} بنجاح` });
        }
      });
    }
  });
});

//@desc     view list of governorates
//@route    GET  /api/v1/sysdata/governorates
//@access   private
const GetAllGovernorates = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM governorates";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      res.status(StatusCode.OK).json(results);
    }
  });
});

//@desc     update governorate
//@route    GET  /api/v1/sysdata/governorates
//@access   private
const updateGovernorate = asyncHandler(async (req, res) => {
  const { gov_id } = req.params;
  const { govName } = req.body;
  const checkSql = "SELECT * FROM governorates WHERE gov_id = ?";
  db.query(checkSql, [gov_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على المحافظة" });
    }

    const isExistSql = "SELECT * FROM governorates WHERE govName = ?";
    db.query(isExistSql, [govName], (err, result) => {
      if (result.length > 0) {
        return res
          .status(StatusCode.CONFLICT)
          .json({ message: `محافظة ${govName} موجودة بالفعل` });
      }

      const updateSql = "UPDATE governorates SET govName = ? WHERE gov_id = ?";
      db.query(updateSql, [govName, gov_id], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res
            .status(StatusCode.OK)
            .json({ message: `تم تعديل المحافظة بنجاح`, gov_id, govName });
        }
      });
    });
  });
});

//@desc     delete one governorate
//@route    DELETE  /api/v1/sysdata/governorates/:id
//@access   private
const deleteGovernorate = asyncHandler(async (req, res) => {
  const { gov_id } = req.params;

  const checkSql = "SELECT * FROM governorates WHERE gov_id = ?";
  let govName;
  db.query(checkSql, [gov_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على المحافظة" });
    }
    const { govName } = checkResult[0];

    const deleteSql = "DELETE FROM governorates WHERE gov_id = ?";
    db.query(deleteSql, [gov_id], (err, result) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        // Use govName in the response message
        res
          .status(StatusCode.OK)
          .json({ message: `تم حذف محافظة ${govName} بنجاح`, gov_id, govName });
      }
    });
  });
});

export{
  createGovernorate,
  GetAllGovernorates,
  updateGovernorate,
  deleteGovernorate
}

