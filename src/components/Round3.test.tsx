/**
 * @vitest-environment happy-dom
 *
 * Đợt 3: thẻ nhanh từ buổi IELTS, deadline 72 giờ trên Hôm nay, tuần nhẹ bật tay.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "../db/db";
import { todayISO } from "../lib/dates";
import { addDays } from "../lib/scheduling";
import CountdownCard from "./CountdownCard";
import DeadlinesSoon from "./DeadlinesSoon";
import QuickCardRow from "./QuickCardRow";

beforeEach(async () => {
  await Promise.all([db.cards.clear(), db.deadlines.clear(), db.weekReviews.clear()]);
});
afterEach(() => cleanup());

describe("QuickCardRow", () => {
  it("Listening: chọn 'Lỗi nghe', gõ mặt trước, Tạo thẻ -> lưu ngay với nguồn", async () => {
    render(<QuickCardRow skill="Listening" />);
    fireEvent.click(screen.getByRole("button", { name: /Thẻ ôn từ buổi này/ }));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "fifteen / fifty" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Tạo thẻ" }));
    });
    const cards = await db.cards.toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ front: "fifteen / fifty", area: "IELTS", source: "ielts-listening", back: "" });
    expect(await screen.findByText(/đã tạo 1 thẻ/)).toBeTruthy();
  });
  it("mặt trước trống: nút Tạo thẻ bị khoá", () => {
    render(<QuickCardRow skill="Reading" />);
    fireEvent.click(screen.getByRole("button", { name: /Thẻ ôn từ buổi này/ }));
    expect((screen.getByRole("button", { name: "Tạo thẻ" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("DeadlinesSoon", () => {
  it("chỉ hiện deadline trong 72 giờ", async () => {
    const today = todayISO();
    await db.deadlines.bulkAdd([
      { id: "a", date: addDays(today, 1), title: "Nộp slide nhóm" },
      { id: "b", date: addDays(today, 5), title: "Xa hơn" },
    ]);
    render(<DeadlinesSoon today={today} />);
    expect(await screen.findByText("Nộp slide nhóm")).toBeTruthy();
    expect(screen.getByText(/Mai/)).toBeTruthy();
    expect(screen.queryByText("Xa hơn")).toBeNull();
  });
});

describe("CountdownCard — tuần nhẹ bật tay khi chốt kế hoạch", () => {
  it("tuần 12/10 (không thi môn) bật nhẹ ở buổi CN 11/10 -> hiện dòng tuần nhẹ", async () => {
    await db.weekReviews.put({
      id: "#2026-10-05",
      weekStart: "2026-10-05",
      learnedWithoutNotes: "",
      dataInsight: "",
      oneChange: "",
      plan: { listening: 7, reading: 0, light: true },
    });
    render(<CountdownCard date="2026-10-14" />);
    expect(await screen.findByText(/bạn chọn khi chốt kế hoạch/)).toBeTruthy();
  });
});
