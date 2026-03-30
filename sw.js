// sw.js - Service Worker (オフラインキャッシュ)
const CACHE_NAME = 'takken-master-v1';

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
