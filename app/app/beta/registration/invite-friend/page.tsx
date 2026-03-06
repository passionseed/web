"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Share2, Download, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";

// Floating orb component for animated background
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

export default function InviteFriendPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = "passionseed-beta-ticket.png";
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Failed to download ticket:", error);
    }
  };

  const handleShareTicket = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "passionseed-beta-ticket.png", { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Passion Seed Beta Ticket",
            text: "Join me in the Passion Seed App Beta!",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("กรุณาอัพโหลดหรือภาพหน้าจอที่แสดงว่าคุณได้เชิญเพื่อน");
      return;
    }

    setUploading(true);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setUploadComplete(true);
    setUploading(false);

    // Navigate to success page after short delay
    setTimeout(() => {
      router.push("/app/beta/success");
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] selection:bg-purple-500/30 text-slate-200 font-[family-name:var(--font-kodchasan)] py-16 px-4 sm:px-6">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingOrb color="bg-blue-600/30" size="40vw" initialX="-10%" initialY="10%" duration={15} delay={0} />
        <FloatingOrb color="bg-purple-600/20" size="50vw" initialX="60%" initialY="-20%" duration={20} delay={2} />
        <FloatingOrb color="bg-pink-600/20" size="45vw" initialX="40%" initialY="60%" duration={18} delay={1} />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gMjAgMCBMMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-50"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black, transparent)" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
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
            <div ref={ticketRef} className="relative mx-auto w-full max-w-[500px] flex flex-col drop-shadow-2xl">
              {/* Top Ticket Section (Blue Gradient) */}
              <div className="relative bg-[#3b82f6] bg-gradient-to-tr from-[#2563eb] to-[#60a5fa] rounded-t-[2.5rem] p-10 md:p-14 overflow-hidden min-h-[250px] flex flex-col justify-center pb-12">
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
                <div className="absolute top-8 left-8 text-white/80 tracking-widest text-xs font-medium">2025 BETA</div>
                <div className="absolute top-8 right-8 flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                </div>

                {/* Main Event Title */}
                <div className="relative z-10 flex flex-col items-center text-center mt-2">
                  <h2 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-[0.2em] drop-shadow-sm ml-2">
                    PASSION
                  </h2>
                  <h3 className="text-4xl md:text-5xl font-black text-white tracking-[0.15em] mb-2">SEED</h3>
                  <h4 className="text-sm md:text-base text-white/90 font-medium tracking-[0.3em] uppercase ml-1">
                    Beta Access
                  </h4>
                </div>
              </div>

              {/* Separation Line with Postaged-Stamp Edge */}
              <div className="relative h-px w-full bg-[#EADDCD] flex items-center justify-center">
                <div className="absolute -top-[5px] inset-x-0 h-[6px] bg-[radial-gradient(circle_at_50%_0%,_transparent_2px,_#EADDCD_2.5px)] bg-[length:10px_6px] bg-repeat-x z-20"></div>

                {/* Left Cutout */}
                <div className="absolute -left-6 bottom-0 translate-y-1/2 w-8 h-16 rounded-r-full bg-[#0A0A0B] z-30" />
                {/* Right Cutout */}
                <div className="absolute -right-6 bottom-0 translate-y-1/2 w-8 h-16 rounded-l-full bg-[#0A0A0B] z-30" />
              </div>

              {/* Bottom Ticket Section (Cream color) */}
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
                <div className="mt-2 text-center px-4">
                  <p className="text-[#475569] font-medium leading-[1.8] text-sm md:text-[15px]">
                    ขอบคุณที่ร่วมเป็นส่วนหนึ่งของ Passion Seed Beta
                    <br className="hidden md:block" />
                    ช่วยกันสร้างอนาคตของการค้นหาตัวเอง
                  </p>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleShareTicket}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Share2 className="w-4 h-4 mr-2" />
                แชร์ตั๋ว
              </Button>
              <Button
                onClick={handleDownloadTicket}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-xl transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                ดาวน์โหลด
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

                <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={uploading || uploadComplete}
                    className="group relative w-full h-14 overflow-hidden rounded-xl bg-transparent border-none p-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90 transition-opacity group-hover:opacity-100"></div>

                    <div className="relative z-10 flex items-center justify-center gap-2 text-white font-medium text-lg w-full h-full bg-black/10 backdrop-blur-sm border border-white/10 rounded-xl transition-transform group-hover:scale-[0.98]">
                      {uploading ? (
                        <span>กำลังอัพโหลด...</span>
                      ) : uploadComplete ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>สำเร็จ!</span>
                        </>
                      ) : (
                        <>
                          <span>ส่งหลักฐาน</span>
                          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </div>
                  </Button>

                  <button
                    type="button"
                    onClick={() => router.push("/app/beta/success")}
                    className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors underline"
                  >
                    ข้ามขั้นตอนนี้
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
