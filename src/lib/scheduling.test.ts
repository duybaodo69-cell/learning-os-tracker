/**
 * Test tự động cho logic lịch ôn tập.
 *
 * Chạy bằng: npm test
 *
 * Vì sao cần: giãn cách ôn tập là thứ sai rất âm thầm — thẻ vẫn hiện ra,
 * chỉ là sai ngày, và phải vài tuần sau mới phát hiện. Test bắt lỗi ngay.
 */
import { describe, expect, it } from "vitest";
import type { Card } from "../db/types";
import {
  DAILY_LIMIT,
  START_EASE,
  addDays,
  buildQueue,
  dueCount,
  isDue,
  newCardState,
  scheduleNext,
  splitGapsIntoFronts,
} from "./scheduling";

describe("scheduleNext — nút Quên (again)", () => {
  it("hẹn lại đúng 1 ngày và cộng lapses", () => {
    const after = scheduleNext({ intervalDays: 30, ease: 2.5, reps: 5, lapses: 1 }, "again");
    expect(after.intervalDays).toBe(1);
    expect(after.lapses).toBe(2);
  });

  it("đưa reps về 0 để thẻ học lại từ nấc đầu", () => {
    const after = scheduleNext({ intervalDays: 30, ease: 2.5, reps: 5, lapses: 0 }, "again");
    expect(after.reps).toBe(0);

    // Ôn đúng ngay sau đó thì phải quay lại nấc 1 ngày, không nhảy về 30 ngày.
    const next = scheduleNext(after, "good");
    expect(next.intervalDays).toBe(1);
  });
});

describe("scheduleNext — nút Được (good)", () => {
  it("thẻ mới: nấc đầu là 1 ngày, nấc hai là 3 ngày", () => {
    const s0 = newCardState();
    expect(s0.ease).toBe(START_EASE);

    const s1 = scheduleNext(s0, "good");
    expect(s1.intervalDays).toBe(1);
    expect(s1.reps).toBe(1);

    const s2 = scheduleNext(s1, "good");
    expect(s2.intervalDays).toBe(3);
    expect(s2.reps).toBe(2);
  });

  it("từ nấc ba trở đi thì nhân với ease", () => {
    // reps = 2 nghĩa là đã qua hai nấc đầu.
    const s3 = scheduleNext({ intervalDays: 3, ease: 2.5, reps: 2, lapses: 0 }, "good");
    expect(s3.intervalDays).toBe(8); // round(3 × 2.5) = 8

    const s4 = scheduleNext(s3, "good");
    expect(s4.intervalDays).toBe(20); // round(8 × 2.5) = 20
  });
});

describe("scheduleNext — nút Khó (hard)", () => {
  it("nhân 1.2, luôn tối thiểu 1 ngày", () => {
    const fromNew = scheduleNext(newCardState(), "hard");
    expect(fromNew.intervalDays).toBe(1); // round(1 × 1.2) = 1

    const s = scheduleNext({ intervalDays: 20, ease: 2.5, reps: 4, lapses: 0 }, "hard");
    expect(s.intervalDays).toBe(24); // round(20 × 1.2) = 24
  });

  it("tăng chậm hơn hẳn nút Được", () => {
    const state = { intervalDays: 20, ease: 2.5, reps: 4, lapses: 0 };
    const hard = scheduleNext(state, "hard").intervalDays;
    const good = scheduleNext(state, "good").intervalDays;
    expect(hard).toBeLessThan(good);
  });
});

describe("scheduleNext — nút Dễ (easy)", () => {
  it("luôn giãn xa hơn nút Được, kể cả với thẻ mới", () => {
    const states = [
      newCardState(),
      { intervalDays: 1, ease: 2.5, reps: 1, lapses: 0 },
      { intervalDays: 3, ease: 2.5, reps: 2, lapses: 0 },
      { intervalDays: 20, ease: 2.5, reps: 4, lapses: 0 },
    ];
    for (const s of states) {
      const easy = scheduleNext(s, "easy").intervalDays;
      const good = scheduleNext(s, "good").intervalDays;
      expect(easy).toBeGreaterThan(good);
    }
  });

  it("nhân ease rồi nhân thêm 1.3", () => {
    const s = scheduleNext({ intervalDays: 20, ease: 2.5, reps: 4, lapses: 0 }, "easy");
    expect(s.intervalDays).toBe(65); // round(20 × 2.5 × 1.3) = 65
  });
});

