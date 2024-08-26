// auth.js

const jwt = require('jsonwebtoken');
const blacklist = new Set(); // In-memory blacklist, consider using a database in production
const allowedIPs = ['192.168.1.1', '127.0.0.1']; // Example whitelist

module.exports = function(role) {
    return function(req, res, next) {
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ error: 'Access denied' });

        if (blacklist.has(token)) {
            return res.status(403).json({ error: 'Token is blacklisted' });
        }

        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = verified;

            // Session Timeout Logic
            const sessionAge = Date.now() - verified.iat * 1000;
            if (sessionAge > process.env.SESSION_TIMEOUT) {
                return res.status(401).json({ error: 'Session expired, please log in again' });
            }

            // IP Whitelisting Check
            if (!allowedIPs.includes(req.ip)) {
                return res.status(403).json({ error: 'Access denied: IP not whitelisted' });
            }

            if (role && !req.admin.roles.includes(role)) {
                return res.status(403).json({ error: `Access forbidden: ${role} role required` });
            }

            next();
        } catch (error) {
            res.status(400).json({ error: 'Invalid token' });
        }
    };
};

// Add to blacklist on logout
exports.logout = (req, res) => {
    const token = req.header('Authorization');
    blacklist.add(token);
    res.status(200).json({ message: 'Logout successful' });
};

