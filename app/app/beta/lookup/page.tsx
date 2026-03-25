"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { lookupBetaSubmission, type BetaLookupField } from "@/actions/beta-lookup";

const FIELD_LABELS: Record<string, string> = {
  "Full name": "ชื่อ-นามสกุล",
  "Nickname": "ชื่อเล่น",
  "Email address": "อีเมล",
  "Phone number": "เบอร์โทร",
  "School": "โรงเรียน",
  "Grade": "ระดับชั้น",
  "Platform": "แพลตฟอร์ม",
  "What interests you about testing?": "แรงจูงใจ",
  "Faculty of Interest": "คณะที่สนใจ",
  "Major Interest": "สาขาที่สนใจ",
  "University": "มหาวิทยาลัย",
};

export default function BetaLookupPage() {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ fields: BetaLookupField[] } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleDigitChange = (idx: number, value: string) => {
    const char = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
    if (pasted.length > 0) {
      e.preventDefault();
      const next = ["", "", "", ""];
      pasted.split("").forEach((c, i) => { next[i] = c; });
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 4) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    const res = await lookupBetaSubmission(code);
    setLoading(false);
    if (res.found) {
      setResult({ fields: res.fields });
    } else {
      setNotFound(true);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-slate-200 font-[family-name:var(--font-kodchasan)] flex flex-col items-center justify-start py-12 px-4"
      style={{ background: "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)" }}
    >
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute rounded-full blur-[100px]"
          style={{ width: "40vw", height: "40vw", left: "-10%", top: "10%", background: "radial-gradient(circle, rgba(251,146,60,0.35) 0%, transparent 70%)" }}
          animate={{ opacity: [0.3, 0.5, 0.3], x: [0, 30, 0], y: [0, -30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-[100px]"
          style={{ width: "50vw", height: "50vw", left: "60%", top: "-20%", background: "radial-gradient(circle, rgba(190,24,93,0.38) 0%, transparent 70%)" }}
          animate={{ opacity: [0.25, 0.45, 0.25], x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link href="/app/beta" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้า Beta
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 space-y-2"
        >
          <h1 className="text-4xl font-black text-white">
            ค้นหาผู้สมัคร
          </h1>
          <p className="text-slate-400">กรอกรหัส 4 หลักของผู้สมัคร</p>
        </motion.div>

        {/* Code input */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="flex items-center justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-16 h-16 text-center text-3xl font-black bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all uppercase caret-orange-400"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={digits.join("").length < 4 || loading}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(249,115,22,0.3)]"
          >
            {loading ? (
              <span className="animate-pulse">กำลังค้นหา...</span>
            ) : (
              <>
                <Search className="w-5 h-5" />
                ค้นหา
              </>
            )}
          </button>
        </motion.form>

        {/* Not found */}
        <AnimatePresence>
          {notFound && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-400 font-medium"
            >
              ไม่พบรหัสนี้ กรุณาตรวจสอบและลองใหม่อีกครั้ง
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                <h2 className="text-lg font-bold text-white">ข้อมูลผู้สมัคร</h2>
                <p className="text-xs text-slate-500 mt-0.5">รหัส: {digits.join("")}</p>
              </div>
              <div className="divide-y divide-white/5">
                {result.fields.map((field, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
                  >
                    <span className="text-xs text-slate-500 sm:w-36 shrink-0 pt-0.5">
                      {FIELD_LABELS[field.label] ?? field.label}
                    </span>
                    <span className="text-slate-200 text-sm font-medium break-words">
                      {field.answer}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
