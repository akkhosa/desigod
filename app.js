require('dotenv').config(); // Load environment variables

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { upload } = require('./middleware/multer'); // Import multer configuration
const videoRoutes = require('./routes/videoRoutes'); // Import video routes
const adminRoutes = require('./routes/adminRoutes'); // Import admin routes
const logger = require('./utils/logger'); // Import logger utility
const { auth } = require('./middleware/auth'); // Import authentication middleware
const WebSocket = require('ws');
const os = require('os');

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet()); // Security middleware
app.use(cors()); // Enable CORS
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } })); // Logging requests
app.use(compression()); // Compress responses

// Static files - Serving the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection setup
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/desigod';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => logger.info('MongoDB connected successfully'))
    .catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket server setup for real-time notifications
const wss = new WebSocket.Server({ noServer: true });
app.wss = wss; // Attach WebSocket server to the app

wss.on('connection', (socket, request) => {
    const token = request.url.split('token=')[1]; // Extract token from query string
    if (!token || !auth.verifyToken(token)) { // Assuming auth.verifyToken is a function to verify tokens
        socket.close(1008, 'Invalid token');
        return;
    }

    socket.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.message === 'Request server status') {
            const status = {
                cpu: Math.round(os.loadavg()[0] * 100) / 100, // 1-minute load average
                memory: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)
            };
            socket.send(JSON.stringify({ message: 'Server status update', status }));
        }
    });
});

// Serve frontend HTML files directly for specific routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'page.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Global Error Handler:', err.message);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// PWA manifest and service worker setup
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit('connection', socket, request);
    });
});
