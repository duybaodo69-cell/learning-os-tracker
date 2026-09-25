import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Cấu hình Vite — công cụ chạy dev server và đóng gói app.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),      // cho phép viết React + JSX
    tailwindcss() // bật Tailwind CSS
  ],
  server: {
    // host: true = cho phép mở app từ điện thoại trong cùng mạng Wi-Fi,
    // không chỉ từ máy tính này.
    host: true,
    port: 5173,
  },
});
