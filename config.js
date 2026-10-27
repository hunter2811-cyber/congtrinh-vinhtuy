// Cấu hình trang app trên GitHub Pages. Không có gì bí mật ở đây: máy chủ chỉ trả dữ liệu khi người dùng đã đăng nhập.
window.APP_CONFIG = {
  // Link triển khai Web App của Apps Script (tài khoản vinhtuyttxd)
  apiUrl: 'https://script.google.com/macros/s/AKfycbwVpEmvYg9mrv2pExZEhbTLW35hhtgL3DdZoGVzXYH8qYBIsKhRc6fssDEpL0tK1P90rg/exec',
  // Mã ứng dụng OAuth (Google Cloud của vinhtuyttxd), phải trùng OAUTH_CLIENT_ID trong Config.gs
  clientId: 'DIEN_MA_CLIENT_ID_VAO_DAY',
  // Địa chỉ trang app, cũng là địa chỉ Google chuyển về sau khi đăng nhập
  appUrl: 'https://hunter2811-cyber.github.io/congtrinh-vinhtuy/',
  mapsKey: '',
  center: { lat: 20.9955, lng: 105.87 },
  suggestions: ['Chưa thi công', 'Đang phá dỡ', 'Thi công móng', 'Thi công T1', 'Thi công tầng lửng', 'Thi công T2', 'Thi công T3', 'Thi công T4', 'Thi công T5', 'Thi công T6', 'Thi công tum', 'Hoàn thiện', 'Đã đưa vào sử dụng', 'Hoàn thành'],
  areas: [
    { code: 'I', name: 'Phía Bắc phố Lạc Trung (TDP 1–7)' },
    { code: 'II', name: 'Phía Nam Lạc Trung đến phía Bắc Minh Khai (TDP 8–16)' },
    { code: 'III', name: 'Phía Nam phố Minh Khai (TDP 17–38)' }
  ]
};
