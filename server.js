// IMPORTING DEPENDENCIES
import path from "path";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import redis from "redis";
import cors from "cors";

// Load environment variables
dotenv.config({ path: "config.env" });

import ApiError from "./utiles/apiError.js";
import globalError from "./middlewares/errorMiddleware.js";

// ROUTES
import userReservationRoute from "./APIs/UserReservationRoute.js";
import adminReservationRoute from "./APIs/AdminReservationRoute.js";
import authRoute from "./APIs/authRoute.js";
import adminCrudRoute from "./APIs/AdminCrudRoute.js";
import userProfileRoute from "./APIs/userProfileRoute.js";

// System data routes
import levelsRoute from "./APIs/systemDataApis/levelsRoute.js";
import govsRoute from "./APIs/systemDataApis/govsRoute.js";
import clinicsRoute from "./APIs/systemDataApis/clinicsRoute.js";
import facultyRoute from "./APIs/systemDataApis/facultyRoute.js";
import hospRoute from "./APIs/systemDataApis/hospRoute.js";

import userSecRoute from "./APIs/userSecRoute.js";

// Express app
const app = express();
app.use(cors());
app.use('/api/v1/uploads', express.static(path.join(process.cwd(), 'uploads')));

// DATABASE CONNECTION
import dbConnection from "./config/db.js";
import { deActivateUser } from "./services/cronExpireMiddleware.js";

dbConnection.connect((err) => {
  if (err) {
    console.error("Unable to connect to MySQL:", err);
    return;
  }

  const dbName = process.env.NODE_ENV === 'development' ? process.env.DEV_DB : process.env.NODE_ENV === 'testing' ? process.env.TEST_DB : process.env.PROD_DB;
  console.log(`${dbName} DB Connected 🚀`);
});

// MIDDLEWARE FOR PARSING JSON REQUESTS
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(process.cwd(), "uploads")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
} else if (process.env.NODE_ENV === "testing") {
  app.use(morgan("test"));
  console.log(`mode: ${process.env.NODE_ENV} ⚒️`);
}

// MOUNT ROUTES
app.use("/api/v1/Myreservations/", userReservationRoute);
app.use("/api/v1/reservations/", adminReservationRoute);
app.use("/api/v1/auth/", authRoute);
app.use("/api/v1/admin/", adminCrudRoute);
app.use("/api/v1/password/", userSecRoute);
app.use("/api/v1/myProfile/", userProfileRoute);
app.use(
  "/api/v1/sysdata/",
  levelsRoute,
  govsRoute,
  clinicsRoute,
  facultyRoute,
  hospRoute
);

app.all("*", (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 400));
});

// GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalError);

// Start the server and store the result in a variable
const port = 8080 || process.env.PORT;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port} `);
});

// DEACTIVATE ACCOUNTS
deActivateUser();

// HANDLING REJECTIONS OUTSIDE EXPRESS
process.on("unhandledRejection", (err) => {
  console.log(`unhandled error: ${err.name} | ${err.message}`);
  server.close(() => {
    console.log("shutting down....");
    process.exit(1);
  });
});

export default app;
