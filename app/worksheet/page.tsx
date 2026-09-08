import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AUDIENCE_SEGMENTS,
  SDT_NEEDS,
  getWorksheetForSegment,
  worksheetPath,
} from "@/lib/work/audience-segments";

export const metadata: Metadata = {
  title: "ใบงานฟรี | PassionSeed",
  description:
    "ใบงาน 5 ใบสำหรับนักเรียน ม.ปลาย ตรวจน้ำหนักพอร์ต หาโปรเจกต์แรก บันทึกการทำงาน เลือกคณะ และคุยกับที่บ้าน ใช้ฟรี ไม่ต้องลงทะเบียน",
};

export default function WorksheetIndexPage() {
  return (
    <main className="min-h-screen bg-[#faf7f2] font-bai-jamjuree text-stone-900">
      <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <header>
          <p className="font-space-mono text-[10px] uppercase tracking-[0.18em] text-orange-600/80">
            PassionSeed · ใบงานฟรี
          </p>
          <h1 className="mt-4 font-kodchasan text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            เลือกใบที่ตรงกับที่น้องยืนอยู่ตอนนี้
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
            ทุกใบใช้เวลาไม่เกิน 30 นาที ทำเสร็จแล้วได้ของกลับไป 1 ชิ้นเสมอ ไม่ต้องลงทะเบียน
            ไม่ต้องให้เบอร์ ปริ้นแจกเพื่อนได้เลย
          </p>
        </header>

        <ul className="mt-12 space-y-4">
          {AUDIENCE_SEGMENTS.map((segment) => {
            const worksheet = getWorksheetForSegment(segment.id);
            if (!worksheet) return null;

            return (
              <li key={segment.id}>
                <Link
                  href={worksheetPath(worksheet.slug)}
                  className="group grid gap-4 rounded-2xl border border-stone-900/10 bg-white p-5 transition-colors hover:border-orange-500/35 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500">สำหรับคนที่บอกว่า “{segment.saidVerbatim}”</p>
                    <h2 className="mt-2 font-kodchasan text-xl font-semibold text-stone-900">
                      {worksheet.thaiTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{worksheet.promise}</p>
                    <p className="mt-3 font-space-mono text-[10px] uppercase tracking-[0.14em] text-stone-400">
                      {worksheet.timeBox} · {worksheet.prompts.length} ข้อ · {segment.grade}
                    </p>
                  </div>
                  <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-700 transition-transform group-hover:translate-x-0.5">
                    เปิดใบงาน
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <section className="mt-16 rounded-2xl border border-stone-900/10 bg-white/70 p-6 sm:p-8">
          <h2 className="font-kodchasan text-lg font-semibold text-stone-900">
            ทำไมใบงานพวกนี้ไม่มีคำตอบให้ลอก
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            เพราะสิ่งที่ทำให้คนทำงานต่อเองได้ ไม่ใช่คำตอบที่ถูก แต่เป็นสามอย่างนี้
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            {SDT_NEEDS.map((need) => (
              <div key={need.id} className="rounded-xl border border-stone-900/10 bg-white p-4">
                <dt className="text-sm font-semibold text-stone-900">{need.thaiLabel}</dt>
                <dd className="mt-2 text-xs leading-6 text-stone-600">{need.starvedSignal}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-7 text-stone-600">
            ใบงานเลยถามอย่างเดียว ไม่ตอบแทน และขอของกลับมา 1 ชิ้นที่น้องทำเอง
            ส่วนที่เหลือเป็นของน้องล้วนๆ
          </p>
        </section>
      </div>
    </main>
  );
}
