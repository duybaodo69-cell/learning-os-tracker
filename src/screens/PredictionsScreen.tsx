/**
 * Màn hình "Dự đoán".
 *
 * Hai mục con:
 *   Dự đoán  — danh sách: đến hạn chấm / đang mở / đã chấm
 *   Điểm số  — Brier score và biểu đồ calibration
 */
import { Suspense, lazy, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Prediction } from "../db/types";
import { daysUntil, formatShortDate } from "../lib/dates";
import { useToday } from "../lib/useToday";
import {
  BRIER_ALWAYS_FIFTY,
  MIN_RESOLVED_FOR_CONCLUSION,
  averageBrier,
  averageBrierLastDays,
  brierScore,
  buildCalibration,
  compareToFifty,
  fiftyVerdict,
  describeBrier,
  hasEnoughToConclude,
  resolvedOnly,
} from "../lib/calibration";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import PredictionForm from "../components/PredictionForm";
/**
 * Recharts nặng ~330KB. Nếu nạp cùng app thì mỗi lần mở "Hôm nay" cũng
 * phải tải nó, dù không dùng tới. `lazy` khiến trình duyệt chỉ tải khi
 * bạn thực sự mở tab "Điểm số".
 */
const CalibrationChart = lazy(() => import("../components/CalibrationChart"));
import { Button, Card, EmptyState, SectionLabel, Segmented, Tag } from "../components/ui";

type View = "list" | "score";

export default function PredictionsScreen() {
  const today = useToday();

  const [view, setView] = useState<View>("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [toDelete, setToDelete] = useState<Prediction | null>(null);

  const all = useLiveQuery(() => db.predictions.toArray(), [], [] as Prediction[]);

  /* ----- Chia thành 3 nhóm ----- */
  const dueToScore = all
    .filter((p) => p.outcome === null && p.resolveBy <= today)
    .sort((a, b) => a.resolveBy.localeCompare(b.resolveBy)); // quá hạn lâu nhất lên trước

  const open = all
    .filter((p) => p.outcome === null && p.resolveBy > today)
    .sort((a, b) => a.resolveBy.localeCompare(b.resolveBy)); // sắp tới hạn lên trước

  const resolved = all
    .filter((p) => p.outcome !== null)
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""));

  async function save(p: Prediction) {
    await db.predictions.put(p);
    setFormOpen(false);
    setEditing(null);
  }

  /** Chấm đúng/sai. Ghi luôn ngày chấm để tính Brier 30 ngày gần đây. */
  async function resolve(p: Prediction, outcome: boolean) {
    await db.predictions.update(p.id, { outcome, resolvedAt: today });
  }

  async function handleDelete() {
    if (!toDelete) return;
    await db.predictions.delete(toDelete.id);
    setToDelete(null);
  }

  if (formOpen) {
    return (
      <ScreenShell title="Dự đoán" subtitle={editing ? "Sửa dự đoán" : "Dự đoán mới"}>
        <Card className="mb-4">
          <PredictionForm
            existing={editing ?? undefined}
            onSave={save}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </Card>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Dự đoán"
      subtitle={view === "list" ? "Dự đoán có xác suất" : "Brier score và calibration"}
    >
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: "list" as View, label: "Dự đoán", badge: dueToScore.length },
          { id: "score" as View, label: "Điểm số · Calibration" },
        ]}
      />

      {view === "list" ? (
        <ListView
          today={today}
          all={all}
          dueToScore={dueToScore}
          open={open}
          resolved={resolved}
          onNew={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onEdit={(p) => {
            setEditing(p);
            setFormOpen(true);
          }}
          onResolve={resolve}
          onDelete={setToDelete}
        />
      ) : (
        <ScoreView all={all} today={today} />
      )}

      {/* Luật số 4: xoá phải xác nhận và nói rõ mất cái gì. */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Xoá dự đoán này?"
        detail={
          toDelete && (
            <>
              <strong>{toDelete.statement}</strong>
              <br />
              {toDelete.probability}% · {toDelete.category} · hạn {toDelete.resolveBy}
              {toDelete.outcome !== null && " · đã chấm"}
            </>
          )
        }
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenShell>
  );
}

/* ==================== Danh sách ==================== */

/**
 * Màu cho con số Brier: tốt hơn 0.25 thì xanh, kém hơn thì đỏ, ngang thì
 * trung tính. Dùng CHUNG phán định với câu chữ (fiftyVerdict), nên màu và
 * chữ không bao giờ nói ngược nhau.
 */
function brierTone(score: number): string {
  const v = fiftyVerdict(score);
  if (v === "better") return "text-good";
  if (v === "worse") return "text-bad-ink";
  return "text-ink";
}

