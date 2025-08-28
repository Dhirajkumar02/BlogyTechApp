const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    verbose: true,
});

// Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "blogytech", // Cloudinary Folder Name
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
        transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
});

// Multer instance
const upload = multer({ storage });

module.exports = upload;
