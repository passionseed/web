import type { Metadata } from "next";
import Link from "next/link";

import { ShiftApplyForm } from "@/components/shift/ShiftApplyForm";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  INK,
  OrbitSky,
  PassionSeedMark,
} from "@/components/shift/poster/riso";
import {
  SHIFT_COHORT,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

export const metadata: Metadata = {
  title: `สมัคร ${SHIFT_COHORT.name} | PassionSeed`,
  description: `สมัคร ${SHIFT_COHORT.name} ใช้เวลา 2 นาที ไม่ต้องล็อกอิน`,
  alternates: { canonical: "/shift/apply" },
};

const paper = (alpha: string) => `${INK.paper}${alpha}`;

export default async function ShiftApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source: source } = await searchParams;

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
    >
      <RisoPageTexture />

      <header className="relative overflow-hidden">
        <ChromeBevelFilter />
        <OrbitSky horizon="clamp(260px, 38svh, 340px)" speckle={0} />
        <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-7">
          <Link href="/shift" aria-label="กลับไปหน้า SHIFT">
            <PassionSeedMark size={36} />
          </Link>
        </div>
        <div
          className="relative flex flex-col items-center justify-end pb-10 text-center"
          style={{ minHeight: "clamp(260px, 38svh, 340px)" }}
        >
          <p className="font-kodchasan text-lg font-semibold" style={{ color: INK.paper }}>
            สมัคร
          </p>
          <ChromeWordmark size="clamp(64px, 13vw, 120px)" />
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        <p className="text-center text-sm leading-relaxed sm:text-base" style={{ color: paper("b3") }}>
          {formatThaiDateRange(SHIFT_COHORT.startDate, SHIFT_COHORT.endDate)} · ออนไลน์บน Discord ·
          รับ {SHIFT_COHORT.seats} คน ดูแลทั่วถึง
          <br />
          ใช้เวลา 2 นาที ไม่ต้องล็อกอิน ·{" "}
          <span className="font-semibold" style={{ color: INK.yellow }}>
            ปิดรับ {formatThaiDate(SHIFT_COHORT.applyDeadline)}
          </span>
        </p>

        <div className="mt-10">
          <ShiftApplyForm source={source} />
        </div>
      </main>
    </div>
  );
}
