// @vitest-environment happy-dom
/**
 * Regression test cho các lỗi của đợt audit 27/09/2026 (audit/2026-09-27/REPORT.md).
 *
 * Mỗi test khẳng định hành vi ĐÚNG sau khi sửa — ngược với file
 * audit/2026-09-27/defects.test.tsx (file đó khẳng định lỗi còn tồn tại và
 * không chạy trong npm test nữa).
 *
 * Chỉ dùng fake IndexedDB — không bao giờ mở database thật của trình duyệt.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "./db/db";
import type { Card, Prediction } from "./db/types";
import { importBackup, parseBackup, type BackupFile } from "./lib/backup";
import { newCardState } from "./lib/scheduling";
import { todayISO } from "./lib/dates";
import { BRAIN_DUMP_DRAFT_KEY } from "./lib/brainDump";
import { uploadFingerprint } from "./lib/cloudUpload";
import type { UploadPlan } from "./lib/upload";
import CheckinForm from "./components/CheckinForm";
import FocusBlockForm from "./components/FocusBlockForm";
import PredictionForm from "./components/PredictionForm";
import ReviewQueue from "./components/ReviewQueue";
import { WeeklyReviewForm } from "./components/WeeklyReviewCard";
import ReviewScreen from "./screens/ReviewScreen";
import type { MetricSet } from "./lib/metrics";

// useLiveQuery thật cần vòng đời Dexie đầy đủ; ở đây trả dữ liệu tĩnh do test đặt.
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: vi.fn(() => []) }));

const date = todayISO();
const card = (id: string, back = "Answer"): Card => ({
  id,
  front: `Question ${id}`,
  back,
  area: "Other",
  createdAt: date,
  dueDate: date,
  ...newCardState(),
});

beforeEach(async () => {
  localStorage.clear();
  vi.mocked(useLiveQuery).mockReturnValue([]);
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* ==================== F01 — file sao lưu hỏng ==================== */

describe("F01: file sao lưu hỏng không bao giờ thay dữ liệu tốt", () => {
  it("thẻ thiếu trường bị từ chối ngay khi đọc file; dữ liệu cũ nguyên vẹn", async () => {
    await db.cards.add(card("valid-original"));
    const text = JSON.stringify({
      app: "learning-os-tracker",
      formatVersion: 1,
      exportedAt: "2026-09-27T00:00:00Z",
      data: { cards: [{ id: "broken" }] },
    });
    expect(() => parseBackup(text)).toThrow(/Thẻ ôn tập, dòng 1/);
    expect(await db.cards.get("valid-original")).toBeTruthy();
  });

  it("importBackup tự kiểm tra lại: gọi thẳng với dữ liệu hỏng cũng không xoá gì", async () => {
    await db.cards.add(card("valid-original"));
    const bad = {
      app: "learning-os-tracker",
      formatVersion: 1,
      exportedAt: "2026-09-27T00:00:00Z",
      data: { cards: [{ id: "broken" }] },
    } as unknown as BackupFile;
    await expect(importBackup(bad)).rejects.toThrow("hỏng");
    expect(await db.cards.count()).toBe(1);
  });

  it("thiếu exportedAt bị từ chối thay vì làm màn xem trước lỗi", () => {
    expect(() => parseBackup(JSON.stringify({ app: "learning-os-tracker", formatVersion: 1, data: {} }))).toThrow(
      "exportedAt"
    );
  });
});

/* ==================== F02 — brain dump không mất ==================== */

