import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useSettings, useLogs, useProfile } from "@/lib/store";
import { ChevronLeft, HeartPulse, Check, Plus, Zap, Brain } from "lucide-react";
import { useState } from "react";
import { aiAnalyzeExercise, GeminiError } from "@/lib/gemini";
import { todayKey } from "@/lib/fitness";

export const Route = createFileRoute("/account/health")({
  head: () => ({
    meta: [
      { title: "เชื่อมต่อแอปสุขภาพ — Kalguroo" },
      { name: "description", content: "เชื่อมต่อกับ Health Connect, Strava, Nike Run Club และอื่นๆ" },
    ],
  }),
  component: HealthPage,
});

const DIRECT = [
  { id: "apple-health", name: "Apple Health", desc: "iPhone & Apple Watch" },
  { id: "health-connect", name: "Google Health Connect", desc: "Android Health Platform" },
];
const PARTNERS = [
  { id: "strava", name: "Strava" },
  { id: "nike", name: "Nike Run Club" },
  { id: "samsung", name: "Samsung Health" },
  { id: "mi", name: "Mi Fitness" },
  { id: "garmin", name: "Garmin" },
];

function HealthPage() {
  const { settings, setSettings } = useSettings();
  const { addExerciseOn } = useLogs();
  const { profile } = useProfile();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  function toggle(id: string) {
    setSettings({
      ...settings,
      connectedHealth: { ...settings.connectedHealth, [id]: !settings.connectedHealth[id] },
    });
  }

  function toggleAuto() {
    setSettings({ ...settings, autoLog: !settings.autoLog });
  }

  function setLogMode(mode: "direct" | "ai") {
    setSettings({ ...settings, healthLogMode: mode });
  }

  const anyConnected = Object.values(settings.connectedHealth).some(Boolean);

  // Simulate syncing a workout from a connected app
  async function simulateSync() {
    if (!anyConnected) return;
    setSyncing(true);
    setSyncMsg(null);
    const sampleActivities = [
      "วิ่ง 30 นาที", "ปั่นจักรยาน 45 นาที", "เดิน 20 นาที", "HIIT 25 นาที"
    ];
    const activity = sampleActivities[Math.floor(Math.random() * sampleActivities.length)];
    try {
      if (settings.healthLogMode === "ai") {
        const result = await aiAnalyzeExercise(activity, profile?.weight);
        addExerciseOn(todayKey(), {
          id: crypto.randomUUID(),
          name: result.activityName,
          duration: result.durationMinutes ?? 30,
          calories: result.caloriesBurned,
          time: new Date().toISOString(),
        });
        setSyncMsg(`🤖 AI บันทึก: ${result.activityName} — เผาผลาญ ${result.caloriesBurned} kcal (หักจากแคลอรีวันนี้แล้ว)`);
      } else {
        const { analyzeExercise } = await import("@/lib/fitness");
        const result = analyzeExercise(activity);
        addExerciseOn(todayKey(), {
          id: crypto.randomUUID(),
          name: result.name,
          duration: result.duration,
          calories: result.calories,
          time: new Date().toISOString(),
        });
        setSyncMsg(`⚡ บันทึกอัตโนมัติ: ${result.name} — เผาผลาญ ${result.calories} kcal (หักจากแคลอรีวันนี้แล้ว)`);
      }
    } catch (err) {
      const msg = err instanceof GeminiError ? err.message : "ซิงค์ไม่สำเร็จ";
      setSyncMsg(`❌ ${msg}`);
    }
    setSyncing(false);
  }

  return (
    <AppShell title="แอปสุขภาพ">
      <div className="space-y-5">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> กลับไปที่บัญชี
        </Link>

        {/* Auto-log toggle */}
        <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: "color-mix(in oklab, var(--coral) 18%, transparent)" }}>
            <HeartPulse className="h-6 w-6" style={{ color: "var(--coral)" }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">บันทึกกิจกรรมลงไดอารี่โดยอัตโนมัติ</p>
            <p className="text-xs text-muted-foreground">ซิงค์การออกกำลังกายจากแอปที่เชื่อมต่อ</p>
          </div>
          <button
            onClick={toggleAuto}
            className={`relative h-6 w-11 rounded-full transition ${settings.autoLog ? "bg-primary" : "bg-muted"}`}
            aria-label="สลับการบันทึกอัตโนมัติ"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.autoLog ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        {/* Log mode selector */}
        {settings.autoLog && (
          <div className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
            <p className="text-sm font-semibold">วิธีบันทึกกิจกรรมสุขภาพ</p>
            <p className="text-xs text-muted-foreground">แคลอรีที่เผาผลาญจะถูกหักออกจากพูลแคลอรีสุทธิรายวัน</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLogMode("direct")}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                  settings.healthLogMode !== "ai"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 hover:bg-accent"
                }`}
              >
                <Zap className="h-5 w-5" />
                <p className="text-xs font-semibold">เพิ่มกิจกรรมเองอัตโนมัติ</p>
                <p className="text-[10px] text-muted-foreground">บันทึกตรงสู่ไดอารี่</p>
              </button>
              <button
                onClick={() => setLogMode("ai")}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                  settings.healthLogMode === "ai"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 hover:bg-accent"
                }`}
              >
                <Brain className="h-5 w-5" />
                <p className="text-xs font-semibold">ให้ AI ตรวจสอบและบันทึก</p>
                <p className="text-[10px] text-muted-foreground">AI คำนวณแคลอรีแม่นยำ</p>
              </button>
            </div>

            {anyConnected && (
              <button
                onClick={simulateSync}
                disabled={syncing}
                className="w-full rounded-2xl bg-primary/10 text-primary py-2.5 text-sm font-semibold hover:bg-primary/20 transition disabled:opacity-50"
              >
                {syncing ? "กำลังซิงค์..." : "🔄 จำลองการซิงค์กิจกรรม"}
              </button>
            )}

            {syncMsg && (
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                <p className="text-xs text-green-700 dark:text-green-400">{syncMsg}</p>
              </div>
            )}
          </div>
        )}

        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">เชื่อมต่อโดยตรง</p>
          <ul className="space-y-2">
            {DIRECT.map((p) => (
              <ProviderRow key={p.id} id={p.id} name={p.name} desc={p.desc} connected={!!settings.connectedHealth[p.id]} onClick={() => toggle(p.id)} />
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">แอปพาร์ตเนอร์</p>
          <ul className="space-y-2">
            {PARTNERS.map((p) => (
              <ProviderRow key={p.id} id={p.id} name={p.name} connected={!!settings.connectedHealth[p.id]} onClick={() => toggle(p.id)} />
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function ProviderRow({ id, name, desc, connected, onClick }: {
  id: string; name: string; desc?: string; connected: boolean; onClick: () => void;
}) {
  const letter = name[0];
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left hover:bg-accent transition"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-base font-bold text-foreground">{letter}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{name}</p>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
        {connected ? (
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Check className="h-3.5 w-3.5" />เชื่อมต่อแล้ว
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />เชื่อมต่อ
          </span>
        )}
      </button>
    </li>
  );
}
