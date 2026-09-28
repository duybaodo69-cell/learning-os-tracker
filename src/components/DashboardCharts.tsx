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
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SleepVsFocusPoint, WeeklyAreaPoint, WeeklyRetentionPoint } from "../lib/metrics";
import type { ErrorWeekPoint, IeltsWeekPoint } from "../lib/ieltsStats";
import type { ErrorType } from "../lib/ielts";
import { formatBand } from "../lib/ielts";
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
const tooltipStyle = () => ({
  fontSize: px(12),
  borderRadius: 8,
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
});
/** Chữ chú thích luôn ink-2 (Recharts mặc định tô theo màu chuỗi — thiếu tương phản). */
const legendText = (value: string) => <span style={{ color: "var(--ink-2)" }}>{value}</span>;

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

/* ==================== IELTS (Đợt 3) ==================== */

/**
 * Giờ IELTS mỗi tuần (cột, trục trái) + % đúng Listening của các buổi luyện
 * (đường, trục phải). Thi thử vẽ thành chấm tròn rỗng CÙNG trục %: điểm thô
 * /40 đổi ra %, nhãn là band ≈. Đường kẻ ngang = mục tiêu 11.5 giờ.
 */
export function IeltsHoursChart({ points, targetHours }: { points: IeltsWeekPoint[]; targetHours: number }) {
  if (points.every((p) => p.hours === 0 && p.listeningPct === null && p.mockPct === null)) return <NoData />;
  const maxHours = Math.max(targetHours + 2, ...points.map((p) => Math.ceil(p.hours)));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={axis()} />
          <YAxis yAxisId="h" tick={axis()} width={px(30)} domain={[0, maxHours]} allowDecimals={false} />
          <YAxis yAxisId="pct" orientation="right" tick={axis()} width={px(40)} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value, name, item) => {
              const p = item.payload as IeltsWeekPoint;
              if (name === "Giờ IELTS") return [`${value}h`, name];
              if (name === "Thi thử") return [`${value}%${p.mockBand !== null ? ` · ≈ ${formatBand(p.mockBand)}` : ""}`, name];
              return [`${value}% · n=${p.listeningQuestions} câu${p.listeningQuestions < 20 ? " · sơ bộ" : ""}`, name];
            }}
            contentStyle={tooltipStyle()}
          />
          <Legend wrapperStyle={{ fontSize: px(12) }} formatter={legendText} />
          <ReferenceLine
            yAxisId="h"
            y={targetHours}
            stroke="var(--ink-3)"
            strokeDasharray="4 4"
            label={{ value: `${targetHours}h`, position: "insideTopLeft", fill: "var(--ink-2)", fontSize: px(12) }}
          />
          <Bar yAxisId="h" dataKey="hours" name="Giờ IELTS" fill="var(--chart-bar)" radius={[3, 3, 0, 0]} />
          {/* connectNulls: tuần không làm đề thì nối qua, không kéo đường về 0%. */}
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="listeningPct"
            name="% đúng Listening"
            stroke="var(--accent)"
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: "var(--accent)" }}
          />
          <Line
            yAxisId="pct"
            dataKey="mockPct"
            name="Thi thử"
            // Không vẽ đường nối (chỉ chấm), nhưng giữ màu để ký hiệu chú thích có màu.
            stroke="var(--accent)"
            strokeWidth={0}
            legendType="circle"
            isAnimationActive={false}
            dot={{ r: 6, stroke: "var(--accent)", strokeWidth: 2, fill: "var(--surface)" }}
          >
            <LabelList
              dataKey="mockBand"
              position="top"
              formatter={(v: unknown) => (typeof v === "number" ? `≈${formatBand(v)}` : "")}
              style={{ fill: "var(--ink)", fontSize: px(12), fontWeight: 600 }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Màu của 4 loại lỗi — theo thứ tự ①–④ / Ⓐ–Ⓓ (token trong index.css, đủ 3:1 cả hai theme). */
const ERROR_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/**
 * Xu hướng 4 loại lỗi của MỘT kỹ năng: cột chồng, đơn vị "số câu sai trên
 * 10 câu" để tuần làm nhiều đề và tuần làm ít đề so được với nhau.
 */
export function ErrorTrendChart({ points, types }: { points: ErrorWeekPoint[]; types: readonly ErrorType[] }) {
  if (points.every((p) => p.questions === 0)) return <NoData />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={axis()} />
          <YAxis tick={axis()} width={px(30)} allowDecimals={false} />
          <Tooltip
            labelFormatter={(v, payload) => {
              const p = payload?.[0]?.payload as ErrorWeekPoint | undefined;
              const n = p ? ` · n=${p.questions} câu${p.prelim ? " · sơ bộ" : ""}` : "";
              return `Tuần từ ${shortDate(String(v))}${n}`;
            }}
            formatter={(value, name) => [`${value} / 10 câu`, name]}
            contentStyle={tooltipStyle()}
          />
          <Legend wrapperStyle={{ fontSize: px(12) }} formatter={legendText} />
          {types.map((t, i) => (
            <Bar
              key={t.mark}
              dataKey={`e${i}`}
              name={`${t.mark} ${t.label}`}
              stackId="errors"
              fill={ERROR_COLORS[i]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Số ngày giữ khung 9:30 mỗi tuần (0–7), đường kẻ = đích 5/7. */
export function AnchorWeeksChart({ points, target }: { points: IeltsWeekPoint[]; target: number }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekStart" tickFormatter={shortDate} tick={axis()} />
          <YAxis tick={axis()} width={px(24)} domain={[0, 7]} ticks={[0, 3, 5, 7]} />
          <Tooltip
            labelFormatter={(v) => `Tuần từ ${shortDate(String(v))}`}
            formatter={(value) => [`${value}/7 ngày`, "Giữ khung 9:30"]}
            contentStyle={tooltipStyle()}
          />
          <ReferenceLine
            y={target}
            stroke="var(--ink-3)"
            strokeDasharray="4 4"
            label={{ value: `đích ${target}/7`, position: "insideTopLeft", fill: "var(--ink-2)", fontSize: px(12) }}
          />
          <Bar dataKey="anchorDays" name="Giữ khung 9:30" fill="var(--accent)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NoData() {
  return (
    <p className="py-10 text-center text-sm text-ink-3">Chưa đủ dữ liệu để vẽ biểu đồ.</p>
  );
}
