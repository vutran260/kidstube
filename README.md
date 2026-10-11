# Kids Tube — YouTube an toàn cho bé trên TV LG webOS

App chỉ hiện video của **những kênh phụ huynh cho phép**. Không có ô tìm kiếm, không có video gợi ý,
không bấm được ra YouTube bên ngoài.

## Cách app hoạt động

```
TV LG ──mở app Kids Tube──▶ launcher (cài trên TV)
                              │ chuyển tới
                              ▼
              https://<bạn>.github.io/kidstube/   (thư mục web/)
                 ├─ YouTube Data API: lấy video của các kênh trong config.js
                 ├─ Lọc: đúng kênh, từ khóa cấm, video bị chặn, giới hạn tuổi, livestream
                 └─ Phát bằng trình phát nhúng chính thức của YouTube
```

**Vì sao phải đưa web lên GitHub Pages?** Từ cuối năm 2025, trình phát nhúng YouTube bắt buộc trang web
gửi thông tin *Referer*; app chạy trực tiếp từ file trong TV không gửi được, nên video báo **Lỗi 153**.
Chạy từ một trang `https://` sẽ không gặp lỗi này. Lợi ích kèm theo: muốn thêm/bớt kênh chỉ cần sửa
`config.js` trên GitHub, **không phải cài lại app trên TV**.

## Các tính năng chặn

| Lớp bảo vệ | Mô tả |
|---|---|
| Danh sách kênh trắng | Chỉ lấy video từ playlist "uploads" của các kênh trong `CHANNELS`, kiểm tra lại `channelId` từng video |
| Không tìm kiếm | Giao diện không có ô tìm kiếm |
| Lớp chắn trên trình phát | Trẻ dùng chuột Magic Remote không bấm được tiêu đề, logo, màn hình kết thúc hay video gợi ý |
| Hết video → tự sang video kế tiếp *trong danh sách của app* (không để YouTube gợi ý) |
| Từ khóa cấm | Bỏ video có tiêu đề/tag chứa từ trong `BLOCKED_KEYWORDS` (không phân biệt dấu) |
| Chặn từng video | `BLOCKED_VIDEO_IDS` |
| Tự động bỏ | Video giới hạn độ tuổi, livestream, video không cho nhúng |
| Lọc chặt (tùy chọn) | `ONLY_MADE_FOR_KIDS: true` — chỉ giữ video gắn nhãn "Dành cho trẻ em" |
| Giới hạn giờ xem | `DAILY_LIMIT_MINUTES` — hết giờ app khóa đến hôm sau |

---

## 1. Tạo API key YouTube (miễn phí)

1. Vào <https://console.cloud.google.com/> → tạo Project mới (ví dụ `kidstube`).
2. **APIs & Services → Library** → tìm **YouTube Data API v3** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Bấm vào key vừa tạo để giới hạn (quan trọng, vì key sẽ nằm công khai trên GitHub Pages):
   - *Application restrictions* → **Websites** → thêm `https://TEN-GITHUB-CUA-BAN.github.io/*`
     (và `http://localhost:8000/*` nếu muốn thử trên máy tính).
   - *API restrictions* → **Restrict key** → chỉ chọn **YouTube Data API v3**.

Hạn mức miễn phí 10.000 đơn vị/ngày. Mỗi kênh tốn khoảng 5 đơn vị mỗi lần tải; app lưu kết quả 6 giờ,
nên 10–20 kênh dùng rất ít.

## 2. Sửa `web/js/config.js`

```js
API_KEY: 'AIza...',
CHANNELS: [
  '@tenkenh1',
  'https://www.youtube.com/@tenkenh2',
  'UCxxxxxxxxxxxxxxxxxxxxxx'
],
DAILY_LIMIT_MINUTES: 60,
```

Lấy handle kênh: mở kênh trên YouTube, địa chỉ có dạng `youtube.com/@tenkenh` → ghi `'@tenkenh'`
(hoặc dán nguyên link).

## 3. Đưa web app lên GitHub Pages

1. Tạo tài khoản <https://github.com> (nếu chưa có), tạo repository tên **`kidstube`** (Public).
2. **Add file → Upload files** → kéo **toàn bộ nội dung bên trong thư mục `web/`**
   (`index.html`, `css/`, `js/`) vào, bấm **Commit**.
3. **Settings → Pages** → *Source*: **Deploy from a branch**, *Branch*: `main` / `(root)` → **Save**.
4. Sau 1–2 phút, mở `https://TEN-GITHUB-CUA-BAN.github.io/kidstube/` trên máy tính để kiểm tra
   (dùng phím mũi tên + Enter để thử như remote).

Muốn đổi danh sách kênh sau này: sửa `js/config.js` ngay trên GitHub → Commit. TV nhận thay đổi sau
khoảng 10 phút (hoặc nhấn **nút Đỏ** trên remote để tải lại ngay).

