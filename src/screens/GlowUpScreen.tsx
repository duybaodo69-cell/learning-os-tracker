/**
 * Màn "Glow-up 12 tuần" (PRODUCT.md mục 10, G4). Mở từ thẻ Glow-up trên
 * Hôm nay và từ Cài đặt; nút "‹" quay lại nơi đã mở.
 *
 * Ba phần:
 *   - Lịch: tuần này (buổi từng ngày, bài gym) + 12 tuần với mốc kiểm tra,
 *     số ngày đạt và số check-in của các tuần đã qua
 *   - Số đo: biểu đồ cân và vòng bụng (hai biểu đồ riêng) + bảng số
 *   - Buổi tập: mọi buổi đã ghi, bấm để sửa / xoá (trên Hôm nay chỉ sửa được hôm nay)
 */
import { Suspense, lazy, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { GYM, PHASE_LABELS, SESSION_LABELS, WARMUP, WEEKS, WEEK_TEMPLATE } from "../config/glowUp";
import { db } from "../db/db";
import type { BodyCheckin, DailyCheckin, GlowDay, Workout } from "../db/types";
import { formatMinutes, formatShortDate } from "../lib/dates";
import {
  bodySeries,
  formatKg,
  planFor,
  programWeek,
  setsFor,
  weekMetCount,
  weekTitle,
  weekdayIndex,
  type BodyWeekPoint,
} from "../lib/glowUp";
import { mondayOf } from "../lib/metrics";
import { addDays } from "../lib/scheduling";
import { useToday } from "../lib/useToday";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import WorkoutForm from "../components/WorkoutForm";
import { Button, Card, EmptyState, SectionLabel, Segmented, Tag } from "../components/ui";

type View = "schedule" | "body" | "workouts";

const DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
const ddmm = (iso: string) => formatShortDate(iso).slice(0, 5);
/** Danh sách buổi tập: mỗi lần "Xem thêm" hiện thêm bấy nhiêu buổi. */
const PAGE = 20;

// Recharts nặng: dùng chung chunk với Thống kê, chỉ tải khi mở phần "Số đo".
const BodyCharts = lazy(() =>
  import("../components/DashboardCharts").then((m) => ({
    default: function Body({ points }: { points: BodyWeekPoint[] }) {
      return (
        <>
          <Card className="mb-3">
            <SectionLabel right="kg · mỗi Chủ nhật">Cân trung bình</SectionLabel>
            <m.BodyChart points={points} kind="weight" />
          </Card>
          <Card className="mb-3">
            <SectionLabel right="cm · ngang rốn">Vòng bụng</SectionLabel>
            <m.BodyChart points={points} kind="waist" />
          </Card>
        </>
      );
    },
  }))
);

export default function GlowUpScreen({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  const today = useToday();
  const [view, setView] = useState<View>("schedule");

  const days = useLiveQuery(() => db.glowDays.toArray(), [], [] as GlowDay[]);
  const dailyCheckins = useLiveQuery(() => db.dailyCheckins.toArray(), [], [] as DailyCheckin[]);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], [] as Workout[]);
  const bodyCheckins = useLiveQuery(() => db.bodyCheckins.toArray(), [], [] as BodyCheckin[]);

  return (
    <ScreenShell title="Glow-up 12 tuần" back={{ label: backLabel, onClick: onBack }}>
      <div className="mb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { id: "schedule", label: "Lịch" },
            { id: "body", label: "Số đo" },
            { id: "workouts", label: "Buổi tập" },
          ]}
        />
      </div>

      {view === "schedule" && (
        <ScheduleView today={today} days={days} checkins={dailyCheckins} workouts={workouts} body={bodyCheckins} />
      )}
      {view === "body" && <BodyView body={bodyCheckins} />}
      {view === "workouts" && <WorkoutsView workouts={workouts} />}
    </ScreenShell>
  );
}

/* ==================== Lịch ==================== */

