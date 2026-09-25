/**
 * Xin trình duyệt giữ dữ liệu "bền vững" (persistent storage).
 *
 * VÌ SAO QUAN TRỌNG:
 * Mặc định, IndexedDB được xếp loại "best-effort". Khi máy gần hết dung
 * lượng, trình duyệt có quyền TỰ XOÁ dữ liệu của các trang web để lấy
 * chỗ — không hỏi, không báo. Với app này thì đó là mất sạch nhật ký học.
 *
 * navigator.storage.persist() xin chuyển sang loại "persistent": trình
 * duyệt cam kết chỉ xoá khi chính người dùng ra lệnh.
 *
 * Trình duyệt tự quyết định có cho hay không:
 *   - Chrome/Android: thường tự CHO khi app đã được cài vào màn hình chính
 *     hoặc bạn ghé thăm thường xuyên. Không hiện hộp thoại nào.
 *   - Safari/iOS: quy tắc riêng, thường từ chối. Nếu bị từ chối thì
 *     Safari có thể xoá dữ liệu sau vài tuần KHÔNG mở app.
 *
 * Vì không chắc chắn được, màn hình Cài đặt hiện rõ trạng thái để bạn
 * biết mình đang ở mức bảo vệ nào — và biết mà siêng xuất file JSON.
 */

export type PersistenceStatus =
  | "persisted"     // đã được bảo vệ
  | "not-persisted" // trình duyệt từ chối hoặc chưa cho
  | "unsupported"   // trình duyệt không có tính năng này
  | "checking";     // đang hỏi

/** Trình duyệt có hỗ trợ không? */
export function supportsPersistence(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.persist === "function" &&
    typeof navigator.storage.persisted === "function"
  );
}

/**
 * Hỏi trạng thái hiện tại, và XIN nếu chưa có.
 *
 * Gọi persisted() trước để không xin lại một cách vô ích khi đã được cấp.
 * Hàm không bao giờ ném lỗi — mọi sự cố đều quy về "not-persisted",
 * vì đây chỉ là lớp bảo vệ thêm, không được phép làm app crash.
 */
export async function ensurePersistence(): Promise<PersistenceStatus> {
  if (!supportsPersistence()) return "unsupported";

  try {
    if (await navigator.storage.persisted()) return "persisted";
    const granted = await navigator.storage.persist();
    return granted ? "persisted" : "not-persisted";
  } catch {
    return "not-persisted";
  }
}

/** Chỉ ĐỌC trạng thái, không xin. Dùng cho màn hình Cài đặt. */
export async function checkPersistence(): Promise<PersistenceStatus> {
  if (!supportsPersistence()) return "unsupported";
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "not-persisted";
  } catch {
    return "not-persisted";
  }
}

/** Câu giải thích tiếng Việt cho từng trạng thái. */
export function describePersistence(status: PersistenceStatus): {
  title: string;
  detail: string;
  tone: "good" | "warn" | "neutral";
} {
  switch (status) {
    case "persisted":
      return {
        title: "Đã được bảo vệ",
        detail:
          "Trình duyệt cam kết không tự xoá dữ liệu để lấy dung lượng. Chỉ mất khi bạn chủ động xoá.",
        tone: "good",
      };
    case "not-persisted":
      return {
        title: "Chưa được bảo vệ",
        detail:
          "Khi máy gần đầy, trình duyệt có thể tự xoá dữ liệu của app mà không báo. Cài app vào màn hình chính và dùng thường xuyên sẽ tăng khả năng được cấp. Trong lúc đó, hãy xuất file JSON đều đặn.",
        tone: "warn",
      };
    case "unsupported":
      return {
        title: "Trình duyệt không hỗ trợ",
        detail: "Không kiểm tra được mức bảo vệ. Hãy xuất file JSON đều đặn.",
        tone: "neutral",
      };
    case "checking":
      return { title: "Đang kiểm tra...", detail: "", tone: "neutral" };
  }
}
