/** Test đọc link YouTube — mọi dạng link thông dụng người dùng hay dán. */
import { describe, expect, it } from "vitest";
import { describeYouTubeError, parseStartTime, parseYouTube } from "./youtube";

const ID = "HFM-EHduRrQ";

describe("parseYouTube — link đọc được", () => {
  const cases: [string, ReturnType<typeof parseYouTube>][] = [
    [`https://www.youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`https://youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`https://m.youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`https://music.youtube.com/watch?list=PLqkb3vnOfFIMH0b-v66j2R_avqInN-Y3_&v=${ID}`, { videoId: ID }],
    [`https://www.youtube.com/watch?v=${ID}&list=PL123&index=2`, { videoId: ID }],
    [`https://www.youtube.com/watch?v=${ID}&t=90s`, { videoId: ID, start: 90 }],
    [`https://www.youtube.com/watch?v=${ID}&t=1m30s`, { videoId: ID, start: 90 }],
    [`https://youtu.be/${ID}`, { videoId: ID }],
    [`https://youtu.be/${ID}?si=AbCdEf123`, { videoId: ID }],
    [`https://youtu.be/${ID}?t=125`, { videoId: ID, start: 125 }],
    [`https://www.youtube.com/shorts/${ID}`, { videoId: ID }],
    [`https://www.youtube.com/live/${ID}?feature=share`, { videoId: ID }],
    [`https://www.youtube.com/embed/${ID}?start=30`, { videoId: ID, start: 30 }],
    [`https://www.youtube-nocookie.com/embed/${ID}`, { videoId: ID }],
    [`  https://youtu.be/${ID}  `, { videoId: ID }],
    [`http://www.youtube.com/watch?v=${ID}`, { videoId: ID }],
  ];
  for (const [link, want] of cases) {
    it(link.trim(), () => expect(parseYouTube(link)).toEqual(want));
  }
});

describe("parseYouTube — link không có video", () => {
  const bad = [
    "https://www.youtube.com/@SeanStudy",
    "https://www.youtube.com/playlist?list=PL123",
    "https://www.youtube.com/results?search_query=study+with+me",
    "https://www.youtube.com/watch?v=ngan",
    "https://www.youtube.com/watch?v=HFM-EHduRrQ<script>",
    "https://notyoutube.com/watch?v=HFM-EHduRrQ",
    "https://example.com/video.mp4",
    "không phải link",
  ];
  for (const link of bad) {
    it(link, () => expect(parseYouTube(link)).toBeNull());
  }
});

describe("parseStartTime", () => {
  it("đọc các kiểu ghi giờ", () => {
    expect(parseStartTime("90")).toBe(90);
    expect(parseStartTime("90s")).toBe(90);
    expect(parseStartTime("2m")).toBe(120);
    expect(parseStartTime("1h2m3s")).toBe(3723);
  });
  it("không đọc được / bằng 0 -> undefined", () => {
    expect(parseStartTime(null)).toBeUndefined();
    expect(parseStartTime("abc")).toBeUndefined();
    expect(parseStartTime("0")).toBeUndefined();
  });
});

describe("describeYouTubeError", () => {
  it("101/150 nêu cả hai khả năng YouTube gộp chung: tắt nhúng hoặc video không còn", () => {
    for (const code of [101, 150]) {
      expect(describeYouTubeError(code)).toContain("tắt nhúng");
      expect(describeYouTubeError(code)).toContain("không còn");
    }
  });
  it("mã lạ vẫn có câu", () => {
    expect(describeYouTubeError(999)).toContain("999");
  });
});
