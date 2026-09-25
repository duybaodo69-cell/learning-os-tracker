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
      <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Thí nghiệm hôm nay
      </div>

      <div className="space-y-3">
        {active.map((exp) => {
          const current = tags.find((t) => t.key === experimentTagKey(today, exp.id));
          return (
            <div key={exp.id}>
              <div className="mb-1.5 text-sm font-semibold text-slate-700">{exp.name}</div>
              <div className="flex gap-2">
                {(["A", "B"] as const).map((cond) => {
                  const selected = current?.condition === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(exp, cond)}
                      className={
                        "tap-target flex-1 rounded-xl px-3 text-sm font-semibold " +
                        (selected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 active:bg-slate-200")
                      }
                    >
                      {cond === "A" ? exp.labelA : exp.labelB}
                    </button>
                  );
                })}
              </div>
              {current && (
                <p className="mt-1 text-center text-xs text-slate-400">
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
