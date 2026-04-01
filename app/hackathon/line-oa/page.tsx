"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Image from "next/image";

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

export default function LineOAPage() {
  const router = useRouter();
  const waterRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
    gsap.to(waterRef.current, { yPercent: 100, duration: 1.5, ease: "power3.inOut", delay: 0.15 });
  }, []);

  const handleNext = () => {
    if (!waterRef.current) return;

    gsap.fromTo(waterRef.current,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 1.0,
        ease: "power3.inOut",
        onComplete: () => {
          router.push("/hackathon/dashboard");
        },
      }
    );
  };

  const handleAddLine = () => {
    // Open Line group link in new tab
    window.open("https://line.me/ti/g2/5prSQrsDW52jlyXOWzmuQwIw7MB31rA1fL4DzA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default", "_blank");
  };

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

      {/* Stars */}
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

      {/* Ambient glow blobs */}
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

      {/* Bioluminescent particles */}
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

      {/* Decorative bottom waves */}
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

      {/* Water transition overlay */}
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

      {/* Content */}
      <div ref={cardRef} className="relative z-[30] w-full max-w-md px-6 py-10">
        <div
          className="rounded-2xl p-8 form-card"
          style={{
            background: "rgba(1, 5, 12, 0.9)",
            border: "1px solid rgba(101,171,252,0.2)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="mb-7 text-center">
            <h1
              className="text-3xl font-medium mb-3 bio-title font-[family-name:var(--font-mitr)]"
              style={{
                background: "linear-gradient(130deg, #91C4E3 0%, #65ABFC 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              เข้าร่วม Line Official Account
            </h1>
            <p className="text-sm font-[family-name:var(--font-mitr)]" style={{ color: "#7AAED0" }}>
              สแกน QR Code หรือคลิกปุ่มด้านล่างเพื่อเพิ่มเพื่อนและรับข่าวสารล่าสุดจากงาน
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "white",
                padding: "1rem",
                boxShadow: "0 0 40px rgba(101,171,252,0.2)",
              }}
            >
              <Image
                src="/hackathon/LineQR.jpg"
                alt="Line OA QR Code"
                width={240}
                height={240}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAddLine}
              className="w-full rounded-full text-sm font-medium uppercase tracking-widest transition-all duration-300 bio-btn font-[family-name:var(--font-mitr)]"
              style={{
                padding: "0.875rem 1rem",
                background: "linear-gradient(135deg, rgba(6,219,99,0.15), rgba(0,195,0,0.15))",
                border: "1px solid rgba(6,219,99,0.4)",
                color: "#06DB63",
                letterSpacing: "0.18em",
                textShadow: "0 0 12px rgba(6,219,99,0.5)",
              }}
            >
              เพิ่มเพื่อน Line OA
            </button>

            <button
              onClick={handleNext}
              className="w-full rounded-full text-sm font-medium uppercase tracking-widest transition-all duration-300 bio-btn font-[family-name:var(--font-mitr)]"
              style={{
                padding: "0.875rem 1rem",
                background: "linear-gradient(135deg, rgba(101,171,252,0.12), rgba(145,196,227,0.12))",
                border: "1px solid rgba(101,171,252,0.38)",
                color: "#91C4E3",
                letterSpacing: "0.18em",
                textShadow: "0 0 12px rgba(101,171,252,0.5)",
              }}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
