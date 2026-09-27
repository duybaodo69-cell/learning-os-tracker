/**
 * AppNav — thanh điều hướng 5 tab. MỘT thành phần cho mọi cỡ màn hình:
 *
 *   - Điện thoại (app hẹp hơn 42rem): thanh ở ĐÁY, vì ngón cái cầm máy một
 *     tay chạm tới đây dễ nhất. Màn thấp (điện thoại xoay ngang) thì icon và
 *     chữ nằm cùng hàng cho thanh mỏng lại.
 *   - Tablet / cửa sổ máy tính vừa (từ 42rem): thanh dọc hẹp bên TRÁI,
 *     icon trên chữ dưới.
 *   - Máy tính rộng (từ 72rem): thanh bên trái rộng hơn, icon cạnh chữ.
 *
 * Đổi vị trí hoàn toàn bằng CSS (container query `@2xl/app`, `@6xl/app` —
 * container `app` đặt ở App.tsx), KHÔNG đổi cây React. Nhờ vậy xoay máy hay
 * kéo cửa sổ rộng/hẹp không làm màn hình đang mở bị dựng lại, form đang gõ
 * không mất chữ.
 *
 * Mốc tính bằng rem nên ở cỡ hiển thị 150% app coi màn hình như hẹp hơn
 * (xem src/lib/uiScale.ts). Mỗi nút cao tối thiểu 44px (tap target).
 */

// `TabId` liệt kê đúng 5 tên tab hợp lệ.
// Nhờ vậy nếu gõ sai tên tab, TypeScript sẽ báo lỗi ngay khi viết code.
export type TabId = "today" | "review" | "predictions" | "dashboard" | "settings";

// Kiểu của 1 icon: nhận `active` (đang chọn hay không) và trả về hình vẽ SVG.
type IconProps = { active: boolean };

/* ---------- Các icon vẽ tay bằng SVG ----------
   Tự vẽ thay vì cài thêm thư viện icon, để dự án nhẹ và đúng tech stack.
   Khi tab đang được chọn thì tô đặc (fill), khi không thì chỉ vẽ nét. */

// h-6 = 1.5rem: icon to theo cỡ hiển thị như chữ.
function iconClass(_active: boolean) {
  return "h-6 w-6";
}

function TodayIcon({ active }: IconProps) {
  return (
    <svg className={iconClass(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

function ReviewIcon({ active }: IconProps) {
  return (
    <svg className={iconClass(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2 2 0 0 1 6 3.5h5v16H6a2 2 0 0 0-2 2z" />
      <path d="M20 5.5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PredictionsIcon({ active }: IconProps) {
  return (
    <svg className={iconClass(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </svg>
  );
}

function DashboardIcon({ active }: IconProps) {
  return (
    <svg className={iconClass(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V11M10 20V4M16 20v-6M22 20H2" />
    </svg>
  );
}

function SettingsIcon({ active }: IconProps) {
  return (
    <svg className={iconClass(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.89 1.2v.18a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-3-1.29l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.6 14.5H3.4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.29-3l-.06-.06A2 2 0 1 1 7.55 4.6l.06.06a1.7 1.7 0 0 0 2.89-1.2V3.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 3 1.29l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0 1.2 2.89h.18a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.22.9z" />
    </svg>
  );
}

/* ---------- Danh sách 5 tab ----------
   Sửa thứ tự hoặc nhãn ở đây là thanh tab tự đổi theo. */
const TABS: { id: TabId; label: string; Icon: (p: IconProps) => React.ReactElement }[] = [
  { id: "today",       label: "Hôm nay",  Icon: TodayIcon },
  { id: "review",      label: "Ôn tập",   Icon: ReviewIcon },
  { id: "predictions", label: "Dự đoán",  Icon: PredictionsIcon },
  { id: "dashboard",   label: "Thống kê", Icon: DashboardIcon },
  { id: "settings",    label: "Cài đặt",  Icon: SettingsIcon },
];

type AppNavProps = {
  activeTab: TabId;                  // tab đang mở
  onTabChange: (tab: TabId) => void; // hàm gọi khi bấm sang tab khác
  reviewBadge?: number;              // số thẻ đến hạn, hiện trên tab "Ôn tập"
};

export default function AppNav({ activeTab, onTabChange, reviewBadge = 0 }: AppNavProps) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className={
        // Điện thoại: đáy màn hình (order-last), kẻ viền trên.
        "order-last shrink-0 border-t border-line bg-canvas " +
        // Từ 42rem: cột bên trái (order-first), kẻ viền phải, tự cuộn nếu màn quá thấp.
        "@2xl/app:order-first @2xl/app:w-24 @2xl/app:overflow-y-auto @2xl/app:border-t-0 @2xl/app:border-r " +
        "@6xl/app:w-56"
      }
      // Chừa chỗ cho thanh gạt ngang ở đáy iPhone, để nút không bị che.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Tên app: chỉ hiện ở thanh bên rộng của máy tính. */}
      <p className="hidden px-5 pt-6 pb-4 text-base font-semibold tracking-tight text-ink @6xl/app:block">
        Learning OS
      </p>

      <ul className="flex @2xl/app:flex-col @2xl/app:gap-1 @2xl/app:p-2 @2xl/app:pt-4 @6xl/app:pt-0">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <li key={id} className="flex-1 @2xl/app:flex-none">
              <button
                type="button"
                onClick={() => onTabChange(id)}
                // `tap-target` đảm bảo tối thiểu 44px — quy tắc của dự án.
                className={
                  "tap-target flex w-full flex-col items-center justify-center gap-1 px-0.5 py-2 " +
                  // Màn thấp, thanh ở đáy: icon cạnh chữ cho thanh mỏng lại.
                  "@max-2xl/app:short:flex-row @max-2xl/app:short:gap-2 @max-2xl/app:short:py-1 " +
                  // Thanh bên: ô bo tròn, ô đang chọn có nền.
                  "@2xl/app:rounded-xl @2xl/app:py-2.5 " +
                  "@6xl/app:flex-row @6xl/app:justify-start @6xl/app:gap-3 @6xl/app:px-3 " +
                  (active ? "text-accent @2xl/app:bg-surface-2" : "text-ink-3 @2xl/app:hover:bg-surface")
                }
                // Cho trình đọc màn hình biết tab nào đang mở.
                aria-current={active ? "page" : undefined}
              >
                {/* Bọc icon để đặt con số nhỏ ở góc trên phải. */}
                <span className="relative shrink-0">
                  <Icon active={active} />
                  {id === "review" && reviewBadge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[1.125rem] rounded-full bg-bad px-1 text-center text-xs leading-[1.125rem] font-bold text-canvas">
                      {reviewBadge}
                    </span>
                  )}
                </span>
                {/* Chữ một dòng. Cỡ 12px ở 100%, tăng chậm hơn phần còn lại
                    (tối đa 15px ở 150%) để 5 nhãn vẫn vừa một hàng trên 390px. */}
                <span
                  className={
                    "text-[clamp(12px,0.625rem,0.75rem)] leading-none whitespace-nowrap @6xl/app:text-sm " +
                    (active ? "font-semibold" : "font-medium")
                  }
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
