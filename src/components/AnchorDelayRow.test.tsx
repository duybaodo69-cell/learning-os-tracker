/**
 * @vitest-environment happy-dom
 *
 * Dời khung 9:30 (Đợt 2): hai chạm là lưu, mỗi ngày một bản ghi, sửa được,
 * không có nút xoá, không có lời trách.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "../db/db";
import { anchorDelayId } from "../db/keys";
import { todayISO } from "../lib/dates";
import AnchorDelayRow from "./AnchorDelayRow";

beforeEach(async () => {
  await db.anchorDelays.clear();
});
afterEach(() => cleanup());

describe("AnchorDelayRow", () => {
  it("hỏi -> chọn 'Tối nay' -> chọn lý do là lưu, khoá #ngày", async () => {
    render(<AnchorDelayRow ask delayToday={null} weekCount={0} />);
    expect(screen.getByText(/Khung 9:30 chưa bắt đầu — dời sang lúc nào\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tối nay" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Việc gấp của trường" }));
    });
    const today = todayISO();
    const saved = await db.anchorDelays.get(anchorDelayId(today));
    expect(saved).toMatchObject({ date: today, target: "evening", reason: "school" });
    expect(saved?.at).toMatch(/^\d{2}:\d{2}$/);
  });

  it("chưa chọn lúc dời thì chưa hiện lý do (không lưu nhầm)", () => {
    render(<AnchorDelayRow ask delayToday={null} weekCount={0} />);
    expect(screen.queryByRole("button", { name: "Việc riêng" })).toBeNull();
  });

  it("đã dời: một dòng trung tính + Sửa, không có nút xoá, không lời trách", () => {
    render(
      <AnchorDelayRow
        ask={false}
        delayToday={{ id: "#2026-09-29", date: "2026-09-29", target: "after-class", reason: "work", at: "10:50" }}
        weekCount={2}
      />
    );
    expect(screen.getByText(/Đã dời sang/).textContent).toMatch(/Sau giờ học/);
    expect(screen.getByText(/lần tuần này/).textContent).toMatch(/2/);
    expect(screen.getByRole("button", { name: "Sửa" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xoá/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/lười|lại dời|thất bại|trễ/i);
  });

  it("sửa lần dời giữ đúng ngày cũ", async () => {
    const old = { id: "#2026-09-29", date: "2026-09-29", target: "after-class" as const, reason: "work" as const, at: "10:50" };
    await db.anchorDelays.put(old);
    render(<AnchorDelayRow ask={false} delayToday={old} weekCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.click(screen.getByRole("button", { name: "Mai" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Việc riêng" }));
    });
    expect(await db.anchorDelays.get("#2026-09-29")).toEqual({ ...old, target: "tomorrow", reason: "personal" });
    expect(await db.anchorDelays.count()).toBe(1);
  });

  it("không hỏi và chưa dời: không vẽ gì", () => {
    const { container } = render(<AnchorDelayRow ask={false} delayToday={null} weekCount={0} />);
    expect(container.textContent).toBe("");
  });
});
