import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/lib/store";
import { ACTIVITY_LABEL_TH, ACTIVITY_DESC_TH, calcAllowance, calcMacroGoals, type Activity, type Gender, type Profile } from "@/lib/fitness";
import { aiCalculateGoals } from "@/lib/gemini";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าเป้าหมาย — Kalguroo" },
      { name: "description", content: "บอก Kalguroo เกี่ยวกับตัวคุณเพื่อคำนวณแคลอรีที่เหมาะสม" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { profile, setProfile, loaded } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState(profile?.age ?? 28);
  const [gender, setGender] = useState<Gender>(profile?.gender ?? "female");
  const [weight, setWeight] = useState(profile?.weight ?? 84);
  const [height, setHeight] = useState(profile?.height ?? 166);
  const [target, setTarget] = useState(profile?.targetWeight ?? 70);
  const [months, setMonths] = useState(profile?.timeframeMonths ?? 4);
  const [activity, setActivity] = useState<Activity>(profile?.activity ?? "light");

  useEffect(() => {
    // Allow re-entry to edit profile (don't auto-redirect on load)
  }, [loaded]);

  const draft: Profile = {
    age, gender, weight, height, targetWeight: target,
    timeframeMonths: months, activity,
    createdAt: profile?.createdAt ?? new Date().toISOString(),
  };
  const allowance = calcAllowance(draft);

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      const goals = await aiCalculateGoals(draft);
      setProfile({ ...draft, aiAllowance: goals.dailyAllowance, aiMacros: goals.macros, aiNotes: goals.notes });
      navigate({ to: "/" });
    } catch (e) {
      // Fallback to formula-based calc
      const fallback = calcAllowance(draft);
      setProfile({ ...draft, aiAllowance: fallback, aiMacros: calcMacroGoals(fallback) });
      setError(e instanceof Error ? e.message : "AI ไม่สามารถวิเคราะห์ได้ ใช้สูตรพื้นฐานแทน");
      setTimeout(() => navigate({ to: "/" }), 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold">K</div>
          <div>
            <p className="text-sm text-muted-foreground">ยินดีต้อนรับสู่</p>
            <h1 className="text-xl font-semibold">Kalguroo</h1>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <section className="flex-1 space-y-6">
            <header>
              <h2 className="text-2xl font-bold">ข้อมูลส่วนตัว</h2>
              <p className="mt-1 text-sm text-muted-foreground">ใช้คำนวณอัตราการเผาผลาญพื้นฐานของคุณ</p>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <Field label="อายุ" suffix="ปี">
                <Input type="number" value={age} onChange={(e) => setAge(+e.target.value)} />
              </Field>
              <Field label="เพศ">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  {(["female", "male"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`rounded-lg py-2 text-sm font-medium transition ${gender === g ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                    >
                      {g === "female" ? "หญิง" : "ชาย"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="น้ำหนัก" suffix="กก.">
                <Input type="number" value={weight} onChange={(e) => setWeight(+e.target.value)} />
              </Field>
              <Field label="ส่วนสูง" suffix="ซม.">
                <Input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} />
              </Field>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="flex-1 space-y-6">
            <header>
              <h2 className="text-2xl font-bold">เป้าหมายของคุณ</h2>
              <p className="mt-1 text-sm text-muted-foreground">น้ำหนักเป้าหมายและระยะเวลา</p>
            </header>
            <Field label="น้ำหนักเป้าหมาย" suffix="กก.">
              <Input type="number" value={target} onChange={(e) => setTarget(+e.target.value)} />
            </Field>
            <Field label="ระยะเวลา" suffix="เดือน">
              <Input type="number" min={1} value={months} onChange={(e) => setMonths(+e.target.value)} />
            </Field>
            <div className="rounded-2xl bg-accent p-4 text-sm">
              <p className="text-muted-foreground">
                คุณต้องการ{target < weight ? "ลด" : target > weight ? "เพิ่ม" : "คงน้ำหนัก"}{" "}
                <span className="font-semibold text-foreground">{Math.abs(target - weight)} กก.</span>{" "}
                ใน {months} เดือน — ประมาณ{" "}
                <span className="font-semibold text-foreground">
                  {(Math.abs(target - weight) / months).toFixed(1)} กก./เดือน
                </span>
              </p>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex-1 space-y-6">
            <header>
              <h2 className="text-2xl font-bold">ระดับกิจกรรม</h2>
              <p className="mt-1 text-sm text-muted-foreground">คุณเคลื่อนไหวมากแค่ไหนในแต่ละวัน?</p>
            </header>
            <div className="space-y-2">
              {(Object.keys(ACTIVITY_LABEL_TH) as Activity[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setActivity(a)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                    activity === a ? "border-primary bg-primary/10" : "border-border bg-card"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{ACTIVITY_LABEL_TH[a]}</p>
                    <p className="text-xs text-muted-foreground">{ACTIVITY_DESC_TH[a]}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 ${activity === a ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Sparkles className="h-4 w-4" /> เป้าหมายแคลอรีต่อวันของคุณ
              </div>
              <p className="mt-2 text-5xl font-bold tabular-nums">{allowance.toLocaleString()}</p>
              <p className="text-sm opacity-80">แคลอรี/วัน เพื่อบรรลุเป้าหมาย</p>
            </div>
          </section>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              ย้อนกลับ
            </Button>
          )}
          {step < 2 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              ต่อไป <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={finish} disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI กำลังคำนวณ…</>) : "เริ่มต้นใช้งาน"}
            </Button>
          )}
        </div>
        {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">
        {label} {suffix && <span className="font-normal">({suffix})</span>}
      </Label>
      {children}
    </div>
  );
}
