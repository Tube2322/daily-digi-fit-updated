import { useEffect, useState, useCallback } from "react";
import type { Profile, DayLog, FoodEntry, ExerciseEntry, FoodDbItem, ExerciseDbItem } from "./fitness";
import { todayKey } from "./fitness";

const PROFILE_KEY = "fitai.profile";
const LOGS_KEY = "fitai.logs";
const THEME_KEY = "fitai.theme";
const SETTINGS_KEY = "fitai.settings";
const FOOD_DB_KEY = "fitai.foodDb";
const EX_DB_KEY = "fitai.exerciseDb";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProfileState(read<Profile | null>(PROFILE_KEY, null));
    setLoaded(true);
  }, []);
  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    if (p) write(PROFILE_KEY, p);
    else localStorage.removeItem(PROFILE_KEY);
  }, []);
  return { profile, setProfile, loaded };
}

function emptyDay(date: string): DayLog {
  return { date, foods: [], exercises: [], waterMl: 0 };
}

export function useLogs() {
  const [logs, setLogsState] = useState<Record<string, DayLog>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLogsState(read<Record<string, DayLog>>(LOGS_KEY, {}));
    setLoaded(true);
  }, []);
  const update = useCallback((updater: (prev: Record<string, DayLog>) => Record<string, DayLog>) => {
    setLogsState((prev) => {
      const next = updater(prev);
      write(LOGS_KEY, next);
      return next;
    });
  }, []);

  const todayKeyStr = todayKey();
  const today = logs[todayKeyStr] ?? emptyDay(todayKeyStr);

  const addFoodOn = (dateK: string, f: FoodEntry) => update((prev) => {
    const d = prev[dateK] ?? emptyDay(dateK);
    return { ...prev, [dateK]: { ...d, foods: [...d.foods, f] } };
  });
  const addExerciseOn = (dateK: string, e: ExerciseEntry) => update((prev) => {
    const d = prev[dateK] ?? emptyDay(dateK);
    return { ...prev, [dateK]: { ...d, exercises: [...d.exercises, e] } };
  });
  const setWaterOn = (dateK: string, ml: number) => update((prev) => {
    const d = prev[dateK] ?? emptyDay(dateK);
    return { ...prev, [dateK]: { ...d, waterMl: ml } };
  });
  const setWeightOn = (dateK: string, w: number) => update((prev) => {
    const d = prev[dateK] ?? emptyDay(dateK);
    return { ...prev, [dateK]: { ...d, weight: w } };
  });
  const removeFood = (dateK: string, id: string) => update((prev) => {
    const d = prev[dateK]; if (!d) return prev;
    return { ...prev, [dateK]: { ...d, foods: d.foods.filter((x) => x.id !== id) } };
  });
  const removeExercise = (dateK: string, id: string) => update((prev) => {
    const d = prev[dateK]; if (!d) return prev;
    return { ...prev, [dateK]: { ...d, exercises: d.exercises.filter((x) => x.id !== id) } };
  });

  return { logs, today, update, loaded, addFoodOn, addExerciseOn, setWaterOn, setWeightOn, removeFood, removeExercise };
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as "light" | "dark" | null) ?? "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  return { theme, toggle };
}

export interface Settings {
  connectedHealth: Record<string, boolean>;
  autoLog: boolean;
  healthLogMode: "direct" | "ai"; // "direct" = เพิ่มกิจกรรมเองอัตโนมัติ, "ai" = ให้ AI ตรวจสอบ
}
const DEFAULT_SETTINGS: Settings = { connectedHealth: {}, autoLog: true, healthLogMode: "direct" };

export function useSettings() {
  const [settings, setState] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => { setState(read<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)); }, []);
  const setSettings = useCallback((s: Settings) => { setState(s); write(SETTINGS_KEY, s); }, []);
  return { settings, setSettings };
}

// ===== Gemini API Key =====
export function useGeminiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  useEffect(() => {
    const stored = localStorage.getItem("VITE_GEMINI_API_KEY") ?? "";
    setApiKeyState(stored);
  }, []);
  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    if (trimmed) localStorage.setItem("VITE_GEMINI_API_KEY", trimmed);
    else localStorage.removeItem("VITE_GEMINI_API_KEY");
  }, []);
  return { apiKey, setApiKey };
}

// ===== Food Database (custom + recently logged) =====
export function useFoodDb() {
  const [items, setItems] = useState<FoodDbItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setItems(read<FoodDbItem[]>(FOOD_DB_KEY, []));
    setLoaded(true);
  }, []);
  const save = useCallback((next: FoodDbItem[]) => {
    setItems(next);
    write(FOOD_DB_KEY, next);
  }, []);
  const upsertFromEntry = useCallback((f: { name: string; calories: number; carbs: number; protein: number; fat: number; emoji?: string }) => {
    setItems((prev) => {
      const key = f.name.trim().toLowerCase();
      const idx = prev.findIndex((x) => x.name.trim().toLowerCase() === key);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], lastUsed: now, uses: (next[idx].uses ?? 0) + 1 };
        write(FOOD_DB_KEY, next);
        return next;
      }
      const item: FoodDbItem = {
        id: crypto.randomUUID(),
        name: f.name, calories: f.calories, carbs: f.carbs, protein: f.protein, fat: f.fat,
        emoji: f.emoji ?? "🍽️", custom: false, lastUsed: now, uses: 1,
      };
      const next = [item, ...prev];
      write(FOOD_DB_KEY, next);
      return next;
    });
  }, []);
  const addCustom = useCallback((f: Omit<FoodDbItem, "id" | "custom">) => {
    const item: FoodDbItem = { ...f, id: crypto.randomUUID(), custom: true };
    setItems((prev) => { const next = [item, ...prev]; write(FOOD_DB_KEY, next); return next; });
  }, []);
  const remove = useCallback((id: string) => {
    setItems((prev) => { const next = prev.filter((x) => x.id !== id); write(FOOD_DB_KEY, next); return next; });
  }, []);
  return { items, loaded, save, upsertFromEntry, addCustom, remove };
}

// ===== Exercise Database (recent activities) =====
export function useExerciseDb() {
  const [items, setItems] = useState<ExerciseDbItem[]>([]);
  useEffect(() => { setItems(read<ExerciseDbItem[]>(EX_DB_KEY, [])); }, []);
  const upsertFromEntry = useCallback((e: { name: string; duration: number; calories: number }) => {
    setItems((prev) => {
      const key = e.name.trim().toLowerCase();
      const idx = prev.findIndex((x) => x.name.trim().toLowerCase() === key);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], duration: e.duration, calories: e.calories, lastUsed: now, uses: (next[idx].uses ?? 0) + 1 };
        write(EX_DB_KEY, next);
        return next;
      }
      const item: ExerciseDbItem = { id: crypto.randomUUID(), name: e.name, duration: e.duration, calories: e.calories, lastUsed: now, uses: 1 };
      const next = [item, ...prev];
      write(EX_DB_KEY, next);
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => {
    setItems((prev) => { const next = prev.filter((x) => x.id !== id); write(EX_DB_KEY, next); return next; });
  }, []);
  return { items, upsertFromEntry, remove };
}
