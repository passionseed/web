"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  color: string;
  size: number;
}

const FloatingOrb = ({ color, size, initialX, initialY, duration, delay }: any) => {
  return (
    <motion.div
      initial={{ x: initialX, y: initialY, opacity: 0 }}
      animate={{
        y: [initialY - 20, initialY + 20, initialY - 20],
        x: [initialX - 20, initialX + 20, initialX - 20],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      }}
      className={`absolute rounded-full blur-[100px] pointer-events-none ${color}`}
      style={{ width: size, height: size }}
    />
  );
};

export default function AppBetaSuccessPage() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  // Confetti effect adapted for dark mode
  useEffect(() => {
    const colors = ["#38BDF8", "#818CF8", "#F472B6", "#34D399", "#FBBF24"];
    const newParticles: Particle[] = [];

    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 50,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: Math.random() * 2 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
      });
    }
    setParticles(newParticles);
  }, []);

  // Animate confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setParticles((prevParticles) =>
        prevParticles.map((particle) => {
          let newX = particle.x + particle.velocityX;
          let newY = particle.y + particle.velocityY;

          // Gravity
          particle.velocityY += 0.1;

          // Reset if off screen
          if (newY > canvas.height + 20) {
            newY = -20;
            newX = Math.random() * canvas.width;
            particle.velocityY = Math.random() * 2 + 2;
          }

          // Draw particle
          ctx.save();
          ctx.translate(newX, newY);
          ctx.rotate((newX + newY) * 0.01);
          ctx.fillStyle = particle.color;
          ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
          ctx.restore();

          return { ...particle, x: newX, y: newY };
        })
      );

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06000f] text-slate-200 selection:bg-orange-500/30 font-sans">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <FloatingOrb color="bg-orange-600/20" size={600} initialX="10%" initialY="20%" duration={15} delay={0} />
        <FloatingOrb color="bg-rose-600/20" size={500} initialX="80%" initialY="60%" duration={20} delay={2} />
        <FloatingOrb color="bg-purple-600/20" size={700} initialX="50%" initialY="80%" duration={25} delay={5} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none" />
      </div>

      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-10 pointer-events-none mix-blend-screen opacity-80"
      />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-20 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="w-full max-w-xl perspective-1000"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-rose-500/20 to-purple-500/20 blur-xl rounded-3xl animate-pulse"></div>

          <Card className="relative border border-white/10 bg-black/40 backdrop-blur-2xl text-slate-200 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden rounded-3xl">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <CardHeader className="pt-12 pb-6">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.6 }}
                className="mx-auto mb-6 relative"
              >
                <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full"></div>
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-green-300/30">
                  <CheckCircle2 className="h-10 w-10 text-white drop-shadow-md" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <CardTitle className="text-4xl font-black mb-3 text-white font-[family-name:var(--font-kodchasan)] tracking-tight px-4 leading-[1.6]">
                  ขั้นตอนสุดท้าย!
                </CardTitle>
                <CardDescription className="text-slate-300 text-base font-[family-name:var(--font-kodchasan)]">
                  แอด LINE OA ของเราและส่งรหัส 4 หลักมาเพื่อยืนยันได้เลย
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-12">
              {/* Unique code — top */}
              {code && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                >
                  <p className="text-sm text-slate-400 font-[family-name:var(--font-kodchasan)]">
                    รหัสประจำตัวของคุณ
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {code.split("").map((char, i) => (
                      <span
                        key={i}
                        className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-3xl font-black text-white tracking-widest"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-orange-400 font-semibold font-[family-name:var(--font-kodchasan)]">
                    ถ้าไม่ส่งพี่จะไม่เห็นข้อความแล้วตอบกลับไปไม่ได้นะ
                  </p>
                </motion.div>
              )}

              {/* LINE OA Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="space-y-6"
              >
                <div className="text-center space-y-3">
                  {/* QR Code */}
                  <div className="flex justify-center py-4">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-[#00B900]/20 blur-xl rounded-2xl transition-all duration-500 group-hover:bg-[#00B900]/40 group-hover:blur-2xl"></div>
                      <div className="relative bg-white p-3 rounded-2xl shadow-xl border-2 border-slate-700/50 transform transition-transform duration-500 group-hover:-translate-y-2">
                        <Image
                          src="https://qr-official.line.me/gs/M_161irjbq_GW.png?oat_content=qr"
                          alt="LINE OA QR Code"
                          width={192}
                          height={192}
                          className="w-48 h-48 rounded-xl object-contain object-center"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add Friend button */}
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <a
                      href="https://lin.ee/uFruUqa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-[#00B900] text-white rounded-xl shadow-[0_0_20px_rgba(0,185,0,0.3)] hover:bg-[#00A000] hover:shadow-[0_0_30px_rgba(0,185,0,0.5)] transition-all font-[family-name:var(--font-kodchasan)] font-semibold text-base border border-white/10 w-full sm:w-auto"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.628-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.771.039 1.078l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      เพิ่มเพื่อน LINE OA
                    </a>
                  </motion.div>
                </div>
              </motion.div>

              <div className="pt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  <Link href="/">
                    <Button className="group relative w-full h-14 overflow-hidden rounded-xl bg-transparent border-none p-0 mt-2">
                      <div className="absolute inset-0 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-xl"></div>
                      <div className="relative z-10 flex items-center justify-center gap-2 text-white font-bold text-lg w-full h-full font-[family-name:var(--font-kodchasan)]">
                        <span>แอด LINE และส่งรหัสแล้ว กลับหน้าหลัก</span>
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
