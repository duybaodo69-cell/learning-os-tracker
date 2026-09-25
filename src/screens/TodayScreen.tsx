/**
 * Màn hình 1 — "Hôm nay" (Today).
 *
 * Sẽ là màn hình dùng nhiều nhất: check-in giấc ngủ/năng lượng mỗi sáng,
 * và ghi lại các khối deep work trong ngày.
 * Phase 1 (bước 4) sẽ làm phần này.
 */
import ScreenShell from "../components/ScreenShell";
import ComingSoon from "../components/ComingSoon";

export default function TodayScreen() {
  return (
    <ScreenShell title="Hôm nay" subtitle="Check-in và các khối deep work trong ngày">
      <ComingSoon
        phase={1}
        description="Check-in hằng ngày (giờ ngủ, giờ dậy, năng lượng) và ghi khối deep work."
      />
    </ScreenShell>
  );
}
