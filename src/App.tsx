/**
 * App — thành phần gốc của ứng dụng.
 *
 * Giữ hai thứ:
 *   - tab nào đang mở
 *   - mục con nào đang mở trong tab "Ôn tập" (để tab Hôm nay nhảy thẳng
 *     sang brain dump chỉ bằng một lần chạm)
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import BottomNav from "./components/BottomNav";
import type { TabId } from "./components/BottomNav";

import TodayScreen from "./screens/TodayScreen";
import ReviewScreen from "./screens/ReviewScreen";
import type { ReviewView } from "./screens/ReviewScreen";
import PredictionsScreen from "./screens/PredictionsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import FocusSession from "./screens/FocusSession";
import CloudLoginDialog from "./components/CloudLoginDialog";

import { activeStore, db } from "./db/db";
import type { Card } from "./db/types";
import { todayISO } from "./lib/dates";
import { dueCount as countDue } from "./lib/scheduling";
import { getTimerStart, startTimer } from "./lib/timer";

export default function App() {
  // Mở app lên là vào thẳng tab "Hôm nay" vì đây là tab dùng nhiều nhất.
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [reviewView, setReviewView] = useState<ReviewView>("queue");

  // Mốc bắt đầu của phiên đang chạy (null = không có phiên nào).
  // Đọc từ localStorage lúc mở app, nên đóng app giữa phiên rồi mở lại
  // vẫn quay về đúng màn hình phiên.
  const [timerStart, setTimerStart] = useState<number | null>(getTimerStart);

  function handleStartTimer() {
    startTimer();
    setTimerStart(getTimerStart());
  }

  // Số thẻ đến hạn — hiện thành con số nhỏ trên tab "Ôn tập".
  // Tính ở đây (không phải trong màn hình) để badge luôn đúng kể cả khi
  // bạn đang đứng ở tab khác.
  const cards = useLiveQuery(() => db.cards.toArray(), [], [] as Card[]);
  const dueCount = countDue(cards, todayISO());

  /** Chuyển tab, có thể kèm mục con — dùng cho nút tắt ở màn hình Hôm nay. */
  function navigate(tab: TabId, view?: ReviewView) {
    setActiveTab(tab);
    if (view) setReviewView(view);
  }

  function renderScreen() {
    switch (activeTab) {
      case "today":
        return <TodayScreen onNavigate={navigate} onStartTimer={handleStartTimer} />;
      case "review":
        return (
          <ReviewScreen view={reviewView} onViewChange={setReviewView} dueCount={dueCount} />
        );
      case "predictions":
        return <PredictionsScreen />;
      case "dashboard":
        return <DashboardScreen />;
      case "settings":
        return <SettingsScreen />;
    }
  }

  // Đang có phiên -> màn hình phiên chiếm trọn, KHÔNG có thanh tab.
  if (timerStart !== null) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
        <FocusSession startedAt={timerStart} onExit={() => setTimerStart(null)} />
        {activeStore === "cloud" && <CloudLoginDialog />}
      </div>
    );
  }

  return (
    // h-dvh = cao đúng bằng màn hình thật của điện thoại
    // (tính cả khi thanh địa chỉ của trình duyệt ẩn/hiện).
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      {/* min-h-0 để phần màn hình cuộn được thay vì đẩy thanh tab xuống dưới. */}
      <div className="min-h-0 flex-1">{renderScreen()}</div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} reviewBadge={dueCount} />

      {/* Hộp đăng nhập / xác nhận đăng xuất của Dexie Cloud — chỉ ở kho cloud. */}
      {activeStore === "cloud" && <CloudLoginDialog />}
    </div>
  );
}
