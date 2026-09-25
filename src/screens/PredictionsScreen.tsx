/**
 * Màn hình 3 — "Dự đoán" (Predictions).
 *
 * Ghi dự đoán kèm xác suất, sau đó chốt đúng/sai và chấm điểm bằng Brier score
 * để biết mình tự tin quá mức hay quá ít.
 */
import ScreenShell from "../components/ScreenShell";
import ComingSoon from "../components/ComingSoon";

export default function PredictionsScreen() {
  return (
    <ScreenShell title="Dự đoán" subtitle="Dự đoán có xác suất, chấm bằng Brier score">
      <ComingSoon
        phase={3}
        description="Tạo dự đoán kèm xác suất, chốt kết quả, xem Brier score và biểu đồ calibration."
      />
    </ScreenShell>
  );
}
