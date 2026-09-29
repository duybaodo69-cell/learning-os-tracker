/**
 * Thẻ đếm ngược tới kỳ thi thử kế tiếp — đầu màn Hôm nay và tab IELTS.
 * Thay banner một dòng của Đợt 2 (chủ app thấy chưa đủ "gần", 2026-09-28).
 *
 * Thiết kế: Stitch "Learning OS — UX gọn 2026-09", màn "Hôm nay — Countdown
 * IELTS 7.5" (điện thoại) và "Desktop 1280px". Gộp ba mẫu tham khảo:
 *   - MỘT con số lớn là chỉ số chính (Pretty Progress: một số, một hình phụ)
 *   - thanh mảnh = đã đi được bao nhiêu phần CHẶNG hiện tại (Countdawns)
 *   - timeline nhiều mốc "Đường tới 7.5" (Poro, DayDrop multi-event)
 * Không màu báo động, không chuỗi ngày: màu chỉ nói trạng thái (xong / kế tiếp / còn xa).
 *
 * Bố cục đổi bằng container query của CHÍNH thẻ (`@container/count`):
 *   - hẹp (điện thoại, hoặc cỡ hiển thị 150%): hai vùng xếp dọc
 *   - rộng >= 34rem (máy tính, tablet): số lớn bên trái | timeline bên phải
 * Không đổi cây React theo cỡ màn hình (quy tắc responsive của dự án).
 *
 * Lịch sửa ở src/config/schedule.ts; tính toán ở src/lib/plan.ts (có test).
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { formatShortDate } from "../lib/dates";
import { mondayOf } from "../lib/metrics";
import { planForWeek } from "../lib/weekPlan";
import { currentStretch, lightWeekExam, nextTestMilestone, roadToExam, type RoadNode } from "../lib/plan";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Tuần nhẹ bật tay (không có kỳ thi môn): dòng nhắc không ghi ngày. */
const MANUAL_LIGHT = { label: "bạn chọn khi chốt kế hoạch", date: "" };

/** "T7 · 03/10" */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} · ${formatShortDate(iso).slice(0, 5)}`;
}

/** "03/10" */
const ddmm = (iso: string) => formatShortDate(iso).slice(0, 5);

export default function CountdownCard({ date }: { date: string }) {
  const next = nextTestMilestone(date);
  // Tuần nhẹ nhịp: tự động theo kỳ thi môn, trừ khi Chủ nhật trước đã chốt khác
  // (bật tay khi dồn việc, hoặc tắt tay) — Đợt 3.
  const reviews = useLiveQuery(() => db.weekReviews.toArray(), []);
  const plan = reviews ? planForWeek(mondayOf(date), reviews) : null;
  const exam = lightWeekExam(date);
  const light = plan ? (plan.light ? (exam ?? MANUAL_LIGHT) : null) : exam;
  if (!next) {
    // Hết lịch thi: chỉ còn nhắc tuần nhẹ nhịp (nếu có).
    return light ? <LightWeekRow label={light.label} date={light.date} standalone /> : null;
  }

  const stretch = currentStretch(date);
  const road = roadToExam(date);
  const finalExam = road[road.length - 1]?.milestone;
  const m = next.milestone;
  const progress = stretch?.progress ?? 0;

  return (
    <section
      aria-label="Đếm ngược tới kỳ thi kế tiếp"
      className="@container/count mb-3 rounded-[1.25rem] border border-line bg-water p-4"
    >
      <div className="grid @[34rem]/count:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ---------- Vùng 1: con số ---------- */}
        <div className="border-b border-line/70 pb-4 @[34rem]/count:border-r @[34rem]/count:border-b-0 @[34rem]/count:pr-5 @[34rem]/count:pb-0">
          <div className="flex items-baseline justify-between gap-2 text-sm text-ink-2">
            <span>{m.kind === "exam" ? "Thi thật" : "Thi thử kế tiếp"}</span>
            <span className="font-num">{dayLabel(m.date)}</span>
          </div>
          <p className="mt-1 text-base font-semibold text-ink">{m.label}</p>

          {next.ongoing ? (
            <>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-accent">Hôm nay</p>
              <p className="mt-1 text-sm text-ink-2">Thi xong thì ghi kết quả ở IELTS → Thi thử.</p>
            </>
          ) : (
            <>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-num text-[4rem] leading-none font-semibold tracking-tight text-ink">
                  {next.daysLeft}
                </span>
                <span className="text-lg text-ink-2">ngày</span>
              </p>
              <p className="mt-1 text-sm text-ink-2">
                {next.daysLeft === 1 ? (
                  "Mai là ngày thi — hôm nay là khung 9:30 cuối."
                ) : (
                  <>
                    ≈ <span className="font-num font-semibold text-ink">{next.daysLeft}</span> khung 9:30 nữa
                  </>
                )}
              </p>
            </>
          )}

          {stretch && (
            <div className="mt-4">
              <div
                role="progressbar"
                aria-label={`Chặng ${ddmm(stretch.from)} tới ${ddmm(stretch.to)}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              >
                {/* Tối thiểu một chấm nhỏ để thấy "đang ở đầu chặng". */}
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `max(0.375rem, ${progress * 100}%)` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-num text-xs text-ink-3">
                <span>{ddmm(stretch.from)}</span>
                <span>{ddmm(stretch.to)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Vùng 2: đường tới 7.5 ---------- */}
        <div className="pt-4 @[34rem]/count:pt-0 @[34rem]/count:pl-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
            <span className="font-medium text-ink">Đường tới 7.5</span>
            {finalExam && (
              <span className="text-ink-3">
                Mục tiêu <span className="font-num">{formatShortDate(finalExam.date)}</span>
              </span>
            )}
          </div>
          <Road nodes={road} progress={progress} ongoing={next.ongoing} />
          {road.some((n) => n.milestone.gate && n.state !== "done") && (
            <p className="mt-2 text-xs text-ink-3">
              * {road.find((n) => n.milestone.gate)?.milestone.short}: cổng quyết định — dưới 6.5 thì dời thi thật
            </p>
          )}
        </div>
      </div>

      {light && <LightWeekRow label={light.label} date={light.date} />}
    </section>
  );
}

