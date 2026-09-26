/**
 * Chọn kho dữ liệu nào để mở lúc app khởi động.
 *
 * Ba kho tách biệt hoàn toàn:
 *   "local" — learning-os        : chưa đăng nhập, chỉ nằm trên máy này
 *   "cloud" — learning-os-cloud  : đã bật đồng bộ, dữ liệu theo tài khoản
 *   "demo"  — learning-os-demo   : dữ liệu mẫu, KHÔNG BAO GIỜ đồng bộ
 *
 * Demo luôn thắng: đang bật dữ liệu mẫu thì dù đã đăng nhập vẫn mở kho demo,
 * để dữ liệu mẫu không bao giờ lọt lên tài khoản.
 * Chưa có địa chỉ database (chưa cấu hình) thì không thể dùng kho cloud.
 */
export type StoreKind = "local" | "cloud" | "demo";

export function chooseStore(demo: boolean, syncOn: boolean, cloudUrl: string): StoreKind {
  if (demo) return "demo";
  if (syncOn && cloudUrl !== "") return "cloud";
  return "local";
}

/** Tên database IndexedDB của từng kho. */
export const STORE_DB_NAME: Record<StoreKind, string> = {
  local: "learning-os",
  cloud: "learning-os-cloud",
  demo: "learning-os-demo",
};
