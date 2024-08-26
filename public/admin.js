// admin.js

document.addEventListener('DOMContentLoaded', function () {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const socket = new WebSocket('ws://localhost:3000'); // Adjust the URL as needed

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.message === 'Video processing complete') {
            alert(`Processing complete for video: ${data.video.title}`);
            loadVideos();
        }
        if (data.message === 'Server status update') {
            updateServerStatus(data.status);
        }
    };

    loadVideos();
    monitorServer();

    // Handle video upload with CSRF token
    document.getElementById('upload-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        formData.append('_csrf', csrfToken); // Append CSRF token

        try {
            const response = await fetch('/api/videos/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                // Processing updates will be handled by WebSocket
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert('Failed to upload video: ' + error.message);
        }
    });

    // Handle sorting and filtering
    document.getElementById('sort-select').addEventListener('change', function () {
        loadVideos(this.value);
    });

    document.getElementById('filter-input').addEventListener('input', function () {
        loadVideos(undefined, this.value);
    });
});

// Load videos to admin panel with advanced filtering options
async function loadVideos(sortBy = 'newest', filter = '') {
    try {
        const response = await fetch(`/api/videos?sort=${sortBy}&filter=${sanitizeInput(filter)}`);
        const { videos, totalPages } = await response.json();
        const videoList = document.getElementById('video-list');
        videoList.innerHTML = ''; // Clear existing videos

        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.classList.add('video-item');
            videoItem.innerHTML = `
                <h3>${sanitizeInput(video.title)}</h3>
                <p>${sanitizeInput(video.description)}</p>
                <p>Views: ${video.views}</p>
                <p>Date: ${new Date(video.uploadDate).toLocaleDateString()}</p>
                <button onclick="deleteVideo('${video._id}')">Delete</button>
                <button onclick="editVideo('${video._id}')">Edit</button>
            `;
            videoList.appendChild(videoItem);
        });

        // Handle pagination (if applicable)
    } catch (error) {
        alert('Failed to load videos: ' + error.message);
    }
}

// Real-time monitoring of server status
function monitorServer() {
    setInterval(() => {
        socket.send(JSON.stringify({ message: 'Request server status' }));
    }, 10000); // Check server status every 10 seconds
}

function updateServerStatus(status) {
    document.getElementById('server-status').innerText = `CPU Usage: ${status.cpu}% | Memory Usage: ${status.memory}%`;
}

// Delete video
async function deleteVideo(videoId) {
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const response = await fetch(`/api/videos/${videoId}`, { 
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': csrfToken // Include CSRF token
                }
            });
            const result = await response.json();
            if (result.message) {
                alert(result.message);
                loadVideos(); // Reload video list
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert('Failed to delete video: ' + error.message);
        }
    }
}

// Edit video (simplified for example)
function editVideo(videoId) {
    // Load video data into the form for editing
    console.log('Editing video:', videoId);
}

// Sanitize user inputs
function sanitizeInput(input) {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
