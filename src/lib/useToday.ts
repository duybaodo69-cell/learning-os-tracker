/**
 * useToday — luôn trả về ngày hôm nay, kể cả khi app mở qua nửa đêm.
 *
 * VẤN ĐỀ NÓ GIẢI QUYẾT:
 * Trước đây mỗi màn hình gọi todayISO() một lần lúc vẽ. Nếu bạn mở app
 * lúc 23:50 rồi để đó, đến 00:10 quay lại, app vẫn tưởng là ngày hôm qua.
 * Check-in và focus block sẽ bị ghi sai ngày — và sai ngày thì mọi thống kê
 * về sau đều lệch theo.
 *
 * CÁCH LÀM: tính lại ngày ở ba thời điểm
 *   1. visibilitychange — bạn chuyển sang app khác rồi quay lại
 *   2. focus           — cửa sổ được chọn lại
 *   3. mỗi 60 giây     — phòng khi app mở liên tục không rời mắt
 *
 * LƯU Ý QUAN TRỌNG: hook này chỉ lo phần HIỂN THỊ. Khi LƯU dữ liệu,
 * luôn gọi thẳng todayISO() ngay lúc bấm nút — xem ghi chú trong
 * TodayScreen. Giữa lúc vẽ màn hình và lúc bạn bấm Lưu có thể đã
 * sang ngày mới.
 */
import { useEffect, useState } from "react";
import { nowHHmm, todayISO } from "./dates";

/** Bao lâu kiểm tra lại một lần khi app đang mở liên tục. */
export const TODAY_POLL_MS = 60_000;

export function useToday(): string {
  const [today, setToday] = useState<string>(todayISO);

  useEffect(() => {
    function sync() {
      // Chỉ gọi setState khi ngày THỰC SỰ đổi. Nếu gọi mỗi 60 giây
      // thì React vẽ lại toàn bộ màn hình một cách vô ích.
      setToday((prev) => {
        const next = todayISO();
        return next === prev ? prev : next;
      });
    }

    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    const id = setInterval(sync, TODAY_POLL_MS);

    // Chạy ngay một lần: giữa lúc useState khởi tạo và lúc effect chạy
    // cũng có thể đã sang ngày mới (hiếm, nhưng rẻ để phòng).
    sync();

    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, []);

  return today;
}

/**
 * Giờ hiện tại "HH:mm" (giờ Việt Nam), tự cập nhật — cùng ba thời điểm như
 * useToday (quay lại app, cửa sổ được chọn, mỗi 60 giây). Dùng cho dòng
 * "dời khung" chỉ hiện sau 10:30 (Đợt 2). Chỉ để HIỂN THỊ; khi lưu thì gọi
 * nowHHmm() ngay lúc bấm.
 */
export function useNowHHmm(): string {
  const [now, setNow] = useState<string>(nowHHmm);

  useEffect(() => {
    function sync() {
      setNow((prev) => {
        const next = nowHHmm();
        return next === prev ? prev : next;
      });
    }
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    const id = setInterval(sync, TODAY_POLL_MS);
    sync();
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, []);

  return now;
}
