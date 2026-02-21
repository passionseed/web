"use client";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Clock } from "lucide-react";
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
        }, 1400);

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
                            className="text-5xl md:text-6xl font-semibold text-white mb-3 font-[family-name:var(--font-reenie-beanie)]"
                            style={{
                                clipPath: 'inset(0 100% 0 0)',
                                textShadow: '0 0 30px rgba(145,196,227,0.4)',
                            }}
                        >
                            Preventive Healthcare
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
                {/* Event Details Section */}
                <section className="py-16 relative z-10">
                    {/* Jellyfish decoration */}
                    <div className="absolute bottom-10 left-10 opacity-20 pointer-events-none" style={{ animation: 'float 7s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-32 h-32" style={{ filter: 'drop-shadow(0 0 12px rgba(165,148,186,0.5))' }} />
                    </div>

                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                            {/* Date & Time */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#91C4E3]/30 hover:border-[#91C4E3]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(145,196,227,0.3)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="w-8 h-8 text-[#91C4E3]" />
                                    <h3 className="text-xl font-semibold">Date & Time</h3>
                                </div>
                                <p className="text-gray-300">March 15-17, 2026</p>
                                <p className="text-gray-400 text-sm mt-1">48 Hours of Innovation</p>
                            </div>

                            {/* Location */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#A594BA]/30 hover:border-[#A594BA]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(165,148,186,0.3)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <MapPin className="w-8 h-8 text-[#A594BA]" />
                                    <h3 className="text-xl font-semibold">Location</h3>
                                </div>
                                <p className="text-gray-300">Innovation Hub</p>
                                <p className="text-gray-400 text-sm mt-1">Hybrid Event</p>
                            </div>

                            {/* Prize Pool */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#91C4E3]/30 hover:border-[#91C4E3]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(145,196,227,0.3)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <Trophy className="w-8 h-8 text-[#91C4E3]" />
                                    <h3 className="text-xl font-semibold">Prize Pool</h3>
                                </div>
                                <p className="text-gray-300">$50,000</p>
                                <p className="text-gray-400 text-sm mt-1">Total Prizes</p>
                            </div>

                            {/* Duration */}
                            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#A594BA]/30 hover:border-[#A594BA]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(165,148,186,0.3)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="w-8 h-8 text-[#A594BA]" />
                                    <h3 className="text-xl font-semibold">Duration</h3>
                                </div>
                                <p className="text-gray-300">48 Hours</p>
                                <p className="text-gray-400 text-sm mt-1">Non-stop Coding</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section className="py-16 relative z-10">
                    {/* Jellyfish decoration */}
                    <div className="absolute right-16 top-1/3 opacity-20 pointer-events-none" style={{ animation: 'floatReverse 9s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-44 h-44" style={{ filter: 'drop-shadow(0 0 16px rgba(145,196,227,0.4))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="absolute right-0 top-1/2 w-[500px] h-[500px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-4xl font-bold mb-8 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                                <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                    About the Hackathon
                                </span>
                            </h2>
                            <div className="bg-[#0d1219]/60 backdrop-blur-sm p-8 rounded-2xl border border-[#91C4E3]/30 shadow-[0_0_30px_rgba(145,196,227,0.1)]">
                                <p className="text-gray-300 text-lg leading-relaxed mb-4">
                                    The Next Decade Hackathon focuses on preventive healthcare solutions that will shape the future of medicine.
                                    We're bringing together developers, designers, healthcare professionals, and innovators to create
                                    technology that prevents illness before it starts.
                                </p>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Join us for 48 hours of intensive collaboration, learning, and building. Work alongside industry experts,
                                    access cutting-edge tools, and compete for prizes while making a real impact on global health.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <HackathonTimeline />

                {/* Prizes Section */}
                <section className="py-16 relative z-10">
                    {/* Jellyfish decoration */}
                    <div className="absolute left-10 top-1/3 opacity-25 pointer-events-none" style={{ animation: 'float 10s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-36 h-36" style={{ filter: 'drop-shadow(0 0 14px rgba(165,148,186,0.5))' }} />
                    </div>

                    <div className="absolute left-0 top-1/2 w-[500px] h-[500px] bg-[#A594BA] opacity-5 blur-[150px] rounded-full" />

                    <div className="container mx-auto px-4 relative z-10">
                        <h2 className="text-4xl font-bold mb-12 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                Prizes & Rewards
                            </span>
                        </h2>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            {/* First Place */}
                            <div className="bg-[#0d1219]/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-[#91C4E3] relative overflow-hidden group hover:shadow-[0_0_60px_rgba(145,196,227,0.6)] transition-all duration-300">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#91C4E3] opacity-15 blur-[60px] group-hover:opacity-30 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🥇</div>
                                    <h3 className="text-2xl font-bold text-[#91C4E3] mb-2">1st Place</h3>
                                    <p className="text-4xl font-bold mb-4">$25,000</p>
                                    <ul className="text-gray-300 space-y-2">
                                        <li>• Mentorship Program</li>
                                        <li>• Incubator Access</li>
                                        <li>• Tech Credits</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Second Place */}
                            <div className="bg-[#0d1219]/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-[#A594BA] relative overflow-hidden group hover:shadow-[0_0_60px_rgba(165,148,186,0.6)] transition-all duration-300">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#A594BA] opacity-15 blur-[60px] group-hover:opacity-30 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🥈</div>
                                    <h3 className="text-2xl font-bold text-[#A594BA] mb-2">2nd Place</h3>
                                    <p className="text-4xl font-bold mb-4">$15,000</p>
                                    <ul className="text-gray-300 space-y-2">
                                        <li>• Workshop Access</li>
                                        <li>• Networking Events</li>
                                        <li>• Tech Credits</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Third Place */}
                            <div className="bg-[#0d1219]/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-[#91C4E3]/60 relative overflow-hidden group hover:shadow-[0_0_60px_rgba(145,196,227,0.5)] transition-all duration-300">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#91C4E3] opacity-15 blur-[60px] group-hover:opacity-30 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">🥉</div>
                                    <h3 className="text-2xl font-bold text-[#91C4E3]/90 mb-2">3rd Place</h3>
                                    <p className="text-4xl font-bold mb-4">$10,000</p>
                                    <ul className="text-gray-300 space-y-2">
                                        <li>• Community Access</li>
                                        <li>• Learning Resources</li>
                                        <li>• Tech Credits</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Partners Section */}
                <section className="py-16 relative z-10">
                    {/* Jellyfish decoration */}
                    <div className="absolute right-1/4 bottom-10 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 6s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-28 h-28" style={{ filter: 'drop-shadow(0 0 12px rgba(145,196,227,0.4))', transform: 'scaleX(-1)' }} />
                    </div>

                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-bold mb-12 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
                            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
                                Our Partners
                            </span>
                        </h2>

                        <div className="max-w-5xl mx-auto">
                            <div className="bg-[#0d1219]/60 backdrop-blur-sm p-12 rounded-2xl border border-[#91C4E3]/30 shadow-[0_0_30px_rgba(145,196,227,0.1)]">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
                                    {/* Placeholder for partner logos */}
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="w-32 h-32 rounded-xl bg-[#0a0e1a]/80 border border-[#91C4E3]/20 flex items-center justify-center text-gray-600 hover:border-[#91C4E3]/40 transition-all duration-300"
                                        >
                                            Partner {i}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 relative z-10">
                    {/* Large jellyfish decoration */}
                    <div className="absolute top-10 right-1/3 opacity-20 pointer-events-none" style={{ animation: 'float 12s infinite ease-in-out' }}>
                        <img src="/hackathon/Creature/Jellyfish 1.svg" alt="" className="w-52 h-52" style={{ filter: 'drop-shadow(0 0 20px rgba(165,148,186,0.4))' }} />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-r from-[#91C4E3]/5 to-[#A594BA]/5 blur-3xl" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto space-y-6">
                            <h2 className="text-4xl font-bold">
                                Ready to Shape the Future of Healthcare?
                            </h2>
                            <p className="text-xl text-gray-300">
                                Join hundreds of innovators in building tomorrow's preventive healthcare solutions
                            </p>
                            <Button
                                size="lg"
                                onClick={handleRegister}
                                className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] hover:from-[#7ab3d3] hover:to-[#9484aa] text-white text-xl px-12 py-6 rounded-full shadow-[0_0_30px_rgba(145,196,227,0.5)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(145,196,227,0.8)] transform hover:scale-105"
                            >
                                {isLoggedIn ? "Your Team" : "Register for Free"}
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-8 border-t border-[#91C4E3]/30 relative z-10">
                    <div className="container mx-auto px-4">
                        <p className="text-center text-gray-500">
                            The Next Decade Hackathon 2026 - Preventive Healthcare
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
