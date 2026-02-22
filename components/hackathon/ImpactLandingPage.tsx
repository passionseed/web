"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Users, BookOpen, FlaskConical, Rocket, Lightbulb, Shield } from "lucide-react";

interface ImpactLandingPageProps {
    isLoggedIn: boolean;
}

export default function ImpactLandingPage({ isLoggedIn }: ImpactLandingPageProps) {
    const router = useRouter();
    const starsRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLHeadingElement>(null);
    const waterRef = useRef<HTMLDivElement>(null);
    const supportCardsRef = useRef<(HTMLDivElement | null)[]>([]);

    const setWaterRef = useCallback((el: HTMLDivElement | null) => {
        waterRef.current = el;
        if (el) {
            gsap.set(el, { yPercent: 100, y: 200, autoAlpha: 1 });
        }
    }, []);

    const [showTitle, setShowTitle] = useState(false);
    const [showFloating, setShowFloating] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [instant, setInstant] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleJoinNow = () => {
        if (isTransitioning || !waterRef.current) return;
        setIsTransitioning(true);

        const targetPath = isLoggedIn ? "/hackathon/team" : "/hackathon/register";
        const tl = gsap.timeline();

        tl.fromTo(
            waterRef.current,
            { yPercent: 100, y: 200 },
            { yPercent: 0, y: 0, duration: 0.9, ease: "power3.inOut" }
        ).call(() => router.push(targetPath));
    };

    // Lock scroll during opening animation
    useEffect(() => {
        if (!showContent && !instant) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showContent, instant]);

    // Opening animation sequence
    useEffect(() => {
        if (sessionStorage.getItem("impact_skip_intro")) {
            sessionStorage.removeItem("impact_skip_intro");
            setInstant(true);
            setShowTitle(true);
            setShowFloating(true);
            setShowContent(true);
            return;
        }

        // Title glow animation
        setShowTitle(true);

        const contentTimer = setTimeout(() => {
            setShowFloating(true);

            // Stagger in support cards
            if (supportCardsRef.current.length > 0) {
                supportCardsRef.current.forEach((card, idx) => {
                    if (card) {
                        gsap.fromTo(
                            card,
                            { y: 60, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.8,
                                delay: idx * 0.15,
                                ease: "power3.out"
                            }
                        );
                    }
                });
            }

            setTimeout(() => setShowContent(true), 600);
        }, 1000);

        return () => clearTimeout(contentTimer);
    }, []);

    // Generate starfield
    useEffect(() => {
        if (starsRef.current) {
            const starCount = 120;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement("div");
                star.className = "absolute rounded-full bg-white";
                const size = Math.random() * 2.5 + 0.5;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.opacity = `${Math.random() * 0.8 + 0.2}`;
                star.style.animation = `twinkle ${Math.random() * 4 + 2}s infinite ease-in-out ${Math.random() * 2}s`;
                starsRef.current.appendChild(star);
            }
        }
    }, []);

    const supportItems = [
        {
            icon: Users,
            title: "Mentor",
            description: "คนคอยช่วยดูแล ให้คำแนะนำ และนำทางคุณตลอดการเดินทาง",
            color: "from-amber-400 to-orange-500",
            glow: "rgba(251, 146, 60, 0.3)"
        },
        {
            icon: BookOpen,
            title: "Learning Guideline",
            description: "แนวทางการเรียนรู้ที่ชัดเจน ครอบคลุมทุกขั้นตอนของการสร้าง Startup",
            color: "from-cyan-400 to-blue-500",
            glow: "rgba(34, 211, 238, 0.3)"
        },
        {
            icon: FlaskConical,
            title: "Tester",
            description: "ผู้ทดสอบที่จะช่วยให้คุณได้รับ feedback ที่มีค่า",
            color: "from-purple-400 to-pink-500",
            glow: "rgba(192, 132, 252, 0.3)"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0118] via-[#0d051a] to-[#03050a] text-white relative overflow-x-clip">
            {/* Font imports */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
            `}</style>

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
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-25px) rotate(5deg); }
                }
                @keyframes floatReverse {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(20px) rotate(-3deg); }
                }
                @keyframes titleReveal {
                    0% {
                        opacity: 0;
                        transform: scale(0.85);
                        filter: blur(20px);
                    }
                    60% {
                        filter: blur(0px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                        filter: blur(0px);
                    }
                }
                @keyframes wave1 {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                @keyframes wave2 {
                    from { transform: translateX(-22%); }
                    to { transform: translateX(-72%); }
                }
                @keyframes wave3 {
                    from { transform: translateX(-12%); }
                    to { transform: translateX(-62%); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                }
                .w1 { animation: wave1 11s linear infinite; }
                .w2 { animation: wave2 7.5s linear infinite; }
                .w3 { animation: wave3 4.8s linear infinite; }
                .animate-titleReveal {
                    animation: titleReveal 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
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
                <div className="absolute left-0 w1" style={{ top: "-130px", width: "200%", height: "130px" }}>
                    <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
                    </svg>
                    <svg viewBox="0 0 1440 130" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,65 C120,110 240,20 360,65 C480,110 600,20 720,65 C840,110 960,20 1080,65 C1200,110 1320,20 1440,65 L1440,130 L0,130 Z" fill="rgba(70,130,200,0.28)" />
                    </svg>
                </div>
                <div className="absolute left-0 w2" style={{ top: "-95px", width: "200%", height: "95px" }}>
                    <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
                    </svg>
                    <svg viewBox="0 0 1440 95" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,48 C180,85 360,11 540,48 C720,85 900,11 1080,48 C1260,85 1440,11 1440,48 L1440,95 L0,95 Z" fill="rgba(101,171,252,0.4)" />
                    </svg>
                </div>
                <div className="absolute left-0 w3" style={{ top: "-65px", width: "200%", height: "65px" }}>
                    <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
                    </svg>
                    <svg viewBox="0 0 1440 65" preserveAspectRatio="none" style={{ width: "50%", height: "100%", display: "inline-block" }}>
                        <path d="M0,32 C240,58 480,6 720,32 C960,58 1200,6 1440,32 L1440,65 L0,65 Z" fill="rgba(145,196,227,0.6)" />
                    </svg>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
                {/* Floating geometric shapes */}
                <div
                    className={`absolute top-20 left-[10%] pointer-events-none z-10 ${instant ? '' : 'transition-opacity duration-1000'} ${showFloating ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: showFloating ? 'float 8s infinite ease-in-out' : 'none' }}
                >
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 backdrop-blur-sm border border-cyan-400/30" style={{ transform: 'rotate(15deg)' }} />
                </div>
                <div
                    className={`absolute top-1/3 right-[8%] pointer-events-none z-10 ${instant ? '' : 'transition-opacity duration-1000'} ${showFloating ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: showFloating ? 'floatReverse 10s infinite ease-in-out' : 'none' }}
                >
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30" />
                </div>
                <div
                    className={`absolute bottom-1/4 left-[15%] pointer-events-none z-10 ${instant ? '' : 'transition-opacity duration-1000'} ${showFloating ? 'opacity-100' : 'opacity-0'}`}
                    style={{ animation: showFloating ? 'float 12s infinite ease-in-out 2s' : 'none' }}
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-500/20 backdrop-blur-sm border border-amber-400/30" style={{ transform: 'rotate(45deg)' }} />
                </div>

                {/* Ambient glows */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="container mx-auto max-w-7xl relative z-20">
                    {/* Partner logos */}
                    <div
                        className={`flex items-center justify-center gap-12 mb-20 ${instant ? '' : 'transition-opacity duration-1000 delay-300'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <div className="w-16 h-16 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                            <img src="/hackathon/PS.png" alt="Passion Seed" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="w-20 h-20 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                            <img src="/hackathon/AMSA.png" alt="AMSA Thailand" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="w-20 h-20 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                            <img src="/hackathon/StemLike.png" alt="STEM like Her" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>

                    {/* Main title */}
                    <div className="text-center space-y-8 mb-16">
                        <h1
                            ref={heroTextRef}
                            className={`text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none ${showTitle ? (instant ? 'opacity-100' : 'animate-titleReveal') : 'opacity-0'}`}
                            style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Anyone Can
                            </span>
                            <span className="block bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent mt-2">
                                Make an Impact
                            </span>
                        </h1>

                        <div
                            className={`max-w-4xl mx-auto ${instant ? '' : 'transition-all duration-1000 delay-500'} ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                        >
                            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                ที่ The Next Decade Hackathon 2026 <span className="text-cyan-400 font-semibold">พื้นฐานไม่ใช่ข้อจำกัด แต่คือจุดเริ่มต้นของการเรียนรู้</span> เราเปลี่ยนพื้นที่แข่งขันให้กลายเป็นโอกาสให้คุณได้ทดลอง สร้างสรรค์ และเรียนรู้จากการลงมือทำจริงได้แบบไม่ต้องกังวล ผ่านระบบเหล่านี้:
                            </p>
                        </div>

                        {/* CTA Button */}
                        <div
                            className={`pt-8 ${instant ? '' : 'transition-all duration-1000 delay-700'} ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                        >
                            <Button
                                size="lg"
                                onClick={handleJoinNow}
                                className="group relative bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white text-xl px-16 py-8 rounded-full shadow-[0_0_60px_rgba(34,211,238,0.4)] transition-all duration-300 hover:shadow-[0_0_80px_rgba(34,211,238,0.6)] transform hover:scale-105 border-0"
                                style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700 }}
                            >
                                <Rocket className="inline-block mr-3 group-hover:translate-x-1 transition-transform" size={24} />
                                {isLoggedIn ? "เข้าสู่พื้นที่ทีม" : "เริ่มต้นเลย"}
                            </Button>
                        </div>
                    </div>

                    {/* Support System Cards - Hero Version */}
                    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-24">
                        {supportItems.map((item, idx) => (
                            <div
                                key={idx}
                                ref={(el) => { supportCardsRef.current[idx] = el; }}
                                className="group relative opacity-0"
                            >
                                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 p-8 hover:border-white/20 transition-all duration-500 hover:scale-105 overflow-hidden">
                                    {/* Glow effect on hover */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                                        style={{ background: `radial-gradient(circle at center, ${item.glow} 0%, transparent 70%)` }}
                                    />

                                    <div className="relative z-10">
                                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} mb-6 shadow-lg`}>
                                            <item.icon className="text-white" size={32} strokeWidth={2.5} />
                                        </div>

                                        <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
                                            {item.title}
                                        </h3>

                                        <p className="text-gray-400 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Corner accent */}
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scroll indicator */}
                    <div
                        className={`absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 ${instant ? '' : 'transition-opacity duration-1000 delay-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <span className="text-xs tracking-widest uppercase text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>เลื่อนลงเพื่ออ่านเพิ่มเติม</span>
                        <div className="flex flex-col items-center gap-1 animate-bounce">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                                <path d="M8 3 L8 13 M3 8 L8 13 L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content sections with fade in */}
            <div
                className={`${instant ? '' : 'transition-opacity duration-1000'} ${showContent ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* The Journey Section */}
                <section className="py-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />

                    <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                        <div className="text-center mb-20">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: "'Sora', sans-serif" }}>
                                <span className="bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
                                    การเดินทางสู่ Impact
                                </span>
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                ประสบการณ์การสร้าง Startup แบบจำลองที่ครบถ้วน พร้อมการสนับสนุนในทุกขั้นตอน
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {[
                                {
                                    icon: Lightbulb,
                                    title: "ค้นพบปัญหาและโอกาส",
                                    description: "เริ่มต้นจากการทำความเข้าใจปัญหาจริงในสังคม และค้นหาโอกาสในการสร้างผลกระทบ",
                                    color: "from-yellow-400 to-amber-500"
                                },
                                {
                                    icon: Users,
                                    title: "เรียนรู้จากผู้เชี่ยวชาญ",
                                    description: "เข้าถึง Mentor และ Learning Guidelines ที่จะนำทางคุณผ่านทุกขั้นตอนของการสร้าง Startup",
                                    color: "from-cyan-400 to-blue-500"
                                },
                                {
                                    icon: FlaskConical,
                                    title: "ทดลองและพัฒนา",
                                    description: "สร้าง Prototype ทดสอบแนวคิด และปรับปรุงจาก Feedback ของ Testers",
                                    color: "from-purple-400 to-pink-500"
                                },
                                {
                                    icon: Rocket,
                                    title: "สร้าง Impact ที่แท้จริง",
                                    description: "นำเสนอผลงานและเชื่อมต่อกับ ecosystem ที่จะช่วยให้แนวคิดของคุณเติบโตต่อในโลกจริง",
                                    color: "from-emerald-400 to-green-500"
                                }
                            ].map((step, idx) => (
                                <div
                                    key={idx}
                                    className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/10 p-8 hover:border-white/20 transition-all duration-500 hover:scale-[1.02]"
                                >
                                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} mb-6`}>
                                        <step.icon className="text-white" size={28} strokeWidth={2.5} />
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
                                        {step.title}
                                    </h3>

                                    <p className="text-gray-400 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        {step.description}
                                    </p>

                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Support Deep Dive Section */}
                <section className="py-32 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-amber-500/5 blur-[150px] rounded-full" />
                        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[150px] rounded-full" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                        <div className="text-center mb-20">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: "'Sora', sans-serif" }}>
                                <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                                    ระบบสนับสนุนที่ครบครัน
                                </span>
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                เราเชื่อว่าทุกคนสามารถสร้าง Impact ได้ ด้วยการสนับสนุนที่เหมาะสม
                            </p>
                        </div>

                        <div className="space-y-8">
                            {/* Mentor Card - Large */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/20 p-12 overflow-hidden">
                                    <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
                                        <div className="flex items-center justify-center">
                                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/50">
                                                <Users className="text-white" size={48} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
                                                Mentor - คนคอยช่วยดูแล
                                            </h3>
                                            <p className="text-lg text-gray-300 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                ผู้เชี่ยวชาญที่มีประสบการณ์จริงจะอยู่เคียงข้างคุณตลอดการเดินทาง ให้คำแนะนำ ตอบคำถาม และช่วยนำทางเมื่อคุณต้องการความช่วยเหลือ คุณจะไม่โดดเดี่ยวในการเดินทางครั้งนี้
                                            </p>
                                        </div>
                                    </div>
                                    {/* Decorative elements */}
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl" />
                                </div>
                            </div>

                            {/* Learning Guideline & Tester - Side by side */}
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[2rem] border border-white/20 p-10 h-full">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/50">
                                            <BookOpen className="text-white" size={40} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
                                            Learning Guideline
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            แนวทางการเรียนรู้ที่ออกแบบมาอย่างละเอียด ครอบคลุมทุกขั้นตอนตั้งแต่การค้นหาปัญหา ไปจนถึงการพัฒนาและนำเสนอโซลูชัน
                                        </p>
                                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl" />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[2rem] border border-white/20 p-10 h-full">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/50">
                                            <FlaskConical className="text-white" size={40} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Sora', sans-serif" }}>
                                            Tester
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            ผู้ทดสอบที่จะช่วยให้คุณได้รับ Feedback ที่มีค่า ทดสอบแนวคิดและ Prototype ของคุณ เพื่อให้แน่ใจว่าสิ่งที่คุณสร้างนั้นตอบโจทย์ผู้ใช้จริง
                                        </p>
                                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why This Matters Section */}
                <section className="py-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />

                    <div className="container mx-auto px-4 relative z-10 max-w-5xl">
                        <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/[0.02] backdrop-blur-2xl rounded-[3rem] border border-white/20 p-12 md:p-16 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-[100px] rounded-full" />
                            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-gradient-to-br from-amber-500/20 to-pink-500/20 blur-[100px] rounded-full" />

                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-400 to-pink-400 mb-8 shadow-2xl">
                                    <Shield className="text-white" size={40} strokeWidth={2.5} />
                                </div>

                                <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ fontFamily: "'Sora', sans-serif" }}>
                                    <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                                        ไม่ต้องกังวลว่าจะทำได้หรือไม่
                                    </span>
                                </h2>

                                <div className="space-y-6 text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <p>
                                        เราเข้าใจว่าการเริ่มต้นสร้าง Startup อาจดูน่ากลัว โดยเฉพาะเมื่อคุณไม่มีประสบการณ์มาก่อน
                                    </p>
                                    <p className="text-xl font-semibold text-white">
                                        นั่นคือเหตุผลที่เราสร้างระบบสนับสนุนที่ครบครัน
                                    </p>
                                    <p>
                                        ไม่ว่าคุณจะมาจากพื้นฐานใด ไม่ว่าคุณจะมีทักษะอะไรอยู่แล้ว <span className="text-cyan-400 font-semibold">คุณสามารถสร้าง Impact ได้</span> ด้วยความช่วยเหลือจาก Mentor, Learning Guidelines ที่ชัดเจน และ Feedback จาก Tester
                                    </p>
                                    <p className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent mt-8">
                                        เพราะทุกคนมีศักยภาพที่จะเปลี่ยนแปลงโลก
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-32 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-[120px] rounded-full" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-4xl mx-auto space-y-10">
                            <h2 className="text-5xl md:text-7xl font-bold leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                                <span className="block bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                                    พร้อมที่จะเริ่มต้น
                                </span>
                                <span className="block bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent mt-2">
                                    สร้าง Impact แล้วหรือยัง?
                                </span>
                            </h2>

                            <p className="text-xl text-gray-400 max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                เข้าร่วมกับเราวันนี้ และเริ่มต้นการเดินทางสู่การสร้างความเปลี่ยนแปลงที่แท้จริง
                            </p>

                            <Button
                                size="lg"
                                onClick={handleJoinNow}
                                className="group relative bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white text-2xl px-20 py-10 rounded-full shadow-[0_0_60px_rgba(147,51,234,0.4)] transition-all duration-300 hover:shadow-[0_0_100px_rgba(147,51,234,0.6)] transform hover:scale-105 border-0"
                                style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700 }}
                            >
                                <Rocket className="inline-block mr-3 group-hover:translate-x-1 transition-transform" size={28} />
                                {isLoggedIn ? "เข้าสู่พื้นที่ทีม" : "เริ่มต้นเดินทางเลย"}
                            </Button>

                            <p className="text-sm text-gray-500 pt-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                เปิดรับสมัครทุกพื้นฐาน • ไม่จำกัดสาขา • สามารถสมัครเดี่ยวหรือเป็นทีมได้
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-16 border-t border-white/10 relative">
                    <div className="container mx-auto px-4">
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <img src="/hackathon/PS.png" alt="Passion Seed" className="h-12 opacity-60 hover:opacity-100 transition-opacity" />
                                <img src="/hackathon/AMSA.png" alt="AMSA Thailand" className="h-14 opacity-60 hover:opacity-100 transition-opacity" />
                                <img src="/hackathon/StemLike.png" alt="STEM like Her" className="h-14 opacity-60 hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-gray-400 text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
                                Anyone Can Make an Impact
                            </p>
                            <p className="text-gray-600 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                A Startup Simulation Experience by Passion Seed, AMSA Thailand & STEM Like Her
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
