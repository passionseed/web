"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Rocket,
  ChevronRight,
  ChevronLeft,
  Upload,
  Share2,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  ArrowUpRight,
  X,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toPng, toBlob as toImageBlob } from "html-to-image";
import { registerAppBetaUserNoRedirect } from "@/actions/app-beta-no-redirect";
import { sendBetaEvidenceToDiscord } from "@/actions/discord-notifications";
import {
  trackBetaRegistrationStarted,
  trackBetaRegistrationCompleted,
} from "@/actions/beta-funnel";
import { BetaTicket } from "@/components/beta-ticket";

type WizardStep = "step1" | "step2" | "step3" | "invite";

function stepToNum(step: WizardStep): number {
  return step === "step1" ? 1 : step === "step2" ? 2 : step === "step3" ? 3 : 4;
}

function prevStep(step: WizardStep): WizardStep {
  return step === "step2" ? "step1" : step === "step3" ? "step2" : "step3";
}

function StepProgress({ stepNum }: { stepNum: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              stepNum >= n ? "bg-orange-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">Step {stepNum} of 4</p>
    </div>
  );
}

export default function AppBetaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>("step1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Accumulated form data across steps
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});

  // Store registration form data to submit after evidence upload
  const [registrationData, setRegistrationData] = useState<FormData | null>(null);

  // Invite friend state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const isSharingRef = useRef(false);

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to top when step changes to invite
  useEffect(() => {
    if (currentStep === "invite") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

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
      { threshold: 0.5 },
    );

    const elements = document.querySelectorAll(".ei-button-dusk, .ei-card");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [currentStep]);

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = fd.get("full_name") as string;
    const nickname = fd.get("nickname") as string;
    const email = fd.get("email") as string;
    const phone = fd.get("phone") as string;

    if (!full_name || !nickname || !email || !phone) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setCollectedData((prev) => ({ ...prev, full_name, nickname, email, phone }));
    setCurrentStep("step2");
  };

  const handleStep2Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const school = fd.get("school") as string;
    const grade = fd.get("grade") as string;
    const platform = fd.get("platform") as string;

    if (!school || !grade || !platform) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setCollectedData((prev) => ({ ...prev, school, grade, platform }));
    setCurrentStep("step3");
  };

  const handleStep3Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const faculty_interest = fd.get("faculty_interest") as string;
    const major_interest = fd.get("major_interest") as string;
    const major_interest_other = fd.get("major_interest_other") as string;
    const motivation = fd.get("motivation") as string;

    if (
      !faculty_interest ||
      !major_interest ||
      (major_interest === "อื่นๆ" && !major_interest_other) ||
      !motivation
    ) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    const allData = {
      ...collectedData,
      faculty_interest,
      major_interest,
      major_interest_other,
      motivation,
    };

    const formData = new FormData();
    Object.entries(allData).forEach(([k, v]) => {
      if (v) formData.append(k, v);
    });

    trackBetaRegistrationStarted({
      email: collectedData.email,
      fullName: collectedData.full_name,
    }).catch(console.error);

    setRegistrationData(formData);
    setCurrentStep("invite");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getTicketEl = () => ticketRef.current;

  const handleDownloadTicket = async () => {
    const el = getTicketEl();
    if (!el) return;
    try {
      const prevFilter = el.style.filter;
      el.style.filter = "none";
      const dataUrl = await toPng(el, { pixelRatio: 2 });
      el.style.filter = prevFilter;
      const link = document.createElement("a");
      link.download = "passionseed-beta-ticket.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download ticket:", error);
    }
  };

  const handleShareTicket = async () => {
    if (isSharingRef.current) return;
    const el = getTicketEl();
    if (!el) return;
    isSharingRef.current = true;
    try {
      const prevFilter = el.style.filter;
      el.style.filter = "none";
      const blob = await toImageBlob(el, { pixelRatio: 2 });
      el.style.filter = prevFilter;
      if (!blob) { handleDownloadTicket(); return; }

      const shareFile = new File([blob], "passionseed-beta-ticket.png", {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          title: "เข้าร่วม Close Beta Test กับ Passion Seed",
          text: "เข้าร่วม Close Beta Test กับ Passion Seed แอปสำหรับนักเรียนมัธยมปลายเพื่อทดสอบคณะที่เหมาะสำหรับคุณ และ วางแผนมหาลัยที่ใช่ https://www.passionseed.org/app/beta",
          files: [shareFile],
        });
      } else {
        handleDownloadTicket();
      }
    } catch (error) {
      console.error("Failed to share ticket:", error);
      handleDownloadTicket();
    } finally {
      isSharingRef.current = false;
    }
  };

  const handleCopyInvite = async () => {
    const text =
      "เข้าร่วม Close Beta Test กับ Passion Seed แอปสำหรับนักเรียนมัธยมปลายเพื่อทดสอบคณะที่เหมาะสำหรับคุณ และ วางแผนมหาลัยที่ใช่ https://www.passionseed.org/app/beta";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("คัดลอกข้อความแล้ว!", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast("ไม่สามารถคัดลอกได้ กรุณาลองใหม่");
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      showToast("กรุณาอัพโหลดรูปภาพหลักฐานที่แสดงว่าคุณได้เชิญเพื่อน");
      return;
    }

    if (!registrationData) {
      showToast("ไม่พบข้อมูลการลงทะเบียน กรุณาลองใหม่อีกครั้ง");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const university = fd.get("university") as string;
    if (university) registrationData.set("university", university);

    setUploading(true);

    try {
      const result = await registerAppBetaUserNoRedirect(registrationData);

      if (!result.success) {
        showToast(result.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
        setUploading(false);
        return;
      }

      const fullName = registrationData.get("full_name") as string;
      const email = registrationData.get("email") as string;
      await sendBetaEvidenceToDiscord(file, { fullName, email });

      await trackBetaRegistrationCompleted(email);

      setUploadComplete(true);
      setUploading(false);

      const code = result.submissionId
        ? result.submissionId.replace(/-/g, "").slice(-4).toUpperCase()
        : "";

      setTimeout(() => {
        router.push(`/app/beta/success${code ? `?code=${code}` : ""}`);
      }, 1000);
    } catch (error) {
      console.error("Submit error:", error);
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setUploading(false);
    }
  };

  if (!mounted) return null;

  const toastIcons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  const stepNum = stepToNum(currentStep);
  const isRegistrationStep = currentStep !== "invite";

  return (
    <div className="dusk-theme relative min-h-screen w-full overflow-hidden bg-[#06000f] text-slate-200 font-[family-name:var(--font-kodchasan)] flex items-center justify-center py-12 sm:py-24 px-4 sm:px-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <div className={`ei-toast ei-toast--${toast.type} in-view`}>
            {React.createElement(toastIcons[toast.type], { className: "w-5 h-5" })}
            <span className="flex-1 text-sm font-medium leading-snug">{toast.message}</span>
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

      {/* Dusk Theme Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
          }}
        />

        {/* Cloud A — amber, top-left */}
        <motion.div
          className="absolute rounded-full blur-[100px] pointer-events-none"
          style={{
            width: "40vw",
            height: "40vw",
            left: "-10%",
            top: "10%",
            background:
              "radial-gradient(circle, rgba(251, 146, 60, 0.38) 0%, rgba(234, 88, 12, 0.18) 45%, transparent 70%)",
          }}
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.15, 1], x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
          transition={{
            opacity: { duration: 14, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 15, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 18, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        {/* Cloud B — rose/magenta, top-right */}
        <motion.div
          className="absolute rounded-full blur-[100px] pointer-events-none"
          style={{
            width: "50vw",
            height: "50vw",
            left: "60%",
            top: "-20%",
            background:
              "radial-gradient(circle, rgba(190, 24, 93, 0.42) 0%, rgba(157, 23, 77, 0.20) 45%, transparent 70%)",
          }}
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.1, 1], x: [0, -25, 15, 0], y: [0, 30, -15, 0] }}
          transition={{
            opacity: { duration: 18, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 14, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 18, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 20, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        {/* Cloud C — warm violet horizon */}
        <motion.div
          className="absolute rounded-full blur-[100px] pointer-events-none"
          style={{
            width: "55vw",
            height: "45vw",
            left: "18%",
            top: "50%",
            background:
              "radial-gradient(ellipse, rgba(249, 115, 22, 0.28) 0%, rgba(124, 58, 237, 0.18) 50%, transparent 72%)",
          }}
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.08, 1], x: [0, 20, -15, 0], y: [0, -25, 10, 0] }}
          transition={{
            opacity: { duration: 22, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 13, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 16, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 19, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(251,146,60,0.32) 0%, rgba(234,88,12,0.14) 45%, transparent 100%)",
            filter: "blur(52px)",
          }}
        />

        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gMjAgMCBMMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-50"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black, transparent)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {isRegistrationStep ? (
          <motion.div
            key="registration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 xl:gap-24"
          >
            {/* Left Column: Hero Text & Branding */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              >
                <span className="ei-badge ei-badge--dawn">
                  <span className="ei-badge--dot" />
                  Beta Access
                </span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                Plan your future <br className="hidden sm:block" />
                with <span className="text-[#FF521B]">Passion Seed</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-lg font-medium leading-relaxed">
                Be among the first elite users to experience the app. Shape the
                future, discover your path.
                <span className="inline-block mt-2 sm:mt-0 sm:ml-2 bg-white/10 px-2 py-0.5 rounded text-white text-sm">
                  Limited to 100 spots.
                </span>
              </p>

              <div className="hidden lg:flex flex-row flex-wrap gap-3 max-w-md mt-6">
                {[
                  { icon: Rocket, text: "Early Access" },
                  { icon: CheckCircle, text: "Exclusive Features" },
                  { icon: ArrowUpRight, text: "Shape Development" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm shadow-sm"
                  >
                    <item.icon className="w-4 h-4 text-[#FF521B]" />
                    <span className="text-slate-200 text-sm font-medium">
                      {item.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Column: Step Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-1/2 max-w-xl mx-auto lg:mx-0 mt-8 lg:mt-0"
            >
              <AnimatePresence mode="wait">
                {currentStep === "step1" && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="ei-card">
                      <div className="p-5 sm:p-8 md:p-10 space-y-6">
                        <StepProgress stepNum={1} />

                        <div className="space-y-1.5">
                          <h2 className="text-2xl font-bold text-white tracking-tight">
                            Who are you?
                          </h2>
                          <p className="text-sm text-slate-400 font-medium">
                            Let us know a bit about you.
                          </p>
                        </div>

                        <form onSubmit={handleStep1Submit} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <Label htmlFor="full_name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                ชื่อ-นามสกุล / Full Name
                              </Label>
                              <Input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                placeholder="John Doe"
                                defaultValue={collectedData.full_name}
                                className="ei-input"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="nickname" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                ชื่อเล่น / Nickname
                              </Label>
                              <Input
                                id="nickname"
                                name="nickname"
                                type="text"
                                required
                                placeholder="Johnny"
                                defaultValue={collectedData.nickname}
                                className="ei-input"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <Label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                อีเมล / Email Address
                              </Label>
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="john@example.com"
                                defaultValue={collectedData.email}
                                className="ei-input"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="phone" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                เบอร์โทรศัพท์ / Phone
                              </Label>
                              <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                placeholder="081-234-5678"
                                defaultValue={collectedData.phone}
                                className="ei-input"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              type="submit"
                              className="ei-button-dusk w-full h-12 md:h-14 text-base md:text-lg"
                            >
                              <span>Continue</span>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === "step2" && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="ei-card">
                      <div className="p-5 sm:p-8 md:p-10 space-y-6">
                        <StepProgress stepNum={2} />

                        <div className="flex items-center gap-3 mb-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(prevStep(currentStep))}
                            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <h2 className="text-2xl font-bold text-white tracking-tight">
                            Your school
                          </h2>
                          <p className="text-sm text-slate-400 font-medium">
                            Tell us about where you study.
                          </p>
                        </div>

                        <form onSubmit={handleStep2Submit} className="space-y-5">
                          <div className="space-y-1.5">
                            <Label htmlFor="school" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              โรงเรียน / School
                            </Label>
                            <Input
                              id="school"
                              name="school"
                              type="text"
                              required
                              placeholder="High School Name"
                              defaultValue={collectedData.school}
                              className="ei-input"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <Label htmlFor="grade" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                ชั้นปี / Grade
                              </Label>
                              <select
                                id="grade"
                                name="grade"
                                required
                                defaultValue={collectedData.grade || ""}
                                className="ei-select"
                              >
                                <option value="">เลือกชั้นปี / Select</option>
                                <option value="ม.4">ม.4 (Grade 10)</option>
                                <option value="ม.5">ม.5 (Grade 11)</option>
                                <option value="ม.6">ม.6 (Grade 12)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="platform" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                แพลตฟอร์ม / Platform
                              </Label>
                              <select
                                id="platform"
                                name="platform"
                                required
                                defaultValue={collectedData.platform || ""}
                                className="ei-select"
                              >
                                <option value="">เลือกแพลตฟอร์ม / Select</option>
                                <option value="iOS">Apple iOS</option>
                                <option value="Android">Android</option>
                              </select>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              type="submit"
                              className="ei-button-dusk w-full h-12 md:h-14 text-base md:text-lg"
                            >
                              <span>Continue</span>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === "step3" && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="ei-card">
                      <div className="p-5 sm:p-8 md:p-10 space-y-6">
                        <StepProgress stepNum={3} />

                        <div className="flex items-center gap-3 mb-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(prevStep(currentStep))}
                            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <h2 className="text-2xl font-bold text-white tracking-tight">
                            Your interests
                          </h2>
                          <p className="text-sm text-slate-400 font-medium">
                            What are you hoping to explore?
                          </p>
                        </div>

                        <form onSubmit={handleStep3Submit} className="space-y-5">
                          <div className="space-y-1.5">
                            <Label htmlFor="faculty_interest" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              สนใจเข้าคณะไหนมากสุด / Faculty of Interest
                            </Label>
                            <Input
                              id="faculty_interest"
                              name="faculty_interest"
                              type="text"
                              required
                              placeholder="e.g. Engineering, Medicine, Arts"
                              defaultValue={collectedData.faculty_interest}
                              className="ei-input"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="major_interest" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              อะไรที่ทำให้คุณสนใจมากที่สุด / What interests you most
                            </Label>
                            <select
                              id="major_interest"
                              name="major_interest"
                              required
                              defaultValue={collectedData.major_interest || ""}
                              className="ei-select"
                              onChange={(e) => setShowOtherInput(e.target.value === "อื่นๆ")}
                            >
                              <option value="">เลือกสิ่งที่สนใจ / Select your interest</option>
                              <option value="check_port">เช็คโอกาสติดแต่ละคณะจากพอร์ทเรา</option>
                              <option value="find_fit">เจาะลึกเพื่อค้นหาคณะที่เหมาะที่สุด</option>
                              <option value="career_task">ลองภารกิจจริงจากโปรในสายงานหาอาชีพที่ใช่</option>
                              <option value="อื่นๆ">อื่นๆ (Other)</option>
                            </select>
                          </div>

                          {showOtherInput && (
                            <div className="space-y-1.5">
                              <Label htmlFor="major_interest_other" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                โปรดระบุ / Please specify
                              </Label>
                              <Input
                                id="major_interest_other"
                                name="major_interest_other"
                                type="text"
                                placeholder="ระบุสิ่งที่สนใจ..."
                                className="ei-input"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label htmlFor="motivation" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              อะไรทำให้สนใจเข้าร่วม / Motivation
                            </Label>
                            <Textarea
                              id="motivation"
                              name="motivation"
                              required
                              rows={3}
                              placeholder="Why do you want to join the beta?"
                              defaultValue={collectedData.motivation}
                              className="ei-input resize-none py-3"
                            />
                          </div>

                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              className="ei-button-dusk w-full h-12 md:h-14 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  กำลังส่ง...
                                </span>
                              ) : (
                                <>
                                  <span>Continue</span>
                                  <ChevronRight className="w-4 h-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-5xl mx-auto w-full"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-white tracking-tight">
                  เชิญเพื่อนมาร่วมสนุก!
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
                แชร์ตั๋วพิเศษนี้กับเพื่อนๆ
                และอัพโหลดหลักฐานการเชิญเพื่อนเพื่อรับสิทธิพิเศษ
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6 flex flex-col items-center"
              >
                <div className="mx-auto w-[320px]">
                  <BetaTicket
                    ticketRef={ticketRef}
                    nickname={
                      (registrationData?.get("nickname") as string) ||
                      "Beta Tester"
                    }
                    facultyInterest={
                      (registrationData?.get("faculty_interest") as string) ||
                      "Future Innovator"
                    }
                  />
                </div>

                <div className="flex gap-4 justify-center mt-8">
                  <Button
                    onClick={handleShareTicket}
                    className="ei-button-dusk md:hidden h-14 text-lg"
                  >
                    <Share2 className="w-5 h-5" />
                    แชร์ตั๋วให้เพื่อน
                  </Button>
                  <Button
                    onClick={handleCopyInvite}
                    className="ei-button-dusk hidden md:flex h-14 text-lg"
                  >
                    {copied ? (
                      <><Check className="w-5 h-5" />คัดลอกแล้ว!</>
                    ) : (
                      <><Copy className="w-5 h-5" />คัดลอกข้อความเชิญ</>
                    )}
                  </Button>
                </div>
              </motion.div>

              {/* Right: Upload Form */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-full"
              >
                <div className="ei-card">
                  <div className="p-8 sm:p-10 space-y-8">
                    <StepProgress stepNum={4} />

                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        อัพโหลดหลักฐาน
                      </h2>
                      <p className="text-sm text-slate-400 font-medium">
                        แชร์ตั๋วกับเพื่อนและอัพโหลดหลักฐานการแชร์
                      </p>
                    </div>

                    <form onSubmit={handleInviteSubmit} className="space-y-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="university" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          มหาวิทยาลัยที่สนใจ / Target University
                        </Label>
                        <Input
                          id="university"
                          name="university"
                          type="text"
                          placeholder="e.g. Chulalongkorn, KMUTT"
                          className="ei-input"
                        />
                      </div>

                      <div className="space-y-4">
                        <Label
                          htmlFor="evidence"
                          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          รูปภาพหลักฐาน / Evidence Photo
                        </Label>

                        <div className="relative">
                          <input
                            type="file"
                            id="evidence"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="evidence"
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all bg-white/5 group"
                          >
                            {file ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="text-sm font-medium text-white">
                                  {file.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  คลิกเพื่อเปลี่ยนรูป
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-orange-400 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-orange-500/10 flex items-center justify-center mb-1 transition-colors">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium">
                                  คลิกเพื่ออัพโหลดรูปภาพ
                                </span>
                                <span className="text-xs opacity-70">
                                  รองรับ PNG, JPG, GIF
                                </span>
                              </div>
                            )}
                          </label>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/10">
                          <span className="text-[#FF521B] font-bold mr-1">
                            💡 คำแนะนำ:
                          </span>
                          ถ่ายภาพหน้าจอการแชร์ตั๋วให้เพื่อนผ่าน LINE, Instagram,
                          Facebook หรือแพลตฟอร์มอื่นๆ
                        </p>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="pt-2"
                      >
                        <Button
                          type="submit"
                          disabled={uploading || uploadComplete || !file}
                          className="ei-button-dusk w-full h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? (
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              กำลังบันทึกข้อมูล...
                            </span>
                          ) : uploadComplete ? (
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              เสร็จสิ้น!
                            </span>
                          ) : (
                            <>
                              <span>ยืนยันการลงทะเบียน</span>
                              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
      `,
        }}
      />
    </div>
  );
}
