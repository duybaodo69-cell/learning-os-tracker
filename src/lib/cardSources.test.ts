import { describe, expect, it } from "vitest";
import type { Card } from "../db/types";
import { buildSourcedCard, defaultAreaFor, sourceOf, sourcesForSkill } from "./cardSources";

describe("cardSources", () => {
  it("nguồn gợi ý theo kỹ năng", () => {
    expect(sourcesForSkill("Listening")).toEqual(["ielts-listening", "ielts-vocab"]);
    expect(sourcesForSkill("Writing")).toEqual(["writing", "ielts-vocab"]);
    expect(sourcesForSkill("Reading")).toEqual(["ielts-vocab"]);
    expect(sourcesForSkill("Speaking")).toEqual(["ielts-vocab"]);
  });
  it("góp ý manager mặc định area công ty, còn lại IELTS", () => {
    expect(defaultAreaFor("manager")).toBe("Internship VC");
    expect(defaultAreaFor("writing")).toBe("IELTS");
  });
  it("thẻ mới có nguồn: ôn ngay hôm nay, cắt khoảng trắng; mặt sau trống = nháp", () => {
    const c = buildSourcedCard({ id: "x", front: "  fifteen/fifty ", back: "", source: "ielts-listening", today: "2026-10-01" });
    expect(c).toMatchObject({ front: "fifteen/fifty", back: "", area: "IELTS", dueDate: "2026-10-01", reps: 0, source: "ielts-listening" });
  });
  it("bộ lọc: có nguồn -> nguồn; không nguồn -> brain dump hoặc tự tạo", () => {
    const base = { id: "c", front: "f", back: "b", area: "EFM", createdAt: "", dueDate: "", intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 } as Card;
    expect(sourceOf({ ...base, source: "manager" })).toBe("manager");
    expect(sourceOf({ ...base, brainDumpId: "d" })).toBe("brain-dump");
    expect(sourceOf(base)).toBe("manual");
  });
});
