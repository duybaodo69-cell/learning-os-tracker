/**
 * App — thành phần gốc của ứng dụng.
 *
 * Việc duy nhất của nó lúc này: nhớ tab nào đang mở, và hiển thị màn hình tương ứng.
 * Bố cục: [màn hình chiếm hết chỗ trống] + [thanh tab dính ở đáy].
 */
import { useState } from "react";
import BottomNav from "./components/BottomNav";
import type { TabId } from "./components/BottomNav";

import TodayScreen from "./screens/TodayScreen";
import ReviewScreen from "./screens/ReviewScreen";
import PredictionsScreen from "./screens/PredictionsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";

export default function App() {
  // `useState` = ô nhớ của React.
  // `activeTab` là giá trị hiện tại, `setActiveTab` là cách đổi giá trị đó.
  // Mở app lên thì vào thẳng tab "Hôm nay" vì đây là tab dùng nhiều nhất.
  const [activeTab, setActiveTab] = useState<TabId>("today");

  // Chọn màn hình để hiển thị dựa trên tab đang mở.
  function renderScreen() {
    switch (activeTab) {
      case "today":
        return <TodayScreen />;
      case "review":
        return <ReviewScreen />;
      case "predictions":
        return <PredictionsScreen />;
      case "dashboard":
        return <DashboardScreen />;
      case "settings":
        return <SettingsScreen />;
    }
  }

  return (
    // `h-dvh` = cao đúng bằng màn hình thật của điện thoại
    // (tính cả khi thanh địa chỉ của trình duyệt ẩn/hiện).
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      {/* `min-h-0` để phần màn hình cuộn được thay vì đẩy thanh tab xuống dưới. */}
      <div className="min-h-0 flex-1">{renderScreen()}</div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
