const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { sendRestoreOtp } = require("../controllers/users/usersController");

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
const sendAccountReactivationEmail = async (to, otpCode) => {
    const otp = `${otpCode}`;
    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Account Reactivation OTP",
        html: `<p>Your OTP for account reactivation is <b>${otp}</b>.</p>
         <p>It will expire in 10 minutes.</p>`,
    };
    await transport.sendMail(message);
};

/**
 * Send OTP Email
 * @param {string} to - recipient email
 * @param {string} otpCode - OTP code
 */
const sendAccountRestoreEmail = async (to, otpCode) => {
    const otp = `${otpCode}`;
    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Restore your account - OTP Verification",
        html: `<p>Your OTP to restore your account is: <b>${otp}</b></p>
           <p>It will expire in 10 minutes.</p>`,
    };
    await transport.sendMail(message);
};

module.exports = {
    sendResetPasswordEmail,
    sendAccountVerificationEmail,
    sendAccountReactivationEmail,
    sendAccountRestoreEmail,
};
