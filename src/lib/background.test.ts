// @vitest-environment happy-dom
/** Test kiểm tra link nền, đọc/ghi lựa chọn và phương án ảnh tĩnh. */
import { describe, expect, it } from "vitest";
import { checkBackgroundUrl, describeBackground, displayMode, parseBackground, sameBackground, stillReason } from "./background";

describe("checkBackgroundUrl — link YouTube mở chế độ player (không bao giờ là nền phủ)", () => {
  const links = [
    "https://www.youtube.com/watch?v=HFM-EHduRrQ",
    "https://youtube.com/watch?v=HFM-EHduRrQ",
    "https://m.youtube.com/watch?v=HFM-EHduRrQ",
    "https://youtu.be/HFM-EHduRrQ",
    "https://music.youtube.com/watch?v=HFM-EHduRrQ",
    "https://www.youtube-nocookie.com/embed/HFM-EHduRrQ",
    "https://www.youtube.com/shorts/HFM-EHduRrQ",
  ];
  for (const link of links) {
    it(link, () => {
      const r = checkBackgroundUrl(link);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.background.kind).toBe("youtube");
        expect(displayMode(r.background)).toBe("player");
      }
    });
  }

  it("lấy đúng mã video và giây bắt đầu", () => {
    expect(checkBackgroundUrl("https://youtu.be/HFM-EHduRrQ?t=90")).toEqual({
      ok: true,
      background: { kind: "youtube", videoId: "HFM-EHduRrQ", start: 90 },
    });
  });

  it("link YouTube không trỏ tới video (kênh, playlist) -> báo rõ", () => {
    for (const link of ["https://www.youtube.com/@SeanStudy", "https://www.youtube.com/playlist?list=PL1"]) {
      const r = checkBackgroundUrl(link);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("youtube-no-video");
    }
  });

  it("tên miền chỉ giống YouTube thì không bị nhầm — thành nền phủ bình thường", () => {
    const r = checkBackgroundUrl("https://notyoutube.com/a.mp4");
    expect(r.ok && r.background.kind).toBe("url");
  });
});

describe("checkBackgroundUrl — loại file", () => {
  it("nhận ra ảnh qua đuôi file, kể cả khi có ?query", () => {
    expect(checkBackgroundUrl("https://x.com/a.JPG")).toMatchObject({ ok: true, background: { kind: "url", media: "image" } });
    expect(checkBackgroundUrl("https://x.com/a.gif?w=1200#top")).toMatchObject({ ok: true, background: { kind: "url", media: "image" } });
    expect(checkBackgroundUrl("https://x.com/a.webp")).toMatchObject({ ok: true, background: { kind: "url", media: "image" } });
  });

  it("nhận ra video mp4 / webm", () => {
    expect(checkBackgroundUrl("https://x.com/v.mp4")).toMatchObject({ ok: true, background: { kind: "url", media: "video" } });
    expect(checkBackgroundUrl("https://x.com/v.webm?t=1")).toMatchObject({ ok: true, background: { kind: "url", media: "video" } });
  });

  it("không có đuôi file -> chưa rõ loại, sẽ thử khi hiển thị", () => {
    expect(checkBackgroundUrl("https://images.example.com/photo/123")).toMatchObject({ ok: true, background: { kind: "url", media: "unknown" } });
  });

  it("bỏ khoảng trắng thừa khi dán", () => {
    expect(checkBackgroundUrl("  https://x.com/a.png  ")).toMatchObject({ ok: true, background: { url: "https://x.com/a.png" } });
  });
});

describe("checkBackgroundUrl — link không dùng được", () => {
  it("rỗng", () => {
    expect(checkBackgroundUrl("   ")).toMatchObject({ ok: false, reason: "empty" });
  });
  it("không phải link", () => {
    expect(checkBackgroundUrl("thanh pho ve dem")).toMatchObject({ ok: false, reason: "invalid" });
  });
  it("http thường bị chặn trong app https", () => {
    expect(checkBackgroundUrl("http://x.com/a.jpg")).toMatchObject({ ok: false, reason: "not-https" });
  });
  it("trang xem video (Vimeo, TikTok...) không phải file", () => {
    expect(checkBackgroundUrl("https://vimeo.com/12345")).toMatchObject({ ok: false, reason: "video-page" });
    expect(checkBackgroundUrl("https://www.tiktok.com/@a/video/1")).toMatchObject({ ok: false, reason: "video-page" });
  });
  it("javascript: / data: không được nhận", () => {
    expect(checkBackgroundUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkBackgroundUrl("data:image/png;base64,AAAA").ok).toBe(false);
  });
});

