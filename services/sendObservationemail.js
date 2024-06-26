import nodemailer from "nodemailer";

const sendObservationMail = async (email, observation, name) => {
    try {
        const recipientEmail = email;
        const emailBody = `<style>
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
    
        .observation {
            display: inline-block;
            font-size: 16px;
            margin: 15px 0;
            padding: 8px;
            color: #fff;
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
            <h1>مستشفي حلوان</h1>
            <h2> ${name} أهلا </h2>
        </div>
        <div class="content">
            <span class="observation">${observation}</span>
        </div>
        <div class="footer">
            <p class="branding">صحتك تهمنا</p>
        </div>
    </div>
    </body>`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "inkozeks@gmail.com",
                pass: "tvwxgyrfnzfvrxia",
            },
        });

        const info = await transporter.sendMail({
            from: "مستشفي جامعة حلوان",
            to: recipientEmail,
            subject: "observation",
            html: emailBody,
        });

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending observation email:", error);
    }
};

export default sendObservationMail;
