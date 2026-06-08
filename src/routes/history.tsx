import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useLogs, useProfile } from "@/lib/store";
import { calcAllowance, formatThaiDate, isDayActive } from "@/lib/fitness";
import { Flame, Scale, Utensils, Activity, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ประวัติ — Kalguroo" },
      { name: "description", content: "ไทม์ไลน์การกิน น้ำหนัก และกิจกรรมย้อนหลัง" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { logs } = useLogs();
  const { profile } = useProfile();
  const allowance = profile ? (profile.aiAllowance ?? calcAllowance(profile)) : 2000;

  const days = useMemo(() => {
    return Object.values(logs)
      .filter((d) => isDayActive(d) || typeof d.weight === "number")
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs]);

  const totalLogged = days.length;
  const streak = useMemo(() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (isDayActive(logs[k])) s++;
      else break;
    }
    return s;
  }, [logs]);

  return (
    <AppShell title="ประวัติ">
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <SummaryCard icon={<Flame className="h-5 w-5" />} color="var(--coral)" label="สตรีคต่อเนื่อง" value={`${streak} วัน`} />
          <SummaryCard icon={<Utensils className="h-5 w-5" />} color="var(--primary)" label="วันที่บันทึก" value={`${totalLogged} วัน`} />
        </section>

        <Link
          to="/progress"
          className="flex items-center justify-between rounded-3xl border border-border/60 bg-card p-4 hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: "color-mix(in oklab, var(--water) 18%, transparent)" }}>
              <Scale className="h-5 w-5" style={{ color: "var(--water)" }} />
            </span>
            <div>
              <p className="text-sm font-semibold">แนวโน้มน้ำหนัก</p>
              <p className="text-xs text-muted-foreground">ดูกราฟและบันทึกน้ำหนักย้อนหลัง</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">ไทม์ไลน์</h3>
          {days.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติ เริ่มบันทึกอาหารหรือกิจกรรมเพื่อสร้างไทม์ไลน์ของคุณ
            </p>
          ) : (
            <ul className="space-y-3">
              {days.map((d) => {
                const cal = d.foods.reduce((s, f) => s + f.calories, 0);
                const burned = d.exercises.reduce((s, e) => s + e.calories, 0);
                const net = cal - burned;
                const overLimit = net > allowance;
                return (
                  <li key={d.date} className="rounded-3xl border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{formatThaiDate(new Date(d.date))}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.foods.length} รายการอาหาร · {d.exercises.length} กิจกรรม
                          {d.waterMl ? ` · น้ำ ${d.waterMl} มล.` : ""}
                        </p>
                      </div>
                      {typeof d.weight === "number" && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                          {d.weight.toFixed(1)} กก.
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Mini icon={<Utensils className="h-3.5 w-3.5" />} color="var(--primary)" label="ได้รับ" value={cal} />
                      <Mini icon={<Activity className="h-3.5 w-3.5" />} color="var(--warning)" label="เผาผลาญ" value={burned} />
                      <Mini icon={<Flame className="h-3.5 w-3.5" />} color={overLimit ? "var(--destructive)" : "var(--coral)"} label="สุทธิ" value={net} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        {icon}
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Mini({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        {icon}
      </span>
      <p className="mt-1.5 text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
