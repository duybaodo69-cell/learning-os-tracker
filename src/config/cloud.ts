/**
 * Địa chỉ database Dexie Cloud.
 *
 * Có HAI database riêng:
 *   - DEV  — dùng khi chạy `npm run dev` trên máy tính (localhost). Chỉ chứa
 *            dữ liệu thử, đăng nhập bằng một email thử.
 *   - PROD — dùng trên https://learning-os-tracker.duybaodo69.workers.dev,
 *            chứa dữ liệu thật.
 * Nhờ vậy dữ liệu thử không bao giờ lẫn vào tài khoản thật (luật số 6).
 *
 * Hai địa chỉ này KHÔNG phải bí mật (trình duyệt nào mở app cũng thấy), nên
 * để thẳng trong code. Thứ bí mật là file `dexie-cloud.key` — nằm trong
 * .gitignore, không bao giờ commit.
 *
 * Chuỗi rỗng = chưa tạo database; mục Đồng bộ trong Cài đặt sẽ báo
 * "chưa cấu hình" và app chạy y như trước.
 */
const DEV_URL = "";
const PROD_URL = "";

export const CLOUD_DB_URL: string = import.meta.env.DEV ? DEV_URL : PROD_URL;
