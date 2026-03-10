"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Rocket,
  Sparkles,
  Zap,
  ChevronRight,
  Upload,
  Share2,
  Download,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Flame,
  Star,
  ArrowUpRight,
  MousePointer2,
  Type,
  Smartphone,
  GraduationCap,
  Building2,
  Heart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import { registerAppBetaUserNoRedirect } from "@/actions/app-beta-no-redirect";
import { sendBetaEvidenceToDiscord } from "@/actions/discord-notifications";
import {
  trackBetaRegistrationStarted,
  trackBetaRegistrationCompleted,
} from "@/actions/beta-funnel";
import { BetaTicket } from "@/components/beta-ticket";

// Liquid Orb for dark background
const LiquidOrb = ({
  color,
  size,
  x,
  y,
  duration = 20,
  delay = 0,
}: {
  color: string;
  size: string | number;
  x: string;
  y: string;
  duration?: number;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.15, 1],
        x: [0, 30, -20, 0],
        y: [0, -40, 20, 0],
      }}
      transition={{
        opacity: {
          duration: duration / 2,
          repeat: Infinity,
          ease: "easeInOut",
        },
        scale: {
          duration: duration / 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
        x: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
        y: {
          duration: duration * 1.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 2,
        },
      }}
      className={`absolute rounded-full blur-[120px] pointer-events-none ${color}`}
      style={{ width: size, height: size, left: x, top: y }}
    />
  );
};

