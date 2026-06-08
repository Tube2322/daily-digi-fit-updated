import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLogs, useProfile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayKey } from "@/lib/fitness";
import { Target, TrendingDown, TrendingUp, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "เป้าหมายน้ำหนัก — Kalguroo" },
      { name: "description", content: "ติดตามความคืบหน้าน้ำหนักของคุณ" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { profile, setProfile } = useProfile();
  const { logs, setWeightOn } = useLogs();
  const [weight, setWeight] = useState("");

  const points = useMemo(() => {
    const pts = Object.values(logs)
      .filter((d) => typeof d.weight === "number")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, weight: d.weight! }));
    if (profile && !pts.find((p) => p.date === profile.createdAt.slice(0, 10))) {
      pts.unshift({ date: profile.createdAt.slice(0, 10), weight: profile.weight });
    }
    return pts;
  }, [logs, profile]);

  if (!profile) return null;

  const current = points.at(-1)?.weight ?? profile.weight;
  const totalDelta = profile.targetWeight - profile.weight;
  const doneDelta = current - profile.weight;
  const progressPct = totalDelta === 0 ? 100 : Math.min(100, Math.max(0, (doneDelta / totalDelta) * 100));
  const losing = profile.targetWeight < profile.weight;

  function logWeight() {
    const w = parseFloat(weight);
    if (!w || !profile) return;
    setWeightOn(todayKey(), w);
    setProfile({ ...profile, weight: w });
    setWeight("");
  }

  return (
    <AppShell title="เป้าหมายน้ำหนัก">
      <div className="space-y-5">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> กลับไปที่บัญชี
        </Link>

        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-md">
          <div className="flex items-center gap-2 text-xs opacity-90">
            <Target className="h-4 w-4" /> เป้าหมาย
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-5xl font-bold tabular-nums">{current.toFixed(1)}</p>
              <p className="text-sm opacity-80">น้ำหนักปัจจุบัน (กก.)</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums">{profile.targetWeight} กก.</p>
              <p className="text-xs opacity-80">เป้าหมาย · {profile.timeframeMonths} เดือน</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${Math.abs(progressPct)}%` }} />
          </div>
          <p className="mt-2 flex items-center gap-1 text-sm opacity-90">
            {losing ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {losing ? "ลดได้" : "เพิ่มได้"} {Math.abs(doneDelta).toFixed(1)} กก. · เหลืออีก {Math.max(0, Math.abs(totalDelta - doneDelta)).toFixed(1)} กก.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-4">
          <p className="text-sm font-semibold">บันทึกน้ำหนักวันนี้</p>
          <div className="mt-3 flex gap-2">
            <Input type="number" step="0.1" placeholder={`${current.toFixed(1)} กก.`} value={weight} onChange={(e) => setWeight(e.target.value)} />
            <Button onClick={logWeight}>บันทึก</Button>
          </div>
        </div>

        <Chart points={points} target={profile.targetWeight} />

        {points.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">รายการบันทึก</h3>
            <ul className="space-y-2">
              {[...points].reverse().map((p) => (
                <li key={p.date} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3">
                  <span className="text-sm">{new Date(p.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="font-semibold tabular-nums">{p.weight.toFixed(1)} กก.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Chart({ points, target }: { points: { date: string; weight: number }[]; target: number }) {
  if (points.length < 2) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        บันทึกน้ำหนักเพิ่มเติมเพื่อดูแนวโน้ม
      </div>
    );
  }
  const w = 320, h = 140, pad = 20;
  const weights = points.map((p) => p.weight).concat(target);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.weight)}`).join(" ");
  const targetY = y(target);
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <p className="mb-2 text-sm font-semibold">แนวโน้มน้ำหนัก</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <line x1={pad} x2={w - pad} y1={targetY} y2={targetY} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} />
        <text x={w - pad} y={targetY - 4} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">เป้าหมาย {target}กก.</text>
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.weight)} r={3.5} fill="var(--primary)" />
        ))}
      </svg>
    </div>
  );
}
