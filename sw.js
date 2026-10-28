// Bộ nhớ đệm của app: luôn lấy bản mới từ mạng, mất mạng thì dùng bản đã lưu. Không đụng tới yêu cầu gửi máy chủ.
const CACHE = 'congtrinh-685a46583bd3';
const TILES = 'congtrinh-tiles', TILE_MAX = 1500;   // ảnh nền bản đồ giữ qua các phiên bản, tối đa khoảng 30 MB
const SHELL = ['./', 'styles.css?v=685a46583bd3', 'app.js?v=685a46583bd3', 'config.js?v=685a46583bd3', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('congtrinh-') && k !== CACHE && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org') { e.respondWith(tile(req)); return; }
  const own = url.origin === self.location.origin;
  const lib = /^(unpkg\.com|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com)$/.test(url.hostname);
  if (!own && !lib) return;                       // máy chủ Google: để trình duyệt tự xử lý
  e.respondWith(fetch(own ? new Request(req.url, { cache: 'no-cache' }) : req).then(res => {
    if (res.ok && (own || res.type === 'cors' || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./'))));
});
// Ảnh nền bản đồ: có sẵn trong máy thì dùng ngay (ảnh cũ hơn 30 ngày thì lấy lại), chưa có mới tải.
let puts = 0;
function tile(req) {
  return caches.open(TILES).then(c => c.match(req).then(hit => {
    const age = hit ? Date.now() - Number(hit.headers.get('x-saved') || 0) : Infinity;
    if (hit && age < 30 * 864e5) return hit;
    return fetch(req).then(res => {
      if (res.ok && res.type === 'cors') res.clone().blob().then(b => {
        c.put(req, new Response(b, { headers: { 'content-type': 'image/png', 'x-saved': String(Date.now()) } }));
        if (++puts % 100 === 0) c.keys().then(ks => ks.slice(0, Math.max(0, ks.length - TILE_MAX)).forEach(k => c.delete(k)));
      });
      return res;
    }).catch(() => hit || Response.error());
  }));
}
