/*
 * CẤU HÌNH KIDS TUBE — phụ huynh chỉ cần sửa file này.
 * Sau khi sửa, đẩy lại lên GitHub Pages; TV sẽ nhận cấu hình mới ở lần mở app tiếp theo.
 */
var CONFIG = {
  // 1) API key của YouTube Data API v3 (xem README, mục 1)
  API_KEY: 'AIzaSyA1kegfLYg9mG5TvQlzPiCRG6to4Atv8oQ',

  // 2) DANH SÁCH KÊNH ĐƯỢC PHÉP — app CHỈ hiện video của các kênh này.
  //    Có thể ghi theo 3 cách:
  //      '@tenkenh'                                  (handle, thấy trên link youtube.com/@tenkenh)
  //      'UCxxxxxxxxxxxxxxxxxxxxxx'                  (channel ID, 24 ký tự, bắt đầu bằng UC)
  //      'https://www.youtube.com/@tenkenh'          (dán nguyên link kênh)
  //    Muốn bỏ kênh nào: thêm // ở đầu dòng đó.
  CHANNELS: [
    // ---- Tiếng Việt ----
    'UCZ0GRZ-ZLXQZPxEl1rRNZYg', // BIBI - Kênh Thiếu nhi VTVcab: hoạt hình, ca nhạc
    'UCuKIDy20OrxaPDwDI3pt5KQ', // NiDo Channel (Báo Nhi Đồng TP.HCM): hát, thủ công, thí nghiệm, truyện
    '@THVLThieuNhi',            // THVL Thiếu Nhi: truyện cổ tích, văn học hoạt hình
    '@VTVCaNhacThieuNhi',       // VTV - Ca Nhạc Thiếu Nhi: bài hát thiếu nhi Việt Nam
    'UCSdw4QHWYHi0tsoLUHUXRNg', // Pinkfong tiếng Việt (2-5 tuổi): bài hát
    'UCA7QBnEDwHAEFTQpaNDT5Iw', // BabyBus tiếng Việt (2-5 tuổi): thói quen tốt, an toàn
    'UCas-IR8aZTS5pprhydlDygw', // Little Angel tiếng Việt (2-5 tuổi): bài hát, sinh hoạt hằng ngày

    // ---- Tiếng Anh (học tiếng Anh) ----
    'UCLsooMJoIpl_7ux2jvdPB-Q', // Super Simple Songs (2-6 tuổi): bài hát tiếng Anh nhẹ nhàng
    'UCG2CL6EUjG8TVT1Tpl9nJdg', // Ms Rachel (1-4 tuổi): tập nói, học từ
    'UCoookXUzPciGrEZEXmh4Jjg', // Sesame Street (2-6 tuổi)
    'UCPlwvN0w4qFSP1FllALB92w', // Numberblocks (3-7 tuổi): học đếm, làm toán
    'UC_qs3c0ehDvZkbiEbOj6Drg', // Alphablocks (3-7 tuổi): học chữ, đánh vần
    'UCAOtE1V7Ots4DjM8JLlrYgg', // Peppa Pig (2-6 tuổi)
    'UCVzLLZkDuFGAE2BGdBuBNBg', // Bluey (3-8 tuổi)
    'UC5uIZ2KOZZeQDQo_Gsi_qbQ', // Cosmic Kids Yoga (3-8 tuổi): yoga, vận động
    'UC5XMF3Inoi8R9nSI8ChOsdQ', // Art for Kids Hub (4-10 tuổi): hướng dẫn vẽ
    'UCRFIPG2u1DxKLNuE3y2SjHA', // SciShow Kids (5-10 tuổi): khoa học
  ],

  // 3) Video lẻ được phép (từ kênh không nằm trong danh sách) — hiện ở tab "Chọn lọc".
  //    Ghi ID 11 ký tự hoặc dán nguyên link video.
  ALLOWED_VIDEOS: [
    // 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
  ],

  // 4) Chặn riêng từng video (kể cả khi nằm trong kênh được phép).
  BLOCKED_VIDEO_IDS: [
    // 'XXXXXXXXXXX',
  ],

  // 5) Chặn video có tiêu đề/tag chứa các từ này (không phân biệt hoa thường, có dấu hay không dấu).
  BLOCKED_KEYWORDS: [
    'kinh dị', 'horror', 'scary', 'creepy', 'jumpscare',
    'prank', 'troll', 'bạo lực', 'đánh nhau', '18+', 'gore'
  ],

  // 6) true = chỉ giữ video được nhà sáng tạo đánh dấu "Made for Kids" (lọc chặt hơn).
  ONLY_MADE_FOR_KIDS: false,

  // 7) Bỏ các video ngắn hơn số giây này (0 = không lọc). Ví dụ 61 để bỏ bớt clip rất ngắn.
  MIN_DURATION_SECONDS: 0,

  // 8) Số video mới nhất lấy từ mỗi kênh (mỗi 50 video tốn ~2 đơn vị quota).
  MAX_VIDEOS_PER_CHANNEL: 100,

  // 9) Lưu danh sách video trên TV bao nhiêu giờ trước khi tải lại.
  CACHE_HOURS: 6,

  // 10) Giới hạn thời gian xem mỗi ngày, tính bằng phút (0 = không giới hạn).
  DAILY_LIMIT_MINUTES: 0,

  // 11) Hết video thì tự phát video tiếp theo trong cùng danh sách.
  AUTOPLAY_NEXT: true
};
