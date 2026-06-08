import { useMemo, useState } from "react";
import { X, Search, Plus, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFoodDb, useLogs } from "@/lib/store";
import { MEAL_LABEL_TH, todayKey, type Meal, type FoodEntry } from "@/lib/fitness";

export function QuickPickFood({ open, meal, onClose }: { open: boolean; meal: Meal; onClose: () => void }) {
  const { items, upsertFromEntry } = useFoodDb();
  const { addFoodOn } = useLogs();
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.lastUsed ?? "").localeCompare(a.lastUsed ?? ""));
  }, [items]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sorted;
    return sorted.filter((it) => it.name.toLowerCase().includes(s));
  }, [sorted, q]);

  if (!open) return null;

  function add(id: string) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      name: it.name,
      calories: it.calories,
      carbs: it.carbs,
      protein: it.protein,
      fat: it.fat,
      servings: 1,
      meal,
      time: new Date().toISOString(),
      image: it.emoji,
    };
    addFoodOn(todayKey(), entry);
    upsertFromEntry(it);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-card p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">เพิ่มอาหารด่วน · {MEAL_LABEL_TH[meal]}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาจากฐานข้อมูลอาหาร…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="mt-3 max-h-[55vh] overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">ฐานข้อมูลยังว่างเปล่า</p>
              <p className="text-xs text-muted-foreground">
                ใช้ปุ่ม + ด้านล่างเพื่อบันทึกอาหารด้วย AI หรือบันทึกด่วน<br />อาหารที่บันทึกแล้วจะปรากฏที่นี่
              </p>
              <Button variant="outline" onClick={() => { onClose(); document.dispatchEvent(new CustomEvent("kalguroo:openFab")); }}>
                <Plus className="mr-2 h-4 w-4" /> เพิ่มอาหารใหม่
              </Button>
            </div>
          ) : (
            <ul className="space-y-2 pb-2">
              {list.slice(0, 50).map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => add(it.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-accent active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{it.emoji ?? "🍽️"}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.calories} แคลอรี · {it.uses ? `ใช้ ${it.uses} ครั้ง` : "ใหม่"}
                        </p>
                      </div>
                    </div>
                    <Plus className="h-5 w-5 shrink-0 text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
