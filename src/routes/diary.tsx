import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { WaterTracker } from "@/components/WaterTracker";
import { QuickPickFood } from "@/components/QuickPickFood";
import { useLogs, useExerciseDb } from "@/lib/store";
import {
  MEALS,
  MEAL_LABEL_TH,
  THAI_SHORT_DAYS,
  formatThaiDate,
  todayKey,
  isDayActive,
  type Meal,
  type FoodEntry,
} from "@/lib/fitness";
import { Plus, Trash2, Wheat, Beef, Egg, Flame, Activity, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/diary")({
  head: () => ({
    meta: [
      { title: "ไดอารี่ — Kalguroo" },
      { name: "description", content: "บันทึกอาหารและน้ำของคุณในแต่ละวัน" },
    ],
  }),
  component: DiaryPage,
});

function DiaryPage() {
  const { logs, removeFood, removeExercise, addExerciseOn } = useLogs();
  const { items: exDb, upsertFromEntry: upsertEx } = useExerciseDb();
  const todayStr = todayKey();
  const [selected, setSelected] = useState(todayStr);
  const [pickMeal, setPickMeal] = useState<Meal | null>(null);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 13; i >= -7; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-date="${selected}"]`) as HTMLElement | null;
    el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [selected]);

  const day = logs[selected];
  const foodsByMeal = (m: Meal) => day?.foods.filter((f) => f.meal === m) ?? [];

  function relog(name: string, duration: number, calories: number) {
    addExerciseOn(selected, { id: crypto.randomUUID(), name, duration, calories, time: new Date().toISOString() });
    upsertEx({ name, duration, calories });
  }

  return (
    <AppShell title="ไดอารี่">
      <div className="space-y-5">
        {/* Calendar with streak fire */}
        <div className="rounded-3xl border border-border/60 bg-card p-3">
          <p className="px-2 pb-2 text-center text-sm font-semibold">{formatThaiDate(new Date(selected))}</p>
          <div ref={scroller} className="no-scrollbar flex gap-2 overflow-x-auto px-1">
            {days.map((d) => {
              const k = d.toISOString().slice(0, 10);
              const isSel = k === selected;
              const isToday = k === todayStr;
              const active = isDayActive(logs[k]);
              return (
                <button
                  key={k}
                  data-date={k}
                  onClick={() => setSelected(k)}
                  className={`relative flex min-w-[48px] flex-col items-center rounded-2xl px-2 py-2 transition ${
                    isSel ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                  }`}
                >
                  <span className="text-[10px] opacity-80">{THAI_SHORT_DAYS[d.getDay()]}</span>
                  <span className="text-base font-semibold tabular-nums">{d.getDate()}</span>
                  {active ? (
                    <Flame
                      className={`mt-0.5 h-3.5 w-3.5 animate-flame ${isSel ? "text-white" : "text-[color:var(--coral)]"}`}
                      fill="currentColor"
                    />
                  ) : (
                    <span className={`mt-0.5 h-1 w-1 rounded-full ${isToday && !isSel ? "bg-primary" : "bg-transparent"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meals */}
        {MEALS.map((m) => {
          const items = foodsByMeal(m);
          const total = items.reduce((s, f) => s + f.calories, 0);
          return (
            <section key={m} className="rounded-3xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {MEAL_LABEL_TH[m]} <span className="text-xs font-normal text-muted-foreground">(แคลอรี)</span>
                </h3>
                <span className="text-sm font-semibold tabular-nums text-primary">{total.toLocaleString()}</span>
              </div>
              {items.length === 0 ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">ยังไม่มีรายการ</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((f) => (
                    <FoodRow key={f.id} f={f} onDelete={() => removeFood(selected, f.id)} />
                  ))}
                </ul>
              )}
              <button
                onClick={() => setPickMeal(m)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-primary hover:bg-accent"
              >
                <Plus className="h-4 w-4" /> บันทึกอาหาร
              </button>
            </section>
          );
        })}

        {/* Water */}
        <WaterTracker dateKey={selected} />

        {/* Exercise — always shown as 5th section */}
        <section className="rounded-3xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">การออกกำลังกาย</h3>
            {day?.exercises && day.exercises.length > 0 && (
              <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--warning)" }}>
                -{day.exercises.reduce((s, e) => s + e.calories, 0).toLocaleString()} แคลอรี
              </span>
            )}
          </div>
          {day?.exercises && day.exercises.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {day.exercises.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-card">
                      <Activity className="h-4 w-4" style={{ color: "var(--warning)" }} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.duration} นาที</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--warning)" }}>
                      -{e.calories}
                    </span>
                    <button
                      onClick={() => removeExercise(selected, e.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">ยังไม่มีกิจกรรมในวันนี้</p>
          )}

          {exDb.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                บันทึกซ้ำกิจกรรมล่าสุด
              </p>
              <div className="flex flex-wrap gap-2">
                {exDb.slice(0, 6).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => relog(e.name, e.duration, e.calories)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    {e.name} · -{e.calories}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => document.dispatchEvent(new CustomEvent("kalguroo:openFab", { detail: { view: "exercise" } }))}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-primary hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> บันทึกกิจกรรม
          </button>
        </section>
      </div>

      <QuickPickFood open={pickMeal !== null} meal={pickMeal ?? "snack"} onClose={() => setPickMeal(null)} />
    </AppShell>
  );
}

function FoodRow({ f, onDelete }: { f: FoodEntry; onDelete: () => void }) {
  return (
    <li className="rounded-2xl bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card text-2xl shadow-sm">{f.image ?? "🍽️"}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{f.name}</p>
          <p className="text-xs text-muted-foreground">{f.servings} หน่วย / {f.calories} แคลอรี</p>
        </div>
        <button onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {(f.carbs + f.protein + f.fat) > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <MacroBadge icon={<Wheat className="h-3.5 w-3.5" />} color="var(--carb)" label="คาร์บ" value={`${f.carbs} ก.`} />
          <MacroBadge icon={<Beef className="h-3.5 w-3.5" />} color="var(--protein)" label="โปรตีน" value={`${f.protein} ก.`} />
          <MacroBadge icon={<Egg className="h-3.5 w-3.5" />} color="var(--fat)" label="ไขมัน" value={`${f.fat} ก.`} />
        </div>
      )}
    </li>
  );
}

function MacroBadge({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-card px-2 py-1.5">
      <span className="grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] leading-none text-muted-foreground">{label}</p>
        <p className="text-[11px] font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}
