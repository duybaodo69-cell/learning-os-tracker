/**
 * ScreenShell — khung chung cho mọi màn hình.
 *
 * Mọi màn hình đều có: một tiêu đề dính trên đầu, và phần nội dung cuộn được.
 * Viết 1 lần ở đây để 5 màn hình trông giống nhau và không lặp code.
 */

// `ReactNode` = "bất cứ thứ gì React hiển thị được" (chữ, thẻ, danh sách...).
import type { ReactNode } from "react";

type ScreenShellProps = {
  title: string;      // tiêu đề tiếng Việt, ví dụ "Hôm nay"
  subtitle?: string;  // dòng mô tả nhỏ bên dưới (không bắt buộc)
  /** Nội dung đặt bên phải tiêu đề (vd nút chọn khoảng thời gian). */
  right?: ReactNode;
  children: ReactNode; // nội dung của màn hình
};

export default function ScreenShell({ title, subtitle, right, children }: ScreenShellProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Thanh tiêu đề: `sticky top-0` = luôn dính ở trên khi cuộn. */}
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-4 pt-4 pb-3 backdrop-blur">
        {/* flex-wrap: nếu phần bên phải quá rộng thì xuống dòng, KHÔNG đè lên
            tiêu đề ở màn hình 390px. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-wide text-ink uppercase">
            {/* Chấm cyan nhỏ — dấu hiệu "đang ở màn hình này". */}
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            {title}
          </h1>
          {right}
        </div>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </header>

      {/* Vùng nội dung. `overflow-y-auto` = cuộn dọc khi nội dung dài. */}
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
    </div>
  );
}
