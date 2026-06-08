import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useProfile, useTheme, useGeminiKey } from "@/lib/store";
import { calcAllowance, calcBMR, calcTDEE, calcMacroGoals, ACTIVITY_LABEL_TH } from "@/lib/fitness";
import { Button } from "@/components/ui/button";
import {
  User, Target, Sliders, Crown, HeartPulse, Settings, ChevronRight, LogOut,
  Sun, Moon, Trash2, Camera, Check, X, Pencil,
} from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "บัญชี — Kalguroo" },
      { name: "description", content: "ตั้งค่าโปรไฟล์ เป้าหมาย และการเชื่อมต่อแอปสุขภาพ" },
    ],
  }),
  component: AccountPage,
});

// ─── Modal overlay ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md rounded-t-3xl bg-card p-6 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Toast / premium notice ───────────────────────────────────────────────────
function PremiumToast({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed bottom-28 inset-x-0 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 text-white shadow-2xl animate-fade-in-up max-w-sm w-full">
        <Crown className="h-5 w-5 shrink-0" />
        <p className="flex-1 text-sm font-semibold">รออัปเดตฟีเจอร์พรีเมียมเร็วๆ นี้!</p>
        <button onClick={onClose} className="opacity-80 hover:opacity-100"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

// ─── Avatar Emojis ────────────────────────────────────────────────────────────
const AVATAR_EMOJIS = ["😊", "💪", "🏃", "🧘", "🍎", "🥗", "🏋️", "🚴", "🌟", "🦁", "🐼", "🦊", "🌺", "🎯", "⚡"];

// ─── Profile Info Modal ───────────────────────────────────────────────────────
function ProfileInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [nick, setNick] = useState(profile?.nickname ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? "😊");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!profile) return null;

  function save() {
    // Update ONLY display fields — do NOT touch fitness fields or recalculate
    setProfile({ ...profile!, displayName: name.trim() || undefined, nickname: nick.trim() || undefined, avatar });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="ข้อมูลส่วนตัว">
      <div className="space-y-4">
        {/* Avatar selector */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-5xl border-2 border-primary/20 hover:bg-primary/20 transition"
          >
            {avatar}
          </button>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> แตะเพื่อเปลี่ยนรูปโปรไฟล์</p>
          {showEmojiPicker && (
            <div className="grid grid-cols-5 gap-2 rounded-2xl border border-border/60 bg-muted p-3">
              {AVATAR_EMOJIS.map((e) => (
                <button key={e} onClick={() => { setAvatar(e); setShowEmojiPicker(false); }}
                  className={`text-2xl p-1 rounded-xl transition ${avatar === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-accent"}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">ชื่อจริง</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="กรอกชื่อ..."
            className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">ชื่อเล่น</label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="ชื่อเล่น..."
            className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
          />
        </div>
        <p className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
          💡 การแก้ไขชื่อและรูปโปรไฟล์จะไม่มีผลต่อการคำนวณแคลอรีเป้าหมาย
        </p>
        <Button onClick={save} className="w-full">
          <Check className="mr-2 h-4 w-4" /> บันทึก
        </Button>
      </div>
    </Modal>
  );
}

// ─── Manual Calorie Adjustment Modal ─────────────────────────────────────────
function CalorieAdjustModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, setProfile } = useProfile();
  if (!profile) return null;

  const base = calcAllowance({ ...profile, manualAllowance: undefined });
  const [value, setValue] = useState(profile.manualAllowance ?? base);

  function save() {
    const macros = profile.aiMacros ?? calcMacroGoals(value);
    // Redistribute macros based on new calorie target
    const newMacros = {
      carbs: Math.round((value * 0.5) / 4),
      protein: Math.round((value * 0.25) / 4),
      fat: Math.round((value * 0.25) / 9),
    };
    setProfile({ ...profile, manualAllowance: value, aiMacros: macros.carbs > 0 ? newMacros : macros });
    onClose();
  }
  function reset() {
    setProfile({ ...profile, manualAllowance: undefined });
    setValue(base);
    onClose();
  }

  const newMacros = {
    carbs: Math.round((value * 0.5) / 4),
    protein: Math.round((value * 0.25) / 4),
    fat: Math.round((value * 0.25) / 9),
  };

  return (
    <Modal open={open} onClose={onClose} title="แก้ไขเป้าหมายสารอาหาร">
      <div className="space-y-5">
        <div className="rounded-2xl bg-primary/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">เป้าหมายแคลอรีต่อวัน</p>
          <p className="text-4xl font-bold tabular-nums text-primary">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">แคลอรี/วัน</p>
        </div>

        <div>
          <input
            type="range"
            min={800} max={4000} step={50}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>800</span><span>ค่าคำนวณ: {base.toLocaleString()}</span><span>4000</span>
          </div>
        </div>

        {/* Manual number input */}
        <div className="flex items-center gap-2">
          <button onClick={() => setValue(Math.max(800, value - 50))}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-lg font-bold hover:bg-accent transition">−</button>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Math.max(800, Math.min(4000, Number(e.target.value))))}
            className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-sm font-bold outline-none focus:border-primary transition"
          />
          <button onClick={() => setValue(Math.min(4000, value + 50))}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-lg font-bold hover:bg-accent transition">+</button>
        </div>

        {/* Preview redistribution */}
        <div className="rounded-2xl bg-muted/60 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">การกระจายสารอาหารใหม่อัตโนมัติ</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-muted-foreground">คาร์บ</p><p className="font-bold text-sm">{newMacros.carbs} ก.</p></div>
            <div><p className="text-[10px] text-muted-foreground">โปรตีน</p><p className="font-bold text-sm">{newMacros.protein} ก.</p></div>
            <div><p className="text-[10px] text-muted-foreground">ไขมัน</p><p className="font-bold text-sm">{newMacros.fat} ก.</p></div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="flex-1 text-sm">
            คืนค่าอัตโนมัติ
          </Button>
          <Button onClick={save} className="flex-1">
            <Check className="mr-1 h-4 w-4" /> บันทึก
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── App Settings Modal ───────────────────────────────────────────────────────
function AppSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, toggle } = useTheme();
  const { apiKey, setApiKey } = useGeminiKey();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [keySaved, setKeySaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { setProfile } = useProfile();
  const navigate = useNavigate();

  function saveKey() {
    setApiKey(keyInput);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }
  function clearCache() {
    setShowConfirm(true);
  }
  function confirmClear() {
    // Keep only theme, clear everything else
    const themeVal = localStorage.getItem("fitai.theme");
    localStorage.clear();
    if (themeVal) localStorage.setItem("fitai.theme", themeVal);
    setProfile(null);
    navigate({ to: "/onboarding" });
  }

  return (
    <Modal open={open} onClose={onClose} title="การตั้งค่าแอป">
      <div className="space-y-5">

        {/* Gemini API Key */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">🔑 Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary transition"
            />
            <button
              onClick={saveKey}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${keySaved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {keySaved ? "✓ บันทึก" : "บันทึก"}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            คีย์จะถูกบันทึกใน LocalStorage และใช้กับฟีเจอร์ AI ทั้งหมด
          </p>
          {apiKey && (
            <p className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> มีคีย์บันทึกอยู่แล้ว — คีย์จะคงอยู่แม้ปิดแอป
            </p>
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">ธีม</p>
            <p className="text-xs text-muted-foreground">{theme === "dark" ? "โหมดกลางคืน" : "โหมดกลางวัน"}</p>
          </div>
          <button
            onClick={toggle}
            className={`relative h-7 w-14 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow flex items-center justify-center transition-all ${theme === "dark" ? "left-8" : "left-1"}`}>
              {theme === "dark" ? <Moon className="h-3 w-3 text-slate-600" /> : <Sun className="h-3 w-3 text-amber-500" />}
            </span>
          </button>
        </div>

        <div className="border-t border-border/40" />

        {/* Clear cache */}
        {!showConfirm ? (
          <button
            onClick={clearCache}
            className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-100 transition"
          >
            <Trash2 className="h-4 w-4" />
            <div className="text-left">
              <p className="text-sm font-semibold">ล้างแคช / รีเซ็ตข้อมูลโปรไฟล์</p>
              <p className="text-xs opacity-70">ลบข้อมูลทั้งหมดและเริ่มต้นใหม่</p>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ ยืนยันการลบข้อมูลทั้งหมด?</p>
            <p className="text-xs text-muted-foreground">ข้อมูลไดอารี่, โปรไฟล์ และเป้าหมายจะถูกลบถาวร</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 text-sm">ยกเลิก</Button>
              <button onClick={confirmClear} className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold py-2 hover:bg-red-600 transition">
                ยืนยัน ลบทั้งหมด
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Account Page ────────────────────────────────────────────────────────
type ModalType = "profile" | "calorie" | "premium" | "settings" | null;

function AccountPage() {
  const { profile, setProfile } = useProfile();
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [premiumToast, setPremiumToast] = useState(false);

  if (!profile) return null;

  const bmr = Math.round(calcBMR(profile));
  const tdee = Math.round(calcTDEE(profile));
  const allowance = calcAllowance(profile);
  const isManual = !!profile.manualAllowance;

  const displayName = profile.displayName ?? (profile.gender === "male" ? "นักสุขภาพ" : "นักสุขภาพ");
  const avatar = profile.avatar ?? "😊";

  const items = [
    {
      icon: User, label: "ข้อมูลส่วนตัว",
      desc: "ชื่อ, ชื่อเล่น, รูปโปรไฟล์",
      onClick: () => setActiveModal("profile"),
    },
    {
      icon: Sliders, label: "แก้ไขเป้าหมายสารอาหาร",
      desc: isManual ? `ตั้งค่าเอง: ${allowance.toLocaleString()} kcal` : "ปรับแคลอรีเป้าหมายด้วยตนเอง",
      onClick: () => setActiveModal("calorie"),
      badge: isManual ? "กำหนดเอง" : undefined,
    },
    {
      icon: Crown, label: "จัดการสมาชิก",
      desc: "แผนพรีเมียมและสิทธิพิเศษ",
      onClick: () => { setPremiumToast(true); setTimeout(() => setPremiumToast(false), 3500); },
    },
    {
      icon: HeartPulse, label: "เชื่อมต่อแอปสุขภาพ",
      desc: "Apple Health, Google Health Connect",
      to: "/account/health" as const,
    },
    {
      icon: Settings, label: "การตั้งค่าแอปเพิ่มเติม",
      desc: "Gemini API Key, ธีม, ล้างแคช",
      onClick: () => setActiveModal("settings"),
    },
  ];

  return (
    <AppShell title="บัญชี">
      <div className="space-y-5">
        {/* Profile hero */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-3xl">
              {avatar}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{displayName}</p>
              {profile.nickname && <p className="text-sm opacity-80">"{profile.nickname}"</p>}
            </div>
            <button
              onClick={() => setActiveModal("profile")}
              className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs opacity-80">เป้าหมายแคลอรีต่อวัน</p>
          <div className="flex items-end gap-2">
            <p className="mt-1 text-5xl font-bold tabular-nums">{allowance.toLocaleString()}</p>
            {isManual && (
              <span className="mb-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold">กำหนดเอง</span>
            )}
          </div>
          <p className="text-sm opacity-80">แคลอรี · เพื่อไปถึง {profile.targetWeight} กก. ใน {profile.timeframeMonths} เดือน</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card label="BMR" value={`${bmr.toLocaleString()} แคลอรี`} sub="พลังงานพื้นฐาน" />
          <Card label="TDEE" value={`${tdee.toLocaleString()} แคลอรี`} sub="รวมกิจกรรม" />
          <Card label="น้ำหนักปัจจุบัน" value={`${profile.weight} กก.`} />
          <Card label="น้ำหนักเป้าหมาย" value={`${profile.targetWeight} กก.`} />
          <Card label="ส่วนสูง" value={`${profile.height} ซม.`} />
          <Card label="กิจกรรม" value={ACTIVITY_LABEL_TH[profile.activity]} />
        </div>

        <section className="rounded-3xl border border-border/60 bg-card">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">ตั้งค่าบัญชี</p>
          <ul>
            {items.map((it, i) => {
              const Icon = it.icon;
              const inner = (
                <div className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-accent transition">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{it.label}</p>
                    {it.desc && <p className="text-[11px] text-muted-foreground truncate">{it.desc}</p>}
                  </div>
                  {it.badge && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{it.badge}</span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              );
              return (
                <li key={it.label} className={i > 0 ? "border-t border-border/60" : ""}>
                  {"to" in it && it.to ? (
                    <Link to={it.to}>{inner}</Link>
                  ) : (
                    <button className="w-full text-left" onClick={it.onClick}>{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setProfile(null);
            navigate({ to: "/onboarding" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> รีเซ็ตโปรไฟล์
        </Button>
      </div>

      {/* Modals */}
      <ProfileInfoModal open={activeModal === "profile"} onClose={() => setActiveModal(null)} />
      <CalorieAdjustModal open={activeModal === "calorie"} onClose={() => setActiveModal(null)} />
      <AppSettingsModal open={activeModal === "settings"} onClose={() => setActiveModal(null)} />

      {/* Premium toast */}
      <PremiumToast open={premiumToast} onClose={() => setPremiumToast(false)} />
    </AppShell>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
