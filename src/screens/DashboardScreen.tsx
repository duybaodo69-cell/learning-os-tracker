/**
 * Màn hình 4 — "Thống kê" (Dashboard).
 *
 * Biểu đồ tổng hợp: giờ deep work, giấc ngủ, độ tập trung theo thời gian.
 */
import ScreenShell from "../components/ScreenShell";
import ComingSoon from "../components/ComingSoon";

export default function DashboardScreen() {
  return (
    <ScreenShell title="Thống kê" subtitle="Xu hướng theo tuần và theo area">
      <ComingSoon
        phase={4}
        description="Biểu đồ giờ deep work, giấc ngủ, độ tập trung; review hằng tuần và experiments."
      />
    </ScreenShell>
  );
}
