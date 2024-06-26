import asyncHandler from "express-async-handler";
import db from "../../config/db.js";
import { StatusCode } from "../../utiles/statusCode.js";

//@desc     add new level
//@route    POST  /api/v1/sysdata/levels
//@access   private
const createLevel = asyncHandler(async (req, res) => {
  const { levelName } = req.body;
  const isExistSql = "SELECT * FROM levels WHERE levelName = ?";
  db.query(isExistSql, [levelName], (err, result) => {
    if (result.length > 0) {
      return res
        .status(StatusCode.CONFLICT)
        .json({ message: `الفرقة ${levelName} موجودة بالفعل` });
    } else {
      const sql = "INSERT INTO levels (levelName) VALUES (?)";
      db.query(sql, [levelName], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          console.log("level created successfully");
          res.status(StatusCode.CREATED).json({
            message: `تم اضافة الفرقة ${levelName} بنجاح`,
          });
        }
      });
    }
  });
});

//@desc     view list of levels
//@route    GET  /api/v1/sysdata/levels
//@access   private
const GetAllLevels = asyncHandler(async (req, res) => {
  const sql = "SELECT * FROM levels";
  db.query(sql, (err, results) => {
    if (err) {
      res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
    } else {
      console.log("request created successfully");
      res.json(results);
    }
  });
});

//@desc     update level
//@route    GET  /api/v1/sysdata/levels
//@access   private
const updateLevel = asyncHandler(async (req, res) => {
  const { level_id } = req.params;
  const { levelName } = req.body;

  const checkSql = "SELECT * FROM levels WHERE level_id = ?";
  db.query(checkSql, [level_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res.status(StatusCode.NOT_FOUND).json({ error: "لم يتم العثور على الفرقة" });
    }

    const isExistSql = "SELECT * FROM levels WHERE levelName = ? AND level_id != ?";
    db.query(isExistSql, [levelName, level_id], (err, result) => {
      if (result.length > 0) {
        return res.status(StatusCode.CONFLICT).json({ message: `الفرقة ${levelName} موجودة بالفعل` });
      }

      const updateSql = "UPDATE levels SET levelName = ? WHERE level_id = ?";
      db.query(updateSql, [levelName, level_id], (err, result) => {
        if (err) {
          res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
        } else {
          res.status(StatusCode.OK).json({ message: `تم تعديل الفرقة بنجاح`, levelName });
        }
      });
    });
  });
});


//@desc     delete one level
//@route    DELETE  /api/v1/sysdata/levels/:id
//@access   private
const DeleteLevel = asyncHandler(async (req, res) => {
  const { level_id } = req.params;

  const checkSql = "SELECT * FROM levels WHERE level_id = ?";

  db.query(checkSql, [level_id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(StatusCode.INTERNAL_SERVER_ERROR).send(checkErr);
    }
    if (checkResult.length === 0) {
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ error: "لم يتم العثور على الفرقة" });
    }
    const { levelName } = checkResult[0];

    const deleteSql = "DELETE FROM levels WHERE level_id = ?";
    db.query(deleteSql, [level_id], (err, result) => {
      if (err) {
        res.status(StatusCode.INTERNAL_SERVER_ERROR).send(err);
      } else {
        // Use levelName in the response message
        res.status(StatusCode.OK).json({
          message: `تم حذف الفرقة ${levelName} بنجاح`,
          level_id,
        });
      }
    });
  });
});

export{
  createLevel,
  GetAllLevels,
  updateLevel,
  DeleteLevel
}
