const CACHE_NAME = 'interhospitaltransfer-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/form-template.html',
  '/libs/jspdf.umd.min.js',
  '/ressources/db.js',
  '/ressources/entryhandler.js',
  '/ressources/formhandler.js',
  '/ressources/navigation.js',
  '/ressources/pdfhandler.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});