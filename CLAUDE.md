# CLAUDE.md

Hướng dẫn cho Claude khi làm việc với repo `hunter2811-cyber/congtrinh-vinhtuy`: Web App quản lý, theo dõi và kiểm tra công trình xây dựng trên địa bàn phường Vĩnh Tuy (Hà Nội).

## Xưng hô và ngôn ngữ

- Chủ dự án là anh Quốc Trung (admin duy nhất). Trò chuyện bằng tiếng Việt, gọi "anh", tự xưng "em".
- Mọi chữ trên giao diện, thông báo lỗi, chú thích code, commit và PR viết bằng tiếng Việt có dấu.
- Định dạng chuẩn Việt Nam: số 1.800.000 (dấu chấm ngăn nghìn), thập phân dấu phẩy (12,50 m), ngày dd/mm/yyyy, giờ HH:mm, tiền 10.500.000đ. Múi giờ Asia/Ho_Chi_Minh.
- Văn bản hành chính (bìa hồ sơ, biên bản, báo cáo) dùng Times New Roman.

## Kiến trúc

Ba phần, tách riêng:

| Phần | Ở đâu | Vai trò |
| --- | --- | --- |
| Giao diện (PWA) | Repo này, GitHub Pages nhánh `main`: https://hunter2811-cyber.github.io/congtrinh-vinhtuy/ | Bản đồ, danh sách, hồ sơ, chụp ảnh, báo cáo tuần, in bìa/BBKT |
| Máy chủ API | Apps Script trên tài khoản Gmail hệ thống của dự án (Thực thi: Tôi, Truy cập: Bất kỳ ai) | Đọc/ghi Google Sheet, lưu ảnh vào Drive, kiểm tra đăng nhập |
| Dữ liệu | Google Sheet "Du lieu Webapp cong trinh" (mã file trong `CFG.SHEET_ID`, Config.gs) | Tab đầu IMPORTRANGE từ tab **"Data"** của file gốc do anh quản lý |

- Trình duyệt gọi máy chủ bằng `POST` JSON dạng `text/plain` tới link `/exec`: `{fn, arg, session}` → `{ok, data}` hoặc `{ok: false, error}`. Danh sách hàm cho phép nằm trong `API_` (Api.gs).
- Đăng nhập: Google OAuth (id_token) → máy chủ kiểm `aud` = `OAUTH_CLIENT_ID` → cấp phiên 30 ngày. Mỗi lượt gọi kiểm lại email trong tab "Người dùng" (cột Quyền: `admin` / `canbo`, tick Hoạt động).
- Ảnh hiện trường lưu trong Drive của tài khoản hệ thống (thư mục "Ảnh hiện trường" trong `CFG.PARENT_FOLDER_ID`). Script chạy bằng quyền tài khoản hệ thống nên **không chia sẻ file dữ liệu hay thư mục ảnh cho cán bộ**. Ảnh nhỏ (320px) và ảnh vừa (640px) lưu dạng dataURL trong tab "Ảnh nhỏ", trình duyệt nhớ trong IndexedDB `congtrinh-vinhtuy`.
- Bản đồ: Leaflet 1.9.4 + ô nền OpenStreetMap chuẩn, nền tối vừa phải để marker nổi mà vẫn đọc được tên phố. `sw.js` lưu sẵn ô nền (tối đa ~1.500 ô, 30 ngày).
- Thư viện ngoài chỉ lấy từ unpkg/cdnjs, ghi rõ phiên bản: Leaflet 1.9.4, GSAP 3.12.5, ExcelJS 4.4.0 (chỉ tải khi bấm xuất Excel).

### Tab trong file dữ liệu

Tab IMPORTRANGE (dữ liệu gốc) **chỉ đọc, không bao giờ ghi**. App chỉ ghi vào các tab riêng, khóa theo ID công trình (xem `CFG.TABS` trong Config.gs): Mã công trình, Vị trí, Lịch sử kiểm tra, Người dùng, Hiện trạng file, Cập nhật dữ liệu, Ảnh nhỏ, Báo cáo đã chốt.

