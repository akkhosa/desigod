const fs = require('fs');
const path = require('path');
const Video = require('../models/videoModel');
const { encodeVideo, generateThumbnail } = require('../scripts/generateThumbnail');
const logger = require('../utils/logger');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Custom Error Class
class VideoError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Rate Limiter for Upload Requests
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 uploads per windowMs
    message: 'Too many uploads from this IP, please try again later.',
});

// Video Upload and Processing
exports.uploadVideo = [uploadLimiter, async (req, res, next) => {
    try {
        if (!req.file) {
            throw new VideoError('No video file provided', 400);
        }

        const { chunkIndex, totalChunks, filename } = req.body;
        const file = req.file;
        const chunkPath = path.join(process.env.VIDEO_TEMP_PATH, `${filename}.part${chunkIndex}`);

        fs.renameSync(file.path, chunkPath);

        if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
            const videoPath = path.join(process.env.VIDEO_ORIGINAL_PATH, filename);
            const writeStream = fs.createWriteStream(videoPath);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = fs.readFileSync(path.join(process.env.VIDEO_TEMP_PATH, `${filename}.part${i}`));
                writeStream.write(chunk);
                fs.unlinkSync(path.join(process.env.VIDEO_TEMP_PATH, `${filename}.part${i}`)); // Delete chunk
            }
            writeStream.end();

            const videoData = {
                title: req.body.title,
                description: req.body.description,
                originalPath: videoPath,
            };

            const newVideo = new Video(videoData);
            await newVideo.save();

            encodeVideo(videoPath)
                .then(encodedPaths => {
                    newVideo.encodedPath = encodedPaths;
                    return generateThumbnail(videoPath);
                })
                .then(thumbnailPaths => {
                    newVideo.thumbnailPath = thumbnailPaths;
                    return newVideo.save();
                })
                .then(() => {
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ message: 'Video processing complete', video: newVideo }));
                        }
                    });
                })
                .catch(error => {
                    logger.error('Video Processing Error:', error.message);
                });

            res.status(200).json({ message: 'Video uploaded successfully. Processing in progress.', video: newVideo });
        } else {
            res.status(200).json({ message: `Chunk ${chunkIndex} uploaded successfully.` });
        }
    } catch (error) {
        next(new VideoError('Failed to upload video', 500));
    }
}];

// Stream Video
exports.streamVideo = (req, res, next) => {
    try {
        const videoId = req.params.id;
        const resolution = req.query.resolution || '1080p';
        const videoPath = path.join(__dirname, '..', `/videos/encoded/${resolution}`, `${videoId}.mp4`);

        if (!fs.existsSync(videoPath)) {
            throw new VideoError('Video not found', 404);
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable');
                return;
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=31536000',
            };

            logger.info(`Streaming video ${videoId} from ${start} to ${end}`);

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'public, max-age=31536000',
            };

            logger.info(`Streaming entire video ${videoId}`);

            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        next(error instanceof VideoError ? error : new VideoError('Failed to stream video', 500));
    }
};

// Get Video Metadata (Placeholder Implementation)
exports.getVideoMetadata = (req, res, next) => {
    res.status(200).json({ message: 'Metadata not implemented yet' });
};

// Delete Video (Placeholder Implementation)
exports.deleteVideo = (req, res, next) => {
    res.status(200).json({ message: 'Delete video not implemented yet' });
};
