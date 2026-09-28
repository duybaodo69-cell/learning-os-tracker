/**
 * ScreenShell — khung chung cho mọi màn hình.
 *
 * Mọi màn hình đều có: một tiêu đề dính trên đầu, và phần nội dung cuộn được.
 * Viết 1 lần ở đây để 5 màn hình trông giống nhau và không lặp code.
 *
 * Bề rộng nội dung:
 *   - điện thoại: trọn màn hình, một cột
 *   - màn rộng: nội dung nằm giữa, tối đa 42rem (dễ đọc, không kéo dài dòng)
 *   - `wide` (Ôn tập, Thống kê): tối đa 72rem, và bên trong có container
 *     `content` để các màn đó tự chia HAI CỘT khi đủ chỗ
 *     (`@3xl/content:grid-cols-2`, tức nội dung rộng >= 48rem).
 */

// `ReactNode` = "bất cứ thứ gì React hiển thị được" (chữ, thẻ, danh sách...).
import type { ReactNode } from "react";

type ScreenShellProps = {
  title: string;      // tiêu đề tiếng Việt, ví dụ "Hôm nay"
  subtitle?: string;  // dòng mô tả nhỏ bên dưới (không bắt buộc)
  /** Nội dung đặt bên phải tiêu đề (vd nút chọn khoảng thời gian). */
  right?: ReactNode;
  /** Cho phép nội dung rộng hơn để chia hai cột trên máy tính. */
  wide?: boolean;
  /**
   * Màn con (vd Dự đoán mở từ Cài đặt → Công cụ khác): hiện nút "‹ <tên>"
   * phía trên tiêu đề để quay lại. Không có = màn chính của một tab.
   */
  back?: { label: string; onClick: () => void };
  children: ReactNode; // nội dung của màn hình
};

export default function ScreenShell({ title, subtitle, right, wide = false, back, children }: ScreenShellProps) {
  // Tiêu đề và nội dung dùng CÙNG bề rộng để thẳng mép trái trên máy tính.
  const width = `mx-auto w-full px-4 @2xl/app:px-6 ${wide ? "max-w-6xl" : "max-w-2xl"}`;

  return (
    // Cả màn hình là MỘT vùng cuộn; tiêu đề dính ở trên nhờ `sticky`.
    <div className="h-full overflow-y-auto overscroll-contain">
      {/* Bản "Calm": tiêu đề viết thường kiểu câu, chữ to, không kẻ viền —
          nền tiêu đề cùng màu nền trang nên trông như một khối liền.
          Màn thấp (điện thoại xoay ngang, cỡ chữ 150%): tiêu đề cuộn đi
          cùng nội dung (`short:static`) để nhường chỗ cho nội dung. */}
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur short:static">
        <div className={`${width} ${back ? "pt-1" : "pt-5"} pb-3`}>
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              className="tap-target -ml-2 flex items-center gap-1 rounded-xl px-2 text-sm font-semibold text-accent active:bg-surface-2"
            >
              <span aria-hidden="true">‹</span> {back.label}
            </button>
          )}
          {/* flex-wrap: nếu phần bên phải quá rộng thì xuống dòng, KHÔNG đè lên
              tiêu đề ở màn hình 390px. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            {right}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
      </header>

      {/* Vùng nội dung. `@container/content`: màn `wide` hỏi bề rộng này để
          quyết định một hay hai cột. */}
      <main className={`@container/content ${width} pt-2 pb-6`}>{children}</main>
    </div>
  );
}