Cột của tab Data (A–AG, khoảng 130 công trình): STT, Ông, Bà, Địa chỉ thường trú, Điện Thoại, Địa chỉ công trình, Số GPXD, Ngày cấp, Quy Mô, Thông báo khởi công, Ngày thi công, DTXD, DTS, Chiều cao, HT xây dựng, TB/BB L1–L3, Ghi chú, Địa bàn, CCCD, KC (cột không tiêu đề ngay sau CCCD), Vĩ độ, Kinh độ, rồi các cột phụ. Máy chủ tìm cột **theo tên tiêu đề** (`COLS`, `COORD_COLS`), số thứ tự cột chỉ là dự phòng.

## Mã nguồn ở đâu

Repo này **chỉ chứa bản đã dựng** của giao diện, không chứa mã máy chủ hay dữ liệu thật:

| File | Nội dung |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Dựng từ `src/Index.html`, `src/Styles.html`, `src/App.html` |
| `config.js` | Link `/exec`, OAuth Client ID, tâm bản đồ, gợi ý hiện trạng, khu vực (không có gì bí mật) |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA, cài ra màn hình chính |
| `body.html`, `version.json` | Cho trang Apps Script đời cũ, sẽ bỏ |
| `demo/index.html` | Bản demo dữ liệu giả |

Mã gốc nằm trong thư mục dự án dùng chung `/mnt/project-files/webapp/`:

- `src/` — mã giao diện gốc (Index, Styles, App). **Sửa ở đây, không sửa tay `app.js`/`styles.css` trong repo.**
- `apps-script/` — 6 file `.gs` và `appsscript.json`: `Config.gs` (cấu hình), `Api.gs` (doPost, đăng nhập, ảnh, vị trí), `Data.gs` (đọc dữ liệu, cấp mã, nhóm hiện trạng), `BaoCao.gs` (báo cáo tuần, tự xuất Excel, bản chốt), `AnhNho.gs` (ảnh nhỏ), `Setup.gs` (hàm chạy tay: `caiDat`, `kiemTra`, `kiemTraCot`, `kiemTraMa`, `suaLechMa`, `lamMoiCapNhat`, `doTocDo`), `appsscript.json`. File `.gs` **không đưa lên repo** (repo public).
- `tools/build-web.js` — dựng giao diện; `tools/web-config.js` — nguồn của `config.js`; `tools/build-demo.js` — dựng demo dữ liệu giả.
- `tools/gia-lap-may-chu/` — giả lập Apps Script chạy bằng Node để thử `.gs`.
- `backup-*/` — bản lưu trước mỗi lần sửa lớn. Trước khi sửa `.gs` đáng kể, chép bản hiện tại vào một thư mục `backup-truoc-<việc>/`.

## Lệnh thường dùng

```bash
# Dựng giao diện từ src vào repo (sinh index.html, styles.css, app.js, config.js, sw.js, manifest, body.html, version.json)
node /mnt/project-files/webapp/tools/build-web.js /mnt/project-files/webapp/src /home/user/congtrinh-vinhtuy

# Thử mã máy chủ bằng giả lập (bộ thử chung; bộ thử bản chốt báo cáo: sua-chot-14-11/test.js <bản mới> <bản cũ>)
node /mnt/project-files/webapp/tools/gia-lap-may-chu/test.js /mnt/project-files/webapp/apps-script

# Dựng demo dữ liệu giả (cần projects.json; chạy trong scratchpad, không để projects.json ở thư mục chung)
node /mnt/project-files/webapp/tools/build-demo.js <thư mục ra>
```

- Kiểm thử giao diện bằng Playwright, chặn và giả lập `script.google.com`. Mạng có thể chặn unpkg/cdnjs: tải Leaflet, GSAP về máy bằng `npm pack` rồi route cục bộ.
- Sau khi dựng, `git diff` chỉ nên thấy các file dựng thay đổi; mã trong `?v=` của `index.html` và `CACHE` trong `sw.js` đổi theo nội dung.

## Triển khai

