/**
 * Ghi checklist Glow-up (PRODUCT.md mục 10) vào database.
 * Tách khỏi component để test được và để màn hình nào cũng dùng chung.
 */
import { db } from "../db/db";
import { glowDayId } from "../db/keys";
import type { GlowDay } from "../db/types";

/**
 * Sửa checklist của một ngày: đọc bản ghi MỚI NHẤT rồi ghi, trong một
 * transaction — hai cú chạm "+" liên tiếp không bao giờ đè mất nhau.
 * Chưa có bản ghi của ngày đó thì tạo mới (khoá "#ngày").
 */
export async function patchGlowDay(date: string, change: (current: GlowDay) => Partial<GlowDay>): Promise<void> {
  await db.transaction("rw", db.glowDays, async () => {
    const id = glowDayId(date);
    const current = (await db.glowDays.get(id)) ?? { id, date };
    await db.glowDays.put({ ...current, ...change(current) });
  });
}