// Light theme Spotlight Card
const SpotlightCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,82,27,0.03), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Custom toast notification
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "success" | "info";
  onClose: () => void;
}) => {
  const colors = {
    error: "bg-red-50 border-red-100 text-red-600",
    success: "bg-emerald-50 border-emerald-100 text-emerald-600",
    info: "bg-blue-50 border-blue-100 text-blue-600",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-lg max-w-md w-[92vw] ${colors[type]}`}
    >
      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
      >
        &times;
      </button>
    </motion.div>
  );
};

export default function AppBetaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<"registration" | "invite">(
    "registration",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Store registration form data to submit after evidence upload
  const [registrationData, setRegistrationData] = useState<FormData | null>(
    null,
  );

  // Invite friend state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    if (currentStep === "invite") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const handleRegistrationSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Validate form data
    const fullName = formData.get("full_name");
    const nickname = formData.get("nickname");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const school = formData.get("school");
    const grade = formData.get("grade");
    const platform = formData.get("platform");
    const facultyInterest = formData.get("faculty_interest");
    const motivation = formData.get("motivation");

    if (
      !fullName ||
      !nickname ||
      !email ||
      !phone ||
      !school ||
      !grade ||
      !platform ||
      !facultyInterest ||
      !motivation
    ) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      setIsSubmitting(false);
      return;
    }

    // Store form data — DB save happens after evidence upload
    setRegistrationData(formData);
    setIsSubmitting(false);

    // Track funnel: user reached invite step
    trackBetaRegistrationStarted({
      email: email as string,
      fullName: fullName as string,
    }).catch(console.error);

    // Move to invite step
    setCurrentStep("invite");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      // Temporarily remove drop-shadow filter so html2canvas can produce a clean transparent PNG
      const el = ticketRef.current;
      const prevFilter = el.style.filter;
      el.style.filter = "none";

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      el.style.filter = prevFilter;

      const link = document.createElement("a");
      link.download = "passionseed-beta-ticket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download ticket:", error);
    }
  };

  const handleShareTicket = async () => {
    if (!ticketRef.current) return;

    try {
      // Temporarily remove drop-shadow filter so html2canvas produces a clean transparent PNG
      const el = ticketRef.current;
      const prevFilter = el.style.filter;
      el.style.filter = "none";

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      el.style.filter = prevFilter;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "passionseed-beta-ticket.png", {
          type: "image/png",
        });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "เข้าร่วม Close Beta Test กับ Passion Seed",
            text: "เข้าร่วม Close Beta Test กับ Passion Seed แอปสำหรับนักเรียนมัธยมปลายเพื่อทดสอบคณะที่เหมาะสำหรับคุณ และ วางแผนมหาลัยที่ใช่ https://www.passionseed.org/app/beta",
            files: [file],
          });
        } else {
          // Fallback: just download
          handleDownloadTicket();
        }
      });
    } catch (error) {
      console.error("Failed to share ticket:", error);
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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      showToast("กรุณาอัพโหลดรูปภาพหลักฐานที่แสดงว่าคุณได้เชิญเพื่อน");
      return;
    }

    if (!registrationData) {
      showToast("ไม่พบข้อมูลการลงทะเบียน กรุณาลองใหม่อีกครั้ง");
      return;
    }

    setUploading(true);

    try {
      // Save registration to database after evidence is uploaded
      const result = await registerAppBetaUserNoRedirect(registrationData);

      if (!result.success) {
        showToast(result.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
        setUploading(false);
        return;
      }

      // Send evidence image to Discord
      const fullName = registrationData.get("full_name") as string;
      const email = registrationData.get("email") as string;
      await sendBetaEvidenceToDiscord(file, { fullName, email });

      // Track funnel: registration completed
      await trackBetaRegistrationCompleted(email);

      setUploadComplete(true);
      setUploading(false);

      // Navigate to success page after short delay
      setTimeout(() => {
        router.push("/app/beta/success");
      }, 1000);
    } catch (error) {
      console.error("Submit error:", error);
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setUploading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] text-slate-200 font-[family-name:var(--font-kodchasan)] flex items-center justify-center py-12 sm:py-24 px-4 sm:px-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <LiquidOrb
          color="bg-blue-600/30"
          size="40vw"
          x="-10%"
          y="10%"
          duration={15}
          delay={0}
        />
        <LiquidOrb
          color="bg-purple-600/20"
          size="50vw"
          x="60%"
          y="-20%"
          duration={20}
          delay={2}
        />
        <LiquidOrb
          color="bg-pink-600/20"
          size="45vw"
          x="40%"
          y="60%"
          duration={18}
          delay={1}
        />
        <LiquidOrb
          color="bg-indigo-600/20"
          size="30vw"
          x="-10%"
          y="80%"
          duration={12}
          delay={3}
        />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gMjAgMCBMMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-50"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black, transparent)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "registration" ? (
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
              >
                <span className="flex h-2 w-2 rounded-full bg-[#FF521B] animate-pulse"></span>
                <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
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
                  { icon: Zap, text: "Early Access" },
                  { icon: Star, text: "Exclusive Features" },
                  { icon: Sparkles, text: "Shape Development" },
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

            {/* Right Column: The Form Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full lg:w-1/2 max-w-xl mx-auto lg:mx-0 mt-8 lg:mt-0"
            >
              <SpotlightCard>
                <div className="p-5 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                  <div className="space-y-1.5 sm:space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Registration Form
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      Fill out your details to request an invitation.
                    </p>
                  </div>

                  <form
                    onSubmit={handleRegistrationSubmit}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="full_name"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          ชื่อ-นามสกุล / Full Name
                        </Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          type="text"
                          required
                          placeholder="John Doe"
                          className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nickname"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          ชื่อเล่น / Nickname
                        </Label>
                        <Input
                          id="nickname"
                          name="nickname"
                          type="text"
                          required
                          placeholder="Johnny"
                          className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        อีเมล / Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="john@example.com"
                        className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="phone"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          เบอร์โทรศัพท์ / Phone
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          placeholder="081-234-5678"
                          className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="school"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          โรงเรียน / School
                        </Label>
                        <Input
                          id="school"
                          name="school"
                          type="text"
                          required
                          placeholder="High School Name"
                          className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="grade"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          ชั้นปี / Grade
                        </Label>
                        <select
                          id="grade"
                          name="grade"
                          required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 1rem center",
                            backgroundSize: "1.25rem",
                          }}
                        >
                          <option value="" className="text-slate-500">
                            เลือกชั้นปี / Select
                          </option>
                          <option value="ม.4">ม.4 (Grade 10)</option>
                          <option value="ม.5">ม.5 (Grade 11)</option>
                          <option value="ม.6">ม.6 (Grade 12)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="platform"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          แพลตฟอร์ม / Platform
                        </Label>
                        <select
                          id="platform"
                          name="platform"
                          required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 shadow-sm"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 1rem center",
                            backgroundSize: "1.25rem",
                          }}
                        >
                          <option value="" className="text-slate-500">
                            เลือกแพลตฟอร์ม / Select
                          </option>
                          <option value="iOS">Apple iOS</option>
                          <option value="Android">Android</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="faculty_interest"
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        สนใจเข้าคณะไหนมากสุด / Faculty of Interest
                      </Label>
                      <Input
                        id="faculty_interest"
                        name="faculty_interest"
                        type="text"
                        required
                        placeholder="e.g. Engineering, Medicine, Arts"
                        className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all h-12 rounded-xl shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="motivation"
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        อะไรทำให้สนใจเข้าร่วม / Motivation
                      </Label>
                      <Textarea
                        id="motivation"
                        name="motivation"
                        required
                        rows={3}
                        placeholder="Why do you want to join the beta?"
                        className="bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF521B]/50 focus:ring-[#FF521B]/20 placeholder:text-slate-400 transition-all rounded-xl resize-none py-3 shadow-sm"
                      />
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="pt-2"
                    >
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative w-full h-12 md:h-14 overflow-hidden rounded-xl bg-[#FF521B] hover:bg-[#E64210] text-white border-none shadow-md transition-all active:scale-[0.98]"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-2 font-semibold text-base w-full h-full">
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              กำลังส่ง...
                            </span>
                          ) : (
                            <>
                              <span>Submit Request</span>
                              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  </form>
                </div>
              </SpotlightCard>
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

                {/* Share / Copy Button */}
                <div className="flex gap-4 justify-center mt-8">
                  {/* Mobile: native share */}
                  <Button
                    onClick={handleShareTicket}
                    className="md:hidden bg-[#FF521B] hover:bg-[#E64210] text-white px-8 py-6 rounded-xl transition-all shadow-md active:scale-[0.98] font-semibold"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    แชร์ตั๋วให้เพื่อน
                  </Button>
                  {/* Desktop: copy invite text */}
                  <Button
                    onClick={handleCopyInvite}
                    className="hidden md:flex items-center bg-[#FF521B] hover:bg-[#E64210] text-white px-8 py-6 rounded-xl transition-all shadow-md active:scale-[0.98] font-semibold"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 mr-2" />
                    ) : (
                      <Copy className="w-5 h-5 mr-2" />
                    )}
                    {copied ? "คัดลอกแล้ว!" : "คัดลอกข้อความเชิญ"}
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
                <SpotlightCard>
                  <div className="p-8 sm:p-10 space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        อัพโหลดหลักฐาน
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        แชร์ตั๋วกับเพื่อนและอัพโหลดหลักฐานการแชร์
                      </p>
                    </div>

                    <form onSubmit={handleInviteSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <Label
                          htmlFor="evidence"
                          className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
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
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#FF521B]/50 hover:bg-[#FF521B]/5 transition-all bg-slate-50 group"
                          >
                            {file ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-900">
                                  {file.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  คลิกเพื่อเปลี่ยนรูป
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-[#FF521B] transition-colors">
                                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-[#FF521B]/10 flex items-center justify-center mb-1 transition-colors">
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

                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
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
                          className="group relative w-full h-14 overflow-hidden rounded-xl bg-[#FF521B] hover:bg-[#E64210] disabled:bg-slate-200 disabled:text-slate-400 text-white border-none shadow-md transition-all active:scale-[0.98]"
                        >
                          <div className="relative z-10 flex items-center justify-center gap-2 font-semibold text-lg w-full h-full">
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
                          </div>
                        </Button>
                      </motion.div>
                    </form>
                  </div>
                </SpotlightCard>
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
