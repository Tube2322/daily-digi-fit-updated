import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useLogs, useProfile } from "@/lib/store";
import { calcAllowance, THAI_SHORT_DAYS, todayKey } from "@/lib/fitness";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "ข้อมูลเชิงลึก — Kalguroo" },
      { name: "description", content: "วิเคราะห์แคลอรีและสารอาหารรายสัปดาห์" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { logs } = useLogs();
  const { profile } = useProfile();
  const allowance = profile ? calcAllowance(profile) : 2000;

  const week = useMemo(() => {
    const arr: { key: string; date: Date; carbs: number; protein: number; fat: number; cal: number; burned: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const day = logs[k];
      const carbs = day?.foods.reduce((s, f) => s + f.carbs * 4, 0) ?? 0;
      const protein = day?.foods.reduce((s, f) => s + f.protein * 4, 0) ?? 0;
      const fat = day?.foods.reduce((s, f) => s + f.fat * 9, 0) ?? 0;
      const cal = day?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
      const burned = day?.exercises.reduce((s, e) => s + e.calories, 0) ?? 0;
      arr.push({ key: k, date: d, carbs, protein, fat, cal, burned });
    }
    return arr;
  }, [logs]);

  const avgIn = Math.round(week.reduce((s, d) => s + d.cal, 0) / 7);
  const avgOut = Math.round(week.reduce((s, d) => s + d.burned, 0) / 7);
  const maxIn = Math.max(allowance, ...week.map((d) => d.cal), 1);
  const maxOut = Math.max(500, ...week.map((d) => d.burned));

  return (
    <AppShell title="ข้อมูลเชิงลึก">
      <div className="space-y-5">
        <ChartCard
          title="แคลอรีที่ได้รับ"
          avgLabel={`${avgIn.toLocaleString()} แคลอรีเฉลี่ยต่อวัน`}
          legend={[
            { color: "var(--carb)", label: "คาร์บ" },
            { color: "var(--protein)", label: "โปรตีน" },
            { color: "var(--fat)", label: "ไขมัน" },
          ]}
        >
          <StackedBars data={week} max={maxIn} />
        </ChartCard>

        <ChartCard
          title="แคลอรีที่เผาผลาญ"
          avgLabel={`${avgOut.toLocaleString()} แคลอรีเฉลี่ยต่อวัน`}
          legend={[{ color: "var(--coral)", label: "เผาผลาญ" }]}
        >
          <SimpleBars data={week} max={maxOut} color="var(--coral)" />
        </ChartCard>

        <section className="rounded-3xl border border-border/60 bg-card p-4">
          <h3 className="font-semibold">สถิติสัปดาห์นี้</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="วันที่บรรลุเป้า" value={`${week.filter((d) => d.cal > 0 && d.cal <= allowance).length} วัน`} />
            <Stat label="วันที่บันทึก" value={`${week.filter((d) => d.cal > 0).length} วัน`} />
            <Stat label="กิจกรรมรวม" value={`${week.reduce((s, d) => s + d.burned, 0).toLocaleString()} แคลอรี`} />
            <Stat label="เฉลี่ยสุทธิ" value={`${(avgIn - avgOut).toLocaleString()} แคลอรี`} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ChartCard({ title, avgLabel, legend, children }: { title: string; avgLabel: string; legend: { color: string; label: string }[]; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{avgLabel}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StackedBars({ data, max }: { data: { date: Date; carbs: number; protein: number; fat: number; cal: number; key: string }[]; max: number }) {
  const todayK = todayKey();
  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d) => {
        const total = d.cal || 1;
        const carbPx = (d.carbs / max) * 160;
        const protPx = (d.protein / max) * 160;
        const fatPx = (d.fat / max) * 160;
        return (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-40 w-full items-end justify-center">
              <div className="flex w-6 flex-col-reverse overflow-hidden rounded-md">
                {d.cal > 0 ? (
                  <>
                    <div style={{ height: carbPx, backgroundColor: "var(--carb)" }} />
                    <div style={{ height: protPx, backgroundColor: "var(--protein)" }} />
                    <div style={{ height: fatPx, backgroundColor: "var(--fat)" }} />
                  </>
                ) : (
                  <div className="h-1 w-full bg-muted" />
                )}
              </div>
            </div>
            <span className={`text-[10px] ${d.key === todayK ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {THAI_SHORT_DAYS[d.date.getDay()]}
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{Math.round(total)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleBars({ data, max, color }: { data: { date: Date; burned: number; key: string }[]; max: number; color: string }) {
  const todayK = todayKey();
  return (
    <div className="flex h-44 items-end justify-between gap-2">
      {data.map((d) => {
        const h = (d.burned / max) * 160;
        return (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-40 w-full items-end justify-center">
              <div
                className="w-6 rounded-md"
                style={{ height: Math.max(2, h), backgroundColor: d.burned > 0 ? color : "var(--muted)" }}
              />
            </div>
            <span className={`text-[10px] ${d.key === todayK ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {THAI_SHORT_DAYS[d.date.getDay()]}
            </span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{d.burned}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
