const CACHE_NAME = 'aev-media-v3' ;
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Event - Pre-cache frontend assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  
  // Do NOT intercept Google Apps Script API calls or direct Google Drive CDN media links
  if (
    url.includes('script.google.com') || 
    url.includes('script.googleusercontent.com') || 
    url.includes('lh3.googleusercontent.com') ||
    url.includes('unsplash.com')
  ) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
