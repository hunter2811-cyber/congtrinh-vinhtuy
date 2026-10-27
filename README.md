# Công trình Vĩnh Tuy

App theo dõi công trình xây dựng phường Vĩnh Tuy, chạy trên GitHub Pages:
https://hunter2811-cyber.github.io/congtrinh-vinhtuy/

Trang web ở đây chỉ là giao diện. Dữ liệu nằm trong Google Sheets của tài khoản hệ thống; máy chủ Apps Script chỉ trả dữ liệu cho người đã đăng nhập Google và có tên trong tab "Người dùng".

Trên điện thoại, mở link bằng Chrome (Android) hoặc Safari (iPhone) rồi "Thêm vào màn hình chính" để dùng như ứng dụng.

| File | Nội dung |
| --- | --- |
| `index.html` | Trang app |
| `styles.css` | Kiểu chữ, màu, sáng/tối, chuyển động |
| `app.js` | Đăng nhập, bản đồ, bộ lọc, danh sách, hồ sơ, chụp ảnh |
| `config.js` | Link máy chủ, mã đăng nhập Google, khu vực (không có gì bí mật) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Để cài app ra màn hình chính |
| `body.html`, `version.json` | Cho trang Apps Script đời cũ, sẽ bỏ |
| `demo/` | Bản demo dùng dữ liệu giả |

Repo không chứa mã máy chủ hay dữ liệu thật.