function ScheduleView({
  today,
  days,
  checkins,
  workouts,
  body,
}: {
  today: string;
  days: GlowDay[];
  checkins: DailyCheckin[];
  workouts: Workout[];
  body: BodyCheckin[];
}) {
  const current = programWeek(today);
  const thisMonday = mondayOf(today);

  return (
    <>
      {/* ----- Tuần này: buổi từng ngày ----- */}
      {current && (
        <Card className="mb-4">
          <SectionLabel right={`${ddmm(current.start)} – ${ddmm(addDays(current.start, 6))}`}>
            {weekTitle(current)}
          </SectionLabel>
          <p className="mb-2 text-sm text-ink-2">{current.focus}</p>
          <ul className="divide-y divide-line/70">
            {WEEK_TEMPLATE.map((t, i) => {
              const date = addDays(thisMonday, i);
              const plan = planFor(date);
              const isToday = date === today;
              const done = workouts.some((w) => w.date === date);
              const gym = t.session === "gym_A" || t.session === "gym_B" || t.session === "gym_C" ? GYM[t.session] : null;
              return (
                <li key={date} className="py-2">
                  <div className="flex items-baseline gap-2">
                    <span className={"w-16 shrink-0 text-sm " + (isToday ? "font-semibold text-accent" : "text-ink-2")}>
                      {DAY_NAMES[i]}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      {t.label}
                      {t.time && (
                        <span className="text-ink-2">
                          {" "}
                          · <span className="font-num">{t.time}</span> · {t.minutes}
                        </span>
                      )}
                      {plan?.detail && <span className="block text-xs text-ink-2">{plan.detail}</span>}
                    </span>
                    {done && <Tag tone="good">đã tập</Tag>}
                  </div>
                  {/* Bài gym: gập lại, bấm mới mở — ít khi cần đọc lại. */}
                  {gym && (
                    <details className="mt-1 ml-[4.5rem]">
                      <summary className="tap-target flex cursor-pointer items-center text-xs font-semibold text-accent">
                        Xem {gym.exercises.length} bài
                      </summary>
                      <p className="mb-1 text-xs text-ink-3">Khởi động: {WARMUP}</p>
                      <ul className="space-y-0.5">
                        {gym.exercises.map((ex) => (
                          <li key={ex.id} className="text-xs text-ink-2">
                            {ex.name} · <span className="font-num">{setsFor(ex, date)} × {ex.reps}</span> · nghỉ{" "}
                            {ex.restS >= 120 ? `${ex.restS / 60} phút` : `${ex.restS} giây`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* ----- 12 tuần ----- */}
      <SectionLabel className="px-1" right="19/10/2026 – 10/01/2027">
        12 tuần
      </SectionLabel>
      <ol className="mb-4 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {WEEKS.map((w) => {
          const isCurrent = current?.week === w.week;
          const met = weekMetCount(w.start, today, days, checkins, workouts);
          const check = body.find((c) => c.weekStart === w.start);
          return (
            <li key={w.week} className={"px-4 py-3 " + (isCurrent ? "bg-accent/10" : "")}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-ink">Tuần {w.week}</span>
                <span className="font-num text-xs text-ink-2">{ddmm(w.start)}</span>
                <span className="text-xs text-ink-3">{PHASE_LABELS[w.phase]}</span>
                {isCurrent && <Tag tone="accent">tuần này</Tag>}
                {w.deload && <Tag tone="neutral">giảm tải</Tag>}
              </div>
              <p className="mt-0.5 text-sm text-ink-2">{w.focus}</p>
              {w.checkpoint && (
                <p className="mt-1 text-xs text-ink-2">
                  <span className="font-semibold text-ink">Mốc:</span> {w.checkpoint}
                  {w.milestone && (
                    <>
                      {" · "}
                      <span className="font-num">
                        {formatKg(w.milestone.weightKg).replace("-", "−")} kg / {formatKg(w.milestone.waistCm).replace("-", "−")} cm
                      </span>{" "}
                      so với tuần 1
                    </>
                  )}
                </p>
              )}
              {/* Tuần đã qua / đang chạy: kết quả thật. Tuần sau: chưa có gì để hiện. */}
              {met !== null && (
                <p className="mt-1 text-xs text-ink-3">
                  Đạt <span className="font-num text-ink-2">{met}/7</span> ngày
                  {check?.avgWeightKg !== undefined && (
                    <>
                      {" · "}
                      <span className="font-num text-ink-2">{formatKg(check.avgWeightKg)} kg</span>
                    </>
                  )}
                  {check?.waistCm !== undefined && (
                    <>
                      {" · "}
                      <span className="font-num text-ink-2">{formatKg(check.waistCm)} cm</span>
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mb-4 px-1 text-xs text-ink-3">
        Mốc là ước tính khoảng 0,5 kg/tuần, không phải lời khuyên y tế. Ảnh tiến độ để trong app Ảnh.
      </p>
    </>
  );
}

/* ==================== Số đo ==================== */

function BodyView({ body }: { body: BodyCheckin[] }) {
  const points = bodySeries(body);
  const rows = points.filter((p) => p.weightKg !== null || p.waistCm !== null || p.targetWeightKg !== null);

  if (body.length === 0) {
    return (
      <EmptyState
        title="Chưa có check-in Chủ nhật nào"
        hint="Check-in tuần 1 (Chủ nhật 25/10) là số gốc; biểu đồ và mốc tuần 4 · 8 · 12 tính từ đó."
      />
    );
  }

  return (
    <>
      <Suspense
        fallback={
          <Card className="mb-3">
            <p className="py-10 text-center text-sm text-ink-3">Đang tải biểu đồ...</p>
          </Card>
        }
      >
        <BodyCharts points={points} />
      </Suspense>

      {/* Bảng số: cùng dữ liệu với biểu đồ, đọc được không cần nhìn màu. */}
      <SectionLabel className="px-1">Bảng số đo</SectionLabel>
      <div className="mb-4 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line/70 text-xs text-ink-2">
              <th className="px-4 py-2 font-medium">Tuần</th>
              <th className="px-2 py-2 text-right font-medium">Cân (kg)</th>
              <th className="px-2 py-2 text-right font-medium">Bụng (cm)</th>
              <th className="px-4 py-2 text-right font-medium">Mốc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((p) => (
              <tr key={p.week}>
                <td className="px-4 py-2 text-ink">
                  {p.week} <span className="font-num text-xs text-ink-3">{ddmm(p.weekStart)}</span>
                </td>
                <td className="px-2 py-2 text-right font-num text-ink">{p.weightKg !== null ? formatKg(p.weightKg) : "—"}</td>
                <td className="px-2 py-2 text-right font-num text-ink">{p.waistCm !== null ? formatKg(p.waistCm) : "—"}</td>
                <td className="px-4 py-2 text-right font-num text-xs text-ink-2">
                  {p.targetWeightKg !== null || p.targetWaistCm !== null
                    ? `${p.targetWeightKg !== null ? formatKg(p.targetWeightKg) : "—"} / ${p.targetWaistCm !== null ? formatKg(p.targetWaistCm) : "—"}`
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ==================== Buổi tập ==================== */

/** "18 hiệp · mệt 3/5 · vai hơi đau" — chỉ ghép những phần có thật. */
function workoutDetail(w: Workout): string {
  return [
    w.sets && `${w.sets.length} hiệp`,
    w.km !== undefined && `${formatKg(w.km)} km`,
    w.effort !== undefined && `mệt ${w.effort}/5`,
    w.note,
  ]
    .filter(Boolean)
    .join(" · ");
}

function WorkoutsView({ workouts }: { workouts: Workout[] }) {
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [toDelete, setToDelete] = useState<Workout | null>(null);
  const sorted = [...workouts].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

  async function confirmDelete() {
    if (!toDelete) return;
    await db.workouts.delete(toDelete.id);
    setToDelete(null);
    setEditing(null);
  }

  // Sửa: form chiếm chỗ danh sách (giống Buổi luyện ở tab IELTS).
  if (editing) {
    return (
      <Card className="mb-4">
        <SectionLabel>Sửa buổi tập · {ddmm(editing.date)}</SectionLabel>
        <WorkoutForm
          date={editing.date}
          existing={editing}
          workouts={workouts}
          onSave={async (w) => {
            await db.workouts.put(w);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
        <Button variant="danger" onClick={() => setToDelete(editing)} className="mt-3 w-full text-sm">
          Xoá buổi tập này
        </Button>
        <ConfirmDialog
          open={toDelete !== null}
          title="Xoá buổi tập này?"
          detail={
            toDelete && (
              <>
                <strong>
                  {SESSION_LABELS[toDelete.session]} · {formatMinutes(toDelete.minutes)}
                </strong>
                <br />
                ngày {formatShortDate(toDelete.date)}, bắt đầu {toDelete.startTime}
                {toDelete.sets && `, ${toDelete.sets.length} hiệp đã ghi`}
              </>
            )
          }
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      </Card>
    );
  }

  if (sorted.length === 0) {
    return <EmptyState title="Chưa ghi buổi tập nào" hint="Ghi buổi tập từ thẻ Glow-up trên màn Hôm nay." />;
  }

  return (
    <>
      <SectionLabel className="px-1" right="bấm để sửa">
        {sorted.length} buổi đã ghi
      </SectionLabel>
      <ul className="mb-3 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {sorted.slice(0, shown).map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => setEditing(w)}
              aria-label={`Sửa buổi ${SESSION_LABELS[w.session]} ngày ${ddmm(w.date)}`}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
            >
              <span className="w-24 shrink-0 text-xs text-ink-2">
                {DAY_NAMES[weekdayIndex(w.date)]}
                <span className="block font-num text-ink-3">{ddmm(w.date)}</span>
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                {SESSION_LABELS[w.session]} · <span className="font-num">{formatMinutes(w.minutes)}</span>
                <span className="block truncate text-xs text-ink-2">{workoutDetail(w)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown < sorted.length && (
        <Button variant="secondary" onClick={() => setShown(shown + PAGE)} className="mb-4 w-full text-sm">
          Xem thêm
        </Button>
      )}
    </>
  );
}
