const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { upload } = require('../middleware/multer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Enable CORS for specific routes
router.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
}));

// Global Rate Limiting Middleware
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
});

// Apply rate limiting
router.post(
    '/v1/upload', 
    globalLimiter,
    upload.single('video'),  
    videoController.uploadVideo
);

router.get(
    '/v1', 
    globalLimiter,
    (req, res, next) => {
        res.set('Cache-Control', 'public, max-age=60'); // Cache API response for 1 minute
        next();
    },
    videoController.getVideoMetadata
);

router.delete('/v1/:id', globalLimiter, videoController.deleteVideo);
router.get('/v1/stream/:id', globalLimiter, videoController.streamVideo);

module.exports = router;
