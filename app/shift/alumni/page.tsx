import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AlumniCalendar } from "@/components/shift/alumni/AlumniCalendar";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  INK,
  OrbitSky,
} from "@/components/shift/poster/riso";
import {
  ALUMNI_DEFAULT_DOC,
  ALUMNI_PAGE_URL,
  parseAlumniCalendarDoc,
  type AlumniCalendarDoc,
} from "@/lib/content/shift-alumni";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { currentShiftAdmin } from "@/lib/shift/admin";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * /shift/alumni: the weekly SHIFT alumni session, every Friday on Discord.
 * Public, so parents and new students can see the community keeps going
 * after day 7. The Discord link itself stays in each round's group.
 */

export const metadata: Metadata = {
  title: "SHIFT Alumni | session ศิษย์เก่าทุกวันศุกร์",
  description:
    "จบ SHIFT แล้วยังสร้างต่อด้วยกัน ศิษย์เก่า SHIFT นัดกันทุกวันศุกร์ ออนไลน์ใน Discord มาทำโปรเจกต์ต่อและอัปเดตกัน",
  alternates: { canonical: "/shift/alumni" },
  openGraph: {
    title: "SHIFT Alumni | session ศิษย์เก่าทุกวันศุกร์",
    description: "จบ SHIFT แล้วยังสร้างต่อด้วยกัน นัดกันทุกวันศุกร์ ออนไลน์ใน Discord",
    url: ALUMNI_PAGE_URL,
    type: "website",
  },
};

/** Reads the admin's session cookie, so it renders per request. */
export const dynamic = "force-dynamic";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

async function loadCalendar(): Promise<{ doc: AlumniCalendarDoc; updatedAt: string | null }> {
  try {
    const { data } = await createAdminClient()
      .from("shift_alumni_calendar")
      .select("content, updated_at")
      .eq("id", "main")
      .maybeSingle();
    const doc = parseAlumniCalendarDoc(data?.content);
    if (doc) return { doc, updatedAt: data?.updated_at ?? null };
  } catch {
    // No table or no env: show the plain Friday series.
  }
  return { doc: ALUMNI_DEFAULT_DOC, updatedAt: null };
}

export default async function ShiftAlumniPage() {
  const [{ doc, updatedAt }, admin] = await Promise.all([loadCalendar(), currentShiftAdmin()]);

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
      lang="th"
    >
      <RisoPageTexture />

      <header className="relative overflow-hidden">
        <ChromeBevelFilter />
        <OrbitSky horizon="clamp(240px, 34svh, 320px)" speckle={0} />
        <ShiftTopBar />
        <div
          className="relative flex flex-col items-center justify-end pb-10 text-center"
          style={{ minHeight: "clamp(240px, 34svh, 320px)" }}
        >
          <h1 className="font-kodchasan text-lg font-semibold">
            <span className="sr-only">SHIFT Alumni: </span>จบ 7 วันแล้ว ยังสร้างต่อด้วยกัน
          </h1>
          <div aria-hidden="true">
            <ChromeWordmark size="clamp(56px, 12vw, 112px)" name="ALUMNI" />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-10 sm:px-8">
        <p className="text-center leading-relaxed sm:text-lg" style={{ color: paper("cc") }}>
          ศิษย์เก่า SHIFT นัดกันทุกวันศุกร์ ออนไลน์ใน Discord
          <br />
          มาทำโปรเจกต์ต่อ อัปเดตกัน แล้วช่วยกันไปต่อ
        </p>
        <p className="mt-3 text-center text-sm leading-relaxed" style={{ color: paper("80") }}>
          สำหรับทุกคนที่จบ SHIFT แล้ว ลิงก์เข้าห้องอยู่ในกลุ่มของแต่ละรุ่น
        </p>

        <div className="mt-10">
          <AlumniCalendar
            initial={doc}
            updatedAt={updatedAt}
            canEdit={admin !== null}
            today={bangkokToday()}
          />
        </div>

        <Link
          href="/shift"
          className="mt-14 flex items-center justify-center gap-2 text-sm font-semibold underline underline-offset-4"
          style={{ color: paper("cc") }}
        >
          ยังไม่เคยลง SHIFT? ดูรอบที่เปิดรับสมัคร
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </main>
    </div>
  );
}
