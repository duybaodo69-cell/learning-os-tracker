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
  children: ReactNode; // nội dung của màn hình
};

export default function ScreenShell({ title, subtitle, children }: ScreenShellProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Thanh tiêu đề: `sticky top-0` = luôn dính ở trên khi cuộn. */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </header>

      {/* Vùng nội dung. `overflow-y-auto` = cuộn dọc khi nội dung dài. */}
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
    </div>
  );
}
