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
import { useRouter } from "next/navigation";
import { IkigaiDiagramInteractive } from "@/components/ikigai-diagram-interactive";

type WizardStep = "step1" | "ikigai";

interface IkigaiItem {
  id: string;
  text: string;
  x: number;
  y: number;
  category: "love" | "good_at" | "paid_for" | "needs";
}

function stepToNum(step: WizardStep): number {
  return step === "step1" ? 1 : 2;
}

function StepProgress({ stepNum }: { stepNum: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              stepNum >= n ? "bg-blue-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">Step {stepNum} of 2</p>
    </div>
  );
}

export default function PreQuestionnairePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("step1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);

  // Form data
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [ikigaiItems, setIkigaiItems] = useState<IkigaiItem[]>([]);

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Touch device fallback for animations
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll(".ei-button-dawn, .ei-card");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [currentStep]);

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const name = fd.get("name") as string;
    const uni_strategy = fd.get("uni_strategy") as string;
    const confidence_level = fd.get("confidence_level") as string;
    const parent_support_level = fd.get("parent_support_level") as string;
    const ideal_success_scenario = fd.get("ideal_success_scenario") as string;
    const self_learn_enjoyment = fd.get("self_learn_enjoyment") as string;
    const ai_proficiency = fd.get("ai_proficiency") as string;
    const learning_style = fd.get("learning_style") as string;

    if (
      !name ||
      !uni_strategy ||
      !confidence_level ||
      !parent_support_level ||
      !ideal_success_scenario ||
      !self_learn_enjoyment ||
      !ai_proficiency ||
      !learning_style
    ) {
      showToast("Please fill out all fields");
      return;
    }

    setFormData({
      name,
      uni_strategy,
      confidence_level,
      parent_support_level,
      ideal_success_scenario,
      self_learn_enjoyment,
      ai_proficiency,
      learning_style,
    });
    setCurrentStep("ikigai");
  };

  if (!mounted) return null;

  const toastIcons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  const stepNum = stepToNum(currentStep);

  return (
    <div className="dawn-theme relative min-h-screen w-full overflow-hidden bg-[#020617] text-slate-200 font-[family-name:var(--font-kodchasan)] flex items-center justify-center py-12 sm:py-24 px-4 sm:px-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <div className={`ei-toast ei-toast--${toast.type} in-view`}>
            {React.createElement(toastIcons[toast.type], {
              className: "w-5 h-5",
            })}
            <span className="flex-1 text-sm font-medium leading-snug">
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="ei-toast-close"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Dawn Theme Background - Optimized */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #020617 0%, #0f172a 28%, #1e1b4b 58%, #312e81 82%, #1e3a5f 100%)",
          }}
        />

        {/* Static atmospheric elements - much better performance */}
        <div
          className="absolute rounded-full blur-[80px] opacity-40 pointer-events-none"
          style={{
            width: "35vw",
            height: "35vw",
            left: "-5%",
            top: "15%",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-[80px] opacity-35 pointer-events-none"
          style={{
            width: "40vw",
            height: "40vw",
            right: "-5%",
            top: "-10%",
            background:
              "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-[80px] opacity-30 pointer-events-none"
          style={{
            width: "45vw",
            height: "35vw",
            left: "15%",
            bottom: "10%",
            background:
              "radial-gradient(ellipse, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(254, 217, 92, 0.2) 0%, transparent 100%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "step1" ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 xl:gap-24"
          >
            {/* Left Column: Hero Text */}
            <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                Discover <br className="hidden sm:block" />
                Your{" "}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Path
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-lg font-medium leading-relaxed">
                Help us understand your journey, learning style, and aspirations
                so we can personalize your experience.
              </p>
            </div>

            {/* Right Column: Form */}
            <div className="w-full lg:w-1/2 max-w-xl mx-auto lg:mx-0 mt-8 lg:mt-0">
              <div className="ei-card">
                <div className="p-5 sm:p-8 md:p-10 space-y-6">
                  <StepProgress stepNum={1} />

                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      About You
                    </h2>
                    <p className="text-sm text-slate-400 font-medium">
                      Tell us about your goals and preferences
                    </p>
                  </div>

                  <form onSubmit={handleStep1Submit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="name"
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="John Doe"
                        defaultValue={formData.name}
                        className="ei-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="uni_strategy"
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        Strategy to get into university
                      </Label>
                      <Textarea
                        id="uni_strategy"
                        name="uni_strategy"
                        required
                        rows={3}
                        placeholder="Describe your plan..."
                        defaultValue={formData.uni_strategy}
                        className="ei-input resize-none py-3"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="confidence_level"
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          How confident are you?
                        </Label>
                        <select
                          id="confidence_level"
                          name="confidence_level"
                          required
                          defaultValue={formData.confidence_level || ""}
                          className="ei-select"
                        >
                          <option value="">Select level</option>
                          <option value="1">1 - Not confident</option>
                          <option value="2">2</option>
                          <option value="3">3 - Somewhat confident</option>
                          <option value="4">4</option>
                          <option value="5">5 - Very confident</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="parent_support_level"
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          Parent support level
                        </Label>
                        <select
                          id="parent_support_level"
                          name="parent_support_level"
                          required
                          defaultValue={formData.parent_support_level || ""}
                          className="ei-select"
                        >
                          <option value="">Select level</option>
                          <option value="1">1 - Not supportive</option>
                          <option value="2">2</option>
                          <option value="3">3 - Somewhat supportive</option>
                          <option value="4">4</option>
                          <option value="5">5 - Very supportive</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="ideal_success_scenario"
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        If you can do anything and it will 100% succeed, what
                        would that be?
                      </Label>
                      <Textarea
                        id="ideal_success_scenario"
                        name="ideal_success_scenario"
                        required
                        rows={3}
                        placeholder="Describe your ideal scenario..."
                        defaultValue={formData.ideal_success_scenario}
                        className="ei-input resize-none py-3"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="self_learn_enjoyment"
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          How much do you enjoy self-learning?
                        </Label>
                        <select
                          id="self_learn_enjoyment"
                          name="self_learn_enjoyment"
                          required
                          defaultValue={formData.self_learn_enjoyment || ""}
                          className="ei-select"
                        >
                          <option value="">Select level</option>
                          <option value="1">1 - Not at all</option>
                          <option value="2">2</option>
                          <option value="3">3 - Somewhat</option>
                          <option value="4">4</option>
                          <option value="5">5 - Love it</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="ai_proficiency"
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          AI proficiency
                        </Label>
                        <select
                          id="ai_proficiency"
                          name="ai_proficiency"
                          required
                          defaultValue={formData.ai_proficiency || ""}
                          className="ei-select"
                        >
                          <option value="">Select level</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="learning_style"
                        className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        Preferred learning style
                      </Label>
                      <select
                        id="learning_style"
                        name="learning_style"
                        required
                        defaultValue={formData.learning_style || ""}
                        className="ei-select"
                      >
                        <option value="">Select style</option>
                        <option value="visual">Visual (images, diagrams)</option>
                        <option value="auditory">
                          Auditory (listening, discussions)
                        </option>
                        <option value="reading">
                          Reading/Writing (text-based)
                        </option>
                        <option value="kinesthetic">
                          Kinesthetic (hands-on, practice)
                        </option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="ei-button-dawn w-full h-12 md:h-14 text-base md:text-lg"
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ikigai"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 max-w-5xl mx-auto w-full"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-white tracking-tight">
                  Find Your Ikigai
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
                Discover the intersection of what you love, what you're good at,
                what the world needs, and what you can be paid for
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

              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Your Ikigai
                </h2>
                <p className="text-sm text-slate-400 font-medium">
                  Complete each section to discover where your passions,
                  talents, and purpose intersect
                </p>
              </div>

              <IkigaiDiagramInteractive
                onDataChange={setIkigaiItems}
                initialItems={ikigaiItems}
              />

              <div className="pt-2">
                <Button
                  onClick={async () => {
                    // Check if user has added at least one item to each category
                    const hasLove = ikigaiItems.some((item) => item.category === "love" && item.text.trim());
                    const hasGoodAt = ikigaiItems.some((item) => item.category === "good_at" && item.text.trim());
                    const hasPaidFor = ikigaiItems.some((item) => item.category === "paid_for" && item.text.trim());
                    const hasNeeds = ikigaiItems.some((item) => item.category === "needs" && item.text.trim());

                    if (!hasLove || !hasGoodAt || !hasPaidFor || !hasNeeds) {
                      showToast("Please add at least one item to each category");
                      return;
                    }

                    setIsSubmitting(true);
                    try {
                      const response = await fetch(
                        "/api/pre-questionnaire",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ...formData,
                            ikigai_items: ikigaiItems,
                          }),
                        }
                      );

                      const result = await response.json();

                      if (!response.ok) {
                        showToast(
                          result.error || "Failed to submit questionnaire"
                        );
                        return;
                      }

                      showToast("Questionnaire submitted successfully!", "success");
                      setTimeout(() => {
                        router.push("/me");
                      }, 1500);
                    } catch (error) {
                      console.error("Submit error:", error);
                      showToast("Failed to submit. Please try again.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || ikigaiItems.length === 0}
                  className="ei-button-dawn w-full h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <span>Complete Questionnaire</span>
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
