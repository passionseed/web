import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { ShiftCohortCard } from "@/components/shift/ShiftCohortCard";
import { ShiftGalleryMotion } from "@/components/shift/ShiftGalleryMotion";
import { MetaPixel } from "@/components/shift/MetaPixel";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ShiftNextCosmos, ShiftNextHero } from "@/components/shift/next/ShiftNextHero";
import { ShiftJourneyLink } from "@/components/shift/next/ShiftGlobeScene";
import { ShiftNextLight } from "@/components/shift/next/ShiftNextLight";
import space from "@/components/shift/next/shiftNext.module.css";
import { SHIFT_COHORTS, bangkokToday, cohortPath, cohortStatus } from "@/lib/content/shift-cohort";
import { NOTES } from "@/lib/content/pathlab-page";
import { SHIFT_DELIVERABLES, buildShiftFaqs } from "@/lib/content/shift-pitch";
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

const SITE_URL = "https://passionseed.org";

/**
 * Course + FAQ structured data for the page that stays up between rounds, so
 * search engines and AI answer engines can describe SHIFT even when no round
 * is open. Prices live on each round page, since they change by round.
 */
function buildGalleryJsonLd(faqs: ReturnType<typeof buildShiftFaqs>) {
  const url = `${SITE_URL}/shift`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": `${url}#course`,
        name: "SHIFT: 7 วัน ปั้น 1 โปรเจกต์จริง",
        description:
          "A 7-day online program where Thai high school students (M.4 to M.6) build one real project, test it with outside users, record what broke and what they changed, and turn it into a 1-page case study for their TCAS round 1 portfolio.",
        url,
        inLanguage: "th",
        educationalLevel: "High School (M.4 to M.6)",
        provider: { "@type": "Organization", name: "PassionSeed", url: SITE_URL },
        hasCourseInstance: SHIFT_COHORTS.map((cohort) => ({
          "@type": "CourseInstance",
          name: cohort.name,
          courseMode: "online",
          startDate: cohort.startDate,
          endDate: cohort.endDate,
          url: `${SITE_URL}${cohortPath(cohort)}`,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };
}

export default async function ShiftGalleryPage() {
  const today = bangkokToday();
  const { doc: alumni } = await loadAlumniCalendar();
  const cohorts = [...SHIFT_COHORTS].sort((a, b) => b.round - a.round);
  const open = cohorts.filter((cohort) => cohortStatus(cohort, today) === "open");
  const archive = cohorts.filter((cohort) => cohortStatus(cohort, today) !== "open");
  // The FAQ's tester answer quotes a round's target; the newest round's is current.
  const faqs = buildShiftFaqs(cohorts[0]);
  const jsonLd = buildGalleryJsonLd(faqs);

  return (
    <div className={`${space.page} ${styles.cosmicGallery} font-bai-jamjuree antialiased`} lang="th">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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

        <section aria-labelledby="what-you-get" className={styles.section} data-shift-reveal>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>WHAT YOU LEAVE WITH</p>
              <h2 id="what-you-get" className="font-kodchasan">จบ 7 วัน ได้อะไรกลับไป</h2>
            </div>
            <p className={styles.sectionAside}>ทุกรุ่นได้ 3 อย่างนี้<br />ไม่ว่าจะเป็นโจทย์ไหน</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {SHIFT_DELIVERABLES.map((item) => (
              <li key={item.num} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="font-kodchasan text-2xl font-bold text-[#fed95c]">{item.num}</span>
                <h3 className="mt-2 text-lg font-semibold leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-80">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq" className={styles.section} data-shift-reveal>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>FAQ</p>
              <h2 id="faq" className="font-kodchasan">คำถามที่เจอบ่อย</h2>
            </div>
            <p className={styles.sectionAside}>อยากเริ่มพอร์ตจากศูนย์?<br /><Link href="/port" className={styles.textLink}>อ่านคู่มือทำพอร์ต</Link></p>
          </div>
          <div>
            {faqs.map((faq) => (
              <details key={faq.q} className="group border-b border-white/10 py-5">
                <summary className="cursor-pointer list-none text-lg font-semibold leading-snug">
                  {faq.q}
                </summary>
                <p className="mt-3 leading-relaxed opacity-80">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

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
