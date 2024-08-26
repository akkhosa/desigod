// generateThumbnail.js

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const logger = require('../utils/logger');
const os = require('os');
const Queue = require('bull'); // Using Bull for job queue management

const thumbnailQueue = new Queue('thumbnail generation');

// Dynamic Resource Management: Adjust parallel processing based on system load
const getMaxConcurrentJobs = () => {
    const load = os.loadavg()[0];
    return load < 1.5 ? 4 : 2; // Reduce concurrency if system load is high
};

// Process thumbnail generation jobs with improved quality
thumbnailQueue.process(getMaxConcurrentJobs(), async (job, done) => {
    try {
        logger.info(`Starting thumbnail generation for file: ${job.data.filePath}`);

        const timestamps = ['10%', '50%', '90%'];
        const thumbnailPromises = timestamps.map((timestamp, index) => {
            const thumbnailPath = path.join(__dirname, '../videos/thumbnails', path.basename(job.data.filePath, path.extname(job.data.filePath)) + `_thumb_${index + 1}.png`);
            return new Promise((resolve, reject) => {
                ffmpeg(job.data.filePath)
                    .screenshots({
                        timestamps: [timestamp],
                        filename: thumbnailPath,
                        folder: path.join(__dirname, '../videos/thumbnails'),
                        size: '640x?'
                    })
                    .on('end', () => {
                        logger.info(`Thumbnail generated: ${thumbnailPath}`);
                        resolve(thumbnailPath);
                    })
                    .on('error', (err) => {
                        logger.error('Thumbnail generation error:', err.message);
                        reject(err);
                    });
            });
        });

        const thumbnailPaths = await Promise.all(thumbnailPromises);
        done(null, thumbnailPaths);
    } catch (error) {
        logger.error('Thumbnail Generation Job Error:', error.message);
        if (job.attemptsMade < job.opts.attempts) {
            done(new Error('Retrying thumbnail generation...'));
        } else {
            done(error);
        }
    }
});

// Add a new thumbnail generation job
exports.generateThumbnail = (filePath) => {
    return thumbnailQueue.add({ filePath }, { attempts: 3 }); // Retry failed jobs up to 3 times
};
