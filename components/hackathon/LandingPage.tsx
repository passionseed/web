"use client";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Clock, UsersRound, Microscope, BookOpenCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import HackathonTimeline from "@/components/HackathonTimeline";

interface LandingPageProps {
    isLoggedIn: boolean;
}

export default function LandingPage({ isLoggedIn }: LandingPageProps) {
    const router = useRouter();
    const starsRef = useRef<HTMLDivElement>(null);
    const subtitleRef = useRef<HTMLHeadingElement>(null);
    const waterRef = useRef<HTMLDivElement>(null);
    const [expandedTrack, setExpandedTrack] = useState<number | null>(null);

    // Set initial water position via DOM directly so React's style prop never owns
    // the transform — this prevents React re-renders from resetting GSAP mid-animation
    // Set initial water position using GSAP to ensure state tracking consistency
    const setWaterRef = useCallback((el: HTMLDivElement | null) => {
        waterRef.current = el;
        if (el) {
            // Start with y: 200 to ensure the waves (which extend ~130px above) are hidden below viewport
            gsap.set(el, { yPercent: 100, y: 200, autoAlpha: 1 });
        }
    }, []);
    const [showTitle, setShowTitle] = useState(false);
    const [showJellyfish, setShowJellyfish] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [instant, setInstant] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleRegister = () => {
        if (isTransitioning || !waterRef.current) return;
        setIsTransitioning(true);

        const targetPath = isLoggedIn ? "/hackathon/team" : "/hackathon/register";

        const tl = gsap.timeline();

        // Water rises to fill screen
        tl.fromTo(
            waterRef.current,
            { yPercent: 100, y: 200 },
            { yPercent: 0, y: 0, duration: 0.9, ease: "power3.inOut" }
        )
            // Hold briefly at peak, then navigate
            // Target pages (register, team dashboard) will handle the start of their own transitions
            .call(() => router.push(targetPath));
    };

    // Lock scroll during opening animation
    useEffect(() => {
        if (!showContent && !instant) {
            // Lock scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll
            document.body.style.overflow = '';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [showContent, instant]);

    useEffect(() => {
        // If coming back from register page, skip animation
        if (sessionStorage.getItem("hackathon_skip_intro")) {
            sessionStorage.removeItem("hackathon_skip_intro");
            setInstant(true);
            setShowTitle(true);
            setShowJellyfish(true);
            setShowContent(true);
            if (subtitleRef.current) {
                gsap.set(subtitleRef.current, { clipPath: "inset(0 0% 0 0)" });
            }
            return;
        }

        if (!subtitleRef.current) return;

        // Step 1: title glow starts immediately
        setShowTitle(true);

        // Step 2: after title glow finishes (~1.2s), start handwriting
        const writeTimer = setTimeout(() => {
            gsap.fromTo(
                subtitleRef.current,
                { clipPath: "inset(0 100% 0 0)" },
                {
                    clipPath: "inset(0 0% 0 0)",
                    duration: 2,
                    ease: "power2.inOut",
                    onComplete: () => {
                        setShowJellyfish(true);
                        setTimeout(() => setShowContent(true), 900);
                    },
                }
            );
        }, 700);

        return () => {
            clearTimeout(writeTimer);
        };
    }, []);

    useEffect(() => {
        // Generate random stars
        if (starsRef.current) {
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
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#03050a] text-white relative [overflow:clip]">
            {/* Black overlay that fades out */}
            <div
                className={`fixed inset-0 bg-black z-40 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            />

            {/* Starfield background */}
            <div
                ref={starsRef}
                className={`fixed inset-0 pointer-events-none z-0 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* CSS Animations */}
            <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        @keyframes titleGlowUp {
          0% {
            opacity: 0;
            transform: scale(0.8);
            filter: brightness(0.5) blur(10px);
          }
          50% {
            filter: brightness(1.5) blur(0px) drop-shadow(0 0 80px rgba(145,196,227,1));
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1) blur(0px) drop-shadow(0 0 40px rgba(145,196,227,0.8));
          }
        }
        .animate-titleGlowUp {
          animation: titleGlowUp 1.2s ease-out forwards;
        }
        @keyframes waveShift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave {
          animation: waveShift 2s linear infinite;
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
        .w1 { animation: wave1 11s linear infinite; }
        .w2 { animation: wave2 7.5s linear infinite; }
        .w3 { animation: wave3 4.8s linear infinite; }
        .shore { animation: shorePulse 3.2s ease-in-out infinite; }
      `}</style>

            {/* Water transition overlay */}
            <div
                ref={setWaterRef}
                className="fixed inset-0 z-[200] pointer-events-none"
                style={{
                    background: "linear-gradient(to bottom, #020C1A 0%, #0A1E38 20%, #122E5A 45%, #1E4A82 70%, #2A62A0 88%, #3A7CC0 100%)",
                    overflow: "visible",
                }}
            >
                {/* Internal glow blobs */}
                <div style={{ position: "absolute", top: "20%", left: "25%", width: "500px", height: "250px", background: "#65ABFC", filter: "blur(140px)", opacity: 0.07, borderRadius: "50%", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: "55%", right: "15%", width: "350px", height: "180px", background: "#91C4E3", filter: "blur(120px)", opacity: 0.06, borderRadius: "50%", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: "5%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "200px", background: "#65ABFC", filter: "blur(90px)", opacity: 0.12, borderRadius: "50%", pointerEvents: "none" }} />

                {/* Wave 1 — back, slowest */}
                <div className="absolute left-0 w1" style={{ top: "-130px", width: "200%", height: "130px" }}>
                    <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 6px rgba(100,160,230,0.5))" }}>
                        <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
                    </svg>
                    <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 6px rgba(100,160,230,0.5))" }}>
                        <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
                    </svg>
                </div>

                {/* Wave 2 — middle */}
                <div className="absolute left-0 w2" style={{ top: "-95px", width: "200%", height: "95px" }}>
                    <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 10px rgba(145,196,227,0.6))" }}>
                        <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
                    </svg>
                    <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 10px rgba(145,196,227,0.6))" }}>
                        <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
                    </svg>
                </div>

                {/* Wave 3 — front, brightest */}
                <div className="absolute left-0 w3" style={{ top: "-65px", width: "200%", height: "65px" }}>
                    <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.75)) drop-shadow(0 0 30px rgba(145,196,227,0.4))" }}>
                        <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
                    </svg>
                    <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block", filter: "drop-shadow(0 0 14px rgba(101,171,252,0.75)) drop-shadow(0 0 30px rgba(145,196,227,0.4))" }}>
                        <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
                    </svg>
                </div>

                {/* Shore glow line */}
                <div
                    className="absolute left-0 w-full shore"
                    style={{ top: "-30px", height: "1px", background: "#91C4E3" }}
                />
            </div>

            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-screen flex items-center">
                {/* Jellyfish - Top Left */}
                <div
                    className="absolute top-10 -left-10 pointer-events-none z-[45]"
                    style={showJellyfish ? {
                        animation: instant ? 'float 6s infinite ease-in-out' : 'jellyfishGlowBlue 1s ease-out forwards, float 6s infinite ease-in-out',
                    } : { opacity: 0 }}
                >
                    <img
                        src="/hackathon/Creature/Jellyfish 1.svg"
                        alt=""
                        className="w-64 h-64"
                    />
                </div>

                {/* Jellyfish - Top Right (larger, slower) */}
                <div
                    className="absolute top-32 -right-16 pointer-events-none z-[45]"
                    style={showJellyfish ? {
                        animation: instant ? 'floatReverse 9s infinite ease-in-out' : 'jellyfishGlowPurple 1s ease-out forwards, floatReverse 9s infinite ease-in-out',
                    } : { opacity: 0 }}
                >
                    <img
                        src="/hackathon/Creature/Jellyfish 1.svg"
                        alt=""
                        className="w-80 h-80"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                </div>

                {/* Additional glowing effects */}
                <div
                    className={`absolute top-40 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] blur-[150px] rounded-full ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-5' : 'opacity-0'}`}
                />
                <div
                    className={`absolute top-60 right-1/3 w-[400px] h-[400px] bg-[#A594BA] blur-[150px] rounded-full ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-5' : 'opacity-0'}`}
                />

                <div className="container mx-auto px-4 py-20 pt-36 relative z-50">
                    <div className="text-center max-w-4xl mx-auto space-y-4">
                        {/* Partner logos */}
                        <div
                            className={`flex items-center justify-center gap-16 -mt-36 mb-16 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <div className="w-20 h-20 flex items-center justify-center">
                                <img src="/hackathon/PS.png" alt="Passion Seed" className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 0 14px rgba(145,196,227,0.9))' }} />
                            </div>
                            <div className="w-28 h-28 flex items-center justify-center">
                                <img src="/hackathon/AMSA.png" alt="AMSA Thailand" className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 0 14px rgba(145,196,227,0.9))' }} />
                            </div>
                            <div className="w-28 h-28 flex items-center justify-center">
                                <img src="/hackathon/StemLike.png" alt="STEM like Her" className="max-w-full max-h-full object-contain" style={{ filter: 'drop-shadow(0 0 14px rgba(145,196,227,0.9))' }} />
                            </div>
                        </div>

                        {/* Title with glow-up animation - higher z-index to appear above black overlay */}
                        <h1
                            className={`text-6xl md:text-7xl font-bold tracking-tight relative z-50 ${showTitle ? (instant ? 'opacity-100' : 'animate-titleGlowUp') : 'opacity-0'}`}
                            style={{ textShadow: '0 0 40px rgba(145,196,227,0.3)' }}
                        >
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)] font-bold">
                                The Next Decade Hackathon
                            </span>
                        </h1>
                        {/* Subtitle - GSAP handwriting animation */}
                        <h2
                            ref={subtitleRef}
                            className="text-4xl md:text-5xl font-semibold text-white mb-3 font-[family-name:var(--font-reenie-beanie)]"
                            style={{
                                clipPath: 'inset(0 100% 0 0)',
                                textShadow: '0 0 30px rgba(145,196,227,0.4)',
                            }}
                        >
                            Reimagining Preventive & Predictive Healthcare
                        </h2>

                        {/* Content that fades in after title */}
                        <div
                            className={`${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Join us in shaping the future of healthcare through innovation, technology, and collaboration
                            </p>

                            {/* Register Button */}
                            <div className="pt-6">
                                <Button
                                    size="lg"
                                    onClick={handleRegister}
                                    className="bg-[#9D81AC] hover:bg-[#8a6f99] text-white text-xl px-12 py-6 rounded-full shadow-[0_0_40px_rgba(157,129,172,0.6)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(157,129,172,1)] transform hover:scale-105"
                                >
                                    {isLoggedIn ? "Your Team" : "Register Now"}
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Scroll indicator — anchored to section bottom */}
                <div
                    className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                >
                    <span className="text-xs tracking-widest uppercase text-gray-400">Detail</span>
                    <div className="flex flex-col items-center gap-1 animate-bounce">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                            <path d="M8 3 L8 13 M3 8 L8 13 L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* All content sections that fade in after title */}
            <div
                className={`${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Anyone Can Make an Impact Section */}
                <section className="py-20 relative z-10 overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute right-0 top-1/2 w-[600px] h-[600px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full" />
                    <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-[#A594BA] opacity-5 blur-[150px] rounded-full" />

                    {/* Jellyfish decoration */}
                    <div className="absolute right-16 top-1/4 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 9s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-44 h-44" style={{ filter: 'drop-shadow(0 0 16px rgba(145,196,227,0.4))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                                <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                    Anyone Can Make an Impact
                                </span>
                            </h2>
                            <p className="text-center text-xl md:text-2xl text-gray-300 mb-12 italic">
                                "เปลี่ยนไอเดียให้เป็นอิมแพ็ค เริ่มสร้างจากศูนย์...สู่ผลงานจริง"
                            </p>
                            <div className="space-y-6">
                                <div className="bg-[#0d1219]/70 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-[#91C4E3]/20 shadow-[0_0_40px_rgba(145,196,227,0.08)] hover:border-[#91C4E3]/40 transition-all duration-500">
                                    <p className="text-gray-200 text-lg md:text-xl leading-relaxed">
                                        ที่ The Next Decade Hackathon 2026 <span className="text-[#91C4E3] font-semibold">พื้นฐานไม่ใช่ข้อจำกัด แต่คือจุดเริ่มต้นของการเรียนรู้</span> เราเปลี่ยนพื้นที่แข่งขันให้กลายเป็นโอกาสให้คุณได้ทดลอง สร้างสรรค์ และเรียนรู้จากการลงมือทำจริงได้แบบไม่ต้องกังวล ผ่านระบบเหล่านี้:
                                    </p>
                                </div>

                                {/* Personal Mentorship */}
                                <div className="bg-[#0d1219]/70 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-[#91C4E3]/20 shadow-[0_0_40px_rgba(145,196,227,0.08)] hover:border-[#91C4E3]/40 transition-all duration-500">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#91C4E3]/10 border border-[#91C4E3]/40 flex items-center justify-center shadow-[0_0_15px_rgba(145,196,227,0.3)]">
                                            <UsersRound className="text-[#91C4E3] w-6 h-6" style={{ filter: 'drop-shadow(0 0 8px rgba(145,196,227,0.8))' }} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[#91C4E3] font-semibold text-xl md:text-2xl mb-3">Personal Mentorship</h4>
                                            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                                                เรามีการจัดสรร Mentor ประจำแต่ละกลุ่มเพื่อคอยให้คำปรึกษาและ Feedback อย่างใกล้ชิด พี่ๆจะช่วยให้คำแนะนำและดูแลให้น้องๆมือใหม่ยังคงอยู่ในเส้นทางและพัฒนาไอเดียได้อย่างเต็มศักยภาพ
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Learning Guideline */}
                                <div className="bg-[#0d1219]/70 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-[#A594BA]/20 shadow-[0_0_40px_rgba(165,148,186,0.08)] hover:border-[#A594BA]/40 transition-all duration-500">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#91C4E3]/10 border border-[#91C4E3]/40 flex items-center justify-center shadow-[0_0_15px_rgba(145,196,227,0.3)]">
                                            <BookOpenCheck className="text-[#91C4E3] w-6 h-6" style={{ filter: 'drop-shadow(0 0 8px rgba(145,196,227,0.8))' }} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[#A594BA] font-semibold text-xl md:text-2xl mb-3">Learning Guideline</h4>
                                            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                                                คุณจะได้เรียนรู้กระบวนการสร้างนวัตกรรมอย่างเป็นระบบผ่านหลักสูตร <span className="text-[#A594BA] font-semibold">Design Thinking</span> ที่มุ่งเน้นการลงมือทำจริงเพื่อให้ได้ผลงานที่ใช้งานได้จริง (Functional Prototype) และมีเว็บคอย guide ทางให้ในแต่ละขั้นตอน
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tester */}
                                <div className="bg-[#0d1219]/70 backdrop-blur-md p-8 md:p-10 rounded-3xl border border-[#91C4E3]/20 shadow-[0_0_40px_rgba(145,196,227,0.08)] hover:border-[#91C4E3]/40 transition-all duration-500">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#91C4E3]/10 border border-[#91C4E3]/40 flex items-center justify-center shadow-[0_0_15px_rgba(145,196,227,0.3)]">
                                            <Microscope className="text-[#91C4E3] w-6 h-6" style={{ filter: 'drop-shadow(0 0 8px rgba(145,196,227,0.8))' }} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[#91C4E3] font-semibold text-xl md:text-2xl mb-3">Tester</h4>
                                            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                                                หัวใจสำคัญคือการนำ Prototype ไปทดลองใช้จริง เพื่อรับ Feedback มาพัฒนาผลงานให้แม่นยำ ขั้นตอนนี้จะช่วยสร้างความมั่นใจว่าสิ่งที่คุณสร้างขึ้นนั้นสามารถแก้ปัญหาได้ตรงจุดและตอบโจทย์คนใช้งานจริง ก่อนนำเสนอผลงานในรอบสุดท้าย
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tracks Section - Minimal Design */}
                <section className="py-32 relative z-10">
                    <div className="container mx-auto px-4 relative z-10">
                        <h2 className="text-5xl md:text-6xl font-bold mb-20 text-center">
                            <span className="text-white/90">
                                Tracks
                            </span>
                        </h2>

                        <div className="max-w-7xl mx-auto space-y-2">
                            {/* Track 1 */}
                            <div
                                onClick={() => setExpandedTrack(expandedTrack === 1 ? null : 1)}
                                className="group relative cursor-pointer transition-all duration-500 ease-out hover:bg-[#91C4E3]/5 rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-8 md:gap-12 p-8 md:p-12">
                                    <div className="flex items-center gap-8 md:gap-12 flex-1">
                                        {/* Number */}
                                        <div className="flex-shrink-0">
                                            <span className="text-6xl md:text-8xl font-bold text-white/10 group-hover:text-[#91C4E3]/40 transition-all duration-500">
                                                01
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🏥</span>
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#91C4E3] transition-colors duration-300">
                                                    Traditional & Integrative Healthcare
                                                </h3>
                                            </div>
                                            {expandedTrack !== 1 && (
                                                <p className="text-sm text-gray-500 ml-[3.5rem] group-hover:text-[#91C4E3]/60 transition-colors">
                                                    Click to see detail
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className={`flex-shrink-0 text-white/20 group-hover:text-[#91C4E3] transition-all duration-300 ${expandedTrack === 1 ? 'rotate-90' : ''}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {/* Details - Hidden by default, shown on click */}
                                <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 1 ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="px-8 md:px-12 pb-8">
                                        <ul className="space-y-2 text-gray-400 text-sm md:text-base ml-[7rem] md:ml-[10rem]">
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Early detection & screening</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Chronic disease prevention</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Patient journeys</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Integration of traditional practices</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Assistive health technology</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Bottom border */}
                                <div className={`h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${expandedTrack === 1 ? 'via-[#91C4E3]/40' : 'via-white/5 group-hover:via-[#91C4E3]/40'}`} />
                            </div>

                            {/* Track 2 */}
                            <div
                                onClick={() => setExpandedTrack(expandedTrack === 2 ? null : 2)}
                                className="group relative cursor-pointer transition-all duration-500 ease-out hover:bg-[#A594BA]/5 rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-8 md:gap-12 p-8 md:p-12">
                                    <div className="flex items-center gap-8 md:gap-12 flex-1">
                                        {/* Number */}
                                        <div className="flex-shrink-0">
                                            <span className="text-6xl md:text-8xl font-bold text-white/10 group-hover:text-[#A594BA]/40 transition-all duration-500">
                                                02
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🧠</span>
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#A594BA] transition-colors duration-300">
                                                    Mental Health
                                                </h3>
                                            </div>
                                            {expandedTrack !== 2 && (
                                                <p className="text-sm text-gray-500 ml-[3.5rem] group-hover:text-[#A594BA]/60 transition-colors">
                                                    Click to see detail
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className={`flex-shrink-0 text-white/20 group-hover:text-[#A594BA] transition-all duration-300 ${expandedTrack === 2 ? 'rotate-90' : ''}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {/* Details - Hidden by default, shown on click */}
                                <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 2 ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="px-8 md:px-12 pb-8">
                                        <ul className="space-y-2 text-gray-400 text-sm md:text-base ml-[7rem] md:ml-[10rem]">
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#A594BA] mt-1">•</span>
                                                <span>Stress, burnout, anxiety prevention</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#A594BA] mt-1">•</span>
                                                <span>Early risk detection</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#A594BA] mt-1">•</span>
                                                <span>Loneliness & social isolation</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#A594BA] mt-1">•</span>
                                                <span>Well-being in schools/workplaces</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#A594BA] mt-1">•</span>
                                                <span>Empathetic chatbots & LLMs</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Bottom border */}
                                <div className={`h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${expandedTrack === 2 ? 'via-[#A594BA]/40' : 'via-white/5 group-hover:via-[#A594BA]/40'}`} />
                            </div>

                            {/* Track 3 */}
                            <div
                                onClick={() => setExpandedTrack(expandedTrack === 3 ? null : 3)}
                                className="group relative cursor-pointer transition-all duration-500 ease-out hover:bg-[#91C4E3]/5 rounded-2xl"
                            >
                                <div className="flex items-center justify-between gap-8 md:gap-12 p-8 md:p-12">
                                    <div className="flex items-center gap-8 md:gap-12 flex-1">
                                        {/* Number */}
                                        <div className="flex-shrink-0">
                                            <span className="text-6xl md:text-8xl font-bold text-white/10 group-hover:text-[#91C4E3]/40 transition-all duration-500">
                                                03
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🌍</span>
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#91C4E3] transition-colors duration-300">
                                                    Community, Public & Environmental Health
                                                </h3>
                                            </div>
                                            {expandedTrack !== 3 && (
                                                <p className="text-sm text-gray-500 ml-[3.5rem] group-hover:text-[#91C4E3]/60 transition-colors">
                                                    Click to see detail
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow indicator */}
                                    <div className={`flex-shrink-0 text-white/20 group-hover:text-[#91C4E3] transition-all duration-300 ${expandedTrack === 3 ? 'rotate-90' : ''}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </div>
                                </div>

                                {/* Details - Hidden by default, shown on click */}
                                <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 3 ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="px-8 md:px-12 pb-8">
                                        <ul className="space-y-2 text-gray-400 text-sm md:text-base ml-[7rem] md:ml-[10rem]">
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Population prevention</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Health equity & accessibility</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Environmental health</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Prediction & monitoring</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Community interventions</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-[#91C4E3] mt-1">•</span>
                                                <span>Wearables & sensing</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Bottom border */}
                                <div className={`h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${expandedTrack === 3 ? 'via-[#91C4E3]/40' : 'via-white/5 group-hover:via-[#91C4E3]/40'}`} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Who Can Join & Team Format */}
                <section className="py-20 relative z-10">
                    <div className="absolute right-1/4 top-1/3 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 7s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-36 h-36" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.4))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                            {/* Who Can Join */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-md rounded-3xl border border-[#91C4E3]/30 p-10 hover:border-[#91C4E3]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(145,196,227,0.2)]">
                                <h3 className="text-3xl font-bold text-[#91C4E3] mb-6" style={{ textShadow: '0 0 20px rgba(145,196,227,0.4)' }}>
                                    Who Can Join
                                </h3>
                                <p className="text-xl text-gray-200 leading-relaxed">
                                    เปิดรับผู้เข้าร่วมทุกพื้นฐาน<br />
                                    <span className="text-gray-400">ไม่จำกัดสาขา</span>
                                </p>
                            </div>

                            {/* Team Format */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-md rounded-3xl border border-[#A594BA]/30 p-10 hover:border-[#A594BA]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(165,148,186,0.2)]">
                                <h3 className="text-3xl font-bold text-[#A594BA] mb-6" style={{ textShadow: '0 0 20px rgba(165,148,186,0.4)' }}>
                                    Team Format
                                </h3>
                                <ul className="space-y-3 text-gray-200 text-lg">
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-[#A594BA]" />
                                        <span>สามารถสมัครเดี่ยว</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-[#A594BA]" />
                                        <span>ทีมละ 2–5 คน</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-[#A594BA]" />
                                        <span>High School & University</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <HackathonTimeline />

                {/* Futurist Fest Section */}
                <section className="py-20 relative z-10 overflow-hidden">
                    <div className="absolute right-16 bottom-1/4 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 8s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-48 h-48" style={{ filter: 'drop-shadow(0 0 18px rgba(145,196,227,0.5))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="absolute left-0 top-1/2 w-[600px] h-[600px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                                <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                    Futurist Fest
                                </span>
                            </h2>
                            <div className="bg-gradient-to-br from-[#0d1219]/90 via-[#0d1219]/70 to-[#0d1219]/90 backdrop-blur-xl rounded-3xl border border-[#91C4E3]/30 p-10 md:p-14 shadow-[0_0_60px_rgba(145,196,227,0.12)] hover:border-[#91C4E3]/50 transition-all duration-500">
                                <p className="text-xl md:text-2xl text-gray-200 leading-relaxed text-center">
                                    Futurist Fest คือพื้นที่ที่<span className="text-[#91C4E3] font-semibold"> ผลงานไม่ได้จบลงที่การแข่งขัน</span>
                                </p>
                                <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[#91C4E3]/30 to-transparent" />
                                <p className="text-gray-300 text-lg leading-relaxed mt-10">
                                    ทุกทีมสามารถนำเสนอ prototype แลกเปลี่ยนแนวคิด และเชื่อมต่อกับนักวิจัย ผู้เชี่ยวชาญ นักลงทุน และ ecosystem ด้านสุขภาพ เทคโนโลยี และนวัตกรรม เพื่อเปิดโอกาสให้แนวคิดเติบโตต่อในโลกจริง
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* What Participants Will Experience */}
                <section className="py-20 relative z-10">
                    <div className="absolute left-1/4 top-1/3 opacity-15 pointer-events-none" style={{ animation: 'float 9s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-32 h-32" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.4))' }} />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                What Participants Will Experience
                            </span>
                        </h2>

                        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
                            {[
                                'Workshops ที่ช่วยให้เข้าใจปัญหาสุขภาพจริง ตั้งแต่ problem discovery → research → prototyping',
                                'การพัฒนาแนวคิดโดยอ้างอิงข้อมูล งานวิจัย และบริบทจริง',
                                'การสร้าง prototype ที่ทดลองและพัฒนาต่อได้',
                                'Mentorship และ feedback จากผู้เชี่ยวชาญด้าน health, tech และ business',
                            ].map((text, idx) => (
                                <div
                                    key={idx}
                                    className="group bg-[#0d1219]/70 backdrop-blur-md rounded-2xl border border-[#91C4E3]/20 p-8 hover:border-[#91C4E3]/40 transition-all duration-300 hover:shadow-[0_0_35px_rgba(145,196,227,0.15)]"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#91C4E3]/20 border border-[#91C4E3]/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <span className="text-[#91C4E3] font-bold">{idx + 1}</span>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed flex-1">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Beyond the Hackathon */}
                <section className="py-20 relative z-10">
                    <div className="absolute right-20 top-1/3 opacity-20 pointer-events-none" style={{ animation: 'floatReverse 11s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-40 h-40" style={{ filter: 'drop-shadow(0 0 16px rgba(165,148,186,0.5))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-[#A594BA] opacity-5 blur-[150px] rounded-full" />

                    <div className="container mx-auto px-4 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                Beyond the Hackathon
                            </span>
                        </h2>

                        <div className="max-w-4xl mx-auto">
                            <div className="bg-gradient-to-br from-[#0d1219]/90 to-[#0d1219]/70 backdrop-blur-xl rounded-3xl border border-[#A594BA]/30 p-10 shadow-[0_0_50px_rgba(165,148,186,0.1)] hover:border-[#A594BA]/50 transition-all duration-500">
                                <div className="space-y-6">
                                    {[
                                        'การนำเสนอผลงานใน Futurist Fest',
                                        'การเชื่อมต่อกับนักวิจัย ผู้เชี่ยวชาญ นักลงทุน',
                                        'โอกาสพัฒนาแนวคิดต่อหลังจบโครงการ',
                                    ].map((text, idx) => (
                                        <div key={idx} className="flex items-center gap-4 group">
                                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#91C4E3] to-[#A594BA] group-hover:scale-125 transition-transform duration-300" />
                                            <p className="text-gray-200 text-lg">{text}</p>
                                        </div>
                                    ))}
                                    <div className="mt-10 pt-8 border-t border-[#A594BA]/20">
                                        <p className="text-xl text-center text-gray-300 leading-relaxed">
                                            ประสบการณ์ไม่ได้จบลงที่การแข่งขัน<br />
                                            <span className="text-[#A594BA] font-semibold">แต่ต่อยอดสู่การพัฒนาในโลกจริง</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Organizations & Partners Section */}
                <section className="py-20 relative z-10">
                    <div className="absolute right-1/4 bottom-10 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 6s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-28 h-28" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.4))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                Organizations & Partners
                            </span>
                        </h2>

                        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
                            {/* AMSA Thailand */}
                            <div className="group bg-[#0d1219]/80 backdrop-blur-md rounded-3xl border border-[#91C4E3]/25 p-8 hover:border-[#91C4E3]/40 transition-all duration-500 hover:shadow-[0_0_45px_rgba(145,196,227,0.2)] flex flex-col">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <img src="/hackathon/AMSA.png" alt="AMSA Thailand" className="w-24 h-24 object-contain" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.3))' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-[#91C4E3] mb-3">AMSA Thailand</h3>
                                        <p className="text-gray-300 leading-relaxed text-sm">
                                            เครือข่ายนักศึกษาแพทย์ที่ทำงานด้านสาธารณสุข การแลกเปลี่ยนความรู้ และความร่วมมือด้านสุขภาพ
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Passionseed */}
                            <div className="group bg-[#0d1219]/80 backdrop-blur-md rounded-3xl border border-[#A594BA]/25 p-8 hover:border-[#A594BA]/40 transition-all duration-500 hover:shadow-[0_0_45px_rgba(165,148,186,0.2)] flex flex-col">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <img src="/hackathon/PS.png" alt="Passionseed" className="w-24 h-24 object-contain" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.3))' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-[#91C4E3] mb-3">Passionseed</h3>
                                        <p className="text-gray-300 leading-relaxed text-sm">
                                            องค์กรที่พัฒนาเยาวชนผ่านการเรียนรู้ด้านเทคโนโลยี เช่น AI การสร้างผลิตภัณฑ์ดิจิทัล และนวัตกรรม เพื่อสร้างโปรเจกต์ที่ใช้ได้จริง
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* STEM Like Her */}
                            <div className="group bg-[#0d1219]/80 backdrop-blur-md rounded-3xl border border-[#91C4E3]/25 p-8 hover:border-[#91C4E3]/40 transition-all duration-500 hover:shadow-[0_0_45px_rgba(145,196,227,0.2)] flex flex-col">
                                <div className="flex flex-col items-center text-center gap-6">
                                    <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                        <img src="/hackathon/StemLike.png" alt="STEM Like Her" className="w-24 h-24 object-contain" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.3))' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-[#91C4E3] mb-3">STEM Like Her</h3>
                                        <p className="text-gray-300 leading-relaxed text-sm">
                                            องค์กรนักศึกษาที่สนับสนุนและสร้างแรงบันดาลใจให้ผู้หญิงและเยาวชนในสาย STEM
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 relative z-10">
                    {/* Large jellyfish decoration */}
                    <div className="absolute top-10 right-1/3 opacity-20 pointer-events-none" style={{ animation: 'float 12s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-52 h-52" style={{ filter: 'drop-shadow(0 0 20px rgba(165,148,186,0.4))' }} />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-r from-[#91C4E3]/5 to-[#A594BA]/5 blur-3xl" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-4xl mx-auto space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                                <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                    มาร่วมสำรวจและสร้างอนาคตของการดูแลสุขภาพไปด้วยกัน
                                </span>
                            </h2>
                            <Button
                                size="lg"
                                onClick={handleRegister}
                                className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] hover:from-[#7ab3d3] hover:to-[#9484aa] text-white text-xl px-14 py-7 rounded-full shadow-[0_0_40px_rgba(145,196,227,0.5)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(145,196,227,0.8)] transform hover:scale-105"
                            >
                                {isLoggedIn ? "Your Team" : "Register Now"}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 border-t border-[#91C4E3]/20 relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="text-center space-y-4">
                            <p className="text-gray-400 text-lg">
                                The Next Decade Hackathon 2026
                            </p>
                            <p className="text-gray-500 text-sm">
                                Reimagining Preventive & Predictive Healthcare
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
