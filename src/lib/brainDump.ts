/**
 * Logic thuần của brain dump (không vẽ giao diện) — có test ở brainDump.test.ts.
 *   - buildBrainDump   : một lần lưu = một brain dump + các thẻ nháp gắn với nó
 *   - filterBrainDumps : lọc lịch sử theo area và từ khoá
 */
import type { Area, BrainDump, Card } from "../db/types";
import { newId } from "./dates";
import { newCardState, splitGapsIntoFronts } from "./scheduling";

/** Khoá bản nháp trong localStorage (src/lib/drafts.ts). */
export const BRAIN_DUMP_DRAFT_KEY = "learning-os:braindump-draft";

/** Nội dung form brain dump — cũng là thứ được lưu làm bản nháp. */
export type BrainDumpDraft = {
  area: Area;
  recalled: string;
  gaps: string;
  minutes: number;
  makeCards: boolean;
};

/**
 * Tạo brain dump + các thẻ nháp từ ô "chỗ hổng". Hàm thuần, có test.
 * Mặt trước thẻ = nội dung dòng đó. Mặt sau để TRỐNG cho bạn tự điền —
 * viết đáp án bằng trí nhớ của mình mới là phần có tác dụng học.
 */
export function buildBrainDump(input: BrainDumpDraft, today: string): { dump: BrainDump; cards: Card[] } {
  const dump: BrainDump = {
    id: newId(),
    date: today,
    area: input.area,
    recalled: input.recalled.trim(),
    gaps: input.gaps.trim(),
    minutes: input.minutes,
  };
  const state = newCardState();
  const cards: Card[] = input.makeCards
    ? splitGapsIntoFronts(input.gaps).map((front) => ({
        id: newId(),
        front,
        back: "", // để trống - bạn tự điền ở mục "Kho thẻ"
        area: input.area,
        createdAt: today,
        // Thẻ nháp chưa vào hàng ôn; điền mặt sau xong là đến hạn ngay.
        dueDate: today,
        intervalDays: state.intervalDays,
        ease: state.ease,
        reps: state.reps,
        lapses: state.lapses,
        brainDumpId: dump.id,
      }))
    : [];
  return { dump, cards };
}

/** Bỏ dấu + chữ thường, để gõ "phan tich" vẫn tìm ra "phân tích". */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Lọc theo area và từ khoá (tìm trong cả "nhớ được" lẫn "chỗ hổng").
 * Kết quả xếp mới nhất trước. Hàm thuần, có test.
 */
export function filterBrainDumps(dumps: BrainDump[], area: Area | null, query: string): BrainDump[] {
  const q = foldText(query.trim());
  return dumps
    .filter((d) => area === null || d.area === area)
    .filter((d) => q === "" || foldText(`${d.recalled}\n${d.gaps}`).includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
}

