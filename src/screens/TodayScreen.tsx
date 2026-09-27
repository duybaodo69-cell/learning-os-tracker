/**
 * Màn hình "Hôm nay" — màn hình bạn mở nhiều nhất trong ngày.
 *
 * Thứ tự từ trên xuống, theo mức độ cần nhìn:
 *   1. Banner giai đoạn protocol
 *   2. Form check-in sáng — chỉ khi CHƯA check-in (hoặc đang sửa)
 *   3. "Bắt đầu phiên deep work": area (một hàng vuốt ngang) + nút đếm
 *   4. Check-in đã có: một dòng tóm tắt
 *   5. Tổng deep work hôm nay + thanh chia theo area
 *   6. Danh sách block đã log (bấm để sửa; nút xoá nằm trong form sửa)
 *   7. Thí nghiệm hôm nay, dòng nhắc sao lưu
 * Bố cục "Calm" theo bản vẽ Stitch 2026-09.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, isDemoMode } from "../db/db";
import { checkinId, weekReviewId } from "../db/keys";
import type { DailyCheckin, Experiment, ExperimentTag, FocusBlock, Prediction, ReviewLog, WeeklyReview } from "../db/types";
import { formatDayLabel, formatMinutes, todayISO, yesterdayISO } from "../lib/dates";
import { useToday } from "../lib/useToday";
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
import { Button, Card, ChipGroup, Notice, SectionLabel, Tag } from "../components/ui";
import WeeklyReviewCard from "../components/WeeklyReviewCard";
import ExperimentChip from "../components/ExperimentChip";
import type { TabId } from "../components/BottomNav";
import type { ReviewView } from "./ReviewScreen";

export default function TodayScreen({
  onNavigate,
  onStartTimer,
}: {
  /** Chuyển sang tab khác, kèm mục con — dùng cho nút tắt Brain dump. */
  onNavigate: (tab: TabId, view?: ReviewView) => void;
  /** Bắt đầu phiên tập trung — App sẽ chuyển sang màn hình phiên. */
  onStartTimer: () => void;
}) {
  // Hook tự tính lại ngày khi qua nửa đêm — xem lib/useToday.ts.
  const today = useToday();

  /* ----- Dữ liệu từ database -----
     useLiveQuery tự chạy lại và vẽ lại màn hình mỗi khi dữ liệu đổi.
     Không cần tự gọi "tải lại" ở đâu cả. */
  /* CẨN THẬN chỗ này:
     - db.dailyCheckins.get() trả về `undefined` khi KHÔNG CÓ bản ghi
     - useLiveQuery trả về `undefined` khi ĐANG ĐỌC database
     Hai tình huống khác hẳn nhau nhưng cùng một giá trị -> rất dễ nhầm.
     Nên ở đây đổi "không có" thành `null`, để:
        undefined = đang đọc   |   null = chưa check-in   |   object = đã có */
  const checkin = useLiveQuery(async () => (await db.dailyCheckins.get(checkinId(today))) ?? null, [today]);
  const yesterdayCheckin = useLiveQuery(
    async () => (await db.dailyCheckins.get(checkinId(yesterdayISO()))) ?? null,
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
  const allCheckins = useLiveQuery(() => db.dailyCheckins.toArray(), [], [] as DailyCheckin[]);
  const allBlocks = useLiveQuery(() => db.focusBlocks.toArray(), [], [] as FocusBlock[]);
  const allLogs = useLiveQuery(() => db.reviewLogs.toArray(), [], [] as ReviewLog[]);
  const allPredictions = useLiveQuery(() => db.predictions.toArray(), [], [] as Prediction[]);

  const thisMonday = mondayOf(today);
  const weeklyReview = useLiveQuery(
    async () => (await db.weekReviews.get(weekReviewId(thisMonday))) ?? null,
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
  /* ----- Lưu / xoá ----- */
  async function saveCheckin(value: DailyCheckin) {
    // Tính lại ngày NGAY LÚC LƯU. Biến `today` ở trên là của lần vẽ gần nhất;
    // nếu form mở từ 23:58 và bạn bấm Lưu lúc 00:01 thì nó đã cũ.
    // Chỉ ghi đè khi đang tạo mới — đang SỬA một check-in cũ thì phải
    // giữ nguyên ngày của bản ghi đó.
    const stamped = editingCheckin ? value : { ...value, date: todayISO() };
    // Khoá chính luôn đi theo ngày cuối cùng được lưu (xem src/db/keys.ts).
    await db.dailyCheckins.put({ ...stamped, id: checkinId(stamped.date) });
    setEditingCheckin(false);
  }

  async function saveBlock(value: FocusBlock) {
    // Cùng lý do như saveCheckin: ngày lấy tại thời điểm bấm Lưu.
    // Sửa block cũ thì giữ nguyên ngày gốc.
    const stamped = editingBlock ? value : { ...value, date: todayISO() };
    await db.focusBlocks.put(stamped);
    setBlockFormOpen(false);
    setEditingBlock(null);
  }

  async function confirmDeleteBlock() {
    if (!blockToDelete) return;
    await db.focusBlocks.delete(blockToDelete.id);
    setBlockToDelete(null);
    // Xoá từ trong form sửa -> đóng luôn form.
    setBlockFormOpen(false);
    setEditingBlock(null);
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

  // Form check-in (chưa có, hoặc đang sửa) — đặt LÊN ĐẦU vì buổi sáng đây là
  // việc đầu tiên. Đã check-in thì chỉ còn MỘT dòng tóm tắt, nằm dưới thẻ
  // "Bắt đầu phiên".
  const checkinFormOpen = !loadingCheckin && (!checkin || editingCheckin);

  return (
    <ScreenShell title="Hôm nay" subtitle={formatDayLabel(today) /* "Thứ Bảy, 26/09" dễ đọc hơn "2026-09-26" */}>
      {isDemoMode() && (
        <Notice tone="info">
          Đang xem <strong className="text-ink">dữ liệu mẫu</strong> — không phải dữ liệu thật
        </Notice>
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
            void db.weekReviews.put(r);
          }}
        />
      )}

      {/* ---------- 1a. Check-in sáng: form (chưa có / đang sửa) ---------- */}
      {checkinFormOpen && (
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
      )}

      {/* ---------- 2. Bắt đầu phiên deep work — hành động chính ---------- */}
      {!blockFormOpen && (
        <Card className="mb-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink">Bắt đầu phiên deep work</h2>
          </div>
          {/* 10 area xếp MỘT hàng vuốt ngang — trước đây chiếm 4 hàng. */}
          <ChipGroup
            scroll
            options={AREAS}
            value={timerArea}
            onChange={(a) => {
              setTimerArea(a);
              setLastArea(a);
            }}
          />
          <Button onClick={onStartTimer} className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-base">
            <span aria-hidden="true">▶</span> Bắt đầu đếm
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingBlock(null);
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

      {/* ---------- 3. Form thêm / sửa block ---------- */}
      {blockFormOpen && (
        <Card className="mb-4">
          <SectionLabel>{editingBlock ? "Sửa block" : "Block mới"}</SectionLabel>
          <FocusBlockForm
            date={today}
            existing={editingBlock ?? undefined}
            // Không truyền giờ bắt đầu: block log tay để form tự tính
            // "bây giờ trừ số phút" (sửa 10). Block từ bộ đếm được lưu ở
            // màn hình Phiên tập trung.
            onSave={saveBlock}
            onCancel={() => {
              setBlockFormOpen(false);
              setEditingBlock(null);
            }}
          />
          {/* Nút xoá chỉ nằm TRONG form sửa, không rải trên từng dòng danh
              sách — vẫn qua hộp xác nhận (luật số 4). */}
          {editingBlock && (
            <Button variant="danger" onClick={() => setBlockToDelete(editingBlock)} className="mt-3 w-full text-sm">
              Xoá block này
            </Button>
          )}
        </Card>
      )}

      {/* ---------- 1b. Check-in đã có: đúng MỘT dòng ---------- */}
      {!loadingCheckin && checkin && !editingCheckin && (
        <div className="mb-3 flex min-h-[52px] items-center gap-3 rounded-2xl border border-line/70 bg-surface py-1 pr-1 pl-4">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good/15 text-sm text-good"
            aria-hidden="true"
          >
            ✓
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            Check-in · <span className="font-num font-semibold">{checkin.sleepHours}h</span> ngủ · năng lượng{" "}
            <span className="font-num font-semibold">{checkin.energy}/5</span>
          </p>
          <button
            type="button"
            onClick={() => setEditingCheckin(true)}
            className="tap-target shrink-0 rounded-xl px-3 text-sm font-semibold text-accent active:bg-surface-2"
          >
            Sửa
          </button>
        </div>
      )}

      {/* ---------- 4. Tổng deep work hôm nay — hiện MỘT lần, dạng "3h05" ---------- */}
      <Card className="mb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-ink-2">Deep work hôm nay</h2>
          <p className="text-right">
            <span className="font-num text-3xl font-semibold text-ink">{formatMinutes(totalMinutes)}</span>
            {blocks.length > 0 && (
              <span className="text-sm text-ink-2">
                {" "}
                · <span className="font-num">{blocks.length}</span> block
              </span>
            )}
          </p>
        </div>

        {byArea.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">Chưa có block nào.</p>
        ) : (
          <>
            {/* Một thanh ngang chia theo area thay cho danh sách nhiều dòng. */}
            <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {byArea.map(([area, minutes]) => (
                <span key={area} style={{ flexGrow: minutes, backgroundColor: areaColor(area) }} />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {byArea.map(([area, minutes]) => (
                <li key={area} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: areaColor(area) }}
                    aria-hidden="true"
                  />
                  {area} <span className="font-num text-ink">{formatMinutes(minutes)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* ---------- 5. Danh sách block — bấm một dòng để sửa ---------- */}
      {sortedBlocks.length > 0 && (
        <section className="mb-3">
          <SectionLabel className="px-1" right="bấm để sửa">
            Block đã log
          </SectionLabel>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
            {sortedBlocks.map((block) => (
              <li key={block.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBlock(block);
                    setBlockFormOpen(true);
                  }}
                  aria-label={`Sửa block ${block.startTime} ${block.area}`}
                  className="min-h-[52px] w-full px-4 py-3 text-left active:bg-surface-2"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-num text-sm text-ink-2">{block.startTime}</span>
                    <span className="font-num text-sm font-semibold text-ink">
                      {formatMinutes(block.minutes)}
                    </span>
                    <Tag tone="indigo">{block.area}</Tag>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                    <span>
                      Tập trung <span className="font-num">{block.focusRating}/5</span>
                    </span>
                    {/* Số phân tâm màu TRUNG TÍNH — đây là dữ liệu, không phải lời trách. */}
                    <Tag tone="neutral">
                      <span className="font-num">{block.distractions}</span>&nbsp;phân tâm
                    </Tag>
                    {block.phoneAway && <span className="text-ink-3">điện thoại phòng khác</span>}
                  </div>
                  {block.resumeNote && (
                    <div className="mt-1 text-xs text-ink-2">↪ {block.resumeNote}</div>
                  )}
                  {block.capturedNotes && block.capturedNotes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 border-l-2 border-line pl-2">
                      {block.capturedNotes.map((note, i) => (
                        <li key={i} className="text-xs text-ink-2">
                          {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!blockFormOpen && (
        <ExperimentChip experiments={experiments} tags={experimentTags} today={today} />
      )}

      {/* Nhắc sao lưu — luật số 7. Một dòng mảnh, chỉ khi đã QUÁ 7 ngày
          chưa xuất (hoặc chưa xuất bao giờ mà đã có dữ liệu). */}
      {remindBackup && (
        <Notice action="Xuất ngay" onAction={() => onNavigate("settings")}>
          {sinceExport === null ? "Chưa sao lưu lần nào" : `${sinceExport} ngày chưa sao lưu`}
        </Notice>
      )}

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
