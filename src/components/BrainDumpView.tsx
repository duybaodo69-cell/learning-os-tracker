/**
 * Brain dump — bài tập retrieval.
 *
 * Cách dùng đúng:
 *   1. ĐÓNG hết tài liệu lại
 *   2. Viết ra tất cả những gì còn nhớ
 *   3. MỞ tài liệu ra đối chiếu, ghi lại chỗ hổng
 *   4. Bấm "Lưu" — brain dump được lưu, mỗi dòng chỗ hổng thành một thẻ nháp
 *
 * Nội dung đang viết được giữ làm bản nháp (src/lib/drafts.ts), nên đổi
 * mục con, đổi tab hay tải lại trang đều không mất.
 */
import { useEffect, useRef, useState } from "react";

import { db } from "../db/db";
import type { Area } from "../db/types";
import { AREAS } from "../db/types";
import { BRAIN_DUMP_DRAFT_KEY, buildBrainDump, type BrainDumpDraft as Draft } from "../lib/brainDump";
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts";
import { useToday } from "../lib/useToday";
import { getLastArea, setLastArea } from "../lib/prefs";
import { splitGapsIntoFronts } from "../lib/scheduling";
import { Button, Card as CardBox, ChipGroup, Field, SwitchKnob, TextArea } from "./ui";
import BrainDumpHistory from "./BrainDumpHistory";


const MINUTE_OPTIONS = [5, 10, 15, 20, 30] as const;

export default function BrainDumpView({ onOpenCards }: { onOpenCards?: () => void }) {
  const today = useToday();

  // Mở lại đúng chỗ đang viết dở (nếu có bản nháp).
  const [draft] = useState(() => loadDraft<Draft>(BRAIN_DUMP_DRAFT_KEY));
  const [area, setArea] = useState<Area>(
    draft?.area && (AREAS as readonly string[]).includes(draft.area) ? draft.area : getLastArea()
  );
  const [recalled, setRecalled] = useState(typeof draft?.recalled === "string" ? draft.recalled : "");
  const [gaps, setGaps] = useState(typeof draft?.gaps === "string" ? draft.gaps : "");
  const [minutes, setMinutes] = useState(
    typeof draft?.minutes === "number" && draft.minutes > 0 ? draft.minutes : 15
  );
  const [makeCards, setMakeCards] = useState(draft?.makeCards !== false);
  // Thông báo ngắn sau khi lưu, tự biến mất khi gõ tiếp.
  const [message, setMessage] = useState<{ text: string; cards: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Khoá chống bấm hai lần: ref đổi NGAY trong cùng lượt bấm, state chỉ để làm mờ nút.
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  // Mỗi lần nội dung đổi -> ghi bản nháp. Form trống thì xoá bản nháp.
  useEffect(() => {
    if (recalled === "" && gaps === "") clearDraft(BRAIN_DUMP_DRAFT_KEY);
    else saveDraft<Draft>(BRAIN_DUMP_DRAFT_KEY, { area, recalled, gaps, minutes, makeCards });
  }, [area, recalled, gaps, minutes, makeCards]);

  // Xem trước: ô "chỗ hổng" sẽ tạo ra bao nhiêu thẻ.
  const gapLines = splitGapsIntoFronts(gaps);
  const empty = recalled.trim() === "" && gaps.trim() === "";
  const cardsToMake = makeCards ? gapLines.length : 0;

  /**
   * Lưu brain dump VÀ tạo thẻ trong MỘT transaction: hoặc cả hai được ghi,
   * hoặc không gì cả. Sau khi lưu, form được xoá trắng, nên bấm lại không
   * thể tạo thêm một bộ thẻ trùng.
   */
  async function handleSave() {
    if (empty || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      setLastArea(area);
      const { dump, cards } = buildBrainDump({ area, recalled, gaps, minutes, makeCards }, today);
      await db.transaction("rw", db.brainDumps, db.cards, async () => {
        await db.brainDumps.add(dump);
        if (cards.length > 0) await db.cards.bulkAdd(cards);
      });
      setRecalled("");
      setGaps("");
      clearDraft(BRAIN_DUMP_DRAFT_KEY);
      setMessage({
        text:
          cards.length > 0
            ? `Đã lưu brain dump và tạo ${cards.length} thẻ nháp. Điền mặt sau ở Kho thẻ để thẻ vào hàng ôn.`
            : "Đã lưu brain dump.",
        cards: cards.length,
      });
    } catch {
      // Nội dung vẫn còn nguyên trong ô và trong bản nháp — thử lại được.
      setError("Chưa lưu được. Nội dung vẫn còn nguyên, hãy thử lại.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="pb-4">
      <CardBox className="mb-4">
        <Field label="Area">
          <ChipGroup options={AREAS} value={area} onChange={setArea} scroll />
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

        {/* Công tắc tạo thẻ nằm NGAY DƯỚI ô chỗ hổng, đúng lúc vừa viết xong. */}
        <button
          type="button"
          role="switch"
          aria-checked={makeCards}
          onClick={() => setMakeCards(!makeCards)}
          className="mb-4 flex min-h-[48px] w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left"
        >
          <span className="min-w-0 flex-1 text-sm text-ink">
            Tạo thẻ nháp từ chỗ hổng
            <span className="block text-xs text-ink-3">
              {gapLines.length > 0 ? `${gapLines.length} dòng = ${gapLines.length} thẻ` : "mỗi dòng một thẻ"}
            </span>
          </span>
          <SwitchKnob checked={makeCards} />
        </button>

        <Field label="Số phút">
          <ChipGroup options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} format={(m) => `${m}p`} />
        </Field>

        <Button onClick={handleSave} disabled={empty || busy} className="w-full">
          {busy ? "Đang lưu..." : cardsToMake > 0 ? `Lưu và tạo ${cardsToMake} thẻ` : "Lưu brain dump"}
        </Button>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-bad/10 px-3 py-2 text-center text-sm text-bad-ink">
            {error}
          </p>
        )}
        {message && (
          <div className="mt-3 rounded-xl bg-good/10 px-3 py-2 text-center text-sm font-semibold text-good">
            <p>{message.text}</p>
            {message.cards > 0 && onOpenCards && (
              <button
                type="button"
                onClick={onOpenCards}
                className="tap-target mt-1 rounded-lg px-3 text-sm font-semibold text-accent underline"
              >
                Mở Kho thẻ
              </button>
            )}
          </div>
        )}
      </CardBox>

      <BrainDumpHistory />
    </div>
  );
}
