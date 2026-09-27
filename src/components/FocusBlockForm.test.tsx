/**
 * @vitest-environment happy-dom
 *
 * Phần IELTS của form kết thúc phiên (Đợt 1):
 *   - tự điền đề tiếp theo từ buổi đã ghi
 *   - chỉ lưu được khi tổng 4 loại lỗi = số câu sai
 *   - lưu vào block.ielts cùng một lần ghi
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../db/db";
import type { FocusBlock } from "../db/types";
import FocusBlockForm from "./FocusBlockForm";

const DONE: FocusBlock = {
  id: "old",
  date: "2026-09-28",
  startTime: "09:30",
  minutes: 50,
  area: "IELTS",
  focusRating: 4,
  distractions: 0,
  phoneAway: true,
  ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 8, errors: [1, 1, 0, 0] } },
};

beforeEach(async () => {
  localStorage.setItem("learning-os:last-area", "IELTS");
  await db.focusBlocks.clear();
  await db.focusBlocks.put(DONE);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function renderForm(onSave = vi.fn()) {
  render(
    <FocusBlockForm
      date="2026-09-29"
      initialMinutes={55}
      initialStartTime="09:35"
      onSave={onSave}
      onCancel={() => {}}
    />
  );
  // Chờ đọc lịch sử IELTS xong (useLiveQuery).
  await screen.findByRole("button", { name: "Section 2" });
  return onSave;
}

const plus = (i: number) => screen.getAllByRole("button", { name: "Tăng" })[i];

describe("Form kết thúc phiên IELTS", () => {
  it("điền sẵn đề tiếp theo: Cam 10 · Test 1 · Section 2 (Listening)", async () => {
    await renderForm();
    expect(screen.getByRole("button", { name: "Listening" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Section 2" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Section 1" }).getAttribute("aria-pressed")).toBe("false");
    expect((screen.getByLabelText("Cuốn Cambridge") as HTMLSelectElement).value).toBe("10");
  });

  it("chỉ lưu được khi phân loại đủ số câu sai, rồi lưu đúng dữ liệu", async () => {
    const onSave = await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "4" })); // độ tập trung
    fireEvent.change(screen.getByPlaceholderText("?"), { target: { value: "7" } }); // 7/10 -> sai 3

    const save = () => screen.getByRole("button", { name: "Lưu block" }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    expect(screen.getAllByText(/Đã phân loại 0\/3/).length).toBeGreaterThan(0);

    // Bộ đếm lỗi nằm sau bộ đếm "số câu" (ẩn trong <details>) và trước "phân tâm".
    // Thứ tự nút "Tăng": [0] số câu đã làm, [1..4] loại ①..④, [5] phân tâm.
    fireEvent.click(plus(1));
    fireEvent.click(plus(1));
    expect(save().disabled).toBe(true);
    fireEvent.click(plus(3));
    expect(save().disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "10p" })); // chép chính tả
    await act(async () => {
      fireEvent.click(save());
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    const block = onSave.mock.calls[0][0] as FocusBlock;
    expect(block.area).toBe("IELTS");
    expect(block.ielts).toEqual({
      skill: "Listening",
      test: { book: 10, test: 1, parts: [2], questions: 10, correct: 7, errors: [2, 0, 1, 0] },
      dictationMinutes: 10,
    });
  });

  it("Reading: đề tiếp theo tính riêng (P1), bộ lỗi Ⓐ–Ⓓ, không có chép chính tả", async () => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Reading" }));
    expect(screen.getByRole("button", { name: "Passage 1" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Ⓐ Hết giờ/)).toBeTruthy();
    expect(screen.queryByText(/① Không nghe ra/)).toBeNull();
    expect(screen.queryByText("Chép chính tả")).toBeNull();
    expect(screen.getByText("/ 13")).toBeTruthy();
  });

  it("\"Không làm đề\": lưu được mà không cần điểm", async () => {
    const onSave = await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "Không làm đề" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu block" }));
    });
    expect((onSave.mock.calls[0][0] as FocusBlock).ielts).toEqual({ skill: "Listening" });
  });

  it("area khác IELTS: không có phần IELTS, không lưu trường ielts", async () => {
    const onSave = await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "EFM" }));
    expect(screen.queryByText("Buổi IELTS")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu block" }));
    });
    expect((onSave.mock.calls[0][0] as FocusBlock).ielts).toBeUndefined();
  });
});
