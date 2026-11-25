"use client";

import { useEffect, useRef, useState } from "react";

export default function RegistrationClosedPage() {
  const starsRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  // Stars — same approach as LandingPage
  useEffect(() => {
    if (!starsRef.current) return;
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      star.className = "absolute rounded-full bg-white";
      const size = Math.random() * 2 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.opacity = `${Math.random() * 0.7 + 0.3}`;
      star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite ease-in-out`;
      starsRef.current.appendChild(star);
    }
  }, []);

  // Count-up to 872 sign-ups
  useEffect(() => {
    const target = 872;
    const duration = 1800;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#03050a" }}
    >
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0);    }
          50%       { transform: translateY(-18px); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: scaleX(-1) translateY(0);    }
          50%       { transform: scaleX(-1) translateY(-14px); }
        }
        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(145,196,227,0.3)); }
          50%       { filter: drop-shadow(0 0 60px rgba(145,196,227,0.6)); }
        }
        @keyframes cardBreath {
          0%, 100% { box-shadow: 0 0 0 1px rgba(101,171,252,0.12), inset 0 0 40px rgba(101,171,252,0.03); }
          50%       { box-shadow: 0 0 0 1px rgba(101,171,252,0.25), inset 0 0 60px rgba(101,171,252,0.07); }
        }
        @keyframes numberGlow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(145,196,227,0.4)); }
          50%       { filter: drop-shadow(0 0 40px rgba(145,196,227,0.75)); }
        }
        .logo-glow   { animation: logoGlow   3s ease-in-out infinite; }
        .card-breath { animation: cardBreath  4s ease-in-out infinite; }
        .num-glow    { animation: numberGlow  2.5s ease-in-out infinite; }
        .jelly-left  { animation: float        6s ease-in-out infinite; }
        .jelly-right { animation: floatReverse 9s ease-in-out infinite; }
        .jelly-bl    { animation: float        11s ease-in-out 1s infinite; }
        .jelly-br    { animation: float        8s ease-in-out 2s infinite; }
      `}</style>

      {/* ── 4:5 IG ratio card ── */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "min(100vw, calc(100vh * 4/5))",
          aspectRatio: "4 / 5",
          background: "#03050a",
        }}
      >
        {/* Starfield */}
        <div ref={starsRef} className="absolute inset-0 pointer-events-none" />

        {/* Subtle ambient glow — matches landing page */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "10%", left: "50%", transform: "translateX(-50%)",
            width: "70%", height: "40%",
            background: "radial-gradient(ellipse, rgba(20,50,130,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Jellyfish — top left (flipped) */}
        <div className="jelly-left absolute top-[3%] -left-[6%] pointer-events-none z-10">
          <img
            src="/hackathon/Creature/Jellyfish 1.svg"
            alt=""
            style={{ width: "clamp(100px, 22%, 180px)", height: "auto", filter: "drop-shadow(0 0 40px rgba(145,196,227,0.3))", transform: "scaleX(-1)" }}
          />
        </div>

        {/* Jellyfish — top right (normal) */}
        <div className="jelly-right absolute top-[6%] -right-[6%] pointer-events-none z-10">
          <img
            src="/hackathon/Creature/Jellyfish 1.svg"
            alt=""
            style={{ width: "clamp(120px, 26%, 210px)", height: "auto", filter: "drop-shadow(0 0 40px rgba(165,148,186,0.3))" }}
          />
        </div>

        {/* Small Jelly — bottom left (normal) */}
        <div className="jelly-bl absolute bottom-[4%] left-[2%] pointer-events-none z-10">
          <img
            src="/hackathon/Creature/Small Jelly.svg"
            alt=""
            style={{ width: "clamp(60px, 14%, 110px)", height: "auto", filter: "drop-shadow(0 0 12px rgba(165,148,186,0.4))", transform: "rotate(-10deg)" }}
          />
        </div>

        {/* Clione — bottom right (flipped) */}
        <div className="jelly-br absolute bottom-[3%] right-[3%] pointer-events-none z-10">
          <img
            src="/hackathon/Creature/Clione.svg"
            alt=""
            style={{ width: "clamp(50px, 11%, 90px)", height: "auto", filter: "drop-shadow(0 0 16px rgba(145,196,227,0.4))", transform: "scaleX(-1) rotate(25deg)" }}
          />
        </div>

        {/* ── Main content ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[8%] text-center z-10">

          {/* HackLogo */}
          <div className="logo-glow mb-[2%] flex justify-center w-full">
            <img
              src="/hackathon/HackLogo.png"
              alt="The Next Decade"
              style={{ width: "80%", height: "auto", objectFit: "contain" }}
            />
          </div>

          <h2
            className="font-bold text-white mb-[2%]"
            style={{
              fontSize: "clamp(0.9rem, 3vw, 2rem)",
              textShadow: "0 0 20px rgba(145,196,227,0.3)",
              fontFamily: "var(--font-poppins), sans-serif",
            }}
          >
            Registration Closed
          </h2>

          {/* Divider */}
          <div className="w-1 h-1 rounded-full mb-[2%]" style={{ background: "rgba(255,255,255,0.25)" }} />

          {/* Counter card */}
          <div
            className="card-breath rounded-2xl flex flex-col items-center justify-center"
            style={{
              width: "65%",
              paddingTop: "5%",
              paddingBottom: "5%",
              background: "rgba(3,5,10,0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(101,171,252,0.12)",
            }}
          >
            <div className="num-glow flex items-end gap-[1%] leading-none mb-[3%]">
              <span
                className="font-black tabular-nums"
                style={{
                  fontSize: "clamp(3rem, 13vw, 9rem)",
                  background: "linear-gradient(135deg, #c8e4ff 0%, #91C4E3 50%, #65ABFC 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "'Arial Black', sans-serif",
                  lineHeight: 1,
                }}
              >
                {count}
              </span>
            </div>
            <p
              className="tracking-widest font-semibold"
              style={{
                fontSize: "clamp(0.45rem, 1.3vw, 0.8rem)",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.22em",
                fontFamily: "var(--font-poppins), sans-serif",
              }}
            >
              PARTICIPANTS REGISTERED
            </p>
          </div>

          {/* Thai thank-you */}
          <p
            className="mt-[3%] font-semibold leading-relaxed"
            style={{
              fontSize: "clamp(0.75rem, 2vw, 1.3rem)",
              color: "rgba(255,255,255,0.8)",
              textShadow: "0 0 20px rgba(145,196,227,0.2)",
              fontFamily: "var(--font-noto-sans-thai), sans-serif",
            }}
          >
            ขอบคุณผู้สมัครทุกคน<br />
            และยินดีต้อนรับสู่การเดินทางครั้งนี้
          </p>
        </div>
      </div>
    </div>
  );
}
