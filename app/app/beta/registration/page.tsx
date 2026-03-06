"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Sparkles, Zap, ChevronRight, Upload, Share2, Download, CheckCircle2, ArrowRight, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import { registerAppBetaUserNoRedirect } from "@/actions/app-beta-no-redirect";

// A floating orb component for the animated background
const FloatingOrb = ({ color, size, initialX, initialY, duration, delay }: any) => {
  return (
    <motion.div
      initial={{ x: initialX, y: initialY, opacity: 0 }}
      animate={{
        x: [initialX, initialX + Math.random() * 100 - 50, initialX],
        y: [initialY, initialY + Math.random() * 150 - 75, initialY],
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay: delay,
      }}
      className={`absolute rounded-full blur-[100px] ${color} pointer-events-none -z-10`}
      style={{ width: size, height: size }}
    />
  );
};

// Input wrapper to handle focus state glowing
const GlowingInputWrap = ({ children, delay }: { children: React.ReactNode; delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative group w-full"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur opacity-0 group-focus-within:opacity-40 transition duration-500"></div>
      <div className="relative w-full">{children}</div>
    </motion.div>
  );
};

// Custom toast notification
const Toast = ({ message, type, onClose }: { message: string; type: "error" | "success" | "info"; onClose: () => void }) => {
  const colors = {
    error: "bg-red-500/20 border-red-500/50 text-red-200",
    success: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200",
    info: "bg-blue-500/20 border-blue-500/50 text-blue-200",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-md w-[92vw] ${colors[type]}`}
    >
      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none">&times;</button>
    </motion.div>
  );
};

export default function AppBetaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"registration" | "invite">("registration");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const [copied, setCopied] = useState(false);

  const showToast = (message: string, type: "error" | "success" | "info" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Store registration form data to submit after evidence upload
  const [registrationData, setRegistrationData] = useState<FormData | null>(null);

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

  const handleRegistrationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    if (!fullName || !nickname || !email || !phone || !school || !grade || !platform || !facultyInterest || !motivation) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      setIsSubmitting(false);
      return;
    }

    // Store form data — DB save happens after evidence upload
    setRegistrationData(formData);
    setIsSubmitting(false);

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

        const file = new File([blob], "passionseed-beta-ticket.png", { type: "image/png" });

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
    const text = "เข้าร่วม Close Beta Test กับ Passion Seed แอปสำหรับนักเรียนมัธยมปลายเพื่อทดสอบคณะที่เหมาะสำหรับคุณ และ วางแผนมหาลัยที่ใช่ https://www.passionseed.org/app/beta";
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

      // Simulate evidence upload delay (actual file upload can be added later)
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] selection:bg-purple-500/30 text-slate-200 font-[family-name:var(--font-kodchasan)] flex items-center justify-center py-16 px-4 sm:px-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb color="bg-blue-600/30" size="40vw" initialX="-10%" initialY="10%" duration={15} delay={0} />
        <FloatingOrb color="bg-purple-600/20" size="50vw" initialX="60%" initialY="-20%" duration={20} delay={2} />
        <FloatingOrb color="bg-pink-600/20" size="45vw" initialX="40%" initialY="60%" duration={18} delay={1} />
        <FloatingOrb color="bg-indigo-600/20" size="30vw" initialX="-10%" initialY="80%" duration={12} delay={3} />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gMjAgMCBMMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-50"
          style={{ maskImage: 'linear-gradient(to bottom, transparent, black, transparent)' }}
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
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium tracking-wide text-purple-200">Exclusive Access</span>
              </motion.div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 leading-tight">
                Join the Next <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">Evolution</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-lg font-light leading-relaxed">
                Be among the first 100 elite users to experience the Passion Seed App Beta. Shape the future, discover your path.
              </p>

              <div className="hidden lg:flex flex-col gap-6 w-full max-w-md mt-8">
                {[
                  { icon: Rocket, text: "Early Feature Access" },
                  { icon: Zap, text: "Unprecedented Performance" },
                  { icon: Sparkles, text: "Direct Influence on Development" }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] transition-all hover:bg-white/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                      <item.icon className="w-5 h-5 text-blue-300" />
                    </div>
                    <span className="text-slate-300 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Column: The Form Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-1/2 max-w-xl perspective-1000"
            >
              <div className="relative w-full rounded-2xl bg-[#111115]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.15)] overflow-hidden">
                {/* Specular highlight border effect */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

                <div className="p-8 sm:p-10 space-y-8">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                      Registration Form
                    </h2>
                    <p className="text-sm text-slate-400">Fill out your details to request an invitation.</p>
                  </div>

                  <form onSubmit={handleRegistrationSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <GlowingInputWrap delay={0.6}>
                        <div className="space-y-1.5">
                          <Label htmlFor="full_name" className="text-xs font-medium text-slate-400 uppercase tracking-wider">ชื่อ-นามสกุล / Full Name</Label>
                          <Input
                            id="full_name"
                            name="full_name"
                            type="text"
                            required
                            placeholder="John Doe"
                            onFocus={() => setActiveInput('full_name')}
                            onBlur={() => setActiveInput(null)}
                            className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                          />
                        </div>
                      </GlowingInputWrap>

                      <GlowingInputWrap delay={0.65}>
                        <div className="space-y-1.5">
                          <Label htmlFor="nickname" className="text-xs font-medium text-slate-400 uppercase tracking-wider">ชื่อเล่น / Nickname</Label>
                          <Input
                            id="nickname"
                            name="nickname"
                            type="text"
                            required
                            placeholder="Johnny"
                            onFocus={() => setActiveInput('nickname')}
                            onBlur={() => setActiveInput(null)}
                            className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                          />
                        </div>
                      </GlowingInputWrap>
                    </div>

                    <GlowingInputWrap delay={0.7}>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">อีเมล / Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="john@example.com"
                          onFocus={() => setActiveInput('email')}
                          onBlur={() => setActiveInput(null)}
                          className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                        />
                      </div>
                    </GlowingInputWrap>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <GlowingInputWrap delay={0.75}>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-medium text-slate-400 uppercase tracking-wider">เบอร์โทรศัพท์ / Phone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            placeholder="081-234-5678"
                            onFocus={() => setActiveInput('phone')}
                            onBlur={() => setActiveInput(null)}
                            className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                          />
                        </div>
                      </GlowingInputWrap>

                      <GlowingInputWrap delay={0.8}>
                        <div className="space-y-1.5">
                          <Label htmlFor="school" className="text-xs font-medium text-slate-400 uppercase tracking-wider">โรงเรียน / School</Label>
                          <Input
                            id="school"
                            name="school"
                            type="text"
                            required
                            placeholder="High School Name"
                            onFocus={() => setActiveInput('school')}
                            onBlur={() => setActiveInput(null)}
                            className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                          />
                        </div>
                      </GlowingInputWrap>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <GlowingInputWrap delay={0.85}>
                        <div className="space-y-1.5">
                          <Label htmlFor="grade" className="text-xs font-medium text-slate-400 uppercase tracking-wider">ชั้นปี / Grade</Label>
                          <select
                            id="grade"
                            name="grade"
                            required
                            onFocus={() => setActiveInput('grade')}
                            onBlur={() => setActiveInput(null)}
                            className="w-full bg-black/40 border border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "right 1rem center",
                              backgroundSize: "1.25rem"
                            }}
                          >
                            <option value="" className="bg-slate-900 text-slate-400">เลือกชั้นปี / Select</option>
                            <option value="ม.4" className="bg-slate-900">ม.4 (Grade 10)</option>
                            <option value="ม.5" className="bg-slate-900">ม.5 (Grade 11)</option>
                            <option value="ม.6" className="bg-slate-900">ม.6 (Grade 12)</option>
                          </select>
                        </div>
                      </GlowingInputWrap>

                      <GlowingInputWrap delay={0.9}>
                        <div className="space-y-1.5">
                          <Label htmlFor="platform" className="text-xs font-medium text-slate-400 uppercase tracking-wider">แพลตฟอร์ม / Platform</Label>
                          <select
                            id="platform"
                            name="platform"
                            required
                            onFocus={() => setActiveInput('platform')}
                            onBlur={() => setActiveInput(null)}
                            className="w-full bg-black/40 border border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "right 1rem center",
                              backgroundSize: "1.25rem"
                            }}
                          >
                            <option value="" className="bg-slate-900 text-slate-400">เลือกแพลตฟอร์ม / Select</option>
                            <option value="iOS" className="bg-slate-900">Apple iOS</option>
                            <option value="Android" className="bg-slate-900">Android</option>
                          </select>
                        </div>
                      </GlowingInputWrap>
                    </div>

                    <GlowingInputWrap delay={0.92}>
                      <div className="space-y-1.5">
                        <Label htmlFor="faculty_interest" className="text-xs font-medium text-slate-400 uppercase tracking-wider">สนใจเข้าคณะไหนมากสุด / Faculty of Interest</Label>
                        <Input
                          id="faculty_interest"
                          name="faculty_interest"
                          type="text"
                          required
                          placeholder="e.g. Engineering, Medicine, Arts"
                          onFocus={() => setActiveInput('faculty_interest')}
                          onBlur={() => setActiveInput(null)}
                          className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all h-12 rounded-xl"
                        />
                      </div>
                    </GlowingInputWrap>

                    <GlowingInputWrap delay={0.95}>
                      <div className="space-y-1.5">
                        <Label htmlFor="motivation" className="text-xs font-medium text-slate-400 uppercase tracking-wider">อะไรทำให้สนใจเข้าร่วม Close Beta Test / Motivation</Label>
                        <Textarea
                          id="motivation"
                          name="motivation"
                          required
                          rows={4}
                          placeholder="Why do you want to join the beta? What are you looking forward to?"
                          onFocus={() => setActiveInput('motivation')}
                          onBlur={() => setActiveInput(null)}
                          className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 placeholder:text-slate-600 transition-all rounded-xl resize-none py-3"
                        />
                      </div>
                    </GlowingInputWrap>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.6 }}
                      className="pt-4"
                    >
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative w-full h-14 overflow-hidden rounded-xl bg-transparent border-none p-0"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90 transition-opacity group-hover:opacity-100"></div>

                        {/* Hover animated sheen */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"
                          style={{
                            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
                          }}
                        />

                        <div className="relative z-10 flex items-center justify-center gap-2 text-white font-medium text-lg w-full h-full bg-black/10 backdrop-blur-sm border border-white/10 rounded-xl transition-transform group-hover:scale-[0.98]">
                          {isSubmitting ? (
                            <span>กำลังส่ง...</span>
                          ) : (
                            <>
                              <span>Reserve Your Spot</span>
                              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  </form>
                </div>
              </div>
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
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                  เชิญเพื่อนมาร่วมสนุก!
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                แชร์ตั๋วพิเศษนี้กับเพื่อนๆ และอัพโหลดหลักฐานการเชิญเพื่อนเพื่อรับสิทธิพิเศษ
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left: Ticket */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <div
                  ref={ticketRef}
                  className="relative mx-auto w-full max-w-[500px]"
                  style={{
                    filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.3))',
                    maskImage: 'radial-gradient(circle at 0% calc(250px + 1px), transparent 16px, black 16.5px), radial-gradient(circle at 100% calc(250px + 1px), transparent 16px, black 16.5px)',
                    maskSize: '51% 100%',
                    maskPosition: 'left top, right top',
                    maskRepeat: 'no-repeat',
                    WebkitMaskImage: 'radial-gradient(circle at 0% calc(250px + 1px), transparent 16px, black 16.5px), radial-gradient(circle at 100% calc(250px + 1px), transparent 16px, black 16.5px)',
                    WebkitMaskSize: '51% 100%',
                    WebkitMaskPosition: 'left top, right top',
                    WebkitMaskRepeat: 'no-repeat',
                  }}
                >
                  {/* Top Ticket Section (Blue Gradient) */}
                  <div className="relative bg-[#3b82f6] bg-gradient-to-tr from-[#2563eb] to-[#60a5fa] rounded-t-[2.5rem] p-10 md:p-14 h-[250px] flex flex-col justify-center pb-12 overflow-hidden">
                    {/* Grain Effect */}
                    <div
                      className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
                      style={{
                        backgroundImage:
                          'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
                      }}
                    ></div>

                    {/* Background Decorative Circles */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full border-[1px] border-white/20 pointer-events-none" />
                    <div className="absolute top-[60%] left-[10%] w-[100px] h-[100px] rounded-full border-[1px] border-white/20 pointer-events-none" />
                    <div className="absolute -top-10 -right-10 w-[150px] h-[150px] rounded-full bg-white/10 blur-xl pointer-events-none" />

                    {/* Top Info */}
                    <div className="absolute top-8 left-8 text-white/80 tracking-widest text-xs font-medium">2026 BETA</div>
                    <div className="absolute top-8 right-8 flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                    </div>

                    {/* Main Event Title */}
                    <div className="relative z-10 flex flex-col items-center text-center mt-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide drop-shadow-sm leading-tight">
                        You been invited to
                      </h2>
                      <h3 className="text-3xl md:text-4xl font-black text-white tracking-[0.1em] mb-1">Closed Beta Test</h3>
                    </div>
                  </div>

                  {/* Separation Line with Postaged-Stamp Edge */}
                  <div className="relative h-px w-full bg-[#EADDCD] flex items-center justify-center">
                    <div className="absolute -top-[5px] inset-x-0 h-[6px] bg-[radial-gradient(circle_at_50%_0%,_transparent_2px,_#EADDCD_2.5px)] bg-[length:10px_6px] bg-repeat-x z-20"></div>
                  </div>

                  {/* Bottom Ticket Section (Cream color) with cutouts */}
                  <div className="relative bg-[#EADDCD] text-gray-900 rounded-b-[2.5rem] p-10 md:p-12 pt-14 flex flex-col gap-8 z-10">

                    {/* Details Row */}
                    <div className="flex justify-between items-end border-b border-[#cbd5e1] pb-6 relative z-20 px-2">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.15em] mb-1">
                          Pass Type
                        </span>
                        <span className="text-2xl md:text-3xl font-black text-[#1e293b] uppercase tracking-tight">
                          BETA TESTER
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.15em] mb-1">
                          Status
                        </span>
                        <span className="text-xl md:text-2xl font-black text-[#1e293b] uppercase tracking-tight">
                          EXCLUSIVE
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-2 text-center px-2 w-full">
                      <p className="text-[#475569] font-medium leading-[1.8] text-[13px] md:text-[14.5px]">
                        คุณได้รับเชิญให้เข้าร่วม Beta Test ของ Passion Seed app
                        <br />
                        แอปช่วยคุณวางแผนเข้ามหาลัยที่ใช่ และทดสอบคณะที่เหมาะกับคุณ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Share / Copy Button */}
                <div className="flex gap-4 justify-center">
                  {/* Mobile: native share */}
                  <Button
                    onClick={handleShareTicket}
                    className="md:hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    แชร์ตั๋ว
                  </Button>
                  {/* Desktop: copy invite text */}
                  <Button
                    onClick={handleCopyInvite}
                    className="hidden md:flex items-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "คัดลอกแล้ว!" : "คัดลอกข้อความเชิญ"}
                  </Button>
                </div>
              </motion.div>

              {/* Right: Upload Form */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-full"
              >
                <div className="relative w-full rounded-2xl bg-[#111115]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.15)] overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

                  <div className="p-8 sm:p-10 space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        อัพโหลดหลักฐาน
                      </h2>
                      <p className="text-sm text-slate-400">แชร์ตั๋วกับเพื่อนและอัพโหลดหลักฐานการแชร์</p>
                    </div>

                    <form onSubmit={handleInviteSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <Label htmlFor="evidence" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
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
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-all bg-black/40"
                          >
                            {file ? (
                              <div className="flex flex-col items-center gap-2">
                                <CheckCircle2 className="w-12 h-12 text-green-400" />
                                <span className="text-sm text-slate-300">{file.name}</span>
                                <span className="text-xs text-slate-500">คลิกเพื่อเปลี่ยนรูป</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="w-12 h-12 text-slate-400" />
                                <span className="text-sm text-slate-400">คลิกเพื่ออัพโหลดรูปภาพ</span>
                                <span className="text-xs text-slate-500">(PNG, JPG, JPEG)</span>
                              </div>
                            )}
                          </label>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          💡 <strong>คำแนะนำ:</strong> ถ่ายภาพหน้าจอการแชร์ตั๋วให้เพื่อนผ่าน LINE, Instagram, Facebook
                          หรือแพลตฟอร์มอื่นๆ
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={uploading || uploadComplete || !file}
                        className="group relative w-full h-14 overflow-hidden rounded-xl bg-transparent border-none p-0"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90 transition-opacity group-hover:opacity-100"></div>

                        <div className="relative z-10 flex items-center justify-center gap-2 text-white font-medium text-lg w-full h-full bg-black/10 backdrop-blur-sm border border-white/10 rounded-xl transition-transform group-hover:scale-[0.98]">
                          {uploading ? (
                            <span>กำลังบันทึก...</span>
                          ) : uploadComplete ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>สำเร็จ!</span>
                            </>
                          ) : (
                            <>
                              <span>ยืนยันและส่งหลักฐาน</span>
                              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </div>
                      </Button>

                      <p className="text-xs text-center text-slate-500 leading-relaxed">
                        ⚠️ <strong>จำเป็นต้องอัพโหลดหลักฐาน:</strong> การลงทะเบียนจะถูกบันทึกหลังจากคุณส่งหลักฐานการเชิญเพื่อนเท่านั้น
                      </p>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for animations */}
      <style dangerouslySetInnerHTML={{
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
      `}} />
    </div>
  );
}
