const CACHE = 'monbudget-v4';
const FILES = ['./', './index.html', './style.css', './app.js', './firebase-sync.js', './manifest.json'];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(FILES); }));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }));
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
        return e.respondWith(fetch(e.request));
    }
    e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request); }));
});
