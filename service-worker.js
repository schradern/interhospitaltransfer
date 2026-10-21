// Bei jeder Veröffentlichung erhöhen, damit Nutzer die neue Version erhalten.
const CACHE_VERSION = 'v8';
const CACHE_NAME = `interhospitaltransfer-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './form-template.html',
  './styles/base.css',
  './styles/form.css',
  './styles/form-layout.css',
  './styles/list.css',
  './styles/overlays.css',
  './styles/lock.css',
  './styles/steps.css',
  './styles/desktop.css',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './libs/jspdf.umd.min.js',
  './libs/fonts/NotoSans-Regular.ttf',
  './libs/fonts/NotoSans-Bold.ttf',
  './ressources/crypto.js',
  './ressources/db.js',
  './ressources/entryhandler.js',
  './ressources/entrystore.js',
  './ressources/formdata.js',
  './ressources/formhandler.js',
  './ressources/lock.js',
  './ressources/navigation.js',
  './ressources/pdfcontent.js',
  './ressources/pdffont.js',
  './ressources/pdfhandler.js',
  './ressources/pdflayout.js',
  './ressources/retention.js',
  './ressources/status.js',
  './ressources/swipe.js',
  './ressources/vault.js',
];

self.addEventListener('install', event => {
  // cache: 'reload' umgeht den HTTP-Cache, damit keine Dateien verschiedener Versionen gemischt werden.
  const requests = APP_SHELL.map(url => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(requests)));
});

// Update erst auf Wunsch aktivieren, damit eine laufende Eingabe nicht mit gemischten Versionen weiterläuft.
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('interhospitaltransfer-') && key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

// Cache-first für die eigene App-Hülle; fremde Ursprünge und Nicht-GET bleiben unberührt.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' })
      .then(cached => cached ?? fetch(request))
      .catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
  );
});
