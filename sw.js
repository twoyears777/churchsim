// Service Worker: holt immer zuerst die neueste Version aus dem Netz (GitHub Pages).
// Nur wenn kein Internet da ist, wird die zuletzt geladene Version aus dem Speicher genommen.
const SPEICHER = 'churchsim-dateien';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const antwort = await fetch(anfrage, { cache: 'no-cache' });   // beim Server nachfragen, ob es Neues gibt
      if (antwort.ok) (await caches.open(SPEICHER)).put(anfrage, antwort.clone());
      return antwort;
    } catch (fehler) {
      const gespeichert = await caches.match(anfrage);
      if (gespeichert) return gespeichert;
      throw fehler;
    }
  })());
});
