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
    // Xoá từ trong form sửa -> đóng luôn form.
    setFormOpen(false);
    setEditing(null);
  }

  // Hộp xác nhận xoá dùng chung cho màn danh sách và form sửa.
  const deleteDialog = (
    /* Luật số 4: xoá phải xác nhận và nói rõ mất cái gì. */
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
  );

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
          {/* Nút xoá nằm trong form sửa, không rải trên từng dòng danh sách. */}
          {editing && (
            <Button variant="danger" onClick={() => setToDelete(editing)} className="mt-3 w-full text-sm">
              Xoá dự đoán này
            </Button>
          )}
        </Card>
        {deleteDialog}
      </ScreenShell>
    );
  }

  const overall = averageBrier(all);

  return (
    <ScreenShell
      title="Dự đoán"
      subtitle={
        all.length === 0
          ? "Dự đoán có xác suất"
          : `Đã chấm ${resolved.length} · Chờ chấm ${dueToScore.length}`
      }
      right={
        overall !== null && (
          <span className="text-sm text-ink-2">
            Brier <span className={`font-num font-semibold ${brierTone(overall)}`}>{overall.toFixed(3)}</span>
          </span>
        )
      }
    >
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: "list" as View, label: "Dự đoán", badge: dueToScore.length },
          { id: "score" as View, label: "Điểm số" },
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
        />
      ) : (
        <ScoreView all={all} today={today} />
      )}

      {deleteDialog}
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

/** Số dự đoán đã chấm hiện sẵn trước khi bấm "Xem tất cả". */
const RESOLVED_PREVIEW = 5;

function ListView({
  today,
  all,
  dueToScore,
  open,
  resolved,
  onNew,
  onEdit,
  onResolve,
}: {
  today: string;
  all: Prediction[];
  dueToScore: Prediction[];
  open: Prediction[];
  resolved: Prediction[];
  onNew: () => void;
  onEdit: (p: Prediction) => void;
  onResolve: (p: Prediction, outcome: boolean) => void;
}) {
  // Tóm tắt (đã chấm / chờ chấm / Brier) nằm ở dòng tiêu đề — không lặp
  // lại thành hai thẻ to ở đây nữa.
  // Danh sách đã chấm chỉ hiện 5 dòng mới nhất, bấm mới hiện hết.
  const [showAllResolved, setShowAllResolved] = useState(false);
  const resolvedShown = showAllResolved ? resolved : resolved.slice(0, RESOLVED_PREVIEW);

  return (
    <div className="pb-4">

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
        <Section title="Cần chấm" count={dueToScore.length} tone="urgent">
          {dueToScore.map((p) => (
            <Card key={p.id}>
              <Statement p={p} today={today} />
              {/* Hai nút to, bấm một phát là xong. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onResolve(p, true)}
                  className="tap-target rounded-xl bg-good/12 font-bold text-good active:bg-good/25"
                >
                  ✓ Đúng
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(p, false)}
                  className="tap-target rounded-xl bg-bad/12 font-bold text-bad-ink active:bg-bad/20"
                >
                  ✕ Sai
                </button>
              </div>
            </Card>
          ))}
        </Section>
      )}

      <Button onClick={onNew} className="mb-5 w-full py-3 text-base">
        + Tạo dự đoán mới
      </Button>

      {/* ---------- Đang chờ: một danh sách gọn, bấm để sửa ---------- */}
      {open.length > 0 && (
        <Section title="Đang chờ" count={open.length}>
          <div className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
            {open.map((p) => {
              const left = daysUntil(today, p.resolveBy);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onEdit(p)}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium text-ink">{p.statement}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                      <Tag tone="indigo">{p.category}</Tag>
                      <span>
                        Hạn <span className="font-num">{formatShortDate(p.resolveBy)}</span> · còn{" "}
                        <span className="font-num">{left}</span> ngày
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-num text-lg font-semibold text-accent">{p.probability}%</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---------- Đã chấm ---------- */}
      {resolved.length > 0 && (
        <Section title="Đã chấm gần đây" count={resolved.length}>
          <Card className="divide-y divide-line/70 px-0 py-0">
            {resolvedShown.map((p) => {
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
                </div>
              );
            })}
            {resolved.length > RESOLVED_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllResolved(!showAllResolved)}
                className="tap-target w-full px-4 text-sm font-semibold text-accent active:bg-surface-2"
              >
                {showAllResolved ? "Thu gọn" : `Xem tất cả (${resolved.length})`}
              </button>
            )}
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
        <span className="text-sm font-medium text-ink-2">{title}</span>
        <span className="rounded-md bg-surface-2 px-1.5 font-num text-xs text-ink-2">
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
        <div className="shrink-0 text-right">
          <div className="font-num text-3xl leading-none font-semibold text-accent">{p.probability}%</div>
          <div className="mt-1 text-xs text-ink-3">xác suất</div>
        </div>
      </div>
      {p.preMortem && (
        <div className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
          <span className="font-semibold text-warn">Pre-mortem:</span> {p.preMortem}
        </div>
      )}
      {p.note && (
        <div className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
          <span className="font-semibold text-accent">Ghi chú:</span> {p.note}
        </div>
      )}
    </>
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
        <SectionLabel right="thấp hơn = tốt hơn">Brier score</SectionLabel>

        <div className="mt-1 grid grid-cols-2 gap-3">
          <div>
            <div className={`font-num text-4xl font-semibold ${overall === null ? "text-ink-3" : brierTone(overall)}`}>
              {overall === null ? "—" : overall.toFixed(3)}
            </div>
            <div className="text-xs text-ink-3">tất cả ({resolvedCount} đã chấm)</div>
          </div>
          <div>
            <div className="font-num text-4xl font-semibold text-ink">
              {last30 === null ? "—" : last30.toFixed(3)}
            </div>
            <div className="text-xs text-ink-3">30 ngày gần đây</div>
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold text-ink">{describeBrier(overall)}</p>

        {/* Thước đo để con số có ý nghĩa — gập lại, bấm mới mở cho đỡ rối. */}
        <details className="group mt-3 rounded-xl bg-surface-2 px-3 text-sm">
          <summary className="tap-target flex cursor-pointer list-none items-center justify-between font-semibold text-ink-2">
            Mốc so sánh
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="space-y-1 pb-1 text-ink-2">
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
          <p className="mt-2 pb-3 text-xs text-ink-3">
            Càng thấp càng tốt. Nói 90% mà sai bị phạt 0.81; nói 50% thì luôn đúng 0.25 — an toàn
            nhưng vô dụng.
          </p>
        </details>
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

        {/* Bảng số liệu — biểu đồ trên điện thoại nhỏ, cần con số kèm theo.
            Gập lại mặc định. */}
        <details className="group mt-3 rounded-xl bg-surface-2 px-3 text-sm">
          <summary className="tap-target flex cursor-pointer list-none items-center justify-between font-semibold text-ink-2">
            Bảng số liệu
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
          </summary>
        <table className="mb-2 w-full text-sm">
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
              <tr key={b.label} className="border-t border-line/70">
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
        </details>

        {!enough && (
          <p className="mt-3 text-xs text-ink-3">
            Sơ bộ — mới có {resolvedCount}/{MIN_RESOLVED_FOR_CONCLUSION} dự đoán đã chấm — chưa đủ dữ liệu
            để kết luận. Cứ tiếp tục ghi, đừng vội đổi cách ước lượng dựa trên biểu đồ này.
          </p>
        )}
      </Card>
    </div>
  );
}
