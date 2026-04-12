// sw.js - Service Worker (オフラインキャッシュ + プッシュ通知)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'takken-master-v2';

const PRECACHE_URLS = [
  'index.html',
  'quiz.html',
  'result.html',
  'complete.html',
  'field.html',
  'stats.html',
  'manifest.json',
  'css/style.css',
  'js/storage.js',
  'js/quiz.js',
  'js/app.js',
  'data/takken_cards.json',
];

// インストール：静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// フェッチ：キャッシュ優先、なければネットワーク
self.addEventListener('fetch', event => {
  // POST リクエストはキャッシュしない
  if (event.request.method !== 'GET') return;

  // http/https以外（chrome-extension等）はスキップ
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // 正常なレスポンスのみキャッシュ
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
  );
});
