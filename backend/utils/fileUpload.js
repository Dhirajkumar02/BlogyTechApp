const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// -------------------
// Cloudinary config
// -------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    verbose: true,
});

// -------------------
// Cloudinary Storage
// -------------------
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let resourceType = "auto";

        if (file.mimetype.startsWith("image")) resourceType = "image";
        else if (file.mimetype.startsWith("video")) resourceType = "video";
        else if (file.mimetype.startsWith("audio")) resourceType = "video";
        else resourceType = "raw";

        return { folder: "blogytech", resource_type: resourceType };
    },
});

// -------------------
// Allowed file types
// -------------------
const allowedTypes = {
    images: ["image/jpg", "image/jpeg", "image/png", "image/gif"],
    videos: ["video/mp4", "video/mpeg"],
    audios: ["audio/mpeg", "audio/mp3"],
    docs: ["application/pdf", "application/zip"],
};

// -------------------
// File filter
// -------------------
const fileFilter = (req, file, cb) => {
    const { mimetype } = file;

    if (
        [
            ...allowedTypes.images,
            ...allowedTypes.videos,
            ...allowedTypes.audios,
            ...allowedTypes.docs,
        ].includes(mimetype)
    ) {
        let maxSize = 0;
        if (allowedTypes.images.includes(mimetype)) maxSize = 10 * 1024 * 1024;
        else if (allowedTypes.videos.includes(mimetype)) maxSize = 50 * 1024 * 1024;
        else if (allowedTypes.audios.includes(mimetype)) maxSize = 20 * 1024 * 1024;
        else maxSize = 5 * 1024 * 1024;

        if (!req.fileSizeLimits) req.fileSizeLimits = {};
        req.fileSizeLimits[file.originalname] = maxSize;

        return cb(null, true);
    }

    const error = new Error("Unsupported file type.");
    error.statusCode = 400;
    error.status = "fail";
    return cb(error, false);
};

// -------------------
// Multer instance
// -------------------
const upload = multer({ storage, fileFilter });

// -------------------
// Check file size middleware
// -------------------
const checkFileSize = (req, res, next) => {
    const allFiles = [];

    if (req.file) allFiles.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) allFiles.push(...req.files);
        else
            Object.values(req.files).forEach((f) =>
                Array.isArray(f) ? allFiles.push(...f) : allFiles.push(f)
            );
    }

    for (let file of allFiles) {
        const limit = req.fileSizeLimits?.[file.originalname] || 0;
        if (file.size > limit) {
            const error = new Error(
                `File "${file.originalname
                }" is too large. Max allowed size is ${Math.round(
                    limit / (1024 * 1024)
                )} MB.`
            );
            error.statusCode = 400;
            error.status = "fail";
            return next(error);
        }
    }

    next();
};

// -------------------
// Multer error handler
// -------------------
const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let message = "File upload error.";
        if (err.code === "LIMIT_FILE_SIZE") message = "File too large.";
        else if (err.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected file.";

        const error = new Error(message);
        error.statusCode = 400;
        error.status = "fail";
        return next(error);
    }
    next(err);
};

// -------------------
// 🔑 Helper: Upload buffer to Cloudinary
// -------------------
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// -------------------
// 🔑 Helper: Delete file from Cloudinary by public_id
// -------------------
const deleteFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
};

module.exports = {
    upload,
    checkFileSize,
    multerErrorHandler,
    uploadToCloudinary,
    deleteFromCloudinary,
};
