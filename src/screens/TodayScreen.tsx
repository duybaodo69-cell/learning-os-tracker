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
import { Button, Card, ChipGroup, SectionLabel, Tag } from "../components/ui";
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
            void db.weekReviews.put(r);
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
      {!blockFormOpen && (
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
          <Button onClick={onStartTimer} className="mt-4 w-full py-3 text-base">
            Bắt đầu đếm
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
