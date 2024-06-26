import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // Limit requests per 15 minutes
  max: 10, // Allow maximum of 5 requests per window
  message: { message: "!محاولات كثيرة برجاء المحاولة لاحقا" }, // Customize error message
});

export default limiter;
