const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for sensitive actions
const sensitiveActionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 sensitive actions per windowMs
    message: 'Too many sensitive actions, please try again later.',
});

// Session Timeout Middleware
const sessionTimeout = (req, res, next) => {
    const sessionAge = Date.now() - req.session.createdAt;
    if (sessionAge > process.env.SESSION_TIMEOUT) {
        return res.status(401).json({ error: 'Session expired, please log in again' });
    }
    next();
};

// Role Management Middleware
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.admin.roles.includes(requiredRole)) {
            return res.status(403).json({ error: `Access forbidden: ${requiredRole} role required` });
        }
        next();
    };
};

// Route for login with 2FA
router.post(
    '/v1/login', 
    sensitiveActionLimiter, 
    adminController.login
);

// Route for accessing the dashboard
router.get('/v1/dashboard', auth, sessionTimeout, checkRole('superadmin'), adminController.getDashboardData);

// Route for setting up 2FA
router.post('/v1/2fa/setup', auth, sessionTimeout, checkRole('superadmin'), sensitiveActionLimiter, adminController.setup2FA);

module.exports = router;
