/**
 * Tab "IELTS" (Đợt 2) — thay tab Dự đoán trên thanh điều hướng.
 * Dự đoán và Thí nghiệm chuyển vào Cài đặt → "Công cụ khác" (dữ liệu giữ nguyên).
 *
 * Ba mục con:
 *   Tổng quan : đề tiếp theo + nút bắt đầu, khung 9:30, đếm ngược,
 *               tổng lỗi theo loại trong 4 tuần gần nhất (Listening và Reading RIÊNG)
 *   Buổi luyện: lịch sử các phiên IELTS, bấm để sửa (xoá nằm trong form sửa)
 *   Thi thử   : kết quả thi thử (chuyển từ Ôn tập sang)
 *
 * Mọi phép tính ở src/lib/ielts.ts và src/lib/plan.ts (có test).
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { AnchorDelay, FocusBlock } from "../db/types";
import { formatMinutes, formatShortDate } from "../lib/dates";
import { errorSummary, errorTypes, sessionSummary, type ScoredSkill } from "../lib/ielts";
import { delaysInWeek } from "../lib/plan";
import { addDays } from "../lib/scheduling";
import { useToday } from "../lib/useToday";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import FocusBlockForm from "../components/FocusBlockForm";
import IeltsStartCard from "../components/IeltsStartCard";
import MockTestView from "../components/MockTestView";
import CountdownCard from "../components/CountdownCard";
import WritingPromptButton from "../components/WritingPromptButton";
import { Button, Card, EmptyState, SectionLabel, Segmented } from "../components/ui";

export type IeltsView = "overview" | "sessions" | "mock";

/** "4 tuần gần nhất" = 28 ngày tính cả hôm nay. */
const SUMMARY_DAYS = 28;
/** Lịch sử: mỗi lần "Xem thêm" hiện thêm bấy nhiêu buổi. */
const PAGE = 15;

export default function IeltsScreen({ onStartIelts }: { onStartIelts: () => void }) {
  const today = useToday();
  const [view, setView] = useState<IeltsView>("overview");

  // Chỉ cần block area IELTS (đề tiếp theo, khung 9:30, lỗi, lịch sử) —
  // đọc thẳng theo index `area`.
  const ieltsBlocks = useLiveQuery(
    () => db.focusBlocks.where("area").equals("IELTS").toArray(),
    [],
    [] as FocusBlock[]
  );
  const delays = useLiveQuery(() => db.anchorDelays.toArray(), [], [] as AnchorDelay[]);

  const from = addDays(today, -(SUMMARY_DAYS - 1));

  return (
    <ScreenShell title="IELTS" subtitle="Đích 7.5 · thi thật tháng 3/2027" wide>
      <div className="@3xl/content:max-w-md">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { id: "overview", label: "Tổng quan" },
            { id: "sessions", label: "Buổi luyện" },
            { id: "mock", label: "Thi thử" },
          ]}
        />
      </div>

      {view === "overview" && (
        <div className="grid items-start gap-x-4 pb-4 @3xl/content:grid-cols-2">
          <div className="min-w-0">
            <CountdownCard date={today} />
            <IeltsStartCard blocks={ieltsBlocks} today={today} onStart={onStartIelts}>
              <p className="mt-2 text-xs text-ink-3">
                Dời khung <span className="font-num">{delaysInWeek(delays, today)}</span> lần tuần này
              </p>
            </IeltsStartCard>
          </div>
          <div className="min-w-0">
            <SectionLabel className="px-1" right={`${formatShortDate(from).slice(0, 5)} → hôm nay`}>
              Lỗi theo loại · 4 tuần
            </SectionLabel>
            <ErrorCard skill="Listening" blocks={ieltsBlocks} from={from} to={today} />
            <ErrorCard skill="Reading" blocks={ieltsBlocks} from={from} to={today} />
            {/* Đợt 3: Writing do AI chấm — app chỉ chép prompt, không gửi gì đi. */}
            <Card className="mb-3">
              <h3 className="text-base font-semibold text-ink">Writing</h3>
              <p className="mt-0.5 mb-3 text-xs text-ink-2">
                2 bài mỗi tuần, AI chấm theo 4 tiêu chí band descriptor. Lỗi lặp lại → thẻ ôn nguồn "Lỗi Writing".
              </p>
              <WritingPromptButton />
            </Card>
          </div>
        </div>
      )}

      {view === "sessions" && <SessionHistory blocks={ieltsBlocks} />}
      {view === "mock" && <MockTestView />}
    </ScreenShell>
  );
}

/* ---------------------------------------------------------- Lỗi 4 tuần */

