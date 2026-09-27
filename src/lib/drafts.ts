/**
 * Bản nháp của form, lưu trong localStorage.
 *
 * Vì sao: nội dung chỉ nằm trong `useState` sẽ mất ngay khi đổi mục con,
 * đổi tab hoặc tải lại trang (component bị gỡ khỏi màn hình). Brain dump
 * có thể dài vài trăm chữ — mất là mất công 15 phút.
 *
 * Bản nháp chỉ ở trên máy này, không nằm trong file sao lưu, không đồng bộ.
 * Mọi hàm đều không bao giờ ném lỗi (trình duyệt có thể chặn localStorage).
 */

export function loadDraft<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua: đầy bộ nhớ hoặc bị chặn — form vẫn dùng được */
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
}
