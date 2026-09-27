/**
 * Lịch sử brain dump — xem lại MỌI lần đã viết, không chỉ 5 lần gần nhất.
 *
 *   - lọc theo area, tìm theo chữ (không cần gõ dấu)
 *   - mỗi trang 10 bản, "Xem thêm" để tải tiếp
 *   - bấm một bản để đọc đầy đủ, xem các thẻ tạo từ nó, sửa hoặc xoá
 *
 * Xoá luôn qua ConfirmDialog (luật số 4). Thẻ tạo từ brain dump KHÔNG bị xoá
 * theo: chúng đã là thẻ ôn tập riêng, có lịch và lịch sử ôn của riêng chúng.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Area, BrainDump, Card } from "../db/types";
import { AREAS } from "../db/types";
import { filterBrainDumps } from "../lib/brainDump";
import { formatDayLabel } from "../lib/dates";
import ConfirmDialog from "./ConfirmDialog";
import { Button, ChipGroup, EmptyState, Field, Tag, TextArea, TextInput } from "./ui";

/** Số bản mỗi lần tải. */
export const HISTORY_PAGE = 10;

const ALL = "Tất cả";
type AreaFilter = Area | typeof ALL;

export default function BrainDumpHistory() {
  const dumps = useLiveQuery(() => db.brainDumps.toArray(), [], [] as BrainDump[]);
  // Chỉ cần thẻ có gắn brain dump — để hiện "các thẻ tạo từ lần này".
  const linkedCards = useLiveQuery(
    async () => (await db.cards.toArray()).filter((c) => c.brainDumpId),
    [],
    [] as Card[]
  );

  const [area, setArea] = useState<AreaFilter>(ALL);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(HISTORY_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BrainDump | null>(null);
  const [deleting, setDeleting] = useState<BrainDump | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = filterBrainDumps(dumps, area === ALL ? null : area, query);
  const visible = filtered.slice(0, shown);
  const cardsOf = (id: string) => linkedCards.filter((c) => c.brainDumpId === id);

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await db.brainDumps.put({ ...editing, recalled: editing.recalled.trim(), gaps: editing.gaps.trim() });
      setEditing(null);
    } catch {
      setError("Chưa lưu được thay đổi. Hãy thử lại.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setError(null);
    try {
      await db.brainDumps.delete(deleting.id);
      setOpenId(null);
    } catch {
      setError("Chưa xoá được. Hãy thử lại.");
    }
    setDeleting(null);
  }

  return (
    <section>
      <h2 className="flex items-baseline justify-between px-1 pb-2 text-sm font-medium text-ink-2">
        <span>Lịch sử</span>
        {dumps.length > 0 && (
          <span className="text-xs text-ink-3">
            <span className="font-num">{dumps.length}</span> lần
          </span>
        )}
      </h2>

      {dumps.length === 0 ? (
        <EmptyState title="Chưa có brain dump nào" hint="Lần đầu tiên bắt đầu ở trên" />
      ) : (
        <>
          <div className="mb-3 space-y-2">
            <ChipGroup
              options={[ALL, ...AREAS] as AreaFilter[]}
              value={area}
              onChange={(a) => {
                setArea(a);
                setShown(HISTORY_PAGE);
              }}
              scroll
            />
            <TextInput
              value={query}
              onChange={(v) => {
                setQuery(v);
                setShown(HISTORY_PAGE);
              }}
              placeholder="Tìm trong brain dump…"
            />
          </div>

          {error && (
            <p role="alert" className="mb-2 rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad-ink">
              {error}
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-ink-3">Không có brain dump nào khớp.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((d) =>
                editing?.id === d.id ? (
                  <EditForm
                    key={d.id}
                    value={editing}
                    onChange={setEditing}
                    onSave={saveEdit}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <DumpRow
                    key={d.id}
                    dump={d}
                    cards={cardsOf(d.id)}
                    open={openId === d.id}
                    onToggle={() => setOpenId(openId === d.id ? null : d.id)}
                    onEdit={() => setEditing(d)}
                    onDelete={() => setDeleting(d)}
                  />
                )
              )}
            </div>
          )}

          {filtered.length > shown && (
            <Button variant="ghost" onClick={() => setShown(shown + HISTORY_PAGE)} className="mt-2 w-full text-sm">
              Xem thêm ({filtered.length - shown} bản nữa)
            </Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xoá brain dump này?"
        detail={
          deleting && (
            <>
              <p>
                {deleting.area} · {formatDayLabel(deleting.date)} · {deleting.minutes}p
              </p>
              {cardsOf(deleting.id).length > 0 && (
                <p className="mt-1 text-ink-2">
                  {cardsOf(deleting.id).length} thẻ tạo từ lần này vẫn được giữ trong Kho thẻ.
                </p>
              )}
            </>
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

/* ==================== Một dòng lịch sử ==================== */

function DumpRow({
  dump,
  cards,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  dump: BrainDump;
  cards: Card[];
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-4 py-3 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-ink">{dump.area}</span>
          <span className="shrink-0 text-xs text-ink-3">
            {formatDayLabel(dump.date)} · {dump.minutes}p
          </span>
        </div>
        {!open && dump.recalled && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{dump.recalled}</p>}
        {!open && dump.gaps && <p className="mt-1 line-clamp-1 text-sm text-warn">Hổng: {dump.gaps}</p>}
      </button>

      {open && (
        <div className="border-t border-line/70 px-4 py-3">
          <p className="text-xs font-medium text-ink-3">Nhớ được</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{dump.recalled || "—"}</p>
          <p className="mt-3 text-xs font-medium text-ink-3">Chỗ hổng</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{dump.gaps || "—"}</p>

          {cards.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium text-ink-3">Thẻ tạo từ lần này ({cards.length})</p>
              <ul className="mt-1 space-y-1">
                {cards.map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-2 text-sm text-ink-2">
                    <span className="min-w-0">{c.front}</span>
                    {c.back.trim() === "" ? <Tag tone="warn">nháp</Tag> : <Tag>đang ôn</Tag>}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={onEdit} className="flex-1 text-sm">
              Sửa
            </Button>
            <Button variant="danger" onClick={onDelete} className="flex-1 text-sm">
              Xoá
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Sửa một brain dump ==================== */

function EditForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: BrainDump;
  onChange: (d: BrainDump) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-accent/50 bg-surface p-4">
      <Field label="Area">
        <ChipGroup options={AREAS} value={value.area} onChange={(area) => onChange({ ...value, area })} scroll />
      </Field>
      <Field label="Nhớ được">
        <TextArea value={value.recalled} onChange={(recalled) => onChange({ ...value, recalled })} rows={6} />
      </Field>
      <Field label="Chỗ hổng" hint="sửa ở đây không tạo thêm thẻ">
        <TextArea value={value.gaps} onChange={(gaps) => onChange({ ...value, gaps })} rows={4} />
      </Field>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={onSave} className="flex-1">
          Lưu
        </Button>
      </div>
    </div>
  );
}
