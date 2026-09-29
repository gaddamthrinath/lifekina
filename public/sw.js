// Service Worker for Lifekina
const CACHE_NAME = 'lifekina-v3';

const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/entries',
  '/tasks',
  '/calendar',
  '/notes',
  '/settings',
  '/onboarding',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Pre-cache core shell pages
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('Pre-cache warning (normal during initial dev build):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event: Network-First with Cache Fallback for 100% offline reliability
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip non-HTTP schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Skip Next.js dev server WebSocket/HMR requests
  if (
    event.request.url.includes('/_next/webpack-hmr') ||
    event.request.url.includes('/__turbopack__')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If response is valid, clone and update cache
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // When device is offline or network fails, serve directly from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // For page navigations when offline, fallback to dashboard or root
        if (event.request.mode === 'navigate') {
          const fallback =
            (await caches.match('/dashboard')) ||
            (await caches.match('/')) ||
            (await caches.match('/onboarding'));
          if (fallback) return fallback;
        }

        return new Response(
          'You are currently offline. Please reconnect to load uncached resources.',
          {
            status: 503,
            statusText: 'Offline',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          }
        );
      })
  );
});

// Listen for notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow('/calendar');
      })
  );
});
