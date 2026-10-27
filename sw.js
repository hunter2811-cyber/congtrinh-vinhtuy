// Bộ nhớ đệm của app: luôn lấy bản mới từ mạng, mất mạng thì dùng bản đã lưu. Không đụng tới yêu cầu gửi máy chủ.
const CACHE = 'congtrinh-51daa154e8ad';
const SHELL = ['./', 'styles.css?v=51daa154e8ad', 'app.js?v=51daa154e8ad', 'config.js?v=51daa154e8ad', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('congtrinh-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const own = url.origin === self.location.origin;
  const lib = /^(unpkg\.com|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)$/.test(url.hostname);
  if (!own && !lib) return;                       // ảnh bản đồ, máy chủ Google: để trình duyệt tự xử lý
  e.respondWith(fetch(own ? new Request(req.url, { cache: 'no-cache' }) : req).then(res => {
    if (res.ok && (own || res.type === 'cors' || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./'))));
});
