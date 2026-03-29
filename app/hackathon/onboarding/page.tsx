"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  ArrowRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChipInput } from "@/components/hackathon/chip-input";
import { ProblemExplorer } from "@/components/hackathon/problem-explorer";

type WizardStep = "step1" | "step2" | "step3";

function StepProgress({ stepNum }: { stepNum: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              stepNum >= n ? "bg-blue-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">Step {stepNum} of 3</p>
    </div>
  );
}

export default function HackathonOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("step1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);

  // Step 1 form data
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Step 2 chip inputs
  const [loves, setLoves] = useState<string[]>([]);
  const [goodAt, setGoodAt] = useState<string[]>([]);

  // Step 3 problem preferences
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    setMounted(true);
    // Pre-fill name from hackathon session and check if questionnaire already completed
    fetch("/api/hackathon/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.participant?.name) {
          setParticipantName(data.participant.name);
        }
        // Check if questionnaire already completed - if so, redirect to dashboard
        return fetch("/api/hackathon/pre-questionnaire");
      })
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          // Questionnaire already completed, redirect to dashboard
          const returnTo = searchParams.get("returnTo") || "/hackathon/dashboard";
          router.replace(returnTo);
        }
      })
      .catch(() => {});
  }, [router, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.5 }
    );
    const elements = document.querySelectorAll(".ei-button-dawn, .ei-card");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentStep]);

  const handleStep1Submit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const name = fd.get("name") as string;
    const dream_faculty = fd.get("dream_faculty") as string;
    const confidence_level = fd.get("confidence_level") as string;
    const family_support_level = fd.get("family_support_level") as string;
    const school_level = fd.get("school_level") as string;
    const why_hackathon = fd.get("why_hackathon") as string;
    const team_role_preference = fd.get("team_role_preference") as string;
    const ai_proficiency = fd.get("ai_proficiency") as string;

    if (
      !name ||
      !dream_faculty ||
      !confidence_level ||
      !family_support_level ||
      !school_level ||
      !why_hackathon ||
      !team_role_preference ||
      !ai_proficiency
    ) {
      showToast("Please fill out all fields");
      return;
    }

    setFormData({
      name,
      dream_faculty,
      confidence_level,
      family_support_level,
      school_level,
      why_hackathon,
      team_role_preference,
      ai_proficiency,
    });
    setCurrentStep("step2");
  };

  const handleStep2Next = () => {
    if (loves.length === 0) {
      showToast("Please add at least one thing you love");
      return;
    }
    if (goodAt.length === 0) {
      showToast("Please add at least one thing you're good at");
      return;
    }
    setCurrentStep("step3");
  };

  const handleFinalSubmit = async () => {
    if (selectedProblems.length === 0) {
      showToast("Please select at least 1 problem");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/hackathon/pre-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          loves,
          good_at: goodAt,
          problem_preferences: selectedProblems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || "Failed to submit questionnaire");
        return;
      }

      showToast("Questionnaire submitted successfully!", "success");
      setTimeout(() => {
        // Check for returnTo query param
        const returnTo = searchParams.get("returnTo");
        router.push(returnTo || "/hackathon/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Submit error:", error);
      showToast("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const toastIcons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  return (
    <div className="dawn-theme relative min-h-screen w-full overflow-hidden bg-[#020617] text-slate-200 font-[family-name:var(--font-mitr)] flex items-center justify-center py-12 sm:py-24 px-4 sm:px-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <div className={`ei-toast ei-toast--${toast.type} in-view`}>
            {React.createElement(toastIcons[toast.type], { className: "w-5 h-5" })}
            <span className="flex-1 text-sm font-medium leading-snug">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ei-toast-close" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, #020617 0%, #0f172a 28%, #1e1b4b 58%, #312e81 82%, #1e3a5f 100%)" }}
        />
        <div className="absolute rounded-full blur-[80px] opacity-40 pointer-events-none" style={{ width: "35vw", height: "35vw", left: "-5%", top: "15%", background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)" }} />
        <div className="absolute rounded-full blur-[80px] opacity-35 pointer-events-none" style={{ width: "40vw", height: "40vw", right: "-5%", top: "-10%", background: "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)" }} />
        <div className="absolute rounded-full blur-[80px] opacity-30 pointer-events-none" style={{ width: "45vw", height: "35vw", left: "15%", bottom: "10%", background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.25) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none opacity-50" style={{ background: "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(254, 217, 92, 0.2) 0%, transparent 100%)", filter: "blur(40px)" }} />
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: About You ── */}
        {currentStep === "step1" && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 xl:gap-24"
          >
            <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-tight">
                Discover <br className="hidden sm:block" />
                Your{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Path
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-lg font-medium leading-relaxed">
                Tell us about your goals and aspirations — where you want to go, and why you&apos;re here.
              </p>
            </div>

            <div className="w-full lg:w-1/2 max-w-xl mx-auto lg:mx-0 mt-8 lg:mt-0">
              <div className="ei-card">
                <div className="p-5 sm:p-8 md:p-10 space-y-6">
                  <StepProgress stepNum={1} />

                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-medium text-white tracking-tight">About You</h2>
                    <p className="text-sm text-slate-400 font-medium">Your goals, your why, your role</p>
                  </div>

                  <form onSubmit={handleStep1Submit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="สมชาย ใจดี"
                        defaultValue={formData.name || participantName}
                        className="ei-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dream_faculty" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Dream faculty / major — and why
                      </Label>
                      <Textarea
                        id="dream_faculty"
                        name="dream_faculty"
                        required
                        rows={3}
                        placeholder="เช่น คณะวิศวกรรมศาสตร์ จุฬาฯ เพราะอยากสร้างระบบที่ช่วยคนได้จริง..."
                        defaultValue={formData.dream_faculty}
                        className="ei-input resize-none py-3"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="confidence_level" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Confidence in getting in
                        </Label>
                        <select id="confidence_level" name="confidence_level" required defaultValue={formData.confidence_level || ""} className="ei-select">
                          <option value="">Select level</option>
                          <option value="1">1 — ไม่มั่นใจเลย</option>
                          <option value="2">2</option>
                          <option value="3">3 — พอไหว</option>
                          <option value="4">4</option>
                          <option value="5">5 — มั่นใจมาก</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="family_support_level" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Family support level
                        </Label>
                        <select id="family_support_level" name="family_support_level" required defaultValue={formData.family_support_level || ""} className="ei-select">
                          <option value="">Select level</option>
                          <option value="1">1 — ไม่สนับสนุน</option>
                          <option value="2">2</option>
                          <option value="3">3 — พอสนับสนุน</option>
                          <option value="4">4</option>
                          <option value="5">5 — สนับสนุนเต็มที่</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="school_level" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        School Level / ระดับการศึกษา
                      </Label>
                      <select id="school_level" name="school_level" required defaultValue={formData.school_level || ""} className="ei-select">
                        <option value="">Select level</option>
                        <option value="university">University / มหาวิทยาลัย</option>
                        <option value="high_school">High School / มัธยมปลาย</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="why_hackathon" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Why did you join this hackathon?
                      </Label>
                      <Textarea
                        id="why_hackathon"
                        name="why_hackathon"
                        required
                        rows={2}
                        placeholder="เช่น อยากลองสร้างของจริง อยากเจอคนที่มีเป้าหมายคล้ายกัน..."
                        defaultValue={formData.why_hackathon}
                        className="ei-input resize-none py-3"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="team_role_preference" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Your primary role in a team
                        </Label>
                        <select id="team_role_preference" name="team_role_preference" required defaultValue={formData.team_role_preference || ""} className="ei-select">
                          <option value="">Select role</option>
                          <option value="builder">Builder (code / tech)</option>
                          <option value="designer">Designer (UX / visual)</option>
                          <option value="researcher">Researcher (data / insights)</option>
                          <option value="domain_expert">Domain expert (health / medicine)</option>
                          <option value="storyteller">Storyteller (pitch / strategy)</option>
                          <option value="generalist">Generalist (can do many things)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="ai_proficiency" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          AI proficiency
                        </Label>
                        <select id="ai_proficiency" name="ai_proficiency" required defaultValue={formData.ai_proficiency || ""} className="ei-select">
                          <option value="">Select level</option>
                          <option value="beginner">Beginner — ยังไม่เคยใช้มาก</option>
                          <option value="intermediate">Intermediate — ใช้บ้าง</option>
                          <option value="advanced">Advanced — ใช้ได้ดี</option>
                          <option value="expert">Expert — สร้าง AI ได้</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" className="ei-button-dawn w-full h-12 md:h-14 text-base md:text-lg">
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: What Lights You Up? ── */}
        {currentStep === "step2" && (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 max-w-3xl mx-auto w-full"
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-medium mb-4">
                <span className="text-white tracking-tight">What Lights You Up?</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
                สิ่งที่ทำให้คุณมีพลัง / Discover what energizes you
              </p>
            </div>

            <div className="ei-card p-8 sm:p-10 space-y-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep("step1")}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <StepProgress stepNum={2} />

              <div className="space-y-8">
                <ChipInput
                  label="Things I love & find energizing"
                  labelEn="สิ่งที่ฉันรักและมีพลัง"
                  prompt="What would you do even if no one was watching?"
                  value={loves}
                  onChange={setLoves}
                  placeholder="e.g., coding, drawing, helping others..."
                  maxChips={5}
                  minChips={1}
                />

                <ChipInput
                  label="Things I'm actually good at"
                  labelEn="สิ่งที่ฉันเก่ง"
                  prompt="What do others ask you to help with?"
                  value={goodAt}
                  onChange={setGoodAt}
                  placeholder="e.g., problem solving, writing, organizing..."
                  maxChips={5}
                  minChips={1}
                />
              </div>

              <div className="pt-2">
                <Button onClick={handleStep2Next} className="ei-button-dawn w-full h-14 text-lg">
                  <span>Continue to Problem Selection</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Explore the Problems ── */}
        {currentStep === "step3" && (
          <motion.div
            key="step3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 max-w-5xl mx-auto w-full"
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-medium mb-4">
                <span className="text-white tracking-tight">Explore the Problems</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
                เลือกปัญหาที่คุณสนใจ / Select problems that resonate with you
              </p>
            </div>

            <div className="ei-card p-6 sm:p-8 space-y-8">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep("step2")}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <StepProgress stepNum={3} />

              <ProblemExplorer
                selectedProblems={selectedProblems}
                onSelectionChange={setSelectedProblems}
              />

              <div className="pt-2">
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || selectedProblems.length === 0}
                  className="ei-button-dawn w-full h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <span>Complete Onboarding</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
