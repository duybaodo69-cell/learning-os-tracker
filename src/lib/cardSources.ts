/**
 * Nguồn của thẻ ôn (Đợt 3) — hàm thuần, có test (cardSources.test.ts).
 *
 * PRODUCT.md mục 7/7b: "lỗi lặp lại -> thẻ ôn". Bốn nguồn: lỗi nghe IELTS,
 * từ vựng IELTS, lỗi Writing AI chỉ ra, góp ý của manager. Thẻ không có nguồn
 * là thẻ tạo tay hoặc từ brain dump — vẫn lọc được ("Tự tạo", "Brain dump").
 */
import type { Area, Card, CardSource, IeltsSkill } from "../db/types";
import { newCardState } from "./scheduling";

export const CARD_SOURCE_LABELS: Record<CardSource, string> = {
  "ielts-listening": "Lỗi nghe",
  "ielts-vocab": "Từ vựng IELTS",
  writing: "Lỗi Writing",
  manager: "Góp ý manager",
};

/** Bộ lọc ở Kho thẻ: bốn nguồn + hai loại không có nguồn. */
export const SOURCE_FILTERS = ["ielts-listening", "ielts-vocab", "writing", "manager", "brain-dump", "manual"] as const;
export type SourceFilter = (typeof SOURCE_FILTERS)[number];

export const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  ...CARD_SOURCE_LABELS,
  "brain-dump": "Brain dump",
  manual: "Tự tạo",
};

/** Thẻ này thuộc bộ lọc nào. */
export function sourceOf(card: Card): SourceFilter {
  if (card.source) return card.source;
  return card.brainDumpId ? "brain-dump" : "manual";
}

/** Nguồn gợi ý khi tạo thẻ nhanh từ màn kết thúc buổi IELTS, theo kỹ năng. */
export function sourcesForSkill(skill: IeltsSkill): CardSource[] {
  if (skill === "Listening") return ["ielts-listening", "ielts-vocab"];
  if (skill === "Writing") return ["writing", "ielts-vocab"];
  return ["ielts-vocab"];
}

/** Area mặc định của một nguồn (góp ý manager thuộc việc công ty). */
export function defaultAreaFor(source: CardSource): Area {
  return source === "manager" ? "Internship VC" : "IELTS";
}

/**
 * Thẻ mới có nguồn: ôn ngay hôm nay như mọi thẻ mới. Mặt sau trống thì là
 * thẻ nháp (không vào hàng ôn tới khi điền) — giống thẻ từ brain dump.
 */
export function buildSourcedCard(input: {
  id: string;
  front: string;
  back: string;
  source: CardSource;
  area?: Area;
  today: string;
}): Card {
  const state = newCardState();
  return {
    id: input.id,
    front: input.front.trim(),
    back: input.back.trim(),
    area: input.area ?? defaultAreaFor(input.source),
    createdAt: input.today,
    dueDate: input.today,
    intervalDays: state.intervalDays,
    ease: state.ease,
    reps: state.reps,
    lapses: state.lapses,
    source: input.source,
  };
}
