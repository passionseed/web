"use client";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Clock, UsersRound, Microscope, BookOpenCheck, HeartPulse, Brain, Globe, Rocket, Target, Lightbulb, Workflow, Network, Presentation, LightbulbIcon, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import HackathonTimeline from "@/components/HackathonTimeline";
import { MentorshipIllustration, GuidelineIllustration, TesterIllustration } from './Illustrations';

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
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Track page view for analytics
    useEffect(() => {
        // Track the page view
        const trackPageView = async () => {
            try {
                await fetch("/api/hackathon/track-view", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        page_path: "/hackathon",
                        referrer: document.referrer || null,
                    }),
                });
            } catch (error) {
                // Silently fail - analytics shouldn't break the user experience
                console.debug("Failed to track page view:", error);
            }
        };

        trackPageView();
    }, []); // Run once on mount

    // Detect mobile devices for performance optimization
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
        // Generate random stars (fewer on mobile for performance)
        if (starsRef.current) {
            const starCount = isMobile ? 30 : 100;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement("div");
                star.className = "absolute rounded-full bg-white";
                const size = Math.random() * 2 + 1;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.opacity = `${Math.random() * 0.7 + 0.3}`;
                // Disable animation on mobile for better performance
                if (!isMobile) {
                    star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite ease-in-out`;
                }
                starsRef.current.appendChild(star);
            }
        }
    }, [isMobile]);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <div className="min-h-screen bg-[#03050a] text-white relative [overflow:clip]" style={{ willChange: 'auto' }}>
                {/* Black overlay that fades out */}
                <div
                    className={`fixed inset-0 bg-black z-40 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    style={{ willChange: showContent ? 'auto' : 'opacity' }}
                />

                {/* Starfield background */}
                <div
                    ref={starsRef}
                    className={`fixed inset-0 pointer-events-none z-0 ${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                    style={{ willChange: showContent ? 'auto' : 'opacity' }}
                />

                {/* CSS Animations */}
                <style jsx>{`
        /* Performance optimizations */
        img, svg {
          will-change: transform;
          transform: translateZ(0);
        }
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
                            loading="lazy"
                            decoding="async"
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
                            loading="lazy"
                            decoding="async"
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
                            {/* Logo with glow-up animation - higher z-index to appear above black overlay */}
                            <div
                                className={`relative z-50 flex justify-center ${showTitle ? (instant ? 'opacity-100' : 'animate-titleGlowUp') : 'opacity-0'}`}
                            >
                                <img
                                    src="/hackathon/HackLogo.png"
                                    alt="The Next Decade Hackathon"
                                    className="w-full max-w-xl md:max-w-2xl h-auto"
                                    style={{ filter: 'drop-shadow(0 0 40px rgba(145,196,227,0.3))' }}
                                />
                            </div>
                            {/* Subtitle - GSAP handwriting animation */}
                            <h2
                                ref={subtitleRef}
                                className="text-4xl md:text-5xl font-semibold text-white mb-3 font-[family-name:var(--font-reenie-beanie)]"
                                style={{
                                    clipPath: 'inset(0 100% 0 0)',
                                    textShadow: '0 0 30px rgba(145,196,227,0.4)',
                                }}
                            >
                                Preventive & Predictive Healthcare
                            </h2>

                            {/* Content that fades in after title */}
                            <div
                                className={`${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                            >
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
                    {/* Watch the Story — Video Section */}
                    <section className="py-20 relative z-10 overflow-hidden">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#91C4E3] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />
                        <div className="container mx-auto px-4 relative z-10">
                            <div className="max-w-5xl mx-auto text-center">
                                <h2 className="text-4xl md:text-5xl font-bold mb-3" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                                    <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                        Watch the Story
                                    </span>
                                </h2>
                                <p className="text-gray-500 mb-12 text-base">ดูว่าเรากำลังสร้างอะไรด้วยกัน</p>
                                <div className="flex justify-center">
                                    <div
                                        className="relative rounded-3xl overflow-hidden border border-[#91C4E3]/20 shadow-[0_0_80px_rgba(145,196,227,0.12)]"
                                        style={{ width: '340px', maxWidth: '100%' }}
                                    >
                                        <iframe
                                            src="https://www.instagram.com/reel/DV99mPwCV-D/embed/"
                                            width="340"
                                            height="605"
                                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                            style={{ border: 'none', display: 'block', background: '#03050a' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Anyone Can Make an Impact Section */}
                    <section className="py-20 relative z-10 overflow-hidden">
                        {/* Ambient glow */}
                        <div className="absolute right-0 top-1/2 w-[600px] h-[600px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full" />
                        <div className="absolute left-0 bottom-0 w-[500px] h-[500px] bg-[#A594BA] opacity-5 blur-[150px] rounded-full" />

                        {/* Clione decoration */}
                        <div className="absolute right-16 top-1/4 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 9s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Clione.svg" alt="" className="w-44 h-44" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 16px rgba(145,196,227,0.4))', transform: 'rotate(-25deg)' }} />
                        </div>

                        <div className="container mx-auto px-4 relative z-10">
                            <div className="max-w-5xl mx-auto">
                                <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                                    <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                        Anyone Can Make an Impact
                                    </span>
                                </h2>
                                <div className="space-y-6">
                                    <div className="mb-12">
                                        <p className="text-gray-200 text-lg md:text-xl leading-relaxed text-center">
                                            ที่ The Next Decade Hackathon 2026 <span className="text-[#91C4E3] font-semibold">พื้นฐานไม่ใช่ข้อจำกัด แต่คือจุดเริ่มต้นของการเรียนรู้</span> เราเปลี่ยนพื้นที่แข่งขันให้กลายเป็นโอกาสให้คุณได้ทดลอง สร้างสรรค์ และเรียนรู้จากการลงมือทำจริงได้แบบไม่ต้องกังวล ผ่านระบบเหล่านี้:
                                        </p>
                                    </div>

                                    {/* Personal Mentorship */}
                                    <div className="bg-[#0d1219]/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-[#91C4E3]/20 shadow-[0_0_40px_rgba(145,196,227,0.08)] hover:border-[#91C4E3]/40 transition-all duration-500 max-w-4xl mx-auto w-full">
                                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                                            <div className="flex-shrink-0 w-24 h-24 md:w-40 md:h-40">
                                                <MentorshipIllustration className="w-full h-full" />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h4 className="text-[#91C4E3] font-semibold text-xl md:text-2xl mb-3">Personal Mentorship</h4>
                                                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                                                    เรามีการจัดสรร Mentor ประจำแต่ละกลุ่มเพื่อคอยให้คำปรึกษาและ Feedback อย่างใกล้ชิด พี่ๆจะช่วยให้คำแนะนำและดูแลให้น้องๆมือใหม่ยังคงอยู่ในเส้นทางและพัฒนาไอเดียได้อย่างเต็มศักยภาพ
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Learning Guideline */}
                                    <div className="bg-[#0d1219]/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-[#A594BA]/20 shadow-[0_0_40px_rgba(165,148,186,0.08)] hover:border-[#A594BA]/40 transition-all duration-500 max-w-4xl mx-auto w-full">
                                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                                            <div className="flex-shrink-0 w-24 h-24 md:w-40 md:h-40">
                                                <GuidelineIllustration className="w-full h-full" />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h4 className="text-[#A594BA] font-semibold text-xl md:text-2xl mb-3">Learning Guideline</h4>
                                                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                                                    คุณจะได้เรียนรู้กระบวนการสร้างนวัตกรรมอย่างเป็นระบบผ่านหลักสูตร <span className="text-[#A594BA] font-semibold">Design Thinking</span> ที่มุ่งเน้นการลงมือทำจริงเพื่อให้ได้ผลงานที่ใช้งานได้จริง (Functional Prototype) และมีเว็บคอย guide ทางให้ในแต่ละขั้นตอน
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tester */}
                                    <div className="bg-[#0d1219]/70 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-[#91C4E3]/20 shadow-[0_0_40px_rgba(145,196,227,0.08)] hover:border-[#91C4E3]/40 transition-all duration-500 max-w-4xl mx-auto w-full">
                                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                                            <div className="flex-shrink-0 w-24 h-24 md:w-40 md:h-40">
                                                <TesterIllustration className="w-full h-full" />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
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

                    {/* Who Can Join & Team Format */}
                    <section className="py-32 relative z-10 overflow-hidden">
                        {/* Ambient glow effects */}
                        <div className="absolute left-1/4 top-1/2 w-[500px] h-[500px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full" />
                        <div className="absolute right-1/4 bottom-1/4 w-[400px] h-[400px] bg-[#A594BA] opacity-5 blur-[150px] rounded-full" />

                        {/* Floating small jelly decorations */}
                        <div className="absolute right-1/4 top-1/3 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 7s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Small Jelly.svg" alt="" className="w-36 h-36" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.4))', transform: 'scaleX(-1) rotate(10deg)' }} />
                        </div>

                        <div className="container mx-auto px-4 relative z-10">
                            <div className="max-w-6xl mx-auto">
                                {/* Grid layout with two cards */}
                                <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                                    {/* Who Can Join Card */}
                                    <div className="group relative">
                                        {/* Glowing border effect */}
                                        <div className="absolute -inset-0.5 bg-gradient-to-br from-[#91C4E3] via-[#91C4E3]/50 to-transparent rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur-sm" />

                                        {/* Card content */}
                                        <div className="relative bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 backdrop-blur-xl rounded-3xl border border-[#91C4E3]/30 p-10 md:p-12 group-hover:border-[#91C4E3]/50 transition-all duration-500 h-full">
                                            {/* Icon/Number */}
                                            <div className="mb-8 flex items-center justify-center">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-[#91C4E3] blur-2xl opacity-30" />
                                                    <UsersRound className="w-20 h-20 text-[#91C4E3] relative z-10" strokeWidth={1.5} />
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-3xl md:text-4xl font-bold text-[#91C4E3] mb-8 text-center"
                                                style={{
                                                    textShadow: '0 0 30px rgba(145,196,227,0.5)',
                                                    letterSpacing: '-0.02em'
                                                }}>
                                                Who can join?
                                            </h3>

                                            {/* Content */}
                                            <div className="space-y-6">
                                                <div className="flex flex-col gap-4">
                                                    <div className="relative group/item">
                                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#91C4E3] opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        <p className="text-lg md:text-xl text-[#91C4E3] font-medium text-left group-hover/item:translate-x-2 transition-transform">
                                                            Track 1: ระดับมัธยมศึกษา หรือเทียบเท่า (ปวช.)
                                                        </p>
                                                    </div>
                                                    <div className="relative group/item">
                                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#91C4E3] opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        <p className="text-lg md:text-xl text-[#91C4E3] font-medium text-left group-hover/item:translate-x-2 transition-transform">
                                                            Track 2: ระดับมหาวิทยาลัย (ปริญญาตรี - ปริญญาเอก) หรือเทียบเท่า (ปวส.)
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-4 mt-4 border-t border-[#91C4E3]/20">
                                                    <p className="text-base text-gray-400 text-center italic">
                                                        ทุกพื้นฐาน ไม่จำกัดสาขา
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom decorative element */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#91C4E3]/40 to-transparent" />
                                        </div>
                                    </div>

                                    {/* Team Format Card */}
                                    <div className="group relative">
                                        {/* Glowing border effect */}
                                        <div className="absolute -inset-0.5 bg-gradient-to-br from-[#A594BA] via-[#A594BA]/50 to-transparent rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur-sm" />

                                        {/* Card content */}
                                        <div className="relative bg-gradient-to-br from-[#0d1219]/95 to-[#0a0f16]/95 backdrop-blur-xl rounded-3xl border border-[#A594BA]/30 p-10 md:p-12 group-hover:border-[#A594BA]/50 transition-all duration-500 h-full">
                                            {/* Icon/Number */}
                                            <div className="mb-8 flex items-center justify-center">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-[#A594BA] blur-2xl opacity-30" />
                                                    <UsersRound className="w-20 h-20 text-[#A594BA] relative z-10" strokeWidth={1.5} />
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-3xl md:text-4xl font-bold text-[#A594BA] mb-8 text-center"
                                                style={{
                                                    textShadow: '0 0 30px rgba(165,148,186,0.5)',
                                                    letterSpacing: '-0.02em'
                                                }}>
                                                Team Format
                                            </h3>

                                            {/* Content */}
                                            <div className="space-y-6">
                                                <ul className="space-y-6">
                                                    <li className="flex items-start gap-4 group/item">
                                                        <div className="flex-shrink-0 mt-1.5">
                                                            <div className="w-8 h-8 rounded-full border-2 border-[#A594BA]/40 flex items-center justify-center group-hover/item:border-[#A594BA] group-hover/item:bg-[#A594BA]/10 transition-all">
                                                                <div className="w-2 h-2 rounded-full bg-[#A594BA]" />
                                                            </div>
                                                        </div>
                                                        <span className="text-lg md:text-xl text-gray-200 leading-relaxed group-hover/item:text-white transition-colors">
                                                            สามารถสมัครเดี่ยว แล้วมาทีม matching ได้
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-4 group/item">
                                                        <div className="flex-shrink-0 mt-1.5">
                                                            <div className="w-8 h-8 rounded-full border-2 border-[#A594BA]/40 flex items-center justify-center group-hover/item:border-[#A594BA] group-hover/item:bg-[#A594BA]/10 transition-all">
                                                                <div className="w-2 h-2 rounded-full bg-[#A594BA]" />
                                                            </div>
                                                        </div>
                                                        <span className="text-lg md:text-xl text-gray-200 leading-relaxed group-hover/item:text-white transition-colors">
                                                            ทีมละ 2–5 คน
                                                        </span>
                                                    </li>
                                                </ul>
                                            </div>

                                            {/* Bottom decorative element */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#A594BA]/40 to-transparent" />
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
                                            <div className="flex-shrink-0 flex items-center gap-6">
                                                <span className="text-6xl md:text-8xl font-bold text-white group-hover:text-[#91C4E3] transition-all duration-500 leading-none">
                                                    01
                                                </span>
                                                <HeartPulse className="w-12 h-12 md:w-16 md:h-16 text-[#91C4E3] transition-all duration-500" strokeWidth={1} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2 relative z-10">
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#91C4E3] transition-colors duration-300">
                                                    Traditional & Integrative Healthcare
                                                </h3>
                                                {expandedTrack !== 1 && (
                                                    <p className="text-sm text-gray-500 group-hover:text-[#91C4E3]/60 transition-colors">
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
                                    <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 1 ? 'max-h-[500px]' : 'max-h-0'}`}>
                                        <div className="px-8 md:px-12 pb-8">
                                            <div className="space-y-4 ml-[7rem] md:ml-[10rem]">
                                                <p className="text-[#91C4E3]/50 text-[10px] uppercase tracking-[0.2em] mb-4 font-[family-name:var(--font-mitr)]">3 specific problems to solve</p>
                                                {[
                                                    { num: 'P1', title: 'The Last-Mile Chronic Disease Gap', brief: 'How might we design a low-cost, community-deployable screening tool that enables rural communities to detect chronic disease risk — without requiring hospital infrastructure?' },
                                                    { num: 'P2', title: 'The Traditional Medicine Data Desert', brief: 'How might we create a bridge that digitizes traditional medicine outcomes and makes them interoperable with modern health records — enabling integrated, evidence-based care?' },
                                                    { num: 'P3', title: 'Preventive Intervention at Scale', brief: 'How might we build a predictive health risk platform that identifies high-risk individuals early and triggers personalized preventive action — before symptoms appear?' },
                                                ].map((p) => (
                                                    <div key={p.num} className="flex items-start gap-3 group/problem">
                                                        <span className="text-xs text-[#91C4E3]/30 font-mono mt-0.5 w-6 flex-shrink-0 group-hover/problem:text-[#91C4E3]/60 transition-colors">{p.num}</span>
                                                        <div>
                                                            <p className="text-sm text-white/70 font-medium mb-1 group-hover/problem:text-[#91C4E3] transition-colors">{p.title}</p>
                                                            <p className="text-xs text-gray-500 leading-relaxed">{p.brief}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <a href="/hackathon/challenge" className="inline-flex items-center gap-1.5 text-xs text-[#91C4E3]/60 hover:text-[#91C4E3] transition-colors mt-3 font-[family-name:var(--font-mitr)]">
                                                    Read full brief →
                                                </a>
                                            </div>
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
                                            <div className="flex-shrink-0 flex items-center gap-6">
                                                <span className="text-6xl md:text-8xl font-bold text-white group-hover:text-[#A594BA] transition-all duration-500 leading-none">
                                                    02
                                                </span>
                                                <Brain className="w-12 h-12 md:w-16 md:h-16 text-[#A594BA] transition-all duration-500" strokeWidth={1} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2 relative z-10">
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#A594BA] transition-colors duration-300">
                                                    Mental Health
                                                </h3>
                                                {expandedTrack !== 2 && (
                                                    <p className="text-sm text-gray-500 group-hover:text-[#A594BA]/60 transition-colors">
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
                                    <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 2 ? 'max-h-[500px]' : 'max-h-0'}`}>
                                        <div className="px-8 md:px-12 pb-8">
                                            <div className="space-y-4 ml-[7rem] md:ml-[10rem]">
                                                <p className="text-[#A594BA]/50 text-[10px] uppercase tracking-[0.2em] mb-4 font-[family-name:var(--font-mitr)]">3 specific problems to solve</p>
                                                {[
                                                    { num: 'P4', title: 'The Stigma Wall', brief: 'How might we design a destigmatized early mental health detection and support system that meets young people where they are — without labeling or exposing them?' },
                                                    { num: 'P5', title: 'Connected But Alone', brief: 'How might we design an intervention that addresses root-cause social isolation — not just surface-level connection — for teenagers and young adults?' },
                                                    { num: 'P6', title: 'Mental Healthcare in the Last Mile', brief: 'How might we build a scalable, culturally appropriate mental wellness support system for underserved communities where professional help is inaccessible?' },
                                                ].map((p) => (
                                                    <div key={p.num} className="flex items-start gap-3 group/problem">
                                                        <span className="text-xs text-[#A594BA]/30 font-mono mt-0.5 w-6 flex-shrink-0 group-hover/problem:text-[#A594BA]/60 transition-colors">{p.num}</span>
                                                        <div>
                                                            <p className="text-sm text-white/70 font-medium mb-1 group-hover/problem:text-[#A594BA] transition-colors">{p.title}</p>
                                                            <p className="text-xs text-gray-500 leading-relaxed">{p.brief}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <a href="/hackathon/challenge" className="inline-flex items-center gap-1.5 text-xs text-[#A594BA]/60 hover:text-[#A594BA] transition-colors mt-3 font-[family-name:var(--font-mitr)]">
                                                    Read full brief →
                                                </a>
                                            </div>
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
                                            <div className="flex-shrink-0 flex items-center gap-6">
                                                <span className="text-6xl md:text-8xl font-bold text-white group-hover:text-[#91C4E3] transition-all duration-500 leading-none">
                                                    03
                                                </span>
                                                <Globe className="w-12 h-12 md:w-16 md:h-16 text-[#91C4E3] transition-all duration-500" strokeWidth={1} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2 relative z-10">
                                                <h3 className="text-2xl md:text-3xl font-bold text-white/90 group-hover:text-[#91C4E3] transition-colors duration-300">
                                                    Community, Public & Environmental Health
                                                </h3>
                                                {expandedTrack !== 3 && (
                                                    <p className="text-sm text-gray-500 group-hover:text-[#91C4E3]/60 transition-colors">
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
                                    <div className={`overflow-hidden transition-all duration-700 ease-out ${expandedTrack === 3 ? 'max-h-[500px]' : 'max-h-0'}`}>
                                        <div className="px-8 md:px-12 pb-8">
                                            <div className="space-y-4 ml-[7rem] md:ml-[10rem]">
                                                <p className="text-[#91C4E3]/50 text-[10px] uppercase tracking-[0.2em] mb-4 font-[family-name:var(--font-mitr)]">3 specific problems to solve</p>
                                                {[
                                                    { num: 'P7', title: 'Data Rich, Action Poor', brief: 'How might we turn real-time environmental health data into actionable community behavior change — at the neighborhood level, not just on a dashboard?' },
                                                    { num: 'P8', title: 'The Food Safety Blind Spot', brief: 'How might we design a community-powered food safety monitoring and early warning system that works without requiring top-down government enforcement?' },
                                                    { num: 'P9', title: 'PM2.5 vs. Our Children', brief: 'How might we build a predictive PM2.5 alert and response system that triggers preemptive protective actions for schools and children — before dangerous exposure occurs?' },
                                                ].map((p) => (
                                                    <div key={p.num} className="flex items-start gap-3 group/problem">
                                                        <span className="text-xs text-[#91C4E3]/30 font-mono mt-0.5 w-6 flex-shrink-0 group-hover/problem:text-[#91C4E3]/60 transition-colors">{p.num}</span>
                                                        <div>
                                                            <p className="text-sm text-white/70 font-medium mb-1 group-hover/problem:text-[#91C4E3] transition-colors">{p.title}</p>
                                                            <p className="text-xs text-gray-500 leading-relaxed">{p.brief}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <a href="/hackathon/challenge" className="inline-flex items-center gap-1.5 text-xs text-[#91C4E3]/60 hover:text-[#91C4E3] transition-colors mt-3 font-[family-name:var(--font-mitr)]">
                                                    Read full brief →
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom border */}
                                    <div className={`h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${expandedTrack === 3 ? 'via-[#91C4E3]/40' : 'via-white/5 group-hover:via-[#91C4E3]/40'}`} />
                                </div>
                            </div>
                            {/* View Full Challenge Brief CTA */}
                            <div className="text-center mt-12">
                                <a
                                    href="/hackathon/challenge"
                                    className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#91C4E3]/30 text-[#91C4E3] text-sm font-[family-name:var(--font-mitr)] hover:border-[#91C4E3]/60 hover:bg-[#91C4E3]/5 transition-all duration-300"
                                    style={{ textShadow: '0 0 12px rgba(145,196,227,0.4)' }}
                                >
                                    <span>View Full Challenge Brief</span>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 8h10M9 4l4 4-4 4" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </section>



                    <HackathonTimeline />

                    {/* Beyond the Hackathon */}
                    <section className="py-24 relative z-10">
                        <div className="absolute right-20 top-1/3 opacity-20 pointer-events-none" style={{ animation: 'floatReverse 11s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Small Jelly.svg" alt="" className="w-40 h-40" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 16px rgba(165,148,186,0.5))', transform: 'scaleX(-1) rotate(-15deg)' }} />
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#A594BA] opacity-[0.03] blur-[150px] rounded-[100%]" />

                        <div className="container mx-auto px-4 relative z-10">
                            <div className="text-center mb-16">
                                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight" style={{ textShadow: '0 0 40px rgba(165,148,186,0.4)' }}>
                                    <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                        Beyond the Hackathon
                                    </span>
                                </h2>
                                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto flex flex-col md:inline-block">
                                    <span>ประสบการณ์ไม่ได้จบลงที่การแข่งขัน</span>{' '}
                                    <span className="text-[#91C4E3] whitespace-nowrap">แต่ต่อยอดสู่การพัฒนาในโลกจริง</span>
                                </p>
                            </div>

                            <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                                {[
                                    {
                                        title: 'Showcase in Futurist Fest',
                                        desc: 'การนำเสนอผลงานในงาน Futurist Fest ต่อหน้าสาธารณชน',
                                        icon: <Presentation className="w-10 h-10 text-[#A594BA]" />
                                    },
                                    {
                                        title: 'Expand Your Network',
                                        desc: 'การเชื่อมต่อกับนักวิจัย ผู้เชี่ยวชาญ และนักลงทุนในอุตสาหกรรม',
                                        icon: <Network className="w-10 h-10 text-[#91C4E3]" />
                                    },
                                    {
                                        title: 'Real-world Incubation',
                                        desc: 'โอกาสพัฒนาแนวคิดและ Prototype ต่อหลังจบโครงการ',
                                        icon: <Rocket className="w-10 h-10 text-[#A594BA]" />
                                    }
                                ].map((item, idx) => (
                                    <div key={idx} className="group relative bg-[#0d1219]/60 backdrop-blur-xl border border-white/5 p-10 rounded-3xl hover:bg-[#0d1219]/80 hover:border-[#91C4E3]/30 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(145,196,227,0.1)] flex flex-col items-center text-center">
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl pointer-events-none" />
                                        <div className="mb-8 p-5 bg-white/5 rounded-full border border-white/10 group-hover:scale-110 group-hover:border-[#91C4E3]/40 transition-all duration-500 shadow-inner">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                                        <p className="text-gray-400 text-lg leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Futurist Fest Section */}
                    <section className="py-32 relative z-10 overflow-hidden flex items-center justify-center min-h-[60vh]">
                        {/* Dramatic Lighting Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#91C4E3]/10 via-[#03050a]/80 to-[#03050a] pointer-events-none" />

                        {/* Animated Orbits/Rings */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#91C4E3]/10 rounded-full animate-[spin_60s_linear_infinite] pointer-events-none" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#A594BA]/10 rounded-full animate-[spin_40s_linear_infinite_reverse] pointer-events-none" />

                        <div className="absolute right-20 bottom-1/4 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 8s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Clione.svg" alt="" className="w-48 h-48" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 18px rgba(145,196,227,0.5))', transform: 'rotate(30deg)' }} />
                        </div>

                        <div className="container mx-auto px-4 relative z-20 text-center">
                            <div className="relative mx-auto w-full max-w-[500px] flex flex-col drop-shadow-2xl">
                                {/* Top Ticket Section (Blue Gradient with Circles & Grain) */}
                                <div className="relative bg-[#3b82f6] bg-gradient-to-tr from-[#2563eb] to-[#60a5fa] rounded-t-[2.5rem] p-10 md:p-14 overflow-hidden min-h-[250px] flex flex-col justify-center pb-12">
                                    {/* Grain Effect */}
                                    <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                                    {/* Background Decorative Circles */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full border-[1px] border-white/20 pointer-events-none" />
                                    <div className="absolute top-[60%] left-[10%] w-[100px] h-[100px] rounded-full border-[1px] border-white/20 pointer-events-none" />
                                    <div className="absolute -top-10 -right-10 w-[150px] h-[150px] rounded-full bg-white/10 blur-xl pointer-events-none" />

                                    {/* Top Info */}
                                    <div className="absolute top-8 left-8 text-white/80 tracking-widest text-xs font-medium">
                                        2026 EDITION
                                    </div>
                                    <div className="absolute top-8 right-8 flex gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                                    </div>

                                    {/* Main Event Title */}
                                    <div className="relative z-10 flex flex-col items-center text-center mt-2">
                                        <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-[0.2em] drop-shadow-sm ml-2">
                                            FUTURIST
                                        </h2>
                                        <h3 className="text-sm md:text-base text-white/90 font-medium tracking-[0.3em] uppercase ml-1">
                                            The Grand Finale
                                        </h3>
                                    </div>
                                </div>

                                {/* Separation Line with Postaged-Stamp Edge */}
                                <div className="relative h-px w-full bg-[#EADDCD] flex items-center justify-center">
                                    <div className="absolute -top-[5px] inset-x-0 h-[6px] bg-[radial-gradient(circle_at_50%_0%,_transparent_2px,_#EADDCD_2.5px)] bg-[length:10px_6px] bg-repeat-x z-20"></div>

                                    {/* Left Cutout */}
                                    <div className="absolute -left-6 bottom-0 translate-y-1/2 w-8 h-16 rounded-r-full bg-[#03050a] z-30" />
                                    {/* Right Cutout */}
                                    <div className="absolute -right-6 bottom-0 translate-y-1/2 w-8 h-16 rounded-l-full bg-[#03050a] z-30" />
                                </div>

                                {/* Bottom Ticket Section (Cream color) */}
                                <div className="relative bg-[#EADDCD] text-gray-900 rounded-b-[2.5rem] p-10 md:p-12 pt-14 flex flex-col gap-8 z-10">

                                    {/* Details Row 1 */}
                                    <div className="flex justify-between items-end border-b border-[#cbd5e1] pb-6 relative z-20 px-2">
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.15em] mb-1">Pass Type</span>
                                            <span className="text-2xl md:text-3xl font-black text-[#1e293b] uppercase tracking-tight">SPECIAL INVITE</span>
                                        </div>
                                        <div className="flex flex-col items-end text-right">
                                            <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.15em] mb-1">Roles</span>
                                            <span className="text-xl md:text-2xl font-black text-[#1e293b] uppercase tracking-tight">INNOVATOR</span>
                                        </div>
                                    </div>

                                    {/* Thai Description Text */}
                                    <div className="mt-2 text-center px-4">
                                        <p className="text-[#475569] font-medium leading-[1.8] text-sm md:text-[15px]">
                                            พื้นที่ที่ผลงานไม่ได้จบลงที่การแข่งขัน ทุกทีมสามารถนำเสนอ prototype<br className="hidden md:block" /> แลกเปลี่ยนแนวคิด และเชื่อมต่อกับนักวิจัย เพื่อต่อยอดในโลกจริง
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Organizations & Partners Section */}
                    <section className="py-20 relative z-10">
                        <div className="absolute right-1/4 bottom-10 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 6s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Small Jelly.svg" alt="" className="w-28 h-28" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.4))', transform: 'scaleX(-1) rotate(20deg)' }} />
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
                                            <img src="/hackathon/AMSA.png" alt="AMSA Thailand" className="w-24 h-24 object-contain" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.3))' }} />
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
                                            <img src="/hackathon/PS.png" alt="Passionseed" className="w-24 h-24 object-contain" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.3))' }} />
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
                                            <img src="/hackathon/StemLike.png" alt="STEM Like Her" className="w-24 h-24 object-contain" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.3))' }} />
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
                        {/* Large clione decoration */}
                        <div className="absolute top-10 right-1/3 opacity-20 pointer-events-none" style={{ animation: 'float 12s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Clione.svg" alt="" className="w-52 h-52" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 20px rgba(145,196,227,0.4))', transform: 'rotate(-20deg)' }} />
                        </div>
                        {/* Small Jelly decoration on left */}
                        <div className="absolute bottom-20 left-1/4 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 9s infinite ease-in-out' }}>
                            <img src="/hackathon/Creature/Small Jelly.svg" alt="" className="w-36 h-36" loading="lazy" decoding="async" style={{ filter: 'drop-shadow(0 0 16px rgba(165,148,186,0.4))', transform: 'scaleX(-1) rotate(-30deg)' }} />
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

            {/* Partner logos - rendered via portal to bypass overflow:clip */}
            {mounted && createPortal(
                <div
                    className="absolute top-6 right-6 z-[9999] flex items-center gap-3"
                    style={{
                        opacity: showContent ? 1 : 0,
                        transition: instant ? 'none' : 'opacity 1000ms',
                        pointerEvents: 'auto'
                    }}
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