describe("parseBackground — đọc lựa chọn đã lưu", () => {
  it("chưa lưu gì -> không nền", () => {
    expect(parseBackground(null)).toEqual({ kind: "none" });
  });
  it("cảnh có sẵn", () => {
    expect(parseBackground('{"kind":"preset","id":"city-night-shanghai"}')).toEqual({
      kind: "preset",
      id: "city-night-shanghai",
    });
  });
  it("cảnh không còn trong danh sách -> không nền, không làm vỡ app", () => {
    expect(parseBackground('{"kind":"preset","id":"da-bi-xoa"}')).toEqual({ kind: "none" });
  });
  it("link đã lưu được kiểm tra lại: YouTube không bao giờ được coi là nền phủ", () => {
    expect(parseBackground('{"kind":"url","url":"https://youtu.be/HFM-EHduRrQ"}')).toEqual({ kind: "none" });
    expect(parseBackground('{"kind":"url","url":"https://x.com/a.mp4"}')).toEqual({
      kind: "url",
      url: "https://x.com/a.mp4",
      media: "video",
    });
  });
  it("video YouTube đã lưu", () => {
    expect(parseBackground('{"kind":"youtube","videoId":"HFM-EHduRrQ","start":90}')).toEqual({
      kind: "youtube",
      videoId: "HFM-EHduRrQ",
      start: 90,
    });
  });
  it("mã YouTube hỏng -> không nền", () => {
    expect(parseBackground('{"kind":"youtube","videoId":"<script>"}')).toEqual({ kind: "none" });
  });
  it("JSON hỏng -> không nền", () => {
    expect(parseBackground("{hong")).toEqual({ kind: "none" });
  });
});

describe("sameBackground", () => {
  it("so đúng từng loại", () => {
    expect(sameBackground({ kind: "none" }, { kind: "none" })).toBe(true);
    expect(sameBackground({ kind: "preset", id: "a" }, { kind: "preset", id: "a" })).toBe(true);
    expect(sameBackground({ kind: "preset", id: "a" }, { kind: "preset", id: "b" })).toBe(false);
    expect(sameBackground({ kind: "none" }, { kind: "preset", id: "a" })).toBe(false);
  });
});

describe("stillReason — khi nào dùng ảnh tĩnh thay video", () => {
  const normal = { reducedMotion: false, saveData: false, deviceMemory: 8, cpuCores: 8 };
  it("máy bình thường -> phát video", () => {
    expect(stillReason(normal)).toBeNull();
  });
  it("giảm chuyển động -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, reducedMotion: true })).toContain("giảm chuyển động");
  });
  it("tiết kiệm dữ liệu -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, saveData: true })).toContain("tiết kiệm dữ liệu");
  });
  it("máy yếu (RAM <= 2GB hoặc <= 2 nhân) -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, deviceMemory: 2 })).toContain("cấu hình thấp");
    expect(stillReason({ ...normal, cpuCores: 2 })).toContain("cấu hình thấp");
  });
  it("trình duyệt không cho biết RAM/CPU -> không đoán bừa là máy yếu", () => {
    expect(stillReason({ reducedMotion: false, saveData: false })).toBeNull();
  });
});

describe("displayMode / describeBackground — phân biệt hai chế độ", () => {
  it("YouTube là player, còn lại là nền phủ", () => {
    expect(displayMode({ kind: "youtube", videoId: "HFM-EHduRrQ" })).toBe("player");
    expect(displayMode({ kind: "preset", id: "city-day-tokyo" })).toBe("overlay");
    expect(displayMode({ kind: "url", url: "https://x.com/a.mp4", media: "video" })).toBe("overlay");
    expect(displayMode({ kind: "none" })).toBe("none");
  });
  it("dòng 'Nền hiện tại' ghi rõ chế độ", () => {
    expect(describeBackground({ kind: "youtube", videoId: "HFM-EHduRrQ" })).toBe("YouTube · Thượng Hải tới hoàng hôn");
    expect(describeBackground({ kind: "youtube", videoId: "abcdefghijk" })).toBe("YouTube · video abcdefghijk");
    expect(describeBackground({ kind: "preset", id: "city-day-tokyo" })).toBe("Cảnh có sẵn · Tokyo trong sương sớm");
  });
  it("hai video YouTube khác nhau không bị coi là một", () => {
    expect(sameBackground({ kind: "youtube", videoId: "HFM-EHduRrQ" }, { kind: "youtube", videoId: "AdV-Gt6KjzI" })).toBe(false);
  });
});

describe("tuỳ chọn hiển thị", () => {
  it("video nền mặc định bật; tắt/bật được và nhớ trên máy", async () => {
    const { getVideoOn, saveVideoOn } = await import("./background");
    localStorage.clear();
    expect(getVideoOn()).toBe(true);
    saveVideoOn(false);
    expect(getVideoOn()).toBe(false);
    saveVideoOn(true);
    expect(getVideoOn()).toBe(true);
  });

  it("độ tối: mặc định vừa, giá trị lạ quay về vừa", async () => {
    const { DIM_KEY, getDim, saveDim } = await import("./background");
    localStorage.clear();
    expect(getDim()).toBe("normal");
    saveDim("strong");
    expect(getDim()).toBe("strong");
    localStorage.setItem(DIM_KEY, "tím");
    expect(getDim()).toBe("normal");
  });

  it("mọi mức độ tối giữ chữ trắng >= 4.5:1 ở vòng chữ, kể cả trên khung hình trắng xoá", async () => {
    const { DIM_LEVELS } = await import("./background");
    const lum = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    for (const lv of Object.values(DIM_LEVELS)) {
      const alpha = 1 - (1 - lv.base) * (1 - lv.ring); // hai lớp đen chồng nhau
      const grey = 255 * (1 - alpha); // video trắng xoá phía sau
      expect(1.05 / (lum(grey) + 0.05)).toBeGreaterThanOrEqual(4.5);
      // Nút ở mép: chữ trắng trên nền nút đen 60% + lớp mép
      const btn = 255 * (1 - lv.bars) * (1 - 0.6);
      expect(1.05 / (lum(btn) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