describe("scheduleNext — bất biến chung", () => {
  it("không bao giờ trả về khoảng cách nhỏ hơn 1 ngày", () => {
    const grades = ["again", "hard", "good", "easy"] as const;
    const states = [
      newCardState(),
      { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 },
      { intervalDays: 1, ease: 2.5, reps: 1, lapses: 3 },
      { intervalDays: 365, ease: 2.5, reps: 9, lapses: 0 },
    ];
    for (const s of states) {
      for (const g of grades) {
        expect(scheduleNext(s, g).intervalDays).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("chỉ nút Quên mới làm tăng lapses", () => {
    const s = { intervalDays: 5, ease: 2.5, reps: 3, lapses: 2 };
    expect(scheduleNext(s, "hard").lapses).toBe(2);
    expect(scheduleNext(s, "good").lapses).toBe(2);
    expect(scheduleNext(s, "easy").lapses).toBe(2);
    expect(scheduleNext(s, "again").lapses).toBe(3);
  });

  it("không sửa vào object gốc", () => {
    const s = { intervalDays: 5, ease: 2.5, reps: 3, lapses: 2 };
    scheduleNext(s, "good");
    expect(s).toEqual({ intervalDays: 5, ease: 2.5, reps: 3, lapses: 2 });
  });
});

describe("addDays", () => {
  it("cộng ngày bình thường", () => {
    expect(addDays("2026-09-25", 1)).toBe("2026-09-26");
    expect(addDays("2026-09-25", 10)).toBe("2026-10-05");
  });

  it("qua tháng và qua năm", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("năm nhuận", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // 2028 nhuận
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 không nhuận
  });

  it("cộng 0 ngày giữ nguyên", () => {
    expect(addDays("2026-09-25", 0)).toBe("2026-09-25");
  });
});

/* -------- tiện ích tạo thẻ giả cho test -------- */
function makeCard(id: string, dueDate: string, createdAt = "2026-01-01"): Card {
  return {
    id,
    front: `mặt trước ${id}`,
    back: `mặt sau ${id}`,
    area: "IELTS",
    createdAt,
    dueDate,
    intervalDays: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0,
  };
}

describe("isDue", () => {
  it("đến hạn khi dueDate bằng hoặc trước hôm nay", () => {
    expect(isDue(makeCard("a", "2026-09-24"), "2026-09-25")).toBe(true); // quá hạn
    expect(isDue(makeCard("b", "2026-09-25"), "2026-09-25")).toBe(true); // đúng hôm nay
    expect(isDue(makeCard("c", "2026-09-26"), "2026-09-25")).toBe(false); // mai
  });
});

describe("buildQueue", () => {
  const today = "2026-09-25";

  it("chỉ lấy thẻ đến hạn", () => {
    const cards = [makeCard("qua-han", "2026-09-20"), makeCard("mai", "2026-09-26")];
    expect(buildQueue(cards, today).map((c) => c.id)).toEqual(["qua-han"]);
  });

  it("thẻ quá hạn lâu nhất lên trước", () => {
    const cards = [
      makeCard("moi", "2026-09-25"),
      makeCard("cu-nhat", "2026-09-10"),
      makeCard("giua", "2026-09-20"),
    ];
    expect(buildQueue(cards, today).map((c) => c.id)).toEqual(["cu-nhat", "giua", "moi"]);
  });

  it("cắt ở 30 thẻ mỗi ngày", () => {
    const cards = Array.from({ length: 50 }, (_, i) => makeCard(`c${i}`, "2026-09-20"));
    expect(buildQueue(cards, today)).toHaveLength(DAILY_LIMIT);
    expect(DAILY_LIMIT).toBe(30);
  });

  it("không có thẻ nào đến hạn thì trả về danh sách rỗng", () => {
    expect(buildQueue([makeCard("x", "2026-12-01")], today)).toEqual([]);
  });
});

describe("dueCount", () => {
  it("đếm số thẻ đến hạn nhưng không vượt quá mức trần", () => {
    const today = "2026-09-25";
    expect(dueCount([makeCard("a", "2026-09-25"), makeCard("b", "2026-10-01")], today)).toBe(1);

    const many = Array.from({ length: 99 }, (_, i) => makeCard(`c${i}`, "2026-09-01"));
    expect(dueCount(many, today)).toBe(DAILY_LIMIT);
  });
});

describe("splitGapsIntoFronts", () => {
  it("mỗi dòng thành một thẻ", () => {
    expect(splitGapsIntoFronts("WACC là gì\nQuên công thức beta")).toEqual([
      "WACC là gì",
      "Quên công thức beta",
    ]);
  });

  it("bỏ dòng trống và khoảng trắng thừa", () => {
    expect(splitGapsIntoFronts("  A  \n\n\n   \n B ")).toEqual(["A", "B"]);
  });

  it("bỏ ký hiệu gạch đầu dòng và đánh số", () => {
    expect(splitGapsIntoFronts("- A\n* B\n• C\n1. D\n2) E")).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("bỏ dòng trùng nhau", () => {
    expect(splitGapsIntoFronts("A\nB\nA\n- A")).toEqual(["A", "B"]);
  });

  it("ô trống thì không tạo thẻ nào", () => {
    expect(splitGapsIntoFronts("")).toEqual([]);
    expect(splitGapsIntoFronts("   \n  \n")).toEqual([]);
  });
});

describe("kịch bản thật: một thẻ đi qua nhiều ngày", () => {
  it("học đúng liên tục thì khoảng cách giãn dần", () => {
    let state = newCardState();
    let due = "2026-09-25";
    const lich: string[] = [];

    for (let i = 0; i < 5; i++) {
      state = scheduleNext(state, "good");
      due = addDays(due, state.intervalDays);
      lich.push(`${state.intervalDays}d -> ${due}`);
    }

    expect(lich).toEqual([
      "1d -> 2026-09-26",
      "3d -> 2026-09-29",
      "8d -> 2026-10-07",
      "20d -> 2026-10-27",
      "50d -> 2026-12-16",
    ]);
  });

  it("quên giữa chừng thì quay lại ngày mai rồi học lại từ đầu", () => {
    let state = newCardState();
    state = scheduleNext(state, "good"); // 1
    state = scheduleNext(state, "good"); // 3
    state = scheduleNext(state, "good"); // 8
    expect(state.intervalDays).toBe(8);

    state = scheduleNext(state, "again");
    expect(state.intervalDays).toBe(1);
    expect(state.lapses).toBe(1);

    state = scheduleNext(state, "good");
    expect(state.intervalDays).toBe(1); // lại từ nấc đầu
    state = scheduleNext(state, "good");
    expect(state.intervalDays).toBe(3);
  });
});
