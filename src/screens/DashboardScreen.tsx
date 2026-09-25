/**
 * Màn hình "Thống kê".
 *
 * Bố cục: tóm tắt trước, chi tiết sau.
 *   1. Bảng chỉ số tuần này so với tuần trước (và so với baseline nếu đã qua)
 *   2. Mức độ đều đặn trong 14 ngày
 *   3. Ba biểu đồ
 */
import { Suspense, lazy } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { DailyCheckin, FocusBlock, Prediction, ReviewLog } from "../db/types";
import { formatMinutes } from "../lib/dates";
import { useToday } from "../lib/useToday";
import { addDays } from "../lib/scheduling";
import {
  BASELINE_FROM,
  BASELINE_TO,
  baselineFinished,
  baselineMetrics,
  buildSleepVsNextDayFocus,
  buildWeeklyByArea,
  buildWeeklyRetention,
  compareMetric,
  computeMetrics,
  consistency,
  mondayOf,
} from "../lib/metrics";
import type { MetricKey, MetricSet, MetricsInput } from "../lib/metrics";

import ScreenShell from "../components/ScreenShell";
import { Card, EmptyState } from "../components/ui";

// Recharts nặng — chỉ tải khi mở tab này. Xem ghi chú ở PredictionsScreen.
const Charts = lazy(() => import("../components/DashboardCharts").then((m) => ({
  default: function All(props: ChartProps) {
    return (
      <>
        <ChartCard title="Giấc ngủ và deep work hôm sau" hint="28 ngày gần nhất">
          <m.SleepVsFocusChart points={props.sleepPoints} />
        </ChartCard>
        <ChartCard title="Deep work mỗi tuần theo area" hint="8 tuần gần nhất">
          <m.WeeklyAreaChart points={props.weeklyPoints} areas={props.areas} />
        </ChartCard>
        <ChartCard title="Tỷ lệ nhớ theo tuần" hint="chỉ tính thẻ đã qua 3 ngày trở lên">
          <m.RetentionChart points={props.retentionPoints} />
        </ChartCard>
      </>
    );
  },
})));

type ChartProps = {
  sleepPoints: ReturnType<typeof buildSleepVsNextDayFocus>;
  weeklyPoints: ReturnType<typeof buildWeeklyByArea>["points"];
  areas: string[];
  retentionPoints: ReturnType<typeof buildWeeklyRetention>;
};

/* ==================== Cách hiển thị từng chỉ số ==================== */

type MetricSpec = {
  key: MetricKey;
  label: string;
  /** Đổi số thành chữ để hiện. */
  format: (v: number) => string;
  /**
   * Cách hiện phần CHÊNH LỆCH, khi khác cách hiện giá trị.
   * Ví dụ giá trị là "±15p" nhưng chênh lệch phải là "+4p",
   * không thể là "+±4p".
   */
  formatDelta?: (v: number) => string;
};

const METRIC_SPECS: MetricSpec[] = [
  { key: "avgSleepHours", label: "Ngủ trung bình", format: (v) => `${v.toFixed(1)}h` },
  {
    key: "wakeTimeSdMinutes",
    label: "Giờ dậy lệch",
    format: (v) => `±${Math.round(v)}p`,
    formatDelta: (v) => `${Math.round(v)}p`,
  },
  { key: "deepWorkMinutes", label: "Deep work", format: (v) => formatMinutes(Math.round(v)) },
  { key: "avgDistractionsPerBlock", label: "Phân tâm / block", format: (v) => v.toFixed(1) },
  { key: "cardsReviewed", label: "Lượt ôn thẻ", format: (v) => String(Math.round(v)) },
  { key: "retentionRate", label: "Tỷ lệ nhớ", format: (v) => `${Math.round(v)}%` },
  { key: "brier30", label: "Brier (30 ngày)", format: (v) => v.toFixed(3) },
];

