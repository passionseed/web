import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { ShiftCohortCard } from "@/components/shift/ShiftCohortCard";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { RisoPageTexture } from "@/components/shift/ShiftRiso";
import {
  ChromeBevelFilter,
  ChromeWordmark,
  OrbitSky,
} from "@/components/shift/poster/riso";
import { SHIFT_COHORTS, bangkokToday, cohortStatus } from "@/lib/content/shift-cohort";
import { NOTES } from "@/lib/content/pathlab-page";

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

export default function ShiftGalleryPage() {
  const today = bangkokToday();
  const cohorts = [...SHIFT_COHORTS].sort((a, b) => b.round - a.round);
  const open = cohorts.filter((cohort) => cohortStatus(cohort, today) === "open");
  const archive = cohorts.filter((cohort) => cohortStatus(cohort, today) !== "open");

  return (
    <div className={`${styles.page} font-bai-jamjuree antialiased`} lang="th">
      <MetaPixel pagePath="/shift" />
      <RisoPageTexture />
      <ShiftGalleryMotion />

      <header className={styles.hero}>
        <ChromeBevelFilter />
        <OrbitSky horizon="320px" speckle={0} />
        <ShiftTopBar />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroBrand}>
            <p className={styles.eyebrow}>PASSIONSEED / BUILDER SPRINT</p>
            <div aria-hidden="true" className={styles.wordmark}>
              <ChromeWordmark size="clamp(94px, 10vw, 136px)" name="SHIFT" />
            </div>
          </div>
          <div className={styles.heroCopy}>
            <h1 className="font-kodchasan">
              <span className="sr-only">SHIFT: </span>7 วัน ปั้น 1 โปรเจกต์จริง
            </h1>
            <p>สร้างของที่คนนอกได้ลองใช้ พร้อม Pivot Log<br className="hidden sm:block" /> และพอร์ต 1 หน้าสำหรับ TCAS 1</p>
            <a href="#rounds" className={styles.textLink}>
              {open.length > 0 ? "เลือกรุ่นที่เปิดรับสมัคร" : "ดูทุกรุ่นของ SHIFT"}
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

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

        <footer className={styles.footer}>
          <span>SHIFT by PassionSeed</span>
          <a href="#rounds" className={styles.textLink}>กลับไปเลือกรุ่น <ArrowUpRight size={16} aria-hidden="true" /></a>
        </footer>
      </div>
    </div>
  );
}
