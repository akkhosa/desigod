// sw.js

const CACHE_NAME = 'desigod-cache-v5';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles.css',
                '/index.js',
                '/page.js',
                '/videos.json',
                '/offline.html'
            ]);
        }).catch(error => {
            console.error('Cache open failed:', error);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => caches.match('/offline.html'));
        }).catch(error => {
            console.error('Cache match failed:', error);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).catch(error => {
            console.error('Cache delete failed:', error);
        })
    );
});

// Background Sync setup
self.addEventListener('sync', event => {
    if (event.tag === 'sync-videos') {
        event.waitUntil(syncVideos());
    }
});

async function syncVideos() {
    const failedRequests = await idb.get('failed-requests');
    for (const request of failedRequests) {
        try {
            await fetch(request.url, {
                method: request.method,
                body: request.body,
                headers: request.headers
            });
            await idb.delete('failed-requests', request.id); // Remove from store once successful
            self.registration.showNotification('Video Upload Successful', {
                body: 'Your video has been successfully uploaded and is now processing.',
                icon: '/icons/icon-192x192.png'
            });
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
}

// Push Notifications setup with rich notifications
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        actions: [
            { action: 'view', title: 'View', icon: '/icons/view-icon.png' },
            { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss-icon.png' }
        ]
    };
    self.registration.showNotification(data.title, options);
});

