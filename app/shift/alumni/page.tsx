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
import { AFTERSHIFT_PROMISE, AFTERSHIFT_SUPPORT } from "@/lib/content/aftershift";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { currentShiftAdmin } from "@/lib/shift/admin";
import { BOARD_PATH } from "@/lib/shift/alumniBoard";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { countAlumniRsvps, listAlumniRsvps, type AlumniRsvp } from "@/lib/supabase/shift-alumni-rsvps";

/**
 * /shift/alumni: the weekly SHIFT alumni session, online on Discord.
 * Public, so parents and new students can see the community keeps going
 * after day 7. The Discord link itself stays in each round's group.
 */

export const metadata: Metadata = {
  title: "AfterSHIFT | สร้างโปรเจกต์ต่อหลังจบ SHIFT",
  description:
    "AfterSHIFT ช่วยพาโปรเจกต์ไปลองตลาดจริง หาผู้ใช้เพิ่ม และพัฒนาโปรดักต์แบบมืออาชีพหลังจบ SHIFT",
  alternates: { canonical: "/shift/alumni" },
  openGraph: {
    title: "AfterSHIFT | สร้างโปรเจกต์ต่อหลังจบ SHIFT",
    description: "AfterSHIFT: ลองตลาดจริง หาผู้ใช้เพิ่ม พัฒนาโปรดักต์แบบมืออาชีพ",
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
              Your next chapter starts here
            </p>
            <div className={`${space.wordmark} ${styles.wordmark}`} aria-hidden="true">
              <span className={styles.after}>After</span><span className={space.wordmarkText}>SHIFT</span>
            </div>
            <p className={styles.alumniLabel}>คอมมูนิตี้สำหรับคนที่จบ SHIFT</p>
            <h1 className={space.headline}>
              <span className="sr-only">AfterSHIFT: </span>
              พาโปรเจกต์ออกไป
              <br />
              <span>เจอผู้ใช้จริง</span>
            </h1>
            <p className={space.lede}>
              {AFTERSHIFT_PROMISE}
            </p>
            <div className={space.ctaRow}>
              <a href={next ? "#rsvp" : "#calendar"} className={space.cta}>
                <span>{next ? "เจอกันนัดต่อไป" : "ดูตารางนัด"}</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="#aftershift" className={space.ghost}>รู้จัก AfterSHIFT</a>
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

      <main className={styles.content}>
        <section id="aftershift" aria-labelledby="aftershift-heading" className={styles.intro}>
          <p className={styles.eyebrow}>AFTER THE SEVEN DAYS</p>
          <h2 id="aftershift-heading" className={styles.sectionTitle}>AfterSHIFT ช่วยอะไรเราได้บ้าง</h2>
          <p className={styles.introCopy}>มีโปรเจกต์แล้ว ก้าวต่อไปคือทำให้คนใช้จริง เราช่วยคิด ทดลอง และพัฒนาต่อไปด้วยกัน</p>
          <ol className={styles.buildLoop}>
            {AFTERSHIFT_SUPPORT.map((support, index) => (
              <li key={support.title}>
                <span className={styles.loopIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{support.title}</h3><p>{support.detail}</p></div>
              </li>
            ))}
          </ol>
          <p className={styles.introCopy}>ลงมือทำผ่านเป้าหมายรายสัปดาห์ อัปเดตกับทีมเล็กๆ และเอาสิ่งที่ติดมาคุยกับเพื่อนและพี่เมนเทอร์ใน Discord</p>
          <Link href={BOARD_PATH} className={styles.boardLink}>
            เปิดบอร์ดเป้าหมายและทีมของเรา <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className={styles.accessNote}>เข้าบอร์ดด้วยบัญชีที่ได้รับเชิญจากทีม PassionSeed</p>
        </section>
        <div id="calendar" className={styles.calendar}>
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
          href={BOARD_PATH}
          className="mt-14 flex items-center justify-center gap-2 text-base font-semibold underline underline-offset-4"
        >
          ศิษย์เก่า: เปิดการ์ดเป้าหมาย ทีม และฟีดความคืบหน้า
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <Link
          href="/shift"
          className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold underline underline-offset-4"
          style={{ color: "var(--mist)" }}
        >
          ยังไม่เคยลง SHIFT? ดูรอบที่เปิดรับสมัคร
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </main>
    </div>
  );
}
