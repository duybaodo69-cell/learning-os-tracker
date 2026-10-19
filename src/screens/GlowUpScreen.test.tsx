/**
 * @vitest-environment happy-dom
 *
 * Màn "Glow-up 12 tuần" (G4): lịch tuần này + 12 tuần, số đo (bảng, trống khi
 * chưa check-in), buổi tập cũ sửa / xoá được — xoá phải qua hộp xác nhận.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../db/db";
import GlowUpScreen from "./GlowUpScreen";

// Hôm nay = Thứ Tư 21/10/2026 (tuần 1). useToday đọc todayISO.
vi.mock("../lib/useToday", () => ({ useToday: () => "2026-10-21", useNowHHmm: () => "10:00" }));

beforeEach(async () => {
  await Promise.all([db.workouts.clear(), db.bodyCheckins.clear(), db.glowDays.clear()]);
});
afterEach(() => cleanup());

describe("GlowUpScreen", () => {
  it("Lịch: tuần này với 7 ngày, 12 tuần với mốc tương đối, nút quay lại", async () => {
    const onBack = vi.fn();
    render(<GlowUpScreen backLabel="Hôm nay" onBack={onBack} />);
    expect(screen.getByText("Tuần 1 · Nền tảng")).toBeTruthy();
    expect(screen.getByText("Gym B (kéo + core)")).toBeTruthy();
    expect(screen.getAllByText(/^Tuần \d+$/)).toHaveLength(12);
    expect(screen.getByText(/−2 kg \/ −2 cm/)).toBeTruthy();
    expect(screen.getByText("tuần này")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Hôm nay/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it("Số đo: chưa check-in thì nói rõ; có rồi thì có bảng với mốc", async () => {
    render(<GlowUpScreen backLabel="Hôm nay" onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Số đo" }));
    expect(await screen.findByText("Chưa có check-in Chủ nhật nào")).toBeTruthy();
    await act(async () => {
      await db.bodyCheckins.put({ id: "#2026-10-19", weekStart: "2026-10-19", avgWeightKg: 78, waistCm: 98 });
    });
    const table = await screen.findByRole("table");
    expect(within(table).getByText("78")).toBeTruthy();
    expect(within(table).getByText("76 / 96")).toBeTruthy(); // mốc tuần 4
    expect(within(table).getByText("72,5 / 92")).toBeTruthy(); // mốc tuần 12
  });

  it("Buổi tập: buổi ngày cũ sửa được, xoá qua hộp xác nhận", async () => {
    await db.workouts.put({ id: "w1", date: "2026-10-19", startTime: "07:15", session: "gym_A", minutes: 60, effort: 3 });
    render(<GlowUpScreen backLabel="Hôm nay" onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Buổi tập" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sửa buổi Gym A ngày 19/10" }));
    expect(screen.getByText("Sửa buổi tập · 19/10")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xoá buổi tập này" }));
    // Chưa xoá cho tới khi xác nhận (luật số 4).
    expect(await db.workouts.count()).toBe(1);
    const dialog = await screen.findByRole("alertdialog");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: /Xoá/ }));
    });
    await waitFor(async () => expect(await db.workouts.count()).toBe(0));
  });
});
