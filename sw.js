const CACHE_NAME = "shopeasy-v2"; // Incremented version

// We must cache the external libraries (Firebase & FontAwesome) 
// or the app will crash offline.
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
];

// Install Event
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching app shell and external libs...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event (Cleanup old caches)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", event => {
  // Handle Firestore requests separately (let Firebase SDK handle its own offline logic)
  if (event.request.url.includes("firestore.googleapis.com")) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Return cached file if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If not in cache, fetch from network
      return fetch(event.request)
        .then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache new images/files dynamically as the user browses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 3. Offline Fallback
          // If it's a navigation request (page load), show index.html
          if (event.request.mode === 'navigate') {
            return caches.match("./index.html");
          }
          // If it's an image, you could optionally return a placeholder here
        });
    })
  );
});
