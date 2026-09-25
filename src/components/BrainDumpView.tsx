/**
 * Brain dump — bài tập retrieval.
 *
 * Cách dùng đúng:
 *   1. ĐÓNG hết tài liệu lại
 *   2. Viết ra tất cả những gì còn nhớ
 *   3. MỞ tài liệu ra đối chiếu, ghi lại chỗ hổng
 *   4. Bấm "Tạo thẻ từ chỗ hổng" — mỗi dòng thành một thẻ để ôn sau
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Area, BrainDump, Card } from "../db/types";
import { AREAS } from "../db/types";
import { formatDayLabel, newId } from "../lib/dates";
import { useToday } from "../lib/useToday";
import { getLastArea, setLastArea } from "../lib/prefs";
import { newCardState, splitGapsIntoFronts } from "../lib/scheduling";

import { Button, Card as CardBox, ChipGroup, EmptyState, Field, TextArea } from "./ui";

export default function BrainDumpView() {
  const today = useToday();

  const [area, setArea] = useState<Area>(getLastArea());
  const [recalled, setRecalled] = useState("");
  const [gaps, setGaps] = useState("");
  const [minutes, setMinutes] = useState(15);
  // Thông báo ngắn sau khi lưu / tạo thẻ, tự biến mất khi thao tác tiếp.
  const [message, setMessage] = useState<string | null>(null);

  // Các brain dump gần đây, để nhìn lại mình đã ôn gì.
  const recent = useLiveQuery(
    () => db.brainDumps.orderBy("date").reverse().limit(5).toArray(),
    [],
    [] as BrainDump[]
  );

  // Xem trước: ô "chỗ hổng" sẽ tạo ra bao nhiêu thẻ.
  const gapLines = splitGapsIntoFronts(gaps);

  function resetForm() {
    setRecalled("");
    setGaps("");
  }

  async function handleSave() {
    if (recalled.trim() === "" && gaps.trim() === "") return;
    setLastArea(area);

    const dump: BrainDump = {
      id: newId(),
      date: today,
      area,
      recalled: recalled.trim(),
      gaps: gaps.trim(),
      minutes,
    };
    await db.brainDumps.add(dump);
    resetForm();
    setMessage("Đã lưu brain dump.");
  }

  /**
   * Tạo thẻ nháp từ ô "chỗ hổng".
   * Mặt trước = nội dung dòng đó. Mặt sau để TRỐNG cho bạn tự điền —
   * viết đáp án bằng trí nhớ của mình mới là phần có tác dụng học.
   */
  async function handleCreateCards() {
    if (gapLines.length === 0) return;
    setLastArea(area);

    const state = newCardState();
    const cards: Card[] = gapLines.map((front) => ({
      id: newId(),
      front,
      back: "", // để trống - bạn tự điền ở tab "Thẻ"
      area,
      createdAt: today,
      // Thẻ mới đến hạn NGAY hôm nay, để ôn lần đầu trong ngày.
      dueDate: today,
      intervalDays: state.intervalDays,
      ease: state.ease,
      reps: state.reps,
      lapses: state.lapses,
    }));

    await db.cards.bulkAdd(cards);
    setMessage(
      `Đã tạo ${cards.length} thẻ nháp. Sang tab "Thẻ" để điền mặt sau.`
    );
  }

  return (
    <div className="pb-4">
      <CardBox className="mb-4">
        <Field label="Area">
          <ChipGroup options={AREAS} value={area} onChange={setArea} />
        </Field>

        <Field label="Tôi nhớ được gì" hint="KHÔNG mở tài liệu">
          <TextArea
            value={recalled}
            onChange={(v) => {
              setRecalled(v);
              setMessage(null);
            }}
            rows={8}
            placeholder={"Viết tự do tất cả những gì còn nhớ.\nSai cũng không sao — mục tiêu là moi ra khỏi đầu."}
          />
        </Field>

        <Field label="Chỗ hổng / sai khi đối chiếu" hint="mỗi dòng = một thẻ">
          <TextArea
            value={gaps}
            onChange={(v) => {
              setGaps(v);
              setMessage(null);
            }}
            rows={6}
            placeholder={"Giờ mở tài liệu ra và đối chiếu.\nMỗi chỗ hổng viết một dòng."}
          />
        </Field>

        {/* Nút tạo thẻ nằm NGAY DƯỚI ô chỗ hổng, đúng lúc bạn vừa viết xong. */}
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={handleCreateCards}
            disabled={gapLines.length === 0}
            className="w-full text-sm"
          >
            Tạo thẻ từ chỗ hổng
            {gapLines.length > 0 && ` (${gapLines.length} thẻ)`}
          </Button>
          {gapLines.length === 0 && (
            <p className="mt-1 text-center text-xs text-slate-400">
              Viết chỗ hổng ở trên, mỗi dòng một ý
            </p>
          )}
        </div>

        <Field label="Số phút">
          <ChipGroup
            options={[5, 10, 15, 20, 30] as const}
            value={minutes}
            onChange={setMinutes}
            format={(m) => `${m}p`}
          />
        </Field>

        <Button
          onClick={handleSave}
          disabled={recalled.trim() === "" && gaps.trim() === ""}
          className="w-full"
        >
          Lưu brain dump
        </Button>

        {message && (
          <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-center text-sm font-semibold text-green-700">
            {message}
          </p>
        )}
      </CardBox>

      {/* ---------- Các lần gần đây ---------- */}
      <div className="px-1 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Gần đây
      </div>

      {recent.length === 0 ? (
        <EmptyState title="Chưa có brain dump nào" hint="Lần đầu tiên bắt đầu ở trên" />
      ) : (
        <div className="space-y-2">
          {recent.map((d) => (
            <CardBox key={d.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{d.area}</span>
                <span className="text-xs text-slate-400">
                  {formatDayLabel(d.date)} · {d.minutes}p
                </span>
              </div>
              {d.recalled && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{d.recalled}</p>
              )}
              {d.gaps && (
                <p className="mt-1 line-clamp-2 text-sm text-amber-700">Hổng: {d.gaps}</p>
              )}
            </CardBox>
          ))}
        </div>
      )}
    </div>
  );
}
