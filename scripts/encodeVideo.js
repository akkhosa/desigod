// encodeVideo.js

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');
const Queue = require('bull'); // Using Bull for job queue management

const videoQueue = new Queue('video encoding');

// Dynamic Resource Allocation: Adjust based on system load
const getMaxConcurrentJobs = () => {
    const load = os.loadavg()[0];
    return load < 1.5 ? os.cpus().length - 1 : Math.max(1, os.cpus().length - 2);
};

// Process video encoding jobs
videoQueue.process(getMaxConcurrentJobs(), async (job, done) => {
    try {
        logger.info(`Starting video encoding job for file: ${job.data.filePath}`);

        const resolutions = ['1080p', '720p', '480p'];
        const outputPromises = resolutions.map(resolution => {
            const outputPath = path.join(__dirname, '../videos/encoded', resolution, path.basename(job.data.filePath, path.extname(job.data.filePath)) + `_${resolution}.mp4`);
            return new Promise((resolve, reject) => {
                ffmpeg(job.data.filePath)
                    .videoCodec('libx264')
                    .size(resolution)
                    .outputOptions('-preset slow', '-crf 22', '-pass 1')
                    .output(outputPath)
                    .on('end', () => {
                        logger.info(`Encoding complete for resolution: ${resolution}`);
                        resolve(outputPath);
                    })
                    .on('error', (err) => {
                        logger.error(`Encoding error at ${resolution}:`, err.message);
                        reject(err);
                    })
                    .run();
            });
        });

        const encodedPaths = await Promise.all(outputPromises);
        done(null, encodedPaths);
    } catch (error) {
        logger.error('Video Encoding Job Error:', error.message);
        if (job.attemptsMade < job.opts.attempts) {
            done(new Error('Retrying video encoding...'));
        } else {
            done(error);
        }
    }
});

// Add a new video encoding job
exports.encodeVideo = (filePath) => {
    return videoQueue.add({ filePath }, { attempts: 3 }); // Retry failed jobs up to 3 times
};

