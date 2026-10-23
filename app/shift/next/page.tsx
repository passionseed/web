import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import {
  ShiftNextCosmos,
  ShiftNextHero,
} from "@/components/shift/next/ShiftNextHero";
import { ShiftNextLight } from "@/components/shift/next/ShiftNextLight";
import {
  DealSection,
  FaqSection,
  FlightPlanSection,
  OutcomeSection,
  ProofSection,
  ReserveSection,
  WhySection,
} from "@/components/shift/next/ShiftNextSections";
import styles from "@/components/shift/next/shiftNext.module.css";
import { bangkokToday } from "@/lib/content/shift-cohort";
import {
  MIN_BUILDERS,
  NEXT_ROUND,
  NEXT_ROUND_NAME,
  PITCH,
  SESSION_TIME,
} from "@/lib/content/shift-next";

/**
 * /shift/next: pre-order for the next SHIFT round. It has a number but no
 * date yet. People mark when they are free; the round opens on the first
 * 7-day window that MIN_BUILDERS people share. The page opens with why SHIFT
 * exists and keeps the pre-order mechanics for the end, next to the form.
 */

export const metadata: Metadata = {
  title: `${NEXT_ROUND_NAME} | ลงชื่อช่วงที่ว่าง เปิดรอบเมื่อคนครบ`,
  description: `เลือกช่วงที่ว่าง 7 เย็นติดกัน ช่วงไหนมีคนครบ ${MIN_BUILDERS} คน เราเปิด ${NEXT_ROUND_NAME} รอบนั้น ลงมือสร้างของจริง แล้วชวนคนนอกมาลองใช้ พร้อมพอร์ต 1 หน้า ลงชื่อฟรี ยังไม่ต้องจ่าย`,
  alternates: { canonical: "/shift/next" },
  openGraph: {
    title: `${NEXT_ROUND_NAME} | เปิดเมื่อคนพร้อม`,
    description: `เลือกช่วงที่ว่าง ครบ ${MIN_BUILDERS} คนเปิดรอบ ลงชื่อฟรี`,
    url: "https://passionseed.org/shift/next",
    type: "website",
  },
};

/** The pickable calendar starts a week from today in Bangkok. */
export const revalidate = 3600;

export default function ShiftNextPage() {
  const today = bangkokToday();

  return (
    <div className={`${styles.page} font-bai-jamjuree antialiased`} lang="th">
      <MetaPixel
        pagePath="/shift/next"
        viewContent={{ content_name: "SHIFT next" }}
      />
      <ShiftNextCosmos />
      <ShiftGalleryMotion />
      <ShiftNextLight />

      <ShiftNextHero focusThailand>
        <ShiftTopBar back={{ href: "/shift", label: "SHIFT ทุกรุ่น" }} />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.missionTag}>
              <span className={styles.liveDot} aria-hidden="true" />
              Pre-order · Round {String(NEXT_ROUND).padStart(2, "0")}
            </p>
            <div className={styles.wordmark} aria-hidden="true">
              <span className={styles.wordmarkText}>SHIFT</span>
              <span className={styles.lens}>
                <span>{NEXT_ROUND}</span>
              </span>
            </div>
            <h1 className={styles.headline}>
              <span className="sr-only">{NEXT_ROUND_NAME}: </span>
              {PITCH.headline[0]}
              <br />
              <span>{PITCH.headline[1]}</span>
            </h1>
            <p className={styles.lede}>{PITCH.lede}</p>
            <div className={styles.ctaRow}>
              <a
                href="#reserve"
                className={styles.cta}
                style={{ ["--nudge" as string]: "0 2px" }}
              >
                <span>เลือกช่วงที่ว่าง</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#why" className={styles.ghost}>
                ทำไมต้อง SHIFT
              </a>
            </div>
            <p className={styles.preorder}>{PITCH.preorder}</p>
          </div>
          <dl className={`${styles.glass} ${styles.hud}`} data-glass>
            <div>
              <dt>Window</dt>
              <dd>7 เย็นติดกัน</dd>
            </div>
            <div>
              <dt>Online</dt>
              <dd>Discord<br /><span className={styles.onlineTime}>{SESSION_TIME}</span></dd>
            </div>
            <div>
              <dt>Opens at</dt>
              <dd>ครบ {MIN_BUILDERS} คน</dd>
            </div>
          </dl>
        </div>
      </ShiftNextHero>

      <main>
        <WhySection />
        <ProofSection />
        <OutcomeSection />
        <FlightPlanSection />
        <DealSection />
        <ReserveSection today={today} />
        <FaqSection />

        <footer className={`${styles.container} ${styles.footer}`}>
          <span>{NEXT_ROUND_NAME} by PassionSeed</span>
          <a href="#reserve">
            เลือกช่วงที่ว่าง{" "}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </footer>
      </main>
    </div>
  );
}
