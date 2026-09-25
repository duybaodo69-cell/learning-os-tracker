/**
 * Màn hình 5 — "Cài đặt" (Settings).
 *
 * Xuất / nhập dữ liệu, quản lý experiments.
 * Lưu ý quy tắc dự án: mọi thao tác xoá dữ liệu đều phải có bước xác nhận trong app.
 */
import ScreenShell from "../components/ScreenShell";
import ComingSoon from "../components/ComingSoon";

export default function SettingsScreen() {
  return (
    <ScreenShell title="Cài đặt" subtitle="Xuất / nhập dữ liệu và tuỳ chọn">
      <ComingSoon
        phase={4}
        description="Xuất và nhập dữ liệu (JSON), quản lý experiments, các tuỳ chọn khác."
      />
    </ScreenShell>
  );
}
