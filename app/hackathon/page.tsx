"use client";

import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

export default function HackathonPage() {
  const router = useRouter();
  const starsRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLHeadingElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const [showTitle, setShowTitle] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleRegister = () => {
    if (isTransitioning || !waterRef.current) return;
    setIsTransitioning(true);

    const tl = gsap.timeline();

    // Water rises to fill screen
    tl.fromTo(
      waterRef.current,
      { yPercent: 100 },
      { yPercent: 0, duration: 0.9, ease: "power3.inOut" }
    )
    // Hold briefly at peak, then navigate
    .call(() => router.push("/hackathon/register"))
    // Water drains upward after navigation
    .to(waterRef.current, {
      yPercent: -100,
      duration: 0.7,
      ease: "power3.inOut",
      delay: 0.3,
      onComplete: () => setIsTransitioning(false),
    });
  };

  useEffect(() => {
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
          // Step 3: after writing finishes, fade in the rest
          onComplete: () => setShowContent(true),
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
    <div className="min-h-screen bg-[#03050a] text-white relative overflow-hidden">
      {/* Black overlay that fades out */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-1000 ${
          showContent ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Starfield background */}
      <div
        ref={starsRef}
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
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
      `}</style>

      {/* Water transition overlay */}
      <div
        ref={waterRef}
        className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
        style={{ transform: 'translateY(100%)', background: 'linear-gradient(to bottom, #4a90c4 0%, #1a5a8a 50%, #0d3a5c 100%)' }}
      >
        {/* Animated wave at the top surface */}
        <div className="absolute -top-10 left-0 w-[200%] h-16 animate-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Glowing Octopus - Top Left - fades in with content */}
        <div
          className={`absolute top-20 left-10 opacity-30 pointer-events-none transition-opacity duration-1000 ${
            showContent ? 'opacity-30' : 'opacity-0'
          }`}
          style={{ animation: 'float 6s infinite ease-in-out' }}
        >
          <div className="relative w-64 h-64">
            {/* Octopus body */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-[#91C4E3] to-[#6ba5c9] rounded-full opacity-60 blur-xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#91C4E3] rounded-full opacity-40 shadow-[0_0_60px_rgba(145,196,227,0.6)]" />
            {/* Tentacles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-24 bg-gradient-to-b from-[#91C4E3] to-transparent rounded-full opacity-40 shadow-[0_0_20px_rgba(145,196,227,0.4)]"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(20px)`,
                  transformOrigin: 'top center'
                }}
              />
            ))}
            {/* Glowing dots on tentacles */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`dot-${i}`}
                className="absolute w-1.5 h-1.5 bg-[#91C4E3] rounded-full shadow-[0_0_10px_rgba(145,196,227,0.8)]"
                style={{
                  left: `${(i * 23 + 17) % 100}%`,
                  top: `${(i * 31 + 13) % 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Glowing Jellyfish - Top Right */}
        <div
          className={`absolute top-32 right-20 opacity-30 pointer-events-none transition-opacity duration-1000 ${
            showContent ? 'opacity-30' : 'opacity-0'
          }`}
          style={{ animation: 'floatReverse 8s infinite ease-in-out' }}
        >
          <div className="relative w-48 h-64">
            {/* Jellyfish bell */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32">
              <div className="w-full h-full bg-gradient-to-b from-[#A594BA] to-[#8a7aa0] rounded-full opacity-50 blur-2xl" />
              <div className="absolute inset-0 w-full h-full bg-[#A594BA] rounded-full opacity-30 shadow-[0_0_80px_rgba(165,148,186,0.6)]" />
            </div>
            {/* Jellyfish tentacles */}
            {[...Array(6)].map((_, i) => {
              const heights = [110, 95, 125, 88, 118, 102];
              return (
                <div
                  key={i}
                  className="absolute top-24 w-1 bg-gradient-to-b from-[#A594BA] via-[#A594BA]/40 to-transparent rounded-full opacity-40"
                  style={{
                    left: `${30 + i * 10}%`,
                    height: `${heights[i]}px`,
                    animation: `float ${3 + i * 0.5}s infinite ease-in-out`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              );
            })}
            {/* Glowing spots */}
            {[...Array(8)].map((_, i) => (
              <div
                key={`spot-${i}`}
                className="absolute w-2 h-2 bg-[#A594BA] rounded-full shadow-[0_0_15px_rgba(165,148,186,0.8)]"
                style={{
                  left: `${30 + (i % 4) * 15}%`,
                  top: `${10 + Math.floor(i / 4) * 20}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Additional glowing effects */}
        <div
          className={`absolute top-40 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] blur-[150px] rounded-full transition-opacity duration-1000 ${
            showContent ? 'opacity-5' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute top-60 right-1/3 w-[400px] h-[400px] bg-[#A594BA] blur-[150px] rounded-full transition-opacity duration-1000 ${
            showContent ? 'opacity-5' : 'opacity-0'
          }`}
        />

        <div className="container mx-auto px-4 py-20 relative z-50">
          <div className="text-center max-w-4xl mx-auto space-y-4">
            {/* Partner logos */}
            <div
              className={`flex items-center justify-center gap-16 -mt-36 mb-16 transition-opacity duration-1000 ${
                showContent ? 'opacity-100' : 'opacity-0'
              }`}
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
              className={`text-6xl md:text-7xl font-bold tracking-tight relative z-50 ${showTitle ? 'animate-titleGlowUp' : 'opacity-0'}`}
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
              className={`transition-opacity duration-1000 ${
                showContent ? 'opacity-100' : 'opacity-0'
              }`}
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
                  Register Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All content sections that fade in after title */}
      <div
        className={`transition-opacity duration-1000 ${
          showContent ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Event Details Section */}
        <section className="py-16 relative z-10">
        {/* Small glowing jellyfish decoration */}
        <div className="absolute bottom-20 left-10 opacity-20 pointer-events-none" style={{ animation: 'float 7s infinite ease-in-out' }}>
          <div className="w-24 h-32">
            <div className="w-16 h-16 bg-[#A594BA] rounded-full opacity-40 blur-xl shadow-[0_0_40px_rgba(165,148,186,0.6)]" />
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute top-12 w-0.5 h-16 bg-gradient-to-b from-[#A594BA] to-transparent"
                style={{ left: `${25 + i * 15}%` }}
              />
            ))}
          </div>
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
        {/* Glowing octopus decoration */}
        <div className="absolute right-20 top-1/2 opacity-20 pointer-events-none" style={{ animation: 'floatReverse 9s infinite ease-in-out' }}>
          <div className="relative w-40 h-40">
            <div className="absolute top-0 left-0 w-20 h-20 bg-[#91C4E3] rounded-full opacity-40 blur-xl shadow-[0_0_50px_rgba(145,196,227,0.6)]" />
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute top-10 left-10 w-1.5 h-16 bg-gradient-to-b from-[#91C4E3] to-transparent rounded-full opacity-30"
                style={{ transform: `rotate(${i * 60}deg) translateY(10px)` }}
              />
            ))}
          </div>
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

      {/* Schedule Section */}
      <section className="py-16 relative z-10">
        {/* Small glowing creatures */}
        <div className="absolute left-1/4 top-20 opacity-15 pointer-events-none" style={{ animation: 'float 5s infinite ease-in-out' }}>
          <div className="w-12 h-12 bg-[#A594BA] rounded-full opacity-50 blur-lg shadow-[0_0_30px_rgba(165,148,186,0.5)]" />
        </div>

        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center" style={{ textShadow: '0 0 30px rgba(145,196,227,0.3)' }}>
            <span className="bg-gradient-to-r from-[#91C4E3] to-[#A594BA] bg-clip-text text-transparent">
              Event Schedule
            </span>
          </h2>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Day 1 */}
            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#91C4E3]/30 hover:shadow-[0_0_30px_rgba(145,196,227,0.2)] transition-all duration-300">
              <h3 className="text-2xl font-semibold text-[#91C4E3] mb-4">Day 1 - March 15</h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">09:00 AM</span>
                  <span className="text-gray-300">Registration & Welcome Breakfast</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">10:00 AM</span>
                  <span className="text-gray-300">Opening Ceremony & Keynote</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">12:00 PM</span>
                  <span className="text-gray-300">Hacking Begins!</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">06:00 PM</span>
                  <span className="text-gray-300">Dinner & Networking</span>
                </div>
              </div>
            </div>

            {/* Day 2 */}
            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#A594BA]/30 hover:shadow-[0_0_30px_rgba(165,148,186,0.2)] transition-all duration-300">
              <h3 className="text-2xl font-semibold text-[#A594BA] mb-4">Day 2 - March 16</h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <span className="text-[#91C4E3] font-mono min-w-[100px]">08:00 AM</span>
                  <span className="text-gray-300">Breakfast & Workshops</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#91C4E3] font-mono min-w-[100px]">12:00 PM</span>
                  <span className="text-gray-300">Lunch & Mentor Sessions</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#91C4E3] font-mono min-w-[100px]">06:00 PM</span>
                  <span className="text-gray-300">Dinner & Tech Talks</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#91C4E3] font-mono min-w-[100px]">10:00 PM</span>
                  <span className="text-gray-300">Midnight Snacks & Coding Sprint</span>
                </div>
              </div>
            </div>

            {/* Day 3 */}
            <div className="bg-[#0d1219]/80 backdrop-blur-sm p-6 rounded-2xl border border-[#91C4E3]/30 hover:shadow-[0_0_30px_rgba(145,196,227,0.2)] transition-all duration-300">
              <h3 className="text-2xl font-semibold text-[#91C4E3] mb-4">Day 3 - March 17</h3>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">08:00 AM</span>
                  <span className="text-gray-300">Breakfast & Final Sprint</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">12:00 PM</span>
                  <span className="text-gray-300">Submissions Deadline</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">02:00 PM</span>
                  <span className="text-gray-300">Project Presentations</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[#A594BA] font-mono min-w-[100px]">05:00 PM</span>
                  <span className="text-gray-300">Awards Ceremony & Closing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prizes Section */}
      <section className="py-16 relative z-10">
        {/* Jellyfish decoration */}
        <div className="absolute left-10 top-1/3 opacity-25 pointer-events-none" style={{ animation: 'float 10s infinite ease-in-out' }}>
          <div className="relative w-32 h-40">
            <div className="w-20 h-20 bg-[#A594BA] rounded-full opacity-40 blur-xl shadow-[0_0_50px_rgba(165,148,186,0.6)] mx-auto" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute top-16 w-0.5 h-20 bg-gradient-to-b from-[#A594BA] to-transparent"
                style={{ left: `${20 + i * 12}%`, opacity: 0.4 }}
              />
            ))}
          </div>
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
        {/* Small octopus decoration */}
        <div className="absolute right-1/4 bottom-10 opacity-15 pointer-events-none" style={{ animation: 'floatReverse 6s infinite ease-in-out' }}>
          <div className="relative w-24 h-24">
            <div className="w-12 h-12 bg-[#91C4E3] rounded-full opacity-40 blur-lg shadow-[0_0_30px_rgba(145,196,227,0.5)] mx-auto" />
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute top-6 left-6 w-1 h-12 bg-gradient-to-b from-[#91C4E3] to-transparent rounded-full opacity-30"
                style={{ transform: `rotate(${i * 60}deg) translateY(6px)` }}
              />
            ))}
          </div>
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
          <div className="relative w-40 h-52">
            <div className="w-28 h-28 bg-[#A594BA] rounded-full opacity-40 blur-2xl shadow-[0_0_60px_rgba(165,148,186,0.6)] mx-auto" />
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute top-20 w-1 bg-gradient-to-b from-[#A594BA] via-[#A594BA]/30 to-transparent"
                style={{
                  left: `${25 + i * 12}%`,
                  height: `${70 + i * 10}px`,
                  opacity: 0.4
                }}
              />
            ))}
          </div>
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
              Register for Free
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
