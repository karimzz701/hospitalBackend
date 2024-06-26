import expressAsyncHandler from "express-async-handler";
import db from "../config/db.js";
import nodemailer from "nodemailer";

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const updatePasswordWithOTP = async (student_id, otp) => {
    // Update the user record with the generated OTP
    db.query('UPDATE students SET otp = ? WHERE student_id = ?', [otp, student_id]);
};

const sendOTPByEmail = async (email, otp, name) => {
    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'inkozeks@gmail.com',
            pass: 'tvwxgyrfnzfvrxia'
        }
    });

    // Define the email options
    const mailOptions = {
        from: 'HelwanHospital@gmail.com',
        to: email,
        subject: 'OTP for Password Reset',
        html: ` <style>
        body {
            background-color: #F3F8FF;
            color: #fff;
            font-family: 'Tajawal', sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }
  
        @font-face {
            font-family: 'Tajawal';
            src: url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400&display=swap');
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            text-align: center;
            background-color: #0C2D57;
            border-radius: 25px;
            box-shadow:0 0 22px rgba(0, 0, 0, 0.5);
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
            color: #56F1BD;
        }
  
        .otp-code {
            display: inline-block;
            font-size: 28px;
            margin: 15px 0;
            padding: 8px;
            color: #6FEDD6;
            font-weight: bold;
            border: 3px solid #15F5BA;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
        }
  
        .footer {
            padding: 20px 0;
        }
  
        .branding {
            color: #fff;
            font-weight: bold;
        }
    </style>
  </head>
  
  <body>
    <div class="container">
        <div class="header">
            <h1> في مستشفى حلوان ${name} أهلا </h1>
        </div>
  
        <div class="content">
            <p>
            شكراً إنك اخترت مستشفى حلوان عشان تكمل إجراءات تغيير الباسورد استخدم الرمز اللي تحت ده
            </p>
            <span class="otp-code">${otp}</span>
        </div>
        <div class="footer">
            <p class="branding">صحتك تهمنا</p>
        </div>
    </div>
  </body>
  `
    };

    // Send the email
    await transporter.sendMail(mailOptions);
};

export const sendOtp = expressAsyncHandler(async (req, res) => {
    const { email } = req.body;

    // Capture user's IP address and user-agent
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Log IP and user-agent to the console
    console.log('IP Address:', ip);
    console.log('User Agent:', userAgent);

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const sql = "SELECT * FROM students WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            if (result.length === 0) {
                res.status(404).json({ message: "User not found" });
            } else {
                const { email, student_id, userName } = result[0];
                console.log(email, student_id, userName);
                const otp = generateOTP();
                // Send OTP via email with name parameter
                sendOTPByEmail(email, otp, userName);
                // Update the user record with the generated OTP
                updatePasswordWithOTP(student_id, otp);
                return res.status(200).json({ success: true, message: 'OTP sent successfully' });
            }
        }
    });
});
