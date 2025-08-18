"use client";

import { useState, useEffect, useRef } from "react";

const AboutPage = () => {
  const [loading, setLoading] = useState(true);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const statsObserverRef = useRef<IntersectionObserver | null>(null);

  // Loading screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Custom cursor effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX - 10}px`;
        cursorRef.current.style.top = `${e.clientY - 10}px`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Scroll progress effect
  useEffect(() => {
    const handleScroll = () => {
      if (scrollProgressRef.current) {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        scrollProgressRef.current.style.height = `${scrollPercent}%`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px"
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, observerOptions);

    // Stats counter observer
    statsObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          const statNumber = entry.target.querySelector(".stat-number");
          if (statNumber && !statNumber.classList.contains('counting')) {
            statNumber.classList.add('counting');
            const target = parseInt(statNumber.getAttribute("data-target") || "0");
            animateCounter(statNumber, target);
          }
        }
      });
    }, { threshold: 0.5 });

    // Observe elements when DOM is loaded
    const observeElements = () => {
      const philosophyCards = document.querySelectorAll(".philosophy-card");
      const statItems = document.querySelectorAll(".stat-item");
      const philosophyTitle = document.querySelector(".philosophy h2");

      philosophyCards.forEach(card => observerRef.current?.observe(card));
      statItems.forEach(item => statsObserverRef.current?.observe(item));
      if (philosophyTitle) observerRef.current?.observe(philosophyTitle);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeElements);
    } else {
      observeElements();
    }

    return () => {
      observerRef.current?.disconnect();
      statsObserverRef.current?.disconnect();
    };
  }, []);

  // Counter animation function
  const animateCounter = (element: Element, target: number, duration = 2000) => {
    const startTime = performance.now();
    const startValue = 0;
    
    const updateCounter = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      const currentValue = Math.floor(progress * target);
      element.textContent = currentValue.toString();
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target.toString();
      }
    };
    
    requestAnimationFrame(updateCounter);
  };

  // Smooth scrolling for navigation
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  return (
    <div className="relative">
      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 bg-[#1a0d2e] flex items-center justify-center z-[10000] transition-opacity duration-1000">
          <div className="text-2xl font-light text-[#d8b4fe] animate-pulse">
            Discovering Purpose...
          </div>
        </div>
      )}

      {/* Custom Cursor */}
      <div 
        ref={cursorRef} 
        className="fixed w-5 h-5 bg-[rgba(216,180,254,0.8)] rounded-full pointer-events-none z-[9999] mix-blend-difference transition-transform duration-100 shadow-[0_0_10px_rgba(216,180,254,0.4)]"
      />

      {/* Scroll Progress */}
      <div className="fixed top-0 left-0 w-1 h-full bg-[rgba(147,51,234,0.2)] z-[1000]">
        <div 
          ref={scrollProgressRef} 
          className="w-full bg-gradient-to-b from-[#d8b4fe] to-[#9333ea] transition-height duration-100 shadow-[0_0_10px_rgba(216,180,254,0.6)]"
        />
      </div>

      {/* Hero Section */}
      <section className="relative py-24 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* Riso Print Dots Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(147,51,234,0.3)_1px,_transparent_0)] bg-[length:20px_20px] opacity-60 animate-dotsMove" />
          
          {/* Riso Texture Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(147,51,234,0.3)_0%,_transparent_50%),_radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.2)_0%,_transparent_50%),_radial-gradient(circle_at_40%_40%,_rgba(196,181,253,0.15)_0%,_transparent_50%)] animate-risoShift mix-blend-multiply" />
          
          {/* Animated Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.1)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(147,51,234,0.1)_1px,_transparent_1px)] bg-[length:50px_50px] animate-gridMove filter-contrast-120" />
          
          {/* Gradient Orbs */}
          <div className="absolute w-50 h-50 bg-[radial-gradient(circle,_rgba(147,51,234,0.6)_0%,_transparent_70%)] top-[20%] left-[10%] rounded-full filter-blur-[40px] opacity-40 animate-orbFloat" />
          <div className="absolute w-75 h-75 bg-[radial-gradient(circle,_rgba(168,85,247,0.4)_0%,_transparent_70%)] top-[60%] right-[15%] rounded-full filter-blur-[40px] opacity-40 animate-orbFloat animation-delay-10s" />
          <div className="absolute w-37.5 h-37.5 bg-[radial-gradient(circle,_rgba(196,181,253,0.5)_0%,_transparent_70%)] top-[40%] left-[60%] rounded-full filter-blur-[40px] opacity-40 animate-orbFloat animation-delay-5s" />
          
          {/* Animated Lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] h-0.5 w-full bg-[linear-gradient(90deg,_transparent,_rgba(147,51,234,0.4),_transparent)] animate-lineMove" />
            <div className="absolute top-[50%] h-0.5 w-full bg-[linear-gradient(90deg,_transparent,_rgba(168,85,247,0.3),_transparent)] animate-lineMove animation-delay-5s" />
            <div className="absolute top-[80%] h-0.5 w-full bg-[linear-gradient(90deg,_transparent,_rgba(196,181,253,0.4),_transparent)] animate-lineMove animation-delay-10s" />
          </div>
          
          {/* Floating Particles */}
          <div className="absolute inset-0">
            <div className="absolute w-20 h-20 left-[10%] bg-[radial-gradient(circle,_rgba(147,51,234,0.4),_rgba(147,51,234,0.1))] rounded-full animate-float animation-delay-0s" />
            <div className="absolute w-30 h-30 left-[70%] bg-[radial-gradient(circle,_rgba(168,85,247,0.3),_rgba(168,85,247,0.08))] rounded-full animate-float animation-delay-5s" />
            <div className="absolute w-15 h-15 left-[80%] bg-[radial-gradient(circle,_rgba(196,181,253,0.5),_rgba(196,181,253,0.1))] rounded-full animate-float animation-delay-10s" />
            <div className="absolute w-25 h-25 left-[20%] bg-[radial-gradient(circle,_rgba(109,40,217,0.4),_rgba(109,40,217,0.1))] rounded-full animate-float animation-delay-15s" />
            <div className="absolute w-10 h-10 left-[50%] bg-[radial-gradient(circle,_rgba(216,180,254,0.6),_rgba(216,180,254,0.1))] rounded-full animate-float animation-delay-8s" />
            <div className="absolute w-22.5 h-22.5 left-[30%] bg-[radial-gradient(circle,_rgba(139,69,199,0.3),_rgba(139,69,199,0.1))] rounded-full animate-float animation-delay-12s" />
          </div>
        </div>
        
        <div className="relative z-10 text-center">
          <h1 className="text-[clamp(3rem,8vw,8rem)] font-light tracking-tight opacity-0 animate-fadeInUp animation-delay-500ms">
            Passion Seed
          </h1>
          <p className="text-[clamp(1rem,2vw,1.5rem)] font-light mt-8 opacity-0 animate-fadeInUp animation-delay-1s text-[#d8b4fe]">
            A learning platform designed for schools,<br />helping students discover their purpose and reach their fullest potential
          </p>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section id="vision" className="relative py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-light mb-8 text-center opacity-0 transition-all duration-800 text-[#d8b4fe]">
            Empowering Student Discovery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
            <div className="philosophy-card p-12 bg-[rgba(255,255,255,0.05)] rounded-2xl backdrop-blur-sm border border-[rgba(147,51,234,0.2)] opacity-0 transform translate-y-24 transition-all duration-800 hover:transform hover:-translate-y-2.5 hover:bg-[rgba(147,51,234,0.08)] hover:border-[rgba(147,51,234,0.4)]">
              <h3 className="text-3xl font-light mb-6 text-[#d8b4fe]">Our Vision</h3>
              <p className="leading-relaxed text-[#e2e8f0]">
                To guide students toward purposeful goals by helping them discover meaningful values—reducing aimless screen time and inspiring them to live with direction.
              </p>
            </div>
            <div className="philosophy-card p-12 bg-[rgba(255,255,255,0.05)] rounded-2xl backdrop-blur-sm border border-[rgba(147,51,234,0.2)] opacity-0 transform translate-y-24 transition-all duration-800 hover:transform hover:-translate-y-2.5 hover:bg-[rgba(147,51,234,0.08)] hover:border-[rgba(147,51,234,0.4)]">
              <h3 className="text-3xl font-light mb-6 text-[#d8b4fe]">Our Mission</h3>
              <p className="leading-relaxed text-[#e2e8f0]">
                We empower students to uncover their passions through reflection and hands-on learning, connecting their interests to real-world careers. By bringing this journey directly into schools, we create environments where students can grow with clarity, confidence, and purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="impact" className="relative min-h-screen py-32 px-4 md:px-8 flex items-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-5xl font-light mb-16 text-center text-[#d8b4fe]">
            Our Impact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="stat-item text-center opacity-0 transform scale-80 transition-all duration-800">
              <span className="stat-number text-7xl font-light text-[#d8b4fe] block mb-4" data-target="2000">0</span>
              <span className="stat-label text-lg text-white">Students Reached</span>
            </div>
            <div className="stat-item text-center opacity-0 transform scale-80 transition-all duration-800">
              <span className="stat-number text-7xl font-light text-[#d8b4fe] block mb-4" data-target="50">0</span>
              <span className="stat-label text-lg text-white">Organizations Partnered</span>
            </div>
            <div className="stat-item text-center opacity-0 transform scale-80 transition-all duration-800">
              <span className="stat-number text-7xl font-light text-[#d8b4fe] block mb-4" data-target="89">0</span>
              <span className="stat-label text-lg text-white">Purpose Discovery Rate</span>
            </div>
            <div className="stat-item text-center opacity-0 transform scale-80 transition-all duration-800">
              <span className="stat-number text-7xl font-light text-[#d8b4fe] block mb-4" data-target="95">0</span>
              <span className="stat-label text-lg text-white">Student Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-100px) rotate(120deg);
          }
          66% {
            transform: translateY(-50px) rotate(240deg);
          }
        }
        
        @keyframes gridMove {
          0% {
            transform: translateX(0) translateY(0);
          }
          100% {
            transform: translateX(50px) translateY(50px);
          }
        }
        
        @keyframes orbFloat {
          0%, 100% {
            transform: translateX(0) translateY(0) scale(1);
          }
          25% {
            transform: translateX(30px) translateY(-40px) scale(1.1);
          }
          50% {
            transform: translateX(-20px) translateY(-80px) scale(0.9);
          }
          75% {
            transform: translateX(-40px) translateY(-20px) scale(1.05);
          }
        }
        
        @keyframes risoShift {
          0%, 100% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translateX(20px) translateY(-10px) scale(1.05);
            opacity: 0.8;
          }
          50% {
            transform: translateX(-15px) translateY(15px) scale(0.95);
            opacity: 0.7;
          }
          75% {
            transform: translateX(10px) translateY(-20px) scale(1.02);
            opacity: 0.9;
          }
        }
        
        @keyframes dotsMove {
          0% {
            transform: translateX(0) translateY(0);
          }
          100% {
            transform: translateX(20px) translateY(20px);
          }
        }
        
        @keyframes lineMove {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 2s ease forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 2s ease forwards;
        }
        
        .animate-float {
          animation: float 20s infinite ease-in-out;
        }
        
        .animate-gridMove {
          animation: gridMove 30s linear infinite;
        }
        
        .animate-orbFloat {
          animation: orbFloat 25s infinite ease-in-out;
        }
        
        .animate-risoShift {
          animation: risoShift 20s ease-in-out infinite;
        }
        
        .animate-dotsMove {
          animation: dotsMove 40s linear infinite;
        }
        
        .animate-lineMove {
          animation: lineMove 15s infinite linear;
        }
        
        .animation-delay-0s {
          animation-delay: 0s;
        }
        
        .animation-delay-5s {
          animation-delay: -5s;
        }
        
        .animation-delay-10s {
          animation-delay: -10s;
        }
        
        .animation-delay-15s {
          animation-delay: -15s;
        }
        
        .animation-delay-8s {
          animation-delay: -8s;
        }
        
        .animation-delay-12s {
          animation-delay: -12s;
        }
        
        .animation-delay-500ms {
          animation-delay: 0.5s;
        }
        
        .animation-delay-1s {
          animation-delay: 1s;
        }
        
        .filter-contrast-120 {
          filter: contrast(1.2);
        }
        
        .filter-blur-40px {
          filter: blur(40px);
        }
        
        .philosophy-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .stat-item.visible {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>
    </div>
  );
};

export default AboutPage;
