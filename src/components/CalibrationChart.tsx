/**
 * Biểu đồ calibration.
 *
 * CÁCH ĐỌC:
 *   Trục ngang = xác suất BẠN NÓI.
 *   Trục dọc   = tỷ lệ THỰC TẾ đã xảy ra.
 *   Đường chéo = calibrated hoàn hảo.
 *
 *   Chấm NẰM DƯỚI đường chéo -> bạn nói cao hơn thực tế (quá tự tin).
 *   Chấm NẰM TRÊN đường chéo -> bạn nói thấp hơn thực tế (quá dè dặt).
 *
 * Kích thước chấm theo số dự đoán trong khoảng: chấm to đáng tin hơn chấm nhỏ.
 */
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { CalibrationBucket } from "../lib/calibration";

export default function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  // Chỉ vẽ khoảng nào thật sự có dữ liệu.
  const points = buckets
    .filter((b) => b.count > 0 && b.statedAverage !== null && b.actualRate !== null)
    .map((b) => ({
      stated: b.statedAverage as number,
      actual: b.actualRate as number,
      count: b.count,
      label: b.label,
    }));

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-3">
        Chưa có dự đoán nào được chấm, nên chưa vẽ được biểu đồ.
      </p>
    );
  }

  return (
    // aspect-square vì hai trục cùng đơn vị (%) — vuông thì đường chéo
    // mới đúng 45 độ và mắt mới so sánh được.
    <div className="aspect-square w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey="stated"
            name="Bạn nói"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fontSize: 12, fill: "var(--ink-2)" }}
            label={{ value: "Bạn nói (%)", position: "insideBottom", offset: -14, fontSize: 12, fill: "var(--ink-2)" }}
          />
          <YAxis
            type="number"
            dataKey="actual"
            name="Thực tế"
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fontSize: 12, fill: "var(--ink-2)" }}
            width={34}
            label={{ value: "Thực tế (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--ink-2)" }}
          />
          {/* Kích thước chấm theo số lượng dự đoán trong khoảng. */}
          <ZAxis type="number" dataKey="count" range={[60, 400]} />

          {/* Đường chéo: calibrated hoàn hảo. */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ]}
            stroke="var(--ink-3)"
            strokeDasharray="4 4"
          />

          <Scatter data={points} fill="var(--accent)" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