- **Giao diện:** sửa `src/` → dựng vào repo → commit trên nhánh `claude/project-thread-*` → mở PR vào `main`. Anh tự merge; GitHub Pages cập nhật sau khi merge. Không tự merge, không push thẳng `main`.
- **Máy chủ (.gs):** em sửa file trong `apps-script/` (và cập nhật `congtrinh-vinhtuy-apps-script.zip`), báo anh file nào đổi. Anh tự dán vào Apps Script rồi vào **Triển khai → Quản lý tài nguyên triển khai → bút chì → Phiên bản mới** để giữ nguyên link `/exec`. Không tạo bản triển khai mới (sẽ đổi link). Mọi thay đổi ảnh hưởng tới lượt gọi từ app (kể cả hàm `api*` nằm trong BaoCao.gs, AnhNho.gs) đều cần Phiên bản mới; hàm chỉ chạy bằng trigger hoặc chạy tay thì dán xong là có hiệu lực.
- Khi một tính năng cần cả giao diện lẫn máy chủ, giao diện phải chịu được máy chủ còn bản cũ (vd `apiGetReport` được bọc `typeof` trong `API_`).
- Cách tính báo cáo tuần có ở **hai nơi**: `src/App.html` (`reportData`) và `BaoCao.gs` (`reportData_`). Sửa một nơi thì sửa cả nơi kia.

## Quy tắc làm việc

1. **Luôn làm demo giao diện để anh duyệt TRƯỚC khi viết code tính năng** (demo dữ liệu giả, đăng thành Artifact; có cả khung máy tính và điện thoại). Chỉ code sau khi anh duyệt.
2. Giữ nguyên chức năng đang chạy nếu anh không yêu cầu bỏ. Không tự ý xóa hay đổi chức năng cũ.
3. Không đổi cấu trúc dữ liệu (tab, cột, khóa) khi không cần. Thay đổi lớn về kiến trúc hoặc dữ liệu: giải thích lý do và ảnh hưởng, chờ anh đồng ý.
4. Chi phí 0đ: không dùng dịch vụ trả phí. **Không dùng Google Maps Platform** (vùng bị chặn thanh toán); bản đồ dùng OpenStreetMap chuẩn (CARTO đã bỏ vì cần khóa).
5. Tách module hợp lý, code rõ ràng, chú thích tiếng Việt ngắn gọn.
6. Hiệu ứng chuyển động: mô tả cho anh trước khi làm; anh rất khắt khe về độ mượt và chính xác, phải đo từng khung hình bằng Playwright trước khi báo xong.
7. Repo để công khai: không ghi mã file Sheet/Drive, email cá nhân, dữ liệu thật hay khóa bí mật vào repo (kể cả file này).
8. Thao tác không hoàn tác được trên dữ liệu thật (xóa hàng loạt, chạy `suaLechMa`, đổi múi giờ file…) phải hỏi anh trước.

## Quy ước dữ liệu quan trọng

- **ID công trình** dạng `2026-01`, `2026-02`… (năm + số), ban đầu đánh theo ngày Thông báo khởi công trong năm; chưa có ngày thì giữ thứ tự dòng trong sheet. ID đã cấp là **cố định** (tab "Mã công trình"), công trình mới nhận số tiếp theo của năm, không đánh lại số cũ. Nếu quá nửa công trình bỗng không khớp ID cũ, `ensureIds_` dừng hẳn (nghi lệch cột, chạy `kiemTraCot`), đừng gỡ chốt chặn này.
- **Ghép mã app với dòng file theo TÊN CHỦ ĐẦU TƯ + SỐ GPXD** (khóa `CG:`; chưa có GPXD thì `CA:` tên + địa chỉ, xem `keyOf_`). **Không ghép theo KC** (KC bị đánh lại khi anh sửa ngày khởi công, từng làm ảnh nhảy sang công trình bên cạnh) và không theo địa chỉ đơn thuần.
- **Tọa độ** trong tab "Cập nhật dữ liệu" ghi dạng **chữ, dấu chấm thập phân** (định dạng ô `@`, vd 21.008382), vì Sheets vùng VN sẽ hiện số với dấu phẩy. GPS hiện trường (tab Vị trí) ưu tiên hơn tọa độ trong file.
- **Hiện trạng** là chữ tự do, có gợi ý: Chưa thi công, Đang phá dỡ, Thi công móng, Thi công T1, tầng lửng, T2–T6, tum, Hoàn thiện, Đã đưa vào sử dụng, Hoàn thành, Dừng thi công. Nhóm màu marker do `statusGroup_` quyết định. Hiện trạng hiển thị = bên mới hơn giữa app và file (tab "Hiện trạng file" ghi giờ phát hiện ô đổi).
- Chủ đầu tư lấy đúng cột Ông và cột Bà (mỗi người một dòng), không đoán giới tính theo tên.
- Dữ liệu ngày trong file gốc có thể gõ kiểu Mỹ hoặc sai (vd `08/04/0206`); `30/12/1899` nghĩa là trống. File app hiện ngày theo kiểu M/D/Y; mã máy chủ luôn tự định dạng `dd/MM/yyyy`.
- File dữ liệu đang để múi giờ America/Los_Angeles. **Không đổi tay trong Cài đặt**; nếu cần thì dùng hàm `doiMuiGio`.

