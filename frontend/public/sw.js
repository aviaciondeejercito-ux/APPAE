// Archivo: frontend/public/sw.js
const CACHE_NAME = 'monitor-ae-cache-v1';

// Se ejecuta al instalar la App
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Se ejecuta al activar la App
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Maneja las peticiones (Fetch) para que la app responda
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});