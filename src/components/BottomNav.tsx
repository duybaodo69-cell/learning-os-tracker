/**
 * BottomNav — thanh điều hướng 5 tab ở đáy màn hình.
 *
 * Để ở đáy vì ngón cái cầm điện thoại 1 tay chạm tới đây dễ nhất.
 * Mỗi nút cao tối thiểu 44px (quy tắc tap target của dự án).
 */

// `TabId` liệt kê đúng 5 tên tab hợp lệ.
// Nhờ vậy nếu gõ sai tên tab, TypeScript sẽ báo lỗi ngay khi viết code.
export type TabId = "today" | "review" | "predictions" | "dashboard" | "settings";

// Kiểu của 1 icon: nhận `active` (đang chọn hay không) và trả về hình vẽ SVG.
type IconProps = { active: boolean };

/* ---------- Các icon vẽ tay bằng SVG ----------
   Tự vẽ thay vì cài thêm thư viện icon, để dự án nhẹ và đúng tech stack.
   Khi tab đang được chọn thì tô đặc (fill), khi không thì chỉ vẽ nét. */

function iconClass(active: boolean) {
  return active ? "h-6 w-6" : "h-6 w-6";
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

type BottomNavProps = {
  activeTab: TabId;                  // tab đang mở
  onTabChange: (tab: TabId) => void; // hàm gọi khi bấm sang tab khác
  reviewBadge?: number;              // số thẻ đến hạn, hiện trên tab "Ôn tập"
};

export default function BottomNav({ activeTab, onTabChange, reviewBadge = 0 }: BottomNavProps) {
  return (
    <nav
      className="border-t border-line bg-canvas"
      // `pb-[env(safe-area-inset-bottom)]`: chừa chỗ cho thanh gạt ngang
      // ở đáy iPhone, để nút không bị che.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onTabChange(id)}
                // `tap-target` đảm bảo tối thiểu 44px — quy tắc của dự án.
                className={
                  "tap-target flex w-full flex-col items-center justify-center gap-1 px-1 py-2 " +
                  (active ? "text-accent" : "text-ink-3")
                }
                // Cho trình đọc màn hình biết tab nào đang mở.
                aria-current={active ? "page" : undefined}
              >
                {/* Bọc icon để đặt con số nhỏ ở góc trên phải. */}
                <span className="relative">
                  <Icon active={active} />
                  {id === "review" && reviewBadge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] rounded-full bg-bad px-1 text-xs leading-[18px] font-bold text-canvas">
                      {reviewBadge}
                    </span>
                  )}
                </span>
                <span className={"text-xs leading-none " + (active ? "font-semibold" : "font-medium")}>
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
