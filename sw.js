// Change this version string whenever you update the app's HTML/CSS/JS!
const CACHE_VERSION = 'v4.5';
const CACHE_NAME = 'epub-studio-cache-' + CACHE_VERSION;

const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './tailwind-output.css',
    './app.js',
    './splitter.js',
    './merger.js',
    './manifest.json',
    './vendor/jszip.min.js'
];

// Install the Service Worker and Cache the files
self.addEventListener('install', event => {
    // Forces the waiting SW to become the active SW immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Activate Event: Clear out old caches when a new version is installed
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If the found cache is NOT the current version, delete it
                    if (cacheName !== CACHE_NAME) {
                        console.log('Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Claim all open clients immediately so they use the new SW
            return self.clients.claim();
        })
    );
});

// Intercept network requests and serve from cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
