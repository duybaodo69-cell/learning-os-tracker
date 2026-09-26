/**
 * main.tsx — điểm khởi động của ứng dụng.
 * Tìm thẻ <div id="root"> trong index.html rồi vẽ <App /> vào đó.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ensurePersistence } from "./lib/persistence";
import { applyTheme, getTheme } from "./lib/theme";

// Áp theme đã lưu (index.html đã làm việc này sớm hơn; ở đây là lớp dự phòng).
applyTheme(getTheme());

// Xin trình duyệt đừng tự xoá dữ liệu khi máy hết chỗ.
// Chạy nền, không chặn việc hiện app. Không bao giờ ném lỗi.
void ensurePersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
