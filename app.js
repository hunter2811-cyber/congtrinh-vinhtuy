(function () {
  'use strict';

  const CONF = window.APP_CONFIG || {};
  const GROUPS = [
    { key: 'thicong',   label: 'Thi công T1–T6', color: '#f2b33d' },
    { key: 'mong',      label: 'Thi công móng', color: '#34c759' },
    { key: 'tum',       label: 'Thi công tum',  color: '#e5484d' },
    { key: 'hoanthien', label: 'Hoàn thiện',    color: '#4cb3f0' },
    { key: 'dung',      label: 'Dừng thi công', color: '#a78bfa' },
    { key: 'chua',      label: 'Chưa thi công', color: '#8b8f96' },
    { key: 'xong',      label: 'Hoàn thành',    color: '#d9d9d9', hollow: true }
  ];
  const GROUP = Object.fromEntries(GROUPS.map(g => [g.key, g]));
  /** Nhóm đang thi công: bản đồ máy tính chỉ hiện các nhóm này khi mở app. */
  const ACTIVE_GROUPS = ['thicong', 'mong', 'tum', 'hoanthien'];
  const NEAR_RADIUS = 10;   // mét: nút Gần đây chỉ tính công trình trong bán kính này

  const state = {
    user: null, projects: [], byId: {},
    filter: { groups: new Set(), noLoc: false, q: '' },
    area: '',
    sort: 'start', selected: null, me: null,
    engineName: null, engine: null,
    grown: null, boost: {}   // boost: 0..1 độ phóng to của marker đang chọn / vừa bỏ chọn
  };

  const $ = id => document.getElementById(id);
  const app = $('app');
  const isPhone = () => window.matchMedia('(max-width: 899px)').matches;
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap;
  const PIN_SVG = '<svg viewBox="0 0 24 31" width="34" height="44" aria-hidden="true"><path d="M12 1C6 1 1.5 5.6 1.5 11.3 1.5 19 12 30 12 30s10.5-11 10.5-18.7C22.5 5.6 18 1 12 1z" fill="#f2b33d" stroke="#ffffff" stroke-width="1.6"/><circle cx="12" cy="11.5" r="4" fill="#0c0d0f"/></svg>';
  const ICON = {
    status: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 4.5H7A1.5 1.5 0 0 0 5.5 6v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="9" y="3" width="6" height="3" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 13l2 2 4-4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    call: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.6 3.8h2.6l1.4 3.7-1.9 1.3a10.6 10.6 0 0 0 4.5 4.5l1.3-1.9 3.7 1.4v2.6a2 2 0 0 1-2.1 2A14.4 14.4 0 0 1 4.6 5.9a2 2 0 0 1 2-2.1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    expand: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cam: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    dir: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.2 14.2v-2.4a1 1 0 0 1 1-1h4.3M12.8 8.8l1.9 2-1.9 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    print: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5v-7.5h15V17H17M7 13.5h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }
  };

  /* ---------------- Gọi máy chủ và đăng nhập ---------------- */

  // Bản trên GitHub gọi máy chủ Apps Script bằng fetch kèm mã phiên; bản demo (và trang Apps Script cũ) dùng google.script.run.
  const viaScriptRun = !!(window.google && google.script && google.script.run);
  const auth = {
    get session() { return store.get('session'); },
    save(d) { store.set('session', d.session); store.set('sessionUser', JSON.stringify(d.user || {})); },
    clear() { try { ['session', 'sessionUser', 'snap'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* bỏ qua */ } }
  };
  class ApiError extends Error {}

  function post(body) {
    return fetch(CONF.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .catch(() => { throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); })
      .then(r => { if (!r.ok) throw new Error('Máy chủ báo lỗi ' + r.status + '.'); return r.json(); })
      .then(res => {
        if (res.ok) return res.data;
        const err = new ApiError(res.error);
        if (res.error === 'AUTH') { auth.clear(); showLogin('Phiên đăng nhập đã hết hạn. Anh/chị đăng nhập lại nhé.'); }
        else if (/^NO_ACCESS/.test(res.error)) renderGate(res.error);
        throw err;
      });
  }

  /** Gọi hàm phía máy chủ với một tham số, trả về Promise. */
  function call(fn, arg) {
    if (viaScriptRun) {
      return new Promise((resolve, reject) => {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](arg);
      });
    }
    return post({ fn, arg, session: auth.session });
  }

  /** Đăng nhập Google kiểu chuyển trang (chạy được cả khi app cài ra màn hình chính trên iPhone). */
  function startLogin() {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    store.set('loginNonce', nonce);
    const q = new URLSearchParams({ client_id: CONF.clientId, redirect_uri: CONF.appUrl, response_type: 'id_token', scope: 'openid email profile', nonce, prompt: 'select_account' });
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
  }
  /** Google chuyển về kèm #id_token: đổi lấy mã phiên của app. Trả Promise<true> nếu đăng nhập xong. */
  function finishLogin() {
    const h = new URLSearchParams(location.hash.slice(1));
    const token = h.get('id_token'), err = h.get('error');
    if (!token && !err) return Promise.resolve(false);
    history.replaceState(null, '', location.pathname + location.search);
    if (err) { showLogin(err === 'access_denied' ? 'Anh/chị đã hủy đăng nhập.' : 'Đăng nhập không thành công. Thử lại nhé.'); return Promise.resolve(false); }
    let nonce = '';
    try { nonce = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))).nonce; } catch (e) { /* mã hỏng */ }
    if (!nonce || nonce !== store.get('loginNonce')) { showLogin('Đăng nhập không thành công. Thử lại nhé.'); return Promise.resolve(false); }
    showLogin('', true);
    return post({ fn: 'login', idToken: token }).then(d => { auth.save(d); hideLogin(); return true; }, e => {
      if (!(e instanceof ApiError)) showLogin(e.message);
      else if (e.message === 'AUTH') showLogin('Google không xác nhận được tài khoản. Thử lại nhé.');
      return false;
    });
  }
  function showLogin(msg, busy) {
    $('login').hidden = false;
    $('loginMsg').textContent = busy ? 'Đang đăng nhập…' : (msg || '');
    $('btnLogin').disabled = !!busy;
  }
  function hideLogin() { $('login').hidden = true; }
  function logout() {
    if (!confirm('Đăng xuất khỏi app trên máy này?')) return;
    const s = auth.session; auth.clear();
    if (s) post({ fn: 'logout', session: s }).catch(() => {});
    showLogin('Đã đăng xuất.');
  }

  /* ---------------- Gợi ý cài app ---------------- */

  const install = {
    prompt: null,
    standalone: () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    ios: () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document),
    snoozed: () => Date.now() - Number(store.get('installLater') || 0) < 14 * 864e5,
    show(how) {
      if (install.standalone() || install.snoozed() || !$('install').hidden) return;
      const ios = how === 'ios';
      $('installHow').innerHTML = ios
        ? 'Bấm nút Chia sẻ <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 15V4M8 7.5 12 3.5l4 4M6.5 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg> của Safari, rồi chọn <b>Thêm vào MH chính</b>.'
        : 'Mở nhanh như ứng dụng, toàn màn hình.';
      $('installGo').hidden = ios;
      openPanel($('install'));
    },
    hide(snooze) { if (snooze) store.set('installLater', String(Date.now())); closePanel($('install')); }
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); install.prompt = e; if (state.user) install.show('android'); });
  window.addEventListener('appinstalled', () => install.hide(false));

  function toast(msg, ms, ok) {
    const t = $('toast'), check = $('toastCheck');
    $('toastText').textContent = msg;
    check.hidden = !ok;
    clearTimeout(toast._t); clearTimeout(toast._h);
    t.hidden = false; void t.offsetWidth; t.classList.add('is-open');
    if (ok) { check.setAttribute('data-state', 'out'); void check.offsetWidth; check.setAttribute('data-state', 'in'); }
    toast._t = setTimeout(() => { t.classList.remove('is-open'); toast._h = setTimeout(() => { t.hidden = true; }, 260); }, ms || 2600);
  }

  /** Mở / đóng một bảng có chuyển động (hồ sơ, kiểm tra, thẻ trên bản đồ). */
  function openPanel(el) {
    clearTimeout(el._h);
    el.hidden = false; void el.offsetWidth; el.dataset.open = 'true';
    back.sync();
  }
  function closePanel(el) {
    el.dataset.open = 'false';
    clearTimeout(el._h); el._h = setTimeout(() => { if (el.dataset.open !== 'true') el.hidden = true; }, 260);
    back.sync();
  }

  /* Nút Back / vuốt quay lại của điện thoại: đóng lớp đang mở trên cùng thay vì thoát app.
     Khi có lớp mở, app thêm một mục vào lịch sử trình duyệt; Back lấy mục đó ra và đóng lớp. */
  const back = {
    armed: false, skip: false, t: 0,
    top() {
      if (!$('viewer').hidden) return closeViewer;
      if (!$('printDoc').hidden) return closeCover;
      if (isOpen($('stSheet'))) return closeStatus;
      if (locEd) return closeLocEdit;
      if (isOpen($('near'))) return closeNear;
      if (isOpen($('inspect'))) return closeInspect;
      if (isOpen($('detail'))) return closeDetail;
      if (isOpen($('peek'))) return hidePeek;
      if (isOpen($('snap'))) return hideSnap;
      if (isPhone() && app.dataset.view !== 'map') return () => goView('map');
      return null;
    },
    sync() { clearTimeout(back.t); back.t = setTimeout(back.apply, 0); },   // chờ các lớp mở/đóng xong trong cùng một lần bấm
    apply() {
      const need = !!back.top();
      if (need && !back.armed) { history.pushState({ layer: 1 }, ''); back.armed = true; }
      else if (!need && back.armed) { back.armed = false; back.skip = true; history.back(); }   // đóng bằng nút trên màn hình: bỏ mục thừa
    }
  };
  window.addEventListener('popstate', () => {
    if (back.skip) { back.skip = false; return; }
    back.armed = false;
    const close = back.top();
    if (close) close();
    back.sync();
  });
  const isOpen = el => el.dataset.open === 'true';
  function dirUrl(p) {
    return p.loc ? 'https://www.google.com/maps/dir/?api=1&destination=' + p.loc.lat + ',' + p.loc.lng + '&travelmode=driving'
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.address + ', Vĩnh Tuy, Hà Nội');
  }

  function dateValue(s) {
    const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function stampNow(d) { d = d || new Date(); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function meters(a, b) {
    const R = 6371000, r = x => x * Math.PI / 180;
    const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km'; }
  function fmtCoord(x) { return Number(x).toFixed(6); }
  /** Thời điểm cập nhật gần nhất qua app (chụp ảnh hoặc ghi hiện trạng). */
  function lastTime(p) {
    if (!p.last) return 0;
    if (p.last.t) return p.last.t;
    const m = String(p.last.at || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0;
  }
  /** "Cập nhật 2 giờ trước"; quá 7 ngày thì tô màu cảnh báo. */
  function ago(p) {
    const t = lastTime(p);
    if (!t) return { text: 'Chưa cập nhật qua app', old: false, none: true };
    const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
    const day = Math.floor(min / 1440);
    const text = min < 1 ? 'vừa xong' : min < 60 ? min + ' phút trước' : min < 1440 ? Math.floor(min / 60) + ' giờ trước' : day + ' ngày trước';
    return { text, old: day >= 7, none: false };
  }
  function agoLine(p) {
    const a = ago(p);
    return '<span class="ago' + (a.old ? ' old' : '') + '">' + ICON.clock + (a.none ? a.text : 'Cập nhật ' + a.text) + '</span>';
  }
  /** Tên chủ đầu tư để hiển thị: bỏ "Ông/Bà", nhiều người thì nam lên trước (tên nữ nhận theo chữ "Thị" hoặc "Bà"). */
  function displayOwner(name) {
    const parts = String(name || '').split(/\s+(?:–|-|và|&)\s+/i).map(x => x.trim()).filter(Boolean);
    if (!parts.length) return '';
    const female = x => /^bà\s/i.test(x) || /(^|\s)thị(\s|$)/i.test(x);
    const clean = x => x.replace(/^(ông|bà)\s+/i, '');
    if (/^công ty|^cty/i.test(parts[0])) return parts.map(clean).join(' – ');
    return parts.filter(x => !female(x)).concat(parts.filter(female)).map(clean).join(' – ');
  }
  function telOf(p) { return p.phone ? String(p.phone).split(/\s|\n|,|;/)[0].replace(/[^\d+]/g, '') : ''; }
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  /** Màu viền marker và vòng "hoàn thành" theo giao diện sáng/tối. */
  const ink = () => theme() === 'light'
    ? { ring: '#ffffff', sel: '#15171a', xong: '#7d8189' }
    : { ring: '#0c0d0f', sel: '#ffffff', xong: '#d9d9d9' };
  function dot(group) { return '<span class="dot ' + (GROUP[group] && GROUP[group].hollow ? 'xong' : '') + '" style="' + (GROUP[group] && !GROUP[group].hollow ? 'background:' + GROUP[group].color : '') + '"></span>'; }
  function areaName(code) { const a = (CONF.areas || []).find(x => x.code === code); return a ? a.name : ''; }

  /* ---------------- Dữ liệu ---------------- */

  // Bản trên GitHub giữ lại dữ liệu lần trước để mở app là có ngay bản đồ, rồi mới lấy dữ liệu mới từ máy chủ (máy chủ mất vài giây).
  const snap = {
    read() { try { return viaScriptRun ? null : JSON.parse(store.get('snap')); } catch (e) { return null; } },
    save(res) { if (!viaScriptRun) store.set('snap', JSON.stringify(res)); }
  };
  function load(fresh) {
    const old = fresh === true ? null : snap.read();
    if (old && old.projects) apply(old); else renderSkeleton();
    return call('apiBootstrap').then(res => {
      if (res.error) return renderGate(res.error);   // trang Apps Script cũ trả lỗi trong kết quả
      snap.save(res);
      apply(res);
    }).catch(err => {
      if (err instanceof ApiError && (err.message === 'AUTH' || /^NO_ACCESS/.test(err.message))) return;   // đã chuyển sang màn hình đăng nhập / chưa được cấp quyền
      if (old && old.projects) { $('stamp').textContent = 'Chưa tải được dữ liệu mới · lúc ' + old.loadedAt.slice(-5); return; }
      $('rows').innerHTML = '<li class="empty">Không tải được danh sách công trình. ' + esc(err && err.message || err) +
        '<br><button class="textbtn" type="button" id="retry">Thử lại</button></li>';
      $('retry').onclick = () => load(true);
    });
  }
  function apply(res) {
    state.user = res.user;
    res.projects.forEach(p => { p.owner = displayOwner(p.owner); });
    state.projects = res.projects;
    state.byId = Object.fromEntries(res.projects.map(p => [p.id, p]));
    $('stamp').textContent = 'Dữ liệu lúc ' + res.loadedAt.slice(-5);
    $('user').innerHTML = '<b>' + esc(res.user.name) + '</b><span>' + (res.user.role === 'admin' ? 'Quản trị' : 'Cán bộ hiện trường') + '</span>';
    renderFilters(); renderList(); renderMarkers(); updateNear();
    if (app.dataset.page === 'list') renderListPage();
    if (state.selected && state.byId[state.selected] && isOpen($('detail'))) openDetail(state.selected);
    if (!viaScriptRun) {
      if (install.prompt) install.show('android');
      else if (install.ios()) setTimeout(() => install.show('ios'), 1500);
    }
  }

  function renderGate(code) {
    const email = String(code).split(':')[1] || '';
    document.body.innerHTML = '<div class="gate"><h1>Chưa được cấp quyền</h1><p>' +
      (email ? 'Tài khoản <b>' + esc(email) + '</b> chưa có trong danh sách người dùng.' : 'Không xác định được tài khoản Google đang đăng nhập.') +
      ' Nhờ anh Trung thêm email này vào tab "Người dùng" và tick Hoạt động, sau đó mở lại app.</p>' +
      (viaScriptRun ? '' : '<button type="button" class="textbtn" id="gateSwitch">Đăng nhập bằng tài khoản khác</button>') + '</div>';
    if (!viaScriptRun) $('gateSwitch').onclick = () => { auth.clear(); location.reload(); };
  }

  function matches(p, ignore) {
    const f = state.filter;
    if (ignore !== 'groups' && f.groups.size && !f.groups.has(p.group)) return false;
    if (ignore !== 'areas' && state.area && p.area !== state.area) return false;
    if (ignore !== 'noLoc' && f.noLoc && p.loc) return false;
    if (f.q) {
      const hay = norm([p.id, p.owner, p.address, p.gpxd, p.phone, p.status].join(' '));
      if (f.q.split(/\s+/).some(w => hay.indexOf(w) < 0)) return false;
    }
    return true;
  }
  function visible() {
    const list = state.projects.filter(p => matches(p));
    if (state.sort === 'near' && state.me) {
      list.sort((a, b) => (a.loc ? meters(state.me, a.loc) : 1e12) - (b.loc ? meters(state.me, b.loc) : 1e12));
    } else if (state.sort === 'id') {
      list.sort((a, b) => a.id.localeCompare(b.id, 'vi', { numeric: true }));
    } else {
      list.sort((a, b) => (dateValue(b.start) || dateValue(b.tbkc)) - (dateValue(a.start) || dateValue(a.tbkc)));
    }
    return list;
  }

  /* ---------------- Danh sách và bộ lọc ---------------- */

  function renderSkeleton() {
    $('rows').innerHTML = Array.from({ length: 8 }, () => '<li class="skel" aria-hidden="true"></li>').join('');
  }

  function renderFilters() {
    const f = state.filter;
    const base = state.projects.filter(p => matches(p, 'groups'));
    const noLocN = state.projects.filter(p => matches(p, 'noLoc') && !p.loc).length;
    const isActive = f.groups.size === ACTIVE_GROUPS.length && ACTIVE_GROUPS.every(g => f.groups.has(g));
    $('statusChips').innerHTML =
      '<button type="button" class="chip preset" data-preset="active" aria-pressed="' + isActive + '">Đang thi công</button>' +
      '<button type="button" class="chip preset" data-preset="none"' + (f.groups.size ? '' : ' disabled') + '>Bỏ chọn</button>' +
      GROUPS.map(g => {
      const n = base.filter(p => p.group === g.key).length;
      return '<button type="button" class="chip" data-group="' + g.key + '" aria-pressed="' + f.groups.has(g.key) + '">' +
        dot(g.key) + esc(g.label) + ' <span class="n num">' + n + '</span></button>';
    }).join('') +
      '<button type="button" class="chip" data-noloc="1" aria-pressed="' + f.noLoc + '">Chưa có vị trí <span class="n num">' + noLocN + '</span></button>';
    renderAreaTabs();
  }

  /** Thanh chọn khu vực (Tất cả, Khu I, II, III) với số công trình theo bộ lọc hiện tại. */
  function renderAreaTabs() {
    const bar = $('areaTabs');
    const baseA = state.projects.filter(p => matches(p, 'areas'));
    const items = [{ code: '', label: 'Tất cả', title: 'Toàn phường' }].concat((CONF.areas || []).map(a => ({ code: a.code, label: 'Khu ' + a.code, title: a.name })));
    let tabs = Array.from(bar.querySelectorAll('.t-tab'));
    if (!tabs.length) {
      bar.insertAdjacentHTML('beforeend', items.map(it => '<button type="button" class="t-tab" role="tab" data-area="' + it.code + '" title="' + esc(it.title) + '" aria-selected="false">' + esc(it.label) + '<span class="n num"></span></button>').join(''));
      tabs = Array.from(bar.querySelectorAll('.t-tab'));
    }
    tabs.forEach(t => {
      const code = t.dataset.area;
      t.setAttribute('aria-selected', String(code === state.area));
      t.querySelector('.n').textContent = code ? baseA.filter(p => p.area === code).length : baseA.length;
    });
    requestAnimationFrame(() => movePill(false));
  }
  function movePill(animate) {
    const bar = $('areaTabs'), pill = bar.querySelector('.t-tabs-pill');
    const tab = bar.querySelector('.t-tab[aria-selected="true"]'); if (!tab || !tab.offsetWidth) return;
    if (!animate) {
      const prev = pill.style.transition; pill.style.transition = 'none';
      pill.style.transform = 'translateX(' + tab.offsetLeft + 'px)'; pill.style.width = tab.offsetWidth + 'px';
      void pill.offsetWidth; pill.style.transition = prev;
    } else {
      pill.style.transform = 'translateX(' + tab.offsetLeft + 'px)'; pill.style.width = tab.offsetWidth + 'px';
    }
  }
  function setArea(code) {
    if (state.area === code) return;
    state.area = code; store.set('area', code);
    $('areaTabs').querySelectorAll('.t-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.area === code)));
    movePill(true);
    renderFilters(); renderList(true); renderMarkers(true, true); dropHiddenSelection();
  }

  function renderList(animate) {
    const list = visible();
    const total = state.projects.length;
    $('count').textContent = list.length === total ? total + ' công trình' : list.length + ' / ' + total + ' công trình';
    $('navCount').textContent = list.length;
    if (!list.length) {
      $('rows').innerHTML = '<li class="empty">Không có công trình nào khớp bộ lọc.<br><button type="button" class="textbtn" id="clearF">Bỏ lọc</button></li>';
      $('clearF').onclick = clearFilters;
      return;
    }
    $('rows').innerHTML = list.map(p => {
      const dist = state.me && p.loc && (state.sort === 'near' || isPhone()) ? ' · ' + fmtDist(meters(state.me, p.loc)) : '';
      const tel = telOf(p);
      const locFlag = !p.loc ? ' · <span class="row-flag">chưa có vị trí</span>' : '';
      return '<li class="row" role="option" tabindex="0" data-id="' + esc(p.id) + '" aria-selected="' + (state.selected === p.id) + '">' +
        dot(p.group) +
        '<span class="row-text"><span class="row-owner">' + esc(p.owner || '—') + '<span class="row-id num">' + esc(p.id) + '</span></span>' +
        '<span class="row-sub">' + esc(p.address) + '</span>' +
        '<span class="row-sub"><span class="st">' + esc(p.status || '—') + '</span>' + dist + locFlag + '</span>' +
        agoLine(p) + '</span>' +
        '<span class="row-acts">' +
          (p.loc ? '<button type="button" class="act" data-map aria-label="Xem ' + esc(p.owner) + ' trên bản đồ" title="Xem trên bản đồ">' + ICON.pin + '</button>' : '') +
          (tel ? '<a class="act call" href="tel:' + esc(tel) + '" data-call aria-label="Gọi chủ đầu tư ' + esc(p.owner) + '" title="Gọi chủ đầu tư">' + ICON.call + '</a>' : '') +
        '</span>' +
        '</li>';
    }).join('');
    if (animate && !calm()) {
      const rows = Array.from($('rows').children).slice(0, 14);
      gsap.fromTo(rows, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'expo.out', stagger: 0.025, clearProps: 'transform,opacity,visibility', overwrite: true });
    }
  }

  function clearFilters() {
    state.filter.groups.clear(); state.filter.noLoc = false;
    state.filter.q = ''; $('q').value = ''; $('qClear').hidden = true;
    refresh();
  }
  function refresh() { renderFilters(); renderList(); renderMarkers(); if (app.dataset.page === 'list') renderListPage(); if (app.dataset.page === 'report') renderReport(); }

  $('statusChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.preset === 'active') state.filter.groups = new Set(ACTIVE_GROUPS);
    else if (b.dataset.preset === 'none') state.filter.groups.clear();
    else if (b.dataset.noloc) state.filter.noLoc = !state.filter.noLoc;
    else { const s = state.filter.groups; const k = b.dataset.group; s.has(k) ? s.delete(k) : s.add(k); }
    renderFilters(); renderList(true); renderMarkers(true, true); dropHiddenSelection();
  });
  $('areaTabs').addEventListener('click', e => {
    const b = e.target.closest('.t-tab'); if (b) setArea(b.dataset.area);
  });
  let qTimer;
  $('q').addEventListener('input', e => {
    $('qClear').hidden = !e.target.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.filter.q = norm(e.target.value).trim();
      // Trên điện thoại, gõ tìm kiếm thì chuyển sang danh sách để thấy kết quả, nút chụp ảnh và chỉ đường
      if (state.filter.q && isPhone() && app.dataset.view === 'map') goView('list');
      refresh();
    }, 120);
  });
  $('qClear').onclick = () => { $('q').value = ''; $('qClear').hidden = true; state.filter.q = ''; refresh(); $('q').focus(); };
  $('sort').addEventListener('change', e => {
    state.sort = e.target.value;
    if (state.sort === 'near' && !state.me) {
      locateMe().then(renderList).catch(() => { toast('Không lấy được vị trí của máy.'); state.sort = 'start'; $('sort').value = 'start'; renderList(); });
    } else renderList();
  });
  $('rows').addEventListener('click', e => {
    const li = e.target.closest('.row'); if (!li) return;
    if (e.target.closest('[data-call]')) return;   // link gọi điện tự mở
    if (e.target.closest('[data-map]')) { showOnMap(li.dataset.id); return; }

    selectProject(li.dataset.id, 'list');
  });
  $('rows').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const li = e.target.closest('.row'); if (li) selectProject(li.dataset.id, 'list'); }
  });

  /* ---------------- Bản đồ ---------------- */

  /* Hai mức nền tối: "ro" (mặc định) giữ đường và tên phố rõ, "toi" tối sâu hơn để marker nổi nhất */
  const GOOGLE_STYLES = {
    ro: [
      { elementType: 'geometry', stylers: [{ color: '#1e2126' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#b9bdc5' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#111316' }] },
      { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3e45' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d6d9de' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#1b2a21' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3a3f47' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#24272c' }] },
      { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#30343b' }] },
      { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#4a5059' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5c636e' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#c8ccd3' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e2a3f' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6f8fa6' }] },
      { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#23262c' }] }
    ],
    toi: [
      { elementType: 'geometry', stylers: [{ color: '#16181b' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8a8d93' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0d0f' }] },
      { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2d33' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#24272c' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1d21' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33363c' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1620' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5560' }] },
      { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1a1c20' }] }
    ],
    /* Giao diện sáng: "ro" là bản đồ sáng gọn (tắt điểm dịch vụ), "toi" nhạt màu hơn để marker nổi */
    sang_ro: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] }
    ],
    sang_toi: [
      { elementType: 'geometry', stylers: [{ color: '#f2f1ee' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#5a5f67' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbfaf8' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e9e6df' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9dfe8' }] }
    ]
  };
  // Nền OpenStreetMap chuẩn, miễn phí, không cần khóa (CARTO nay bắt buộc khóa API).
  // Bốn kiểu nền dùng chung một nguồn ảnh; độ sáng/tối tạo bằng bộ lọc CSS trong Styles (.map.base-ro / .base-toi).
  const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_TILES = { ro: { url: OSM_URL }, toi: { url: OSM_URL }, sang_ro: { url: OSM_URL }, sang_toi: { url: OSM_URL } };
  const styleKey = base => (theme() === 'light' ? 'sang_' : '') + base;
  state.base = store.get('mapBase') === 'toi' ? 'toi' : 'ro';

  /** Marker chỉ phóng to khi bản đồ đã bay đến nơi (state.grown), không to ngay lúc bấm. */
  const isBig = p => p.id === state.selected && state.grown === p.id;
  function markerStyle(p, selected) {
    const g = GROUP[p.group] || GROUP.thicong;
    const k = ink();
    return {
      color: g.hollow ? k.xong : (selected ? k.sel : k.ring),
      fill: g.hollow ? (selected ? k.sel : 'transparent') : g.color,
      fillOpacity: g.hollow ? (selected ? 0.25 : 0) : 1,
      weight: selected ? 3 : 2,
      radius: selected ? 13 : 7
    };
  }

  const Engines = {
    osm: {
      init(el) {
        this.el = el;
        // Lớp vẽ riêng: bán kính không bị làm tròn, nên marker to/nhỏ mượt từng khung hình
        // và toạ độ không làm tròn, để khi zoom bằng CSS (phóng tới 8 lần) marker không lệch vài px rồi giật về chỗ
        const SmoothSVG = L.SVG.extend({
          _update() {
            if (this._map._animatingZoom && this._bounds) return;
            this._po = this._map.getPixelOrigin();
            L.SVG.prototype._update.call(this);
          },
          _updateTransform(center, zoom) {
            if (!this._po) return L.SVG.prototype._updateTransform.call(this, center, zoom);
            const s = this._map.getZoomScale(zoom, this._zoom);
            L.DomUtil.setTransform(this._container, this._bounds.min.add(this._po).multiplyBy(s).subtract(this._map._getNewPixelOrigin(center, zoom)), s);
          },
          _updateCircle(layer) {
            const p = this._po && layer._latlng ? this._map.project(layer._latlng, this._zoom).subtract(this._po) : layer._point;
            const r = Math.max(layer._radius, 0.5), arc = 'a' + r + ',' + r + ' 0 1,0 ';
            this._setPath(layer, layer._empty() ? 'M0 0' : 'M' + (p.x - r) + ',' + p.y + arc + (r * 2) + ',0 ' + arc + (-r * 2) + ',0 ');
          }
        });
        this.rend = new SmoothSVG();
        // zoomSnap 0.25: khung vừa toàn bộ công trình được khít hơn (không bị làm tròn cả mức zoom)
        this.m = L.map(el, { zoomControl: false, attributionControl: true, renderer: this.rend, zoomSnap: 0.25 }).setView([CONF.center.lat, CONF.center.lng], 15);
        L.control.zoom({ position: 'bottomright' }).addTo(this.m);
        this.setBase(state.base);
        this.layer = L.layerGroup().addTo(this.m);
        this.items = {};
        this.m.on('click', () => { hidePeek(); hidePop(); });
        this.m.on('move zoom', () => placePop());   // popup máy tính đi theo marker khi kéo / zoom bản đồ
        // Cỡ marker đổi liên tục theo mức zoom (mỗi khung hình khi bay), không giật cục sau khi zoom xong
        // Khung bản đồ đổi cỡ (thanh lọc hiện ra sau khi tải dữ liệu, xoay máy...): báo Leaflet đo lại, nếu không mọi phép căn giữa sẽ lệch
        if (window.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(this._ro); this._ro = requestAnimationFrame(() => this.m.invalidateSize({ pan: false })); }).observe(el);
        this.m.on('zoom', () => this.sizeAll());
        this.rend.on('update', () => this.sizeAll());
        return Promise.resolve();
      },
      setBase(base) {
        if (this.tiles) this.tiles.remove();
        this.tiles = L.tileLayer(OSM_TILES[styleKey(base)].url, { maxZoom: 19, crossOrigin: true, keepBuffer: 4, updateWhenZooming: false, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(this.m);
        this.tiles.bringToBack();
        this.el.classList.toggle('base-ro', base === 'ro');
        this.el.classList.toggle('base-toi', base === 'toi');
      },
      /** Marker hiện dần từ tâm khu vực ra ngoài khi đổi khu vực. */
      reveal() {
        if (calm()) return;
        const c = this.m.getCenter();
        const items = Object.values(this.items).map(mk => ({ el: mk._path, d: c.distanceTo(mk.getLatLng()) })).filter(x => x.el);
        if (!items.length) return;
        const max = Math.max.apply(null, items.map(x => x.d)) || 1;
        gsap.fromTo(items.map(x => x.el), { scale: 0.2, opacity: 0 }, {
          scale: 1, opacity: 1, duration: 0.45, ease: 'expo.out', overwrite: true, clearProps: 'transform,opacity',
          delay: i => 0.15 + (items[i].d / max) * 0.35
        });
      },
      /** Bán kính theo zoom: zoom 14 khoảng 5 px, zoom 18 khoảng 9 px; marker đang chọn to thêm tới 75%. */
      baseR(z) { return Math.max(3.5, Math.min(9, 2.5 + (z - 12) * 1.1)); },
      rad(p, z) { return this.baseR(z == null ? this.m.getZoom() : z) * (1 + 0.75 * (state.boost[p.id] || 0)); },
      /** Đặt cỡ marker như mắt thấy. Trong lúc zoom, Leaflet phóng to cả lớp vẽ bằng CSS (tỷ lệ s), nên vẽ nhỏ đi s lần.
          Không dùng setRadius(): nó tính lại toạ độ theo zoom mới trong khi lớp vẽ vẫn đang phóng, làm marker trôi lệch khỏi chỗ. */
      setR(mk, r) {
        const rz = this.rend._zoom, s = rz == null ? 1 : this.m.getZoomScale(this.m.getZoom(), rz);
        mk.options.radius = mk._radius = r / s;
        if (mk._path) mk._path.setAttribute('stroke-width', mk.options.weight / s);
        if (mk._map && mk._point) mk._update();
      },
      sizeOne(id) { const mk = id && this.items[id], p = id && state.byId[id]; if (mk && p) this.setR(mk, this.rad(p)); },
      sizeAll() {
        const z = this.m.getZoom();
        Object.keys(this.items).forEach(id => { const p = state.byId[id]; if (p) this.setR(this.items[id], this.rad(p, z)); });
        if (this.me) this.setR(this.me, 7);
      },
      makeMarker(p, onClick) {
        const s = markerStyle(p, isBig(p));
        const mk = L.circleMarker([p.loc.lat, p.loc.lng], { radius: this.rad(p), color: s.color, weight: s.weight, fillColor: s.fill, fillOpacity: s.fillOpacity, bubblingMouseEvents: false })
          .on('click', () => onClick(p.id));
        if (!isPhone()) mk.bindTooltip(esc(p.owner) + ' · ' + esc(p.id), { direction: 'top', offset: [0, -8] });   // điện thoại đã có thẻ thông tin
        mk.addTo(this.layer); this.setR(mk, this.rad(p));
        return mk;
      },
      /** animate: đổi bộ lọc. Marker bị bỏ nhỏ dần rồi mất, marker mới to dần hiện ra (lan từ giữa bản đồ ra), marker giữ nguyên thì đứng yên. */
      setMarkers(list, onClick, animate) {
        this.leaving = this.leaving || {};
        if (!animate || calm()) {
          this.layer.clearLayers(); this.items = {}; this.leaving = {};
          list.forEach(p => { if (p.loc) this.items[p.id] = this.makeMarker(p, onClick); });
          return;
        }
        const want = {}; list.forEach(p => { if (p.loc) want[p.id] = p; });
        Object.keys(this.items).forEach(id => {
          if (want[id]) return;
          const mk = this.items[id]; delete this.items[id];
          if (!mk._path) { this.layer.removeLayer(mk); return; }
          this.leaving[id] = mk; mk.closeTooltip && mk.closeTooltip();
          mk._path.style.pointerEvents = 'none';
          gsap.to(mk._path, { scale: 0.2, opacity: 0, duration: 0.28, ease: 'power2.in', overwrite: true,
            onComplete: () => { if (this.leaving[id] === mk) { delete this.leaving[id]; this.layer.removeLayer(mk); } } });
        });
        const c = this.m.getCenter(), fresh = [];
        list.forEach(p => {
          if (!p.loc || this.items[p.id]) return;
          let mk = this.leaving[p.id];
          if (mk) {                       // đang mờ đi mà được chọn lại: hiện lại từ cỡ hiện tại
            delete this.leaving[p.id]; mk._path.style.pointerEvents = '';
            gsap.to(mk._path, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity' });
          } else {
            mk = this.makeMarker(p, onClick);
            if (mk._path) fresh.push({ el: mk._path, d: c.distanceTo(mk.getLatLng()) });
          }
          this.items[p.id] = mk;
        });
        if (!fresh.length) return;
        const max = Math.max.apply(null, fresh.map(x => x.d)) || 1;
        gsap.fromTo(fresh.map(x => x.el), { scale: 0.2, opacity: 0 }, {
          scale: 1, opacity: 1, duration: 0.42, ease: 'back.out(1.6)', overwrite: true, clearProps: 'transform,opacity',
          delay: i => (fresh[i].d / max) * 0.25
        });
      },
      restyle(p) {
        const mk = this.items[p.id]; if (!mk) return;
        const s = markerStyle(p, isBig(p));
        // Không dùng setStyle(): với circleMarker nó gọi setRadius() và làm marker lệch khi đang bay
        L.setOptions(mk, { color: s.color, weight: s.weight, fillColor: s.fill, fillOpacity: s.fillOpacity });
        if (mk._path) mk._renderer._updateStyle(mk);
        this.setR(mk, this.rad(p));
        if (p.id === state.selected) mk.bringToFront();
      },
      /** Bay đến công trình (cùng một kiểu cho mọi cách chọn: danh sách, marker, Gần đây). */
      /** Một lần bay liền mạch (Leaflet tự zoom ra rồi vào theo khoảng cách). offsetY: đặt marker cao hơn tâm để không bị thẻ thông tin che;
          offsetX: đặt marker lệch trái so với tâm (máy tính: marker về giữa cửa sổ, chừa chỗ cho popup). Trả về thời gian bay (giây). */
      focus(lat, lng, zoom, done, offsetY, offsetX) {
        const z = zoom || Math.max(this.m.getZoom(), 17);
        let target = L.latLng(lat, lng);
        if (offsetY || offsetX) target = this.m.unproject(this.m.project(target, z).add([offsetX || 0, offsetY || 0]), z);
        const marker = L.latLng(lat, lng);
        if (calm()) { this.m.setView(target, z); if (done) done(); return 0; }
        // Công trình đang thấy trên màn hình (thường là chạm marker): zoom thẳng vào đúng marker,
        // marker trượt từ chỗ đang đứng về giữa trong lúc zoom, không zoom ra.
        if (this.m.getBounds().pad(-0.04).contains(marker)) return this.zoomInto(marker, z, done, offsetY || 0, offsetX || 0);
        // Công trình ở xa: một chuyến bay liền mạch, zoom ra rồi vào.
        const dur = Math.min(2.4, Math.max(0.9, 0.5 + this.m.distance(this.m.getCenter(), target) / 1200));
        if (done) this.m.once('moveend', done);
        this.m.flyTo(target, z, { duration: dur, easeLinearity: 0.25 });
        return dur;
      },
      zoomInto(marker, z1, done, offsetY, offsetX) {
        const m = this.m;
        m._stop();                     // dừng chuyến bay đang dở (không dùng stop(): nó tự zoom/pan có hiệu ứng, làm lệch vị trí)
        const size = m.getSize(), z0 = m.getZoom();
        const s0 = m.latLngToContainerPoint(marker);                  // marker đang ở đâu trên màn hình
        const s1 = L.point(size.x / 2 - (offsetX || 0), size.y / 2 - offsetY);       // muốn marker về đâu
        const dur = 0.85, t0 = performance.now();
        const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const at = k => {
          const zk = z0 + (z1 - z0) * k;
          const sk = s0.add(s1.subtract(s0).multiplyBy(k));
          const c = m.unproject(m.project(marker, zk).subtract(sk).add(size.divideBy(2)), zk);
          return [c, zk];
        };
        m._moveStart(true, false);
        const frame = now => {
          const t = Math.min(1, (now - t0) / (dur * 1000));
          const [c, zk] = at(ease(t));
          // flyTo: lớp bản đồ giữ ô ảnh cũ trong lúc bay như Leaflet flyTo; pinch: vẫn báo 'zoom' khi chỉ trượt ngang để marker đi theo
          const data = { flyTo: true, pinch: zk === m.getZoom() };
          if (t < 1) { m._move(c, zk, data); this._raf = requestAnimationFrame(frame); }
          else { m._move(c, zk, data)._moveEnd(true); if (done) done(); }
        };
        cancelAnimationFrame(this._raf);
        this._raf = requestAnimationFrame(frame);
        return dur;
      },
      /** Trong lúc bay: marker cũ nhỏ dần ở nửa đầu, marker mới to dần ở đoạn cuối, cùng một dòng thời gian với chuyến bay. */
      animateBoost(prevId, id, dur) {
        if (this.tl) this.tl.kill();
        Object.keys(state.boost).forEach(k => { if (k !== id && k !== prevId) { state.boost[k] = 0; this.sizeOne(k); } });
        const p = state.byId[id];
        const arrive = () => { if (state.selected === id) { state.grown = id; this.restyle(p); } };
        if (!dur) { if (prevId) { state.boost[prevId] = 0; this.sizeOne(prevId); } state.boost[id] = 1; arrive(); return; }
        const o = { a: prevId ? (state.boost[prevId] || 0) : 0, b: state.boost[id] || 0 };
        this.tl = gsap.timeline({ onUpdate: () => {
          if (prevId) { state.boost[prevId] = o.a; this.sizeOne(prevId); }
          state.boost[id] = o.b; this.sizeOne(id);
        } });
        this.tl.to(o, { a: 0, duration: dur * 0.45, ease: 'sine.inOut' }, 0)
          .call(arrive, null, dur * 0.7)
          .to(o, { b: 1, duration: dur * 0.3 + 0.2, ease: 'sine.out' }, dur * 0.7);
      },
      /** Vòng sáng lan ra quanh marker vừa chọn. */
      pulse(p) {
        if (calm() || !p.loc) return;
        const g = GROUP[p.group] || GROUP.thicong;
        const ring = L.circleMarker([p.loc.lat, p.loc.lng], { radius: this.rad(p), color: g.hollow ? ink().xong : g.color, weight: 3, fill: false, interactive: false, className: 'mk-pulse' }).addTo(this.m);
        setTimeout(() => ring.remove(), 1400);
      },
      /** Khung vừa đủ chứa các điểm, chừa lề cho các nút/thẻ nổi trên bản đồ (pad). Có hiệu ứng: một chuyến bay liền mạch như khi chọn công trình. */
      fit(points, animate, pad) {
        if (!points.length) return;
        const b = L.latLngBounds(points.map(x => [x.lat, x.lng]));
        const o = { paddingTopLeft: pad ? pad.tl : [40, 40], paddingBottomRight: pad ? pad.br : [40, 40], maxZoom: 17 };
        if (!animate || calm()) { this.m.fitBounds(b, o); return; }
        const t = this.m._getBoundsCenterZoom(b, o);
        const dz = Math.abs(t.zoom - this.m.getZoom());
        const px = this.m.project(t.center).distanceTo(this.m.project(this.m.getCenter()));   // quãng đường tính bằng px ở mức zoom hiện tại
        if (dz < 0.05 && px < 4) return;
        const dur = Math.min(1.8, Math.max(0.8, 0.6 + dz * 0.18 + px / 1400));
        cancelAnimationFrame(this._raf); this.m._stop();
        this.m.flyTo(t.center, t.zoom, { duration: dur, easeLinearity: 0.25 });
      },
      showMe(pos) {
        if (this.me) { this.me.remove(); this.meAcc.remove(); }
        this.meAcc = L.circle([pos.lat, pos.lng], { radius: pos.acc || 10, color: '#4cb3f0', weight: 1, opacity: .5, fillColor: '#4cb3f0', fillOpacity: .14, interactive: false }).addTo(this.m);
        this.me = L.circleMarker([pos.lat, pos.lng], { radius: 7, color: '#ffffff', weight: 3, fillColor: '#4c8df0', fillOpacity: 1, interactive: false }).addTo(this.m);
      },
      canPop: true,
      point(loc) { return this.m.latLngToContainerPoint([loc.lat, loc.lng]); },
      center() { const c = this.m.getCenter(); return { lat: c.lat, lng: c.lng }; },
      /** Sửa vị trí (máy tính): ghim kéo được, bấm vào bản đồ để đặt; vòng nét đứt ở vị trí cũ. onMove({lat, lng}) báo vị trí mới. */
      editStart(start, old, onMove) {
        this.editStop();
        const icon = L.divIcon({ className: 'pin-edit', html: PIN_SVG + '<span>Kéo để chỉnh</span>', iconSize: [34, 44], iconAnchor: [17, 42] });
        this.pin = L.marker([start.lat, start.lng], { draggable: true, icon, zIndexOffset: 1000, keyboard: false, autoPan: true }).addTo(this.m);
        this.pin.on('drag', e => onMove(e.target.getLatLng()));
        if (old) this.ghost = L.circleMarker([old.lat, old.lng], { radius: 9, color: '#f2b33d', weight: 2, dashArray: '3 3', fill: false, interactive: false }).addTo(this.m);
        this._editClick = e => { this.pin.setLatLng(e.latlng); onMove(e.latlng); };
        this.m.on('click', this._editClick);
      },
      editMove(lat, lng) { if (this.pin) this.pin.setLatLng([lat, lng]); },
      editStop() {
        if (this.pin) { this.pin.remove(); this.pin = null; }
        if (this.ghost) { this.ghost.remove(); this.ghost = null; }
        if (this._editClick) { this.m.off('click', this._editClick); this._editClick = null; }
      },
      keepAbove(loc, pad) {
        const pt = this.m.latLngToContainerPoint([loc.lat, loc.lng]);
        const limit = this.m.getSize().y - pad - 24;
        if (pt.y > limit) this.m.panBy([0, pt.y - limit], { animate: !calm() });
      },
      resize() { this.m.invalidateSize(); },
      destroy() { this.m.remove(); }
    },

    google: {
      init(el) {
        return loadGoogle().then(() => {
          this.m = new google.maps.Map(el, {
            center: CONF.center, zoom: 15, styles: GOOGLE_STYLES[styleKey(state.base)], backgroundColor: theme() === 'light' ? '#ebe9e4' : '#15181c',
            disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false,
            zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM }
          });
          this.items = {};
          this.m.addListener('click', () => hidePeek());
        });
      },
      setBase(base) { this.m.setOptions({ styles: GOOGLE_STYLES[styleKey(base)] }); },
      reveal() { /* Google: marker hiện ngay */ },
      icon(p, selected) {
        const s = markerStyle(p, selected);
        return { path: google.maps.SymbolPath.CIRCLE, scale: s.radius, fillColor: s.fill === 'transparent' ? '#000000' : s.fill, fillOpacity: s.fillOpacity, strokeColor: s.color, strokeWeight: s.weight };
      },
      setMarkers(list, onClick) {
        Object.values(this.items).forEach(m => m.setMap(null)); this.items = {};
        list.forEach(p => {
          if (!p.loc) return;
          const mk = new google.maps.Marker({ position: { lat: p.loc.lat, lng: p.loc.lng }, map: this.m, icon: this.icon(p, isBig(p)), title: p.owner + ' · ' + p.id, zIndex: p.id === state.selected ? 999 : 1 });
          mk.addListener('click', () => onClick(p.id));
          this.items[p.id] = mk;
        });
      },
      restyle(p) {
        const mk = this.items[p.id]; if (!mk) return;
        mk.setIcon(this.icon(p, isBig(p)));
        mk.setZIndex(p.id === state.selected ? 999 : 1);
      },
      focus(lat, lng, zoom, done) {
        const z = zoom || Math.max(this.m.getZoom(), 17);
        this.m.panTo({ lat, lng });
        google.maps.event.addListenerOnce(this.m, 'idle', () => { if (this.m.getZoom() !== z) this.m.setZoom(z); if (done) google.maps.event.addListenerOnce(this.m, 'idle', done); });
      },
      pulse() { /* Google: marker đã phóng to */ },
      animateBoost(prevId, id) { state.grown = id; if (prevId && state.byId[prevId]) this.restyle(state.byId[prevId]); this.restyle(state.byId[id]); },
      fit(points) {
        if (!points.length) return;
        const b = new google.maps.LatLngBounds(); points.forEach(x => b.extend(x));
        this.m.fitBounds(b, 40);
        google.maps.event.addListenerOnce(this.m, 'idle', () => { if (this.m.getZoom() > 17) this.m.setZoom(17); });
      },
      showMe(pos) {
        if (this.me) { this.me.setMap(null); this.meAcc.setMap(null); }
        this.meAcc = new google.maps.Circle({ map: this.m, center: pos, radius: pos.acc || 10, strokeColor: '#4cb3f0', strokeOpacity: .5, strokeWeight: 1, fillColor: '#4cb3f0', fillOpacity: .14, clickable: false });
        this.me = new google.maps.Marker({ map: this.m, position: pos, clickable: false, zIndex: 1000, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#4c8df0', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } });
      },
      keepAbove(loc, pad) { this.m.panTo(loc); this.m.panBy(0, Math.round(pad / 2)); },
      resize() { /* Google tự co giãn */ },
      destroy() { Object.values(this.items).forEach(m => m.setMap(null)); }
    }
  };

  let googlePromise;
  function loadGoogle() {
    if (!CONF.mapsKey) return Promise.reject(new Error('NO_KEY'));
    if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve();
    if (googlePromise) return googlePromise;
    googlePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), 12000);
      window.__gmReady = () => { clearTimeout(timer); resolve(); };
      window.gm_authFailure = () => { clearTimeout(timer); reject(new Error('AUTH')); switchEngine('osm', 'Google Maps từ chối API key, đang dùng OpenStreetMap.'); };
      const s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CONF.mapsKey) + '&callback=__gmReady&language=vi&region=VN&loading=async';
      s.async = true; s.onerror = () => { clearTimeout(timer); reject(new Error('LOAD')); };
      document.head.appendChild(s);
    });
    return googlePromise;
  }

  function switchEngine(name, note) {
    hidePop();
    if (state.engineName === name && state.engine) return Promise.resolve();
    const el = $('map');
    if (state.engine) { try { state.engine.destroy(); } catch (e) { /* bỏ qua */ } }
    el.innerHTML = ''; el.className = 'map';
    state.engineName = name; state.engine = Engines[name];
    $('engGoogle').setAttribute('aria-pressed', name === 'google');
    $('engOsm').setAttribute('aria-pressed', name === 'osm');
    showNote(note);
    return state.engine.init(el).then(() => {
      store.set('mapEngine', name);
      renderMarkers(true);
      if (state.me) state.engine.showMe(state.me);
    }).catch(err => {
      if (name === 'google') {
        const why = err && err.message === 'NO_KEY' ? 'Chưa có Google Maps API key, đang dùng OpenStreetMap.' : 'Không tải được Google Maps, đang dùng OpenStreetMap.';
        state.engine = null; state.engineName = null;
        return switchEngine('osm', why);
      }
      showNote('Không tải được bản đồ. Kiểm tra kết nối mạng rồi tải lại.');
    });
  }

  function showNote(text) {
    const n = $('mapNote');
    if (!text) { n.hidden = true; return; }
    n.textContent = text; n.hidden = false;
    clearTimeout(showNote._t); showNote._t = setTimeout(() => { n.hidden = true; }, 6000);
  }

  let fittedOnce = false, fitTimer;
  /** Lề cho khung bản đồ: tránh thanh nút phía trên, chú thích, nút Gần đây và thẻ thông tin đang mở phía dưới. */
  function mapPadding() {
    const mr = $('map').getBoundingClientRect();
    const shown = el => el && !el.hidden && el.getClientRects().length && el.getBoundingClientRect().height > 0;
    let top = 24, bottom = 24;
    document.querySelectorAll('.map-tools, .demo-banner').forEach(el => { if (shown(el)) { const r = el.getBoundingClientRect(); if (r.bottom < mr.top + mr.height / 2) top = Math.max(top, r.bottom - mr.top + 18); } });
    [$('legend'), $('nearFab'), $('peek').dataset.open === 'true' ? $('peek') : null].forEach(el => {
      if (shown(el)) { const r = el.getBoundingClientRect(); if (r.top > mr.top + mr.height / 2) bottom = Math.max(bottom, mr.bottom - r.top + 18); }
    });
    return { tl: [28, Math.round(top)], br: [28, Math.round(bottom)] };
  }
  /** fit: đưa khung bản đồ về vừa toàn bộ công trình đang hiện. animate (đổi bộ lọc): marker ẩn/hiện có hiệu ứng,
      bản đồ chờ 0,3 giây sau lần bấm cuối rồi bay một lần (bấm nhiều mục liên tiếp không bị giật qua lại). */
  function renderMarkers(fit, animate) {
    if (!state.engine || !state.engine.setMarkers) return;
    const list = visible();
    state.engine.setMarkers(list, id => selectProject(id, 'map'), animate);
    const pts = list.filter(p => p.loc).map(p => p.loc);
    if (!fittedOnce) { if (pts.length) { state.engine.fit(pts, false, mapPadding()); fittedOnce = true; } return; }
    if (!fit) return;
    clearTimeout(fitTimer);
    if (!animate) { if (pts.length) state.engine.fit(pts, false, mapPadding()); return; }
    fitTimer = setTimeout(() => {
      const now = visible().filter(p => p.loc).map(p => p.loc);
      if (now.length) state.engine.fit(now, true, mapPadding());   // không còn công trình nào: bản đồ đứng yên
    }, 300);
  }
  /** Sau khi đổi bộ lọc: công trình đang mở mà không còn trong bộ lọc thì đóng thẻ thông tin. */
  function dropHiddenSelection() {
    if (state.selected && !visible().some(p => p.id === state.selected)) { hidePeek(); hidePop(); }
  }

  $('btnBase').onclick = () => {
    state.base = state.base === 'ro' ? 'toi' : 'ro';
    store.set('mapBase', state.base);
    if (state.engine && state.engine.setBase) state.engine.setBase(state.base);
    showNote(state.base === 'ro' ? 'Nền tối, rõ đường và tên phố' : 'Nền tối sâu, marker nổi nhất');
  };

  function renderLegend() {
    $('legend').innerHTML = GROUPS.map(g => '<span>' + dot(g.key) + esc(g.label) + '</span>').join('') ;
  }

  $('engGoogle').onclick = () => switchEngine('google');
  $('engOsm').onclick = () => switchEngine('osm');
  if (!CONF.mapsKey) $('engGoogle').parentNode.hidden = true;   // chưa có key Google Maps thì chỉ dùng OSM, ẩn nút chuyển

  function locateMe() {
    return getPosition({ maxWait: 8000 }).then(pos => {
      state.me = pos;
      if (state.engine) { state.engine.showMe(pos); state.engine.focus(pos.lat, pos.lng, 17); }
      return pos;
    });
  }
  $('btnLocate').onclick = () => locateMe().catch(e => toast(gpsError(e)));

  /** Lấy vị trí tốt nhất trong một khoảng chờ (GPS điện thoại cần vài giây để chính xác hơn). */
  function getPosition(opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject({ code: 0 });
      let best = null; let done = false;
      const finish = () => {
        if (done) return; done = true;
        navigator.geolocation.clearWatch(wid); clearTimeout(timer);
        best ? resolve(best) : reject({ code: 3 });
      };
      const wid = navigator.geolocation.watchPosition(p => {
        const cur = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp };
        if (!best || cur.acc < best.acc) best = cur;
        if (opts.onUpdate) opts.onUpdate(best);
        if (best.acc <= (opts.goodEnough || 10)) finish();
      }, err => { if (!best) { done = true; navigator.geolocation.clearWatch(wid); clearTimeout(timer); reject(err); } },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
      const timer = setTimeout(finish, opts.maxWait || 15000);
    });
  }
  function gpsError(e) {
    if (e && e.code === 1) return 'Trình duyệt chưa được phép dùng vị trí. Bật quyền Vị trí cho trang này rồi thử lại.';
    if (e && e.code === 0) return 'Thiết bị không hỗ trợ định vị.';
    return 'Chưa bắt được tín hiệu GPS. Ra chỗ thoáng rồi thử lại.';
  }

  /* ---------------- Chọn công trình ---------------- */

  function selectProject(id, from) {
    clearTimeout(fitTimer);   // vừa bấm lọc rồi chọn công trình ngay: không bay ra khung toàn bộ nữa
    const prev = state.selected;
    state.selected = id;
    const p = state.byId[id]; if (!p) return;
    document.querySelectorAll('.row[aria-selected="true"]').forEach(r => r.setAttribute('aria-selected', 'false'));
    const row = document.querySelector('.row[data-id="' + CSS.escape(id) + '"]');
    if (row) row.setAttribute('aria-selected', 'true');
    if (state.engine && state.engine.restyle) {
      if (prev && state.byId[prev]) state.engine.restyle(state.byId[prev]);
      state.engine.restyle(p);
    }
    const peek = from === 'map' && isPhone();
    // Máy tính: bấm marker hoặc chọn ở danh sách bên trái thì hiện popup cạnh marker thay cho hồ sơ
    const pop = !isPhone() && (from === 'map' || from === 'list') && !!p.loc && !!(state.engine && state.engine.canPop);
    state.grown = null;
    hidePop();
    if (state.engine && state.engine.restyle) state.engine.restyle(p);
    if (peek) showPeek(p);
    else if (!pop) openDetail(id);
    else if (isOpen($('detail'))) closeDetail();
    if (p.loc && state.engine && state.engine.focus) {
      // Mọi cách chọn đều bay một mạch đến công trình; marker to lên ở đoạn cuối chuyến bay.
      // Điện thoại: điểm đến được đẩy lên trên thẻ thông tin ngay trong chuyến bay, không phải dịch thêm sau đó.
      // Máy tính có popup: marker về đúng giữa cửa sổ (không phải giữa vùng bản đồ), popup hiện khi bay tới nơi.
      const off = pop ? popOffset() : { x: 0, y: peek ? Math.round($('peek').offsetHeight / 2) + 6 : 0 };
      const dur = state.engine.focus(p.loc.lat, p.loc.lng, null, () => {
        if (state.selected !== id) return;
        state.engine.pulse(p);
        if (pop) showPop(p);
      }, off.y, off.x);
      state.engine.animateBoost(prev !== id ? prev : null, id, dur);
    } else if (!p.loc) {
      toast('Công trình chưa có vị trí trên bản đồ. Đến công trình chụp ảnh để lưu vị trí.', 4000);
    }
  }

  function showPeek(p) {
    const el = $('peek');
    const ph = p.last && p.last.photo;
    el.innerHTML = '<div class="peek-head">' + (ph ? '<span class="peek-thumb" aria-hidden="true"></span>' : '') +
      '<div class="peek-text"><div class="peek-owner">' + esc(p.owner) + '</div>' +
      '<div class="peek-sub">' + esc(p.address) + '</div>' +
      (ph ? '<div class="peek-cap num">Ảnh gần nhất ' + esc(ph.at.slice(0, 5) + ph.at.slice(10)) + '</div>' : '') + '</div></div>' +
      '<div class="d-tags"><span class="pill ' + p.group + '">' + esc(p.status || '—') + '</span><span class="pill num">' + esc(p.id) + '</span>' +
        (state.me && p.loc ? '<span class="pill num">cách ' + fmtDist(meters(state.me, p.loc)) + '</span>' : '') + '</div>' +
      '<div class="peek-actions"><button type="button" class="btn primary big" data-act="cam">' + ICON.cam + 'Chụp ảnh</button>' +
        '<button type="button" class="btn big" data-act="status">' + ICON.status + 'Hiện trạng</button>' +
        '<a class="btn big" href="' + dirUrl(p) + '" target="_blank" rel="noopener">' + ICON.dir + 'Chỉ đường</a>' +
        '<button type="button" class="btn big" data-act="detail">Hồ sơ</button></div>';
    openPanel(el); $('nearFab').hidden = true;
    if (ph) fillThumb(el.querySelector('.peek-thumb'), ph.id, 300, () => state.selected === p.id);   // ảnh nhỏ chỉ để xem, chạm không mở
    el.querySelector('[data-act="cam"]').onclick = () => { hidePeek(); quickPhoto(p.id); };
    el.querySelector('[data-act="detail"]').onclick = () => { hidePeek(); openDetail(p.id); };
    el.querySelector('[data-act="status"]').onclick = () => { hidePeek(); openStatus(p.id); };   // cập nhật hiện trạng không cần chụp ảnh
  }
  function hidePeek() { const el = $('peek'); if (!el.hidden) closePanel(el); if (!isOpen($('near'))) $('nearFab').hidden = false; }

  /** Nút chụp ảnh bên ngoài: mở form kiểm tra (GPS tự lấy) và bật máy ảnh ngay trong cùng một lần chạm. */
  function quickPhoto(id) {
    if (state.selected !== id) {
      const prev = state.selected; state.selected = id;
      if (state.engine && state.engine.restyle) { if (prev && state.byId[prev]) state.engine.restyle(state.byId[prev]); state.engine.restyle(state.byId[id]); }
    }
    openInspect(id, { camera: true });
  }

  /* ---------------- Gần đây (công trình trong 10 m) ---------------- */

  function nearList() {
    if (!state.me) return null;
    return state.projects.filter(p => p.loc && meters(state.me, p.loc) <= NEAR_RADIUS)
      .sort((a, b) => meters(state.me, a.loc) - meters(state.me, b.loc));
  }
  function updateNear() {
    const list = nearList();
    const b = $('nearBadge');
    b.textContent = list ? list.length : '…';
    b.classList.toggle('has', !!(list && list.length));
    if (isOpen($('near'))) renderNear();
  }
  function renderNear() {
    const list = nearList();
    const acc = state.me ? ' · GPS ±' + Math.round(state.me.acc) + ' m' : '';
    const body = !list
      ? '<div class="near-empty">Đang lấy vị trí GPS…</div>'
      : !list.length
        ? '<div class="near-empty">Không có công trình nào trong ' + NEAR_RADIUS + ' m. Đi lại gần hơn hoặc tìm theo tên ở trên.</div>'
        : list.map(p =>
          '<div class="near-item">' +
            '<button type="button" class="near-open" data-open="' + esc(p.id) + '">' + dot(p.group) +
              '<span class="near-text"><span class="row-owner">' + esc(p.owner || '—') + '<span class="row-id num">' + esc(p.id) + '</span></span>' +
              '<span class="row-sub">' + esc(p.address) + '</span>' +
              '<span class="near-st">' + esc(p.status || '—') + ' · cách ' + Math.round(meters(state.me, p.loc)) + ' m</span>' +
              agoLine(p) + '</span></button>' +
            '<button type="button" class="near-stbtn" data-status="' + esc(p.id) + '" aria-label="Cập nhật hiện trạng ' + esc(p.owner) + '">' + ICON.status + '</button>' +
            '<button type="button" class="near-cam" data-snap="' + esc(p.id) + '" aria-label="Chụp ảnh ' + esc(p.owner) + '">' + ICON.cam + '</button>' +
          '</div>').join('');
    $('near').innerHTML = '<span class="grab" aria-hidden="true"></span>' +
      '<div class="near-head"><div><b>Công trình gần bạn</b><span>Trong bán kính ' + NEAR_RADIUS + ' m' + acc + '</span></div>' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + ICON.close + '</button></div>' + body;
  }
  function openNear() {
    hidePeek(); hideSnap();
    renderNear(); openPanel($('near'));
    $('nearFab').hidden = true;
    if (!state.me) locateMe().catch(e => toast(gpsError(e)));
  }
  function closeNear() { closePanel($('near')); $('nearFab').hidden = false; }
  $('nearFab').onclick = openNear;
  $('near').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeNear(); return; }
    const st = e.target.closest('[data-status]');
    if (st) { closeNear(); openStatus(st.dataset.status); return; }
    const cam = e.target.closest('[data-snap]');
    if (cam) { snapPhoto(cam.dataset.snap); return; }
    const o = e.target.closest('[data-open]');
    if (o) {
      const p = state.byId[o.dataset.open]; closeNear();
      selectProject(o.dataset.open, 'map');
    }
  });

  /** Điện thoại: theo dõi GPS liên tục để nút Gần đây luôn đúng số công trình. */
  function watchMe() {
    if (!navigator.geolocation || !isPhone()) return;
    let drawn = 0;
    navigator.geolocation.watchPosition(g => {
      const cur = { lat: g.coords.latitude, lng: g.coords.longitude, acc: g.coords.accuracy, t: g.timestamp };
      // Giữ điểm chính xác hơn nếu điểm mới kém hẳn và cũ chưa quá 20 giây
      if (state.me && cur.acc > state.me.acc * 2 && cur.t - (state.me.t || 0) < 20000) return;
      state.me = cur;
      if (state.engine && Date.now() - drawn > 1500) { state.engine.showMe(cur); drawn = Date.now(); }
      updateNear();
    }, () => updateNear(), { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }

  /* ---------------- Chụp ảnh lưu thẳng vào công trình ---------------- */

  let snapFor = null;
  /** Mở máy ảnh ngay trong lần chạm (trình duyệt chỉ cho mở máy ảnh khi người dùng vừa bấm). */
  function snapPhoto(id) {
    snapFor = id;
    const input = $('snapInput'); input.value = ''; input.click();
  }
  $('snapInput').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (f && snapFor && state.byId[snapFor]) saveSnap(snapFor, f);
  };

  function showSnap(p, mode, thumb, title, sub) {
    const el = $('snap');
    clearTimeout(showSnap._t);
    const icon = mode === 'busy' ? '<span class="spin" aria-hidden="true"></span>' : mode === 'err' ? '!' : ICON.check;
    el.innerHTML = '<div class="snap-top"><span class="snap-ok ' + (mode === 'ok' ? '' : mode) + '">' + icon + '</span>' +
      '<div class="snap-text"><b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span></div>' +
      (thumb ? '<img class="snap-thumb" alt="" src="' + thumb + '">' : '') + '</div>' +
      (mode === 'ok' ? '<div class="snap-acts"><button type="button" class="btn primary" data-more>Chụp thêm</button><button type="button" class="btn" data-status>Cập nhật hiện trạng</button></div>' : '') +
      (mode === 'err' ? '<div class="snap-acts"><button type="button" class="btn primary" data-retry>Thử lại</button><button type="button" class="btn" data-dismiss>Bỏ qua</button></div>' : '');
    if (!isOpen(el)) openPanel(el);
    if (mode === 'ok') {
      el.querySelector('[data-more]').onclick = () => snapPhoto(p.id);
      el.querySelector('[data-status]').onclick = () => { hideSnap(); openStatus(p.id); };
      showSnap._t = setTimeout(hideSnap, 15000);
    }
  }
  function hideSnap() { const el = $('snap'); clearTimeout(showSnap._t); if (!el.hidden) closePanel(el); }

  function saveSnap(id, file) {
    const p = state.byId[id];
    const thumb = URL.createObjectURL(file);
    closeNear();
    showSnap(p, 'busy', thumb, 'Đang lưu ảnh vào công trình ' + p.id, p.owner);
    const fresh = state.me && Date.now() - (state.me.t || 0) < 60000;
    const posP = fresh ? Promise.resolve(state.me) : getPosition({ maxWait: 6000, goodEnough: 10 }).catch(() => null);
    let pos = null;
    posP.then(x => {
      pos = x;
      const taken = file.lastModified ? new Date(file.lastModified) : new Date();
      const lines = [stampNow(taken)];
      if (pos) lines.push(fmtCoord(pos.lat) + ', ' + fmtCoord(pos.lng) + '  ±' + Math.round(pos.acc) + ' m');
      lines.push(p.id + ' · ' + p.address);
      return processImage(file, lines);
    }).then(dataUrl => call('apiUploadPhoto', { id: p.id, dataUrl, index: 1, caption: '' }).then(up => { seedThumb(up.fileId, dataUrl); return up; }))
      .then(up => {
        // Công trình chưa có vị trí thì lấy luôn vị trí lúc chụp (nếu GPS đủ chính xác)
        const move = !p.loc && !!pos && pos.acc <= 30;
        return call('apiSaveInspection', {
          id: p.id, status: '', note: '',
          lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, acc: pos ? pos.acc : null,
          updateLocation: move, photoIds: [up.fileId]
        }).then(res => ({ res, move, up }));
      })
      .then(({ res, move, up }) => {
        p.last = Object.assign({}, p.last || {}, { t: Date.now(), at: res.at, by: state.user.name, photos: 1, count: (p.last ? p.last.count : 0) + 1,
          photo: { id: up.fileId, n: 1, t: Date.now(), at: res.at } });
        if (move) p.loc = { lat: pos.lat, lng: pos.lng, acc: Math.round(pos.acc), source: 'GPS hiện trường', by: state.user.name, at: res.at };
        refresh(); updateNear();
        showSnap(p, 'ok', thumb, 'Đã lưu 1 ảnh vào công trình ' + p.id,
          p.owner + ' · ' + res.at + (pos ? ' · GPS ±' + Math.round(pos.acc) + ' m' : '') + (move ? ' · đã lưu vị trí' : ''));
      })
      .catch(err => {
        showSnap(p, 'err', thumb, 'Chưa lưu được ảnh', String(err && err.message || err));
        const el = $('snap');
        el.querySelector('[data-retry]').onclick = () => saveSnap(id, file);
        el.querySelector('[data-dismiss]').onclick = hideSnap;
      });
  }

  /* ---------------- Cập nhật hiện trạng nhanh, giới hạn theo quy mô ---------------- */

  /** Đọc quy mô: số tầng nổi lớn nhất, có hầm / lửng / tum không. Trên 6 tầng hoặc chưa có quy mô thì nhập tay. */
  function parseScale(qm) {
    const l = String(qm || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!l) return { manual: true, n: 0, empty: true };
    let n = 0;
    const up = v => { v = parseInt(v, 10); if (v > n) n = v; };
    l.replace(/(\d+) ?(tầng nổi|tầng|t)\b(?! ?(hầm|tum))/g, (m, v) => up(v));
    l.replace(/\bt(\d+)((?: ?, ?\d+)*)/g, (m, v, rest) => { up(v); (rest.match(/\d+/g) || []).forEach(up); });
    l.replace(/tầng (\d+)/g, (m, v) => up(v));
    return { manual: n === 0 || n > 6, n, lung: /l[ửừ]ng/.test(l), ham: l.includes('hầm'), tum: l.includes('tum') };
  }
  function statusOptions(sc) {
    const floors = [];
    if (sc.ham) floors.push('Thi công tầng hầm');
    for (let i = 1; i <= sc.n; i++) { floors.push('Thi công T' + i); if (i === 1 && sc.lung) floors.push('Thi công tầng lửng'); }
    if (sc.tum) floors.push('Thi công tum');
    return ['Chưa thi công', 'Đang phá dỡ', 'Thi công móng'].concat(floors, ['Hoàn thiện', 'Đã đưa vào sử dụng', 'Hoàn thành', 'Dừng thi công']);
  }

  let stFor = null;
  function openStatus(id) {
    const p = state.byId[id]; if (!p) return;
    stFor = { id, pick: '', busy: false };
    const sc = parseScale(p.scale);
    const bare = x => norm(x).replace(/\s+/g, ' ').trim().replace(/^dang /, '');   // "Đang thi công tum" = "Thi công tum"
    const cur = bare(p.status);
    const el = $('stSheet');
    const head = '<span class="grab" aria-hidden="true"></span>' +
      '<div class="st-head"><div><b id="stTitle">Cập nhật hiện trạng</b><span>' + esc(p.id + ' · ' + p.owner + ' · ' + p.address) + '</span></div>' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + ICON.close + '</button></div>' +
      '<div class="st-scale"><span>Quy mô</span><span>' + esc(p.scale || 'Chưa có') + '</span></div>';
    const body = sc.manual
      ? '<div class="field"><label for="stText">Hiện trạng thi công</label><input class="input" id="stText" value="' + esc(p.status) + '" autocomplete="off" spellcheck="false">' +
        '<span class="st-hint">' + (sc.empty ? 'Công trình chưa có quy mô nên nhập tay hiện trạng.' : 'Công trình trên 6 tầng nên nhập tay hiện trạng.') + '</span></div>'
      : '<div class="st-chips" role="radiogroup" aria-label="Hiện trạng thi công">' + statusOptions(sc).map(t =>
          '<button type="button" class="st-chip" role="radio" aria-checked="false" data-v="' + esc(t) + '">' + ICON.check.replace('width="16" height="16"', 'width="14" height="14"') + esc(t) +
          (bare(t) === cur ? ' <span class="cur">hiện tại</span>' : '') + '</button>').join('') + '</div>' +
        '<input class="input" id="stText" placeholder="Khác: ghi hiện trạng khác…" aria-label="Hiện trạng khác" autocomplete="off" spellcheck="false">';
    el.innerHTML = head + body + '<button type="button" class="btn primary big block" id="stSave" disabled>Lưu hiện trạng</button>';
    $('scrim').hidden = false; openPanel(el);
    const save = $('stSave'), text = $('stText');
    const sync = () => {
      const v = stFor.pick || text.value.trim();
      save.disabled = !v || stFor.busy;
      save.textContent = v && !sc.manual ? 'Lưu: ' + v : 'Lưu hiện trạng';
    };
    el.querySelectorAll('.st-chip').forEach(b => b.onclick = () => {
      const on = b.getAttribute('aria-checked') !== 'true';
      el.querySelectorAll('.st-chip').forEach(x => x.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', String(on));
      stFor.pick = on ? b.dataset.v : '';
      if (on) text.value = '';
      sync();
    });
    text.oninput = () => {
      if (!sc.manual && text.value.trim()) { stFor.pick = ''; el.querySelectorAll('.st-chip').forEach(x => x.setAttribute('aria-checked', 'false')); }
      sync();
    };
    if (sc.manual) { sync(); }
    el.querySelector('[data-close]').onclick = closeStatus;
    save.onclick = saveStatus;
  }
  function closeStatus() {
    if (stFor && stFor.busy) return;
    stFor = null; closePanel($('stSheet')); $('scrim').hidden = true;
  }
  $('scrim').onclick = closeStatus;

  function saveStatus() {
    if (!stFor || stFor.busy) return;
    const p = state.byId[stFor.id];
    const status = stFor.pick || $('stText').value.trim();
    if (!status) return;
    stFor.busy = true;
    const btn = $('stSave'); btn.disabled = true; btn.textContent = 'Đang lưu…';
    call('apiSaveInspection', { id: p.id, status, note: '', lat: null, lng: null, acc: null, updateLocation: false, photoIds: [] })
      .then(res => {
        p.last = Object.assign({}, p.last || {}, { t: Date.now(), at: res.at, by: state.user.name, status, count: (p.last ? p.last.count : 0) + 1 });
        p.status = status; p.statusFrom = 'app'; p.group = groupOf(status, p);
        stFor.busy = false; closeStatus();
        refresh(); updateNear();
        if (isOpen($('detail')) && state.selected === p.id) openDetail(p.id);
        if (!$('mpop').hidden && $('mpop').dataset.id === p.id) showPop(p);
        toast('Đã cập nhật: ' + status, 3000, true);
      })
      .catch(err => {
        stFor.busy = false; btn.disabled = false; btn.textContent = 'Thử lại';
        toast('Chưa lưu được: ' + (err && err.message || err), 5000);
      });
  }

  /* ---------------- Trang danh sách công trình (máy tính) ---------------- */

  const STAGES = [
    { key: 'chua', label: 'Chưa thi công', group: 'chua' },
    { key: 'phado', label: 'Đang phá dỡ', group: 'thicong' },
    { key: 'mong', label: 'Thi công móng', group: 'mong' },
    { key: 'ham', label: 'Thi công tầng hầm', group: 'thicong' },
    { key: 'tang', label: 'Thi công T1 – T6', group: 'thicong' },
    { key: 'tum', label: 'Thi công tum', group: 'tum' },
    { key: 'hoanthien', label: 'Hoàn thiện', group: 'hoanthien' },
    { key: 'dung', label: 'Dừng thi công', group: 'dung' },
    { key: 'hoanthanh', label: 'Hoàn thành, xong', group: 'xong' },
    { key: 'sudung', label: 'Đã đưa vào sử dụng', group: 'xong' }
  ];
  const STAGE_DEFAULT = ['chua', 'phado', 'mong', 'ham', 'tang', 'tum', 'hoanthien', 'dung'];   // mặc định: mọi hiện trạng trừ đã xong (anh chốt 27/10)
  const KINDS = [{ key: 'xd', label: 'Xây mới (GPXD)' }, { key: 'sc', label: 'Cải tạo, sửa chữa (GPSC)' }];

  /** Giai đoạn chi tiết hơn nhóm màu, dùng cho bộ lọc hiện trạng của trang danh sách. */
  function stageOf(p) {
    const s = norm(p.status).replace(/\s+/g, ' ').trim();
    if (!s) return p.tbkc && !p.start ? 'chua' : 'tang';
    if (s.indexOf('dua vao su dung') >= 0) return 'sudung';
    if (s.indexOf('dung') >= 0 && s.indexOf('su dung') < 0) return 'dung';
    if (s === 'xong' || s === 'da xong' || s.indexOf('hoan thanh') >= 0) return 'hoanthanh';
    if (s.indexOf('hoan thien') >= 0) return 'hoanthien';
    if (s.indexOf('chua thi cong') >= 0) return 'chua';
    if (s.indexOf('pha do') >= 0 || s.indexOf('thao do') >= 0) return 'phado';
    if (s.indexOf('ham') >= 0) return 'ham';
    if (s.indexOf('mong') >= 0) return 'mong';
    if (s.indexOf('tum') >= 0) return 'tum';
    return 'tang';
  }
  /** GPXD là xây mới; GPSC / GPCT là cải tạo, sửa chữa. */
  function kindOf(p) {
    const g = norm(p.gpxd);
    if (g.indexOf('gpsc') >= 0 || g.indexOf('gpct') >= 0) return 'sc';
    if (g.indexOf('gpxd') >= 0) return 'xd';
    return '';
  }

  const lf = { stages: new Set(STAGE_DEFAULT), areas: new Set(), kinds: new Set(), noLoc: false, q: '', sort: 'start', dir: -1 };
  // Cột sắp xếp được: bấm lần nữa để đảo chiều. Công trình thiếu giá trị luôn xếp cuối.
  const STAGE_ORDER = STAGES.map(st => st.key);
  const SORTS = {
    id: { dir: 1, val: p => { const m = String(p.id).match(/^(\d{4})-(\d+)$/); return m ? Number(m[1]) * 1e4 + Number(m[2]) : null; } },
    start: { dir: -1, val: p => dateValue(p.start) || dateValue(p.tbkc) || null },
    status: { dir: 1, val: p => STAGE_ORDER.indexOf(stageOf(p)) },
    upd: { dir: -1, val: p => lastTime(p) || null }
  };
  function lpSorted(list) {
    const f = SORTS[lf.sort].val, d = lf.dir;
    return list.map(p => [p, f(p)]).sort((a, b) => a[1] == null ? (b[1] == null ? 0 : 1) : b[1] == null ? -1 : (a[1] - b[1]) * d).map(x => x[0]);
  }
  const allAreas = () => (CONF.areas || []).map(a => a.code);
  function lpReset() { lf.stages = new Set(STAGE_DEFAULT); lf.areas = new Set(); lf.kinds = new Set(); lf.noLoc = false; }   // khu vực, loại: không tick = tất cả
  function lpMatch(p, ignore) {
    // Mục không tick ô nào = không lọc theo mục đó (hiện tất cả)
    if (ignore !== 'stages' && lf.stages.size && !lf.stages.has(stageOf(p))) return false;
    if (ignore !== 'areas' && lf.areas.size && lf.areas.size < allAreas().length && !lf.areas.has(p.area)) return false;
    if (ignore !== 'kinds' && lf.kinds.size && lf.kinds.size < KINDS.length && !lf.kinds.has(kindOf(p))) return false;
    if (ignore !== 'noLoc' && lf.noLoc && p.loc) return false;
    if (lf.q) {
      const hay = norm([p.id, p.owner, p.address, p.gpxd, p.phone, p.status].join(' '));
      if (lf.q.split(/\s+/).some(w => hay.indexOf(w) < 0)) return false;
    }
    return true;
  }

  const CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function lpItem(group, key, label, on, dotHtml) {
    return '<label class="lp-item"><input type="checkbox" data-g="' + group + '" data-k="' + esc(key) + '"' + (on ? ' checked' : '') + '>' +
      '<span class="lp-box">' + CHECK + '</span>' + (dotHtml || '') + '<span class="lp-label">' + esc(label) + '</span><span class="lp-n" data-n="' + group + ':' + esc(key) + '"></span></label>';
  }
  const legend = (g, text) => '<legend><span>' + text + '</span><button type="button" class="lp-clear" data-clear="' + g + '">Bỏ lọc</button></legend>';
  function renderLpFilters() {
    $('lpGroups').innerHTML =
      '<fieldset class="lp-group">' + legend('stages', 'Hiện trạng') + STAGES.map(st => lpItem('stages', st.key, st.label, lf.stages.has(st.key), dot(st.group))).join('') + '</fieldset>' +
      '<fieldset class="lp-group">' + legend('areas', 'Khu vực') + (CONF.areas || []).map(a => lpItem('areas', a.code, 'Khu ' + a.code, lf.areas.has(a.code))).join('') + '</fieldset>' +
      '<fieldset class="lp-group">' + legend('kinds', 'Loại công trình') + KINDS.map(k => lpItem('kinds', k.key, k.label, lf.kinds.has(k.key))).join('') + '</fieldset>' +
      '<fieldset class="lp-group">' + legend('noLoc', 'Vị trí') + lpItem('noLoc', '1', 'Chưa có vị trí', lf.noLoc) + '</fieldset>';
    lpClearButtons();
  }
  /** Nút "Bỏ lọc": bỏ tick mọi ô của mục đó (anh góp ý 27/10), mục không tick ô nào thì hiện tất cả; muốn xem một loại chỉ cần tick đúng ô đó. */
  function lpClearButtons() {
    const ticked = { stages: lf.stages.size > 0, areas: lf.areas.size > 0, kinds: lf.kinds.size > 0, noLoc: lf.noLoc };
    $('lpGroups').querySelectorAll('[data-clear]').forEach(b => { b.hidden = !ticked[b.dataset.clear]; });
    $('lpClearAll').hidden = !Object.values(ticked).some(Boolean);
  }
  function lpClear(g) {
    if (g === 'stages' || g === 'all') lf.stages = new Set();
    if (g === 'areas' || g === 'all') lf.areas = new Set();
    if (g === 'kinds' || g === 'all') lf.kinds = new Set();
    if (g === 'noLoc' || g === 'all') lf.noLoc = false;
    renderLpFilters(); renderListPage(true);
  }
  $('lpGroups').addEventListener('click', e => { const b = e.target.closest('[data-clear]'); if (b) lpClear(b.dataset.clear); });
  $('lpClearAll').onclick = () => lpClear('all');
  function renderLpCounts() {
    const by = (ignore, fn) => state.projects.filter(p => lpMatch(p, ignore) && fn(p)).length;
    $('lpGroups').querySelectorAll('[data-n]').forEach(el => {
      const [g, k] = el.dataset.n.split(':');
      el.textContent = g === 'stages' ? by('stages', p => stageOf(p) === k)
        : g === 'areas' ? by('areas', p => p.area === k)
        : g === 'kinds' ? by('kinds', p => kindOf(p) === k)
        : by('noLoc', p => !p.loc);
    });
  }
  function lpSummary() {
    const tags = [];
    const isDefault = lf.stages.size === STAGE_DEFAULT.length && STAGE_DEFAULT.every(k => lf.stages.has(k));
    const allS = !lf.stages.size || lf.stages.size === STAGES.length;
    tags.push({ g: 'stages', text: isDefault ? 'Chưa xong' : allS ? 'Mọi hiện trạng' : lf.stages.size === 1 ? STAGES.find(st => lf.stages.has(st.key)).label : lf.stages.size + ' hiện trạng', reset: !isDefault });
    const allA = !lf.areas.size || lf.areas.size === allAreas().length;
    tags.push({ g: 'areas', text: allA ? 'Mọi khu' : 'Khu ' + Array.from(lf.areas).join(', '), reset: !allA });
    const allK = !lf.kinds.size || lf.kinds.size === KINDS.length;
    tags.push({ g: 'kinds', text: allK ? 'Mọi loại' : KINDS.find(k => lf.kinds.has(k.key)).label, reset: !allK });
    if (lf.noLoc) tags.push({ g: 'noLoc', text: 'Chưa có vị trí', reset: true });
    $('lpActive').innerHTML = tags.map(t => '<span class="lp-tag">' + esc(t.text) +
      (t.reset ? '<button type="button" data-reset="' + t.g + '" aria-label="Bỏ lọc ' + esc(t.text) + '">×</button>' : '') + '</span>').join('');
  }
  function renderListPage(animate) {
    if (!$('lpGroups').children.length) renderLpFilters();
    renderLpCounts(); lpSummary(); lpClearButtons();
    const list = lpSorted(state.projects.filter(p => lpMatch(p)));
    document.querySelectorAll('.lp-table th[data-sort]').forEach(th => {
      const on = th.dataset.sort === lf.sort;
      th.classList.toggle('on', on);
      th.setAttribute('aria-sort', on ? (lf.dir < 0 ? 'descending' : 'ascending') : 'none');
      th.querySelector('.arr').textContent = on ? (lf.dir < 0 ? '↓' : '↑') : '';
    });
    $('lpCount').innerHTML = '<b class="num">' + list.length + '</b> / ' + state.projects.length + ' công trình';
    if (!list.length) {
      $('lpRows').innerHTML = '<tr><td colspan="9" class="lp-empty">Không có công trình nào khớp bộ lọc.</td></tr>';
      return;
    }
    $('lpRows').innerHTML = list.map(p => {
      const a = ago(p);
      return '<tr data-id="' + esc(p.id) + '" tabindex="0" aria-selected="' + (state.selected === p.id) + '">' +
        '<td class="c-id">' + esc(p.id) + '</td>' +
        '<td class="c-owner" title="' + esc(p.owner) + '">' + esc(p.owner || '—') + '</td>' +
        '<td class="c-addr" title="' + esc(p.address) + '">' + esc(p.address) + '</td>' +
        '<td>' + esc(p.gpxd || '—') + '</td>' +
        '<td class="c-scale" title="' + esc(p.scale) + '">' + esc(p.scale || '—') + '</td>' +
        '<td class="c-start">' + esc(p.start || '—') + '</td>' +
        '<td class="c-st">' + dot(p.group) + esc(p.status || '—') + '</td>' +
        '<td class="' + (a.old ? 'old' : 'faint') + '">' + esc(a.none ? '—' : a.text) + '</td>' +
        '<td class="c-loc">' + (p.loc
          ? '<button type="button" class="lp-map" data-map aria-label="Xem ' + esc(p.owner) + ' trên bản đồ" title="Xem trên bản đồ">' + ICON.pin + 'Bản đồ</button>'
          : '<span class="noloc">Chưa có</span>') + '</td></tr>';
    }).join('');
    if (animate && !calm()) {
      const rows = Array.from($('lpRows').children).slice(0, 18);
      gsap.fromTo(rows, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'expo.out', stagger: 0.02, clearProps: 'transform,opacity,visibility', overwrite: true });
    }
  }
  $('lpGroups').addEventListener('change', e => {
    const c = e.target; if (!c.dataset || !c.dataset.g) return;
    const g = c.dataset.g, k = c.dataset.k;
    if (g === 'noLoc') lf.noLoc = c.checked;
    else c.checked ? lf[g].add(k) : lf[g].delete(k);
    renderListPage(true);
  });
  document.querySelector('.lp-table thead').addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]'); if (!th) return;
    const k = th.dataset.sort;
    lf.dir = lf.sort === k ? -lf.dir : SORTS[k].dir; lf.sort = k;
    renderListPage(true);
  });
  $('lpActive').addEventListener('click', e => {
    const b = e.target.closest('[data-reset]'); if (!b) return;
    const g = b.dataset.reset;
    if (g === 'stages') lf.stages = new Set(STAGE_DEFAULT);
    if (g === 'areas') lf.areas = new Set();
    if (g === 'kinds') lf.kinds = new Set();
    if (g === 'noLoc') lf.noLoc = false;
    renderLpFilters(); renderListPage();
  });
  $('lpReset').onclick = () => { lpReset(); $('lq').value = ''; lf.q = ''; renderLpFilters(); renderListPage(); };
  let lqTimer;
  $('lq').addEventListener('input', e => {
    clearTimeout(lqTimer);
    lqTimer = setTimeout(() => { lf.q = norm(e.target.value).trim(); renderListPage(); }, 120);
  });
  function openFromTable(tr) {
    state.selected = tr.dataset.id;
    $('lpRows').querySelectorAll('tr[aria-selected="true"]').forEach(x => x.setAttribute('aria-selected', 'false'));
    tr.setAttribute('aria-selected', 'true');
    openDetail(tr.dataset.id);
  }
  $('lpRows').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    if (e.target.closest('[data-map]')) showOnMap(tr.dataset.id); else openFromTable(tr);
  });
  $('lpRows').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-id]'); if (tr) openFromTable(tr); } });

  /** Từ danh sách: sang bản đồ, bay tới công trình và mở popup (máy tính) / thẻ thông tin (điện thoại).
      Công trình đang bị bộ lọc của bản đồ ẩn thì nới bộ lọc vừa đủ để thấy marker. */
  function showOnMap(id) {
    const p = state.byId[id]; if (!p || !p.loc) return;
    if (!matches(p)) {
      const f = state.filter;
      if (f.groups.size && !f.groups.has(p.group)) f.groups.add(p.group);
      if (f.noLoc) f.noLoc = false;
      if (f.q && !matches(p, 'areas')) { f.q = ''; $('q').value = ''; $('qClear').hidden = true; }
      if (state.area && p.area !== state.area) setArea('');
      renderFilters(); renderList(); renderMarkers();
    }
    if (isPhone()) { goView('map'); setTimeout(() => selectProject(id, 'map'), 80); }
    else { setPage('map'); setTimeout(() => selectProject(id, 'list'), 120); }
  }

  function setPage(page) {
    if (app.dataset.page === page) return;
    app.dataset.page = page;
    document.querySelectorAll('.pagetabs [data-page]').forEach(b => {
      if (b.dataset.page === page) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    closeDetail();
    const pane = page === 'list' ? $('pageList') : page === 'report' ? $('pageReport') : document.querySelector('.main');
    if (!calm()) gsap.fromTo(pane, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
    if (page === 'list') renderListPage(true);
    else if (page === 'report') renderReport();
    else if (state.engine) setTimeout(() => { state.engine.resize(); renderMarkers(); }, 50);
    store.set('page', page);
  }
  document.querySelector('.pagetabs').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) setPage(b.dataset.page); });

  /* ---------------- Báo cáo tuần ---------------- */
  // Lập theo mẫu tab "Bao cao tuan": chia khu I, II, III theo cột Địa bàn, khu IV là công trình đã thông báo khởi công
  // nhưng chưa thi công. Bỏ công trình đã xong hoặc đã đưa vào sử dụng. Trong mỗi khu xếp theo ngày thi công.
  const REPORT = {
    org: ['UBND PHƯỜNG VĨNH TUY', 'PHÒNG HẠ TẦNG, ĐÔ THỊ VÀ MÔI TRƯỜNG'],
    nation: ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc'],
    title: 'BÁO CÁO CÁC CÔNG TRÌNH ĐANG XÂY DỰNG TRÊN ĐỊA BÀN PHƯỜNG VĨNH TUY',
    sections: [
      { key: 'I', title: 'I. KV 1 - PHÍA BẮC PHỐ LẠC TRUNG (TDP 1÷7)' },
      { key: 'II', title: 'II. KV 2 - PHÍA NAM PHỐ LẠC TRUNG ĐẾN PHÍA BẮC PHỐ MINH KHAI (TDP 8÷16)' },
      { key: 'III', title: 'III. KV 3 - PHÍA NAM PHỐ MINH KHAI (TDP 17÷38)' },
      { key: '?', title: 'CÔNG TRÌNH CHƯA GHI ĐỊA BÀN' },   // chỉ hiện khi có
      { key: 'IV', title: 'IV. CÁC CÔNG TRÌNH ĐÃ THÔNG BÁO KHỞI CÔNG' }
    ],
    // Dòng tổng hợp theo file mẫu anh căn chỉnh (28/10): nhãn bên trái căn phải, nội dung bắt đầu từ cột Số GPXD
    summary: d => [
      ['Tổng số ' + d.total + ' công trình, trong đó:', ' ' + d.legal + ' đúng phép; ' + d.unlicensed + ' công trình không phép; ' + d.wrong + ' công trình sai phép;'],
      ['', '- ' + d.building + ' công trình đang thi công;'],
      ['', ' - ' + d.notice + ' công trình đã thông báo khởi công.'],
      ['Tổng số vi phạm: ', d.wrong + ' sai phép + ' + d.unlicensed + ' không phép = ' + (d.wrong + d.unlicensed) + ' công trình.']
    ],
    signers: [
      { role: 'TỔ VIÊN', name: '' },
      { role: 'PHÓ PHÒNG', name: 'Vũ Huy Khiêm' },
      { role: 'TRƯỞNG PHÒNG', name: 'Phạm Ngọc Hưng' }
    ]
  };
  const REPORT_COLS = [5, 32.86, 7, 7, 7, 26, 26.71, 24.57, 11.86, 8];   // độ rộng cột theo file mẫu anh căn chỉnh (đơn vị Excel)
  const REPORT_W = REPORT_COLS.reduce((a, b) => a + b, 0);
  const DAY = 864e5;
  const rp = { from: 0, to: 0, week: 0 };
  const isoDate = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dmy = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const fromIso = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : 0; };
  /** Kỳ báo cáo từ thứ Bảy đến thứ Sáu (anh chốt 28/10, ví dụ 24/10–30/10/2026). week = 0 là tuần này, -1 là tuần trước. */
  function reportWeek(week) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const back = (d.getDay() + 1) % 7;   // số ngày từ thứ Bảy gần nhất
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + week * 7).getTime();
    return { from, to: new Date(from).setDate(new Date(from).getDate() + 6) };
  }
  /** Chủ đầu tư: mỗi người một dòng (file gốc ghi Ông – Bà). */
  function reportOwners(p) { return String(p.owner || '').split(/\s+–\s+|\n/).map(x => x.trim()).filter(Boolean); }
  function reportSteps(p) {
    const out = [];
    if (p.tbkc) out.push('TBKC: ' + p.tbkc);
    (p.checks || []).forEach((c, i) => {
      if (/^x$/i.test(String(c.bb || '').trim())) return;   // biên bản ghi "x" thì không đưa lần kiểm tra đó vào báo cáo (anh dặn 28/10)
      const d = c.bb || c.tb; if (d) out.push('KT lần ' + (i + 1) + ': ' + d);
    });
    return out.join('\n');
  }
  function reportData() {
    const to = rp.to + DAY - 1;
    // Khu I, II, III xếp theo ngày thi công (cũ trước, mới sau); khu IV xếp theo ngày thông báo khởi công
    const order = p => dateValue(p.start) || dateValue(p.tbkc) || Infinity;
    const idNum = p => { const m = String(p.id).match(/^(\d{4})-(\d+)$/); return m ? +m[1] * 1e4 + +m[2] : 1e9; };
    const rows = state.projects.filter(p => {
      const st = stageOf(p);
      if (st === 'hoanthanh' || st === 'sudung') return false;
      const first = Math.min(dateValue(p.tbkc) || Infinity, dateValue(p.start) || Infinity);
      return !(first !== Infinity && first > to);   // công trình mới có sau kỳ báo cáo thì chưa tính
    });
    const by = {};
    rows.forEach(p => {
      // Khu IV: hiện trạng "chưa thi công" và chưa có ngày thi công; có ngày thi công rồi thì chuyển về khu I, II, III
      const key = stageOf(p) === 'chua' && !dateValue(p.start) ? 'IV' : (['I', 'II', 'III'].indexOf(p.area) >= 0 ? p.area : '?');
      (by[key] = by[key] || []).push(p);
    });
    let tt = 0;
    const sections = REPORT.sections.filter(s => s.key !== '?' || by['?']).map(s => ({
      key: s.key, title: s.title,
      rows: (by[s.key] || []).sort((a, b) => order(a) - order(b) || idNum(a) - idNum(b)).map(p => ({
        id: p.id, tt: ++tt, owners: reportOwners(p), address: p.address,
        permit: [p.gpxd, p.gpxdDate ? 'ngày ' + p.gpxdDate : ''].filter(Boolean).join(' '),
        scale: p.scale, status: p.status || '', steps: reportSteps(p), note: ''   // cột Ghi chú để trống, không lấy từ file dữ liệu
      }))
    }));
    const total = rows.length, notice = (by.IV || []).length;
    // App chỉ quản lý công trình có phép: mọi công trình đánh dấu "Có phép", số vi phạm bằng 0 như mẫu
    return { sections, total, legal: total, unlicensed: 0, wrong: 0, building: total - notice, notice, noArea: (by['?'] || []).length };
  }
  function renderReport() {
    if (!rp.from) setReportWeek(0, true);
    const d = reportData();
    $('rpStats').innerHTML = [
      [d.total, 'Tổng số công trình'], [d.legal, 'Đúng phép'], [d.building, 'Đang thi công'], [d.notice, 'Chưa khởi công']
    ].map(x => '<div class="rp-stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>').join('');
    $('rpViol').innerHTML = 'Vi phạm: ' + d.wrong + ' sai phép + ' + d.unlicensed + ' không phép = <b>' + (d.wrong + d.unlicensed) + '</b> công trình';
    $('rpInfo').textContent = d.total + ' công trình';
    const cell = (v, cls) => '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</td>';
    const body = d.sections.map(sec => '<tr class="sec"><td colspan="10">' + esc(sec.title) + '</td></tr>' +
      (sec.rows.length ? sec.rows.map(r => '<tr data-id="' + esc(r.id) + '">' +
        cell(r.tt, 'c') + cell(r.owners.map(o => '<b>' + esc(o) + '</b><br>').join('') + esc(r.address)) + cell('x', 'c') + cell('') + cell('') +
        cell(esc(r.permit) + (r.scale ? '<br>' + esc(r.scale) : '')) + cell(esc(r.status)) + cell(esc(r.steps), 'steps') + cell(esc(r.note)) + cell('') +
        '</tr>').join('') : '')).join('');
    $('rpPaper').innerHTML =
      (d.noArea ? '<p class="rp-noarea">' + d.noArea + ' công trình chưa ghi cột Địa bàn trong file dữ liệu nên chưa xếp được vào khu I, II, III. Anh bổ sung trong file rồi tải lại.</p>' : '') +
      '<div class="rp-head"><div><span>' + REPORT.org[0] + '</span><b>' + REPORT.org[1] + '</b></div><div><b>' + REPORT.nation[0] + '</b><b class="u">' + REPORT.nation[1] + '</b></div></div>' +
      '<h1>' + REPORT.title + '</h1><p class="rp-period">(Từ ' + dmy(rp.from) + ' đến ' + dmy(rp.to) + ')</p>' +
      '<div class="rp-sum">' + REPORT.summary(d).map(x => '<span>' + esc(x[0]) + '</span><span>' + esc(x[1]) + '</span>').join('') + '</div>' +
      '<table class="rp-table"><colgroup>' + REPORT_COLS.map(w => '<col style="width:' + (w / REPORT_W * 100).toFixed(2) + '%">').join('') + '</colgroup>' +
      '<thead><tr><th rowspan="2">TT</th><th rowspan="2">Tên chủ đầu tư, địa điểm xây dựng</th><th colspan="3">Cơ sở pháp lý</th><th rowspan="2">Số GPXD<br>Ngày cấp<br>Quy mô</th><th rowspan="2">Hiện trạng công trình</th><th rowspan="2">Biện pháp xử lý</th><th rowspan="2">Ghi chú</th><th rowspan="2">Đơn thư</th></tr>' +
      '<tr><th class="sub">Có phép</th><th class="sub">Không phép</th><th class="sub">Sai phép</th></tr></thead><tbody>' + body + '</tbody></table>' +
      '<div class="rp-sign">' + REPORT.signers.map(s => '<div><b>' + s.role + '</b><span class="name">' + esc(s.name) + '</span></div>').join('') + '</div>';
    // Ô ký và dòng tổng hợp thẳng theo cột như bản Excel: Tổ viên trên cột TT–Số GPXD, Phó phòng trên Hiện trạng, Trưởng phòng trên ba cột cuối
    const pc = (a, b) => (REPORT_COLS.slice(a, b).reduce((x, y) => x + y, 0) / REPORT_W * 100).toFixed(2) + '%';
    $('rpPaper').querySelector('.rp-sign').style.gridTemplateColumns = pc(0, 6) + ' ' + pc(6, 7) + ' ' + pc(7, 10);
    $('rpPaper').querySelector('.rp-sum').style.gridTemplateColumns = pc(0, 5) + ' 1fr';
  }
  function setReportWeek(week, quiet) {
    const w = reportWeek(week);
    rp.week = week; rp.from = w.from; rp.to = w.to;
    $('rpFrom').value = isoDate(rp.from); $('rpTo').value = isoDate(rp.to);
    $('rpWeeks').querySelectorAll('[data-week]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.week === week)));
    if (!quiet) renderReport();
  }
  $('rpWeeks').addEventListener('click', e => { const b = e.target.closest('[data-week]'); if (b) setReportWeek(+b.dataset.week); });
  ['rpFrom', 'rpTo'].forEach(id => $(id).addEventListener('change', () => {
    const f = fromIso($('rpFrom').value), t = fromIso($('rpTo').value);
    if (!f || !t) return;
    rp.from = Math.min(f, t); rp.to = Math.max(f, t); rp.week = null;
    $('rpWeeks').querySelectorAll('[data-week]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    renderReport();
  }));
  $('rpPaper').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openDetail(tr.dataset.id); });
  $('rpPrint').onclick = () => {
    renderReport();
    const t = document.title;
    document.title = 'Bao cao tuan ' + dmy(rp.from).replace(/\//g, '-') + ' den ' + dmy(rp.to).replace(/\//g, '-');   // tên file PDF gợi ý
    document.documentElement.classList.add('in-bao-cao');
    printPage('size: A4 landscape; margin: 12mm 10mm;');
    window.print();
    printPage('');
    document.documentElement.classList.remove('in-bao-cao');
    document.title = t;
  };

  /** Tải Excel (.xlsx) cùng bố cục với bản in. Thư viện ExcelJS chỉ tải khi bấm nút. */
  let excelLib = null;
  function loadExcel() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return excelLib || (excelLib = new Promise((ok, fail) => {
      const sc = document.createElement('script');
      sc.src = 'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js';
      sc.onload = () => ok(window.ExcelJS);
      sc.onerror = () => { excelLib = null; fail(new Error('Không tải được thư viện Excel, anh kiểm tra mạng rồi thử lại.')); };
      document.head.appendChild(sc);
    }));
  }
  $('rpExcel').onclick = () => {
    const btn = $('rpExcel'); btn.disabled = true;
    loadExcel().then(X => buildExcel(X, reportData())).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Bao cao tuan ' + dmy(rp.from).replace(/\//g, '-') + ' den ' + dmy(rp.to).replace(/\//g, '-') + '.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Đã tải file Excel', 2500, true);
    }).catch(e => toast(e.message || 'Không tạo được file Excel')).then(() => { btn.disabled = false; });
  };
  function buildExcel(X, d) {
    // Bố cục theo file mẫu anh căn chỉnh lại (28/10)
    const wb = new X.Workbook();
    const ws = wb.addWorksheet('Bao cao tuan', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
        margins: { left: 0.3937, right: 0.3937, top: 0.5118, bottom: 0.5118, header: 0.3, footer: 0.3 } }
    });
    ws.columns = REPORT_COLS.map(w => ({ width: w }));
    const F = { name: 'Times New Roman', size: 12 };
    const LINE = 15.75;
    const thin = { style: 'thin' }, box = { top: thin, left: thin, bottom: thin, right: thin };
    const put = (r, c, v, o) => { const x = ws.getCell(r, c); x.value = v; x.font = Object.assign({}, F, o && o.font); x.alignment = Object.assign({ vertical: 'middle', wrapText: true }, o && o.align); if (o && o.border) x.border = box; return x; };
    const merge = (r1, c1, r2, c2, v, o) => { if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2); return put(r1, c1, v, o); };
    const mid = { horizontal: 'center', vertical: 'middle' };
    // Số dòng chữ một ô chiếm khi in (ước lượng theo độ rộng cột) để đặt chiều cao hàng
    const lines = (text, col) => String(text || '').split('\n').reduce((n, t) => n + Math.max(1, Math.ceil(t.length / (REPORT_COLS[col - 1] * 1.05))), 0);
    merge(1, 2, 1, 5, REPORT.org[0], { align: mid });
    merge(2, 2, 2, 5, REPORT.org[1], { align: mid, font: { bold: true } });
    merge(1, 7, 1, 10, REPORT.nation[0], { align: mid, font: { bold: true } });
    merge(2, 7, 2, 10, REPORT.nation[1], { align: mid, font: { bold: true, underline: true } });
    merge(4, 1, 4, 10, REPORT.title, { align: mid, font: { bold: true, size: 13 } });
    merge(5, 1, 5, 10, '(Từ ' + dmy(rp.from) + ' đến ' + dmy(rp.to) + ')', { align: mid, font: { italic: true } });
    REPORT.summary(d).forEach((x, i) => {
      if (x[0]) put(6 + i, 5, x[0], { align: { horizontal: 'right', wrapText: false } });
      put(6 + i, 6, x[1], { align: { wrapText: false } });
    });
    [1, 2, 4, 5, 6, 7, 8, 9].forEach(r => { ws.getRow(r).height = r === 4 ? 16.5 : LINE; });
    const H = { align: mid, font: { bold: true }, border: true };
    const heads = ['TT', 'Tên chủ đầu tư, địa điểm xây dựng', null, null, null, 'Số GPXD\nNgày cấp\nQuy mô', 'Hiện trạng công trình', 'Biện pháp xử lý', 'Ghi chú', 'Đơn thư'];
    heads.forEach((h, i) => { if (h) merge(11, i + 1, 12, i + 1, h, H); });
    merge(11, 3, 11, 5, 'Cơ sở pháp lý', H);
    ['Có phép', 'Không phép', 'Sai phép'].forEach((h, i) => put(12, 3 + i, h, { align: mid, border: true }));
    for (let c = 1; c <= 10; c++) ws.getCell(11, c).border = ws.getCell(12, c).border = box;
    ws.getRow(11).height = ws.getRow(12).height = 32.1;
    ws.pageSetup.printTitlesRow = '11:12';
    let r = 13;
    d.sections.forEach(sec => {
      merge(r, 1, r, 10, sec.title, { font: { bold: true }, border: true, align: { horizontal: 'left' } });
      for (let c = 1; c <= 10; c++) ws.getCell(r, c).border = box;
      ws.getRow(r).height = LINE;
      r++;
      sec.rows.forEach(x => {
        const permit = [x.permit, x.scale].filter(Boolean).join('\n');
        const vals = [x.tt, null, 'x', '', '', permit, x.status, x.steps, x.note, ''];
        vals.forEach((v, i) => put(r, i + 1, v, { border: true, align: i === 0 || (i >= 2 && i <= 4) ? { horizontal: 'center' } : null }));
        ws.getCell(r, 2).value = { richText: [{ text: x.owners.join('\n'), font: Object.assign({ bold: true }, F) }, { text: '\n' + x.address, font: F }] };
        const n = Math.max(2, lines(x.owners.join('\n') + '\n' + x.address, 2), lines(permit, 6), lines(x.status, 7), lines(x.steps, 8), lines(x.note, 9));
        ws.getRow(r).height = (n + 1) * LINE;   // chừa thêm một dòng cho thoáng như file mẫu
        r++;
      });
    });
    r += 2;   // hai hàng trống rồi tới chữ ký, tên người ký cách 5 hàng
    const sign = [[1, 6], [7, 7], [8, 10]];
    REPORT.signers.forEach((s, i) => {
      merge(r, sign[i][0], r, sign[i][1], s.role, { align: mid, font: { bold: true } });
      if (s.name) merge(r + 6, sign[i][0], r + 6, sign[i][1], s.name, { align: mid, font: { bold: true } });
    });
    ws.getRow(r).height = ws.getRow(r + 6).height = LINE;
    return wb.xlsx.writeBuffer().then(buf => new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }

  /* ---------------- Sáng / tối ---------------- */

  $('btnTheme').onclick = () => {
    // Chuyển sáng/tối mềm (trình duyệt hỗ trợ View Transitions thì mờ dần, không thì đổi ngay)
    if (document.startViewTransition && !calm()) document.startViewTransition(applyTheme); else applyTheme();
  };
  function applyTheme() {
    const t = theme() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    store.set('theme', t);
    if (state.engine && state.engine.setBase) state.engine.setBase(state.base);
    renderMarkers();
    if (state.me && state.engine) state.engine.showMe(state.me);
  }

  /* ---------------- Hồ sơ công trình ---------------- */

  function ladder(p) {
    const steps = [
      { name: 'Lần 1', date: p.checks[0].bb || p.checks[0].tb },
      { name: 'Lần 2', date: p.checks[1].bb || p.checks[1].tb },
      { name: 'Lần 3', date: p.checks[2].bb || p.checks[2].tb }
    ];
    let nextMarked = false;
    return '<div class="ladder">' + steps.map(s => {
      const done = !!s.date;
      let cls = done ? 'done' : '';
      if (!done && !nextMarked) { cls = 'next'; nextMarked = true; }
      return '<div class="step ' + cls + '"><div class="step-name">' + s.name + '</div><div class="step-date num">' + esc(s.date || (cls === 'next' ? 'Tiếp theo' : '—')) + '</div></div>';
    }).join('') + '</div>';
  }

  /** Nguồn của hiện trạng đang hiện: lần ghi trong app, hoặc lần anh sửa file dữ liệu (bên nào mới hơn thì hiện). */
  function statusSource(p, long) {
    if (p.statusFrom !== 'sheet' && p.last && p.last.status) {
      return long
        ? 'Cập nhật tại hiện trường ' + esc(p.last.at) + ' bởi ' + esc(p.last.by) + (p.sheetStatus && p.sheetStatus !== p.last.status ? ' · trong file: ' + esc(p.sheetStatus) : '')
        : esc(p.last.by) + ' · <span class="num">' + esc(p.last.at) + '</span>';
    }
    if (p.sheetAt) return (long ? 'Cập nhật trong file dữ liệu lúc ' : 'File dữ liệu · ') + '<span class="num">' + esc(p.sheetAt) + '</span>';
    return 'Theo file dữ liệu';
  }

  function kv(label, value) {
    return value === '' || value == null ? '' : '<dt>' + label + '</dt><dd>' + value + '</dd>';
  }

  function openDetail(id) {
    const p = state.byId[id]; if (!p) return;
    const admin = state.user && state.user.role === 'admin';
    const el = $('detail');
    const src = statusSource(p, true);
    const ph = p.last && p.last.photo;
    const loc = p.loc
      ? '<div class="gps-coord num">' + fmtCoord(p.loc.lat) + ', ' + fmtCoord(p.loc.lng) + '</div>' +
        '<div class="hint">' + esc(p.loc.source) + (p.loc.acc ? ' · sai số ±' + p.loc.acc + ' m' : '') + (p.loc.at ? ' · ' + esc(p.loc.at) : '') + (p.loc.by && p.loc.by !== 'Hệ thống' ? ' · ' + esc(p.loc.by) : '') + '</div>'
      : '<div>Chưa có vị trí.</div><div class="hint">' + (p.locDeleted ? 'Đã xóa vị trí lúc ' + esc(p.locDeleted.at) + (p.locDeleted.by ? ' bởi ' + esc(p.locDeleted.by) : '') + '. ' : '') + 'Đến công trình rồi bấm Kiểm tra hiện trường để lấy vị trí GPS.</div>';
    // Sửa / xóa vị trí: chỉ quản trị, chỉ trên máy tính (bản đồ nằm cạnh hồ sơ)
    const locActs = admin && state.engine && state.engine.editStart
      ? '<div class="loc-acts"><button type="button" class="btn sm" data-locedit>' + (p.loc ? 'Sửa vị trí' : 'Đặt vị trí') + '</button>' +
        (p.loc ? '<button type="button" class="btn sm danger" data-locdel>Xóa vị trí</button>' : '') + '</div>' : '';
    el.innerHTML =
      '<div class="sheet-head"><button type="button" class="icon-btn" data-close aria-label="Đóng hồ sơ"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<span class="crumb">Hồ sơ công trình · <span class="num">' + esc(p.id) + '</span></span></div>' +
      '<div class="sheet-body">' +
        '<h2 class="d-title" id="dTitle">' + esc(p.owner || '—') + '</h2>' +
        '<div class="d-addr">' + esc(p.address) + '</div>' +
        '<div class="d-tags"><span class="pill ' + p.group + '">' + esc(p.status || GROUP[p.group].label) + '</span>' + (p.area ? '<span class="pill" title="' + esc(areaName(p.area)) + '">Khu ' + p.area + '</span>' : '') + '<span class="pill num">' + esc(p.id) + '</span></div>' +
        '<div class="d-actions"><button type="button" class="btn primary big" data-inspect>' + ICON.cam + 'Chụp ảnh và kiểm tra</button>' +
          '<a class="btn big" href="' + dirUrl(p) + '" target="_blank" rel="noopener">' + ICON.dir + 'Chỉ đường</a>' +
          (p.phone ? '<a class="btn big" href="tel:' + esc(p.phone.split(/\s|\n/)[0].replace(/[^\d+]/g, '')) + '">Gọi chủ đầu tư</a>' : '<span></span>') + '</div>' +
        '<div class="d-print"><button type="button" class="btn" data-cover>' + ICON.print + 'In bìa hồ sơ</button><button type="button" class="btn" data-bbkt>' + ICON.print + 'In BBKT</button></div>' +
        '<div class="card"><div class="card-head"><h2>Hiện trạng</h2><button type="button" class="btn small status-edit" data-status>' + ICON.status + 'Cập nhật</button></div>' + (ph ? '<div class="st-row"><button type="button" class="st-thumb" aria-label="Xem ảnh gần nhất cỡ lớn"><span class="zoom" aria-hidden="true">' + ICON.expand + '</span></button><div>' : '') +
          '<div class="status-now">' + esc(p.status || '—') + '</div><div class="status-src">' + src + '</div>' +
          (ph ? '<div class="status-src">Ảnh gần nhất ' + esc(ph.at) + '. Bấm vào ảnh để xem lớn.</div></div></div>' : '') + '</div>' +
        '<div class="card"><div class="card-head"><h2>Vị trí</h2>' + locActs + '</div>' + loc + '</div>' +
        '<div class="card"><h2>Biên bản kiểm tra</h2>' + ladder(p) + '</div>' +
        '<div class="card"><h2>Giấy phép và quy mô</h2><dl class="kv">' +
          kv('Số GPXD', esc(p.gpxd) + (p.gpxdDate ? ' ngày ' + esc(p.gpxdDate) : '')) +
          kv('Quy mô', esc(p.scale)) +
          kv('DTXD', p.dtxd !== '' ? '<span class="num">' + esc(p.dtxd) + '</span> m²' : '') +
          kv('DTS', p.dts !== '' ? '<span class="num">' + esc(p.dts) + '</span> m²' : '') +
          kv('Chiều cao', p.height !== '' ? '<span class="num">' + esc(p.height) + '</span> m' : '') +
          kv('TB khởi công', '<span class="num">' + esc(p.tbkc || '—') + '</span>') +
          kv('Ngày thi công', '<span class="num">' + esc(p.start || '—') + '</span>') +
          kv('Địa bàn', esc(p.diaBan)) +
          kv('Điện thoại', p.phone ? p.phone.split(/\n/).map(n => '<a href="tel:' + esc(n.replace(/[^\d+]/g, '')) + '">' + esc(n.trim()) + '</a>').join('<br>') : '') +
          (admin ? kv('Thường trú', esc(p.ownerAddress)) : '') +
          kv('Ghi chú', esc(p.note)) +
        '</dl></div>' +
        '<div class="card"><h2>Lịch sử kiểm tra hiện trường</h2><div id="histBox"><div class="hint">Đang tải…</div></div></div>' +
      '</div>';
    if (!isOpen(el)) openPanel(el);
    el.querySelector('.sheet-body').scrollTop = 0;
    el.querySelector('[data-close]').onclick = closeDetail;
    el.querySelector('[data-inspect]').onclick = () => openInspect(p.id, { camera: true });
    el.querySelector('.status-edit').onclick = () => openStatus(p.id);
    el.querySelector('[data-cover]').onclick = () => openCover(p.id);
    el.querySelector('[data-bbkt]').onclick = () => openCover(p.id, 'bbkt');
    const le = el.querySelector('[data-locedit]'), ld = el.querySelector('[data-locdel]');
    if (le) le.onclick = () => openLocEdit(p.id);
    if (ld) ld.onclick = () => askDeleteLoc(p.id);
    if (ph) {
      const b = el.querySelector('.st-thumb');
      fillThumb(b, ph.id, 300, () => state.selected === p.id);
      b.onclick = () => openPhoto(ph.id, b.dataset.src);
    }
    loadHistory(p.id);
  }
  function closeDetail() { closeLocEdit(); closePanel($('detail')); }

  /* ---------- Sửa / xóa vị trí công trình (quản trị, máy tính) ---------- */
  let locEd = null;
  /** Đọc tọa độ dán vào: "21.008382, 105.864627" (Google Maps), "21,008382 105,864627"; nhập ngược thì tự đổi lại. */
  function parseCoord(text) {
    const n = (String(text).match(/-?\d+(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(',', '.')));
    if (n.length !== 2) return null;
    let [lat, lng] = n;
    if (lat > 100 && lng < 30) [lat, lng] = [lng, lat];
    return lat >= 20.5 && lat <= 21.5 && lng >= 105.3 && lng <= 106.3 ? { lat, lng } : null;
  }
  function openLocEdit(id) {
    const p = state.byId[id];
    if (!p || !state.engine || !state.engine.editStart) return;
    hidePop();
    const old = p.loc ? { lat: p.loc.lat, lng: p.loc.lng } : null;
    const start = old || state.engine.center();
    locEd = { id, old, lat: start.lat, lng: start.lng, busy: false };
    const el = $('locEdit');
    el.innerHTML =
      '<div class="le-head">' + PIN_SVG.replace('width="34" height="44"', 'width="16" height="21"') +
        '<div><b>Sửa vị trí · ' + esc(p.owner || '—') + ' · <span class="num">' + esc(p.id) + '</span></b>' +
        '<span>Kéo marker hoặc bấm vào bản đồ để đặt vị trí mới. Có thể dán tọa độ copy từ Google Maps.</span></div></div>' +
      '<div class="le-bar"><label class="le-input"><span>Tọa độ</span><input id="leCoord" class="num" aria-label="Tọa độ mới" autocomplete="off" spellcheck="false"><span id="leDist" class="num"></span></label>' +
        '<button type="button" class="btn" id="leCancel">Hủy</button><button type="button" class="btn primary" id="leSave">Lưu vị trí</button></div>';
    el.hidden = false;
    $('panelMap').classList.add('loc-editing');
    state.engine.editStart(start, old, ll => setLocEd(ll.lat, ll.lng, true));
    state.engine.focus(start.lat, start.lng, 18);
    setLocEd(start.lat, start.lng, true);
    $('leCoord').oninput = e => {
      const c = parseCoord(e.target.value);
      e.target.classList.toggle('bad', !c && e.target.value.trim() !== '');
      if (c) { setLocEd(c.lat, c.lng, false); state.engine.editMove(c.lat, c.lng); state.engine.focus(c.lat, c.lng); }
      else $('leSave').disabled = true;
    };
    $('leCoord').onkeydown = e => { if (e.key === 'Enter' && !$('leSave').disabled) saveLocEdit(); };
    $('leCancel').onclick = closeLocEdit;
    $('leSave').onclick = saveLocEdit;
    back.sync();
  }
  function setLocEd(lat, lng, fromMap) {
    if (!locEd) return;
    locEd.lat = lat; locEd.lng = lng;
    if (fromMap) { $('leCoord').value = fmtCoord(lat) + ', ' + fmtCoord(lng); $('leCoord').classList.remove('bad'); }
    const d = locEd.old ? meters(locEd.old, { lat, lng }) : null;
    $('leDist').textContent = d == null ? 'chưa có vị trí cũ' : 'cách vị trí cũ ' + fmtDist(d);
    $('leSave').disabled = locEd.busy || (d != null && d < 0.5);
  }
  function closeLocEdit() {
    if (!locEd || locEd.busy) return;
    locEd = null;
    if (state.engine && state.engine.editStop) state.engine.editStop();
    $('locEdit').hidden = true; $('locEdit').innerHTML = '';
    $('panelMap').classList.remove('loc-editing');
    back.sync();
  }
  function saveLocEdit() {
    if (!locEd || locEd.busy) return;
    const p = state.byId[locEd.id], btn = $('leSave');
    locEd.busy = true; btn.disabled = true; btn.textContent = 'Đang lưu…';
    call('apiSetLocation', { id: p.id, lat: locEd.lat, lng: locEd.lng })
      .then(res => {
        p.loc = { lat: res.lat, lng: res.lng, acc: null, source: 'Đặt tay trên máy tính', by: state.user.name, at: res.at };
        p.locDeleted = null;
        locEd.busy = false; closeLocEdit();
        refresh();
        if (isOpen($('detail'))) openDetail(p.id);
        toast('Đã lưu vị trí mới', 3000, true);
      })
      .catch(err => {
        if (!locEd) return;
        locEd.busy = false; btn.disabled = false; btn.textContent = 'Thử lại';
        toast('Chưa lưu được: ' + (err && err.message || err), 5000);
      });
  }
  /** Hỏi lại trước khi xóa vị trí (dùng chung bảng nổi với cập nhật hiện trạng). */
  function askDeleteLoc(id) {
    const p = state.byId[id]; if (!p) return;
    closeLocEdit();
    stFor = { busy: false };
    const el = $('stSheet');
    el.innerHTML = '<span class="grab" aria-hidden="true"></span>' +
      '<div class="st-head"><div><b id="stTitle">Xóa vị trí công trình?</b><span>' + esc(p.id + ' · ' + p.owner + ' · ' + p.address) + '</span></div>' +
      '<button type="button" class="icon-btn" data-close aria-label="Đóng">' + ICON.close + '</button></div>' +
      '<p class="cf-body">Marker biến khỏi bản đồ, công trình chuyển sang nhóm <b>Chưa có vị trí</b>.</p>' +
      '<p class="cf-hint">Hồ sơ, ảnh và lịch sử kiểm tra vẫn giữ nguyên. Tọa độ đang có trong file dữ liệu (nếu có) cũng bị bỏ qua, trừ khi sau này anh nhập số khác vào file. Lần sau cán bộ chụp ảnh tại công trình và chọn cập nhật vị trí thì vị trí GPS mới được ghi lại.</p>' +
      '<div class="cf-acts"><button type="button" class="btn" data-close>Hủy</button><button type="button" class="btn danger-fill" id="cfOk">Xóa vị trí</button></div>';
    $('scrim').hidden = false; openPanel(el);
    el.querySelectorAll('[data-close]').forEach(b => b.onclick = closeStatus);
    const ok = $('cfOk');
    ok.onclick = () => {
      if (stFor.busy) return;
      stFor.busy = true; ok.disabled = true; ok.textContent = 'Đang xóa…';
      call('apiDeleteLocation', { id: p.id })
        .then(res => {
          p.loc = null; p.locDeleted = { by: state.user.name, at: res.at };
          stFor.busy = false; closeStatus();
          if ($('mpop').dataset.id === p.id) hidePop();
          refresh();
          if (isOpen($('detail'))) openDetail(p.id);
          toast('Đã xóa vị trí. Công trình chuyển sang Chưa có vị trí.', 3500, true);
        })
        .catch(err => {
          stFor.busy = false; ok.disabled = false; ok.textContent = 'Thử lại';
          toast('Chưa xóa được: ' + (err && err.message || err), 5000);
        });
    };
  }

  /* ---------- In bìa hồ sơ (mẫu "Bìa hồ sơ 2026", trước là trộn thư Word) ----------
     Tự điền từ dữ liệu công trình; bấm vào chữ để sửa tay trước khi in, chỉ sửa trên bản in. */
  const KV_OF = { I: 'KV-1', II: 'KV-2', III: 'KV-3' };
  function fmtArea(v) {   // 64.9 → 64,90 (như định dạng 0,00 của mẫu Word)
    if (v === '' || v == null) return '';
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return isFinite(n) && String(v).trim() !== '' ? n.toFixed(2).replace('.', ',') : String(v);
  }
  function coverHtml(p) {
    const ed = 'contenteditable="true" spellcheck="false"';
    const val = v => v !== '' && v != null ? esc(String(v)) : '';
    const fld = v => '<b ' + ed + (val(v) ? '>' + val(v) : ' class="empty">……') + '</b>';
    const owners = String(p.owner || '').split(' – ').filter(Boolean);
    const year = p.year || ((String(p.tbkc || '').match(/(\d{4})$/) || [])[1] || '');
    const stt = String(p.stt == null ? '' : p.stt);
    return '<div class="cv-frame">' +
      '<div class="cv-top"><span class="cv-kv" ' + ed + '>' + esc(KV_OF[p.area] || '') + '</span>' +
        '<span class="cv-year" ' + ed + '>' + esc(String(year)) + '</span>' +
        '<span class="cv-no' + (stt.length >= 3 ? ' long' : '') + '" ' + ed + '>' + esc(stt) + '</span></div>' +
      '<div class="cv-title">HỒ SƠ XÂY DỰNG</div>' +
      '<div class="cv-lines">' +
        '<div class="cv-row"><span>1 – Chủ đầu tư:&nbsp;</span><b class="cv-owners" ' + ed + '>' + (owners.length ? owners.map(n => '<span>' + esc(n.toLocaleUpperCase('vi')) + '</span>').join('') : '<span class="empty">……</span>') + '</b></div>' +
        '<div class="cv-row"><span>2 – Địa chỉ:&nbsp;</span>' + fld(p.address) + '</div>' +
        '<p>3 – Điện thoại: ' + fld(String(p.phone || '').split(/\n/).map(x => x.trim()).filter(Boolean).join(' – ')) + '</p>' +
        '<p>4 – GPXD số: ' + fld(p.gpxd) + ' ngày: ' + fld(p.gpxdDate) + '</p>' +
        '<p>5 – DTXD tầng 1: ' + fld(fmtArea(p.dtxd)) + ' <b>m<sup>2</sup></b></p>' +
        '<p>6 – Tổng DT sàn XD mới: ' + fld(fmtArea(p.dts)) + ' <b>m<sup>2</sup></b></p>' +
        '<div class="cv-row"><span>7 – Quy mô:&nbsp;</span>' + fld(p.scale) + '</div>' +
        '<p>8 – Chiều cao công trình: ' + fld(fmtArea(p.height)) + ' <b>m</b></p>' +
      '</div></div>';
  }
  function fitCover() {
    const el = $('printDoc');
    if (el.hidden) return;
    const box = el.querySelector('.pd-scroll');
    el.querySelectorAll('.pd-paper').forEach(paper => {
      const pw = paper.offsetWidth, ph = paper.offsetHeight, gap = paper.nextElementSibling ? 18 : 0;
      const k = Math.min(1, (box.clientWidth - 32) / pw);
      paper.style.transform = k < 1 ? 'scale(' + k + ')' : '';
      paper.style.marginBottom = (k < 1 ? -(ph * (1 - k)) : 0) + gap + 'px';
      paper.style.marginLeft = k < 1 ? '0' : '';
    });
  }

  /* ---------- In biên bản kiểm tra (mẫu "BBKT phòng HTĐTNT lần 1", 2 trang A4) ----------
     Trang 2 luôn bắt đầu bằng "Hiện trạng kiểm tra" (anh dặn): mỗi trang là một tờ A4 riêng. */
  function bbktPages(p) {
    const ed = 'contenteditable="true" spellcheck="false"';
    const fld = v => '<span ' + ed + (v !== '' && v != null ? '>' + esc(String(v)) : ' class="empty">……') + '</span>';
    // Lấy đúng cột Ông / cột Bà trong Data; tên công ty thì không thêm danh xưng
    const pre = (t, n) => n ? (/^(công ty|cty)/i.test(n) ? n : t + ' ' + n) : '';
    const cdt = p.ong != null || p.ba != null
      ? [pre('Ông', p.ong), pre('Bà', p.ba)].filter(Boolean).join(' và ')
      : String(p.owner || '').split(' – ').filter(Boolean).join(' và ');   // máy chủ chưa cập nhật .gs mới
    const addr = String(p.address || '').trim();
    const place = addr ? addr.replace(/[.,\s]+$/, '') + (/vĩnh tuy/i.test(addr) ? '' : ', phường Vĩnh Tuy') + ', TP Hà Nội.' : '';
    const year = String(new Date().getFullYear());
    const mem = (n, cv) => '<div class="bmem"><span class="bm1" ' + ed + '>' + n + '</span><span ' + ed + '>' + cv + '</span></div>';
    const blank = n => '<div class="bmem"><span class="bm1 dotline" ' + ed + '>' + n + '. Ông (bà)</span><span class="dotline" ' + ed + '>Chức vụ:</span></div>';
    const line = (label, full) => '<div class="bl' + (full ? ' full' : '') + '">' + (label ? '<span>' + label + '</span>' : '') + '<span class="fill" ' + ed + '></span></div>';
    const cv = 'Chức vụ: Chuyên viên phòng HT-ĐT&amp;MT';
    const p1 =
      '<div class="bhd"><div><div>UBND PHƯỜNG VĨNH TUY</div><div class="b">PHÒNG HẠ TẦNG - ĐÔ THỊ VÀ MÔI TRƯỜNG</div><i class="rule" style="width:40%"></i></div>' +
        '<div><div class="b">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div><div class="b big">Độc lập - Tự do - Hạnh phúc</div><i class="rule" style="width:60%"></i></div></div>' +
      '<div class="bdate" ' + ed + '>Vĩnh Tuy, ngày&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; tháng&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; năm ' + year + '</div>' +
      '<div class="btitle">BIÊN BẢN<br>Kiểm tra hoạt động xây dựng</div>' +
      '<p ' + ed + '>Hôm nay, hồi…..giờ…….ngày……tháng……năm ' + year + '</p>' +
      '<p ' + ed + '>Tổ kiểm tra do Ông: Vũ Huy Khiêm</p>' +
      '<p ' + ed + '>Chức vụ: Phó Trưởng phòng Hạ tầng - Đô thị và Môi trường phường.</p>' +
      '<p>Tại địa điểm: ' + fld(place) + '</p>' +
      '<p class="b">I/ Thành phần đoàn kiểm tra:</p>' +
      mem('1. Ông Đoàn Hoàng Dương', cv) + mem('2. Ông Nguyễn Bá Cường', cv) + mem('3. Ông Ngô Quốc Trung', cv) +
      blank(4) + blank(5) + blank(6) +
      '<p class="b">II/ Chủ đầu tư công trình xây dựng:</p>' +
      '<p class="j">Chủ đầu tư: ' + fld(cdt) + '</p>' +
      line('Người đại diện:') + line('Địa chỉ:') +
      '<p class="b">III/ Nhà thầu xây dựng:</p>' +
      line('Người đại diện:') + line('Địa chỉ:') +
      '<p class="j">Sau khi xem xét hồ sơ và kiểm tra thực tế tại thực địa. Tổ kiểm tra tiến hành lập biên bản làm việc kiểm tra hoạt động xây dựng như sau:</p>' +
      '<p class="j">Chủ đầu tư xây dựng công trình được cấp GPXD số: ' + fld(p.gpxd) + ' ngày ' + fld(p.gpxdDate) + ' do <span ' + ed + '>UBND phường Vĩnh Tuy</span> cấp.</p>' +
      '<p class="j">Quy mô: ' + fld(p.scale) + '.</p>' +
      '<p class="j">- Diện tích xây dựng tầng 1: ' + fld(fmtArea(p.dtxd)) + 'm<sup>2</sup></p>' +
      '<p class="j">- Tổng diện tích sàn xây dựng mới: ' + fld(fmtArea(p.dts)) + 'm<sup>2</sup></p>' +
      '<p class="j">- Chiều cao đến đỉnh mái: ' + fld(fmtArea(p.height)) + 'm</p>' +
      '<div class="pno">1</div>';
    const p2 =
      line('Hiện trạng kiểm tra:') + line('', true) + line('', true) + line('', true) + line('', true) + line('', true) +
      '<p class="j">Yêu cầu chủ đầu tư phải xây dựng theo đúng nội dung GPXD được phê duyệt. Trong quá trình thi công công trình phải đảm bảo an toàn lao động, vệ sinh môi trường và đảm bảo an toàn phòng cháy chữa cháy theo quy định. Nếu chủ đầu tư không thực hiện sẽ bị xử lý theo đúng quy định của pháp luật.</p>' +
      '<p class="j">Giao các cán bộ, công chức được phân công quản lý trật tự xây dựng đô thị phường thường xuyên giám sát, kiểm tra, đôn đốc chủ đầu tư phải xây dựng công trình đúng theo GPXD được phê duyệt.</p>' +
      '<p ' + ed + '>Biên bản kết thúc hồi……….cùng ngày và các thành viên thống nhất ký tên sau.</p>' +
      '<div class="bsign"><div class="b">CHỦ ĐẦU TƯ XÂY DỰNG<br>CÔNG TRÌNH</div><div class="b">NGƯỜI LẬP BIÊN BẢN</div></div>' +
      '<div class="bchair"><div class="b">CHỦ TRÌ TỔ KIỂM TRA</div><div class="b bname" ' + ed + '>Vũ Huy Khiêm</div></div>' +
      '<div class="bmembers">CÁC THÀNH VIÊN TỔ KIỂM TRA:' +
        [1, 2, 3, 4, 5].map(i => '<div class="bl"><span>' + i + '</span><span class="fill"></span></div>').join('') + '</div>' +
      '<div class="pno">2</div>';
    return [p1, p2];
  }
  /** Trang 1 luôn vừa một tờ: nội dung dài (địa chỉ, quy mô, 2 chủ đầu tư) thì thu khoảng cách giữa các đoạn, hết khoảng cách mới thu cỡ chữ. */
  function fitBbkt() {
    const p = $('printDoc').querySelector('.pd-paper.bbp');
    if (!p || !p.getClientRects().length) return;
    const t = p.style.transform; p.style.transform = 'none';
    const fits = () => {
      const kids = [...p.children].filter(e => !e.classList.contains('pno'));
      return kids[kids.length - 1].getBoundingClientRect().bottom <= p.getBoundingClientRect().bottom - parseFloat(getComputedStyle(p).paddingBottom) + 0.5;
    };
    p.style.removeProperty('--bb-gap'); p.style.fontSize = ''; p.style.lineHeight = '';
    for (let g = 3; g >= 0 && !fits(); g -= 0.25) p.style.setProperty('--bb-gap', g + 'pt');
    for (let f = 13.5; f >= 12 && !fits(); f -= 0.5) { p.style.fontSize = f + 'pt'; p.style.lineHeight = (f + 4) + 'pt'; }
    p.style.transform = t;
  }
  /** Khổ giấy cho bản in đang mở ('' = bỏ). Không dùng trang tên @page x { } vì Chrome in thừa 1 trang trắng đầu. */
  function printPage(css) {
    let el = document.getElementById('printPage');
    if (!el) { el = document.createElement('style'); el.id = 'printPage'; document.head.appendChild(el); }
    el.textContent = css ? '@page { ' + css + ' }' : '';
  }
  /** Mở bản xem trước để in: kind = 'cover' (bìa hồ sơ) hoặc 'bbkt' (biên bản kiểm tra). */
  function openCover(id, kind) {
    const p = state.byId[id];
    if (!p) return;
    const bb = kind === 'bbkt';
    const el = $('printDoc');
    el.setAttribute('aria-label', bb ? 'In biên bản kiểm tra' : 'In bìa hồ sơ');
    el.innerHTML =
      '<div class="pd-bar"><button type="button" class="icon-btn" data-close aria-label="Đóng"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<span class="pd-title">' + (bb ? 'Biên bản kiểm tra' : 'Bìa hồ sơ') + ' · <span class="num">' + esc(p.id) + '</span></span>' +
        '<span class="hint">Bấm vào chữ để sửa trước khi in</span>' +
        '<button type="button" class="btn primary" data-print>' + ICON.print + 'In</button></div>' +
      '<div class="pd-scroll">' + (bb
        ? bbktPages(p).map(h => '<div class="pd-paper bbp">' + h + '</div>').join('')
        : '<div class="pd-paper">' + coverHtml(p) + '</div>') + '</div>';
    el.hidden = false;
    document.documentElement.classList.add('in-ho-so');
    printPage('size: A4 portrait; margin: 0;');
    el.querySelector('[data-close]').onclick = closeCover;
    el.querySelector('[data-print]').onclick = () => {
      const t = document.title;
      document.title = (bb ? 'BBKT ' : 'Bia ho so ') + p.id;   // tên file PDF gợi ý
      const go = () => { window.print(); setTimeout(() => { document.title = t; }, 1000); };
      document.fonts && document.fonts.ready ? document.fonts.ready.then(go) : go();
    };
    if (bb) {
      fitBbkt();
      el.querySelector('.pd-paper').addEventListener('input', fitBbkt);
      document.fonts && document.fonts.ready.then(fitBbkt);
    }
    fitCover();
    back.sync();
  }
  function closeCover() {
    const el = $('printDoc');
    el.hidden = true; el.innerHTML = '';
    document.documentElement.classList.remove('in-ho-so');
    printPage('');
    back.sync();
  }
  window.addEventListener('resize', fitCover);

  function loadHistory(id) {
    call('apiGetHistory', id).then(items => {
      const box = $('histBox'); if (!box || state.selected !== id) return;
      if (!items.length) { box.innerHTML = '<div class="hint">Chưa có lần kiểm tra nào qua app.</div>'; return; }
      box.innerHTML = '<ul class="hist">' + items.map((h, i) =>
        '<li><div class="hist-top"><b>' + esc(h.status || 'Không ghi hiện trạng') + '</b><span class="hist-who num">' + esc(h.at) + '</span></div>' +
        '<div class="hist-who">' + esc(h.by) + (h.movedPin ? ' · đã cập nhật vị trí' : '') + (h.acc ? ' · GPS ±' + h.acc + ' m' : '') + '</div>' +
        (h.note ? '<div class="hist-note">' + esc(h.note) + '</div>' : '') +
        (h.photoIds.length ? '<div class="thumbs" data-photos="' + esc(h.photoIds.join(',')) + '" id="ph' + i + '"></div><button type="button" class="textbtn" data-load="ph' + i + '">Xem ' + h.photoIds.length + ' ảnh</button>' +
          (h.folderUrl ? ' · <a class="textbtn" href="' + esc(h.folderUrl) + '" target="_blank" rel="noopener">Thư mục ảnh</a>' : '') : '') +
        '</li>').join('') + '</ul>';
      box.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { b.remove(); loadPhotos($(b.dataset.load)); });
    }).catch(err => {
      const box = $('histBox'); if (box) box.innerHTML = '<div class="hint">Không tải được lịch sử. ' + esc(err && err.message || err) + '</div>';
    });
  }

  function loadPhotos(holder) {
    const ids = holder.dataset.photos.split(',');
    holder.innerHTML = ids.map(() => '<span class="thumb" aria-hidden="true"></span>').join('');
    ids.forEach((fid, i) => {
      call('apiGetPhoto', fid).then(url => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'thumb'; b.setAttribute('aria-label', 'Phóng to ảnh ' + (i + 1));
        b.innerHTML = '<img alt="Ảnh hiện trường ' + (i + 1) + '" src="' + url + '">';
        b.onclick = () => openViewer(url);
        holder.children[i].replaceWith(b);
      }).catch(() => { holder.children[i].textContent = '!'; });
    });
  }

  function openViewer(url) {
    const v = $('viewer');
    v.innerHTML = '<img alt="Ảnh hiện trường" src="' + url + '"><button type="button" class="icon-btn solid close" aria-label="Đóng">✕</button>';
    v.hidden = false;
    v.onclick = closeViewer;
    back.sync();
  }
  function closeViewer() { const v = $('viewer'); v.hidden = true; v.innerHTML = ''; v._want = null; back.sync(); }

  /* ---------------- Ảnh gần nhất: ảnh thu nhỏ và popup trên máy tính ---------------- */

  // Ảnh thu nhỏ đã tải (theo file và cỡ), dùng lại khi mở lại thẻ / popup
  const thumbCache = {};
  function thumb(fid, size) {
    const k = fid + '@' + size;
    return thumbCache[k] || (thumbCache[k] = call('apiGetThumb', { id: fid, size }).catch(e => { delete thumbCache[k]; throw e; }));
  }
  /** Ảnh vừa chụp trên máy này: dùng luôn bản đã nén, không phải tải lại từ máy chủ. */
  function seedThumb(fid, dataUrl) { [300, 800].forEach(s => { thumbCache[fid + '@' + s] = Promise.resolve(dataUrl); }); }
  /** Đặt ảnh thu nhỏ làm nền ô (cắt giữa, vừa mọi tỷ lệ ảnh). still(): ô vẫn còn đúng công trình. */
  function fillThumb(box, fid, size, still) {
    box.classList.add('loading');
    thumb(fid, size).then(url => {
      if (!still() || !box.isConnected) return;
      box.style.backgroundImage = 'url("' + url + '")';
      box.dataset.src = url;
      box.classList.remove('loading');
    }).catch(() => { box.classList.remove('loading'); box.classList.add('failed'); });
  }
  /** Mở ảnh lớn: hiện ngay bản thu nhỏ (nếu có), rồi thay bằng ảnh gốc khi tải xong. */
  function openPhoto(fid, preview) {
    openViewer(preview || '');
    const v = $('viewer'); v._want = fid;
    if (!preview) v.querySelector('img').classList.add('loading');
    call('apiGetPhoto', fid).then(url => {
      if (v.hidden || v._want !== fid) return;
      const img = v.querySelector('img'); img.src = url; img.classList.remove('loading');
    }).catch(() => { if (!v.hidden && v._want === fid) toast('Không tải được ảnh gốc.'); });
  }

  /** Lệch của marker so với tâm bản đồ để marker nằm giữa cửa sổ; màn hình hẹp thì dịch trái để popup (rộng ~540 px) không tràn. */
  function popOffset() {
    const r = $('map').getBoundingClientRect();
    const x = Math.max(40, Math.min(window.innerWidth / 2 - r.left, r.width - 560));
    const y = Math.max(170, Math.min(window.innerHeight / 2 - r.top, r.height - 170));
    return { x: Math.round(r.width / 2 - x), y: Math.round(r.height / 2 - y) };
  }
  function showPop(p) {
    const el = $('mpop'), ph = p.last && p.last.photo;
    const checks = (p.checks || []).map((c, i) => (c.bb || c.tb) ? 'Lần ' + (i + 1) + ' ' + (c.bb || c.tb) : '').filter(Boolean);
    const row = (k, v) => v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : '';
    el.innerHTML = '<span class="mpop-arrow" aria-hidden="true"></span>' +
      '<div class="mpop-info">' +
        '<div class="mpop-owner" id="mpopTitle">' + esc(p.owner || '—') + '</div>' +
        '<div class="mpop-addr">' + esc(p.address) + '</div>' +
        '<div class="d-tags">' + (p.area ? '<span class="pill">Khu ' + p.area + '</span>' : '') + '<span class="pill num">' + esc(p.id) + '</span></div>' +
        '<div class="mpop-st"><div class="mpop-sthead"><span class="mpop-l">Hiện trạng</span><button type="button" class="mpop-upd">Cập nhật</button></div><b>' + dot(p.group) + esc(p.status || GROUP[p.group].label) + '</b>' +
          '<span class="mpop-l">' + statusSource(p, false) + '</span></div>' +
        '<dl class="mpop-kv">' +
          row('Biên bản', checks.length ? '<span class="num">' + esc(checks[checks.length - 1]) + '</span>' : 'Chưa kiểm tra') +
          row('Số GPXD', esc(p.gpxd) + (p.gpxdDate ? ' <span class="num">' + esc(p.gpxdDate) + '</span>' : '')) +
          row('Quy mô', esc(p.scale)) +
          row('Ngày thi công', '<span class="num">' + esc(p.start || '—') + '</span>') +
        '</dl>' +
        '<button type="button" class="btn small mpop-more">Mở hồ sơ đầy đủ</button>' +
      '</div>' +
      (ph ? '<button type="button" class="mpop-photo loading" aria-label="Xem ảnh gần nhất cỡ lớn"><span class="mpop-badge num">' + esc(ph.at.slice(0, 5)) + (ph.n > 1 ? ' · ' + ph.n + ' ảnh' : '') + '</span></button>' : '') +
      '<button type="button" class="mpop-x" aria-label="Đóng">' + ICON.close + '</button>';
    el.classList.toggle('has-photo', !!ph);
    el.dataset.id = p.id;
    el.hidden = false;
    $('panelMap').classList.add('pop-open');
    placePop();
    if (!calm()) gsap.fromTo(el, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.28, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
    el.querySelector('.mpop-x').onclick = hidePop;
    el.querySelector('.mpop-upd').onclick = () => openStatus(p.id);
    el.querySelector('.mpop-more').onclick = () => { hidePop(); openDetail(p.id); };
    if (!ph) return;
    const box = el.querySelector('.mpop-photo');
    box.onclick = () => openPhoto(ph.id, box.dataset.src);
    thumb(ph.id, 800).then(url => {
      if (el.dataset.id !== p.id || !box.isConnected) return;
      const img = new Image();
      img.alt = 'Ảnh hiện trường gần nhất';
      img.onload = () => {
        if (!box.isConnected) return;
        // Khung cao cố định, rộng theo đúng tỷ lệ ảnh: 3:4 rộng 225, 9:16 rộng 169; ảnh ngang tối đa 300 và hiện trọn
        const w = Math.round(box.clientHeight * img.naturalWidth / img.naturalHeight);
        box.style.width = Math.max(150, Math.min(300, w)) + 'px';
        box.prepend(img); box.dataset.src = url; box.classList.remove('loading');
        placePop();
      };
      img.src = url;
    }).catch(() => { box.classList.remove('loading'); box.classList.add('failed'); });
  }
  function hidePop() { const el = $('mpop'); if (el.hidden) return; el.hidden = true; el.innerHTML = ''; el.dataset.id = ''; $('panelMap').classList.remove('pop-open'); }
  /** Đặt popup bên phải marker, mũi tên chỉ vào marker và cách viền marker một khoảng nhỏ. */
  function placePop() {
    const el = $('mpop'); if (el.hidden) return;
    const p = state.byId[el.dataset.id];
    if (!p || !p.loc || !state.engine || !state.engine.point) { hidePop(); return; }
    const pt = state.engine.point(p.loc), r = state.engine.rad ? state.engine.rad(p) : 12;
    el.style.left = Math.round(pt.x + r + 2 + 7 + 7) + 'px';   // bán kính + nửa viền + khoảng hở 7 px + mũi tên 7 px
    el.style.top = Math.round(pt.y - el.offsetHeight / 2) + 'px';
  }

  /* ---------------- Kiểm tra hiện trường ---------------- */

  let insp = null;

  function openInspect(id, opts) {
    const p = state.byId[id]; if (!p) return;
    if (insp && insp.busy) return;
    if (insp) insp.files.forEach(f => URL.revokeObjectURL(f.url));
    insp = { id, pos: null, files: [], uploaded: {}, busy: false };
    const defaultMove = !p.loc;
    const el = $('inspect');
    el.innerHTML =
      '<div class="sheet-head"><button type="button" class="icon-btn" data-close aria-label="Đóng"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
      '<span class="crumb">Kiểm tra hiện trường · <span class="num">' + esc(p.id) + '</span></span></div>' +
      '<div class="sheet-body">' +
        '<h2 class="d-title" id="iTitle">' + esc(p.owner) + '</h2><div class="d-addr">' + esc(p.address) + '</div>' +

        '<div class="card"><h2>Ảnh hiện trường</h2>' +
          '<div class="row2"><button type="button" class="btn primary big" id="btnCam">' + ICON.cam + 'Chụp ảnh</button><button type="button" class="btn big" id="btnLib">Chọn từ máy</button></div>' +
          '<input type="file" id="fCam" accept="image/*" capture="environment" multiple hidden>' +
          '<input type="file" id="fLib" accept="image/*" multiple hidden>' +
          '<div class="thumbs" id="iThumbs"></div>' +
          '<label class="check"><input type="checkbox" id="chkStamp" checked><span>Đóng dấu ngày giờ và tọa độ lên ảnh</span></label>' +
          '<div class="hint">Ảnh được thu nhỏ còn khoảng 1600 px trước khi tải lên để tiết kiệm dung lượng.</div>' +
        '</div>' +

        '<div class="card"><h2>Vị trí GPS</h2>' +
          '<div id="gpsBox"><div class="hint">' + (p.loc ? 'Đang lưu: ' + fmtCoord(p.loc.lat) + ', ' + fmtCoord(p.loc.lng) + ' (' + esc(p.loc.source) + ')' : 'Công trình chưa có vị trí.') + '</div></div>' +
          '<div class="row2" style="margin-top:12px"><button type="button" class="btn" id="btnGps">Lấy vị trí hiện tại</button></div>' +
          '<label class="check"><input type="checkbox" id="chkMove"' + (defaultMove ? ' checked' : '') + '><span>Dùng vị trí này làm vị trí công trình' + (p.loc ? ' (thay vị trí đang lưu)' : '') + '</span></label>' +
        '</div>' +

        '<div class="card"><div class="field"><label for="iStatus">Hiện trạng thi công</label>' +
          '<input class="input" id="iStatus" list="statusList" value="' + esc(p.status) + '" autocomplete="off" spellcheck="false"></div>' +
          '<div class="field"><label for="iNote">Ghi chú</label><textarea class="input" id="iNote" spellcheck="false" placeholder="Ví dụ: đang đổ bê tông sàn T3, có che chắn"></textarea></div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot"><div class="progress" id="iProg" hidden></div><button type="button" class="btn primary big block" id="btnSave">Lưu kiểm tra</button></div>';
    openPanel(el);
    el.querySelector('[data-close]').onclick = closeInspect;
    $('btnGps').onclick = takeGps;
    $('btnCam').onclick = () => $('fCam').click();
    $('btnLib').onclick = () => $('fLib').click();
    $('fCam').onchange = e => addFiles(e.target);
    $('fLib').onchange = e => addFiles(e.target);
    $('btnSave').onclick = saveInspection;
    if (opts && opts.camera) $('fCam').click();   // vẫn trong cùng lần chạm nên trình duyệt cho mở máy ảnh
    takeGps();
  }

  function closeInspect() {
    if (insp && insp.busy) return;
    if (insp) insp.files.forEach(f => URL.revokeObjectURL(f.url));
    insp = null; closePanel($('inspect'));
  }

  function takeGps() {
    if (!insp) return;
    const p = state.byId[insp.id];
    const box = $('gpsBox');
    const btn = $('btnGps');
    btn.disabled = true; btn.textContent = 'Đang lấy vị trí…';
    const show = pos => {
      const poor = pos.acc > 30;
      const dist = p.loc ? ' · cách vị trí đang lưu ' + fmtDist(meters(pos, p.loc)) : '';
      box.innerHTML = '<div class="gps-line"><span class="gps-coord num">' + fmtCoord(pos.lat) + ', ' + fmtCoord(pos.lng) + '</span>' +
        '<span class="gps-acc num' + (poor ? ' poor' : '') + '">±' + Math.round(pos.acc) + ' m</span></div>' +
        '<div class="hint">' + (poor ? 'Sai số còn lớn, đứng ở chỗ thoáng và chờ thêm vài giây.' : 'Đã bắt được vị trí.') + dist + '</div>';
    };
    getPosition({ maxWait: 20000, goodEnough: 8, onUpdate: show }).then(pos => {
      if (!insp) return;
      insp.pos = pos; show(pos);
      state.me = pos; if (state.engine) state.engine.showMe(pos);
    }).catch(e => {
      box.innerHTML = '<div class="hint">' + esc(gpsError(e)) + '</div>';
    }).finally(() => { if ($('btnGps')) { btn.disabled = false; btn.textContent = 'Lấy lại vị trí'; } });
  }

  function addFiles(input) {
    Array.from(input.files || []).forEach(f => insp.files.push({ file: f, url: URL.createObjectURL(f) }));
    input.value = '';
    renderThumbs();
  }
  function renderThumbs() {
    const box = $('iThumbs');
    box.innerHTML = insp.files.map((f, i) => '<div class="thumb"><img alt="Ảnh ' + (i + 1) + '" src="' + f.url + '"><button type="button" class="x" data-rm="' + i + '" aria-label="Bỏ ảnh ' + (i + 1) + '">×</button></div>').join('');
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      const i = +b.dataset.rm; URL.revokeObjectURL(insp.files[i].url); insp.files.splice(i, 1);
      insp.uploaded = {}; renderThumbs();
    });
  }

  function loadImage(file) {
    if (window.createImageBitmap) return createImageBitmap(file).catch(() => loadImageTag(file));
    return loadImageTag(file);
  }
  function loadImageTag(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file);
    });
  }

  /** Thu nhỏ ảnh và (tùy chọn) in ngày giờ, tọa độ, ID lên dải dưới ảnh. */
  function processImage(file, lines) {
    return loadImage(file).then(img => {
      const w0 = img.width, h0 = img.height;
      const k = Math.min(1, 1600 / Math.max(w0, h0));
      const W = Math.round(w0 * k), H = Math.round(h0 * k);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      if (lines && lines.length) {
        const fs = Math.round(Math.max(16, Math.min(W, H) / 32));
        const padY = Math.round(fs * 0.7), lh = Math.round(fs * 1.35);
        const band = lines.length * lh + padY * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, H - band, W, band);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        lines.forEach((t, i) => {
          ctx.font = (i === 0 ? '600 ' : '500 ') + fs + 'px Inter, system-ui, sans-serif';
          ctx.fillText(t, Math.round(fs * 0.8), H - band + padY + i * lh, W - fs * 1.6);
        });
      }
      return c.toDataURL('image/jpeg', 0.82);
    });
  }

  function stampLines(file, p) {
    if (!$('chkStamp').checked) return null;
    const taken = file.lastModified ? new Date(file.lastModified) : new Date();
    const lines = [stampNow(taken)];
    const pos = insp.pos;
    // Chỉ in tọa độ khi ảnh được chụp gần thời điểm lấy GPS, tránh gắn nhầm tọa độ cho ảnh cũ trong thư viện
    if (pos && Math.abs(taken.getTime() - (pos.t || Date.now())) < 30 * 60 * 1000) {
      lines.push(fmtCoord(pos.lat) + ', ' + fmtCoord(pos.lng) + '  ±' + Math.round(pos.acc) + ' m');
    }
    lines.push(p.id + ' · ' + p.address);
    return lines;
  }

  function saveInspection() {
    if (!insp || insp.busy) return;
    const p = state.byId[insp.id];
    const status = $('iStatus').value.trim();
    const note = $('iNote').value.trim();
    const move = $('chkMove').checked;
    if (move && !insp.pos) { toast('Chưa có vị trí GPS. Bấm "Lấy vị trí hiện tại" hoặc bỏ chọn cập nhật vị trí.'); return; }
    if (!insp.files.length && !status && !note && !move) { toast('Chưa có nội dung để lưu.'); return; }
    insp.busy = true;
    const btn = $('btnSave'), prog = $('iProg');
    btn.disabled = true; prog.hidden = false;
    const ids = [];
    let chain = Promise.resolve();
    insp.files.forEach((f, i) => {
      chain = chain.then(() => {
        if (insp.uploaded[i]) { ids.push(insp.uploaded[i]); return; }
        prog.textContent = 'Đang xử lý và tải ảnh ' + (i + 1) + '/' + insp.files.length + '…';
        return processImage(f.file, stampLines(f.file, p))
          .then(dataUrl => call('apiUploadPhoto', { id: p.id, dataUrl, index: i + 1, caption: status }).then(res => { seedThumb(res.fileId, dataUrl); return res; }))
          .then(res => { insp.uploaded[i] = res.fileId; ids.push(res.fileId); return res; });
      });
    });
    chain.then(() => {
      prog.textContent = 'Đang lưu kiểm tra…';
      return call('apiSaveInspection', {
        id: p.id, status, note,
        lat: insp.pos ? insp.pos.lat : null, lng: insp.pos ? insp.pos.lng : null, acc: insp.pos ? insp.pos.acc : null,
        updateLocation: move, photoIds: ids
      });
    }).then(res => {
      // Cập nhật ngay trên máy, không cần tải lại toàn bộ
      p.last = { t: Date.now(), at: res.at, by: state.user.name, status, note, photos: ids.length, count: (p.last ? p.last.count : 0) + 1,
        photo: ids.length ? { id: ids[ids.length - 1], n: ids.length, t: Date.now(), at: res.at } : (p.last && p.last.photo) || null };
      if (status) { p.status = status; p.statusFrom = 'app'; p.group = groupOf(status, p); }
      if (move && insp.pos) p.loc = { lat: insp.pos.lat, lng: insp.pos.lng, acc: Math.round(insp.pos.acc), source: 'GPS hiện trường', by: state.user.name, at: res.at };
      insp.busy = false;
      closeInspect();
      refresh();
      if (isOpen($('detail')) && state.selected === p.id) openDetail(p.id);
      toast('Đã lưu kiểm tra' + (ids.length ? ' và ' + ids.length + ' ảnh' : ''), 3000, true);
    }).catch(err => {
      insp.busy = false; btn.disabled = false;
      prog.textContent = 'Lưu chưa xong: ' + (err && err.message || err) + '. Bấm Lưu kiểm tra để thử lại, ảnh đã tải lên sẽ không tải lại.';
    });
  }

  /** Giống statusGroup_ phía máy chủ, để tô màu ngay sau khi lưu. */
  function groupOf(status, p) {
    const s = norm(status).replace(/\s+/g, ' ').trim();
    if (!s) return p && p.tbkc && !p.start ? 'chua' : 'thicong';
    if (s.indexOf('dung') >= 0 && s.indexOf('su dung') < 0) return 'dung';
    if (s === 'xong' || s.indexOf('hoan thanh') >= 0 || s.indexOf('dua vao su dung') >= 0) return 'xong';
    if (s.indexOf('hoan thien') >= 0) return 'hoanthien';
    if (s.indexOf('chua thi cong') >= 0) return 'chua';
    if (s.indexOf('mong') >= 0) return 'mong';
    if (s.indexOf('tum') >= 0) return 'tum';
    return 'thicong';
  }

  /* ---------------- Khung chung ---------------- */

  function goView(view) {
    if (app.dataset.view === view) return;
    app.dataset.view = view;
    document.querySelectorAll('.bottombar [data-go]').forEach(x => {
      if (x.dataset.go === view) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
    });
    hidePeek();
    if (view === 'map' && state.engine) setTimeout(() => state.engine.resize(), 50);
    if (view === 'list') renderList(true);
    back.sync();
  }
  document.querySelector('.bottombar').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (b) goView(b.dataset.go);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('viewer').hidden) { closeViewer(); return; }
    if (isOpen($('stSheet'))) { closeStatus(); return; }
    if (locEd) { closeLocEdit(); return; }
    if (!$('mpop').hidden) { hidePop(); return; }
    if (isOpen($('near'))) { closeNear(); return; }
    if (isOpen($('inspect'))) { closeInspect(); return; }
    if (isOpen($('detail'))) closeDetail();
  });
  $('btnRefresh').onclick = () => load(true);
  window.addEventListener('resize', () => { if (state.engine) state.engine.resize(); movePill(false); });

  $('statusList').innerHTML = (CONF.suggestions || []).map(s => '<option value="' + esc(s) + '">').join('');
  renderLegend();
  // Máy tính: bản đồ mặc định chỉ hiện công trình đang thi công (bấm nút lọc để bật thêm)
  if (!isPhone()) ACTIVE_GROUPS.forEach(g => state.filter.groups.add(g));
  lpReset();
  if (!isPhone() && ['list', 'report'].indexOf(store.get('page')) >= 0) setPage(store.get('page'));
  watchMe();
  const savedArea = store.get('area');
  if (savedArea && (CONF.areas || []).some(a => a.code === savedArea)) state.area = savedArea;
  const pref = store.get('mapEngine');
  switchEngine(pref === 'osm' || !CONF.mapsKey ? 'osm' : 'google');
  if (viaScriptRun) load();
  else {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    $('btnLogout').hidden = false;
    $('btnLogout').onclick = logout;
    $('btnLogin').onclick = startLogin;
    $('installGo').onclick = () => {
      if (!install.prompt) return;
      install.prompt.prompt();
      install.prompt.userChoice.finally(() => { install.prompt = null; install.hide(false); });
    };
    $('installLater').onclick = () => install.hide(true);
    finishLogin().then(() => {
      if (auth.session) load();
      else if ($('login') && $('login').hidden) showLogin();   // màn hình "chưa được cấp quyền" đã thay cả trang thì thôi
    });
  }
})();
