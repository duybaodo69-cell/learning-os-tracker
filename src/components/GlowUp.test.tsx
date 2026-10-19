/**
 * @vitest-environment happy-dom
 *
 * Glow-up (PRODUCT.md mục 10): checklist một chạm là lưu, hai chạm "+" liên
 * tiếp không đè nhau; form buổi tập điền sẵn từ buổi trước, gợi ý tăng tạ,
 * bỏ hiệp 0 lần, chặn kg không phải số. Check-in Chủ nhật (G3): cân trung bình
 * điền sẵn, số gốc tuần 1, so với tuần 1, gợi ý điều chỉnh, ảnh chỉ tuần 1/4/8/12.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../db/db";
import type { BodyCheckin, GlowDay, Workout, WorkoutSet } from "../db/types";
import { patchGlowDay } from "../lib/glowUpDb";
import BodyCheckinCard from "./BodyCheckinCard";
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
    render(<GlowUpCard today={today} checkins={[]} workouts={workouts} onLogWorkout={vi.fn()} onEditWorkout={vi.fn()} onOpenSchedule={vi.fn()} />);

  it("ngoài 12 tuần thì không hiện gì", () => {
    const { container } = renderCard("2026-10-18");
    expect(container.textContent).toBe("");
  });

  it("hiện tuần, buổi hôm nay, adapalene tối đầu tiên", async () => {
    renderCard();
    expect(await screen.findByText("Tuần 1 · Nền tảng ›")).toBeTruthy();
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

  it("bấm tuần / giai đoạn mở màn lịch 12 tuần", async () => {
    const onOpen = vi.fn();
    render(<GlowUpCard today={MONDAY} checkins={[]} workouts={[]} onLogWorkout={vi.fn()} onEditWorkout={vi.fn()} onOpenSchedule={onOpen} />);
    fireEvent.click(await screen.findByRole("button", { name: "Tuần 1 · Nền tảng ›" }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("buổi đã ghi hiện trong thẻ, bấm để sửa", async () => {
    const onEdit = vi.fn();
    const w: Workout = { id: "w1", date: MONDAY, startTime: "07:15", session: "gym_A", minutes: 60 };
    render(<GlowUpCard today={MONDAY} checkins={[]} workouts={[w]} onLogWorkout={vi.fn()} onEditWorkout={onEdit} onOpenSchedule={vi.fn()} />);
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

describe("Cân sáng trong thẻ Glow-up", () => {
  const renderCard = () =>
    render(<GlowUpCard today={MONDAY} checkins={[]} workouts={[]} onLogWorkout={vi.fn()} onEditWorkout={vi.fn()} onOpenSchedule={vi.fn()} />);

  it("lưu số kg dấu phẩy khi rời ô", async () => {
    renderCard();
    const input = await screen.findByLabelText(/Cân sáng/);
    fireEvent.change(input, { target: { value: "70,4" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    await waitFor(async () => expect((await db.glowDays.get("#2026-10-19"))?.weightKg).toBe(70.4));
  });

  it("số vô lý thì không lưu và báo dưới ô", async () => {
    renderCard();
    const input = await screen.findByLabelText(/Cân sáng/);
    fireEvent.change(input, { target: { value: "7" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(screen.getByRole("alert").textContent).toMatch(/Nhập số kg/);
    expect(await db.glowDays.get("#2026-10-19")).toBeUndefined();
  });

  it("cân không tính vào checklist 9 mục", async () => {
    await db.glowDays.put({ id: "#2026-10-19", date: MONDAY, weightKg: 70 });
    renderCard();
    expect((await screen.findByText(/mục · đạt khi/)).textContent).toMatch(/0\/9/);
  });
});

describe("BodyCheckinCard", () => {
  const SUNDAY_W1 = "2026-10-19"; // tuần 1
  const W4 = "2026-11-09";
  const weighIns = (weekStart: string, kgs: number[]): GlowDay[] =>
    kgs.map((kg, i) => {
      const date = `${weekStart.slice(0, 8)}${String(Number(weekStart.slice(8)) + i * 2).padStart(2, "0")}`;
      return { id: `#${date}`, date, weightKg: kg };
    });

  async function open(props: Partial<Parameters<typeof BodyCheckinCard>[0]> & { weekStart: string }) {
    const onSave = vi.fn();
    render(<BodyCheckinCard checkins={[]} days={[]} workouts={[]} onSave={onSave} {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));
    return onSave;
  }

  it("tuần 1: điền sẵn trung bình các lần cân, nói rõ là số gốc, có ô ảnh, lưu đúng", async () => {
    const onSave = await open({ weekStart: SUNDAY_W1, days: weighIns(SUNDAY_W1, [78.2, 78, 77.9]) });
    expect((screen.getByLabelText("Cân trung bình (kg)") as HTMLInputElement).value).toBe("78");
    expect(screen.getByText(/Đây là số gốc/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Vòng bụng (cm)"), { target: { value: "97,5" } });
    fireEvent.click(screen.getByRole("switch", { name: /Đã chụp ảnh/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu check-in" }));
    });
    expect(onSave).toHaveBeenCalledWith({
      id: "#2026-10-19",
      weekStart: SUNDAY_W1,
      avgWeightKg: 78,
      waistCm: 97.5,
      photoTaken: true,
      note: undefined,
    });
  });

  it("tuần 2: không có ô ảnh; số vô lý chặn Lưu", async () => {
    await open({ weekStart: "2026-10-26" });
    expect(screen.queryByRole("switch", { name: /Đã chụp ảnh/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Vòng bụng (cm)"), { target: { value: "9" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Nhập số/);
    expect((screen.getByRole("button", { name: "Lưu check-in" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("tuần 4: so với tuần 1 và mốc −2 kg / −2 cm", async () => {
    const base: BodyCheckin = { id: "#2026-10-19", weekStart: SUNDAY_W1, avgWeightKg: 78, waistCm: 98 };
    await open({ weekStart: W4, checkins: [base] });
    fireEvent.change(screen.getByLabelText("Cân trung bình (kg)"), { target: { value: "76,4" } });
    fireEvent.change(screen.getByLabelText("Vòng bụng (cm)"), { target: { value: "96,5" } });
    const box = screen.getByText(/So với tuần 1/).textContent ?? "";
    expect(box).toMatch(/−1,6 kg/);
    expect(box).toMatch(/−1,5 cm/);
    expect(box).toMatch(/Mốc tuần 4: −2 kg · −2 cm/);
  });

  it("hiện gợi ý khi giảm dưới 0,2 kg hai tuần liền", async () => {
    const saved: BodyCheckin[] = [
      { id: "#2026-10-26", weekStart: "2026-10-26", avgWeightKg: 77.5 },
      { id: "#2026-11-02", weekStart: "2026-11-02", avgWeightKg: 77.4 },
    ];
    await open({ weekStart: W4, checkins: saved });
    fireEvent.change(screen.getByLabelText("Cân trung bình (kg)"), { target: { value: "77,3" } });
    expect(screen.getByText(/Giảm một phần tư chén cơm/)).toBeTruthy();
  });

  it("đã check-in: dòng thu gọn ghi số đã lưu và nút Sửa", () => {
    render(
      <BodyCheckinCard
        weekStart={SUNDAY_W1}
        existing={{ id: "#2026-10-19", weekStart: SUNDAY_W1, avgWeightKg: 78, waistCm: 97.5 }}
        checkins={[]}
        days={[]}
        workouts={[]}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/bấm để sửa/).textContent).toMatch(/78 kg · 97,5 cm/);
    expect(screen.getByRole("button", { name: "Sửa" })).toBeTruthy();
  });
});
