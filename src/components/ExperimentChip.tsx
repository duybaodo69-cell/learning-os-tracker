/**
 * Chip gắn nhãn thí nghiệm cho ngày hôm nay — hiện ở màn hình Hôm nay.
 *
 * Một chạm là xong. Bấm lại vào nhãn đang chọn thì bỏ nhãn.
 * Chỉ hiện những thí nghiệm đang bật (active).
 */
import { db } from "../db/db";
import type { Experiment, ExperimentTag } from "../db/types";
import { experimentTagKey } from "../lib/metrics";
import { Card } from "./ui";

export default function ExperimentChip({
  experiments,
  tags,
  today,
}: {
  experiments: Experiment[];
  tags: ExperimentTag[];
  today: string;
}) {
  const active = experiments.filter((e) => e.active);
  if (active.length === 0) return null;

  async function setCondition(exp: Experiment, condition: "A" | "B") {
    const key = experimentTagKey(today, exp.id);
    const current = tags.find((t) => t.key === key);

    if (current?.condition === condition) {
      // Bấm lại nhãn đang chọn = bỏ nhãn cho hôm nay.
      await db.experimentTags.delete(key);
    } else {
      await db.experimentTags.put({ key, date: today, experimentId: exp.id, condition });
    }
  }

  return (
    <Card className="mb-3 py-3">
      <h2 className="mb-2 text-sm font-medium text-ink-2">Thí nghiệm hôm nay</h2>

      <div className="space-y-3">
        {active.map((exp) => {
          const current = tags.find((t) => t.key === experimentTagKey(today, exp.id));
          return (
            <div key={exp.id}>
              {/* Tên thí nghiệm bên trái, hai lựa chọn gọn bên phải (xuống
                  dòng khi tên dài). */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 text-sm font-semibold text-ink">{exp.name}</span>
                <div className="flex gap-1 rounded-xl bg-track p-1">
                  {(["A", "B"] as const).map((cond) => {
                    const selected = current?.condition === cond;
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setCondition(exp, cond)}
                        aria-pressed={selected}
                        className={
                          "tap-target rounded-lg px-3 text-sm font-semibold " +
                          (selected ? "bg-accent text-on-accent" : "text-ink-2 active:bg-thumb")
                        }
                      >
                        {cond === "A" ? exp.labelA : exp.labelB}
                      </button>
                    );
                  })}
                </div>
              </div>
              {current && (
                <p className="mt-1 text-right text-xs text-ink-3">Bấm lại để bỏ nhãn hôm nay</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
