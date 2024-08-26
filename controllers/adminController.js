// adminController.js

const Admin = require('../models/adminModel');
const Video = require('../models/videoModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const speakeasy = require('speakeasy'); // For 2FA

// Custom Error Class
class AdminError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

// IP Whitelisting Middleware
const ipWhitelist = ['192.168.1.1', '127.0.0.1']; // Example IP addresses
const checkIPWhitelist = (req, res, next) => {
    const clientIP = req.ip;
    if (!ipWhitelist.includes(clientIP)) {
        return res.status(403).json({ error: 'Access denied: IP not whitelisted' });
    }
    next();
};

// 2-Factor Authentication Setup (Optional)
exports.setup2FA = [checkIPWhitelist, async (req, res, next) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        const admin = await Admin.findById(req.admin.id);
        admin.twoFactorSecret = secret.base32;
        await admin.save();

        logger.info(`2FA setup for admin ${req.admin.username}`, { ip: req.ip, userAgent: req.get('User-Agent') });

        res.status(200).json({ secret: secret.otpauth_url });
    } catch (error) {
        logger.error('2FA Setup Error:', error.message);
        next(new AdminError('Failed to set up 2FA', 500));
    }
}];

// 2FA Verification during Login
exports.login = async (req, res, next) => {
    try {
        const { username, password, token: userToken } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin) {
            throw new AdminError('Invalid credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new AdminError('Invalid credentials', 401);
        }

        // Verify 2FA token
        if (admin.twoFactorSecret) {
            const verified = speakeasy.totp.verify({
                secret: admin.twoFactorSecret,
                encoding: 'base32',
                token: userToken,
            });
            if (!verified) {
                throw new AdminError('Invalid 2FA token', 401);
            }
        }

        const jwtToken = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        logger.info(`Admin ${admin.username} logged in successfully`, { ip: req.ip, userAgent: req.get('User-Agent') });

        res.status(200).json({ message: 'Login successful', token: jwtToken });
    } catch (error) {
        next(error instanceof AdminError ? error : new AdminError('Failed to login', 500));
    }
};

// Fetch Detailed Dashboard Data with Enhanced Logging
exports.getDashboardData = async (req, res, next) => {
    try {
        const videoCount = await Video.countDocuments({});
        const adminCount = await Admin.countDocuments({});
        const totalStorage = await Video.aggregate([
            { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
        ]);
        const popularVideos = await Video.find().sort({ views: -1 }).limit(5);

        logger.info('Dashboard data retrieved by admin', { 
            adminId: req.admin.id, 
            ip: req.ip, 
            userAgent: req.get('User-Agent'),
            action: 'retrieve_dashboard_data' 
        });

        res.status(200).json({ 
            videoCount, 
            adminCount, 
            totalStorage: totalStorage[0]?.totalSize || 0, 
            popularVideos 
        });
    } catch (error) {
        next(new AdminError('Failed to retrieve dashboard data', 500));
    }
};
