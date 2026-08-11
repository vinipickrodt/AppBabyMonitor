const CACHE_NAME = "baby-monitor-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./public/icons/icon.svg",
  "./src/main.js",
  "./src/app/App.js",
  "./src/app/container.js",
  "./src/components/EntryList.js",
  "./src/components/Header.js",
  "./src/components/QuickActions.js",
  "./src/components/RecordSheet.js",
  "./src/components/SummaryCards.js",
  "./src/domain/babyEvents.js",
  "./src/domain/duration.js",
  "./src/domain/stats.js",
  "./src/services/BabyLogService.js",
  "./src/services/storage/LocalStorageBabyLogRepository.js",
  "./src/ui/dom.js",
  "./src/ui/icons.js",
  "./src/styles/base.css",
  "./src/styles/layout.css",
  "./src/styles/components.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
