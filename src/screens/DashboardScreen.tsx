/**
 * Màn hình "Thống kê".
 *
 * Bố cục: tóm tắt trước, chi tiết sau.
 *   1. Chỉ số của khoảng đang chọn (Tuần / 4 tuần / Từ đầu), mỗi dòng chỉ
 *      hiện chênh lệch kèm mũi tên và màu
 *   2. So với baseline (chỉ sau khi giai đoạn đo baseline kết thúc)
 *   3. Mức độ đều đặn trong 14 ngày
 *   4. Năng lượng check-in -> deep work
 *   5. Ba biểu đồ
 *
 * Nguyên tắc: KHÔNG BAO GIỜ hiện p-value hay "có ý nghĩa thống kê".
 * Dữ liệu một người trong vài tuần chỉ đủ để gợi ý, nên mọi con số dựa trên
 * ít dữ liệu đều ghi rõ "sơ bộ" kèm số ngày n.
 */
import { Suspense, lazy, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { DailyCheckin, FocusBlock, Prediction, ReviewLog } from "../db/types";
import { formatMinutes } from "../lib/dates";
import { useToday } from "../lib/useToday";
import {
  BASELINE_FROM,
  BASELINE_TO,
  ENERGY_MIN_DAYS,
  baselineFinished,
  baselineMetrics,
  buildSleepVsSameDayFocus,
  buildWeeklyByArea,
  buildWeeklyRetention,
  compareMetric,
  computeMetrics,
  consistency,
  daysBetween,
  earliestDate,
  energyToDeepWork,
  normalisePerWeek,
  periodRanges,
  sleepFocusCorrelation,
} from "../lib/metrics";
import type { Delta, MetricKey, MetricsInput, Period } from "../lib/metrics";

import ScreenShell from "../components/ScreenShell";
import { Card, EmptyState, SectionLabel, Tag } from "../components/ui";

// Recharts nặng — chỉ tải khi mở tab này. Xem ghi chú ở PredictionsScreen.
const Charts = lazy(() =>
  import("../components/DashboardCharts").then((m) => ({
    default: function All(props: ChartProps) {
      return (
        <>
          <ChartCard title="Giấc ngủ và deep work cùng ngày" hint="28 ngày gần nhất">
            <m.SleepVsFocusChart points={props.sleepPoints} />
            <CorrelationNote r={props.corr.r} n={props.corr.n} />
          </ChartCard>
          <ChartCard title="Deep work mỗi tuần theo area" hint="8 tuần gần nhất">
            <m.WeeklyAreaChart points={props.weeklyPoints} areas={props.areas} />
          </ChartCard>
          <ChartCard title="Tỷ lệ nhớ theo tuần" hint="thẻ đã qua ≥3 ngày">
            <m.RetentionChart points={props.retentionPoints} />
          </ChartCard>
        </>
      );
    },
  }))
);

type ChartProps = {
  sleepPoints: ReturnType<typeof buildSleepVsSameDayFocus>;
  weeklyPoints: ReturnType<typeof buildWeeklyByArea>["points"];
  areas: string[];
  retentionPoints: ReturnType<typeof buildWeeklyRetention>;
  corr: { r: number | null; n: number };
};

/* ==================== Cách hiển thị từng chỉ số ==================== */

type MetricSpec = {
  key: MetricKey;
  label: string;
  /** Đổi số thành chữ để hiện. */
  format: (v: number) => string;
  /**
   * Cách hiện phần CHÊNH LỆCH, khi khác cách hiện giá trị.
   * Ví dụ giá trị là "±15p" nhưng chênh lệch phải là "4p", không phải "±4p".
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

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Tuần" },
  { id: "4w", label: "4 tuần" },
  { id: "all", label: "Từ đầu" },
];

const ENERGY_LABELS = ["Kiệt sức", "Mệt", "Bình thường", "Sung sức", "Đỉnh cao"];

export default function DashboardScreen() {
  const today = useToday();
  const [period, setPeriod] = useState<Period>("week");

  const checkins = useLiveQuery(() => db.dailyCheckins.toArray(), [], [] as DailyCheckin[]);
  const focusBlocks = useLiveQuery(() => db.focusBlocks.toArray(), [], [] as FocusBlock[]);
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray(), [], [] as ReviewLog[]);
  const predictions = useLiveQuery(() => db.predictions.toArray(), [], [] as Prediction[]);

  const input: MetricsInput = { checkins, focusBlocks, reviewLogs, predictions };

  // Khoảng đang xem và khoảng để so sánh — luôn cùng số ngày (xem periodRanges).
  const ranges = periodRanges(period, today, earliestDate(input));
  const current = computeMetrics(input, ranges.current.from, ranges.current.to);
  const previous = ranges.previous
    ? computeMetrics(input, ranges.previous.from, ranges.previous.to)
    : null;
  const days = daysBetween(ranges.current.from, ranges.current.to).length;

  const showBaseline = baselineFinished(today);
  const baseline = showBaseline ? baselineMetrics(input) : null;
  // Baseline đã quy về mức mỗi tuần, nên khoảng hiện tại cũng phải quy như vậy.
  const currentPerWeek = normalisePerWeek(current, days);

  const con = consistency(checkins, today, 14);
  const energyRows = energyToDeepWork(checkins, focusBlocks);
  const sleepPoints = buildSleepVsSameDayFocus(checkins, focusBlocks, today, 28);
  const weekly = buildWeeklyByArea(focusBlocks, today, 8);

  const periodTabs = (
    <div className="flex shrink-0 gap-1 rounded-lg border border-line bg-surface p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriod(p.id)}
          className={
            "tap-target rounded-md px-2.5 text-sm font-medium whitespace-nowrap " +
            (period === p.id ? "bg-accent font-bold text-on-accent" : "text-ink-2")
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );

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
    <ScreenShell title="Thống kê" right={periodTabs}>
      {/* ---------- 1. Chỉ số ---------- */}
      <Card className="mb-4">
        {/* "so cùng số ngày" nói MỘT lần ở đầu mục, không lặp trên từng dòng. */}
        <SectionLabel right={previous ? `so cùng số ngày (${days})` : `${days} ngày`}>
          Chỉ số chính
        </SectionLabel>
        <div className="divide-y divide-line">
          {METRIC_SPECS.map((spec) => (
            <MetricRow
              key={spec.key}
              spec={spec}
              value={current[spec.key]}
              delta={previous ? compareMetric(spec.key, current[spec.key], previous[spec.key]) : null}
            />
          ))}
        </div>
      </Card>

      {/* ---------- 2. So với baseline ---------- */}
      {showBaseline && baseline ? (
        <Card className="mb-4">
          <SectionLabel right={`${BASELINE_FROM.slice(5)} → ${BASELINE_TO.slice(5)}`}>
            So với baseline
          </SectionLabel>
          <p className="mb-2 text-xs text-ink-2">Chỉ số cộng dồn đã quy về mức mỗi tuần.</p>
          <div className="divide-y divide-line">
            {METRIC_SPECS.map((spec) => (
              <MetricRow
                key={spec.key}
                spec={spec}
                value={currentPerWeek[spec.key]}
                delta={compareMetric(spec.key, currentPerWeek[spec.key], baseline[spec.key])}
              />
            ))}
          </div>
        </Card>
      ) : (
        <p className="mb-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-2">
          Đang đo baseline ({BASELINE_FROM.slice(5)} → {BASELINE_TO.slice(5)}). Sau{" "}
          {BASELINE_TO.slice(5)} sẽ có thêm phần so với baseline.
        </p>
      )}

      {/* ---------- 3. Đều đặn ---------- */}
      <Card className="mb-4">
        <SectionLabel>Đều đặn</SectionLabel>
        <div className="flex items-baseline gap-2">
          <span className="font-num text-3xl font-semibold text-ink">{con.logged}</span>
          <span className="text-sm text-ink-2">/ {con.total} ngày đã log</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${con.percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-2">
          Số ngày có check-in trong 14 ngày gần nhất. Nghỉ một hôm chỉ mất một hôm.
        </p>
      </Card>

      {/* ---------- 4. Năng lượng -> deep work ---------- */}
      <Card className="mb-4">
        <SectionLabel right="deep work TB / ngày">Năng lượng check-in → deep work</SectionLabel>
        <div className="divide-y divide-line">
          {energyRows.map((row) => (
            <div key={row.level} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm text-ink">
                <span className="font-num text-ink-2">{row.level}</span> · {ENERGY_LABELS[row.level - 1]}
              </span>
              <span className="flex items-center gap-2">
                {/* Chưa đủ 5 ngày: vẫn cho xem nhưng làm MỜ và ghi "sơ bộ". */}
                <span className={`font-num text-sm ${row.enough ? "font-semibold text-ink" : "text-ink-3"}`}>
                  {row.avgMinutes === null ? "—" : formatMinutes(Math.round(row.avgMinutes))}
                </span>
                {!row.enough && <Tag tone="neutral">sơ bộ (n={row.n})</Tag>}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-2">
          Cần ít nhất {ENERGY_MIN_DAYS} ngày ở một mức mới đáng để đọc.
        </p>
      </Card>

      {/* ---------- 5. Biểu đồ ---------- */}
      <Suspense
        fallback={
          <Card className="mb-4">
            <p className="py-10 text-center text-sm text-ink-3">Đang tải biểu đồ...</p>
          </Card>
        }
      >
        <Charts
          sleepPoints={sleepPoints}
          weeklyPoints={weekly.points}
          areas={weekly.areas}
          retentionPoints={buildWeeklyRetention(reviewLogs, today, 8)}
          corr={sleepFocusCorrelation(sleepPoints)}
        />
      </Suspense>
    </ScreenShell>
  );
}

/* ==================== Một dòng chỉ số ==================== */

function MetricRow({
  spec,
  value,
  delta,
}: {
  spec: MetricSpec;
  value: number | null;
  /** null = không có khoảng để so sánh (tab "Từ đầu"). */
  delta: Delta | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm text-ink-2">{spec.label}</span>
      <div className="flex items-center gap-3">
        <span className="font-num text-base font-semibold text-ink">
          {value === null ? "—" : spec.format(value)}
        </span>
        {delta && <DeltaTag delta={delta} spec={spec} />}
      </div>
    </div>
  );
}

/** Chỉ chênh lệch: mũi tên + số, tô màu theo tốt lên hay xấu đi. */
function DeltaTag({ delta, spec }: { delta: Delta; spec: MetricSpec }) {
  if (delta.diff === null) {
    return <span className="w-16 text-right text-xs text-ink-3">—</span>;
  }
  const fmt = spec.formatDelta ?? spec.format;
  const arrow = delta.diff > 0 ? "↑" : delta.diff < 0 ? "↓" : "→";
  const color =
    delta.better === true ? "text-good" : delta.better === false ? "text-bad-ink" : "text-ink-2";
  return (
    <span className={`w-16 text-right font-num text-sm font-semibold ${color}`}>
      {arrow} {fmt(Math.abs(delta.diff))}
    </span>
  );
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
      <SectionLabel right={hint}>{title}</SectionLabel>
      {children}
    </Card>
  );
}

/** Hệ số tương quan: luôn ghi "sơ bộ" và n, không bao giờ kèm p-value. */
function CorrelationNote({ r, n }: { r: number | null; n: number }) {
  return (
    <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
      {r === null ? (
        <>Chưa đủ điểm để tính hệ số tương quan (n = {n}).</>
      ) : (
        <>
          Hệ số tương quan r ={" "}
          <span className="font-num font-semibold text-ink">
            {r >= 0 ? "+" : ""}
            {r.toFixed(2)}
          </span>{" "}
          · sơ bộ (n = {n} ngày). Chỉ là gợi ý, chưa phải kết luận.
        </>
      )}
    </p>
  );
}