describe("F02: brain dump không mất khi đổi mục, lưu cùng thẻ trong một lần", () => {
  const props = { onViewChange: vi.fn(), dueCount: 0 };

  function fill(container: HTMLElement) {
    const fields = container.querySelectorAll("textarea");
    fireEvent.change(fields[0], { target: { value: "Audit recalled material" } });
    fireEvent.change(fields[1], { target: { value: "Audit gap" } });
  }

  it("đổi sang Kho thẻ rồi quay lại: nội dung đang viết vẫn còn", () => {
    const { container, rerender } = render(<ReviewScreen {...props} view="braindump" />);
    fill(container);
    rerender(<ReviewScreen {...props} view="cards" />);
    rerender(<ReviewScreen {...props} view="braindump" />);
    const fields = container.querySelectorAll("textarea");
    expect(fields[0].value).toBe("Audit recalled material");
    expect(fields[1].value).toBe("Audit gap");
  });

  it("tải lại trang (gỡ hẳn component) vẫn còn bản nháp", () => {
    const first = render(<ReviewScreen {...props} view="braindump" />);
    fill(first.container);
    first.unmount();
    const { container } = render(<ReviewScreen {...props} view="braindump" />);
    expect(container.querySelectorAll("textarea")[0].value).toBe("Audit recalled material");
  });

  it("một nút Lưu: ghi brain dump VÀ thẻ gắn với nó, rồi xoá bản nháp", async () => {
    const { container } = render(<ReviewScreen {...props} view="braindump" />);
    fill(container);
    fireEvent.click(screen.getByRole("button", { name: "Lưu và tạo 1 thẻ" }));
    await waitFor(() => expect(screen.getByText(/Đã lưu brain dump và tạo 1 thẻ nháp/)).toBeTruthy());

    const dumps = await db.brainDumps.toArray();
    const cards = await db.cards.toArray();
    expect(dumps).toHaveLength(1);
    expect(cards).toHaveLength(1);
    expect(cards[0].brainDumpId).toBe(dumps[0].id);
    expect(container.querySelectorAll("textarea")[0].value).toBe("");
    expect(localStorage.getItem(BRAIN_DUMP_DRAFT_KEY)).toBeNull();
  });
});

/* ==================== F03 — chấm hai lần ==================== */

