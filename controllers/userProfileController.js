import asyncHandler from "express-async-handler";
import db from "../config/db.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { StatusCode } from "../utiles/statusCode.js";

//@desc user access profile data
//@route    POST  /api/v1/myProfile/:id
//@access   public
const getStudentProfile = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  let sql =
    "SELECT students.*, levels.levelName AS level_name, faculties.facultyName AS faculty_name,governorates.govName AS gov_name , nationality.nationalityName AS nationality_name FROM students";
  sql += " LEFT JOIN levels ON students.level_id = levels.level_id";
  sql += " LEFT JOIN governorates ON students.gov_id = governorates.gov_id";
  sql +=
    " LEFT JOIN nationality ON students.nationality_id = nationality.nationality_id";
  sql += " LEFT JOIN faculties ON students.faculty_id = faculties.faculty_id";
  sql += " WHERE students.student_id = ?";

  db.query(sql, [student_id], (err, student) => {
    if (err) {
      res.status(500).json(err);
    } else if (student.length === 0) {
      res.status(404).json({ msg: `No student for this id ${student_id}` });
    } else {
      console.info("request created successfully");
      res.status(201).json({ student });
    }
  });
});

const multerStorage = multer.memoryStorage();
const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images are allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
const uploadUserImage = upload.single("userImage_file");

const resizeImage = asyncHandler(async (req, res, next) => {
  const filename = `profile-${uuidv4()}-${Date.now()}.jpeg`;

  const directory = "uploads";
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 95 })
    .toFile(path.join(directory, filename));

  req.body.userImage_file = filename;
  next();
});

//@desc user update profile data
//@route    POST  /api/v1/myProfile/:id
//@access   public
const updateUserProfile = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const { userName, phoneNumber, level_id, gov_id, national_id } = req.body;

  // First, check if the provided level_id and gov_id exist in their respective tables
  const levelCheckSql = "SELECT COUNT(*) AS count FROM levels WHERE level_id = ?";
  const govCheckSql = "SELECT COUNT(*) AS count FROM governorates WHERE gov_id = ?";
  // const nationalIdSql = "SELECT COUNT(*) AS count FROM students WHERE national_id = ?";

  db.query(levelCheckSql, [level_id], (err, levelResult) => {
    if (err) {
      return res.status(StatusCode.BAD_REQUEST).json({ msg: "Error checking level_id: " + err.message });
    } else if (levelResult[0].count === 0) {
      return res.status(StatusCode.BAD_REQUEST).json({ msg: `Invalid level_id: ${level_id}` });
    } else {
      db.query(govCheckSql, [gov_id], (err, govResult) => {
        if (err) {
          return res.status(StatusCode.BAD_REQUEST).json({ msg: "Error checking gov_id: " + err.message });
        } else if (govResult[0].count === 0) {
          return res.status(StatusCode.BAD_REQUEST).json({ msg: `Invalid gov_id: ${gov_id}` });
        } else {
          // db.query(nationalIdSql, [national_id], (err, nationalIdResult) => {
          //   if (err) {
          //     return res.status(StatusCode.BAD_REQUEST).json({ msg: "Error checking national_id: " + err.message });
          //   } else if (nationalIdResult[0].count > 0) {
          //     return res.status(StatusCode.CONFLICT).json({ msg: `الرقم القومي موجود بالفعل` });
          //   } else {
          // If both level_id and gov_id are valid and national_id does not exist, proceed to update the user profile
          const sql =
            "UPDATE students SET userName=?, phoneNumber=?, level_id=?, gov_id=?, national_id=? WHERE student_id=?";
          db.query(
            sql,
            [userName, phoneNumber, level_id, gov_id, national_id, student_id],
            (err, result) => {
              if (err) {
                return res.status(StatusCode.BAD_REQUEST).json( err.message );
              } else {
                if (result.affectedRows === 0) {
                  return res
                    .status(StatusCode.NOT_FOUND)
                    .json({ msg: `No student found with ID ${student_id}` });
                } else {
                  return res.status(StatusCode.OK).json({ message: "تم تحديث البيانات بنجاح" });
                }
              }
            }
          );
        }
      });
    }
  });
}
);


const getProfilePhoto = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const { userImage_file } = req.body;
  const query = "UPDATE students SET userImage_file=? WHERE student_id=?";
  db.query(query, [userImage_file, student_id], (err, result) => {
    if (err) {
      console.error("Error updating user profile photo:", err);
      return res
        .status(500)
        .json({ message: "Error updating user profile photo" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User profile not found" });
    }
    return res
      .status(200)
      .json({ message: "User profile photo updated successfully", result });
  });
});

const updateProfilePhoto = asyncHandler(async (req, res) => {
  const { student_id } = req.params;
  const { userImage_file } = req.body;
  console.log(student_id);
  console.log(userImage_file);
  const query = "UPDATE students SET userImage_file=? WHERE student_id=?";
  db.query(query, [userImage_file, student_id], (err, result) => {
    if (err) {
      console.error("Error updating user profile photo:", err);
      return res
        .status(500)
        .json({ message: "Error updating user profile photo" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User profile not found" });
    }
    return res
      .status(200)
      .json({ message: "User profile photo updated successfully", result });
  });
});

export {
  getStudentProfile,
  updateProfilePhoto,
  getProfilePhoto,
  uploadUserImage,
  resizeImage,
  updateUserProfile,
};
