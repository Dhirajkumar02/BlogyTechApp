const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config(); // Load .env variables

// Backend URL for testing via Postman
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
//const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
//const PROD_FRONTEND_URL = process.env.PROD_FRONTEND_URL;

// Nodemailer transport
const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.APP_PWD, // App password
    },
});

/**
 * Send Reset Password Email
 * @param {string} to - recipient email
 * @param {string} resetToken - token
 */
const sendResetPasswordEmail = async (to, resetToken) => {
    const resetUrl = `${BACKEND_URL}/api/v1/users/reset-password/${resetToken}`;
    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Password Reset Request",
        html: `
            <p>You requested to reset your password.</p>
            <p>Click below to reset:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you did not request this, ignore this email.</p>
        `,
    };
    await transport.sendMail(message);
};

/**
 * Send Account Verification Email
 * @param {string} to - recipient email
 * @param {string} verificationToken - token
 */
const sendAccountVerificationEmail = async (to, verificationToken) => {
    const verifyUrl = `${BACKEND_URL}/api/v1/users/verify-account/${verificationToken}`;
    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Verify Your Account",
        html: `
            <p>Welcome! Please verify your account.</p>
            <p>Click below to verify:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>If you did not sign up, ignore this email.</p>
        `,
    };
    await transport.sendMail(message);
};

/**
 * Send OTP Email
 * @param {string} to - recipient email
 * @param {string} otpCode - OTP code
 */
const sendOtpEmail = async (to, otpCode) => {
    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Your OTP Code",
        html: `
            <p>Your OTP code is:</p>
            <h2>${otpCode}</h2>
            <p>This code will expire in 5 minutes.</p>
        `,
    };
    await transport.sendMail(message);
};

module.exports = {
    sendResetPasswordEmail,
    sendAccountVerificationEmail,
    sendOtpEmail,
};
