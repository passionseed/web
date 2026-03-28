"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import gsap from "gsap";
import { ClipboardList, Users } from "lucide-react";
import type { HackathonParticipant } from "@/lib/hackathon/db";

const ONBOARDING_NUDGE_KEY = "hackathon_onboarding_nudge_dismissed";

export default function HackathonDashboardPage() {
  const router = useRouter();
  const waterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [participant, setParticipant] = useState<HackathonParticipant | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);

  useEffect(() => {
    if (waterRef.current) {
      gsap.to(waterRef.current, {
        yPercent: -100,
        duration: 0.9,
        ease: "power3.inOut",
        delay: 0.1,
      });
    }

    let attempts = 0;
    const maxAttempts = 6;

    const check = () => {
      fetch("/api/hackathon/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.participant) {
            fetch("/api/hackathon/pre-questionnaire")
              .then((r) => r.json())
              .then((questionnaireData) => {
                const complete = questionnaireData.data != null;
                setOnboardingComplete(complete);
                setParticipant(data.participant);

                if (
                  !complete &&
                  typeof window !== "undefined" &&
                  sessionStorage.getItem(ONBOARDING_NUDGE_KEY) !== "1"
                ) {
                  setShowOnboardingNudge(true);
                }

                if (contentRef.current) {
                  gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                  );
                }
              })
              .catch(() => {
                setOnboardingComplete(false);
                setParticipant(data.participant);
                if (
                  typeof window !== "undefined" &&
                  sessionStorage.getItem(ONBOARDING_NUDGE_KEY) !== "1"
                ) {
                  setShowOnboardingNudge(true);
                }
                if (contentRef.current) {
                  gsap.fromTo(
                    contentRef.current,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
                  );
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

  const dismissOnboardingNudge = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ONBOARDING_NUDGE_KEY, "1");
    }
    setShowOnboardingNudge(false);
  };

  const goToOnboarding = () => {
    dismissOnboardingNudge();
    router.push("/hackathon/onboarding?returnTo=/hackathon/dashboard");
  };

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
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}
    >
      <Dialog
        open={showOnboardingNudge}
        onOpenChange={(open) => {
          if (!open) dismissOnboardingNudge();
        }}
      >
        <DialogContent className="border-[#91C4E3]/25 bg-[#0d1219] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Complete your onboarding</DialogTitle>
            <DialogDescription className="text-gray-400 text-left">
              A short quiz helps us understand your goals and match you with problems and teammates.
              You can start it now or anytime from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={dismissOnboardingNudge}
            >
              Maybe later
            </Button>
            <Button
              type="button"
              className="bg-[#9D81AC] hover:bg-[#8a6f99] text-white"
              onClick={goToOnboarding}
            >
              Start onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#91C4E3] opacity-5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#9D81AC] opacity-5 blur-[150px] rounded-full pointer-events-none" />

      <div
        ref={waterRef}
        className="fixed inset-0 z-20 pointer-events-none overflow-hidden"
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
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      <div ref={contentRef} className="relative z-30 w-full max-w-lg px-6 py-12 text-center space-y-8 opacity-0">
        {participant ? (
          <>
            <div className="space-y-2">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)]">
                You&apos;re in!
              </h1>
              <p className="text-gray-400">Welcome to The Next Decade Hackathon 2026</p>
            </div>

            {onboardingComplete === false && (
              <div className="bg-amber-950/40 backdrop-blur-sm border border-amber-500/35 rounded-2xl p-5 text-left shadow-[0_0_32px_rgba(245,158,11,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-amber-500/15 p-2 text-amber-400">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <p className="text-amber-200 font-semibold text-sm uppercase tracking-wide">
                        Onboarding incomplete
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Finish the short quiz when you&apos;re ready — it powers problem picks and team matching.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        router.push("/hackathon/onboarding?returnTo=/hackathon/dashboard")
                      }
                      className="w-full sm:w-auto bg-amber-600/90 hover:bg-amber-600 text-white"
                    >
                      Start onboarding quiz
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {onboardingComplete === true && (
              <div className="bg-emerald-950/30 backdrop-blur-sm border border-emerald-500/25 rounded-2xl px-4 py-3 text-left">
                <p className="text-emerald-200/90 text-sm font-medium">Onboarding complete</p>
                <p className="text-gray-500 text-xs mt-0.5">Thanks — your responses are saved.</p>
              </div>
            )}

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
                    {new Date(participant.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="w-full bg-[#91C4E3]/15 hover:bg-[#91C4E3]/25 text-[#91C4E3] border border-[#91C4E3]/35"
            >
              <Link href="/hackathon/team" className="inline-flex items-center justify-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                Team dashboard
              </Link>
            </Button>

            <div className="bg-[#0d1219]/60 border border-[#A594BA]/20 rounded-2xl p-6 text-sm text-gray-400 space-y-2">
              <p className="text-white font-medium">What&apos;s next?</p>
              <p>
                The hackathon kicks off on{" "}
                <span className="text-[#91C4E3]">March 15, 2026</span>. We&apos;ll send event details and updates to
                your email.
              </p>
            </div>

            <Button onClick={handleLogout} variant="ghost" className="text-gray-500 hover:text-white text-sm">
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
