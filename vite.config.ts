import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Ngày + giờ build (giờ Việt Nam), hiện ở dòng "Phiên bản" trong Cài đặt.
 * Có giờ để phân biệt hai lần deploy trong cùng một ngày — chỉ ngày thì
 * không biết điện thoại đã lên bản mới chưa. Dạng "2026-09-29 10:42".
 */
const BUILD_DATE = new Date()
  .toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", hour12: false })
  .slice(0, 16);

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
        // "any": cho phép xoay ngang. Màn Phiên tập trung có giao diện ngang
        // (đồng hồ | nút bấm) và cảnh nền; khoá "portrait" ở đây sẽ làm app
        // đã cài KHÔNG BAO GIỜ xoay được trên Android.
        orientation: "any",
        start_url: "/",
        scope: "/",
        background_color: "#060c18",
        theme_color: "#060c18",
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
        // Thêm ảnh nền tĩnh (poster + thumbnail, tổng ~0.8MB) để khi mất mạng
        // màn Phiên tập trung vẫn có nền. VIDEO nền (~16MB) cố ý KHÔNG lưu
        // sẵn: quá nặng để tải về máy mỗi lần cập nhật app. Offline thì nền
        // tự rơi về ảnh tĩnh (xem FocusBackdrop.tsx).
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}", "backgrounds/*.jpg"],
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

  test: {
    // audit/ chứa các phép thử của đợt audit 27/09/2026: chúng khẳng định LỖI
    // cũ còn tồn tại, nên sau khi sửa sẽ báo đỏ. Test đúng nằm cạnh mã nguồn
    // (src/**/*.test.ts[x]); audit/ chỉ để đối chiếu, không chạy trong npm test.
    exclude: [...configDefaults.exclude, "audit/**"],
  },
});
