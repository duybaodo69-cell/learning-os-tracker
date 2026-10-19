/**
 * @vitest-environment happy-dom
 *
 * Glow-up (PRODUCT.md mục 10): checklist một chạm là lưu, hai chạm "+" liên
 * tiếp không đè nhau; form buổi tập điền sẵn từ buổi trước, gợi ý tăng tạ,
 * bỏ hiệp 0 lần, chặn kg không phải số.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../db/db";
import type { Workout, WorkoutSet } from "../db/types";
import { patchGlowDay } from "../lib/glowUpDb";
import GlowUpCard from "./GlowUpCard";
import WorkoutForm from "./WorkoutForm";

beforeEach(async () => {
  await db.glowDays.clear();
});
afterEach(() => cleanup());

const MONDAY = "2026-10-19"; // Thứ Hai, tuần 1, Gym A

describe("patchGlowDay", () => {
  it("hai lần cộng liên tiếp không mất lần nào, khoá #ngày", async () => {
    await Promise.all([
      patchGlowDay(MONDAY, (c) => ({ waterL: (c.waterL ?? 0) + 0.25 })),
      patchGlowDay(MONDAY, (c) => ({ waterL: (c.waterL ?? 0) + 0.25 })),
    ]);
    expect(await db.glowDays.get("#2026-10-19")).toEqual({ id: "#2026-10-19", date: MONDAY, waterL: 0.5 });
  });
});

describe("GlowUpCard", () => {
  const renderCard = (today = MONDAY, workouts: Workout[] = []) =>
    render(<GlowUpCard today={today} checkins={[]} workouts={workouts} onLogWorkout={vi.fn()} onEditWorkout={vi.fn()} />);

  it("ngoài 12 tuần thì không hiện gì", () => {
    const { container } = renderCard("2026-10-18");
    expect(container.textContent).toBe("");
  });

  it("hiện tuần, buổi hôm nay, adapalene tối đầu tiên", async () => {
    renderCard();
    expect(await screen.findByText("Tuần 1 · Nền tảng")).toBeTruthy();
    expect(screen.getByText("Gym A (đẩy + chân)")).toBeTruthy();
    expect(screen.getByText("rửa mặt · adapalene · dưỡng ẩm")).toBeTruthy();
  });

  it("bấm + nước và đánh dấu skincare là lưu ngay", async () => {
    renderCard();
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Nước: thêm 0,25 lít" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Skincare sáng/ }));
    });
    await waitFor(async () =>
      expect(await db.glowDays.get("#2026-10-19")).toMatchObject({ waterL: 0.25, skincareAm: true })
    );
    expect(await screen.findByText("0,25")).toBeTruthy();
  });

  it("bước chân lưu khi rời ô", async () => {
    renderCard();
    const input = await screen.findByLabelText(/Bước chân/);
    fireEvent.change(input, { target: { value: "8.200" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    await waitFor(async () => expect((await db.glowDays.get("#2026-10-19"))?.steps).toBe(8200));
  });

  it("buổi đã ghi hiện trong thẻ, bấm để sửa", async () => {
    const onEdit = vi.fn();
    const w: Workout = { id: "w1", date: MONDAY, startTime: "07:15", session: "gym_A", minutes: 60 };
    render(<GlowUpCard today={MONDAY} checkins={[]} workouts={[w]} onLogWorkout={vi.fn()} onEditWorkout={onEdit} />);
    fireEvent.click(await screen.findByRole("button", { name: "Sửa buổi Gym A 07:15" }));
    expect(onEdit).toHaveBeenCalledWith(w);
  });
});

describe("WorkoutForm", () => {
  const benchSets = (kg: number, reps: number[]): WorkoutSet[] => reps.map((r) => ({ exercise: "bench_press", kg, reps: r }));

  it("buổi trước đạt đỉnh: điền mức tạ mới, lưu đủ các hiệp", async () => {
    const prev: Workout = {
      id: "p",
      date: "2026-10-12",
      startTime: "07:15",
      session: "gym_A",
      minutes: 60,
      sets: benchSets(40, [10, 10, 10]),
    };
    const onSave = vi.fn();
    render(<WorkoutForm date={MONDAY} workouts={[prev]} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByText("Đạt đỉnh cả 3 hiệp → 42,5 kg")).toBeTruthy();
    expect((screen.getByLabelText("Bench press hoặc đẩy tạ đơn hiệp 1: kg") as HTMLInputElement).value).toBe("42,5");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu buổi tập" }));
    });
    const saved = onSave.mock.calls[0][0] as Workout;
    expect(saved).toMatchObject({ date: MONDAY, session: "gym_A", minutes: 60 });
    expect(saved.sets?.filter((s) => s.exercise === "bench_press")).toEqual(benchSets(42.5, [8, 8, 8]));
    expect(saved.sets).toHaveLength(18);
    expect(saved.km).toBeUndefined();
  });

  it("kg không phải số thì chặn Lưu", () => {
    render(<WorkoutForm date={MONDAY} workouts={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Lat pulldown hiệp 2: kg"), { target: { value: "abc" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Số kg phải là số/);
    expect((screen.getByRole("button", { name: "Lưu buổi tập" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("đổi sang chạy: không lưu hiệp, lưu km dấu phẩy", async () => {
    const onSave = vi.fn();
    render(<WorkoutForm date={MONDAY} workouts={[]} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Chạy nhẹ" }));
    fireEvent.change(screen.getByLabelText("Quãng đường (km)"), { target: { value: "5,5" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu buổi tập" }));
    });
    const saved = onSave.mock.calls[0][0] as Workout;
    expect(saved).toMatchObject({ session: "run_easy", km: 5.5 });
    expect(saved.sets).toBeUndefined();
  });

  it("Chủ nhật (nghỉ) chọn sẵn 'Buổi khác'", () => {
    render(<WorkoutForm date="2026-10-25" workouts={[]} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Buổi khác" }).getAttribute("aria-pressed")).toBe("true");
  });
});
