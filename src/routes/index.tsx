import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { CalorieRing } from "@/components/CalorieRing";
import { useLogs, useProfile } from "@/lib/store";
import { calcAllowance, calcMacroGoals } from "@/lib/fitness";
import { Flame, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kalguroo — นับแคลอรีอัจฉริยะ" },
      { name: "description", content: "แอปนับแคลอรีและติดตามสุขภาพอัจฉริยะที่อยู่ในกระเป๋าของคุณ" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, loaded } = useProfile();
  const { today } = useLogs();
  const navigate = useNavigate();

  useEffect(() => {
    if (loaded && !profile) navigate({ to: "/onboarding" });
  }, [loaded, profile, navigate]);

  if (!profile) return null;
  const allowance = profile.manualAllowance ?? profile.aiAllowance ?? calcAllowance(profile);
  const consumed = today.foods.reduce((s, f) => s + f.calories, 0);
  const burned = today.exercises.reduce((s, e) => s + e.calories, 0);
  const carbs = today.foods.reduce((s, f) => s + f.carbs, 0);
  const protein = today.foods.reduce((s, f) => s + f.protein, 0);
  const fat = today.foods.reduce((s, f) => s + f.fat, 0);
  // If manualAllowance is set, redistribute macros to match
  const goals = profile.manualAllowance
    ? calcMacroGoals(profile.manualAllowance)
    : (profile.aiMacros ?? calcMacroGoals(allowance));

  return (
    <AppShell title="แดชบอร์ด">
      <div className="space-y-6">
        <div className="flex flex-col items-center animate-fade-in-up">
          <CalorieRing consumed={consumed} burned={burned} allowance={allowance} />
        </div>

        <div
          className="flex items-center justify-between rounded-3xl px-5 py-4 text-white shadow-md animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, var(--coral), color-mix(in oklab, var(--coral) 70%, oklch(0.62 0.22 30)))",
            animationDelay: "80ms",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs opacity-90">พลังงานที่เผาผลาญวันนี้</p>
              <p className="text-xl font-bold tabular-nums">{burned.toLocaleString()} แคลอรี</p>
            </div>
          </div>
          <Activity className="h-6 w-6 opacity-80" />
        </div>

        <section className="grid grid-cols-3 gap-3">
          <MacroCard delay={140} color="var(--carb)" label="คาร์บ" value={carbs} goal={goals.carbs} />
          <MacroCard delay={200} color="var(--protein)" label="โปรตีน" value={protein} goal={goals.protein} />
          <MacroCard delay={260} color="var(--fat)" label="ไขมัน" value={fat} goal={goals.fat} />
        </section>

        <section
          className="rounded-3xl border border-border/60 bg-card p-5 animate-fade-in-up"
          style={{ animationDelay: "320ms" }}
        >
          <h3 className="font-semibold">สรุปวันนี้</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="ได้รับ" value={consumed} accent="text-primary" />
            <Stat label="เผาผลาญ" value={burned} accent="text-[color:var(--warning)]" />
            <Stat label="คงเหลือ" value={Math.max(0, allowance - (consumed - burned))} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MacroCard({ color, label, value, goal, delay }: { color: string; label: string; value: number; goal: number; delay: number }) {
  const pct = Math.min(100, (value / Math.max(1, goal)) * 100);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{value.toFixed(0)} ก.</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">/ {goal} ก.</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accent ?? ""}`}>{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground">แคลอรี</p>
    </div>
  );
}
