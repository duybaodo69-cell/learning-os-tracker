/**
 * Ba biểu đồ của màn hình Thống kê.
 *
 * Gom vào MỘT file vì cả ba đều cần Recharts (~320KB). Một file thì
 * trình duyệt tải một lần khi bạn mở tab Thống kê, thay vì ba lần.
 * Xem DashboardScreen.tsx: file này được nạp bằng `lazy`.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SleepVsFocusPoint, WeeklyAreaPoint, WeeklyRetentionPoint } from "../lib/metrics";
import { areaColor } from "../lib/areaColors";
import { uiScaleFactor } from "../lib/uiScale";

/** Bảng màu cho các area. Lặp lại nếu có nhiều area hơn số màu. */
/* Màu area lấy từ lib/areaColors.ts — mỗi area một màu cố định trên mọi màn hình. */

/** "2026-09-28" -> "28/09" cho nhãn trục ngang đỡ chật. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Cỡ chữ / bề rộng trục tính bằng px (Recharts vẽ SVG, không hiểu rem), nên
 * nhân theo cỡ hiển thị 100/125/150% (src/lib/uiScale.ts). Tính LÚC VẼ, không
 * phải lúc nạp file, để đổi cỡ trong Cài đặt là biểu đồ theo ngay.
 */
const px = (n: number) => Math.round(n * uiScaleFactor());
const axis = () => ({ fontSize: px(12), fill: "var(--ink-2)" });

/**
 * LƯU Ý VỀ LỀ BIỂU ĐỒ:
 * Trước đây dùng margin-left âm (-18) để biểu đồ trông rộng hơn, nhưng nó
 * kéo trục Y ra ngoài khung vẽ nên nhãn dài như "300" hay "1080" bị cắt mất
 * chữ số đầu trên màn hình 390px. Giờ lề để 0 và mỗi trục Y được cho đủ
 * chiều rộng theo số chữ số lớn nhất nó có thể hiện.
 */

/* ==================== 1. Giấc ngủ vs deep work cùng ngày ==================== */

export function SleepVsFocusChart({ points }: { points: SleepVsFocusPoint[] }) {
  const hasData = points.some((p) => p.sleepHours !== null || p.sameDayMinutes > 0);
  if (!hasData) return <NoData />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={axis()} interval={6} />
          {/* Hai trục dọc vì hai đơn vị khác nhau: giờ và phút. */}
          <YAxis yAxisId="sleep" tick={axis()} width={px(30)} domain={[0, 12]} />
          <YAxis yAxisId="focus" orientation="right" tick={axis()} width={px(44)} />
          <Tooltip
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(value, name) =>
              name === "Ngủ (giờ)" ? [`${value}h`, name] : [`${value}p`, name]
            }
            contentStyle={{ fontSize: px(12), borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: px(12) }}
            // Recharts mặc định tô chữ chú thích bằng màu của chuỗi dữ liệu;
            // ép về màu chữ phụ để chữ luôn đủ tương phản.
            formatter={(value) => <span style={{ color: "var(--ink-2)" }}>{value}</span>}
          />
          <Bar yAxisId="sleep" dataKey="sleepHours" name="Ngủ (giờ)" fill="#64748b" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="focus"
            type="monotone"
            dataKey="sameDayMinutes"
            name="Deep work (phút)"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ==================== 2. Deep work mỗi tuần theo area ==================== */

export function WeeklyAreaChart({
  points,
  areas,
}: {
  points: WeeklyAreaPoint[];
  areas: string[];
}) {
  if (areas.length === 0) return <NoData />;

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={axis()} />
          {/* width 46: tổng phút cả tuần có thể tới 4 chữ số (vd 1080). */}
          <YAxis tick={axis()} width={px(46)} />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value, name) => [`${value}p`, name]}
            contentStyle={{ fontSize: px(12), borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: px(12) }}
            // Recharts mặc định tô chữ chú thích bằng màu của chuỗi dữ liệu;
            // ép về màu chữ phụ để chữ luôn đủ tương phản.
            formatter={(value) => <span style={{ color: "var(--ink-2)" }}>{value}</span>}
          />
          {/* stackId giống nhau -> các cột chồng lên nhau thành tổng của tuần. */}
          {areas.map((area) => (
            <Bar
              key={area}
              dataKey={area}
              stackId="total"
              fill={areaColor(area)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ==================== 3. Tỷ lệ nhớ theo tuần ==================== */

export function RetentionChart({ points }: { points: WeeklyRetentionPoint[] }) {
  if (points.every((p) => p.retentionRate === null)) return <NoData />;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={axis()} />
          <YAxis tick={axis()} width={px(36)} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value) => [`${Math.round(Number(value))}%`, "Tỷ lệ nhớ"]}
            contentStyle={{ fontSize: px(12), borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink)" }}
          />
          {/* connectNulls: tuần không ôn thẻ nào thì nối liền qua,
              tốt hơn là để đường gãy làm tưởng tỷ lệ tụt về 0. */}
          <Line
            type="monotone"
            dataKey="retentionRate"
            stroke="var(--good)"
            strokeWidth={2}
            connectNulls
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function NoData() {
  return (
    <p className="py-10 text-center text-sm text-ink-3">Chưa đủ dữ liệu để vẽ biểu đồ.</p>
  );
}
