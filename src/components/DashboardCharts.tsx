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

/** Bảng màu cho các area. Lặp lại nếu có nhiều area hơn số màu. */
const AREA_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#475569",
];

/** "2026-09-28" -> "28/09" cho nhãn trục ngang đỡ chật. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const AXIS = { fontSize: 10, fill: "#94a3b8" };

/* ==================== 1. Giấc ngủ vs deep work hôm sau ==================== */

export function SleepVsFocusChart({ points }: { points: SleepVsFocusPoint[] }) {
  const hasData = points.some((p) => p.sleepHours !== null || p.nextDayMinutes > 0);
  if (!hasData) return <NoData />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} interval={6} />
          {/* Hai trục dọc vì hai đơn vị khác nhau: giờ và phút. */}
          <YAxis yAxisId="sleep" tick={AXIS} width={34} domain={[0, 12]} />
          <YAxis yAxisId="focus" orientation="right" tick={AXIS} width={34} />
          <Tooltip
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(value, name) =>
              name === "Ngủ (giờ)" ? [`${value}h`, name] : [`${value}p`, name]
            }
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="sleep" dataKey="sleepHours" name="Ngủ (giờ)" fill="#93c5fd" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="focus"
            type="monotone"
            dataKey="nextDayMinutes"
            name="Deep work hôm sau (phút)"
            stroke="#1d4ed8"
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
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={AXIS} />
          <YAxis tick={AXIS} width={34} />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value, name) => [`${value}p`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {/* stackId giống nhau -> các cột chồng lên nhau thành tổng của tuần. */}
          {areas.map((area, i) => (
            <Bar
              key={area}
              dataKey={area}
              stackId="total"
              fill={AREA_COLORS[i % AREA_COLORS.length]}
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
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={AXIS} />
          <YAxis tick={AXIS} width={34} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value) => [`${Math.round(Number(value))}%`, "Tỷ lệ nhớ"]}
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
          />
          {/* connectNulls: tuần không ôn thẻ nào thì nối liền qua,
              tốt hơn là để đường gãy làm tưởng tỷ lệ tụt về 0. */}
          <Line
            type="monotone"
            dataKey="retentionRate"
            stroke="#16a34a"
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
    <p className="py-10 text-center text-sm text-slate-400">Chưa đủ dữ liệu để vẽ biểu đồ.</p>
  );
}
