"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Rocket,
    Target,
    Map,
    TrendingUp,
    Lightbulb,
    ArrowRight,
    CheckCircle2
} from "lucide-react";

// Reuse the FloatingOrb from the registration page for consistency
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

export default function BetaInfoPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] selection:bg-purple-500/30 text-slate-200 font-[family-name:var(--font-kodchasan)] pb-24">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <FloatingOrb color="bg-orange-600/30" size="40vw" initialX="-10%" initialY="10%" duration={15} delay={0} />
                <FloatingOrb color="bg-purple-600/20" size="50vw" initialX="60%" initialY="-20%" duration={20} delay={2} />
                <FloatingOrb color="bg-blue-600/20" size="45vw" initialX="40%" initialY="60%" duration={18} delay={1} />

                {/* Subtle grid pattern overlay */}
                <div
                    className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0gMjAgMCBMMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=')] opacity-50"
                    style={{ maskImage: 'linear-gradient(to bottom, transparent, black, transparent)' }}
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 pt-12">
                {/* Header / Logos */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center mb-2 space-y-2"
                >
                    <div className="relative inline-block mb-2 overflow-visible">
                        <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter">
                            <span className="text-slate-100">Passion</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 pr-6 pb-2 inline-block">seed</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-2xl md:text-4xl font-light">
                        <span>App</span>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="flex flex-col">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 font-bold leading-none">Beta test</span>
                            <span className="text-sm text-slate-400 tracking-widest uppercase">100 users</span>
                        </div>
                    </div>
                </motion.div>

                {/* Hero CTA Section */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-32">
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full lg:w-1/2 space-y-8"
                    >
                        <div className="inline-flex py-1 px-4 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold tracking-wider uppercase mb-2">
                            สำหรับ ม.ปลายเท่านั้น (High School Only)
                        </div>

                        <h2 className="text-6xl sm:text-7xl font-bold leading-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">สมัครเลย!</span>
                            <br />
                            <span className="text-4xl sm:text-5xl text-slate-300 font-medium">เพื่อค้นหาทางของคุณ</span>
                        </h2>

                        <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
                            ร่วมทดสอบแอปตัวแรกของเราและช่วยเราสร้างอนาคตของการค้นหาตัวเองและการเตรียมตัวเข้ามหาวิทยาลัย
                        </p>

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-block"
                        >
                            <Link href="/app/beta/registration">
                                <Button className="group relative h-16 w-auto overflow-hidden rounded-2xl bg-transparent border-none">
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 opacity-90 transition-opacity group-hover:opacity-100"></div>
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"
                                    />
                                    <div className="relative z-10 flex items-center justify-center gap-4 text-white font-black text-3xl sm:text-4xl w-full h-full rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.3)] px-10">
                                        <span>สมัคร (Register Now)</span>
                                        <ArrowRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Decorative Character 1 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            rotate: 0,
                            y: [0, -20, 0]
                        }}
                        transition={{
                            opacity: { duration: 0.8, delay: 0.4 },
                            scale: { duration: 0.8, delay: 0.4 },
                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="w-full lg:w-1/2 relative flex justify-center perspective-1000 mt-12 lg:mt-0"
                    >
                        <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full"></div>
                        <Image
                            src="/CBT/Person1.svg"
                            alt="Student exploring options"
                            width={500}
                            height={500}
                            className="relative z-10 drop-shadow-2xl hover:-translate-y-4 transition-transform duration-500 px-6 sm:px-0"
                        />
                        {/* Floating Tags */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, delay: 1, repeat: Infinity }}
                            className="absolute z-20 top-[15%] sm:top-1/4 left-0 sm:-left-8 bg-white/10 backdrop-blur-md border border-white/20 px-5 sm:px-6 py-4 rounded-xl text-lg sm:text-xl font-bold shadow-xl max-w-[220px] sm:max-w-none text-center"
                        >
                            ทดสอบคณะที่เหมาะสำหรับคุณ
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 3.5, delay: 0.5, repeat: Infinity }}
                            className="absolute z-20 bottom-[15%] sm:bottom-1/4 right-0 sm:-right-12 bg-white/10 backdrop-blur-md border border-white/20 px-5 sm:px-6 py-4 rounded-xl text-lg sm:text-xl font-bold shadow-xl max-w-[220px] sm:max-w-none text-center"
                        >
                            วางแผนมหาลัยที่ใช่
                        </motion.div>
                    </motion.div>
                </div>

                {/* Feature Section */}
                <div className="relative">
                    <div className="text-center mb-16 px-4">
                        <h3 className="inline-block text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4 py-4 leading-normal">
                            แอพเราดียังไง?
                        </h3>
                        <p className="text-slate-400 text-lg">Features inside the Beta</p>
                    </div>

                    <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-16">

                        {/* Decorative Character 2 */}
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className="w-full lg:w-1/2 relative flex justify-center"
                        >
                            <motion.div
                                animate={{ y: [0, 15, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full"></div>
                                <Image
                                    src="/CBT/Person2.svg"
                                    alt="Student finding their path"
                                    width={500}
                                    height={500}
                                    className="relative z-10 drop-shadow-2xl mix-blend-screen opacity-90"
                                    style={{ filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.3))' }}
                                />
                            </motion.div>
                        </motion.div>

                        {/* Feature List */}
                        <div className="w-full lg:w-1/2 space-y-6">
                            {[
                                {
                                    title: "หาคณะที่เหมาะกับคุณ",
                                    desc: "ค้นพบศักยภาพและความสนใจที่แท้จริงของคุณผ่านแบบทดสอบและการประเมิน",
                                    icon: Target,
                                    color: "from-purple-500 to-pink-500"
                                },
                                {
                                    title: "ทดลองทำจริงในแต่ละสาย",
                                    desc: "(Chef, ComEn, ComSci, Architect, Med, Business และอีกนิดหน่อยมั้ง) ลองสัมผัสประสบการณ์การเรียนและการทำงานก่อนตัดสินใจ",
                                    icon: Map,
                                    color: "from-blue-500 to-cyan-500"
                                },
                                {
                                    title: "วางแผนเข้ามหาลัยที่ใช่",
                                    desc: "สร้าง Roadmap ส่วนตัวเพื่อพิชิตเป้าหมายการเข้าเรียนในคณะและมหาวิทยาลัยในฝัน",
                                    icon: TrendingUp,
                                    color: "from-green-500 to-emerald-500"
                                },
                                {
                                    title: "เปรียบเทียบรอบ + มหาลัย",
                                    desc: "วิเคราะห์และเปรียบเทียบข้อมูลการรับสมัครแต่ละรอบของแต่ละมหาวิทยาลัยได้อย่างง่ายดาย",
                                    icon: CheckCircle2,
                                    color: "from-orange-500 to-yellow-500"
                                },
                                {
                                    title: "ออกแบบแผน ทำไงจะเข้าได้",
                                    desc: "สร้างกลยุทธ์และจัดตารางการเตรียมตัวสอบเพื่อให้คุณพร้อมที่สุด",
                                    icon: Lightbulb,
                                    color: "from-red-500 to-rose-500"
                                }
                            ].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all backdrop-blur-sm overflow-hidden"
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} bg-opacity-20`}>
                                                <feature.icon className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">
                                                {feature.title}
                                            </h4>
                                            <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                                                {feature.desc}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {/* Global CSS animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
      `}} />
        </div>
    );
}