/**
 * Tổng từng loại lỗi của một kỹ năng. Thanh ngang so với tổng câu sai;
 * loại nhiều nhất ghi "nhiều nhất" — đó là chỗ nên tập tuần tới
 * (PRODUCT.md mục 3: "loại lớn nhất giảm dần").
 */
function ErrorCard({ skill, blocks, from, to }: { skill: ScoredSkill; blocks: FocusBlock[]; from: string; to: string }) {
  const s = errorSummary(blocks, skill, from, to);
  const wrong = s.errors.reduce((a, b) => a + b, 0);
  const max = Math.max(...s.errors);
  const types = errorTypes(skill);

  return (
    <Card className="mb-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-base font-semibold text-ink">{skill}</h3>
        <p className="text-sm text-ink-2">
          <span className="font-num">{s.sessions}</span> buổi
          {s.questions > 0 && (
            <>
              {" · "}đúng <span className="font-num text-ink">{s.correct}/{s.questions}</span> (
              <span className="font-num">{Math.round((s.correct / s.questions) * 100)}%</span>)
            </>
          )}
        </p>
      </div>
      {s.sessions === 0 ? (
        <p className="text-sm text-ink-3">Chưa có buổi {skill} nào làm đề trong 4 tuần qua.</p>
      ) : wrong === 0 ? (
        <p className="text-sm text-ink-2">Không sai câu nào.</p>
      ) : (
        <ul className="space-y-2.5">
          {types.map((t, i) => (
            <li key={t.mark}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink">
                  {t.mark} {t.label}
                  {s.errors[i] === max && max > 0 && <span className="ml-1.5 text-xs text-ink-3">nhiều nhất</span>}
                </span>
                <span className="font-num font-semibold text-ink">{s.errors[i]}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-indigo" style={{ width: `${(s.errors[i] / wrong) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- Lịch sử buổi luyện */

function SessionHistory({ blocks }: { blocks: FocusBlock[] }) {
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<FocusBlock | null>(null);
  const [toDelete, setToDelete] = useState<FocusBlock | null>(null);

  // Mới nhất lên đầu: ngày rồi giờ bắt đầu.
  const sorted = [...blocks].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  async function save(b: FocusBlock) {
    // Sửa giữ nguyên ngày gốc của block (form đã giữ).
    await db.focusBlocks.put(b);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await db.focusBlocks.delete(toDelete.id);
    setToDelete(null);
    setEditing(null);
  }

  if (editing) {
    return (
      <Card className="mb-4 @3xl/content:max-w-2xl">
        <SectionLabel>Sửa buổi IELTS · {formatShortDate(editing.date)}</SectionLabel>
        <FocusBlockForm date={editing.date} existing={editing} onSave={save} onCancel={() => setEditing(null)} />
        <Button variant="danger" onClick={() => setToDelete(editing)} className="mt-3 w-full text-sm">
          Xoá buổi này
        </Button>
        <ConfirmDialog
          open={toDelete !== null}
          title="Xoá buổi IELTS này?"
          detail={
            toDelete && (
              <>
                <strong>
                  {formatShortDate(toDelete.date)} · {toDelete.startTime} · {formatMinutes(toDelete.minutes)}
                </strong>
                {toDelete.ielts && (
                  <>
                    <br />
                    {sessionSummary(toDelete.ielts)}
                  </>
                )}
              </>
            )
          }
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      </Card>
    );
  }

  if (sorted.length === 0) {
    return <EmptyState title="Chưa có buổi IELTS nào" hint='Bấm "Bắt đầu IELTS" ở Tổng quan hoặc Hôm nay.' />;
  }

  return (
    <section className="pb-4 @3xl/content:max-w-2xl">
      <SectionLabel className="px-1" right="bấm để sửa">
        <span className="font-num">{sorted.length}</span> buổi
      </SectionLabel>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
        {sorted.slice(0, shown).map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setEditing(b)}
              aria-label={`Sửa buổi IELTS ${formatShortDate(b.date)} ${b.startTime}`}
              className="min-h-[52px] w-full px-4 py-3 text-left active:bg-surface-2"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-num text-ink-2">{formatShortDate(b.date).slice(0, 5)}</span>
                <span className="font-num text-ink-2">{b.startTime}</span>
                <span className="font-num font-semibold text-ink">{formatMinutes(b.minutes)}</span>
              </div>
              <p className="mt-1 text-sm text-ink">{b.ielts ? sessionSummary(b.ielts) : "Chưa ghi phần IELTS"}</p>
            </button>
          </li>
        ))}
      </ul>
      {shown < sorted.length && (
        <Button variant="secondary" onClick={() => setShown(shown + PAGE)} className="mt-3 w-full text-sm">
          Xem thêm {Math.min(PAGE, sorted.length - shown)} buổi
        </Button>
      )}
    </section>
  );
}
