/**
 * Quản lý bộ thẻ: tạo / sửa / xoá, lọc theo area.
 *
 * Thẻ tạo từ brain dump có mặt sau TRỐNG — màn hình này đẩy chúng lên đầu
 * để bạn thấy ngay còn thẻ nào chưa điền đáp án.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Area, Card } from "../db/types";
import { AREAS } from "../db/types";
import { newId, todayISO } from "../lib/dates";
import { getLastArea, setLastArea } from "../lib/prefs";
import { newCardState } from "../lib/scheduling";

import ConfirmDialog from "./ConfirmDialog";
import { Button, Card as CardBox, ChipGroup, EmptyState, Field, TextArea } from "./ui";

/** "Tất cả" là lựa chọn lọc thêm, không phải một area thật. */
const ALL = "Tất cả";
type Filter = typeof ALL | Area;

export default function CardsView() {
  const today = todayISO();

  const [filter, setFilter] = useState<Filter>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [toDelete, setToDelete] = useState<Card | null>(null);

  const allCards = useLiveQuery(() => db.cards.toArray(), [], [] as Card[]);

  const visible = (filter === ALL ? allCards : allCards.filter((c) => c.area === filter))
    // Thẻ chưa có mặt sau lên trước, rồi tới thẻ mới tạo gần đây nhất.
    .sort((a, b) => {
      const aEmpty = a.back.trim() === "" ? 0 : 1;
      const bEmpty = b.back.trim() === "" ? 0 : 1;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const emptyBackCount = allCards.filter((c) => c.back.trim() === "").length;

  async function handleDelete() {
    if (!toDelete) return;
    // Chỉ xoá thẻ. Nhật ký ôn (reviewLogs) giữ lại để thống kê ở Phase 4
    // vẫn phản ánh đúng việc bạn đã ôn bao nhiêu lần.
    await db.cards.delete(toDelete.id);
    setToDelete(null);
  }

  if (formOpen) {
    return (
      <CardForm
        today={today}
        existing={editing}
        onDone={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="pb-4">
      <div className="mb-3 flex items-center gap-2">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex-1"
        >
          + Thẻ mới
        </Button>
        <span className="shrink-0 text-sm text-slate-400">{allCards.length} thẻ</span>
      </div>

      {emptyBackCount > 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {emptyBackCount} thẻ chưa có mặt sau — bấm vào để điền đáp án.
        </p>
      )}

      <Field label="Lọc theo area">
        <ChipGroup options={[ALL, ...AREAS] as const} value={filter} onChange={setFilter} />
      </Field>

      {visible.length === 0 ? (
        <EmptyState
          title={allCards.length === 0 ? "Chưa có thẻ nào" : "Không có thẻ trong area này"}
          hint={allCards.length === 0 ? 'Tạo ở đây, hoặc từ chỗ hổng trong brain dump' : undefined}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((card) => (
            <CardBox key={card.id} className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(card);
                  setFormOpen(true);
                }}
                className="flex-1 text-left"
              >
                <div className="text-sm font-semibold text-slate-900">{card.front}</div>
                {card.back.trim() === "" ? (
                  <div className="mt-1 text-sm font-semibold text-amber-600">
                    (chưa có mặt sau)
                  </div>
                ) : (
                  <div className="mt-1 line-clamp-2 text-sm text-slate-500">{card.back}</div>
                )}
                <div className="mt-1 text-xs text-slate-400">
                  {card.area} · đến hạn {card.dueDate}
                  {card.lapses > 0 && ` · quên ${card.lapses} lần`}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setToDelete(card)}
                className="tap-target shrink-0 rounded-xl px-3 text-sm font-semibold text-red-500 active:bg-red-50"
                aria-label="Xoá thẻ"
              >
                Xoá
              </button>
            </CardBox>
          ))}
        </div>
      )}

      {/* Luật số 4: xoá phải có xác nhận nói rõ mất cái gì. */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Xoá thẻ này?"
        detail={
          toDelete && (
            <>
              <strong>{toDelete.front}</strong>
              <br />
              {toDelete.area} · đã ôn {toDelete.reps} lần
            </>
          )
        }
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ==================== Form tạo / sửa thẻ ==================== */

function CardForm({
  today,
  existing,
  onDone,
}: {
  today: string;
  existing: Card | null;
  onDone: () => void;
}) {
  const [front, setFront] = useState(existing?.front ?? "");
  const [back, setBack] = useState(existing?.back ?? "");
  const [area, setArea] = useState<Area>(existing?.area ?? getLastArea());

  async function handleSave() {
    if (front.trim() === "") return;
    setLastArea(area);

    if (existing) {
      // Sửa nội dung thôi — KHÔNG đụng vào lịch ôn (dueDate, reps, ease...),
      // nếu không thì sửa một lỗi chính tả sẽ làm mất tiến độ học của thẻ.
      await db.cards.update(existing.id, {
        front: front.trim(),
        back: back.trim(),
        area,
      });
    } else {
      const state = newCardState();
      await db.cards.add({
        id: newId(),
        front: front.trim(),
        back: back.trim(),
        area,
        createdAt: today,
        dueDate: today, // thẻ mới ôn ngay hôm nay
        intervalDays: state.intervalDays,
        ease: state.ease,
        reps: state.reps,
        lapses: state.lapses,
      });
    }
    onDone();
  }

  return (
    <CardBox className="mb-4">
      <h2 className="mb-3 text-base font-bold text-slate-900">
        {existing ? "Sửa thẻ" : "Thẻ mới"}
      </h2>

      <Field label="Mặt trước" hint="câu hỏi">
        <TextArea value={front} onChange={setFront} rows={3} placeholder="vd: WACC tính thế nào?" />
      </Field>

      <Field label="Mặt sau" hint="đáp án">
        <TextArea value={back} onChange={setBack} rows={5} placeholder="Viết bằng lời của bạn." />
      </Field>

      <Field label="Area">
        <ChipGroup options={AREAS} value={area} onChange={setArea} />
      </Field>

      {existing && (
        <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Sửa nội dung không làm mất tiến độ ôn: thẻ vẫn đến hạn {existing.dueDate}, đã ôn{" "}
          {existing.reps} lần.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDone} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={handleSave} disabled={front.trim() === ""} className="flex-1">
          {existing ? "Cập nhật" : "Tạo thẻ"}
        </Button>
      </div>
    </CardBox>
  );
}
