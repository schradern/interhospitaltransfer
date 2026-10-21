// The app has moved to https://transfer.medizin.dev. This replaces the app's service
// worker at the old address: it removes the cached app and unregisters itself, so the
// next load reaches the redirect page instead of a cached copy.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
