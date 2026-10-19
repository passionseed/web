import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

import { AlumniCalendar } from "@/components/shift/alumni/AlumniCalendar";
import { AlumniPageView } from "@/components/shift/alumni/AlumniPageView";
import { AlumniShowcase } from "@/components/shift/alumni/AlumniShowcase";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ShiftNextCosmos, ShiftNextHero } from "@/components/shift/next/ShiftNextHero";
import { ShiftNextLight } from "@/components/shift/next/ShiftNextLight";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import space from "@/components/shift/next/shiftNext.module.css";
import styles from "@/components/shift/alumni/alumni.module.css";
import { ALUMNI_PAGE_URL, alumniCalendar, longThaiDate, sessionDetails, timeRangeLabel } from "@/lib/content/shift-alumni";
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

  const details = next ? sessionDetails(next, doc.defaults) : null;

  return (
    <div className={`${space.page} font-bai-jamjuree antialiased`} lang="th">
      <ShiftNextCosmos />
      <ShiftNextLight />
      <ShiftGalleryMotion />
      <AlumniPageView />
      <MetaPixel pagePath="/shift/alumni" />

      <ShiftNextHero>
        <ShiftTopBar back={{ href: "/shift", label: "SHIFT ทุกรุ่น" }} />
        <div className={`${space.container} ${space.heroInner}`}>
          <div className={space.heroCopy}>
            <p className={space.missionTag}>
              <span className={space.liveDot} aria-hidden="true" />
              The builders keep building
            </p>
            <div className={`${space.wordmark} ${styles.wordmark}`} aria-hidden="true">
              <span className={space.wordmarkText}>SHIFT</span>
            </div>
            <p className={styles.alumniLabel} aria-hidden="true">ALUMNI</p>
            <h1 className={space.headline}>
              <span className="sr-only">SHIFT Alumni: </span>
              จบ 7 วันแล้ว
              <br />
              <span>ยังสร้างต่อด้วยกัน</span>
            </h1>
            <p className={space.lede}>
              กลับมาอัปเดตโปรเจกต์ ลองของที่เพื่อนสร้าง แล้วลงมือทำต่อด้วยกัน ออนไลน์ใน Discord
            </p>
            <div className={space.ctaRow}>
              <a href={next ? "#rsvp" : "#calendar"} className={space.cta}>
                <span>{next ? "เจอกันนัดต่อไป" : "ดูตารางนัด"}</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#alumni-built" className={space.ghost}>ดูโปรเจกต์ของเพื่อน</a>
            </div>
            <p className={space.preorder}>สำหรับทุกคนที่จบ SHIFT แล้ว ลิงก์เข้าห้องอยู่ในกลุ่มของรุ่น</p>
          </div>
          {next && details && (
            <dl className={`${space.glass} ${styles.sessionReadout}`} data-glass>
              <div>
                <dt>นัดต่อไป</dt>
                <dd>{longThaiDate(next.date)}</dd>
              </div>
              <div>
                <dt>เวลา</dt>
                <dd>{timeRangeLabel(details.startTime, details.endTime) ?? "แจ้งในกลุ่ม"}</dd>
              </div>
              {details.place && <div><dt>เจอกันที่</dt><dd>{details.place}</dd></div>}
            </dl>
          )}
        </div>
      </ShiftNextHero>

      <main id="calendar" className={styles.content}>
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
          style={{ color: "var(--mist)" }}
        >
          ยังไม่เคยลง SHIFT? ดูรอบที่เปิดรับสมัคร
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </main>
    </div>
  );
}