function ListView({
  today,
  all,
  dueToScore,
  open,
  resolved,
  onNew,
  onEdit,
  onResolve,
  onDelete,
}: {
  today: string;
  all: Prediction[];
  dueToScore: Prediction[];
  open: Prediction[];
  resolved: Prediction[];
  onNew: () => void;
  onEdit: (p: Prediction) => void;
  onResolve: (p: Prediction, outcome: boolean) => void;
  onDelete: (p: Prediction) => void;
}) {
  const overall = averageBrier(all);

  return (
    <div className="pb-4">
      {/* ---------- Tóm tắt ---------- */}
      {all.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2">
          <Card className="p-3">
            <SectionLabel>Brier (tất cả)</SectionLabel>
            <div className={`font-num text-3xl font-semibold ${overall === null ? "text-ink-3" : brierTone(overall)}`}>
              {overall === null ? "—" : overall.toFixed(3)}
            </div>
            <p className="mt-1 text-xs text-ink-2">{compareToFifty(overall)}</p>
          </Card>
          <Card className="p-3">
            <SectionLabel>Tiến độ</SectionLabel>
            <p className="text-base leading-snug text-ink">
              Đã chấm <span className="font-num font-semibold">{resolved.length}</span>
              <span className="text-ink-3"> · </span>
              Chờ chấm{" "}
              <span className={`font-num font-semibold ${dueToScore.length > 0 ? "text-warn" : ""}`}>
                {dueToScore.length}
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-2">
              <span className="font-num">{open.length}</span> đang mở
            </p>
          </Card>
        </div>
      )}

      {all.length === 0 && (
        <div className="mb-4">
          <EmptyState
            title="Chưa có dự đoán nào"
            hint="Viết một dự đoán kèm xác suất, sau đó chấm đúng/sai khi tới hạn"
          />
        </div>
      )}

      {/* ---------- Đến hạn chấm ---------- */}
      {dueToScore.length > 0 && (
        <Section title="Đến hạn chấm" count={dueToScore.length} tone="urgent">
          {dueToScore.map((p) => (
            <Card key={p.id} className="border-warn/40">
              <Statement p={p} today={today} />
              {/* Hai nút to, bấm một phát là xong. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(p, true)}
                  className="tap-target rounded-lg border border-good/40 bg-good/12 font-bold text-good active:bg-good/25"
                >
                  Đúng
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(p, false)}
                  className="tap-target rounded-lg border border-bad/40 bg-bad/12 font-bold text-bad-ink active:bg-bad/20"
                >
                  Sai
                </button>
              </div>
            </Card>
          ))}
        </Section>
      )}

      <Button onClick={onNew} className="mb-5 w-full py-3 text-base">
        + Tạo dự đoán mới
      </Button>

      {/* ---------- Đang mở ---------- */}
      {open.length > 0 && (
        <Section title="Đang mở" count={open.length}>
          {open.map((p) => (
            <Card key={p.id} className="flex items-start gap-2">
              <button type="button" onClick={() => onEdit(p)} className="min-w-0 flex-1 text-left">
                <Statement p={p} today={today} />
              </button>
              <DeleteButton onClick={() => onDelete(p)} />
            </Card>
          ))}
        </Section>
      )}

      {/* ---------- Đã chấm ---------- */}
      {resolved.length > 0 && (
        <Section title="Đã chấm gần đây" count={resolved.length}>
          <Card className="divide-y divide-line px-0 py-0">
            {resolved.map((p) => {
              const score = brierScore(p.probability, p.outcome as boolean);
              return (
                <div key={p.id} className="flex items-center gap-2 px-4 py-3">
                  <button type="button" onClick={() => onEdit(p)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium text-ink">{p.statement}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                      <span>
                        Dự đoán <span className="font-num text-ink">{p.probability}%</span>
                      </span>
                      <Tag tone={p.outcome ? "good" : "bad"}>
                        Thực tế: {p.outcome ? "Đúng" : "Sai"}
                      </Tag>
                    </div>
                  </button>
                  <div className="shrink-0 text-right">
                    <div className={`font-num text-lg font-semibold ${brierTone(score)}`}>
                      {score.toFixed(2)}
                    </div>
                    <div className="text-xs text-ink-3">Brier</div>
                  </div>
                  <DeleteButton onClick={() => onDelete(p)} />
                </div>
              );
            })}
          </Card>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "urgent";
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className={"h-1.5 w-1.5 rounded-full " + (tone === "urgent" ? "bg-warn" : "bg-accent")}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold tracking-wide text-ink uppercase">{title}</span>
        <span className="rounded border border-line bg-surface-2 px-1.5 font-num text-xs text-ink-2">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Phần nội dung chung của một dự đoán chưa chấm. */
function Statement({ p, today }: { p: Prediction; today: string }) {
  const left = daysUntil(today, p.resolveBy);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Tag tone="indigo">{p.category}</Tag>
            {p.outcome === null &&
              (left < 0 ? (
                <span className="text-xs font-semibold text-warn">Quá hạn {-left} ngày</span>
              ) : left === 0 ? (
                <span className="text-xs font-semibold text-warn">Hạn hôm nay</span>
              ) : (
                <span className="text-xs text-good">Còn {left} ngày</span>
              ))}
            <span className="font-num text-xs text-ink-2">Hạn {formatShortDate(p.resolveBy)}</span>
          </div>
          <div className="text-base leading-snug font-medium text-ink">{p.statement}</div>
        </div>
        <div className="shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-center">
          <div className="text-xs text-ink-3">Xác suất</div>
          <div className="font-num text-lg font-semibold text-accent">{p.probability}%</div>
        </div>
      </div>
      {p.preMortem && (
        <div className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
          <span className="font-semibold text-warn">Pre-mortem:</span> {p.preMortem}
        </div>
      )}
      {p.note && (
        <div className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
          <span className="font-semibold text-accent">Ghi chú:</span> {p.note}
        </div>
      )}
    </>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target shrink-0 rounded-lg px-2 text-sm font-medium text-bad-ink active:bg-bad/15"
      aria-label="Xoá dự đoán"
    >
      Xoá
    </button>
  );
}

/* ==================== Điểm số ==================== */

function ScoreView({ all, today }: { all: Prediction[]; today: string }) {
  const overall = averageBrier(all);
  const last30 = averageBrierLastDays(all, today, 30);
  const buckets = buildCalibration(all);
  const resolvedCount = resolvedOnly(all).length;
  const enough = hasEnoughToConclude(all);

  return (
    <div className="pb-4">
      {/* ---------- Brier score ---------- */}
      <Card className="mb-4">
        <SectionLabel>Brier score</SectionLabel>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="font-num text-3xl font-semibold text-ink">
              {overall === null ? "—" : overall.toFixed(3)}
            </div>
            <div className="text-xs text-ink-3">tất cả ({resolvedCount} đã chấm)</div>
          </div>
          <div>
            <div className="font-num text-3xl font-semibold text-ink">
              {last30 === null ? "—" : last30.toFixed(3)}
            </div>
            <div className="text-xs text-ink-3">30 ngày gần đây</div>
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold text-ink">{describeBrier(overall)}</p>

        {/* Thước đo để con số có ý nghĩa, thay vì chỉ là một số trơ trọi. */}
        <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
          <div className="mb-1.5 font-semibold text-ink-2">Mốc so sánh</div>
          <ul className="space-y-1 text-ink-2">
            <li className="flex justify-between">
              <span>Hoàn hảo</span>
              <span className="font-semibold font-num">0.000</span>
            </li>
            <li className="flex justify-between">
              <span>Luôn nói 50%</span>
              <span className="font-semibold font-num">{BRIER_ALWAYS_FIFTY.toFixed(3)}</span>
            </li>
            <li className="flex justify-between">
              <span>Tệ nhất có thể</span>
              <span className="font-semibold font-num">1.000</span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-3">
            Càng thấp càng tốt. Nói 90% mà sai bị phạt 0.81; nói 50% thì luôn đúng 0.25 — an toàn
            nhưng vô dụng.
          </p>
        </div>
      </Card>

      {/* ---------- Calibration ---------- */}
      <Card className="mb-4">
        <SectionLabel>Calibration</SectionLabel>
        <p className="mt-1 mb-2 text-sm text-ink-2">
          Chấm dưới đường chéo = nói cao hơn thực tế (quá tự tin). Chấm trên = quá dè dặt.
        </p>

        {/* Suspense hiện chỗ giữ chỗ trong lúc biểu đồ đang tải. */}
        <Suspense
          fallback={
            <div className="flex aspect-square w-full items-center justify-center text-sm text-ink-3">
              Đang tải biểu đồ...
            </div>
          }
        >
          <CalibrationChart buckets={buckets} />
        </Suspense>

        {/* Bảng số liệu — biểu đồ trên điện thoại nhỏ, cần con số kèm theo. */}
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-3">
              <th className="py-1 text-left font-semibold">Khoảng</th>
              <th className="py-1 text-right font-semibold">Số DĐ</th>
              <th className="py-1 text-right font-semibold">Nói</th>
              <th className="py-1 text-right font-semibold">Thực tế</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label} className="border-t border-line">
                <td className="py-1.5 text-ink-2">{b.label}</td>
                <td className="py-1.5 text-right font-num">{b.count}</td>
                <td className="py-1.5 text-right font-num text-ink-2">
                  {b.statedAverage === null ? "—" : `${Math.round(b.statedAverage)}%`}
                </td>
                <td className="py-1.5 text-right font-semibold font-num">
                  {b.actualRate === null ? "—" : `${Math.round(b.actualRate)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!enough && (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
            Mới có {resolvedCount}/{MIN_RESOLVED_FOR_CONCLUSION} dự đoán đã chấm — chưa đủ dữ liệu
            để kết luận. Cứ tiếp tục ghi, đừng vội đổi cách ước lượng dựa trên biểu đồ này.
          </p>
        )}
      </Card>
    </div>
  );
}
