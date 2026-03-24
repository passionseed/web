"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  isLoggedIn: boolean;
  onRegister: () => void;
}

export function HeroSection({ isLoggedIn, onRegister }: HeroSectionProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLHeadingElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Initialize GSAP animations
  useEffect(() => {
    // Fade in logo
    gsap.fromTo(
      logoRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );

    // Slide up tagline with delay
    gsap.fromTo(
      taglineRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.3 }
    );

    // Fade in details
    gsap.fromTo(
      detailsRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.6 }
    );

    // Pulse CTA button
    gsap.fromTo(
      ctaRef.current,
      { scale: 0.9 },
      { 
        scale: 1, 
        duration: 0.6, 
        ease: "elastic.out(1, 0.5)",
        delay: 1.0 
      }
    );

    // Add subtle floating animation to logo
    const logoTl = gsap.timeline({ repeat: -1, yoyo: true });
    logoTl.to(logoRef.current, { 
      y: -10, 
      duration: 3, 
      ease: "sine.inOut" 
    });
  }, []);

  const handleRegister = useCallback(() => {
    gsap.to(ctaRef.current, { 
      scale: 0.95, 
      duration: 0.1, 
      yoyo: true, 
      repeat: 1,
      onComplete: onRegister
    });
  }, [onRegister]);

  return (
    <section className="relative min-h-[600px] flex flex-col items-center justify-center px-4 pt-20 pb-16 bg-[#03050a] overflow-hidden">
      {/* Dawn gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#03050a]/80 to-[#03050a]/20 pointer-events-none" />
      
      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left floating element */}
        <div className="absolute left-[-80px] top-[20%] w-[200px] h-[200px] bg-gradient-to-r from-[#3b82f6]/10 to-transparent blur-3xl" />
        {/* Right floating element */}
        <div className="absolute right-[-80px] bottom-[20%] w-[200px] h-[200px] bg-gradient-to-br from-[#a855f7]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-2xl space-y-6">
        {/* Logo */}
        <div ref={logoRef} className="flex justify-center mb-4">
          <img
            src="/hackathon/HackLogo.png"
            alt="The Next Decade Hackathon"
            className="w-24 h-24 md:w-32 md:h-32"
          />
        </div>

        {/* Tagline */}
        <h1
          ref={taglineRef}
          className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          The Next Decade Hackathon
        </h1>

        {/* Details */}
        <div ref={detailsRef} className="text-slate-300 space-y-2 max-w-xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              March 23-25, 2026
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
              Virtual Event
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
              Healthcare Innovation
            </span>
          </div>
          
          <p className="text-base leading-relaxed">
            Join 500+ innovators to build solutions that transform preventive and predictive healthcare through technology, collaboration, and bold thinking.
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-4">
          <button
            ref={ctaRef}
            className="ei-button-dawn w-full max-w-xs text-lg px-8 py-4 transition-all hover:scale-[1.02]"
            onClick={handleRegister}
          >
            {isLoggedIn ? "View Your Team →" : "Register Now →"}
          </button>
        </div>
      </div>
    </section>
  );
}