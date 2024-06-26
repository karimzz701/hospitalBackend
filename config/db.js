import mysql from "mysql";
import dotenv from "dotenv";
dotenv.config({ path: "config.env" });

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.NODE_ENV === 'testing' ? process.env.TEST_DB : process.env.NODE_ENV === 'development' ? process.env.DEV_DB : process.env.PROD_DB,
});

export default db;
