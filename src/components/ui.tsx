/**
 * Các mảnh giao diện dùng lại ở nhiều nơi.
 *
 * Tất cả đều tuân quy tắc tap target tối thiểu 44px.
 * Gom vào một file để bạn dễ tìm và dễ sửa màu sắc / kích thước một chỗ.
 */
import { useState, type ReactNode } from "react";

/* ---------------------------------------------------------- Card */

/**
 * Khung thẻ — đơn vị bố cục cơ bản của app.
 * Bản "Calm" (Stitch 2026-09): bo tròn 16px, viền rất mờ, KHÔNG đổ bóng —
 * các tầng phân biệt bằng màu nền. Viền vẫn giữ một chút để nền sáng
 * (thẻ trắng trên nền xám rất nhạt) không bị nhoè vào nhau.
 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line/70 bg-surface p-4 ${className}`}>{children}</div>
  );
}

/* ---------------------------------------------------------- SectionLabel */

/**
 * Nhãn ở đầu mỗi khối ("Deep work hôm nay").
 * Viết thường kiểu câu (không IN HOA giãn chữ) cho đỡ rối mắt.
 * Chữ phụ bên phải tối thiểu 12px.
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
      <span className="text-sm font-medium text-ink-2">{children}</span>
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
    good: "bg-good/12 text-good",
    warn: "bg-warn/12 text-warn",
    bad: "bg-bad/12 text-bad-ink",
    indigo: "bg-indigo/15 text-indigo-ink",
    accent: "bg-accent/12 text-accent",
    neutral: "bg-surface-2 text-ink-2",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles[tone]} ${className}`}
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
 *   primary   — nền cyan, chữ tối: hành động chính (MỘT nút mỗi màn hình)
 *   secondary — nền tầng 2, không viền, chữ đậm
 *   danger    — nền đỏ rất nhạt, chữ đỏ (không tô đỏ cả nút)
 *   ghost     — trong suốt, cho thao tác phụ
 */
const BUTTON_STYLES = {
  primary: "bg-accent font-bold text-on-accent active:brightness-110",
  secondary: "bg-surface-2 text-ink active:bg-line",
  danger: "bg-bad/10 text-bad-ink active:bg-bad/20",
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
      className={`tap-target rounded-xl px-4 font-semibold transition-transform active:scale-[0.99] disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
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
              "tap-target min-w-0 flex-1 rounded-xl py-1.5 font-num text-lg font-semibold " +
              (value === n ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 active:bg-line")
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

/**
 * Nhóm chip để chọn 1 giá trị trong danh sách (area, số phút...).
 * `scroll` = xếp MỘT hàng vuốt ngang thay vì nhiều hàng — dùng cho danh sách
 * dài như 10 area, để không chiếm nửa màn hình. Chip đang chọn tự cuộn vào
 * tầm nhìn khi mở màn hình.
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  format,
  scroll = false,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  scroll?: boolean;
}) {
  return (
    <div
      className={
        scroll
          ? // -mx-4 px-4: hàng chip chạy sát mép thẻ, gợi ý "vuốt được".
            "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-wrap gap-2"
      }
    >
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          ref={
            scroll && value === opt
              ? (el) => el?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
              : undefined
          }
          aria-pressed={value === opt}
          className={
            "tap-target shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap " +
            (value === opt ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 active:bg-line")
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
        className="tap-target rounded-xl bg-surface-2 px-5 text-2xl font-bold text-ink-2 active:bg-line"
        aria-label="Giảm"
      >
        −
      </button>
      <span className="min-w-10 text-center font-num text-2xl font-semibold text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="tap-target rounded-xl bg-surface-2 px-5 text-2xl font-bold text-ink-2 active:bg-line"
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
      className="tap-target flex w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2 text-left active:bg-line"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
      <SwitchKnob checked={checked} />
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
      className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 font-num text-base font-medium text-ink focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
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
      className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
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
      className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3 text-base leading-relaxed text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
    />
  );
}

/* ---------------------------------------------------------- Segmented */

/**
 * Thanh chuyển giữa các mục con trong cùng một màn hình.
 * Mục đang chọn là một ô sáng hơn với chữ màu nhấn — KHÔNG tô cyan cả ô,
 * vì màn hình chỉ nên có một khối cyan đặc là nút hành động chính.
 */
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
    <div className="mb-4 flex gap-1 rounded-xl bg-track p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={
            "tap-target flex-1 rounded-lg px-2 text-sm font-semibold " +
            (value === opt.id ? "bg-thumb text-accent shadow-sm" : "text-ink-2")
          }
        >
          {opt.label}
          {opt.badge !== undefined && opt.badge > 0 && (
            <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 font-num text-xs text-on-accent">
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
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
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
      className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 font-num text-base font-medium text-ink focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
    />
  );
}

/* ---------------------------------------------------------- SwitchKnob */

/**
 * Hình công tắc (chỉ phần vẽ). Bật = rãnh màu nhấn, nút tròn trắng.
 * Dùng chung cho Toggle và các dòng cài đặt.
 */
export function SwitchKnob({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "relative h-7 w-12 shrink-0 rounded-full transition-colors " +
        (checked ? "bg-accent" : "bg-ink-3/45")
      }
    >
      <span
        className={
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all " +
          (checked ? "left-6" : "left-1")
        }
      />
    </span>
  );
}

/* ---------------------------------------------------------- ListGroup / ListRow */

/**
 * Nhóm danh sách kiểu cài đặt iPhone: một thẻ bo tròn, các dòng ngăn bằng
 * đường kẻ mảnh. Có nhãn nhóm phía trên (tuỳ chọn).
 */
export function ListGroup({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-5 ${className}`}>
      {label && <h2 className="mb-2 px-1 text-sm font-medium text-ink-2">{label}</h2>}
      <div className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {children}
      </div>
    </section>
  );
}

