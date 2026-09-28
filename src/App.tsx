/**
 * App — thành phần gốc của ứng dụng.
 *
 * Giữ hai thứ:
 *   - tab nào đang mở
 *   - mục con nào đang mở trong tab "Ôn tập" (để tab Hôm nay nhảy thẳng
 *     sang brain dump chỉ bằng một lần chạm)
 *   - màn con nào đang mở trong tab "Cài đặt" (Dự đoán, Thí nghiệm — Đợt 2
 *     chuyển chúng vào "Công cụ khác", dữ liệu giữ nguyên)
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import AppNav from "./components/AppNav";
import type { TabId } from "./components/AppNav";

import TodayScreen from "./screens/TodayScreen";
import ReviewScreen from "./screens/ReviewScreen";
import type { ReviewView } from "./screens/ReviewScreen";
import PredictionsScreen from "./screens/PredictionsScreen";
import IeltsScreen from "./screens/IeltsScreen";
import ExperimentsScreen from "./screens/ExperimentsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import FocusSession from "./screens/FocusSession";
import CloudLoginDialog from "./components/CloudLoginDialog";

import { activeStore, db } from "./db/db";
import type { Card } from "./db/types";
import { useToday } from "./lib/useToday";
import { dueCount as countDue } from "./lib/scheduling";
import { getTimerStart, startTimer } from "./lib/timer";
import { setLastArea } from "./lib/prefs";

/** Màn con của tab Cài đặt. */
type SettingsView = "main" | "predictions" | "experiments";

export default function App() {
  // Mở app lên là vào thẳng tab "Hôm nay" vì đây là tab dùng nhiều nhất.
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [reviewView, setReviewView] = useState<ReviewView>("queue");
  const [settingsView, setSettingsView] = useState<SettingsView>("main");

  // Mốc bắt đầu của phiên đang chạy (null = không có phiên nào).
  // Đọc từ localStorage lúc mở app, nên đóng app giữa phiên rồi mở lại
  // vẫn quay về đúng màn hình phiên.
  const [timerStart, setTimerStart] = useState<number | null>(getTimerStart);

  function handleStartTimer() {
    startTimer();
    setTimerStart(getTimerStart());
  }

  /** Lối tắt IELTS (tab IELTS): chọn sẵn area IELTS rồi chạy đồng hồ phiên thường. */
  function handleStartIelts() {
    setLastArea("IELTS");
    handleStartTimer();
  }

  /** Bấm một tab ở thanh điều hướng. Bấm lại "Cài đặt" thì về màn chính của nó. */
  function changeTab(tab: TabId) {
    setActiveTab(tab);
    if (tab === "settings") setSettingsView("main");
  }

  // Số thẻ đến hạn — hiện thành con số nhỏ trên tab "Ôn tập".
  // Tính ở đây (không phải trong màn hình) để badge luôn đúng kể cả khi
  // bạn đang đứng ở tab khác.
  const cards = useLiveQuery(() => db.cards.toArray(), [], [] as Card[]);
  // useToday (không phải todayISO) để badge tự sang ngày mới qua nửa đêm.
  const today = useToday();
  const dueCount = countDue(cards, today);

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
      case "ielts":
        return <IeltsScreen onStartIelts={handleStartIelts} />;
      case "dashboard":
        return <DashboardScreen />;
      case "settings":
        if (settingsView === "predictions") return <PredictionsScreen onBack={() => setSettingsView("main")} />;
        if (settingsView === "experiments") return <ExperimentsScreen onBack={() => setSettingsView("main")} />;
        return <SettingsScreen onOpen={setSettingsView} />;
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
    //
    // `@container/app`: bố cục (thanh tab dưới hay trái, một hay hai cột) dựa
    // trên BỀ RỘNG APP tính bằng rem, không phải media query — nên cỡ hiển
    // thị 150% tự chuyển sang bố cục hẹp hơn (src/lib/uiScale.ts).
    //
    // Đệm theo "vùng an toàn": app đã cài trên iPhone vẽ tràn dưới thanh
    // trạng thái và tai thỏ (viewport-fit=cover), xoay ngang thì tai thỏ nằm
    // bên trái/phải. Máy không có tai thỏ thì các giá trị này là 0.
    <div
      className="@container/app h-dvh overflow-hidden bg-canvas"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Điện thoại: cột (nội dung trên, thanh tab dưới). Từ 42rem: hàng
          (thanh tab trái). Chỉ đổi CSS, cây React giữ nguyên — xoay máy hay
          đổi cỡ cửa sổ không làm mất form đang nhập. */}
      <div className="flex h-full flex-col @2xl/app:flex-row">
        {/* min-h-0 / min-w-0 để phần màn hình cuộn được thay vì đẩy thanh tab ra ngoài. */}
        <div className="min-h-0 min-w-0 flex-1">{renderScreen()}</div>

        <AppNav activeTab={activeTab} onTabChange={changeTab} reviewBadge={dueCount} />
      </div>

      {/* Hộp đăng nhập / xác nhận đăng xuất của Dexie Cloud — chỉ ở kho cloud. */}
      {activeStore === "cloud" && <CloudLoginDialog />}
    </div>
  );
}
