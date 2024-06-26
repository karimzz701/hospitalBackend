import { CronJob } from "cron";
import db from "../config/db.js";

const job = new CronJob(
  "0 0 1 1 *",
  async () => {
    try {
      const sql = "UPDATE students SET verified = 0 WHERE verified = 1";
      const result = await db.query(sql);
      console.log(
        `Account Deactivated⏳...Rows updated: ${result.affectedRows}`
      );
    } catch (error) {
      console.error("Error updating verified:", error);
    }
  },
  null,
  false,
  "Africa/Cairo"
);

export const deActivateUser = () => {
  job.start();
};
