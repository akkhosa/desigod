// multer.js

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const clamav = require('clamav.js'); // For virus scanning
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// File filter function to restrict file types
const fileFilter = (req, file, cb) => {
    try {
        const allowedTypes = /mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    } catch (error) {
        cb(new Error('Error processing file type'));
    }
};

// Custom validation function for virus scanning
const validateFile = (filePath) => {
    return new Promise((resolve, reject) => {
        clamav.scan(filePath, 3310, 'localhost', (err, isClean) => {
            if (err) return reject(new Error('Virus scanning failed'));
            if (!isClean) return reject(new Error('File is infected with a virus'));
            resolve();
        });
    });
};

// File Integrity Check function
const checkFileIntegrity = (filePath) => {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
};

// Rate Limiting Middleware for Uploads
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 uploads per windowMs
    message: 'Too many uploads from this IP, please try again later.',
});

// Dynamic storage location based on file type
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            let storagePath;
            if (file.mimetype === 'video/mp4') {
                storagePath = path.join(__dirname, '../videos/mp4');
            } else {
                storagePath = path.join(__dirname, '../videos/others');
            }
            cb(null, storagePath);
        } catch (error) {
            cb(new Error('Error determining storage path'));
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB file size limit
    async fileFilter(req, file, cb) {
        try {
            await validateFile(file.path);
            const integrityHash = checkFileIntegrity(file.path);
            req.fileIntegrityHash = integrityHash;
            cb(null, true);
        } catch (error) {
            cb(error, false);
        }
    }
});

module.exports = { upload, uploadLimiter };
