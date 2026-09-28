/**
 * Thẻ "Bắt đầu IELTS" — dùng chung cho màn Hôm nay và tab IELTS.
 *
 *   - Nút chính "▶ Bắt đầu IELTS · <phần Listening tiếp theo>" (Đợt 1)
 *   - Dòng "Reading tiếp theo"
 *   - "Khung 9:30: x/7 tuần này" + 7 chấm Thứ Hai → Chủ Nhật (đếm ngày, không chuỗi)
 *   - `children`: phần thêm ở cuối thẻ (Hôm nay đặt dòng "dời khung" ở đây)
 *
 * Bấm nút KHÔNG tạo đồng hồ riêng: màn cha chọn area IELTS rồi chạy đồng hồ phiên thường.
 */
import type { ReactNode } from "react";
import type { FocusBlock } from "../db/types";
import { ANCHOR_MIN_MINUTES, anchorWeek, formatTestRef, nextTest, partShort } from "../lib/ielts";
import { Button, Card } from "./ui";

/** Nhãn 7 chấm khung 9:30, Thứ Hai trước. */
const WEEKDAY_SHORT = ["2", "3", "4", "5", "6", "7", "CN"];
const WEEKDAY_LONG = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

export default function IeltsStartCard({
  blocks,
  today,
  onStart,
  children,
}: {
  /** Mọi focus block (để tính đề tiếp theo và khung 9:30 tuần này). */
  blocks: FocusBlock[];
  today: string;
  onStart: () => void;
  children?: ReactNode;
}) {
  const nextListening = nextTest(blocks, "Listening");
  const nextReading = nextTest(blocks, "Reading");
  const week = anchorWeek(blocks, today);
  const held = week.filter((d) => d.held).length;

  return (
    <Card className="mb-3">
      <Button onClick={onStart} className="flex w-full items-center justify-center gap-2 py-3 text-base">
        <span aria-hidden="true">▶</span>
        <span>
          Bắt đầu IELTS
          {nextListening && (
            <>
              {" · "}
              <span className="font-num">
                {formatTestRef("Listening", { ...nextListening, parts: [nextListening.part] })}
              </span>
            </>
          )}
        </span>
      </Button>
      {nextReading && (
        <p className="mt-2 text-center text-xs text-ink-3">
          Reading tiếp theo: Cam {nextReading.book} · Test {nextReading.test} · {partShort("Reading", nextReading.part)}
        </p>
      )}

      {/* Khung 9:30 — đếm NGÀY, không đếm chuỗi (PRODUCT.md mục 3 và 6). */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line/70 pt-3">
        <p className="text-sm text-ink">
          Khung 9:30: <span className="font-num font-semibold">{held}/7</span> tuần này
          <span className="block text-xs text-ink-3">
            IELTS bắt đầu 9:00–10:30, từ {ANCHOR_MIN_MINUTES} phút · đích ≥ 5
          </span>
        </p>
        <ol className="flex gap-1" aria-label="Các ngày giữ khung 9:30 tuần này">
          {week.map((d, i) => (
            <li
              key={d.date}
              className={
                "grid h-7 w-7 place-items-center rounded-full text-xs " +
                (d.held ? "bg-good font-semibold text-canvas" : "bg-surface-2 text-ink-3") +
                (d.date === today ? " ring-2 ring-accent" : "")
              }
            >
              <span aria-hidden="true">{WEEKDAY_SHORT[i]}</span>
              <span className="sr-only">
                {WEEKDAY_LONG[i]}: {d.held ? "giữ khung" : "chưa"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {children}
    </Card>
  );
}
