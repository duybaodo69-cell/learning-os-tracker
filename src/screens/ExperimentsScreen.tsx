/**
 * Thí nghiệm cá nhân — màn con của Cài đặt → "Công cụ khác" (Đợt 2).
 * Trước đây nằm thẳng trong Cài đặt; nội dung (ExperimentsManager) giữ nguyên.
 * Chip gắn nhãn A/B ở màn Hôm nay vẫn hiện khi có thí nghiệm đang chạy.
 */
import ScreenShell from "../components/ScreenShell";
import ExperimentsManager from "../components/ExperimentsManager";

export default function ExperimentsScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell title="Thí nghiệm" subtitle="So sánh hai cách làm A và B" back={{ label: "Cài đặt", onClick: onBack }}>
      <ExperimentsManager />
    </ScreenShell>
  );
}
