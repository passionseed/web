"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import type { HackathonParticipant } from "@/lib/hackathon/db";

export default function HackathonDashboardPage() {
  const router = useRouter();
  const waterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);

  useEffect(() => {
    // Drain water upward on mount (continues the transition from register page)
    if (waterRef.current) {
      gsap.to(waterRef.current, {
        yPercent: -100,
        duration: 0.9,
        ease: "power3.inOut",
        delay: 0.1,
      });
    }

    // Fetch session — retries a few times to handle the brief gap after registration
    let attempts = 0;
    const maxAttempts = 6;

    const check = () => {
      fetch("/api/hackathon/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.participant) {
            // Check if pre-questionnaire is completed
            fetch("/api/hackathon/pre-questionnaire")
              .then((r) => r.json())
              .then((questionnaireData) => {
                if (questionnaireData.data === null) {
                  // Questionnaire not completed, redirect to onboarding
                  router.replace("/hackathon/onboarding?returnTo=/hackathon/dashboard");
                } else {
                  // Questionnaire completed, show dashboard
                  setParticipant(data.participant);
                  if (contentRef.current) {
                    gsap.fromTo(contentRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
                  }
                }
              })
              .catch(() => {
                // On error, still show dashboard (fail open)
                setParticipant(data.participant);
                if (contentRef.current) {
                  gsap.fromTo(contentRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
                }
              });
          } else if (++attempts < maxAttempts) {
            setTimeout(check, 500);
          } else {
            router.replace("/hackathon/login");
          }
        })
        .catch(() => {
          if (++attempts < maxAttempts) setTimeout(check, 500);
          else router.replace("/hackathon/login");
        });
    };

    check();
  }, [router]);

  const handleLogout = async () => {
    if (waterRef.current) {
      gsap.fromTo(
        waterRef.current,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: 0.9,
          ease: "power3.inOut",
          onComplete: () => {
            fetch("/api/hackathon/logout", { method: "POST" }).then(() => {
              router.push("/hackathon");
            });
          },
        }
      );
    } else {
      await fetch("/api/hackathon/logout", { method: "POST" });
      router.push("/hackathon");
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#9D81AC] opacity-5 blur-[150px] rounded-full pointer-events-none" />

      {/* Water overlay — starts covering screen, drains upward */}
      <div
        ref={waterRef}
        className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #4a90c4 0%, #1a5a8a 50%, #0d3a5c 100%)" }}
      >
        <div className="absolute -top-10 left-0 w-[200%] h-16" style={{ animation: "waveShift 2s linear infinite" }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        @keyframes waveShift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div ref={contentRef} className="relative z-10 w-full max-w-lg px-6 py-12 text-center space-y-8 opacity-0">
        {participant ? (
          <>
            <div className="space-y-2">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)]">
                You're in!
              </h1>
              <p className="text-gray-400">Welcome to The Next Decade Hackathon 2026</p>
            </div>

            <div className="bg-[#0d1219]/80 backdrop-blur-sm border border-[#91C4E3]/20 rounded-2xl p-6 text-left space-y-4 shadow-[0_0_40px_rgba(145,196,227,0.08)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xl font-semibold">{participant.name}</p>
                  <p className="text-gray-400 text-sm">{participant.email}</p>
                </div>
                <span className="text-xs bg-[#91C4E3]/10 border border-[#91C4E3]/30 text-[#91C4E3] rounded-full px-3 py-1">
                  {participant.role}
                </span>
              </div>

              <div className="border-t border-[#91C4E3]/10 pt-4 space-y-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>University / Org</span>
                  <span className="text-white">{participant.university}</span>
                </div>
                {participant.team_name && (
                  <div className="flex justify-between">
                    <span>Team</span>
                    <span className="text-white">{participant.team_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Registered</span>
                  <span className="text-white">
                    {new Date(participant.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1219]/60 border border-[#A594BA]/20 rounded-2xl p-6 text-sm text-gray-400 space-y-2">
              <p className="text-white font-medium">What's next?</p>
              <p>The hackathon kicks off on <span className="text-[#91C4E3]">March 15, 2026</span>. We'll send event details and updates to your email.</p>
            </div>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-gray-500 hover:text-white text-sm"
            >
              Log out
            </Button>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Setting up your account...</p>
        )}
      </div>
    </div>
  );
}