/**
 * Một dòng trong ListGroup: nhãn bên trái, giá trị + mũi tên bên phải.
 *   - có `onClick`  -> cả dòng là một nút (cao >= 52px)
 *   - có `checked`  -> dòng là công tắc bật/tắt
 *   - `open`        -> mũi tên xoay xuống (dòng mở/gập nội dung)
 */
export function ListRow({
  label,
  description,
  value,
  valueTone = "muted",
  onClick,
  checked,
  open,
  chevron = true,
}: {
  label: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  valueTone?: "muted" | "warn" | "good" | "accent";
  onClick?: () => void;
  checked?: boolean;
  open?: boolean;
  chevron?: boolean;
}) {
  const toneClass = {
    muted: "text-ink-2",
    warn: "text-warn",
    good: "text-good",
    accent: "text-accent",
  }[valueTone];
  const isSwitch = checked !== undefined;

  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-3">{description}</span>}
      </span>
      {value !== undefined && (
        <span className={`shrink-0 text-right text-sm ${toneClass}`}>{value}</span>
      )}
      {isSwitch ? (
        <SwitchKnob checked={checked} />
      ) : (
        onClick &&
        chevron && (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={"h-4 w-4 shrink-0 text-ink-3 transition-transform " + (open ? "rotate-90" : "")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
          </svg>
        )
      )}
    </>
  );

  const rowClass = "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left";
  if (!onClick) return <div className={rowClass}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      role={isSwitch ? "switch" : undefined}
      aria-checked={isSwitch ? checked : undefined}
      aria-expanded={open}
      className={`${rowClass} active:bg-surface-2`}
    >
      {body}
    </button>
  );
}

/* ---------------------------------------------------------- Notice */

/**
 * Dòng nhắc MẢNH (thay cho hộp vàng to): biểu tượng nhỏ + một câu + nút chữ.
 * Mỗi màn hình chỉ nên có tối đa một dòng như vậy.
 */
export function Notice({
  children,
  tone = "warn",
  action,
  onAction,
  className = "",
}: {
  children: ReactNode;
  tone?: "warn" | "info";
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`mb-4 flex min-h-[48px] items-center gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-2 ${className}`}
    >
      <span aria-hidden="true" className={"shrink-0 text-base " + (tone === "warn" ? "text-warn" : "text-accent")}>
        {tone === "warn" ? "⚠" : "ⓘ"}
      </span>
      <span className="min-w-0 flex-1 text-sm text-ink-2">{children}</span>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="tap-target -mr-2 shrink-0 rounded-lg px-2 text-sm font-semibold text-accent active:bg-surface-2"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Disclosure */

/**
 * Khối gập/mở: mặc định chỉ hiện một dòng tiêu đề + mũi tên, bấm mới mở
 * nội dung. Dùng cho phần ít xem (vd biểu đồ phụ ở Thống kê) cho đỡ rối.
 */
export function Disclosure({
  title,
  right,
  children,
  defaultOpen = false,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-line/70 bg-surface">
      <ListRow label={title} value={right} onClick={() => setOpen(!open)} open={open} />
      {open && <div className="border-t border-line/70 p-4">{children}</div>}
    </div>
  );
}
