"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Users,
  Target,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SHIFT_APPLY_URL } from "./ShiftApplyButton";

interface ShiftApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLocation?: string;
}

const GRADE_OPTIONS = ["ม.4", "ม.5", "ม.6", "ปี 1", "จบแล้ว / อื่นๆ"] as const;

export function ShiftApplicationModal({
  isOpen,
  onClose,
  sourceLocation = "hero",
}: ShiftApplicationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    school: "",
    grade: "ม.5",
    target_faculty: "",
    project_idea: "",
    user_reach_confirmed: true,
    user_reach_group: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/shift/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          source: `modal_${sourceLocation}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ไม่สามารถส่งใบสมัครได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-[var(--shift-card-line)] bg-[#070210] p-6 shadow-2xl sm:p-8 text-white font-bai-jamjuree">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          /* ============ SUCCESS STATE ============ */
          <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--shift-hazard-line)] bg-[var(--shift-hazard-soft)] text-[var(--shift-hazard)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-kodchasan mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              ส่งใบสมัครคัดเลือกแล้ว!
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">
              ทีมงาน PassionSeed จะรีวิวศักยภาพการหาผู้ใช้ 15 คน และประเมินไอเดียเบื้องต้นของคุณ
              เพื่อติดต่อสัมภาษณ์คัดเลือก 9 คนผ่าน LINE ภายใน 24 ชม.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left">
              <p className="font-mono text-xs uppercase tracking-wider text-amber-300 font-semibold">
                สิ่งที่จะเกิดขึ้นถัดไป
              </p>
              <ul className="mt-2.5 space-y-2 text-xs text-zinc-300">
                <li>• ตรวจสอบข้อความตอบรับทาง LINE: <strong className="text-white">{formData.contact}</strong></li>
                <li>• เข้าร่วม Discord Private Room สำหรับบรีฟ Day 1 Scope Lock</li>
                <li>• รับโจทย์คัดเลือกและคำแนะนำก่อนเริ่มสร้างชิ้นงาน</li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[var(--shift-hazard)] to-yellow-300 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:scale-105"
              >
                เข้าใจแล้ว ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        ) : (
          /* ============ APPLICATION FORM ============ */
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[var(--shift-hazard)]">
              <Sparkles className="h-4 w-4" />
              <span>SHIFT[0] Cohort Application · 9 Seats · ฿1,999 Early Bird</span>
            </div>
            <h2 className="font-kodchasan mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              ใบสมัครคัดเลือก 7-Day Crucible
            </h2>
            <p className="mt-2 text-xs text-zinc-400">
              ไม่มีการคัดเลือกด้วยเกรดเฉลี่ย เราคัดเลือกจาก{" "}
              <strong className="text-white">ความตั้งใจและความพร้อมในการแตะผู้ใช้งานจริง</strong>{" "}
              (พร้อม 100% Reality Collision Guarantee ดูแลต่อเนื่องฟรีจนกว่าจะมีคนใช้จริง 15 คน)
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Name & School */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    ชื่อ-นามสกุล / ชื่อเล่น <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ปั้น ธนภัทร (ปั้น)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--shift-hazard)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    ระดับชั้น <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c0419] px-3.5 py-2.5 text-sm text-white focus:border-[var(--shift-hazard)] focus:outline-none"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* School & Target Faculty */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    โรงเรียน / สถาบัน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เตรียมอุดมฯ / สวนกุหลาบ"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--shift-hazard)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    คณะเป้าหมายใน TCAS 1 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วิศวะคอม จุฬาฯ / BBA มธ. / FIBO"
                    value={formData.target_faculty}
                    onChange={(e) => setFormData({ ...formData, target_faculty: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--shift-hazard)] focus:outline-none"
                  />
                </div>
              </div>

              {/* 15 User Reach Test (Crucial Triage) */}
              <div className="rounded-2xl border border-[var(--shift-hazard-line)] bg-[var(--shift-hazard-soft)] p-4">
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--shift-hazard)]" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[var(--shift-hazard)]">
                      The 15-User Intake Test (หัวใจสำคัญ)
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                      คุณมีกลุ่มคนที่สามารถติดต่อให้เข้ามาทดลองใช้โปรเจกต์ 15–20 คนใน 48 ชม. ได้ไหม?
                    </p>
                    <div className="mt-3 flex gap-4 text-xs font-medium">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="user_reach"
                          checked={formData.user_reach_confirmed}
                          onChange={() => setFormData({ ...formData, user_reach_confirmed: true })}
                          className="accent-[var(--shift-hazard)]"
                        />
                        <span>มีกลุ่มเป้าหมายในใจแล้ว</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="user_reach"
                          checked={!formData.user_reach_confirmed}
                          onChange={() => setFormData({ ...formData, user_reach_confirmed: false })}
                          className="accent-[var(--shift-hazard)]"
                        />
                        <span>ยังไม่มี / อยากให้ทีมงานช่วยวางแผน</span>
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="กลุ่มผู้ใช้ของคุณคือใคร? เช่น เพื่อนในห้อง 20 คน / ลูกค้าในร้านกาแฟคุณพ่อ"
                      value={formData.user_reach_group}
                      onChange={(e) => setFormData({ ...formData, user_reach_group: e.target.value })}
                      className="mt-2.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[var(--shift-hazard)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Project Idea */}
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  ไอเดียโปรเจกต์ดิบที่คุณอยากลองสร้างและทดสอบใน 7 วัน <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="เขียนสั้นๆ 1-2 ประโยค เช่น แอพช่วยคนตาบอดเช็คเหรียญ / เว็บบอร์ดสรุปสูตรอาหารคีโตสำหรับคุณแม่"
                  value={formData.project_idea}
                  onChange={(e) => setFormData({ ...formData, project_idea: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--shift-hazard)] focus:outline-none"
                />
              </div>

              {/* LINE ID or Phone */}
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  LINE ID หรือ เบอร์โทรศัพท์ (สำหรับติดต่อสัมภาษณ์) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="LINE ID หรือ เบอร์โทรศัพท์ที่ติดต่อได้จริง"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[var(--shift-hazard)] focus:outline-none"
                />
              </div>

              {/* Trust & Guarantee Badge */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">ค่าลงทะเบียน ฿1,999</span>{" "}
                  <span className="line-through text-zinc-500">฿3,900</span>
                  <p className="text-[10px] text-[var(--shift-hazard)]">ชำระเมื่อผ่านการคัดเลือกเท่านั้น · การันตีมีผู้ใช้จริง 15 คน</p>
                </div>
                <div className="text-right font-mono text-[10px] text-emerald-400 font-semibold uppercase">
                  Zero Risk Guarantee
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--shift-hazard)] to-yellow-300 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[var(--shift-hazard)]/20 transition hover:scale-[1.01] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังส่งข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <span>ส่งใบสมัคร SHIFT[0] (ฟรี ไม่มีค่าใช้จ่ายเบื้องต้น)</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Fallback to Google Form */}
              <p className="text-center text-[11px] text-zinc-500">
                หากพบปัญหาในการส่งฟอร์ม{" "}
                <a
                  href={SHIFT_APPLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 underline hover:text-white"
                >
                  คลิกเพื่อกรอกผ่าน Google Forms แทน
                </a>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
