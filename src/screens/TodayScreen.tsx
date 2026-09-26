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
import { formatDayLabel, formatMinutes, todayISO, yesterdayISO } from "../lib/dates";
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
import { getLastArea, setLastArea } from "../lib/prefs";
import { areaColor } from "../lib/areaColors";
import { AREAS } from "../db/types";
import type { Area } from "../db/types";

import ScreenShell from "../components/ScreenShell";
import ProtocolBanner from "../components/ProtocolBanner";
import CheckinForm from "../components/CheckinForm";
import FocusBlockForm from "../components/FocusBlockForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, Card, ChipGroup, SectionLabel, Tag } from "../components/ui";
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
  // Area chọn TRƯỚC khi bắt đầu đếm. Lưu làm "area gần nhất" để form kết thúc
  // phiên điền sẵn đúng area này.
  const [timerArea, setTimerArea] = useState<Area>(getLastArea);
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
        <div className="mb-4 rounded-lg border border-warn/30 bg-warn/12 px-4 py-2 text-center text-sm font-semibold text-warn">
          Đang xem DỮ LIỆU MẪU — không phải dữ liệu thật
        </div>
      )}

      <ProtocolBanner date={today} />

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

      {/* ---------- 1. Check-in sáng: HAI trạng thái tách biệt ----------
          Chưa có (hoặc đang sửa) -> form đầy đủ.
          Đã có -> đúng MỘT dòng tóm tắt, không lặp lại form. */}
      {loadingCheckin ? null : !checkin || editingCheckin ? (
        <Card className="mb-4">
          <SectionLabel>{editingCheckin ? "Sửa check-in" : "Check-in sáng nay"}</SectionLabel>
          <CheckinForm
            date={today}
            previous={yesterdayCheckin ?? undefined}
            existing={editingCheckin && checkin ? checkin : undefined}
            onSave={saveCheckin}
            onCancel={editingCheckin ? () => setEditingCheckin(false) : undefined}
          />
        </Card>
      ) : (
        <Card className="mb-4 flex items-center justify-between gap-3 py-2.5">
          <p className="min-w-0 truncate text-sm text-ink">
            <span className="text-good">✓</span>{" "}
            <span className="font-num font-semibold">{checkin.sleepHours}h</span> ngủ · năng lượng{" "}
            <span className="font-num font-semibold">{checkin.energy}/5</span>
            <span className="text-ink-2">
              {" "}
              · <span className="font-num">{checkin.bedTime}→{checkin.wakeTime}</span>
            </span>
          </p>
          <Button variant="ghost" onClick={() => setEditingCheckin(true)} className="shrink-0 text-sm">
            Sửa
          </Button>
        </Card>
      )}

      {/* ---------- 2. Bắt đầu làm việc ---------- */}
      {!blockFormOpen && timerStart === null && (
        <Card className="mb-4">
          <SectionLabel right="chọn 1">Lĩnh vực</SectionLabel>
          <ChipGroup
            options={AREAS}
            value={timerArea}
            onChange={(a) => {
              setTimerArea(a);
              setLastArea(a);
            }}
          />
          <Button onClick={handleStartTimer} className="mt-4 w-full py-3 text-base">
            Bắt đầu đếm
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingBlock(null);
                setTimerResult(null);
                setBlockFormOpen(true);
              }}
              className="text-sm"
            >
              + Block (log sau)
            </Button>
            {/* Một chạm sang Brain dump — không phải tự đi tìm trong tab Ôn tập. */}
            <Button
              variant="secondary"
              onClick={() => onNavigate("review", "braindump")}
              className="text-sm"
            >
              Brain dump
            </Button>
          </div>
        </Card>
      )}

      {/* Bộ đếm đang chạy (sẽ chuyển sang màn hình phiên riêng) */}
      {timerStart !== null && !blockFormOpen && (
        <Card className="mb-4">
          <Button variant="danger" onClick={handleStopTimer} className="w-full text-base">
            Dừng · <span className="font-num">{elapsedClock(timerStart)}</span>
          </Button>
          <div className="mt-2 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setLiveDistractions(addTimerDistraction())}
              className="tap-target flex-1 rounded-lg border border-warn/50 bg-warn/15 py-4 text-lg font-bold text-warn active:bg-warn/25"
            >
              +1 phân tâm
              <span className="ml-2 font-num">{liveDistractions}</span>
            </button>
            {liveDistractions > 0 && (
              <button
                type="button"
                onClick={() => setLiveDistractions(removeTimerDistraction())}
                className="tap-target rounded-lg border border-line bg-surface-2 px-4 text-xl font-bold text-ink-2"
                aria-label="Bớt một lần phân tâm"
              >
                −
              </button>
            )}
          </div>
        </Card>
      )}

      {/* ---------- 3. Form thêm / sửa block ---------- */}
      {blockFormOpen && (
        <Card className="mb-4">
          <SectionLabel>{editingBlock ? "Sửa block" : "Block mới"}</SectionLabel>
          <FocusBlockForm
            date={today}
            existing={editingBlock ?? undefined}
            initialMinutes={timerResult?.minutes}
            initialStartTime={
              // CHỈ truyền khi có mốc thật từ bộ đếm. Bấm "+ Block" bằng tay thì để
              // trống, để form tự tính "bây giờ trừ số phút" (sửa 10).
              timerResult?.startTime
            }
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

      {!blockFormOpen && (
        <ExperimentChip experiments={experiments} tags={experimentTags} today={today} />
      )}

      {/* ---------- 4. Tổng deep work hôm nay — hiện MỘT lần, dạng "3h05" ---------- */}
      <Card className="mb-4">
        <SectionLabel right={blocks.length > 0 ? `${blocks.length} block` : undefined}>
          Deep work hôm nay
        </SectionLabel>
        <div className="font-num text-4xl font-semibold text-ink">{formatMinutes(totalMinutes)}</div>

        {byArea.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">Chưa có block nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {byArea.map(([area, minutes]) => (
              <li key={area} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: areaColor(area) }}
                    aria-hidden="true"
                  />
                  {area}
                </span>
                <span className="font-num text-ink-2">{formatMinutes(minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- 5. Danh sách block ---------- */}
      {sortedBlocks.length > 0 && (
        <Card className="mb-4 px-0 pb-1">
          <SectionLabel className="px-4" right="bấm để sửa">
            Block đã log
          </SectionLabel>
          <ul className="divide-y divide-line">
            {sortedBlocks.map((block) => (
              <li key={block.id} className="flex items-start gap-2 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlock(block);
                    setTimerResult(null);
                    setBlockFormOpen(true);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-num text-sm text-ink-2">{block.startTime}</span>
                    <span className="font-num text-sm font-semibold text-ink">
                      {formatMinutes(block.minutes)}
                    </span>
                    <Tag tone="indigo">{block.area}</Tag>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                    <span>
                      Tập trung <span className="font-num">{block.focusRating}/5</span>
                    </span>
                    {/* Số phân tâm màu TRUNG TÍNH — đây là dữ liệu, không phải lời trách. */}
                    <Tag tone="neutral">
                      <span className="font-num">{block.distractions}</span>&nbsp;phân tâm
                    </Tag>
                    {block.phoneAway && <span>điện thoại phòng khác</span>}
                  </div>
                  {block.resumeNote && (
                    <div className="mt-1 text-xs text-ink-2">↪ {block.resumeNote}</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBlockToDelete(block)}
                  className="tap-target shrink-0 rounded-lg px-2 text-sm font-medium text-bad-ink active:bg-bad/15"
                  aria-label="Xoá block"
                >
                  Xoá
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Nhắc sao lưu — luật số 7. Chỉ hiện khi đã QUÁ 7 ngày chưa xuất
          (hoặc chưa xuất bao giờ mà đã có dữ liệu). */}
      {remindBackup && (
        <div className="mb-4 rounded-lg border border-warn/30 bg-warn/12 px-4 py-2.5 text-sm text-warn">
          {sinceExport === null
            ? "Chưa sao lưu lần nào. Vào Cài đặt để xuất file JSON."
            : `Đã ${sinceExport} ngày chưa sao lưu. Vào Cài đặt để xuất file JSON.`}
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
        destructive={false}
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