describe("F03: chạm đúp nút chấm chỉ ghi một lượt, không bỏ qua thẻ", () => {
  it("hai cú bấm liền: 1 log cho thẻ 1, thẻ 2 vẫn được ôn", async () => {
    const cards = [card("one"), card("two")];
    await db.cards.bulkAdd(cards);
    vi.mocked(useLiveQuery).mockReturnValue(cards);
    render(<ReviewQueue />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu ôn" }));
    fireEvent.click(screen.getByRole("button", { name: "Hiện đáp án" }));
    const grade = screen.getByRole("button", { name: /Được 1 ngày/ });
    act(() => {
      fireEvent.click(grade);
      fireEvent.click(grade);
    });

    await waitFor(() => expect(screen.getByText("Thẻ 2/2")).toBeTruthy());
    expect(await db.reviewLogs.count()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Hiện đáp án" }));
    fireEvent.click(screen.getByRole("button", { name: /Được 1 ngày/ }));
    await waitFor(() => expect(screen.getByText("Xong buổi ôn")).toBeTruthy());
    const logs = await db.reviewLogs.toArray();
    expect(logs.map((l) => l.cardId).sort()).toEqual(["one", "two"]);
    expect(screen.getByText(/Đã ôn 2\/2 thẻ/)).toBeTruthy();
  });
});

/* ==================== F04 — thẻ nháp ==================== */

describe("F04: thẻ chưa có đáp án không vào hàng ôn", () => {
  it("chỉ có thẻ nháp: không bắt đầu ôn được, có đường sang Kho thẻ", () => {
    vi.mocked(useLiveQuery).mockReturnValue([card("draft", "")]);
    render(<ReviewQueue onOpenCards={() => {}} />);
    expect((screen.getByRole("button", { name: "Bắt đầu ôn" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/thẻ chưa có mặt sau/)).toBeTruthy();
  });
});

/* ==================== F05 — validation ==================== */

describe("F05: form không lưu dữ liệu vô lý", () => {
  it("block 10.000 phút: nút Lưu khoá, có lỗi, không gọi onSave", () => {
    const onSave = vi.fn();
    render(<FocusBlockForm date={date} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập số khác" }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    const save = screen.getByRole("button", { name: "Lưu block" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/1 đến 600/);
  });

  it("check-in có giờ bị xoá trắng: không lưu, không ra NaN", () => {
    const onSave = vi.fn();
    const { container } = render(<CheckinForm date={date} onSave={onSave} />);
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /3 Bình thường/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu check-in" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Giờ đi ngủ/);
  });

  it("dự đoán không có hạn chấm: không lưu", () => {
    const onSave = vi.fn();
    const { container } = render(<PredictionForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(container.querySelector("textarea")!, { target: { value: "Audit forecast" } });
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu dự đoán/ }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("ghi thất bại: form giữ nguyên, báo lỗi, bấm lại được", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("disk full"));
    render(<FocusBlockForm date={date} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu block" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Chưa lưu được/));
    const save = screen.getByRole("button", { name: "Lưu block" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });
});

/* ==================== F06 — dự đoán đã chấm bị khoá ==================== */

describe("F06: sửa dự đoán đã chấm không viết lại điểm Brier", () => {
  const resolved: Prediction = {
    id: "resolved",
    statement: "Audit resolved forecast",
    probability: 10,
    category: "Study",
    createdAt: date,
    resolveBy: date,
    resolvedAt: date,
    outcome: true,
  };

  it("không còn nút đổi xác suất; lưu ghi chú giữ nguyên 10%", async () => {
    const onSave = vi.fn();
    render(<PredictionForm existing={resolved} onSave={onSave} onCancel={() => {}} />);
    expect(screen.queryByRole("button", { name: "90%" })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Vì sao đúng / sai?"), { target: { value: "base rate thấp" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0][0] as Prediction;
    expect(saved.probability).toBe(10);
    expect(saved.statement).toBe(resolved.statement);
    expect(saved.outcome).toBe(true);
    expect(saved.note).toBe("base rate thấp");
  });

  it("chấm nhầm: đổi kết quả qua hộp xác nhận, xác suất vẫn giữ", async () => {
    const onSave = vi.fn();
    render(<PredictionForm existing={resolved} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Chấm nhầm? Đổi thành Sai" }));
    fireEvent.click(screen.getByRole("button", { name: "Đổi thành Sai" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0][0] as Prediction;
    expect(saved.outcome).toBe(false);
    expect(saved.probability).toBe(10);
    expect(saved.resolvedAt).toBe(date);
  });
});

/* ==================== F07 — dấu vân tay "Để sau" ==================== */

describe("F07: 'Để sau' chỉ ẩn đúng bộ dữ liệu đang thấy", () => {
  const plan = (ids: string[]): UploadPlan =>
    ({
      toAdd: {
        checkins: [],
        focusBlocks: ids.map((id) => ({ id })),
        brainDumps: [],
        cards: [],
        reviewLogs: [],
        predictions: [],
        weeklyReviews: [],
        experiments: [],
        experimentTags: [],
        mockTests: [],
      },
    }) as unknown as UploadPlan;

  it("thêm dữ liệu mới hoặc đổi tài khoản -> dấu khác -> thẻ hiện lại", () => {
    const base = uploadFingerprint("user-a", plan(["b1"]));
    expect(uploadFingerprint("user-a", plan(["b1"]))).toBe(base);
    expect(uploadFingerprint("user-a", plan(["b1", "b2"]))).not.toBe(base);
    expect(uploadFingerprint("user-b", plan(["b1"]))).not.toBe(base);
  });
});

/* ==================== F08 — tổng kết tuần ==================== */

describe("F08: tổng kết tuần chỉ đóng khi đã lưu, có follow up tuần trước", () => {
  const metrics = {
    avgSleepHours: null,
    wakeTimeSdMinutes: null,
    deepWorkMinutes: 0,
    avgDistractionsPerBlock: null,
    cardsReviewed: 0,
    retentionRate: null,
    brier30: null,
  } as unknown as MetricSet;

  it("lưu thành công: ghi câu trả lời follow up rồi mới đóng", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <WeeklyReviewForm
        weekStart="2026-09-21"
        metrics={metrics}
        previousChange="Điện thoại để phòng khác"
        onSave={onSave}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Một phần" }));
    fireEvent.change(container.querySelectorAll("textarea")[2], { target: { value: "Dậy 6h" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ oneChange: "Dậy 6h", lastChangeResult: "partly" });
  });

  it("lưu thất bại: form không đóng, chữ còn nguyên", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("x"));
    const onClose = vi.fn();
    const { container } = render(
      <WeeklyReviewForm weekStart="2026-09-21" metrics={metrics} onSave={onSave} onClose={onClose} />
    );
    fireEvent.change(container.querySelectorAll("textarea")[0], { target: { value: "Tự làm lại DCF" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelectorAll("textarea")[0].value).toBe("Tự làm lại DCF");
  });
});