export default function DashboardScreen() {
  const today = useToday();

  const checkins = useLiveQuery(() => db.checkins.toArray(), [], [] as DailyCheckin[]);
  const focusBlocks = useLiveQuery(() => db.focusBlocks.toArray(), [], [] as FocusBlock[]);
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray(), [], [] as ReviewLog[]);
  const predictions = useLiveQuery(() => db.predictions.toArray(), [], [] as Prediction[]);

  const input: MetricsInput = { checkins, focusBlocks, reviewLogs, predictions };

  // Tuần này = Thứ Hai tới hôm nay (chưa hết tuần thì chưa tính cả tuần).
  const thisMonday = mondayOf(today);
  const lastMonday = addDays(thisMonday, -7);

  const thisWeek = computeMetrics(input, thisMonday, today);
  const lastWeek = computeMetrics(input, lastMonday, addDays(lastMonday, 6));

  const showBaseline = baselineFinished(today);
  const baseline = showBaseline ? baselineMetrics(input) : null;

  const con = consistency(checkins, today, 14);

  const nothingYet =
    checkins.length === 0 && focusBlocks.length === 0 && reviewLogs.length === 0;

  if (nothingYet) {
    return (
      <ScreenShell title="Thống kê" subtitle="Xu hướng theo tuần">
        <EmptyState
          title="Chưa có dữ liệu"
          hint="Check-in và ghi vài khối deep work ở tab Hôm nay, rồi quay lại đây"
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Thống kê" subtitle={`Tuần từ ${thisMonday.slice(8)}/${thisMonday.slice(5, 7)}`}>
      {/* ---------- 1. Bảng chỉ số ---------- */}
      <Card className="mb-4">
        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Tuần này so với tuần trước
        </div>

        <div className="divide-y divide-slate-100">
          {METRIC_SPECS.map((spec) => (
            <MetricRow
              key={spec.key}
              spec={spec}
              current={thisWeek[spec.key]}
              previous={lastWeek[spec.key]}
              baseline={baseline ? baseline[spec.key] : null}
              showBaseline={showBaseline}
            />
          ))}
        </div>

        {showBaseline ? (
          <p className="mt-3 text-xs text-slate-400">
            Cột thứ ba so với baseline ({BASELINE_FROM.slice(5)} → {BASELINE_TO.slice(5)}), đã quy
            về mức mỗi tuần.
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Đang trong giai đoạn đo baseline ({BASELINE_FROM.slice(5)} → {BASELINE_TO.slice(5)}).
            Sau {BASELINE_TO.slice(5)} mỗi chỉ số sẽ có thêm phần so với baseline.
          </p>
        )}
      </Card>

      {/* ---------- 2. Đều đặn ---------- */}
      <Card className="mb-4">
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Đều đặn</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 tabular-nums">{con.logged}</span>
          <span className="text-sm text-slate-500">/ {con.total} ngày đã log</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${con.percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Đếm số ngày có check-in trong 14 ngày gần nhất. Nghỉ một hôm chỉ mất một hôm — không có
          chuỗi nào bị xoá về 0.
        </p>
      </Card>

      {/* ---------- 3. Biểu đồ ---------- */}
      <Suspense
        fallback={
          <Card className="mb-4">
            <p className="py-10 text-center text-sm text-slate-400">Đang tải biểu đồ...</p>
          </Card>
        }
      >
        <Charts
          sleepPoints={buildSleepVsNextDayFocus(checkins, focusBlocks, today, 28)}
          weeklyPoints={buildWeeklyByArea(focusBlocks, today, 8).points}
          areas={buildWeeklyByArea(focusBlocks, today, 8).areas}
          retentionPoints={buildWeeklyRetention(reviewLogs, today, 8)}
        />
      </Suspense>
    </ScreenShell>
  );
}

/* ==================== Một dòng chỉ số ==================== */

function MetricRow({
  spec,
  current,
  previous,
  baseline,
  showBaseline,
}: {
  spec: MetricSpec;
  current: MetricSet[MetricKey];
  previous: MetricSet[MetricKey];
  baseline: number | null;
  showBaseline: boolean;
}) {
  const vsLast = compareMetric(spec.key, current, previous);
  const vsBase = compareMetric(spec.key, current, baseline);

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm text-slate-600">{spec.label}</span>
      <div className="flex items-center gap-3">
        <span className="text-base font-bold text-slate-900 tabular-nums">
          {current === null ? "—" : spec.format(current)}
        </span>
        <DeltaTag delta={vsLast} spec={spec} width="w-16" />
        {showBaseline && <DeltaTag delta={vsBase} spec={spec} width="w-16" />}
      </div>
    </div>
  );
}

/** Ô nhỏ hiện chênh lệch, tô màu theo tốt lên hay xấu đi. */
function DeltaTag({
  delta,
  spec,
  width,
}: {
  delta: ReturnType<typeof compareMetric>;
  spec: MetricSpec;
  width: string;
}) {
  if (delta.diff === null) {
    return <span className={`${width} text-right text-xs text-slate-300`}>—</span>;
  }

  const sign = delta.diff > 0 ? "+" : "−";
  const fmt = spec.formatDelta ?? spec.format;
  const text = `${sign}${fmt(Math.abs(delta.diff))}`;

  const color =
    delta.better === true
      ? "text-green-600"
      : delta.better === false
        ? "text-red-500"
        : "text-slate-400";

  return <span className={`${width} text-right text-xs font-semibold ${color}`}>{text}</span>;
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}
