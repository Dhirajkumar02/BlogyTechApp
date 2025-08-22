// utils/sendEmail.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transport = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // TLS
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.APP_PWD,
            },
        });

        const message = {
            from: `"MyApp Support" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
            text,
        };

        const info = await transport.sendMail(message);
        console.log("✅ Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Email error:", error);
        throw new Error("Email sending failed");
    }
};

module.exports = sendEmail;
