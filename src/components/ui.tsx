/**
 * Các mảnh giao diện dùng lại ở nhiều nơi.
 *
 * Tất cả đều tuân quy tắc tap target tối thiểu 44px.
 * Gom vào một file để bạn dễ tìm và dễ sửa màu sắc / kích thước một chỗ.
 */
import type { ReactNode } from "react";

/* ---------------------------------------------------------- Card */

/**
 * Khung thẻ — đơn vị bố cục cơ bản của app.
 * Nền tầng 1 + viền mảnh 1px, KHÔNG đổ bóng: theo DESIGN.md, các tầng
 * được phân biệt bằng màu nền, không bằng bóng mờ.
 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-4 ${className}`}>{children}</div>
  );
}

/* ---------------------------------------------------------- SectionLabel */

/**
 * Nhãn nhỏ viết hoa ở đầu mỗi khối ("DEEP WORK HÔM NAY").
 * 12px là cỡ nhỏ nhất cho phép trong app (thiết kế gốc có 10-11px, đã bỏ).
 */
export function SectionLabel({
  children,
  right,
  className = "",
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2 flex items-baseline justify-between gap-2 ${className}`}>
      <span className="text-xs font-semibold tracking-wider text-ink-2 uppercase">{children}</span>
      {right && <span className="text-xs text-ink-3">{right}</span>}
    </div>
  );
}

/* ---------------------------------------------------------- Tag */

/**
 * Nhãn nhỏ có màu theo NGHĨA, không theo trang trí:
 *   good = tốt lên, warn = cảnh báo, bad = xấu đi,
 *   indigo = phân loại (area, category), neutral = thông tin trung tính.
 */
export function Tag({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "good" | "warn" | "bad" | "indigo" | "accent" | "neutral";
  className?: string;
}) {
  const styles = {
    good: "border-good/30 bg-good/12 text-good",
    warn: "border-warn/30 bg-warn/12 text-warn",
    bad: "border-bad/30 bg-bad/12 text-bad-ink",
    indigo: "border-indigo/40 bg-indigo/15 text-indigo-ink",
    accent: "border-accent/30 bg-accent/12 text-accent",
    neutral: "border-line bg-surface-2 text-ink-2",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles[tone]} ${className}`}
    >
      {children}
    </span>
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

/**
 * Kiểu nút theo DESIGN.md:
 *   primary   — nền cyan, chữ tối: hành động chính của màn hình
 *   secondary — nền tầng 1, viền mảnh, chữ sáng
 *   danger    — nền tầng 2, viền đỏ mờ, chữ đỏ (không tô đỏ cả nút)
 *   ghost     — trong suốt, cho thao tác phụ
 */
const BUTTON_STYLES = {
  primary: "bg-accent font-bold text-on-accent active:brightness-110",
  secondary: "border border-line bg-surface text-ink active:border-accent",
  danger: "border border-bad/40 bg-surface-2 text-bad-ink active:bg-bad/15",
  ghost: "bg-transparent text-ink-2 active:bg-surface-2",
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
      className={`tap-target rounded-lg px-4 font-semibold transition-transform active:scale-[0.99] disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
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
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
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
  labels,
}: {
  value: number | null;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
  lowLabel?: string;
  highLabel?: string;
  /** Nhãn riêng dưới TỪNG nút (5 phần tử). Có cái này thì bỏ low/high. */
  labels?: readonly string[];
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
              "tap-target min-w-0 flex-1 rounded-lg border py-1.5 font-num text-lg font-semibold " +
              (value === n
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface-2 text-ink-2 active:border-accent")
            }
          >
            <span className="block">{n}</span>
            {labels && (
              <span
                className={
                  "block truncate px-0.5 font-sans text-xs font-normal " +
                  (value === n ? "text-on-accent" : "text-ink-3")
                }
              >
                {labels[n - 1]}
              </span>
            )}
          </button>
        ))}
      </div>
      {!labels && (lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-xs text-ink-3">
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
            "tap-target rounded border px-3 text-sm font-medium " +
            (value === opt
              ? "border-accent bg-accent text-on-accent"
              : "border-line bg-surface-2 text-ink-2 active:border-accent")
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
        className="tap-target rounded-lg border border-line bg-surface-2 px-5 text-2xl font-bold text-ink-2 active:border-accent"
        aria-label="Giảm"
      >
        −
      </button>
      <span className="min-w-10 text-center font-num text-2xl font-semibold text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="tap-target rounded-lg border border-line bg-surface-2 px-5 text-2xl font-bold text-ink-2 active:border-accent"
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
      className="tap-target flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-2 text-left active:border-accent"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
      {/* Phần hình công tắc */}
      <span
        className={
          "relative h-7 w-12 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-good" : "bg-line")
        }
      >
        <span
          className={
            "absolute top-1 h-5 w-5 rounded-full bg-ink transition-all " +
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
      className="tap-target w-full rounded-lg border border-line bg-surface-2 px-3 font-num text-base font-medium text-ink focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
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
      className="tap-target w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
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
      className="w-full resize-y rounded-lg border border-line bg-surface-2 p-3 text-base leading-relaxed text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
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
    <div className="mb-4 flex gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={
            "tap-target flex-1 rounded-lg px-2 text-sm font-semibold " +
            (value === opt.id ? "bg-accent font-bold text-on-accent" : "text-ink-2")
          }
        >
          {opt.label}
          {opt.badge !== undefined && opt.badge > 0 && (
            <span className="ml-1.5 rounded-full bg-canvas/30 px-1.5 py-0.5 font-num text-xs">
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
    <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
      <p className="text-base font-medium text-ink-2">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-3">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------- Slider */

/**
 * Thanh trượt chọn số.
 * Con số hiện to ở trên để đọc được mà không cần nhìn kỹ vị trí nút trượt.
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  suffix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-center font-num text-3xl font-semibold text-accent">
        {value}
        {suffix}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // h-11 (44px) để vùng chạm đủ to theo quy tắc dự án.
        className="h-11 w-full accent-accent"
      />
      <div className="flex justify-between text-xs text-ink-3">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- DateInput */

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="tap-target w-full rounded-lg border border-line bg-surface-2 px-3 font-num text-base font-medium text-ink focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
    />
  );
}
