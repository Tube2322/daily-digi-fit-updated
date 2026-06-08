export type Gender = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "very";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  age: number;
  gender: Gender;
  weight: number; // kg
  height: number; // cm
  targetWeight: number; // kg
  timeframeMonths: number;
  activity: Activity;
  createdAt: string;
  // AI-calculated targets (optional; falls back to formula)
  aiAllowance?: number;
  aiMacros?: { carbs: number; protein: number; fat: number };
  aiNotes?: string;
  // Manual override for daily calorie target
  manualAllowance?: number;
  // Display info
  displayName?: string;
  nickname?: string;
  avatar?: string; // emoji or URL
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  carbs: number; // g
  protein: number; // g
  fat: number; // g
  servings: number;
  meal: Meal;
  time: string;
  image?: string;
}
export interface ExerciseEntry {
  id: string;
  name: string;
  duration: number; // minutes
  calories: number;
  time: string;
}
export interface DayLog {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  exercises: ExerciseEntry[];
  weight?: number;
  waterMl?: number;
}

export interface FoodDbItem {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  emoji?: string;
  custom?: boolean;
  lastUsed?: string;
  uses?: number;
}

export interface ExerciseDbItem {
  id: string;
  name: string;
  duration: number;
  calories: number;
  lastUsed?: string;
  uses?: number;
}

export function isDayActive(d?: DayLog): boolean {
  if (!d) return false;
  return (d.foods?.length ?? 0) > 0 || (d.exercises?.length ?? 0) > 0 || (d.waterMl ?? 0) >= 250;
}

export const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

export const ACTIVITY_LABEL_TH: Record<Activity, string> = {
  sedentary: "ไม่ค่อยขยับ",
  light: "ออกกำลังเบา",
  moderate: "ออกกำลังปานกลาง",
  very: "ออกกำลังหนัก",
};

export const ACTIVITY_DESC_TH: Record<Activity, string> = {
  sedentary: "ออกกำลังกายน้อยถึงไม่มีเลย",
  light: "ออกกำลังกาย 1–3 วัน/สัปดาห์",
  moderate: "ออกกำลังกาย 3–5 วัน/สัปดาห์",
  very: "ออกกำลังกาย 6–7 วัน/สัปดาห์",
};

export const MEAL_LABEL_TH: Record<Meal, string> = {
  breakfast: "อาหารเช้า",
  lunch: "อาหารกลางวัน",
  dinner: "อาหารเย็น",
  snack: "อาหารว่าง",
};

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export function calcBMR(p: Pick<Profile, "weight" | "height" | "age" | "gender">) {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === "male" ? base + 5 : base - 161;
}

export function calcTDEE(p: Profile) {
  return calcBMR(p) * ACTIVITY_MULT[p.activity];
}

export function calcAllowance(p: Profile) {
  if (p.manualAllowance && p.manualAllowance > 0) return p.manualAllowance;
  const tdee = calcTDEE(p);
  const kgDiff = p.targetWeight - p.weight;
  const days = Math.max(1, p.timeframeMonths * 30);
  const dailyDelta = (kgDiff * 7700) / days;
  const target = tdee + dailyDelta;
  const min = p.gender === "male" ? 1500 : 1200;
  return Math.round(Math.max(min, target));
}

export interface MacroGoals { carbs: number; protein: number; fat: number; }
export function calcMacroGoals(allowance: number): MacroGoals {
  // 50% carbs, 25% protein, 25% fat
  return {
    carbs: Math.round((allowance * 0.5) / 4),
    protein: Math.round((allowance * 0.25) / 4),
    fat: Math.round((allowance * 0.25) / 9),
  };
}

