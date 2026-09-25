/**
 * main.tsx — điểm khởi động của ứng dụng.
 * Tìm thẻ <div id="root"> trong index.html rồi vẽ <App /> vào đó.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ensurePersistence } from "./lib/persistence";

// Xin trình duyệt đừng tự xoá dữ liệu khi máy hết chỗ.
// Chạy nền, không chặn việc hiện app. Không bao giờ ném lỗi.
void ensurePersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
