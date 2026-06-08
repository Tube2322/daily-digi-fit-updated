import { useState, useEffect } from "react";
import { Camera, ScanBarcode, Database, Zap, Activity, Sparkles, Scale, History, X, Loader2, ChevronLeft, Plus, Minus, AlertCircle, Trash2 } from "lucide-react";
import { useLogs, useProfile, useFoodDb, useExerciseDb } from "@/lib/store";
import { lookupBarcode, MEAL_LABEL_TH, MEALS, todayKey, calcAllowance, type AnalyzedFood, type Meal, type FoodEntry } from "@/lib/fitness";
import { aiAnalyzeFoodText, aiAnalyzeFoodImage, aiAnalyzeExercise, aiWeightAdvice } from "@/lib/gemini";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LogView = "menu" | "scan-food" | "scan-barcode" | "db" | "quick" | "exercise" | "ai" | "weight" | "history";

export function LogSheet({ open, initialView = "menu", onClose }: { open: boolean; initialView?: LogView; onClose: () => void }) {
  const [view, setView] = useState<LogView>(initialView);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  if (!open) return null;

  const items: { id: LogView; label: string; icon: typeof Camera; color: string; onClick?: () => void }[] = [
    { id: "scan-food", label: "สแกนอาหาร", icon: Camera, color: "var(--coral)" },
    { id: "scan-barcode", label: "สแกนบาร์โค้ด", icon: ScanBarcode, color: "var(--primary)" },
    { id: "db", label: "ฐานข้อมูลอาหาร", icon: Database, color: "var(--protein)" },
    { id: "quick", label: "บันทึกด่วน", icon: Zap, color: "var(--fat)" },
    { id: "exercise", label: "กิจกรรม", icon: Activity, color: "var(--carb)" },
    { id: "ai", label: "ค้นหาด้วย AI", icon: Sparkles, color: "var(--primary)" },
    { id: "weight", label: "น้ำหนัก", icon: Scale, color: "var(--water)" },
    { id: "history", label: "ประวัติ", icon: History, color: "var(--muted-foreground)", onClick: () => { onClose(); navigate({ to: "/history" }); } },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-card p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          {view !== "menu" && (
            <button onClick={() => setView("menu")} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h3 className="flex-1 text-center text-base font-semibold">
            {view === "menu" ? "บันทึก" : items.find((i) => i.id === view)?.label ?? ""}
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 max-h-[70vh] overflow-y-auto">
          {view === "menu" && (
            <div className="grid grid-cols-4 gap-3 pb-4">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    onClick={() => (it.onClick ? it.onClick() : setView(it.id))}
                    className="flex flex-col items-center gap-2 rounded-2xl p-2 transition active:scale-95"
                  >
                    <div
                      className="grid h-14 w-14 place-items-center rounded-2xl"
                      style={{ backgroundColor: `color-mix(in oklab, ${it.color} 18%, transparent)` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: it.color }} />
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight">{it.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {view === "scan-food" && <ScanFoodView onDone={onClose} />}
          {view === "scan-barcode" && <ScanBarcodeView onDone={onClose} />}
          {view === "db" && <FoodDbView onDone={onClose} />}
          {view === "quick" && <QuickView onDone={onClose} />}
          {view === "ai" && <AiView onDone={onClose} />}
          {view === "exercise" && <ExerciseView onDone={onClose} />}
          {view === "weight" && <WeightView onDone={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ===== Food log helpers =====
function FoodResultCard({ result, onAdd, onRetry }: { result: AnalyzedFood; onAdd: (meal: Meal, servings: number) => void; onRetry?: () => void }) {
  const [meal, setMeal] = useState<Meal>("lunch");
  const [servings, setServings] = useState(1);
  const cal = Math.round(result.calories * servings);
  const c = +(result.carbs * servings).toFixed(2);
  const p = +(result.protein * servings).toFixed(2);
  const f = +(result.fat * servings).toFixed(2);
  return (
    <div className="space-y-4 pb-4 animate-fade-in-up">
      <div className="rounded-3xl bg-accent p-5 text-center">
        <div className="text-5xl">{result.emoji}</div>
        <p className="mt-2 text-lg font-semibold">{result.name}</p>
        <p className="mt-3 text-4xl font-bold text-primary tabular-nums">
          {cal.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">แคลอรี</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Macro color="var(--carb)" label="คาร์บ" value={`${c} ก.`} />
          <Macro color="var(--protein)" label="โปรตีน" value={`${p} ก.`} />
          <Macro color="var(--fat)" label="ไขมัน" value={`${f} ก.`} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">มื้ออาหาร</p>
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`rounded-xl py-2 text-[11px] font-medium transition ${meal === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {MEAL_LABEL_TH[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium">หน่วยบริโภค</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setServings(Math.max(0.5, +(servings - 0.5).toFixed(1)))} className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums">{servings}</span>
          <button onClick={() => setServings(+(servings + 0.5).toFixed(1))} className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        {onRetry && <Button variant="outline" className="flex-1" onClick={onRetry}>ลองใหม่</Button>}
        <Button className="flex-1" onClick={() => onAdd(meal, servings)}>เพิ่มเข้าไดอารี่</Button>
      </div>
    </div>
  );
}

function Macro({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-2">
      <div className="mx-auto h-1.5 w-6 rounded-full" style={{ backgroundColor: color }} />
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  );
}

function useAddFood(onDone: () => void) {
  const { addFoodOn } = useLogs();
  const { upsertFromEntry } = useFoodDb();
  return (result: AnalyzedFood, meal: Meal, servings: number) => {
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      name: result.name,
      calories: Math.round(result.calories * servings),
      carbs: +(result.carbs * servings).toFixed(2),
      protein: +(result.protein * servings).toFixed(2),
      fat: +(result.fat * servings).toFixed(2),
      servings,
      meal,
      time: new Date().toISOString(),
      image: result.emoji,
    };
    addFoodOn(todayKey(), entry);
    // Save base unit (per 1 serving) to the food database
    upsertFromEntry({
      name: result.name,
      calories: Math.round(result.calories),
      carbs: +result.carbs.toFixed(2),
      protein: +result.protein.toFixed(2),
      fat: +result.fat.toFixed(2),
      emoji: result.emoji,
    });
    onDone();
  };
}

// ===== Scanner views =====
function ScanFoodView({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"start" | "scan" | "result" | "error">("start");
  const [result, setResult] = useState<AnalyzedFood | null>(null);
  const [error, setError] = useState<string>("");
  const add = useAddFood(onDone);

  async function pickFile(file: File) {
    setPhase("scan");
    try {
      const r = await aiAnalyzeFoodImage(file);
      setResult({ name: r.foodName, calories: r.calories, carbs: r.carbs, protein: r.protein, fat: r.fat, emoji: "🍽️" });
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setPhase("error");
    }
  }

  if (phase === "scan") return <Loading text="AI กำลังวิเคราะห์ภาพอาหาร…" />;
  if (phase === "error") return <ErrorView message={error} onRetry={() => setPhase("start")} />;
  if (phase === "result" && result) return <FoodResultCard result={result} onAdd={(m, s) => add(result, m, s)} onRetry={() => setPhase("start")} />;

  return (
    <div className="space-y-4 pb-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-secondary/40 px-4 py-10 text-center transition hover:bg-secondary">
        <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ backgroundColor: "color-mix(in oklab, var(--coral) 18%, transparent)" }}>
          <Camera className="h-7 w-7" style={{ color: "var(--coral)" }} />
        </div>
        <span className="text-sm font-semibold">ถ่ายภาพหรืออัปโหลดรูปอาหาร</span>
        <span className="text-xs text-muted-foreground">Gemini AI จะประเมินแคลอรีและสารอาหารให้คุณ</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickFile(file);
          }}
        />
      </label>
      <p className="text-center text-xs text-muted-foreground">รองรับภาพอาหารไทยและสากล</p>
    </div>
  );
}

function ScanBarcodeView({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"start" | "scan" | "result">("start");
  const [code, setCode] = useState("8851234567890");
  const [result, setResult] = useState<AnalyzedFood | null>(null);
  const add = useAddFood(onDone);

  async function scan() {
    setPhase("scan");
    // Try AI text lookup first (Gemini acting as a Thai database)
    try {
      const r = await aiAnalyzeFoodText(`สินค้าจากบาร์โค้ด ${code} (อาหารหรือเครื่องดื่มในไทย)`);
      setResult({ name: r.foodName, calories: r.calories, carbs: r.carbs, protein: r.protein, fat: r.fat, emoji: "🍽️" });
    } catch {
      setResult(lookupBarcode(code));
    }
    setPhase("result");
  }
  if (phase === "scan") return <Loading text="กำลังอ่านบาร์โค้ดและค้นหาข้อมูล…" />;
  if (phase === "result" && result) return <FoodResultCard result={result} onAdd={(m, s) => add(result, m, s)} onRetry={() => setPhase("start")} />;
  return (
    <div className="space-y-4 pb-4">
      <div className="relative grid h-44 place-items-center overflow-hidden rounded-3xl bg-foreground/95">
        <div className="absolute inset-x-12 top-1/2 h-0.5 -translate-y-1/2 animate-pulse" style={{ backgroundColor: "var(--coral)" }} />
        <ScanBarcode className="h-20 w-20 text-background opacity-30" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">หรือพิมพ์รหัสบาร์โค้ด</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="8851234567890" />
      </div>
      <Button className="w-full" onClick={scan}>
        <ScanBarcode className="mr-2 h-4 w-4" />สแกนเลย
      </Button>
    </div>
  );
}

function FoodDbView({ onDone }: { onDone: () => void }) {
  const { items, addCustom, remove } = useFoodDb();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AnalyzedFood | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const add = useAddFood(onDone);

  if (selected) return <FoodResultCard result={selected} onAdd={(m, s) => add(selected, m, s)} onRetry={() => setSelected(null)} />;

  if (showAdd) return <AddCustomFood onCancel={() => setShowAdd(false)} onSave={(it) => { addCustom(it); setShowAdd(false); }} />;

  const list = items
    .filter((it) => it.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.lastUsed ?? "").localeCompare(a.lastUsed ?? ""));

  return (
    <div className="space-y-3 pb-4">
      <Input placeholder="ค้นหาในฐานข้อมูลของฉัน…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button variant="outline" className="w-full" onClick={() => setShowAdd(true)}>
        <Plus className="mr-2 h-4 w-4" /> สร้างอาหารใหม่ในฐานข้อมูล
      </Button>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 p-6 text-center text-xs text-muted-foreground">
          ฐานข้อมูลของคุณยังว่างเปล่า<br />อาหารที่บันทึกผ่าน AI หรือบันทึกด่วนจะถูกเพิ่มอัตโนมัติ
        </p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {list.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
              <button onClick={() => setSelected({ name: it.name, calories: it.calories, carbs: it.carbs, protein: it.protein, fat: it.fat, emoji: it.emoji ?? "🍽️" })} className="flex flex-1 items-center gap-3 text-left">
                <span className="text-2xl">{it.emoji ?? "🍽️"}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{it.calories} แคลอรี · {it.custom ? "สร้างเอง" : `ใช้ ${it.uses ?? 0} ครั้ง`}</p>
                </div>
              </button>
              <button onClick={() => remove(it.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddCustomFood({ onSave, onCancel }: { onSave: (it: { name: string; calories: number; carbs: number; protein: number; fat: number; emoji: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [c, setC] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  function save() {
    const calories = parseInt(cal, 10) || 0;
    if (!name.trim() || calories <= 0) return;
    onSave({
      name: name.trim(), calories,
      carbs: parseFloat(c) || 0, protein: parseFloat(p) || 0, fat: parseFloat(f) || 0,
      emoji: "🍽️",
    });
  }
  return (
    <div className="space-y-3 pb-4">
      <Field label="ชื่ออาหาร"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ข้าวกล้องสุก" /></Field>
      <Field label="แคลอรี (ต่อ 1 หน่วย)"><Input type="number" value={cal} onChange={(e) => setCal(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="คาร์บ (ก.)"><Input type="number" value={c} onChange={(e) => setC(e.target.value)} /></Field>
        <Field label="โปรตีน (ก.)"><Input type="number" value={p} onChange={(e) => setP(e.target.value)} /></Field>
        <Field label="ไขมัน (ก.)"><Input type="number" value={f} onChange={(e) => setF(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>ยกเลิก</Button>
        <Button className="flex-1" onClick={save}>บันทึกลงฐานข้อมูล</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function QuickView({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [meal, setMeal] = useState<Meal>("snack");
  const add = useAddFood(onDone);
  function submit() {
    const calories = parseInt(cal, 10) || 0;
    if (!name.trim() || calories <= 0) return;
    add({ name: name.trim(), calories, carbs: 0, protein: 0, fat: 0, emoji: "🍽️" }, meal, 1);
  }
  return (
    <div className="space-y-4 pb-4">
      <Field label="ชื่ออาหาร"><Input placeholder="เช่น ขนมปังปิ้ง" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="แคลอรี"><Input type="number" placeholder="0" value={cal} onChange={(e) => setCal(e.target.value)} /></Field>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">มื้ออาหาร</p>
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`rounded-xl py-2 text-[11px] font-medium ${meal === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {MEAL_LABEL_TH[m]}
            </button>
          ))}
        </div>
      </div>
      <Button className="w-full" onClick={submit}>บันทึก</Button>
    </div>
  );
}

function AiView({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "result" | "error">("input");
  const [result, setResult] = useState<AnalyzedFood | null>(null);
  const [error, setError] = useState("");
  const add = useAddFood(onDone);
  async function go() {
    if (!text.trim()) return;
    setPhase("loading");
    try {
      const r = await aiAnalyzeFoodText(text);
      setResult({ name: r.foodName, calories: r.calories, carbs: r.carbs, protein: r.protein, fat: r.fat, emoji: "🍽️" });
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setPhase("error");
    }
  }
  if (phase === "loading") return <Loading text="Gemini AI กำลังวิเคราะห์โภชนาการ…" />;
  if (phase === "error") return <ErrorView message={error} onRetry={() => setPhase("input")} />;
  if (phase === "result" && result) return <FoodResultCard result={result} onAdd={(m, s) => add(result, m, s)} onRetry={() => setPhase("input")} />;
  return (
    <div className="space-y-4 pb-4">
      <Field label="บอก AI ว่าคุณกินอะไร">
        <Input placeholder="เช่น ชานมไข่มุกหวานน้อย" value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button className="w-full" onClick={go} disabled={!text.trim()}>
        <Sparkles className="mr-2 h-4 w-4" />ค้นหาด้วย AI
      </Button>
    </div>
  );
}

function ExerciseView({ onDone }: { onDone: () => void }) {
  const { addExerciseOn } = useLogs();
  const { profile } = useProfile();
  const { items: recent, upsertFromEntry } = useExerciseDb();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "result" | "error">("input");
  const [result, setResult] = useState<{ name: string; duration: number; calories: number } | null>(null);
  const [error, setError] = useState("");
  async function go() {
    if (!text.trim()) return;
    setPhase("loading");
    try {
      const r = await aiAnalyzeExercise(text, profile?.weight);
      setResult({ name: r.activityName, duration: r.durationMinutes ?? 0, calories: r.caloriesBurned });
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setPhase("error");
    }
  }
  function add() {
    if (!result) return;
    addExerciseOn(todayKey(), {
      id: crypto.randomUUID(), name: result.name, duration: result.duration,
      calories: result.calories, time: new Date().toISOString(),
    });
    upsertFromEntry(result);
    onDone();
  }
  function relog(name: string, duration: number, calories: number) {
    addExerciseOn(todayKey(), { id: crypto.randomUUID(), name, duration, calories, time: new Date().toISOString() });
    upsertFromEntry({ name, duration, calories });
    onDone();
  }
  if (phase === "loading") return <Loading text="Gemini AI กำลังประเมินแคลอรีที่เผาผลาญ…" />;
  if (phase === "error") return <ErrorView message={error} onRetry={() => setPhase("input")} />;
  if (phase === "result" && result)
    return (
      <div className="space-y-4 pb-4 animate-fade-in-up">
        <div className="rounded-3xl p-5 text-center" style={{ backgroundColor: "color-mix(in oklab, var(--warning) 18%, transparent)" }}>
          <p className="text-xs font-medium text-muted-foreground">กิจกรรม</p>
          <p className="mt-1 text-lg font-semibold">{result.name}{result.duration ? ` · ${result.duration} นาที` : ""}</p>
          <p className="mt-3 text-4xl font-bold tabular-nums" style={{ color: "var(--warning)" }}>
            -{result.calories} <span className="text-sm font-normal text-muted-foreground">แคลอรี</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPhase("input")}>ลองใหม่</Button>
          <Button className="flex-1" onClick={add}>เพิ่มเข้าไดอารี่</Button>
        </div>
      </div>
    );
  return (
    <div className="space-y-4 pb-4">
      <Field label="กิจกรรม หรือ ลิงก์ YouTube">
        <Input placeholder="เช่น วิ่งคาร์ดิโอ 45 นาที หรือ https://youtu.be/..." value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <p className="text-xs text-muted-foreground">AI จะประเมินแคลอรีที่เผาผลาญตามความหนัก</p>
      <Button className="w-full" onClick={go} disabled={!text.trim()}>
        <Sparkles className="mr-2 h-4 w-4" />ประเมินด้วย AI
      </Button>
      {recent.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">บันทึกซ้ำกิจกรรมล่าสุด</p>
          <div className="flex flex-wrap gap-2">
            {recent.slice(0, 8).map((e) => (
              <button
                key={e.id}
                onClick={() => relog(e.name, e.duration, e.calories)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                {e.name} · -{e.calories}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 py-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <p className="text-sm font-semibold">ไม่สามารถวิเคราะห์ได้</p>
        <p className="mt-1 text-xs text-muted-foreground break-words">{message}</p>
      </div>
      <Button className="w-full" variant="outline" onClick={onRetry}>ลองใหม่อีกครั้ง</Button>
    </div>
  );
}

function WeightView({ onDone }: { onDone: () => void }) {
  const { profile, setProfile } = useProfile();
  const { setWeightOn } = useLogs();
  const [w, setW] = useState(profile?.weight.toString() ?? "");
  const [h, setH] = useState(profile?.height.toString() ?? "");
  const [phase, setPhase] = useState<"input" | "loading" | "advice">("input");
  const [advice, setAdvice] = useState<{ allowance: number; advice: string; shouldAdjust: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const wv = parseFloat(w);
    const hv = parseFloat(h);
    if (!wv || !profile) return;
    const updated = { ...profile, weight: wv, height: hv || profile.height };
    setWeightOn(todayKey(), wv);
    setProfile(updated);
    setPhase("loading");
    setErr(null);
    try {
      const current = updated.aiAllowance ?? calcAllowance(updated);
      const r = await aiWeightAdvice(updated, current);
      setAdvice({ allowance: r.recommendedAllowance, advice: r.advice, shouldAdjust: r.shouldAdjust });
      setPhase("advice");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "AI ประเมินไม่สำเร็จ");
      setPhase("advice");
    }
  }

  function applyAdjust() {
    if (!profile || !advice) return;
    setProfile({ ...profile, aiAllowance: advice.allowance });
    onDone();
  }

  if (phase === "loading") return <Loading text="AI กำลังวิเคราะห์เป้าหมายแคลอรีใหม่…" />;
  if (phase === "advice") {
    return (
      <div className="space-y-4 pb-4 animate-fade-in-up">
        <div className="rounded-3xl bg-accent p-5 text-center">
          <p className="text-xs text-muted-foreground">เป้าหมายแคลอรีที่แนะนำ</p>
          <p className="mt-1 text-4xl font-bold text-primary tabular-nums">
            {advice ? advice.allowance.toLocaleString() : "—"} <span className="text-sm font-normal text-muted-foreground">kcal/วัน</span>
          </p>
        </div>
        {advice?.advice && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">{advice.advice}</div>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onDone}>เก็บค่าเดิม</Button>
          <Button className="flex-1" onClick={applyAdjust} disabled={!advice}>ใช้คำแนะนำ</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 pb-4">
      <Field label="น้ำหนักปัจจุบัน (กก.)"><Input type="number" step="0.1" value={w} onChange={(e) => setW(e.target.value)} /></Field>
      <Field label="ส่วนสูง (ซม.)"><Input type="number" step="0.1" value={h} onChange={(e) => setH(e.target.value)} /></Field>
      <Button className="w-full" onClick={save}>บันทึกและประเมินด้วย AI</Button>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
