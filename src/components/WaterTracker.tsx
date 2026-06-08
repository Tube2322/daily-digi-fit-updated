import { GlassWater, Plus } from "lucide-react";
import { useLogs } from "@/lib/store";
import { todayKey } from "@/lib/fitness";

const GLASS_ML = 250;
const TOTAL = 8;

export function WaterTracker({ dateKey: dk }: { dateKey?: string }) {
  const key = dk ?? todayKey();
  const { logs, setWaterOn } = useLogs();
  const ml = logs[key]?.waterMl ?? 0;
  const filled = Math.min(TOTAL, Math.round(ml / GLASS_ML));

  function setGlass(i: number) {
    // toggle to i+1 glasses, or back down if clicking current
    const target = i + 1 === filled ? i : i + 1;
    setWaterOn(key, target * GLASS_ML);
  }
  function quickAdd() {
    setWaterOn(key, Math.min(TOTAL, filled + 1) * GLASS_ML);
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">น้ำ (มล.)</h3>
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--water)" }}>
          {ml.toLocaleString()} / {(TOTAL * GLASS_ML).toLocaleString()}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-1">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const active = i < filled;
          return (
            <button
              key={i}
              onClick={() => setGlass(i)}
              aria-label={`แก้วที่ ${i + 1}`}
              className="grid h-10 w-8 place-items-center rounded-md transition active:scale-90"
              style={{
                backgroundColor: active ? "color-mix(in oklab, var(--water) 22%, transparent)" : "var(--muted)",
              }}
            >
              <GlassWater className="h-6 w-6" style={{ color: active ? "var(--water)" : "var(--muted-foreground)" }} fill={active ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
      <button
        onClick={quickAdd}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
      >
        <Plus className="h-4 w-4" /> บันทึกการดื่มน้ำ
      </button>
    </section>
  );
}
