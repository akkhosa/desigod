document.addEventListener("DOMContentLoaded", function () {
    const lazyVideos = [].slice.call(document.querySelectorAll("video.lazy"));

    if ("IntersectionObserver" in window) {
        let lazyVideoObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    let lazyVideo = entry.target;
                    lazyVideo.src = lazyVideo.dataset.src;
                    lazyVideo.load();
                    lazyVideo.classList.remove("lazy");
                    lazyVideoObserver.unobserve(lazyVideo);
                }
            });
        });

        lazyVideos.forEach(function (lazyVideo) {
            lazyVideoObserver.observe(lazyVideo);
        });
    }

    // Initialize Page with videoId from URL
    const queryParams = new URLSearchParams(window.location.search);
    const videoId = parseInt(queryParams.get('videoId')) || 0;
    loadMainVideo(videoId);
});

function showLoading() {
    document.getElementById('loading-spinner').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-spinner').style.display = 'none';
}

function loadMainVideo(videoId) {
    showLoading();
    fetch('videos.json')
        .then(response => response.json())
        .then(videos => {
            hideLoading();

            const video = videos[videoId];
            document.getElementById('main-video-source').src = video.url;
            document.getElementById('main-video').load();
            document.getElementById('video-title').innerText = video.title;
            document.getElementById('video-views').innerText = `Views: ${video.views}`;
            document.getElementById('video-rating').innerText = `Rating: ${video.rating}%`;
            document.getElementById('video-description').innerText = video.description;

            const tagsContainer = document.getElementById('video-tags');
            tagsContainer.innerHTML = '';
            video.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'badge bg-primary me-1';
                tagElement.innerText = tag;
                tagsContainer.appendChild(tagElement);
            });

            loadSuggestedVideos(videos, videoId);
        })
        .catch(error => {
            console.error('Error loading video data:', error);
            hideLoading();
        });
}

function loadSuggestedVideos(videos, currentVideoId) {
    const suggestedVideosContainer = document.getElementById('suggested-videos');
    suggestedVideosContainer.innerHTML = '';

    videos.filter((_, idx) => idx !== currentVideoId).forEach((video, index) => {
        const videoCard = document.createElement('article');
        videoCard.classList.add('col-md-4', 'col-sm-6');
        videoCard.setAttribute('onclick', `window.location.href='page.html?videoId=${index}'`);
        videoCard.setAttribute('aria-label', `Suggested Video: ${video.title}`);

        videoCard.innerHTML = `
            <div class="card">
                <img src="${video.thumbnail}" alt="Thumbnail of ${video.title}" class="card-img-top lazy" loading="lazy">
                <div class="card-body">
                    <h5 class="card-title">${video.title}</h5>
                    <p class="card-text">Views: ${video.views} | Rating: ${video.rating}%</p>
                </div>
            </div>
        `;
        suggestedVideosContainer.appendChild(videoCard);
    });
}
