/**
 * Worker nhỏ đứng trước kho file tĩnh, CHỈ cho đường dẫn /backgrounds/*
 * (xem "run_worker_first" trong wrangler.jsonc). Mọi đường dẫn khác vẫn do
 * Cloudflare phục vụ thẳng như trước.
 *
 * Việc duy nhất: trả video nền theo từng đoạn (mã 206) khi trình duyệt xin
 * "Range". Thiếu cái này, iPhone không phát video nền.
 */
import { parseRange } from "./range.js";

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const rangeHeader = request.headers.get("Range");
    if (!rangeHeader || res.status !== 200 || !res.body) {
      return withHeader(res, "Accept-Ranges", "bytes");
    }

    // File nền nhỏ (<= 3 MB) nên đọc hết vào bộ nhớ rồi cắt là đủ đơn giản.
    const buf = await res.arrayBuffer();
    const range = parseRange(rangeHeader, buf.byteLength);
    const headers = new Headers(res.headers);
    headers.set("Accept-Ranges", "bytes");

    if (range === "unsatisfiable") {
      headers.set("Content-Range", `bytes */${buf.byteLength}`);
      headers.delete("Content-Length");
      return new Response(null, { status: 416, headers });
    }
    if (range === null) {
      return new Response(buf, { status: 200, headers });
    }

    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${buf.byteLength}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    const body = request.method === "HEAD" ? null : buf.slice(range.start, range.end + 1);
    return new Response(body, { status: 206, headers });
  },
};

/** Bản sao của response với thêm một header (header gốc là chỉ-đọc). */
function withHeader(res, name, value) {
  const headers = new Headers(res.headers);
  headers.set(name, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
