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
    <Card className="mb-4">
      <div className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
        Thí nghiệm hôm nay
      </div>

      <div className="space-y-3">
        {active.map((exp) => {
          const current = tags.find((t) => t.key === experimentTagKey(today, exp.id));
          return (
            <div key={exp.id}>
              <div className="mb-1.5 text-sm font-semibold text-ink">{exp.name}</div>
              <div className="flex gap-2">
                {(["A", "B"] as const).map((cond) => {
                  const selected = current?.condition === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(exp, cond)}
                      className={
                        "tap-target flex-1 rounded-lg px-3 text-sm font-semibold " +
                        (selected
                          ? "bg-accent text-on-accent"
                          : "bg-surface-2 text-ink-2 active:bg-line")
                      }
                    >
                      {cond === "A" ? exp.labelA : exp.labelB}
                    </button>
                  );
                })}
              </div>
              {current && (
                <p className="mt-1 text-center text-xs text-ink-3">
                  Bấm lại để bỏ nhãn hôm nay
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
