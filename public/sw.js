/**
 * Service Worker for RepoVerse PWA
 * Handles offline support and caching
 */

const CACHE_NAME = 'repoverse-v1';
const RUNTIME_CACHE = 'repoverse-runtime-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Cache only essential files, let the app handle the rest
        return cache.addAll(STATIC_ASSETS.filter(url => {
          // Only cache files that exist
          return url !== '/' || true; // Always cache root
        }));
      })
      .catch((error) => {
        console.warn('[Service Worker] Cache failed:', error);
        // Don't fail installation if cache fails
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip API calls - always use network for fresh data
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('api.github.com') ||
      url.hostname.includes('supabase.co') ||
      url.hostname.includes('openai.com')) {
    // Network-first for API calls
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If network fails, return a basic offline response
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'Please check your internet connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For HTML pages - network-first strategy (always get fresh HTML)
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If network succeeds, cache and return
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            return response;
          }
          // If network fails, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Last resort: return index.html
              return caches.match('/index.html');
            });
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Last resort: return index.html
              return caches.match('/index.html')
                .then((indexHtml) => {
                  if (indexHtml) {
                    return indexHtml;
                  }
                  // Ultimate fallback
                  return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RepoVerse</title><meta http-equiv="refresh" content="0;url=/"></head><body>Loading...</body></html>', {
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
            });
        })
    );
    return;
  }
  
  // For static assets (JS, CSS, images) - cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache runtime assets (images, fonts, etc.)
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Network failed for static assets
            return new Response('Asset not available offline', { status: 503 });
          });
      })
  );
});

// Handle background sync (if needed in future)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  // Can be used for syncing data when connection is restored
});

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  // Can be implemented later for notifications
});
