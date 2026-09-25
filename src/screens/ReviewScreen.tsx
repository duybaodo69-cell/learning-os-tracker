/**
 * Màn hình "Ôn tập" — gồm 3 mục con:
 *   Ôn      : hàng đợi thẻ đến hạn hôm nay
 *   Brain dump : bài tập retrieval, tạo thẻ từ chỗ hổng
 *   Thẻ     : quản lý bộ thẻ
 */
import ScreenShell from "../components/ScreenShell";
import { Segmented } from "../components/ui";
import ReviewQueue from "../components/ReviewQueue";
import BrainDumpView from "../components/BrainDumpView";
import CardsView from "../components/CardsView";

/** Ba mục con. Kiểu này được App dùng chung để chuyển thẳng từ tab Hôm nay. */
export type ReviewView = "queue" | "braindump" | "cards";

export default function ReviewScreen({
  view,
  onViewChange,
  dueCount,
}: {
  view: ReviewView;
  onViewChange: (v: ReviewView) => void;
  dueCount: number;
}) {
  const subtitle =
    view === "queue"
      ? "Thẻ đến hạn hôm nay"
      : view === "braindump"
        ? "Viết lại những gì nhớ được"
        : "Quản lý bộ thẻ";

  return (
    <ScreenShell title="Ôn tập" subtitle={subtitle}>
      <Segmented
        value={view}
        onChange={onViewChange}
        options={[
          { id: "queue", label: "Ôn", badge: dueCount },
          { id: "braindump", label: "Brain dump" },
          { id: "cards", label: "Thẻ" },
        ]}
      />

      {view === "queue" && <ReviewQueue />}
      {view === "braindump" && <BrainDumpView />}
      {view === "cards" && <CardsView />}
    </ScreenShell>
  );
}
