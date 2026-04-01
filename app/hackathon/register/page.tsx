"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Slider } from "@/components/ui/slider";



const TRACKS = [
  "นักเรียนมัธยมปลาย หรือเทียบเท่า",
  "นักศึกษามหาวิทยาลัย",
];

const REFERRAL_SOURCES = [
  "Facebook",
  "Instagram",
  "TikTok",
  "X (Twitter)",
  "เพื่อนแนะนำ",
  "ครู/อาจารย์แนะนำ",
  "อื่นๆ",
];

// Education levels and grades
const GRADES: Record<string, string[]> = {
  "นักเรียนมัธยมปลาย หรือเทียบเท่า": ["ม.4", "ม.5", "ม.6", "ปวช.", "อื่นๆ"],
  "นักศึกษามหาวิทยาลัย": ["ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"],
};

type Particle = {
  id: number;
  left: number;
  bottom: number;
  size: number;
  delay: number;
  duration: number;
  variant: 1 | 2 | 3;
  hue: number;
};

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  blue: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const waterRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    university: "",
    track: "",
    grade_level: "",
    experience_level: 1,
    referral_source: "",
    bio: "",
  });

  /* 
    Move random generation to useEffect to avoid hydration mismatch.
    Server/Client initial render will have empty arrays.
    Client useEffect will populate them.
  */
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      bottom: Math.random() * 55,
      size: Math.random() * 3.5 + 0.6,
      delay: Math.random() * 14,
      duration: Math.random() * 9 + 6,
      variant: ((i % 3) + 1) as 1 | 2 | 3,
      hue: Math.floor(Math.random() * 25) + 205,
    })));
  }, []);

  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    setStars(Array.from({ length: 160 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 65,
      size: Math.random() * 1.8 + 0.3,
      delay: Math.random() * 7,
      duration: Math.random() * 3.5 + 1.8,
      blue: Math.random() > 0.7,
    })));
  }, []);

  useEffect(() => {
    if (!waterRef.current) return;
    // Water covers screen on load, then recedes down below the viewport
    gsap.to(waterRef.current, { yPercent: 100, duration: 1.5, ease: "power3.inOut", delay: 0.15 });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      // Reset grade level if track changes
      if (name === "track" && value !== prev.track) {
        return { ...prev, [name]: value, grade_level: "" };
      }
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

    const apiPromise = fetch("/api/hackathon/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) apiError = data.error || "Registration failed";
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        apiError = "Something went wrong. Please try again.";
      })
      .finally(() => { apiSettled = true; });

    // Rise from below viewport to cover screen, then navigate
    gsap.fromTo(waterRef.current,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 1.0,
        ease: "power3.inOut",
        onComplete: () => {
          void (async () => {
            if (!apiSettled) await apiPromise;
            if (apiError) {
              gsap.to(waterRef.current!, { yPercent: 100, duration: 1.2, ease: "power3.inOut" });
              setError(apiError);
              setLoading(false);
              return;
            }
            router.push("/hackathon/line-oa");
          })();
        },
      }
    );
  };

  const handleBack = () => {
    sessionStorage.setItem("hackathon_skip_intro", "1");
    router.push("/hackathon");
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    outline: "none",
    transition: "all 0.3s",
    background: focused === name ? "#010D18" : "#010810",
    border: `1px solid ${focused === name ? "rgba(101,171,252,0.45)" : "rgba(100,150,200,0.2)"}`,
    boxShadow: focused === name
      ? "0 0 22px rgba(101,171,252,0.1), inset 0 0 22px rgba(101,171,252,0.03)"
      : "none",
    color: "#C0D8F0",
    caretColor: "#65ABFC",
  });

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.06; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes twinkleBlue {
          0%, 100% { opacity: 0.1; transform: scale(0.7); }
          50% { opacity: 0.85; transform: scale(1.1); }
        }
        @keyframes floatA {
          0%   { transform: translateY(0) translateX(0);   opacity: 0; }
          8%   { opacity: 1; }
          82%  { opacity: 0.6; }
          100% { transform: translateY(-140px) translateX(22px); opacity: 0; }
        }
        @keyframes floatB {
          0%   { transform: translateY(0) translateX(0);   opacity: 0; }
          8%   { opacity: 0.9; }
          82%  { opacity: 0.5; }
          100% { transform: translateY(-180px) translateX(-18px); opacity: 0; }
        }
        @keyframes floatC {
          0%   { transform: translateY(0) translateX(0);   opacity: 0; }
          8%   { opacity: 1; }
          82%  { opacity: 0.7; }
          100% { transform: translateY(-110px) translateX(28px); opacity: 0; }
        }
        @keyframes wave1 {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes wave2 {
          from { transform: translateX(-22%); }
          to   { transform: translateX(-72%); }
        }
        @keyframes wave3 {
          from { transform: translateX(-12%); }
          to   { transform: translateX(-62%); }
        }
        @keyframes waveShift {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes shorePulse {
          0%, 100% {
            opacity: 0.55;
            box-shadow: 0 0 18px 4px rgba(101,171,252,0.35), 0 0 40px 10px rgba(145,196,227,0.15);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 28px 7px rgba(101,171,252,0.65), 0 0 60px 18px rgba(145,196,227,0.3);
          }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.045; }
          50% { opacity: 0.09; }
        }
        @keyframes formBreath {
          0%, 100% {
            box-shadow: 0 0 50px rgba(70,130,200,0.06), 0 30px 80px rgba(0,0,0,0.6),
                        inset 0 0 40px rgba(70,130,200,0.02);
          }
          50% {
            box-shadow: 0 0 70px rgba(70,130,200,0.11), 0 30px 80px rgba(0,0,0,0.6),
                        inset 0 0 60px rgba(70,130,200,0.04);
          }
        }
        @keyframes titleGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(101,171,252,0.28)); }
          50%       { filter: drop-shadow(0 0 24px rgba(101,171,252,0.55)); }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 25px rgba(101,171,252,0.18), inset 0 0 25px rgba(101,171,252,0.04); }
          50%       { box-shadow: 0 0 40px rgba(101,171,252,0.32), inset 0 0 40px rgba(101,171,252,0.07); }
        }

        .star-white { animation: twinkle var(--dur) ease-in-out var(--delay) infinite; }
        .star-blue  { animation: twinkleBlue var(--dur) ease-in-out var(--delay) infinite; }
        .p1 { animation: floatA var(--dur) ease-in var(--delay) infinite; }
        .p2 { animation: floatB var(--dur) ease-in var(--delay) infinite; }
        .p3 { animation: floatC var(--dur) ease-in var(--delay) infinite; }
        .w1 { animation: wave1 11s linear infinite; }
        .w2 { animation: wave2 7.5s linear infinite; }
        .w3 { animation: wave3 4.8s linear infinite; }
        .shore { animation: shorePulse 3.2s ease-in-out infinite; }
        .blob  { animation: ambientPulse 7s ease-in-out infinite; }
        .form-card { animation: formBreath 4.5s ease-in-out infinite; }
        .bio-title { animation: titleGlow 3s ease-in-out infinite; }
        .bio-btn   { animation: btnPulse 2.8s ease-in-out infinite; }
      `}</style>

      {/* ── Stars ── */}
      {stars.map((s) => (
        <div
          key={s.id}
          className={`absolute rounded-full pointer-events-none ${s.blue ? "star-blue" : "star-white"}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: s.blue ? "#91C4E3" : "#FFFFFF",
            "--dur": `${s.duration}s`,
            "--delay": `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Ambient glow blobs ── */}
      <div
        className="absolute blob rounded-full pointer-events-none"
        style={{
          bottom: "-60px", left: "50%", transform: "translateX(-50%)",
          width: "1000px", height: "280px",
          background: "#65ABFC", filter: "blur(110px)",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute blob rounded-full pointer-events-none"
        style={{
          bottom: "20%", left: "20%",
          width: "420px", height: "180px",
          background: "#3A5A8C", filter: "blur(130px)",
          animationDelay: "2s",
        }}
      />
      <div
        className="absolute blob rounded-full pointer-events-none"
        style={{
          top: "30%", right: "25%",
          width: "320px", height: "140px",
          background: "#4A80B8", filter: "blur(100px)",
          animationDelay: "3.5s",
        }}
      />

      {/* ── Bioluminescent particles ── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full pointer-events-none p${p.variant}`}
          style={{
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `hsl(${p.hue}, 100%, 70%)`,
            boxShadow: `0 0 ${p.size * 4}px ${p.size * 1.2}px hsl(${p.hue}, 100%, 58%)`,
            "--dur": `${p.duration}s`,
            "--delay": `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Decorative bottom waves — always visible, below form ── */}
      <div className="fixed bottom-0 left-0 w-full pointer-events-none z-[20]" style={{ height: "220px" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #010E18 0%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 w1" style={{ width: "200%", height: "130px" }}>
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 6px rgba(100,160,230,0.5))" }}>
            <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
          </svg>
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 6px rgba(100,160,230,0.5))" }}>
            <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w2" style={{ width: "200%", height: "95px" }}>
          <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 10px rgba(145,196,227,0.6))" }}>
            <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
          </svg>
          <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 10px rgba(145,196,227,0.6))" }}>
            <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w3" style={{ width: "200%", height: "65px" }}>
          <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.75)) drop-shadow(0 0 30px rgba(145,196,227,0.4))" }}>
            <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
          </svg>
          <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.75)) drop-shadow(0 0 30px rgba(145,196,227,0.4))" }}>
            <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
          </svg>
        </div>
        <div className="absolute left-0 w-full shore" style={{ bottom: "30px", height: "1px", background: "#91C4E3" }} />
      </div>

      {/* ── Water transition overlay — z-[200], slides off below */}
      <div
        ref={waterRef}
        className="fixed inset-0 z-[200] pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, #020C1A 0%, #0A1E38 20%, #122E5A 45%, #1E4A82 70%, #2A62A0 88%, #3A7CC0 100%)",
          overflow: "visible",
        }}
      >
        <div style={{ position: "absolute", top: "25%", left: "25%", width: "500px", height: "250px", background: "#65ABFC", filter: "blur(140px)", opacity: 0.07, borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "60%", right: "15%", width: "350px", height: "180px", background: "#91C4E3", filter: "blur(120px)", opacity: 0.06, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "200px", background: "#65ABFC", filter: "blur(90px)", opacity: 0.12, borderRadius: "50%" }} />
        {/* Wave crest at the top of the rising water */}
        <div className="absolute left-0 w2" style={{ top: "-80px", width: "200%", height: "80px" }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.8))" }}>
            <path d="M0,40 C180,72 360,8 540,40 C720,72 900,8 1080,40 C1260,72 1440,8 1440,40 L1440,80 L0,80 Z" fill="rgba(145,196,227,0.7)" />
          </svg>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.8))" }}>
            <path d="M0,40 C180,72 360,8 540,40 C720,72 900,8 1080,40 C1260,72 1440,8 1440,40 L1440,80 L0,80 Z" fill="rgba(145,196,227,0.7)" />
          </svg>
        </div>
        <div className="absolute left-0 shore" style={{ top: 0, width: "100%", height: "1px", background: "#91C4E3" }} />
      </div>

      {/* ── Closed Notice ── */}
      <div ref={formRef} className="relative z-[30] w-full max-w-lg px-6 py-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm mb-8 transition-all duration-300 hover:gap-3"
          style={{ color: "#65ABFC", textShadow: "0 0 12px rgba(101,171,252,0.5)" }}
        >
          ← Back
        </button>

        <div
          className="rounded-2xl p-10 form-card text-center"
          style={{
            background: "rgba(1, 5, 12, 0.9)",
            border: "1px solid rgba(101,171,252,0.2)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: "72px",
                height: "72px",
                background: "rgba(101,171,252,0.07)",
                border: "1px solid rgba(101,171,252,0.18)",
                boxShadow: "0 0 30px rgba(101,171,252,0.12)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#65ABFC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>

          <h1
            className="text-3xl font-medium mb-3 bio-title font-[family-name:var(--font-mitr)]"
            style={{
              background: "linear-gradient(130deg, #91C4E3 0%, #65ABFC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ปิดรับลงทะเบียนแล้ว
          </h1>

          <p className="text-sm mb-2 font-[family-name:var(--font-mitr)]" style={{ color: "#7AAED0" }}>
            The Next Decade Hackathon 2026
          </p>

          <p className="text-sm mb-8 font-[family-name:var(--font-mitr)]" style={{ color: "#3A5A70" }}>
            ขออภัย การลงทะเบียนสำหรับงานนี้ได้ปิดรับแล้ว
          </p>

          <p className="text-xs font-[family-name:var(--font-mitr)]" style={{ color: "#2A3A50" }}>
            ลงทะเบียนแล้วใช่ไหม?{" "}
            <button
              onClick={() => router.push("/hackathon/login")}
              className="transition-colors hover:underline font-[family-name:var(--font-mitr)]"
              style={{ color: "#65ABFC" }}
            >
              เข้าสู่ระบบ
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
