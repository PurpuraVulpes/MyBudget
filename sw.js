const CACHE = 'monbudget-v3';
const FILES = ['./', './index.html', './style.css', './app.js', './firebase-sync.js', './manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Don't cache Firebase requests
    if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
        return e.respondWith(fetch(e.request));
    }
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
