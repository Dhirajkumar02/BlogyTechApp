const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

//const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Nodemailer transport config
const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.APP_PWD,
    },
});

/**
 * Send Reset Password Email
 */
const sendResetPasswordEmail = async (to, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Password Reset Request",
        html: `
            <p>You requested to reset your password.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you did not request this, please ignore this email.</p>
        `,
    };

    await transport.sendMail(message);
};

/**
 * Send Account Verification Email
 */
const sendAccountVerificationEmail = async (to, verificationToken) => {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-account/${verificationToken}`;

    const message = {
        from: `"Teczeon Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Verify Your Account",
        html: `
            <p>Welcome! Please verify your account.</p>
            <p>Click the link below to verify:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>If you did not sign up, please ignore this email.</p>
        `,
    };

    await transport.sendMail(message);
};

/**
 * Send OTP Email
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
