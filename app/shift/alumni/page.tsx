import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AlumniCalendar } from "@/components/shift/alumni/AlumniCalendar";
import { AlumniPageView } from "@/components/shift/alumni/AlumniPageView";
import { AlumniShowcase } from "@/components/shift/alumni/AlumniShowcase";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ScaledFrame } from "@/components/shift/alumni/ScaledFrame";
import {
  ALUMNI_POSTER_H,
  ALUMNI_POSTER_W,
  ShiftAlumniSessionPoster,
} from "@/components/shift/poster/ShiftAlumniSessionPoster";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  INK,
  OrbitSky,
} from "@/components/shift/poster/riso";
import { ALUMNI_PAGE_URL, alumniCalendar } from "@/lib/content/shift-alumni";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { currentShiftAdmin } from "@/lib/shift/admin";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { countAlumniRsvps, listAlumniRsvps, type AlumniRsvp } from "@/lib/supabase/shift-alumni-rsvps";

/**
 * /shift/alumni: the weekly SHIFT alumni session, online on Discord.
 * Public, so parents and new students can see the community keeps going
 * after day 7. The Discord link itself stays in each round's group.
 */

export const metadata: Metadata = {
  title: "SHIFT Alumni | session ศิษย์เก่าทุกสัปดาห์",
  description:
    "จบ SHIFT แล้วยังสร้างต่อด้วยกัน ศิษย์เก่า SHIFT นัดกันทุกสัปดาห์ ออนไลน์ใน Discord มาทำโปรเจกต์ต่อและอัปเดตกัน",
  alternates: { canonical: "/shift/alumni" },
  openGraph: {
    title: "SHIFT Alumni | session ศิษย์เก่าทุกสัปดาห์",
    description: "จบ SHIFT แล้วยังสร้างต่อด้วยกัน นัดกันทุกสัปดาห์ ออนไลน์ใน Discord",
    url: ALUMNI_PAGE_URL,
    type: "website",
  },
};

/** Reads the admin's session cookie, so it renders per request. */
export const dynamic = "force-dynamic";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Admins only: names never reach a public render. */
async function rsvpNamesByDate(dates: string[]) {
  const byDate: Record<string, Pick<AlumniRsvp, "nickname" | "cohort">[]> = {};
  try {
    for (const { session_date, nickname, cohort } of await listAlumniRsvps(dates)) {
      (byDate[session_date] ??= []).push({ nickname, cohort });
    }
  } catch {
    // Table missing: show none.
  }
  return byDate;
}

export default async function ShiftAlumniPage() {
  const [{ doc, updatedAt }, admin] = await Promise.all([loadAlumniCalendar(), currentShiftAdmin()]);
  const today = bangkokToday();
  const { upcoming } = alumniCalendar(doc, today);
  const upcomingDates = upcoming.map((s) => s.date);
  const next = upcoming.find((s) => !s.cancelled);
  const [rsvpCounts, rsvpNames] = await Promise.all([
    countAlumniRsvps(upcomingDates),
    admin ? rsvpNamesByDate(upcomingDates) : undefined,
  ]);

  return (
    <div
      className="relative min-h-screen font-bai-jamjuree antialiased"
      style={{ backgroundColor: INK.black, color: INK.paper }}
      lang="th"
    >
      <RisoPageTexture />
      <AlumniPageView />
      <MetaPixel pagePath="/shift/alumni" />

      {next ? (
        <header className="relative">
          <ChromeBevelFilter />
          <ShiftTopBar />
          <h1 className="sr-only">SHIFT Alumni: จบ 7 วันแล้ว ยังสร้างต่อด้วยกัน</h1>
          {/* The poster for the next session; the same details follow as text. */}
          <div className="mx-auto max-w-6xl px-3 pt-20 sm:px-8 sm:pt-24" aria-hidden="true">
            <div style={{ boxShadow: `-6px 5px 0 ${INK.pink}` }}>
              <ScaledFrame width={ALUMNI_POSTER_W} height={ALUMNI_POSTER_H}>
                <ShiftAlumniSessionPoster session={next} defaults={doc.defaults} />
              </ScaledFrame>
            </div>
          </div>
        </header>
      ) : (
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
      )}

      <main className="relative mx-auto max-w-2xl px-5 pb-28 pt-8 sm:px-8 sm:pb-24">
        <div>
          <AlumniCalendar
            initial={doc}
            updatedAt={updatedAt}
            canEdit={admin !== null}
            today={today}
            rsvpCounts={rsvpCounts}
            rsvpNames={rsvpNames}
          />
        </div>

        <AlumniShowcase />

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
