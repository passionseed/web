"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

export default function CelebrationPage() {
    const starsRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const [mounted, setMounted] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Stars
    useEffect(() => {
        if (!starsRef.current) return;
        const starCount = isMobile ? 40 : 120;
        starsRef.current.innerHTML = "";
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement("div");
            star.className = "absolute rounded-full bg-white";
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.opacity = `${Math.random() * 0.7 + 0.3}`;
            if (!isMobile) {
                star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite ease-in-out`;
            }
            starsRef.current.appendChild(star);
        }
    }, [isMobile]);

    // Entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setShowContent(true), 200);
        return () => clearTimeout(timer);
    }, []);

    // Count-up animation for 800
    useEffect(() => {
        if (!showContent || !countRef.current) return;
        const el = countRef.current;
        const target = 800;
        const duration = 2200;
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out expo
            const eased = 1 - Math.pow(1 - progress, 4);
            el.textContent = Math.round(eased * target).toString();
            if (progress < 1) requestAnimationFrame(tick);
        };
        const raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [showContent]);

    return (
        <>
        <div className="min-h-screen bg-[#03050a] text-white relative [overflow:clip] font-[family-name:var(--font-poppins)]">
            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
                @keyframes float {
                    0%, 100% { transform: translate3d(0, 0, 0); }
                    50% { transform: translate3d(10px, -20px, 0); }
                }
                @keyframes floatReverse {
                    0%, 100% { transform: translate3d(0, 0, 0); }
                    50% { transform: translate3d(-10px, 20px, 0); }
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translate3d(0, 0, 0); }
                    50% { transform: translate3d(6px, -14px, 0); }
                }
                @keyframes jellyfishGlowBlue {
                    0%   { opacity: 0; filter: drop-shadow(0 0 80px rgba(145,196,227,1)); }
                    50%  { opacity: 1; filter: drop-shadow(0 0 50px rgba(145,196,227,0.9)); }
                    100% { opacity: 1; filter: drop-shadow(0 0 20px rgba(145,196,227,0.4)); }
                }
                @keyframes jellyfishGlowPurple {
                    0%   { opacity: 0; filter: drop-shadow(0 0 80px rgba(165,148,186,1)); }
                    50%  { opacity: 1; filter: drop-shadow(0 0 50px rgba(165,148,186,0.8)); }
                    100% { opacity: 1; filter: drop-shadow(0 0 24px rgba(165,148,186,0.35)); }
                }
                @keyframes numberGlow {
                    0% { opacity: 0; transform: scale(0.85); filter: brightness(0.5) blur(8px); }
                    50% { filter: brightness(1.8) blur(0px) drop-shadow(0 0 60px rgba(145,196,227,1)); }
                    100% { opacity: 1; transform: scale(1); filter: brightness(1) blur(0px) drop-shadow(0 0 30px rgba(145,196,227,0.7)); }
                }
                @keyframes fadeUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmerLine {
                    0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
                    50% { opacity: 1; transform: scaleX(1); }
                }
                @keyframes pulseBadge {
                    0%, 100% { box-shadow: 0 0 12px 3px rgba(101,171,252,0.3); }
                    50% { box-shadow: 0 0 24px 8px rgba(101,171,252,0.6); }
                }
                .animate-numberGlow { animation: numberGlow 1.4s ease-out forwards; }
                .animate-fadeUp { animation: fadeUp 0.8s ease-out forwards; }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-floatReverse { animation: floatReverse 9s ease-in-out infinite; }
                .animate-floatSlow { animation: floatSlow 11s ease-in-out infinite; }
                .animate-jellyfishBlue { animation: jellyfishGlowBlue 1.2s ease-out forwards, float 6s ease-in-out infinite; }
                .animate-jellyfishPurple { animation: jellyfishGlowPurple 1.2s ease-out forwards, floatReverse 9s ease-in-out infinite; }
                .animate-jellyfishSmall { animation: jellyfishGlowBlue 1.4s ease-out forwards, floatSlow 11s ease-in-out infinite; }
                .animate-shimmerLine { animation: shimmerLine 3s ease-in-out infinite; }
                .animate-pulseBadge { animation: pulseBadge 3.1s ease-in-out infinite; }
            `}</style>

            {/* Starfield */}
            <div
                ref={starsRef}
                className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${showContent ? "opacity-100" : "opacity-0"}`}
            />


            {/* Ambient glow blobs */}
            <div className={`absolute top-40 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] blur-[150px] rounded-full pointer-events-none transition-opacity duration-1000 ${showContent ? "opacity-[0.05]" : "opacity-0"}`} />
            <div className={`absolute top-60 right-1/3 w-[400px] h-[400px] bg-[#A594BA] blur-[150px] rounded-full pointer-events-none transition-opacity duration-1000 ${showContent ? "opacity-[0.05]" : "opacity-0"}`} />
            <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#65ABFC] blur-[120px] rounded-full pointer-events-none transition-opacity duration-1000 ${showContent ? "opacity-[0.06]" : "opacity-0"}`} />

            {/* Jellyfish — top left */}
            {showContent && (
                <div className="absolute top-10 -left-10 pointer-events-none z-[45] animate-jellyfishBlue">
                    <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-64 h-64" loading="lazy" decoding="async" />
                </div>
            )}

            {/* Jellyfish — top right */}
            {showContent && (
                <div className="absolute top-32 -right-16 pointer-events-none z-[45] animate-jellyfishPurple">
                    <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-80 h-80" style={{ transform: "scaleX(-1)" }} loading="lazy" decoding="async" />
                </div>
            )}

            {/* Clione — bottom right */}
            {showContent && !isMobile && (
                <div className="absolute bottom-24 right-8 pointer-events-none z-[45] animate-jellyfishSmall">
                    <img src="/hackathon/Creature/Clione.svg" alt="" className="w-24 h-24 opacity-60" style={{ filter: "drop-shadow(0 0 14px rgba(145,196,227,0.5))" }} loading="lazy" decoding="async" />
                </div>
            )}

            {/* Small Jelly — bottom left */}
            {showContent && !isMobile && (
                <div className="absolute bottom-32 left-12 pointer-events-none z-[45] animate-floatSlow">
                    <img src="/hackathon/Creature/Small Jelly.svg" alt="" className="w-20 h-20 opacity-50" style={{ filter: "drop-shadow(0 0 10px rgba(165,148,186,0.5))" }} loading="lazy" decoding="async" />
                </div>
            )}

            {/* Main content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
                <div className="text-center max-w-3xl mx-auto space-y-8">

                    {/* Hackathon logo */}
                    {showContent && (
                        <div className="flex justify-center animate-fadeUp" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
                            <img
                                src="/hackathon/HackLogo.png"
                                alt="The Next Decade Hackathon"
                                className="w-full max-w-sm md:max-w-md h-auto"
                                style={{ filter: "drop-shadow(0 0 30px rgba(145,196,227,0.3))" }}
                            />
                        </div>
                    )}

                    {/* Handwritten subtitle */}
                    {showContent && (
                        <p
                            className="text-4xl md:text-5xl font-medium text-white animate-fadeUp"
                            style={{
                                animationDelay: "0.5s",
                                animationFillMode: "both",
                                textShadow: "0 0 30px rgba(145,196,227,0.4)",
                            }}
                        >
                            Registration Closed
                        </p>
                    )}

                    {/* Divider shimmer */}
                    {showContent && (
                        <div className="flex items-center justify-center gap-4 animate-fadeUp" style={{ animationDelay: "0.7s", animationFillMode: "both" }}>
                            <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#91C4E3] animate-shimmerLine" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[#91C4E3]" style={{ boxShadow: "0 0 8px rgba(145,196,227,0.8)" }} />
                            <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#91C4E3] animate-shimmerLine" />
                        </div>
                    )}

                    {/* 800 counter */}
                    {showContent && (
                        <div
                            className="animate-fadeUp"
                            style={{ animationDelay: "0.9s", animationFillMode: "both" }}
                        >
                            <div
                                className="inline-flex flex-col items-center gap-2 px-10 py-8 rounded-2xl"
                                style={{
                                    background: "linear-gradient(135deg, rgba(145,196,227,0.06) 0%, rgba(101,171,252,0.04) 100%)",
                                    border: "1px solid rgba(145,196,227,0.15)",
                                    boxShadow: "0 0 60px rgba(101,171,252,0.08), inset 0 1px 0 rgba(145,196,227,0.1)",
                                }}
                            >
                                <div className="flex items-end gap-1">
                                    <span
                                        ref={countRef}
                                        className="text-8xl md:text-9xl font-bold leading-none animate-numberGlow"
                                        style={{
                                            animationDelay: "1.1s",
                                            animationFillMode: "both",
                                            background: "linear-gradient(180deg, #ffffff 0%, #91C4E3 60%, #65ABFC 100%)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            backgroundClip: "text",
                                            fontFeatureSettings: '"tnum"',
                                        }}
                                    >
                                        0
                                    </span>
                                    <span
                                        className="text-3xl md:text-4xl font-semibold mb-3 text-[#91C4E3]"
                                        style={{ textShadow: "0 0 20px rgba(145,196,227,0.6)" }}
                                    >
                                        +
                                    </span>
                                </div>
                                <p
                                    className="text-sm md:text-base tracking-[0.2em] uppercase text-[#91C4E3]/70 font-medium"
                                >
                                    Participants Registered
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Thank you message */}
                    {showContent && (
                        <div
                            className="space-y-3 animate-fadeUp"
                            style={{ animationDelay: "1.3s", animationFillMode: "both" }}
                        >
                            <p className="text-2xl md:text-3xl text-white/80 leading-relaxed font-[family-name:var(--font-noto-sans-thai)]">
                                ขอบคุณผู้สมัครทุกคน<br />และยินดีต้อนรับสู่การเดินทางครั้งนี้
                            </p>
                        </div>
                    )}


                </div>
            </div>
        </div>

        {/* Partner logos — portal to bypass overflow:clip */}
        {mounted && createPortal(
            <div
                className="fixed top-6 right-6 z-[9999] flex items-center gap-3"
                style={{ opacity: showContent ? 1 : 0, transition: "opacity 1000ms" }}
            >
                <div className="w-12 h-12 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity">
                    <img src="/hackathon/PS.png" alt="PS Logo" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity">
                    <img src="/hackathon/StemLike.png" alt="STEM Like Her Logo" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="w-12 h-12 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity">
                    <img src="/hackathon/AMSA.png" alt="AMSA Logo" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                </div>
            </div>,
            document.body
        )}
        </>
    );
}
