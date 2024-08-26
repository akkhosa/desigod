// videoModel.js

const mongoose = require('mongoose');
const crypto = require('crypto');
const zlib = require('zlib');

// Encryption function
const encrypt = (text) => {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

// Decryption function
const decrypt = (text) => {
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

// Compression function
const compress = (text) => {
    return zlib.deflateSync(text).toString('base64');
};

// Decompression function
const decompress = (text) => {
    return zlib.inflateSync(Buffer.from(text, 'base64')).toString('utf8');
};

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true, minlength: 3 },
    description: { 
        type: String, 
        required: true,
        set: compress, 
        get: decompress,
    },
    originalPath: { 
        type: String, 
        required: true,
        get: decrypt,
        set: encrypt,
    },
    encodedPath: { 
        type: String,
        get: decrypt,
        set: encrypt,
    },
    thumbnailPath: { 
        type: String,
        get: decrypt,
        set: encrypt,
    },
    uploadDate: { type: Date, default: Date.now, index: true },
    views: { type: Number, default: 0, index: true }, // Indexed for better performance
    fileSize: { type: Number, required: true },
    quality: { 
        bitrate: { type: Number },
        resolution: { type: String },
        duration: { type: Number },
    },
    deletedAt: { type: Date }, // For soft deletes
}, { timestamps: true });

// Method to mark video as deleted (soft delete)
videoSchema.methods.softDelete = function() {
    this.deletedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Video', videoSchema);

