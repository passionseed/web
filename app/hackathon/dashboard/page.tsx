"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import gsap from "gsap";
import { ClipboardList, Users, Check, Sparkles, BookOpen, Home, ArrowRight, Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { HackathonParticipant } from "@/lib/hackathon/db";

import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";

const ONBOARDING_NUDGE_KEY = "hackathon_onboarding_nudge_dismissed";

const TRACKS = [
  "นักเรียนมัธยมปลาย หรือเทียบเท่า",
  "นักศึกษามหาวิทยาลัย",
];

const GRADES: Record<string, string[]> = {
  "นักเรียนมัธยมปลาย หรือเทียบเท่า": ["ม.4", "ม.5", "ม.6", "ปวช.", "อื่นๆ"],
  "นักศึกษามหาวิทยาลัย": ["ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"],
};

export default function HackathonDashboardPage() {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    phone: "",
    university: "",
    track: "",
    grade_level: "",
    experience_level: 1,
    bio: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsFocused, setSettingsFocused] = useState<string | null>(null);

  useEffect(() => {

    let attempts = 0;
    const maxAttempts = 6;

    const check = () => {
      fetch("/api/hackathon/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.participant) {
            if (data.participant.is_admin) {
              setOnboardingComplete(true);
              setParticipant(data.participant);
              if (contentRef.current) {
                gsap.fromTo(
                  contentRef.current,
                  { opacity: 0, y: 20 },
                  { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                );
              }
              return;
            }

            fetch("/api/hackathon/pre-questionnaire")
              .then((r) => r.json())
              .then((questionnaireData) => {
                const complete = questionnaireData.data != null;
                setOnboardingComplete(complete);
                setParticipant(data.participant);

                if (
                  !complete &&
                  typeof window !== "undefined" &&
                  sessionStorage.getItem(ONBOARDING_NUDGE_KEY) !== "1"
                ) {
                  setShowOnboardingNudge(true);
                }

                if (contentRef.current) {
                  gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                  );
                }
              })
              .catch(() => {
                setOnboardingComplete(false);
                setParticipant(data.participant);
                if (
                  typeof window !== "undefined" &&
                  sessionStorage.getItem(ONBOARDING_NUDGE_KEY) !== "1"
                ) {
                  setShowOnboardingNudge(true);
                }
                if (contentRef.current) {
                  gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                  );
                }
              });
          } else if (++attempts < maxAttempts) {
            setTimeout(check, 500);
          } else {
            router.replace("/hackathon/login");
          }
        })
        .catch(() => {
          if (++attempts < maxAttempts) setTimeout(check, 500);
          else router.replace("/hackathon/login");
        });
    };

    check();
  }, [router]);

  const dismissOnboardingNudge = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ONBOARDING_NUDGE_KEY, "1");
    }
    setShowOnboardingNudge(false);
  };

  const goToOnboarding = () => {
    dismissOnboardingNudge();
    router.push("/hackathon/onboarding?returnTo=/hackathon/dashboard");
  };

  const handleLogout = async () => {
    await fetch("/api/hackathon/logout", { method: "POST" });
    router.push("/hackathon");
  };

  const openSettings = () => {
    if (!participant) return;
    setSettingsForm({
      name: participant.name,
      phone: participant.phone,
      university: participant.university,
      track: participant.track,
      grade_level: participant.grade_level,
      experience_level: participant.experience_level,
      bio: participant.bio,
    });
    setSettingsError("");
    setShowSettings(true);
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettingsForm((prev) => {
      if (name === "track" && value !== prev.track) {
        return { ...prev, track: value, grade_level: "" };
      }
      return { ...prev, [name]: value };
    });
    setSettingsError("");
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const res = await fetch("/api/hackathon/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error || "Failed to update profile");
        return;
      }
      setParticipant(data.participant);
      setShowSettings(false);
    } catch {
      setSettingsError("Something went wrong. Please try again.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const settingsInputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.65rem 0.875rem",
    outline: "none",
    transition: "all 0.3s",
    background: settingsFocused === name ? "#0d1219" : "#0a0f16",
    border: `1px solid ${settingsFocused === name ? "rgba(101,171,252,0.45)" : "rgba(74,107,130,0.35)"}`,
    boxShadow: settingsFocused === name
      ? "0 0 18px rgba(101,171,252,0.08), inset 0 0 18px rgba(101,171,252,0.02)"
      : "none",
    color: "#C0D8F0",
    caretColor: "#65ABFC",
    fontSize: "0.875rem",
  });

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center font-[family-name:var(--font-mitr)]">
      <FractalGlassBackground />
      <Dialog
        open={showOnboardingNudge}
        onOpenChange={(open) => {
          if (!open) dismissOnboardingNudge();
        }}
      >
        <DialogContent className="border-[#91C4E3]/25 bg-[#0d1219] text-white sm:max-w-md font-[family-name:var(--font-mitr)]">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">ทำแบบสอบถามให้เสร็จสมบูรณ์</DialogTitle>
            <DialogDescription className="text-gray-400 text-left mt-2 text-sm leading-relaxed">
              แบบสอบถามสั้นๆ จะช่วยให้เราเข้าใจเป้าหมายของคุณ และจับคู่คุณกับโจทย์แฮกกาธอนและเพื่อนร่วมทีม คุณสามารถเริ่มทำได้เลย หรือทำเมื่อไหร่ก็ได้จากแดชบอร์ดของคุณ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/5 font-[family-name:var(--font-mitr)]"
              onClick={dismissOnboardingNudge}
            >
              ไว้ทีหลัง
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-[#8b7a9a] to-[#7b6a8a] hover:from-[#b5a4ca] hover:to-[#a594ba] text-white border border-[#b5a4ca]/30 shadow-[0_0_15px_rgba(139,122,154,0.4)] transition-all font-[family-name:var(--font-mitr)]"
              onClick={goToOnboarding}
            >
              เริ่มทำแบบสอบถาม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="border-[#4a6b82]/30 bg-[#0d1219] text-white sm:max-w-md font-[family-name:var(--font-mitr)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">แก้ไขโปรไฟล์</DialogTitle>
            <DialogDescription className="text-[#5a7a94] text-sm">
              อัปเดตข้อมูลส่วนตัวของคุณ
            </DialogDescription>
          </DialogHeader>

          {settingsError && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{
                background: "rgba(255,70,70,0.07)",
                border: "1px solid rgba(255,70,70,0.22)",
                color: "#FF8888",
              }}
            >
              {settingsError}
            </div>
          )}

          <form onSubmit={handleSettingsSubmit} className="space-y-4 mt-2">
            {([
              { name: "name", label: "ชื่อ-นามสกุล", type: "text" },
              { name: "phone", label: "เบอร์โทรศัพท์", type: "tel" },
              { name: "university", label: "สถานศึกษา", type: "text" },
            ] as const).map((f) => (
              <div key={f.name}>
                <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                  {f.label}
                </label>
                <input
                  name={f.name}
                  type={f.type}
                  value={settingsForm[f.name]}
                  onChange={handleSettingsChange}
                  onFocus={() => setSettingsFocused(f.name)}
                  onBlur={() => setSettingsFocused(null)}
                  required
                  style={settingsInputStyle(f.name)}
                  className="font-[family-name:var(--font-mitr)]"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                  ระดับการศึกษา
                </label>
                <select
                  name="track"
                  value={settingsForm.track}
                  onChange={handleSettingsChange}
                  onFocus={() => setSettingsFocused("track")}
                  onBlur={() => setSettingsFocused(null)}
                  required
                  style={{ ...settingsInputStyle("track"), appearance: "none", color: settingsForm.track ? "#C0D8F0" : "#2A3A50" }}
                  className="font-[family-name:var(--font-mitr)]"
                >
                  <option value="" disabled style={{ background: "#0d1219", color: "#2A3A50" }}>เลือก</option>
                  {TRACKS.map((t) => (
                    <option key={t} value={t} style={{ background: "#0d1219", color: "#C0D8F0" }}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                  ชั้นปี
                </label>
                <select
                  name="grade_level"
                  value={settingsForm.grade_level}
                  onChange={handleSettingsChange}
                  onFocus={() => setSettingsFocused("grade_level")}
                  onBlur={() => setSettingsFocused(null)}
                  required
                  disabled={!settingsForm.track}
                  style={{
                    ...settingsInputStyle("grade_level"),
                    appearance: "none",
                    color: settingsForm.grade_level ? "#C0D8F0" : "#2A3A50",
                    opacity: !settingsForm.track ? 0.5 : 1,
                  }}
                  className="font-[family-name:var(--font-mitr)]"
                >
                  <option value="" disabled style={{ background: "#0d1219", color: "#2A3A50" }}>
                    {settingsForm.track ? "เลือกชั้นปี" : "เลือกระดับก่อน"}
                  </option>
                  {settingsForm.track && GRADES[settingsForm.track]?.map((g) => (
                    <option key={g} value={g} style={{ background: "#0d1219", color: "#C0D8F0" }}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-2 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                ระดับความชำนาญในการแข่ง ({settingsForm.experience_level})
              </label>
              <div className="px-1 mb-1">
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[settingsForm.experience_level]}
                  onValueChange={(vals) => setSettingsForm((prev) => ({ ...prev, experience_level: vals[0] }))}
                  className="mb-2"
                />
                <div className="flex justify-between text-[10px] font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                  <span>ครั้งแรก</span>
                  <span>ชำนาญสุดๆ</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]" style={{ color: "#3A6080" }}>
                เรื่องเท่ๆ เกี่ยวกับตัวเอง
              </label>
              <textarea
                name="bio"
                value={settingsForm.bio}
                onChange={handleSettingsChange}
                onFocus={() => setSettingsFocused("bio")}
                onBlur={() => setSettingsFocused(null)}
                required
                rows={3}
                style={{ ...settingsInputStyle("bio"), resize: "none" }}
                className="font-[family-name:var(--font-mitr)]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="text-[#5a7a94] hover:text-white hover:bg-white/5 font-[family-name:var(--font-mitr)]"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={settingsLoading}
                className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white border border-[#7aa4c4]/30 shadow-[0_0_15px_rgba(90,122,148,0.4)] transition-all font-[family-name:var(--font-mitr)] disabled:opacity-40"
              >
                {settingsLoading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div ref={contentRef} className="relative z-30 w-full max-w-lg px-6 py-12 text-center space-y-8 opacity-0">
        {participant ? (
          <>
            <div className="space-y-3">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-[#91C4E3] text-sm tracking-widest uppercase mb-1 font-medium">คุณได้เข้าร่วมแล้ว!</p>
              <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent">
                ยินดีต้อนรับ
              </h1>
              <p className="text-gray-300 font-medium">The Next Decade Hackathon 2026</p>
            </div>

            {onboardingComplete === false && (
              <div className="bg-gradient-to-br from-amber-950/60 to-amber-900/40 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 text-left shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-amber-500/20 p-2.5 text-amber-400 border border-amber-500/30">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <p className="text-amber-300 font-medium text-sm">
                        ยังทำแบบสอบถามไม่เสร็จ
                      </p>
                      <p className="text-gray-200 text-sm mt-1 leading-relaxed">
                        ทำแบบสอบถามสั้นๆ ให้เสร็จเมื่อคุณพร้อม ข้อมูลนี้จะช่วยในการเลือกปัญหาและจับคู่ทีม
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        router.push("/hackathon/onboarding?returnTo=/hackathon/dashboard")
                      }
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all duration-300 font-[family-name:var(--font-mitr)]"
                    >
                      เริ่มทำแบบสอบถาม
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {onboardingComplete === true && (
              <div className="bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-5 py-4 text-left shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/20 p-1.5 text-emerald-400 border border-emerald-500/30">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-emerald-300 text-sm font-medium">ทำแบบสอบถามเสร็จสิ้น</p>
                  <p className="text-emerald-100/70 text-xs mt-0.5">ขอบคุณ — ระบบได้บันทึกคำตอบของคุณแล้ว</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#121c29]/80 backdrop-blur-md border border-[#4a6b82]/30 rounded-3xl p-6 md:p-8 text-left space-y-5 shadow-[0_0_30px_rgba(74,107,130,0.15)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#91C4E3]/0 via-[#91C4E3]/5 to-[#91C4E3]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-2xl font-medium text-white">{participant.name}</p>
                  <p className="text-[#91C4E3] text-sm mt-1 bg-[#91C4E3]/10 inline-block px-3 py-1 rounded-full border border-[#91C4E3]/30 font-medium">
                    {participant.role}
                  </p>
                </div>
                {!participant.is_admin && (
                  <button
                    onClick={openSettings}
                    className="p-2 rounded-xl transition-all duration-200 hover:bg-[#4a6b82]/20 text-[#4a6b82] hover:text-[#91C4E3]"
                    aria-label="แก้ไขโปรไฟล์"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="border-t border-[#4a6b82]/30 pt-4 space-y-3 text-sm text-gray-300 relative z-10">
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <span className="text-[#5a7a94] font-medium">อีเมล</span>
                  <span className="text-white text-right break-words">{participant.email}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <span className="text-[#5a7a94] font-medium">มหาวิทยาลัย / องค์กร</span>
                  <span className="text-white text-right">{participant.university}</span>
                </div>
                {participant.team_name && (
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <span className="text-[#5a7a94] font-medium">ทีม</span>
                    <span className="text-[#b5a4ca] font-medium text-right">{participant.team_name}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-[#5a7a94] font-medium">วันที่สมัคร</span>
                  <span className="text-white text-right font-mono text-xs mt-0.5">
                    {new Date(participant.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white font-medium py-6 rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(90,122,148,0.4)] hover:shadow-[0_0_40px_rgba(106,154,196,0.6)] hover:scale-[1.02] border border-[#7aa4c4]/30 font-[family-name:var(--font-mitr)]"
            >
              <Link href="/hackathon/team" className="inline-flex items-center justify-center gap-2 text-lg">
                <Users className="h-5 w-5" aria-hidden />
                แดชบอร์ดทีม
              </Link>
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <Button
                asChild
                variant="outline"
                className="w-full bg-[#1a2530]/40 hover:bg-[#1a2530]/80 border-[#4a6b82]/30 hover:border-[#7aa4c4]/60 text-gray-300 hover:text-white transition-all py-5 font-[family-name:var(--font-mitr)]"
              >
                <Link href="/hackathon/challenge" className="flex flex-col items-center gap-1.5 h-auto">
                  <BookOpen className="h-4 w-4 text-[#7aa4c4]" />
                  <span className="text-xs">รายละเอียดโจทย์</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full bg-[#1a2530]/40 hover:bg-[#1a2530]/80 border-[#4a6b82]/30 hover:border-[#7aa4c4]/60 text-gray-300 hover:text-white transition-all py-5 font-[family-name:var(--font-mitr)]"
              >
                <Link href="/hackathon" className="flex flex-col items-center gap-1.5 h-auto">
                  <Home className="h-4 w-4 text-[#7aa4c4]" />
                  <span className="text-xs">หน้าแรก</span>
                </Link>
              </Button>
            </div>

            <div className="bg-[#1a2530]/60 border border-[#b5a4ca]/30 rounded-2xl p-5 text-sm text-gray-300 space-y-2 shadow-[0_0_20px_rgba(139,122,154,0.1)]">
              <div className="flex items-center gap-2 text-[#b5a4ca] font-medium mb-1">
                <Sparkles className="w-4 h-4" />
                <p>ขั้นตอนต่อไป?</p>
              </div>
              <p className="leading-relaxed">
                แฮกกาธอนจะเริ่มในวันที่ <span className="text-[#b5a4ca] font-medium">4 เมษายน 2026</span> เราจะส่งรายละเอียดและอัปเดตกิจกรรมไปที่อีเมลของคุณ
              </p>
            </div>

            <Button onClick={handleLogout} variant="ghost" className="text-gray-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors mt-2 font-[family-name:var(--font-mitr)]">
              ออกจากระบบ
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
            <p className="text-[#91C4E3]/70 text-sm font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        )}
      </div>
    </div>
  );
}
