import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/** Ngày build, hiện ở dòng "Phiên bản" trong Cài đặt. */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// Cấu hình Vite — công cụ chạy dev server và đóng gói app.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),      // cho phép viết React + JSX
    tailwindcss(), // bật Tailwind CSS

    /**
     * Biến app thành PWA: cài được vào màn hình chính và mở được khi mất mạng.
     *
     * Chú ý: dữ liệu của bạn VỐN ĐÃ nằm trong máy (IndexedDB). Phần offline
     * ở đây chỉ lo phần "vỏ" app — file HTML, JS, CSS, icon. Ghép hai thứ lại
     * thì app chạy trọn vẹn khi không có mạng, không phải chỉ hiện trang trắng.
     */
    VitePWA({
      // autoUpdate: có bản mới thì tự cập nhật ở lần mở sau,
      // không hỏi han gì. Dòng "Phiên bản" trong Cài đặt cho bạn biết
      // mình đang chạy bản ngày nào.
      registerType: "autoUpdate",

      // Đưa icon và favicon vào danh sách file được lưu sẵn.
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon-64.png"],

      manifest: {
        name: "Learning OS",
        short_name: "LearnOS",
        description: "Theo dõi việc học: check-in, deep work, ôn tập, dự đoán",
        lang: "vi",
        // standalone: mở ra không có thanh địa chỉ, trông như app thật.
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        background_color: "#0c0e12",
        theme_color: "#0c0e12",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            // maskable: Android cắt icon theo hình của hệ thống (tròn, vuông
            // bo góc...). Bản này chừa lề nên cắt kiểu gì cũng không mất cột.
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // Lưu sẵn toàn bộ phần vỏ app để mở được khi mất mạng.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // Mở một đường dẫn lạ lúc offline thì trả về index.html,
        // để React tự xử lý thay vì báo lỗi không có mạng.
        navigateFallback: "index.html",
        // Biểu đồ (Recharts) là chunk riêng khoảng 300KB — vẫn muốn lưu sẵn
        // để tab Thống kê dùng được offline. Mặc định workbox bỏ qua file > 2MB,
        // nới lên 4MB cho chắc.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },

      // Cho phép thử PWA ngay trên dev server bằng `npm run dev`.
      devOptions: { enabled: false },
    }),
  ],

  define: {
    // Nhúng ngày build thành hằng số trong mã nguồn.
    // Phải JSON.stringify, nếu không Vite dán vào thành biến chứ không phải chuỗi.
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },

  server: {
    // host: true = cho phép mở app từ điện thoại trong cùng mạng Wi-Fi,
    // không chỉ từ máy tính này.
    host: true,
    port: 5173,
  },
});
