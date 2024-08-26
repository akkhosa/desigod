// Utility function to debounce any function
const debounce = (func, delay) => {
    let debounceTimer;
    return function(...args) {
        const context = this;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
};

// Load Videos dynamically
const loadVideos = (category = '', searchQuery = '', sortBy = 'newest') => {
    fetch('videos.json')
        .then(response => response.json())
        .then(videos => {
            const videoGrid = document.getElementById('video-grid');
            videoGrid.innerHTML = '';

            // Filter and sort videos
            let filteredVideos = videos.filter(video =>
                (!category || video.tags.includes(category)) &&
                (!searchQuery ||
                    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    video.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            switch (sortBy) {
                case 'newest':
                    filteredVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                    break;
                case 'most-viewed':
                    filteredVideos.sort((a, b) => b.views - a.views);
                    break;
                case 'longest':
                    filteredVideos.sort((a, b) => b.duration - a.duration);
                    break;
            }

            filteredVideos.forEach((video, index) => {
                const videoCard = document.createElement('article');
                videoCard.classList.add('col-md-4', 'col-sm-6');
                videoCard.innerHTML = `
                    <a href="page.html?videoId=${index}" class="text-decoration-none text-dark" aria-label="Video: ${video.title}">
                        <div class="card">
                            <img src="${video.thumbnail}" class="card-img-top lazy" alt="Video Thumbnail" loading="lazy">
                            <div class="card-body">
                                <h5 class="card-title">${video.title}</h5>
                                <p class="card-text">Views: ${video.views} | Duration: ${video.duration} mins | Rating: ${video.rating}%</p>
                            </div>
                        </div>
                    </a>
                `;
                videoGrid.appendChild(videoCard);
            });
        })
        .catch(error => console.error('Error fetching video data:', error));
};

// Initializing and handling page load
document.addEventListener('DOMContentLoaded', () => {
    const queryParams = new URLSearchParams(window.location.search);
    const category = queryParams.get('category');
    const sortBy = queryParams.get('sort') || 'newest';
    
    loadVideos(category, '', sortBy);

    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sortCriteria = this.dataset.sort;  
            loadVideos(category, '', sortCriteria);
        });
    });

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(() => loadVideos(category, searchInput.value, sortBy), 300));
    
    const homeLink = document.querySelector('a[data-home="true"]');
    homeLink.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'index.html'; 
        loadVideos(); 
    });
});

// Utility function to throttle any function
const throttle = (func, limit) => {
    let lastFunc;
    let lastRan;
    return function(...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
};

// Apply throttle to a scroll event
window.addEventListener('scroll', throttle(() => {
    console.log('Scroll event handler triggered');
}, 200));  // 200ms limit

// Dark Mode Toggle with LocalStorage
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    document.body.classList.toggle('bg-dark');
    const isDarkMode = document.body.classList.contains('bg-dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('bg-dark');
    }
});

// Enhanced Keyboard Navigation
document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.click();
        }
    });
});
// Dark Mode Toggle with LocalStorage
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    console.log("Dark mode toggle clicked"); // Debugging log
    document.body.classList.toggle('bg-dark');
    const isDarkMode = document.body.classList.contains('bg-dark');
    console.log("Dark mode:", isDarkMode); // Debugging log
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Load saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        console.log("Loading saved dark mode"); // Debugging log
        document.body.classList.add('bg-dark');
    }
});