export function todayKey(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function dateKey(d: Date) { return todayKey(d); }

// ============ Mock AI - Thai foods ============
interface InternalFoodDbItem { match: RegExp; name: string; cal: number; c: number; p: number; f: number; emoji: string; }
const FOOD_DB: InternalFoodDbItem[] = [
  { match: /ก๋วยเตี๋ยวเรือ|boat noodle/i, name: "ก๋วยเตี๋ยวเรือ", cal: 656, c: 63, p: 29.5, f: 31.95, emoji: "🍜" },
  { match: /ข้าวมันไก่|chicken rice/i, name: "ข้าวมันไก่", cal: 590, c: 72, p: 28, f: 20, emoji: "🍚" },
  { match: /ผัดไทย|pad thai/i, name: "ผัดไทย", cal: 486, c: 60, p: 18, f: 18, emoji: "🍝" },
  { match: /ส้มตำ|som tam|papaya/i, name: "ส้มตำ", cal: 130, c: 25, p: 3, f: 2, emoji: "🥗" },
  { match: /ต้มยำ|tom yum/i, name: "ต้มยำกุ้ง", cal: 250, c: 12, p: 28, f: 10, emoji: "🍲" },
  { match: /กะเพรา|krapao|basil/i, name: "ข้าวกะเพราหมูสับ", cal: 520, c: 55, p: 27, f: 22, emoji: "🍛" },
  { match: /ข้าวผัด|fried rice/i, name: "ข้าวผัด", cal: 480, c: 65, p: 14, f: 17, emoji: "🍚" },
  { match: /โจ๊ก|congee/i, name: "โจ๊กหมู", cal: 220, c: 32, p: 14, f: 4, emoji: "🥣" },
  { match: /แซนวิช|sandwich|hot ?dog|ไส้กรอก/i, name: "แซนวิชไส้กรอกชีส", cal: 397, c: 25.8, p: 19.22, f: 23.05, emoji: "🥪" },
  { match: /พิซซ่า|pizza/i, name: "พิซซ่า 1 ชิ้น", cal: 285, c: 36, p: 12, f: 10, emoji: "🍕" },
  { match: /เบอร์เกอร์|burger/i, name: "ชีสเบอร์เกอร์", cal: 540, c: 40, p: 28, f: 28, emoji: "🍔" },
  { match: /สลัด|salad/i, name: "สลัดผัก", cal: 180, c: 14, p: 6, f: 11, emoji: "🥗" },
  { match: /ซูชิ|sushi/i, name: "ซูชิ 8 คำ", cal: 350, c: 55, p: 14, f: 7, emoji: "🍣" },
  { match: /ราเม็ง|ราเมน|ramen/i, name: "ราเม็ง", cal: 550, c: 70, p: 22, f: 18, emoji: "🍜" },
  { match: /กล้วย|banana/i, name: "กล้วยหอม", cal: 105, c: 27, p: 1.3, f: 0.4, emoji: "🍌" },
  { match: /แอปเปิ้ล|apple/i, name: "แอปเปิ้ล", cal: 95, c: 25, p: 0.5, f: 0.3, emoji: "🍎" },
  { match: /กาแฟ|ลาเต้|latte|coffee/i, name: "ลาเต้ร้อน", cal: 120, c: 12, p: 6, f: 5, emoji: "☕" },
  { match: /สมูทตี้|smoothie/i, name: "สมูทตี้ผลไม้", cal: 250, c: 50, p: 5, f: 3, emoji: "🥤" },
  { match: /ไข่|egg/i, name: "ไข่ดาว 2 ฟอง", cal: 155, c: 1, p: 13, f: 11, emoji: "🍳" },
  { match: /ข้าว|rice/i, name: "ข้าวสวย 1 จาน", cal: 220, c: 48, p: 4, f: 0.5, emoji: "🍚" },
];

export interface AnalyzedFood {
  name: string; calories: number; carbs: number; protein: number; fat: number; emoji: string;
}

export function analyzeFood(input: string): AnalyzedFood {
  const m = FOOD_DB.find((f) => f.match.test(input));
  if (m) return { name: m.name, calories: m.cal, carbs: m.c, protein: m.p, fat: m.f, emoji: m.emoji };
  const cal = 200 + (hash(input) % 400);
  const c = Math.round(cal * 0.5 / 4);
  const p = Math.round(cal * 0.25 / 4);
  const f = Math.round(cal * 0.25 / 9);
  return { name: input.trim() || "อาหาร", calories: cal, carbs: c, protein: p, fat: f, emoji: "🍽️" };
}

// Mock barcode lookup
const BARCODES: Record<string, string> = {
  "8851234567890": "แซนวิชไส้กรอกชีส",
  "8852345678901": "ลาเต้ร้อน",
  "8853456789012": "กล้วยหอม",
};
export function lookupBarcode(code: string): AnalyzedFood {
  const name = BARCODES[code] ?? "แซนวิชไส้กรอกชีส";
  return analyzeFood(name);
}

// Quick food database (browsable)
export const QUICK_FOODS: string[] = [
  "ก๋วยเตี๋ยวเรือ", "ข้าวมันไก่", "ผัดไทย", "ส้มตำ", "ต้มยำกุ้ง",
  "ข้าวกะเพราหมูสับ", "ข้าวผัด", "โจ๊กหมู", "แซนวิชไส้กรอกชีส",
  "สลัดผัก", "ซูชิ 8 คำ", "ราเม็ง", "กล้วยหอม", "แอปเปิ้ล",
  "ลาเต้ร้อน", "สมูทตี้ผลไม้", "ไข่ดาว 2 ฟอง", "ข้าวสวย 1 จาน",
];

const EX_DB: { match: RegExp; name: string; perMin: number }[] = [
  { match: /วิ่ง|run|jog/i, name: "วิ่ง", perMin: 10 },
  { match: /เดิน|walk/i, name: "เดิน", perMin: 4 },
  { match: /จักรยาน|ปั่น|cycle|bike/i, name: "ปั่นจักรยาน", perMin: 8 },
  { match: /ว่ายน้ำ|swim/i, name: "ว่ายน้ำ", perMin: 9 },
  { match: /โยคะ|yoga/i, name: "โยคะ", perMin: 3 },
  { match: /hiit/i, name: "HIIT", perMin: 12 },
  { match: /คาร์ดิโอ|cardio/i, name: "คาร์ดิโอ", perMin: 7 },
  { match: /เวท|ยกน้ำหนัก|strength/i, name: "เวทเทรนนิ่ง", perMin: 6 },
  { match: /เต้น|dance|zumba/i, name: "เต้น", perMin: 7 },
];

export function analyzeExercise(input: string): { name: string; duration: number; calories: number } {
  const dur = input.match(/(\d+)\s*(นาที|min|m|ชม|hr|hour|h)/i);
  let duration = 30;
  if (dur) {
    const n = parseInt(dur[1], 10);
    duration = /ชม|h/i.test(dur[2]) ? n * 60 : n;
  }
  const found = EX_DB.find((e) => e.match.test(input));
  const def = found ?? { name: input.split(" ")[0] || "ออกกำลังกาย", perMin: 7 };
  return { name: def.name, duration, calories: Math.round(def.perMin * duration) };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const THAI_SHORT_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function formatThaiDate(d: Date) {
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