/* ---------------------------------------------------------- Timeline */

/**
 * Các mốc cách đều nhau (không theo tỉ lệ thời gian) để nhãn luôn đọc được.
 * Chấm "hôm nay" nằm trên đoạn giữa mốc đã qua và mốc kế tiếp, theo tỉ lệ
 * của chặng hiện tại.
 */
function Road({ nodes, progress, ongoing }: { nodes: RoadNode[]; progress: number; ongoing: boolean }) {
  const n = nodes.length;
  if (n === 0) return null;
  // Tâm cột i, tính theo % bề rộng: (i + 0.5) / n.
  const center = (i: number) => ((i + 0.5) / n) * 100;
  const nextIdx = nodes.findIndex((x) => x.state === "next");
  const lastDone = nextIdx === -1 ? n - 1 : nextIdx - 1;
  // Đoạn đã đi: từ đầu đường tới chấm hôm nay.
  const fromPos = lastDone >= 0 ? center(lastDone) : center(0) - 50 / n;
  const rawPos = nextIdx === -1 ? center(n - 1) : fromPos + (center(nextIdx) - fromPos) * progress;
  // Giữ chấm "hôm nay" cách hai mốc bên cạnh một chút, để vòng tròn mốc không che mất nó
  // (vd 6/10: mới đi 2/42 chặng, chấm sẽ nằm ngay dưới vòng T0).
  const gap = 35 / n; // ~ nửa bán kính mốc, tính theo % bề rộng
  const todayPos = nextIdx === -1 ? rawPos : Math.min(center(nextIdx) - gap, Math.max(fromPos + gap, rawPos));

  return (
    <div className="relative mt-4">
      {/* Đường nền nối tâm mốc đầu tới tâm mốc cuối. */}
      <div
        className="absolute top-2.5 h-0.5 -translate-y-1/2 rounded-full bg-line"
        style={{ left: `${center(0)}%`, right: `${100 - center(n - 1)}%` }}
        aria-hidden="true"
      />
      {/* Phần đã đi (tới hôm nay). */}
      {todayPos > center(0) && (
        <div
          className="absolute top-2.5 h-0.5 -translate-y-1/2 rounded-full bg-ink-3"
          style={{ left: `${center(0)}%`, width: `${todayPos - center(0)}%` }}
          aria-hidden="true"
        />
      )}
      {/* Chấm "hôm nay" — ẩn khi đang thi (mốc đó chính là hôm nay). */}
      {!ongoing && nextIdx !== -1 && (
        <span
          className="absolute top-2.5 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-accent/20"
          style={{ left: `${todayPos}%` }}
          title="Hôm nay"
          aria-hidden="true"
        />
      )}

      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {nodes.map(({ milestone: m, state }) => {
          const exam = m.kind === "exam";
          return (
            <li key={m.date} className="flex min-w-0 flex-col items-center text-center">
              <span
                className={
                  "grid h-5 w-5 place-items-center rounded-full border-2 " +
                  // Đã qua = tô đặc; kế tiếp = viền cyan + chấm; còn xa = rỗng.
                  (state === "done"
                    ? "border-ink-3 bg-ink-3"
                    : state === "next"
                      ? "border-accent bg-surface"
                      : "border-ink-3 bg-surface") +
                  (m.gate && state !== "done" ? " border-dashed" : "")
                }
                aria-hidden="true"
              >
                {state === "next" && <span className="h-2 w-2 rounded-full bg-accent" />}
                {exam && state !== "next" && <FlagIcon />}
              </span>
              <span
                className={
                  "mt-1.5 text-xs leading-tight break-words " +
                  (state === "next" ? "font-semibold text-accent" : exam ? "font-semibold text-ink" : "text-ink-2")
                }
              >
                {m.short}
                {m.gate && "*"}
              </span>
              {/* Thẻ hẹp (điện thoại ở cỡ 150%): chỉ ghi ngày cho mốc kế tiếp và
                  thi thật, để các ngày không dính vào nhau. */}
              <span
                className={
                  "font-num text-xs text-ink-3 " +
                  (state === "next" || exam ? "" : "hidden @[18rem]/count:inline")
                }
              >
                {ddmm(m.date)}
              </span>
              <span className="sr-only">
                {m.label}, {state === "done" ? "đã qua" : state === "next" ? "kế tiếp" : "sắp tới"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 text-ink-2" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

/* ---------------------------------------------------------- Tuần nhẹ nhịp */

function LightWeekRow({ label, date, standalone = false }: { label: string; date: string; standalone?: boolean }) {
  return (
    <p
      className={
        "flex items-start gap-2 text-sm text-ink-2 " +
        (standalone
          ? "mb-3 rounded-2xl border border-line/70 bg-surface px-4 py-2.5"
          : "mt-4 border-t border-line/70 pt-3")
      }
    >
      <InfoIcon />
      <span>
        <span className="font-medium text-ink">Tuần nhẹ nhịp</span> · {label}
        {date && ` ${ddmm(date)}`}: giữ sàn 30 phút
        Listening mỗi ngày.
      </span>
    </p>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}
