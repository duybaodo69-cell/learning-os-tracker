/**
 * Các mảnh giao diện dùng lại ở nhiều nơi.
 *
 * Tất cả đều tuân quy tắc tap target tối thiểu 44px.
 * Gom vào một file để bạn dễ tìm và dễ sửa màu sắc / kích thước một chỗ.
 */
import type { ReactNode } from "react";

/* ---------------------------------------------------------- Card */

/** Khung thẻ trắng bo góc — đơn vị bố cục cơ bản của app. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>
  );
}

/* ---------------------------------------------------------- Button */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

const BUTTON_STYLES = {
  primary: "bg-blue-600 text-white active:bg-blue-700",
  secondary: "bg-slate-100 text-slate-700 active:bg-slate-200",
  danger: "bg-red-600 text-white active:bg-red-700",
  ghost: "bg-transparent text-slate-500 active:bg-slate-100",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap-target rounded-xl px-4 font-semibold disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------- Field */

/** Nhãn + nội dung, dùng để bọc từng ô trong form. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------- RatingRow */

/**
 * Hàng 5 nút to để chấm điểm 1-5.
 * Bấm 1 lần là xong — không kéo thanh trượt, không gõ số.
 */
export function RatingRow({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={
              "tap-target flex-1 rounded-xl text-lg font-bold " +
              (value === n
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 active:bg-slate-200")
            }
          >
            {n}
          </button>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- ChipGroup */

/** Nhóm chip để chọn 1 giá trị trong danh sách (area, số phút...). */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={
            "tap-target rounded-full px-4 text-sm font-semibold " +
            (value === opt
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 active:bg-slate-200")
          }
        >
          {format ? format(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- Counter */

/** Bộ đếm −/+ (dùng cho số lần bị phân tâm). Không cần gõ bàn phím. */
export function Counter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="tap-target rounded-xl bg-slate-100 px-5 text-2xl font-bold text-slate-600 active:bg-slate-200"
        aria-label="Giảm"
      >
        −
      </button>
      <span className="min-w-10 text-center text-2xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="tap-target rounded-xl bg-slate-100 px-5 text-2xl font-bold text-slate-600 active:bg-slate-200"
        aria-label="Tăng"
      >
        +
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- Toggle */

/** Công tắc bật/tắt. Cả dòng đều bấm được cho dễ trúng. */
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="tap-target flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2 text-left active:bg-slate-100"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
      {/* Phần hình công tắc */}
      <span
        className={
          "relative h-7 w-12 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-blue-600" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-1 h-5 w-5 rounded-full bg-white transition-all " +
            (checked ? "left-6" : "left-1")
          }
        />
      </span>
    </button>
  );
}

/* ---------------------------------------------------------- TimeInput / TextInput */

export function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // text-base (16px) là bắt buộc: chữ nhỏ hơn thì iOS tự phóng to trang khi bấm vào.
      className="tap-target w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold"
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="tap-target w-full rounded-xl border border-slate-200 bg-white px-3 text-base"
    />
  );
}

/* ---------------------------------------------------------- TextArea */

/** Ô nhập nhiều dòng, dùng cho brain dump và nội dung thẻ. */
export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      // text-base (16px): chữ nhỏ hơn thì iOS tự phóng to trang khi bấm vào ô.
      className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-base leading-relaxed"
    />
  );
}

/* ---------------------------------------------------------- Segmented */

/** Thanh chuyển giữa các mục con trong cùng một màn hình. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={
            "tap-target flex-1 rounded-lg px-2 text-sm font-semibold " +
            (value === opt.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")
          }
        >
          {opt.label}
          {opt.badge !== undefined && opt.badge > 0 && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] text-white">
              {opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- EmptyState */

/** Thông báo khi chưa có dữ liệu. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
