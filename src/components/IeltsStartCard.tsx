/**
 * Thẻ "Bắt đầu IELTS" — dùng chung cho màn Hôm nay và tab IELTS.
 *
 *   - Nút chính "▶ Bắt đầu IELTS · <phần Listening tiếp theo>" (Đợt 1)
 *   - Dòng "Reading tiếp theo"
 *   - "Khung 9:30: x/7 tuần này" + 7 chấm Thứ Hai → Chủ Nhật (đếm ngày, không chuỗi)
 *   - "Kế hoạch tuần: Listening x/8 · Reading y/6" nếu Chủ nhật trước đã chốt (Đợt 3)
 *   - `children`: phần thêm ở cuối thẻ (Hôm nay đặt dòng "dời khung" ở đây)
 *
 * Bấm nút KHÔNG tạo đồng hồ riêng: màn cha chọn area IELTS rồi chạy đồng hồ phiên thường.
 */
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { FocusBlock } from "../db/types";
import { ANCHOR_MIN_MINUTES, FLOOR_MINUTES, anchorWeek, dayIelts, formatTestRef, nextTest, partShort } from "../lib/ielts";
import { mondayOf } from "../lib/metrics";
import { addDays } from "../lib/scheduling";
import { partsDone, planForWeek } from "../lib/weekPlan";
import { Button, Card } from "./ui";

/** Nhãn 7 chấm khung 9:30, Thứ Hai trước. */
const WEEKDAY_SHORT = ["2", "3", "4", "5", "6", "7", "CN"];
const WEEKDAY_LONG = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

export default function IeltsStartCard({
  blocks,
  today,
  onStart,
  children,
}: {
  /** Mọi focus block (để tính đề tiếp theo và khung 9:30 tuần này). */
  blocks: FocusBlock[];
  today: string;
  onStart: () => void;
  children?: ReactNode;
}) {
  const nextListening = nextTest(blocks, "Listening");
  const nextReading = nextTest(blocks, "Reading");
  const week = anchorWeek(blocks, today);
  const held = week.filter((d) => d.held).length;
  const reviews = useLiveQuery(() => db.weekReviews.toArray(), []);
  const monday = mondayOf(today);
  const plan = reviews ? planForWeek(monday, reviews) : null;
  const sunday = addDays(monday, 6);
  // Hôm nay có IELTS mà chưa có tick: nói rõ vì sao (chủ app hỏi 2026-09-29).
  const todayIelts = dayIelts(blocks, today);

  return (
    <Card className="mb-3">
      <Button onClick={onStart} className="flex w-full items-center justify-center gap-2 py-3 text-base">
        <span aria-hidden="true">▶</span>
        <span>
          Bắt đầu IELTS
          {nextListening && (
            <>
              {" · "}
              <span className="font-num">
                {formatTestRef("Listening", { ...nextListening, parts: [nextListening.part] })}
              </span>
            </>
          )}
        </span>
      </Button>
      {nextReading && (
        <p className="mt-2 text-center text-xs text-ink-3">
          Reading tiếp theo: Cam {nextReading.book} · Test {nextReading.test} · {partShort("Reading", nextReading.part)}
        </p>
      )}

      {/* Kế hoạch đã chốt Chủ nhật trước (Đợt 3): làm được bao nhiêu phần. */}
      {plan && (plan.listening > 0 || plan.reading > 0) && (
        <p className="mt-1 text-center text-xs text-ink-2">
          Kế hoạch tuần{plan.light && " (nhẹ nhịp)"}: Listening{" "}
          <span className="font-num font-semibold text-ink">
            {partsDone(blocks, "Listening", monday, sunday)}/{plan.listening}
          </span>
          {plan.reading > 0 && (
            <>
              {" "}
              · Reading{" "}
              <span className="font-num font-semibold text-ink">
                {partsDone(blocks, "Reading", monday, sunday)}/{plan.reading}
              </span>
            </>
          )}
        </p>
      )}

      {/* Khung 9:30 — đếm NGÀY, không đếm chuỗi (PRODUCT.md mục 3 và 6). */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line/70 pt-3">
        <p className="text-sm text-ink">
          Khung 9:30: <span className="font-num font-semibold">{held}/7</span> tuần này
          <span className="block text-xs text-ink-3">
            IELTS bắt đầu 9:00–10:30, từ {ANCHOR_MIN_MINUTES} phút · đích ≥ 5
          </span>
        </p>
        <ol className="flex gap-1" aria-label="Các ngày giữ khung 9:30 tuần này">
          {week.map((d, i) => {
            // Chấm đặc = giữ khung 9:30. Viền xanh = có IELTS >= 30 phút (đạt sàn)
            // nhưng ngoài khung — vẫn là ngày "đạt", chỉ chưa phải ngày "tốt".
            const floor = !d.held && dayIelts(blocks, d.date).floor;
            return (
              <li
                key={d.date}
                className={
                  "grid h-7 w-7 place-items-center rounded-full text-xs " +
                  (d.held
                    ? "bg-good font-semibold text-canvas"
                    : floor
                      ? "border-2 border-good font-semibold text-good"
                      : "bg-surface-2 text-ink-3") +
                  (d.date === today ? " ring-2 ring-accent ring-offset-1 ring-offset-surface" : "")
                }
              >
                <span aria-hidden="true">{WEEKDAY_SHORT[i]}</span>
                <span className="sr-only">
                  {WEEKDAY_LONG[i]}: {d.held ? "giữ khung" : floor ? "đạt sàn, ngoài khung" : "chưa"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {todayIelts.miss && (
        <p className="mt-2 text-xs text-ink-2" role="status">
          Hôm nay đã có <span className="font-num font-semibold text-ink">{todayIelts.minutes}p</span> IELTS
          {todayIelts.floor ? " (đạt sàn)" : ` (sàn ${FLOOR_MINUTES}p)`} nhưng chưa tính khung 9:30:{" "}
          {todayIelts.miss.cause === "outside"
            ? `phiên bắt đầu ${todayIelts.miss.startTime}, ngoài 9:00–10:30.`
            : `phiên ${todayIelts.miss.startTime} mới ${todayIelts.miss.minutes}p, cần từ ${ANCHOR_MIN_MINUTES}p.`}
        </p>
      )}

      {children}
    </Card>
  );
}
