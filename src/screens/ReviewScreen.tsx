/**
 * Màn hình "Ôn tập" — gồm 3 mục con:
 *   Ôn      : hàng đợi thẻ đến hạn hôm nay
 *   Brain dump : bài tập retrieval, tạo thẻ từ chỗ hổng
 *   Thẻ     : quản lý bộ thẻ
 *   Thi thử : ghi kết quả thi thử IELTS (Đợt 1; Đợt 2 chuyển sang tab IELTS)
 *
 * Máy tính: khung `wide`, mỗi mục con tự chia hai cột khi đủ chỗ
 * (ReviewQueue: thẻ | sắp tới; Brain dump: form | lịch sử; Kho thẻ: lưới).
 */
import ScreenShell from "../components/ScreenShell";
import { Segmented } from "../components/ui";
import ReviewQueue from "../components/ReviewQueue";
import BrainDumpView from "../components/BrainDumpView";
import CardsView from "../components/CardsView";
import MockTestView from "../components/MockTestView";

/** Ba mục con. Kiểu này được App dùng chung để chuyển thẳng từ tab Hôm nay. */
export type ReviewView = "queue" | "braindump" | "cards" | "mock";

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
      ? dueCount > 0
        ? `${dueCount} thẻ đến hạn hôm nay`
        : "Không còn thẻ đến hạn hôm nay"
      : view === "braindump"
        ? "Viết lại những gì nhớ được"
        : view === "cards"
          ? "Quản lý bộ thẻ"
          : "Kết quả thi thử IELTS";

  return (
    <ScreenShell title="Ôn tập" subtitle={subtitle} wide>
      {/* Màn rộng: thanh mục con không kéo dài hết bề ngang. */}
      <div className="@3xl/content:max-w-md">
        <Segmented
          value={view}
          onChange={onViewChange}
          options={[
            { id: "queue", label: "Ôn thẻ", badge: dueCount },
            { id: "braindump", label: "Brain dump" },
            { id: "cards", label: "Kho thẻ" },
            { id: "mock", label: "Thi thử" },
          ]}
        />
      </div>

      {view === "queue" && <ReviewQueue onOpenCards={() => onViewChange("cards")} />}
      {view === "braindump" && <BrainDumpView onOpenCards={() => onViewChange("cards")} />}
      {view === "cards" && <CardsView />}
      {view === "mock" && <MockTestView />}
    </ScreenShell>
  );
}