## Người dùng và quyền

- 4–5 người: admin là anh Trung; cán bộ hiện trường xem, chụp ảnh, cập nhật vị trí và hiện trạng.
- **CCCD chỉ admin xem**: máy chủ không gửi CCCD ra trình duyệt; địa chỉ thường trú chỉ gửi cho admin. Không bao giờ đưa dữ liệu cá nhân thật (tên, điện thoại, CCCD) vào repo, demo hay ảnh chụp màn hình; demo luôn dùng dữ liệu giả.
- Sửa/xóa vị trí từ máy tính chỉ dành cho admin (`requireAdmin_`).

## Giao diện

- **Điện thoại** (cán bộ dùng **iPhone Safari**, thường cài ra màn hình chính): chọn khu vực, tìm công trình, nút "Gần đây" (công trình trong 10 m), nút chụp ảnh hiện ngay bên ngoài, ảnh chụp lưu thẳng vào công trình; chỉ đường Google Maps trên thẻ khi có tọa độ (danh sách điện thoại không có nút chỉ đường). Thử kỹ trên Safari iOS (camera, GPS, PWA, chuyển trang đăng nhập).
- **Máy tính** chủ yếu để xem và quản trị: danh sách theo cột có bộ lọc, popup bản đồ, hồ sơ, sửa hiện trạng/vị trí, Báo cáo tuần. Không có nút gọi, chỉ đường, chụp ảnh.
- **In bìa hồ sơ và In BBKT chỉ hiện trên máy tính**, không trên điện thoại. Mẫu gốc: "Bìa hồ sơ 2026" và "BBKT phòng HTĐTNT lần 1" (`/mnt/project-files/webapp/mau-in/`). BBKT luôn đúng 2 trang A4, "Hiện trạng kiểm tra" ở đầu trang 2; giữ cơ chế tự co (`fitBbkt`).
- In: đặt khổ giấy bằng `printPage(css)` lúc in. **Không dùng `@page` có tên** (từng gây trang trắng đầu trên Chrome).
- Lưu hiện trạng là lưu ngầm: đóng bảng ngay, hàng chờ `outbox` trong localStorage, tự thử lại khi mất mạng.
- Bản đồ Leaflet: không gọi `setRadius`/`setStyle` của circleMarker trong lúc đang zoom (marker bị trôi); dùng cơ chế `setR()` và lớp vẽ SmoothSVG có sẵn.
- Phong cách: nền tối, chuyển động nhẹ (GSAP), tắt kiểm tra chính tả trong ô nhập (`spellcheck="false"`).

## Báo cáo tuần

- Kỳ báo cáo **thứ Bảy → thứ Sáu**; chốt lúc 13h thứ Sáu. Tự xuất Excel 14h thứ Sáu (`xuatBaoCaoTuan`, trigger bật bằng `caiLichBaoCao`), lưu Drive theo cây "Năm yyyy / Tháng MM", gửi email cho anh. 8h thứ Bảy `danhDauXong` đánh dấu "xong" cho công trình đưa vào sử dụng trong kỳ.
- Mục I–III theo Địa bàn (KV 1 Thanh Lương; KV 2 Vĩnh Tuy; KV 3 Vĩnh Tuy + Mai Động + Vĩnh Hưng), xếp theo ngày thi công tăng dần. Mục IV: đưa vào sử dụng trong tuần. Mục V: đã thông báo khởi công nhưng chưa thi công, xếp theo ngày TBKC. Bỏ công trình Hoàn thành/Đã sử dụng ở các mục chính.
- Mọi công trình là "Có phép", vi phạm = 0, cột Ghi chú và Đơn thư để trống; lần kiểm tra có ô BB = "x" thì không đưa vào Biện pháp xử lý.
- Kỳ đã qua hiển thị bản chốt lưu ở tab "Báo cáo đã chốt" (`apiGetReport`); chưa có thì tính lại và ghi chú.
