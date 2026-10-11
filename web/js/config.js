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
    'https://www.youtube.com/@doremi5g',
    'https://www.youtube.com/@chunchin-chillcungbeiu1450',
    'https://www.youtube.com/@SheriffLabradorVN'
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
