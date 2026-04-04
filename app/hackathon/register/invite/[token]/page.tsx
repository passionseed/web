"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import gsap from "gsap";
import { Slider } from "@/components/ui/slider";

const TRACKS = [
  "นักเรียนมัธยมปลาย หรือเทียบเท่า",
  "นักศึกษามหาวิทยาลัย",
];

const REFERRAL_SOURCES = [
  "Facebook", "Instagram", "TikTok", "X (Twitter)",
  "เพื่อนแนะนำ", "ครู/อาจารย์แนะนำ", "อื่นๆ",
];

const GRADES: Record<string, string[]> = {
  "นักเรียนมัธยมปลาย หรือเทียบเท่า": ["ม.4", "ม.5", "ม.6", "ปวช.", "อื่นๆ"],
  "นักศึกษามหาวิทยาลัย": ["ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"],
};

type TeamInfo = { id: string; name: string; member_count: number };
type Particle = { id: number; left: number; bottom: number; size: number; delay: number; duration: number; variant: 1 | 2 | 3; hue: number };
type Star = { id: number; left: number; top: number; size: number; delay: number; duration: number; blue: boolean };

export default function InviteRegisterPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const waterRef = useRef<HTMLDivElement>(null);

  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", university: "",
    track: "", grade_level: "", experience_level: 1,
    referral_source: "", bio: "",
  });

  const [particles, setParticles] = useState<Particle[]>([]);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 70 }, (_, i) => ({
      id: i, left: Math.random() * 100, bottom: Math.random() * 55,
      size: Math.random() * 3.5 + 0.6, delay: Math.random() * 14,
      duration: Math.random() * 9 + 6, variant: ((i % 3) + 1) as 1 | 2 | 3,
      hue: Math.floor(Math.random() * 25) + 205,
    })));
    setStars(Array.from({ length: 160 }, (_, i) => ({
      id: i, left: Math.random() * 100, top: Math.random() * 65,
      size: Math.random() * 1.8 + 0.3, delay: Math.random() * 7,
      duration: Math.random() * 3.5 + 1.8, blue: Math.random() > 0.7,
    })));
  }, []);

  useEffect(() => {
    if (!waterRef.current) return;
    gsap.to(waterRef.current, { yPercent: 100, duration: 1.5, ease: "power3.inOut", delay: 0.15 });
  }, []);

  // Validate token on mount
  useEffect(() => {
    fetch(`/api/hackathon/register/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) { setInvalid(true); return; }
        const data = await res.json();
        setTeam(data.team);
      })
      .catch(() => setInvalid(true));
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "track" && value !== prev.track) return { ...prev, [name]: value, grade_level: "" };
      return { ...prev, [name]: value };
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !waterRef.current) return;
    setLoading(true);
    setError("");

    let apiError = "";
    let apiSettled = false;

    const apiPromise = fetch(`/api/hackathon/register/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) apiError = data.error || "Registration failed";
      })
      .catch(() => { apiError = "Something went wrong. Please try again."; })
      .finally(() => { apiSettled = true; });

    gsap.fromTo(waterRef.current, { yPercent: 100 }, {
      yPercent: 0, duration: 1.0, ease: "power3.inOut",
      onComplete: () => {
        void (async () => {
          if (!apiSettled) await apiPromise;
          if (apiError) {
            gsap.to(waterRef.current!, { yPercent: 100, duration: 1.2, ease: "power3.inOut" });
            setError(apiError);
            setLoading(false);
            return;
          }
          router.push("/hackathon/team");
        })();
      },
    });
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%", borderRadius: "0.75rem", padding: "0.75rem 1rem",
    outline: "none", transition: "all 0.3s",
    background: focused === name ? "#010D18" : "#010810",
    border: `1px solid ${focused === name ? "rgba(101,171,252,0.45)" : "rgba(100,150,200,0.2)"}`,
    boxShadow: focused === name ? "0 0 22px rgba(101,171,252,0.1), inset 0 0 22px rgba(101,171,252,0.03)" : "none",
    color: "#C0D8F0", caretColor: "#65ABFC",
  });

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}>
      <style jsx>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.06; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes twinkleBlue { 0%, 100% { opacity: 0.1; transform: scale(0.7); } 50% { opacity: 0.85; transform: scale(1.1); } }
        @keyframes floatA { 0% { transform: translateY(0) translateX(0); opacity: 0; } 8% { opacity: 1; } 82% { opacity: 0.6; } 100% { transform: translateY(-140px) translateX(22px); opacity: 0; } }
        @keyframes floatB { 0% { transform: translateY(0) translateX(0); opacity: 0; } 8% { opacity: 0.9; } 82% { opacity: 0.5; } 100% { transform: translateY(-180px) translateX(-18px); opacity: 0; } }
        @keyframes floatC { 0% { transform: translateY(0) translateX(0); opacity: 0; } 8% { opacity: 1; } 82% { opacity: 0.7; } 100% { transform: translateY(-110px) translateX(28px); opacity: 0; } }
        @keyframes wave1 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes wave2 { from { transform: translateX(-22%); } to { transform: translateX(-72%); } }
        @keyframes wave3 { from { transform: translateX(-12%); } to { transform: translateX(-62%); } }
        @keyframes shorePulse { 0%, 100% { opacity: 0.55; box-shadow: 0 0 18px 4px rgba(101,171,252,0.35); } 50% { opacity: 1; box-shadow: 0 0 28px 7px rgba(101,171,252,0.65); } }
        @keyframes ambientPulse { 0%, 100% { opacity: 0.045; } 50% { opacity: 0.09; } }
        @keyframes formBreath { 0%, 100% { box-shadow: 0 0 50px rgba(70,130,200,0.06), 0 30px 80px rgba(0,0,0,0.6); } 50% { box-shadow: 0 0 70px rgba(70,130,200,0.11), 0 30px 80px rgba(0,0,0,0.6); } }
        @keyframes titleGlow { 0%, 100% { filter: drop-shadow(0 0 12px rgba(101,171,252,0.28)); } 50% { filter: drop-shadow(0 0 24px rgba(101,171,252,0.55)); } }
        @keyframes btnPulse { 0%, 100% { box-shadow: 0 0 25px rgba(101,171,252,0.18), inset 0 0 25px rgba(101,171,252,0.04); } 50% { box-shadow: 0 0 40px rgba(101,171,252,0.32), inset 0 0 40px rgba(101,171,252,0.07); } }
        .star-white { animation: twinkle var(--dur) ease-in-out var(--delay) infinite; }
        .star-blue { animation: twinkleBlue var(--dur) ease-in-out var(--delay) infinite; }
        .p1 { animation: floatA var(--dur) ease-in var(--delay) infinite; }
        .p2 { animation: floatB var(--dur) ease-in var(--delay) infinite; }
        .p3 { animation: floatC var(--dur) ease-in var(--delay) infinite; }
        .w1 { animation: wave1 11s linear infinite; }
        .w2 { animation: wave2 7.5s linear infinite; }
        .w3 { animation: wave3 4.8s linear infinite; }
        .shore { animation: shorePulse 3.2s ease-in-out infinite; }
        .blob { animation: ambientPulse 7s ease-in-out infinite; }
        .form-card { animation: formBreath 4.5s ease-in-out infinite; }
        .bio-title { animation: titleGlow 3s ease-in-out infinite; }
        .bio-btn { animation: btnPulse 2.8s ease-in-out infinite; }
      `}</style>

      {stars.map((s) => (
        <div key={s.id} className={`absolute rounded-full pointer-events-none ${s.blue ? "star-blue" : "star-white"}`}
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, background: s.blue ? "#91C4E3" : "#FFFFFF", "--dur": `${s.duration}s`, "--delay": `${s.delay}s` } as React.CSSProperties} />
      ))}

      <div className="absolute blob rounded-full pointer-events-none" style={{ bottom: "-60px", left: "50%", transform: "translateX(-50%)", width: "1000px", height: "280px", background: "#65ABFC", filter: "blur(110px)" }} />

      {particles.map((p) => (
        <div key={p.id} className={`absolute rounded-full pointer-events-none p${p.variant}`}
          style={{ left: `${p.left}%`, bottom: `${p.bottom}%`, width: `${p.size}px`, height: `${p.size}px`, background: `hsl(${p.hue}, 100%, 70%)`, boxShadow: `0 0 ${p.size * 4}px ${p.size * 1.2}px hsl(${p.hue}, 100%, 58%)`, "--dur": `${p.duration}s`, "--delay": `${p.delay}s` } as React.CSSProperties} />
      ))}

      {/* Bottom waves */}
      <div className="fixed bottom-0 left-0 w-full pointer-events-none z-[20]" style={{ height: "220px" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #010E18 0%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 w1" style={{ width: "200%", height: "130px" }}>
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}><path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" /></svg>
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}><path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" /></svg>
        </div>
        <div className="absolute left-0 w-full shore" style={{ bottom: "30px", height: "1px", background: "#91C4E3" }} />
      </div>

      {/* Water overlay */}
      <div ref={waterRef} className="fixed inset-0 z-[200] pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #020C1A 0%, #0A1E38 20%, #122E5A 45%, #1E4A82 70%, #2A62A0 88%, #3A7CC0 100%)", overflow: "visible" }}>
        <div className="absolute left-0 shore" style={{ top: 0, width: "100%", height: "1px", background: "#91C4E3" }} />
      </div>

      <div className="relative z-[30] w-full max-w-lg px-6 py-10">
        {/* Invalid / expired */}
        {invalid && (
          <div className="rounded-2xl p-10 form-card text-center" style={{ background: "rgba(1,5,12,0.9)", border: "1px solid rgba(101,171,252,0.2)", backdropFilter: "blur(16px)" }}>
            <h1 className="text-2xl font-medium mb-3 bio-title font-[family-name:var(--font-mitr)]"
              style={{ background: "linear-gradient(130deg, #91C4E3 0%, #65ABFC 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ลิงก์ไม่ถูกต้อง
            </h1>
            <p className="text-sm font-[family-name:var(--font-mitr)]" style={{ color: "#3A5A70" }}>
              ลิงก์นี้ถูกใช้แล้วหรือหมดอายุแล้ว
            </p>
          </div>
        )}

        {/* Loading team info */}
        {!invalid && !team && (
          <p className="text-center text-sm font-[family-name:var(--font-mitr)]" style={{ color: "#3A5A70" }}>กำลังตรวจสอบลิงก์...</p>
        )}

        {/* Form */}
        {!invalid && team && (
          <div className="rounded-2xl p-8 form-card" style={{ background: "rgba(1,5,12,0.9)", border: "1px solid rgba(101,171,252,0.2)", backdropFilter: "blur(16px)" }}>
            <div className="mb-6">
              <p className="text-xs font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>คุณได้รับเชิญให้เข้าร่วม</p>
              <h1 className="text-2xl font-medium bio-title font-[family-name:var(--font-mitr)]"
                style={{ background: "linear-gradient(130deg, #91C4E3 0%, #65ABFC 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {team.name}
              </h1>
              <p className="text-xs mt-1 font-[family-name:var(--font-mitr)]" style={{ color: "#3A5A70" }}>
                {team.member_count}/5 สมาชิก · The Next Decade Hackathon 2026
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm font-[family-name:var(--font-mitr)]" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "#FF8080" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>ชื่อ-นามสกุล</label>
                <input name="name" value={form.name} onChange={handleChange} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} required style={inputStyle("name")} placeholder="ชื่อจริง นามสกุล" className="font-[family-name:var(--font-mitr)]" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>อีเมล</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} required style={inputStyle("email")} placeholder="example@email.com" className="font-[family-name:var(--font-mitr)]" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>เบอร์โทรศัพท์</label>
                <input name="phone" value={form.phone} onChange={handleChange} onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} required style={inputStyle("phone")} placeholder="08X-XXX-XXXX" className="font-[family-name:var(--font-mitr)]" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} required style={inputStyle("password")} placeholder="••••••••" className="font-[family-name:var(--font-mitr)]" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>สถาบันการศึกษา</label>
                <input name="university" value={form.university} onChange={handleChange} onFocus={() => setFocused("university")} onBlur={() => setFocused(null)} required style={inputStyle("university")} placeholder="ชื่อโรงเรียน / มหาวิทยาลัย" className="font-[family-name:var(--font-mitr)]" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>ระดับการศึกษา</label>
                <select name="track" value={form.track} onChange={handleChange} onFocus={() => setFocused("track")} onBlur={() => setFocused(null)} required style={{ ...inputStyle("track"), appearance: "none" }} className="font-[family-name:var(--font-mitr)]">
                  <option value="" disabled style={{ background: "#010810" }}>เลือกระดับการศึกษา</option>
                  {TRACKS.map((t) => <option key={t} value={t} style={{ background: "#010810" }}>{t}</option>)}
                </select>
              </div>
              {form.track && (
                <div>
                  <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>ชั้นปี / ระดับชั้น</label>
                  <select name="grade_level" value={form.grade_level} onChange={handleChange} onFocus={() => setFocused("grade_level")} onBlur={() => setFocused(null)} required style={{ ...inputStyle("grade_level"), appearance: "none" }} className="font-[family-name:var(--font-mitr)]">
                    <option value="" disabled style={{ background: "#010810" }}>เลือกชั้นปี</option>
                    {GRADES[form.track]?.map((g) => <option key={g} value={g} style={{ background: "#010810" }}>{g}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs mb-2 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>
                  ประสบการณ์ด้านเทคโนโลยี — <span style={{ color: "#65ABFC" }}>ระดับ {form.experience_level}</span>
                </label>
                <Slider min={1} max={5} step={1} value={[form.experience_level]} onValueChange={([v]) => { setForm((p) => ({ ...p, experience_level: v })); setError(""); }} />
                <div className="flex justify-between text-xs mt-1 font-[family-name:var(--font-mitr)]" style={{ color: "#2A3A50" }}>
                  <span>มือใหม่</span><span>เชี่ยวชาญ</span>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>รู้จักงานนี้จากที่ไหน</label>
                <select name="referral_source" value={form.referral_source} onChange={handleChange} onFocus={() => setFocused("referral_source")} onBlur={() => setFocused(null)} required style={{ ...inputStyle("referral_source"), appearance: "none" }} className="font-[family-name:var(--font-mitr)]">
                  <option value="" disabled style={{ background: "#010810" }}>เลือก</option>
                  {REFERRAL_SOURCES.map((r) => <option key={r} value={r} style={{ background: "#010810" }}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 font-[family-name:var(--font-mitr)]" style={{ color: "#4A7090" }}>แนะนำตัวเองสั้นๆ</label>
                <input name="bio" value={form.bio} onChange={handleChange} onFocus={() => setFocused("bio")} onBlur={() => setFocused(null)} required style={inputStyle("bio")} placeholder="ความสนใจ ทักษะ หรือสิ่งที่อยากทำในงานนี้" className="font-[family-name:var(--font-mitr)]" />
              </div>

              <button type="submit" disabled={loading} className="bio-btn mt-2 rounded-xl py-3 text-sm font-medium font-[family-name:var(--font-mitr)]"
                style={{ background: "linear-gradient(135deg, rgba(101,171,252,0.12) 0%, rgba(145,196,227,0.08) 100%)", border: "1px solid rgba(101,171,252,0.3)", color: loading ? "#3A5A70" : "#91C4E3", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "กำลังลงทะเบียน..." : `ลงทะเบียนและเข้าร่วม ${team.name} →`}
              </button>

              <p className="text-xs text-center font-[family-name:var(--font-mitr)]" style={{ color: "#2A3A50" }}>
                ลงทะเบียนแล้วใช่ไหม?{" "}
                <button type="button" onClick={() => router.push("/hackathon/login")} className="transition-colors hover:underline" style={{ color: "#65ABFC" }}>
                  เข้าสู่ระบบ
                </button>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
