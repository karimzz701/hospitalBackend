import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import dotenv from "dotenv";
dotenv.config({ path: "config.env" });

export const sendConfirmationMail = async (email, name) => {
  // 1- Sign JWT token with user information and set expiration to 1 hour
  const confirmationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "5m",
  });

  // 2- Prepare confirmation mail for user
  const recipientEmail = email;
  const confirmationLink = `http://localhost:7000/api/v1/auth/confirmEmail?token=${confirmationToken}`;
  const emailBody = `
  <div style="background-color: #001f3f; color: #fff; font-family: 'Tajawal', sans-serif; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border-radius: 16px; background-color: #001f3f;">
        <h1 style="color: #fff; margin-bottom: 20px;">أهلاً بيك في مستشفى جامعة حلوان</h1>
        <h2 style="color: #fff;"> ${name}  أهلاً</h2>
        <p style="margin: 20px 0; font-size: 18px; color: #fff;">اضغط ع الزر تحت عشان تفعل بريدك الالكتروني</p>
        <a href="${confirmationLink}" style="display: inline-block; padding: 15px 30px; text-decoration: none; background-color: #004080; color: #ffffff; border-radius: 15px; font-weight: bold;">تأكيد البريد الإلكتروني</a>
        <p style="color: red; margin-top: 20px; font-weight:bolder">الرابط هينتهي بعد خمس دقايق!</p>
        <p style="color: #fff;">صحتك تهمنا</p>
    </div>
  </div>
  `;

  // 3- Send confirmation mail to user
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: '"مستشفي جامعة حلوان" <inkozeks@gmail.com>',
    to: recipientEmail,
    subject: "Confirmation Email!",
    html: emailBody,
  });

  console.log("Message sent: %s", info.messageId);
};

export const confirmEmail = (req, res) => {
  const { token } = req.query;
  console.info("Hello from confirmation email");

  // Verify JWT token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(400).json({ success: false, error: "Invalid JWT token." });
    }

    // Update the user's confirmation status
    db.query("UPDATE superadmin SET confirmed = 1 WHERE email = ?", [decoded.email]);

    return res.status(202).send(`
    <style>
      body {
        background-color: #0C2D57;
        color: #343a40;
        font-family: 'Tajawal', sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }

      .container {
        width: 100%;
        background-color: #004080;
        max-width: 600px;
        margin: 0 auto;
        padding: 30px;
        text-align: center;
        background-color: #;
        border-radius: 10px;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
      }

      .header {
        padding: 20px 0;
      }

      h1 {
        color: #fff;
        margin: 0;
        font-size: 24px;
      }

      .content {
        padding: 20px 0;
      }

      p {
        margin: 0;
        font-size: 16px;
        color: #fff;
      }

      .footer {
        padding: 20px 0;
      }

      .branding {
        color: #fff;
        font-weight: bold;
      }
    </style>
    <body>
      <div class="container">
        <div class="header">
          <h1>تم تأكيد بريدك الإلكتروني بنجاح</h1>
        </div>
        <div class="content">
          <p>شكراً لك لتأكيد بريدك الإلكتروني</p>
        </div>
        <div class="footer">
          <p class="branding">صحتك تهمنا</p>
        </div>
      </div>
    </body>`);
  });
};