> Thử trên máy trước khi đưa lên mạng: trong thư mục `web/` chạy `python3 -m http.server 8000`
> rồi mở `http://localhost:8000`.

## 4. Cài app lên TV LG

### 4.1 Bật Developer Mode trên TV
1. Đăng ký tài khoản miễn phí tại <https://webostv.developer.lge.com>.
2. Trên TV, mở **LG Content Store** → tìm và cài app **Developer Mode**.
3. Mở app Developer Mode → đăng nhập tài khoản ở bước 1 → bật **Dev Mode Status** → TV khởi động lại.
4. Mở lại app Developer Mode → bật **Key Server**. Ghi lại **IP** và **Passphrase** hiển thị trên màn hình.

### 4.2 Cài công cụ trên máy tính
Cần Node.js (bản LTS), máy tính cùng mạng Wi-Fi với TV:

```bash
npm install -g @webos-tools/cli
```

### 4.3 Sửa địa chỉ, đóng gói và cài

1. Mở `webos-launcher/index.html`, sửa dòng
   `var APP_URL = 'https://TEN-GITHUB-CUA-BAN.github.io/kidstube/';`
2. Chạy:

```bash
# Khai báo TV (chọn "add", đặt tên "tv", nhập IP của TV, port 9922, user "prisoner")
ares-setup-device

# Lấy khóa từ TV (nhập Passphrase hiện trong app Developer Mode)
ares-novacom --device tv --getkey

# Đóng gói và cài
ares-package webos-launcher
ares-install --device tv com.giadinh.kidstube_1.0.0_all.ipk
ares-launch --device tv com.giadinh.kidstube
```

App **Kids Tube** sẽ xuất hiện trong danh sách ứng dụng của TV.

> **Lưu ý Developer Mode:** phiên Developer Mode có thời hạn (thời gian còn lại hiển thị trong app
> Developer Mode). Khi hết hạn, các app tự cài sẽ bị gỡ. Thỉnh thoảng mở app Developer Mode và bấm
> **Extend** để gia hạn.

## 5. Khóa YouTube gốc và trình duyệt trên TV

App này chỉ an toàn khi bé không mở được YouTube thường. Trên TV LG vào
**Cài đặt → Chung → An toàn** (tên mục có thể khác tùy đời TV) → bật **Khóa ứng dụng**
và khóa **YouTube**, **Trình duyệt web** bằng mã PIN. Có thể ghim Kids Tube ra màn hình chính cho bé dễ mở.

## 6. Điều khiển bằng remote

| Màn hình danh sách | |
|---|---|
| ◀ ▶ ở hàng trên | Đổi kênh |
| ▼ / ▲ / ◀ ▶ | Di chuyển giữa các video |
| OK | Xem video |
| Quay lại | Lên hàng kênh; nhấn 2 lần để thoát |
| Nút Đỏ | Tải lại danh sách video |

| Khi xem video | |
|---|---|
| OK / ⏯ | Dừng / Phát |
| ◀ ▶ / ⏪ ⏩ | Tua lùi / tới 10 giây |
| ▲ ▼ | Video trước / sau |
| Quay lại / ⏹ | Về danh sách |

## 7. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| "Chưa nhập API_KEY" | Sửa `web/js/config.js`, đẩy lại lên GitHub |
| "API key not valid" / "Requests from referer … are blocked" | Kiểm tra lại giới hạn Websites của API key có đúng địa chỉ GitHub Pages |
| "quota" / "exceeded" | Hết hạn mức ngày; app tự dùng dữ liệu đã lưu, sang ngày sẽ hết |
| "Không tìm thấy kênh: @abc" | Kiểm tra lại handle (mở `youtube.com/@abc` xem có đúng không) |
| Lỗi 153 khi phát | Đang chạy web từ file trong TV thay vì trang `https://` — làm theo mục 3 và 4.3 |
| "Video này không phát được" | Chủ kênh tắt nhúng video đó; app tự chuyển sang video kế tiếp |

## Giới hạn cần biết

- Bộ lọc tin tưởng **nội dung của kênh** bạn chọn. Nếu một kênh đăng video không phù hợp, hãy chặn
  video đó (`BLOCKED_VIDEO_IDS`) hoặc bỏ kênh.
- Lọc từ khóa so khớp theo chuỗi con, nên đôi khi chặn nhầm; chỉnh `BLOCKED_KEYWORDS` cho phù hợp.
- App dùng cho gia đình. Lớp chắn và thanh thông tin phủ lên trình phát YouTube không phù hợp chính sách
  YouTube API dành cho ứng dụng phát hành công khai, nên không đưa app này lên LG Content Store.
