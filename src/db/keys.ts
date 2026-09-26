/**
 * Khoá chính cho các bảng "mỗi ngày / mỗi tuần một bản ghi".
 *
 * Trước đây check-in dùng thẳng ngày "2026-09-26" làm khoá chính. Dexie Cloud
 * đòi khoá chính duy nhất trên TOÀN hệ thống (mọi người dùng), nên một chuỗi
 * ngày trơn là không đủ.
 *
 * Dấu "#" ở đầu là "private ID" của Dexie Cloud: nó chỉ cần duy nhất trong
 * tài khoản của bạn, và hai người dùng có cùng "#2026-09-26" không bao giờ
 * đụng nhau. Quan trọng hơn: check-in cùng một ngày làm trên điện thoại và
 * trên laptop sẽ có CÙNG khoá, nên là một bản ghi — không bao giờ nhân đôi.
 *
 * Ở kho trên máy (không đồng bộ), "#" chỉ là một ký tự bình thường.
 */

/** Khoá của check-in ngày `date` ("YYYY-MM-DD"). */
export function checkinId(date: string): string {
  return `#${date}`;
}

/** Khoá của tổng kết tuần bắt đầu Thứ Hai `weekStart` ("YYYY-MM-DD"). */
export function weekReviewId(weekStart: string): string {
  return `#${weekStart}`;
}
