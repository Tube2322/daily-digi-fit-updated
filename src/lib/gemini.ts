// Google Gemini API client (browser, VITE_GEMINI_API_KEY).
// NOTE: API key is exposed to the browser by design (user request).
import type { Profile, MacroGoals } from "./fitness";

function getApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("VITE_GEMINI_API_KEY");
    if (stored && stored.trim()) return stored.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
}

const MODEL = "gemini-1.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {}

interface Part { text?: string; inlineData?: { mimeType: string; data: string } }

async function callGemini(parts: Part[], systemInstruction?: string, expectJson = true): Promise<string> {
  const API_KEY = getApiKey();
  if (!API_KEY) throw new GeminiError("ไม่พบ API Key ของ Gemini กรุณาตั้งค่าคีย์ใน การตั้งค่าแอป");
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.4,
      ...(expectJson ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: Part) => p.text).filter(Boolean).join("") ?? json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("Gemini ไม่ได้ส่งข้อความตอบกลับ");
  return text;
}

function extractJson<T>(raw: string): T {
  let s = raw.trim();
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  s = s.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  // Also strip any remaining backtick sequences
  s = s.replace(/`{1,3}/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    throw new GeminiError("ไม่สามารถอ่านผลลัพธ์ JSON จาก AI ได้");
  }
}

// ============= Phase 1: Goals ==============
export interface AiGoals {
  dailyAllowance: number;
  macros: MacroGoals;
  notes?: string;
}

export async function aiCalculateGoals(p: Profile): Promise<AiGoals> {
  const system =
    "คุณคือนักโภชนาการและผู้เชี่ยวชาญด้านสุขภาพชาวไทย ให้คำแนะนำที่ปลอดภัย ยั่งยืน และเหมาะสำหรับการลดน้ำหนักอย่างค่อยเป็นค่อยไป ห้ามแนะนำต่ำกว่า 1200 kcal สำหรับผู้หญิง หรือ 1500 kcal สำหรับผู้ชาย ตอบกลับเป็น JSON เท่านั้น";
  const prompt = `วิเคราะห์ข้อมูลผู้ใช้และคำนวณ "ปริมาณแคลอรีต่อวันที่เหมาะสม" และ "เป้าหมายสารอาหารหลัก (กรัม)" สำหรับการลด/รักษาน้ำหนักอย่างปลอดภัย

ข้อมูลผู้ใช้:
- อายุ: ${p.age} ปี
- เพศ: ${p.gender === "male" ? "ชาย" : "หญิง"}
- น้ำหนักปัจจุบัน: ${p.weight} กก.
- ส่วนสูง: ${p.height} ซม.
- น้ำหนักเป้าหมาย: ${p.targetWeight} กก.
- ระยะเวลา: ${p.timeframeMonths} เดือน
- ระดับกิจกรรม: ${p.activity}

ตอบกลับด้วย JSON ที่มี keys ดังนี้เท่านั้น:
{ "dailyAllowance": number (kcal/วัน), "carbs": number (กรัม), "protein": number (กรัม), "fat": number (กรัม), "notes": string (สั้นๆ ภาษาไทย) }`;

  const text = await callGemini([{ text: prompt }], system, true);
  const raw = extractJson<{ dailyAllowance: number; carbs: number; protein: number; fat: number; notes?: string }>(text);
  return {
    dailyAllowance: Math.round(raw.dailyAllowance),
    macros: { carbs: Math.round(raw.carbs), protein: Math.round(raw.protein), fat: Math.round(raw.fat) },
    notes: raw.notes,
  };
}

// ============= Phase 2: Food ==============
export interface AiFood {
  foodName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

const FOOD_SYSTEM =
  "คุณคือผู้เชี่ยวชาญด้านโภชนาการอาหารไทย ประเมินค่าพลังงานและสารอาหารต่อ 1 หน่วยบริโภคทั่วไปของอาหารที่ระบุ ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น";
const FOOD_PROMPT_JSON =
  'ตอบกลับด้วย JSON ตามรูปแบบนี้เท่านั้น: {"foodName": "ชื่ออาหารภาษาไทย", "calories": number, "carbs": number, "protein": number, "fat": number} โดย calories เป็น kcal และ carbs/protein/fat เป็นกรัม';

export async function aiAnalyzeFoodText(description: string): Promise<AiFood> {
  const prompt = `วิเคราะห์อาหารต่อไปนี้: "${description}"\n${FOOD_PROMPT_JSON}`;
  const text = await callGemini([{ text: prompt }], FOOD_SYSTEM, true);
  return extractJson<AiFood>(text);
}

export async function aiAnalyzeFoodImage(file: File): Promise<AiFood> {
  const base64 = await fileToBase64(file);
  const prompt = `วิเคราะห์อาหารในรูปภาพนี้ ระบุชื่ออาหารเป็นภาษาไทยและประเมินค่าโภชนาการต่อ 1 หน่วยบริโภคทั่วไป\n${FOOD_PROMPT_JSON}`;
  const text = await callGemini(
    [
      { text: prompt },
      { inlineData: { mimeType: file.type || "image/jpeg", data: base64 } },
    ],
    FOOD_SYSTEM,
    true,
  );
  return extractJson<AiFood>(text);
}

// ============= Phase 2: Exercise ==============
export interface AiExercise {
  activityName: string;
  caloriesBurned: number;
  durationMinutes?: number;
}

export async function aiAnalyzeExercise(input: string, userWeightKg?: number): Promise<AiExercise> {
  const system =
    "คุณคือผู้ฝึกสอนการออกกำลังกายผู้เชี่ยวชาญ ประเมินแคลอรีที่เผาผลาญตามความหนักของกิจกรรม ตอบกลับเป็น JSON เท่านั้น";
  const weightHint = userWeightKg ? `\nน้ำหนักผู้ใช้: ${userWeightKg} กก.` : "";
  const isUrl = /^https?:\/\//.test(input.trim());
  const prompt = isUrl
    ? `ลิงก์วิดีโอออกกำลังกาย: ${input}\nประเมินว่าน่าจะเป็นการออกกำลังประเภทใดและเผาผลาญกี่แคลอรีโดยรวม${weightHint}\nตอบกลับ JSON: {"activityName": "ชื่อกิจกรรมภาษาไทย", "caloriesBurned": number, "durationMinutes": number}`
    : `กิจกรรม: "${input}"\nประเมินแคลอรีที่เผาผลาญทั้งหมด${weightHint}\nตอบกลับ JSON: {"activityName": "ชื่อกิจกรรมภาษาไทย", "caloriesBurned": number, "durationMinutes": number}`;
  const text = await callGemini([{ text: prompt }], system, true);
  const raw = extractJson<AiExercise>(text);
  return {
    activityName: raw.activityName,
    caloriesBurned: Math.max(0, Math.round(raw.caloriesBurned)),
    durationMinutes: raw.durationMinutes ? Math.round(raw.durationMinutes) : undefined,
  };
}

// ============= Phase 3: Weight update advice ==============
export interface AiWeightAdvice {
  recommendedAllowance: number;
  advice: string;
  shouldAdjust: boolean;
}

export async function aiWeightAdvice(p: Profile, currentAllowance: number): Promise<AiWeightAdvice> {
  const system = "คุณคือนักโภชนาการชาวไทย ให้คำแนะนำสั้น กระชับ ปลอดภัย เป็นกันเอง ตอบกลับเป็น JSON เท่านั้น";
  const prompt = `ผู้ใช้อัปเดตข้อมูลร่างกายล่าสุด:
- เพศ ${p.gender === "male" ? "ชาย" : "หญิง"} อายุ ${p.age} ปี
- น้ำหนักล่าสุด ${p.weight} กก. ส่วนสูง ${p.height} ซม.
- เป้าหมาย ${p.targetWeight} กก. ใน ${p.timeframeMonths} เดือน
- เป้าหมายแคลอรีปัจจุบัน ${currentAllowance} kcal/วัน

วิเคราะห์ว่าควรปรับเป้าหมายแคลอรีต่อวันหรือไม่ และให้คำแนะนำสั้นๆ
ตอบ JSON: {"recommendedAllowance": number, "shouldAdjust": boolean, "advice": "ข้อความสั้นภาษาไทย"}`;
  const text = await callGemini([{ text: prompt }], system, true);
  const raw = extractJson<AiWeightAdvice>(text);
  return { recommendedAllowance: Math.round(raw.recommendedAllowance), shouldAdjust: !!raw.shouldAdjust, advice: raw.advice ?? "" };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    r.readAsDataURL(file);
  });
}
