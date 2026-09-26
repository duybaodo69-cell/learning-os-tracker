/**
 * Màn hình "Hôm nay" — màn hình bạn mở nhiều nhất trong ngày.
 *
 * Thứ tự từ trên xuống, theo mức độ cần nhìn:
 *   1. Banner giai đoạn protocol
 *   2. Check-in sáng (nếu chưa có thì hiện form ngay tại đây)
 *   3. Bộ đếm giờ + nút "+ Block"
 *   4. Tổng số phút deep work hôm nay, tách theo area
 *   5. Danh sách các khối đã log (bấm để sửa, có nút xoá kèm xác nhận)
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, isDemoMode } from "../db/db";
import type { DailyCheckin, Experiment, ExperimentTag, FocusBlock, Prediction, ReviewLog, WeeklyReview } from "../db/types";
import { formatDayLabel, formatMinutes, nowHHmm, todayISO, yesterdayISO } from "../lib/dates";
import { useToday } from "../lib/useToday";
import {
  addTimerDistraction,
  clearTimer,
  clearTimerDistractions,
  elapsedClock,
  elapsedMinutes,
  getTimerDistractions,
  getTimerStart,
  isSuspiciousDuration,
  removeTimerDistraction,
  SUSPICIOUS_MINUTES,
  startTimer,
} from "../lib/timer";
import { computeMetrics, isSunday, mondayOf } from "../lib/metrics";
import { EXPORT_REMINDER_DAYS, daysSinceLastExport } from "../lib/backup";

import ScreenShell from "../components/ScreenShell";
import ProtocolBanner from "../components/ProtocolBanner";
import CheckinForm from "../components/CheckinForm";
import FocusBlockForm from "../components/FocusBlockForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, Card } from "../components/ui";
import WeeklyReviewCard from "../components/WeeklyReviewCard";
import ExperimentChip from "../components/ExperimentChip";
import type { TabId } from "../components/BottomNav";
import type { ReviewView } from "./ReviewScreen";

export default function TodayScreen({
  onNavigate,
}: {
  /** Chuyển sang tab khác, kèm mục con — dùng cho nút tắt Brain dump. */
  onNavigate: (tab: TabId, view?: ReviewView) => void;
}) {
  // Hook tự tính lại ngày khi qua nửa đêm — xem lib/useToday.ts.
  const today = useToday();

  /* ----- Dữ liệu từ database -----
     useLiveQuery tự chạy lại và vẽ lại màn hình mỗi khi dữ liệu đổi.
     Không cần tự gọi "tải lại" ở đâu cả. */
  /* CẨN THẬN chỗ này:
     - db.checkins.get() trả về `undefined` khi KHÔNG CÓ bản ghi
     - useLiveQuery trả về `undefined` khi ĐANG ĐỌC database
     Hai tình huống khác hẳn nhau nhưng cùng một giá trị -> rất dễ nhầm.
     Nên ở đây đổi "không có" thành `null`, để:
        undefined = đang đọc   |   null = chưa check-in   |   object = đã có */
  const checkin = useLiveQuery(async () => (await db.checkins.get(today)) ?? null, [today]);
  const yesterdayCheckin = useLiveQuery(
    async () => (await db.checkins.get(yesterdayISO())) ?? null,
    [today]
  );
  const blocks = useLiveQuery(
    () => db.focusBlocks.where("date").equals(today).toArray(),
    [today],
    [] as FocusBlock[]
  );

  // Phase 4: dữ liệu cho thẻ tổng kết tuần và chip thí nghiệm.
  const experiments = useLiveQuery(() => db.experiments.toArray(), [], [] as Experiment[]);
  const experimentTags = useLiveQuery(() => db.experimentTags.toArray(), [], [] as ExperimentTag[]);
  const allCheckins = useLiveQuery(() => db.checkins.toArray(), [], [] as DailyCheckin[]);
  const allBlocks = useLiveQuery(() => db.focusBlocks.toArray(), [], [] as FocusBlock[]);
  const allLogs = useLiveQuery(() => db.reviewLogs.toArray(), [], [] as ReviewLog[]);
  const allPredictions = useLiveQuery(() => db.predictions.toArray(), [], [] as Prediction[]);

  const thisMonday = mondayOf(today);
  const weeklyReview = useLiveQuery(
    async () => (await db.weeklyReviews.get(thisMonday)) ?? null,
    [thisMonday]
  );

  // Chủ Nhật mới hiện thẻ tổng kết.
  const showWeeklyReview = isSunday(today);

  // Nhắc sao lưu nếu đã quá 7 ngày (hoặc chưa xuất bao giờ mà đã có dữ liệu).
  const sinceExport = daysSinceLastExport(today);
  const hasData = allCheckins.length > 0 || allBlocks.length > 0;
  const remindBackup =
    hasData && (sinceExport === null || sinceExport > EXPORT_REMINDER_DAYS);

  /* ----- Trạng thái giao diện ----- */
  const [editingCheckin, setEditingCheckin] = useState(false);
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FocusBlock | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<FocusBlock | null>(null);
  // Buổi đếm dài bất thường, đang chờ bạn xác nhận.
  const [longSession, setLongSession] = useState<{
    minutes: number;
    startTime: string;
    distractions: number;
  } | null>(null);
  // Số phút và giờ bắt đầu do bộ đếm giờ cung cấp khi bấm Dừng.
  const [timerResult, setTimerResult] = useState<{
    minutes: number;
    startTime: string;
    distractions: number;
  } | null>(null);

  /* ----- Bộ đếm giờ ----- */
  const [timerStart, setTimerStart] = useState<number | null>(getTimerStart);
  // Số lần phân tâm bấm được TRONG LÚC đang đếm.
  const [liveDistractions, setLiveDistractions] = useState<number>(getTimerDistractions);
  const [, forceTick] = useState(0);

  // Khi bộ đếm đang chạy, cập nhật mặt đồng hồ mỗi giây.
  // Đây CHỈ để hiển thị — số phút thật luôn tính từ mốc bắt đầu.
  useEffect(() => {
    if (timerStart === null) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timerStart]);

  function handleStartTimer() {
    startTimer(); // cũng reset bộ đếm phân tâm về 0
    setTimerStart(getTimerStart());
    setLiveDistractions(0);
  }

  function handleStopTimer() {
    if (timerStart === null) return;
    const minutes = Math.max(1, elapsedMinutes(timerStart));
    // Giờ bắt đầu = mốc bấm Bắt đầu, đổi sang "HH:mm".
    const d = new Date(timerStart);
    const startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const distractions = getTimerDistractions();

    clearTimer();
    clearTimerDistractions();
    setTimerStart(null);
    setLiveDistractions(0);

    const result = { minutes, startTime, distractions };

    // Quá 3 tiếng: hỏi lại trước khi điền vào form. Gần như luôn là
    // quên bấm Dừng, và một con số 600 phút sẽ bóp méo mọi biểu đồ.
    if (isSuspiciousDuration(minutes)) {
      setLongSession(result);
      return;
    }

    openFormWith(result);
  }

  /** Mở form block với số liệu từ bộ đếm. */
  function openFormWith(result: { minutes: number; startTime: string; distractions: number }) {
    setTimerResult(result);
    setEditingBlock(null);
    setBlockFormOpen(true);
  }

  /* ----- Lưu / xoá ----- */
  async function saveCheckin(value: DailyCheckin) {
    // Tính lại ngày NGAY LÚC LƯU. Biến `today` ở trên là của lần vẽ gần nhất;
    // nếu form mở từ 23:58 và bạn bấm Lưu lúc 00:01 thì nó đã cũ.
    // Chỉ ghi đè khi đang tạo mới — đang SỬA một check-in cũ thì phải
    // giữ nguyên ngày của bản ghi đó.
    const stamped = editingCheckin ? value : { ...value, date: todayISO() };
    await db.checkins.put(stamped);
    setEditingCheckin(false);
  }

  async function saveBlock(value: FocusBlock) {
    // Cùng lý do như saveCheckin: ngày lấy tại thời điểm bấm Lưu.
    // Sửa block cũ thì giữ nguyên ngày gốc.
    const stamped = editingBlock ? value : { ...value, date: todayISO() };
    await db.focusBlocks.put(stamped);
    setBlockFormOpen(false);
    setEditingBlock(null);
    setTimerResult(null);
  }

  async function confirmDeleteBlock() {
    if (!blockToDelete) return;
    await db.focusBlocks.delete(blockToDelete.id);
    setBlockToDelete(null);
  }

  /* ----- Tính tổng ----- */
  const totalMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);

  // Gộp số phút theo area, sắp xếp nhiều nhất lên đầu.
  const byArea = Object.entries(
    blocks.reduce<Record<string, number>>((acc, b) => {
      acc[b.area] = (acc[b.area] ?? 0) + b.minutes;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Sắp xếp khối theo giờ bắt đầu.
  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // checkin === undefined nghĩa là đang đọc database, chưa biết có hay không.
  const loadingCheckin = checkin === undefined;

  return (
    <ScreenShell title="Hôm nay" subtitle={formatDayLabel(today) /* "Thứ Bảy, 26/09" dễ đọc hơn "2026-09-26" */}>
      {isDemoMode() && (
        <div className="mb-4 rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-800">
          Đang xem DỮ LIỆU MẪU — không phải dữ liệu thật
        </div>
      )}

      <ProtocolBanner date={today} />

      {/* Nhắc sao lưu — luật số 7. */}
      {remindBackup && (
        <div className="mb-4 rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900">
          {sinceExport === null
            ? "Chưa sao lưu lần nào. Vào Cài đặt để xuất file JSON."
            : `Đã ${sinceExport} ngày chưa sao lưu. Vào Cài đặt để xuất file JSON.`}
        </div>
      )}

      {/* Tổng kết tuần — chỉ Chủ Nhật. */}
      {showWeeklyReview && weeklyReview !== undefined && (
        <WeeklyReviewCard
          weekStart={thisMonday}
          metrics={computeMetrics(
            {
              checkins: allCheckins,
              focusBlocks: allBlocks,
              reviewLogs: allLogs,
              predictions: allPredictions,
            },
            thisMonday,
            today
          )}
          existing={weeklyReview ?? undefined}
          onSave={(r: WeeklyReview) => {
            void db.weeklyReviews.put(r);
          }}
        />
      )}

      {/* ---------- 1. Check-in sáng ---------- */}
      {loadingCheckin ? null : !checkin || editingCheckin ? (
        <Card className="mb-4">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {editingCheckin ? "Sửa check-in" : "Check-in sáng nay"}
          </h2>
          <CheckinForm
            date={today}
            previous={yesterdayCheckin ?? undefined}
            existing={editingCheckin && checkin ? checkin : undefined}
            onSave={saveCheckin}
            onCancel={editingCheckin ? () => setEditingCheckin(false) : undefined}
          />
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Check-in
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {checkin.sleepHours}h ngủ · năng lượng {checkin.energy}/5
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {checkin.bedTime} → {checkin.wakeTime}
              </div>
              {checkin.note && <div className="mt-1 text-sm text-slate-500">{checkin.note}</div>}
            </div>
            <Button variant="secondary" onClick={() => setEditingCheckin(true)} className="text-sm">
              Sửa
            </Button>
          </div>
        </Card>
      )}

      {/* ---------- 2. Bộ đếm giờ + thêm block ---------- */}
      {!blockFormOpen && (
        <div className="mb-4 flex gap-2">
          {timerStart === null ? (
            <>
              <Button
                onClick={() => {
                  setEditingBlock(null);
                  setTimerResult(null);
                  setBlockFormOpen(true);
                }}
                className="flex-1 text-base"
              >
                + Block
              </Button>
              <Button variant="secondary" onClick={handleStartTimer} className="flex-1 text-base">
                Bắt đầu đếm
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={handleStopTimer} className="flex-1 text-base">
              Dừng · {elapsedClock(timerStart)}
            </Button>
          )}
        </div>
      )}

      {/* Nút đếm phân tâm — chỉ hiện khi bộ đếm đang chạy.
          Cố ý để TO và tách riêng: bấm được bằng một ngón, không cần nhìn kỹ,
          ngay lúc vừa bị phân tâm. Nhớ lại sau buổi làm luôn ra số thấp hơn thật. */}
      {timerStart !== null && !blockFormOpen && (
        <div className="mb-4 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => setLiveDistractions(addTimerDistraction())}
            className="tap-target flex-1 rounded-2xl bg-amber-500 py-4 text-lg font-bold text-white active:bg-amber-600"
          >
            +1 phân tâm
            <span className="ml-2 rounded-full bg-white/25 px-2.5 py-0.5 text-base tabular-nums">
              {liveDistractions}
            </span>
          </button>
          {liveDistractions > 0 && (
            <button
              type="button"
              onClick={() => setLiveDistractions(removeTimerDistraction())}
              className="tap-target rounded-2xl bg-slate-100 px-4 text-xl font-bold text-slate-500 active:bg-slate-200"
              aria-label="Bớt một lần phân tâm"
            >
              −
            </button>
          )}
        </div>
      )}

      {/* Một chạm sang Brain dump — không phải tự đi tìm trong tab Ôn tập. */}
      {!blockFormOpen && (
        <Button
          variant="secondary"
          onClick={() => onNavigate("review", "braindump")}
          className="mb-4 w-full text-base"
        >
          Brain dump
        </Button>
      )}

      {!blockFormOpen && (
        <ExperimentChip experiments={experiments} tags={experimentTags} today={today} />
      )}

      {timerStart !== null && (
        <p className="-mt-2 mb-4 text-center text-xs text-slate-400">
          Cứ thoát app thoải mái — bộ đếm dựa vào mốc bắt đầu nên không bị sai.
        </p>
      )}

      {/* ---------- 3. Form thêm / sửa block ---------- */}
      {blockFormOpen && (
        <Card className="mb-4">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {editingBlock ? "Sửa block" : "Block mới"}
          </h2>
          <FocusBlockForm
            date={today}
            existing={editingBlock ?? undefined}
            initialMinutes={timerResult?.minutes}
            initialStartTime={timerResult?.startTime ?? nowHHmm()}
            initialDistractions={timerResult?.distractions}
            onSave={saveBlock}
            onCancel={() => {
              setBlockFormOpen(false);
              setEditingBlock(null);
              setTimerResult(null);
            }}
          />
        </Card>
      )}

      {/* ---------- 4. Tổng deep work hôm nay ---------- */}
      <Card className="mb-4">
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Deep work hôm nay
        </div>
        <div className="mt-1 text-3xl font-bold text-slate-900">{formatMinutes(totalMinutes)}</div>

        {byArea.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Chưa có block nào.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {byArea.map(([area, minutes]) => (
              <li key={area} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{area}</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatMinutes(minutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- 5. Danh sách block ---------- */}
      {sortedBlocks.length > 0 && (
        <div className="space-y-2 pb-4">
          <div className="px-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {sortedBlocks.length} block
          </div>

          {sortedBlocks.map((block) => (
            <Card key={block.id} className="flex items-start justify-between gap-2">
              {/* Bấm vào phần nội dung để sửa. */}
              <button
                type="button"
                onClick={() => {
                  setEditingBlock(block);
                  setTimerResult(null);
                  setBlockFormOpen(true);
                }}
                className="flex-1 text-left"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900">
                    {formatMinutes(block.minutes)}
                  </span>
                  <span className="text-sm text-slate-600">{block.area}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {block.startTime} · tập trung {block.focusRating}/5 · phân tâm {block.distractions}
                  {block.phoneAway && " · điện thoại phòng khác"}
                </div>
                {block.resumeNote && (
                  <div className="mt-1 text-xs text-slate-500">{block.resumeNote}</div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBlockToDelete(block)}
                className="tap-target shrink-0 rounded-xl px-3 text-sm font-semibold text-red-500 active:bg-red-50"
                aria-label="Xoá block"
              >
                Xoá
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* ---------- Buổi đếm dài bất thường ---------- */}
      <ConfirmDialog
        open={longSession !== null}
        title="Buổi này dài bất thường"
        detail={
          longSession && (
            <>
              Bộ đếm chạy <strong>{formatMinutes(longSession.minutes)}</strong>, bắt đầu lúc{" "}
              {longSession.startTime}.
              <br />
              Quá {formatMinutes(SUSPICIOUS_MINUTES)} thường là do quên bấm Dừng. Nếu ghi vào,
              con số này sẽ làm lệch thống kê deep work.
            </>
          )
        }
        confirmLabel="Vẫn dùng số này"
        onConfirm={() => {
          if (longSession) openFormWith(longSession);
          setLongSession(null);
        }}
        onCancel={() => setLongSession(null)}
      />

      {/* ---------- Hộp xác nhận xoá (luật số 4) ---------- */}
      <ConfirmDialog
        open={blockToDelete !== null}
        title="Xoá block này?"
        detail={
          blockToDelete && (
            <>
              <strong>
                {formatMinutes(blockToDelete.minutes)} · {blockToDelete.area}
              </strong>
              <br />
              bắt đầu {blockToDelete.startTime}, tập trung {blockToDelete.focusRating}/5
            </>
          )
        }
        onConfirm={confirmDeleteBlock}
        onCancel={() => setBlockToDelete(null)}
      />
    </ScreenShell>
  );
}
