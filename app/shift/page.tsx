import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { ShiftCohortCard } from "@/components/shift/ShiftCohortCard";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftPageView } from "@/components/shift/ShiftPageView";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ShiftNextCosmos, ShiftNextHero } from "@/components/shift/next/ShiftNextHero";
import { ShiftJourneyLink } from "@/components/shift/next/ShiftGlobeScene";
import { ShiftNextLight } from "@/components/shift/next/ShiftNextLight";
import space from "@/components/shift/next/shiftNext.module.css";
import { SHIFT_COHORTS, bangkokToday, cohortStatus } from "@/lib/content/shift-cohort";
import { NOTES } from "@/lib/content/pathlab-page";
import { NEXT_ROUND_NAME } from "@/lib/content/shift-next";
import { weekdayName } from "@/lib/content/shift-alumni";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";

import styles from "@/components/shift/shiftGallery.module.css";

/**
 * /shift: every SHIFT round in one place. Each card links to its own page
 * (/shift/1, /shift/2) where the full pitch and apply form live. Open rounds
 * come first, then newest first.
 */

export const metadata: Metadata = {
  title: "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง · ทุกรุ่น",
  description:
    "SHIFT ทุกรุ่นจาก PassionSeed: 7 วัน สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ พร้อมพอร์ต 1 หน้าสำหรับ TCAS 1 เลือกรุ่นที่ว่างแล้วสมัครได้เลย",
  alternates: { canonical: "/shift" },
  openGraph: {
    title: "SHIFT | 7 วัน ปั้น 1 โปรเจกต์จริง",
    description: "เลือกรุ่น SHIFT ที่ใช่ สร้างโปรเจกต์จริงที่คนนอกได้ลองใช้ใน 7 วัน",
    url: "https://passionseed.org/shift",
    type: "website",
  },
};

/** Status flips on Bangkok dates, so re-render at least hourly. */
export const revalidate = 3600;

export default async function ShiftGalleryPage() {
  const today = bangkokToday();
  const { doc: alumni } = await loadAlumniCalendar();
  const cohorts = [...SHIFT_COHORTS].sort((a, b) => b.round - a.round);
  const open = cohorts.filter((cohort) => cohortStatus(cohort, today) === "open");
  const archive = cohorts.filter((cohort) => cohortStatus(cohort, today) !== "open");

  return (
    <div className={`${space.page} ${styles.cosmicGallery} font-bai-jamjuree antialiased`} lang="th">
      <ShiftPageView pagePath="/shift" />
      <MetaPixel pagePath="/shift" />
      <ShiftNextCosmos />
      <ShiftNextLight />
      <ShiftGalleryMotion />

      <ShiftNextHero>
        <ShiftTopBar />
        <div className={`${space.container} ${space.heroInner}`}>
          <div className={space.heroCopy}>
            <p className={space.missionTag}>
              <span className={space.liveDot} aria-hidden="true" />
              PassionSeed / Builder Sprint
            </p>
            <div aria-hidden="true" className={space.wordmark}>
              <span className={space.wordmarkText}>SHIFT</span>
            </div>
            <h1 className={space.headline}>
              <span className="sr-only">SHIFT: </span>7 วัน
              <br /><span>ปั้น 1 โปรเจกต์จริง</span>
            </h1>
            <p className={space.lede}>
              สร้างของที่คนนอกได้ลองใช้ พร้อมบันทึกจุดพังและสิ่งที่แก้ และพอร์ต 1 หน้าสำหรับ TCAS 1
            </p>
            <div className={space.ctaRow}>
              {open.length > 0 ? (
                <a href="#rounds" className={space.cta}>
                  <span>เลือกรุ่นที่เปิดรับสมัคร</span>
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              ) : (
                <ShiftJourneyLink className={space.cta}>
                  <span>ลงชื่อ {NEXT_ROUND_NAME}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </ShiftJourneyLink>
              )}
              <a href="#rounds" className={space.ghost}>ดูทุกรุ่น</a>
            </div>
            <p className={space.preorder}>
              {open.length > 0 ? "เลือกรุ่นที่ว่าง แล้วเริ่มสร้างด้วยกัน" : "เลือกช่วงที่ว่างเอง ลงชื่อรอบถัดไปได้เลย"}
            </p>
          </div>
        </div>
      </ShiftNextHero>

      <div id="rounds" className={`${styles.container} ${styles.rounds}`}>
        {open.length > 0 && (
          <section aria-labelledby="open-rounds" className={styles.section} data-shift-reveal>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>NEXT UP</p>
                <h2 id="open-rounds" className="font-kodchasan">รอบต่อไป เริ่มที่นี่</h2>
              </div>
              <p className={styles.sectionAside}>ออนไลน์ทาง Discord<br />สร้างคนเดียวหรือชวนเพื่อนมาด้วยก็ได้</p>
            </div>
            <div className={styles.featuredList}>
              {open.map((cohort) => (
                <ShiftCohortCard key={cohort.round} cohort={cohort} status={cohortStatus(cohort, today)} featured />
              ))}
            </div>
            <p className={styles.note}><span className="pathlab-note">{NOTES.shiftGallery}</span></p>
          </section>
        )}

        {archive.length > 0 && (
          <section aria-labelledby="past-rounds" className={styles.section} data-shift-reveal>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>THE SHIFT COLLECTION</p>
                <h2 id="past-rounds" className="font-kodchasan">{open.length > 0 ? "รุ่นก่อนหน้า" : "ทุกรุ่นของ SHIFT"}</h2>
              </div>
              <p className={styles.sectionAside}>แต่ละรุ่น คนละโจทย์<br />ลงมือสร้างของจริงเหมือนกัน</p>
            </div>
            <div className={styles.archiveGrid}>
              {archive.map((cohort) => (
                <ShiftCohortCard key={cohort.round} cohort={cohort} status={cohortStatus(cohort, today)} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="alumni" className={styles.section} data-shift-reveal>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>SHIFT ALUMNI</p>
              <h2 id="alumni" className="font-kodchasan">จบ 7 วันแล้ว ยังสร้างต่อด้วยกัน</h2>
            </div>
            <p className={styles.sectionAside}>ศิษย์เก่านัดกันทุก{weekdayName(alumni.defaults.firstDate)}<br />ออนไลน์ใน Discord</p>
          </div>
          <Link href="/shift/alumni" className={styles.textLink}>
            ดูตาราง session ศิษย์เก่า <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <footer className={styles.footer}>
          <span>SHIFT by PassionSeed</span>
          <a href="#rounds" className={styles.textLink}>กลับไปเลือกรุ่น <ArrowUpRight size={16} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  );
}
