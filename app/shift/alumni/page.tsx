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
    "AfterSHIFT คอมมูนิตี้ทำโปรเจกต์ต่อหลังจบ SHIFT ตั้งเป้าหมายของสัปดาห์ อัปเดตกับทีม และเจอเพื่อนกับพี่เมนเทอร์ใน Discord",
  alternates: { canonical: "/shift/alumni" },
  openGraph: {
    title: "AfterSHIFT | สร้างโปรเจกต์ต่อหลังจบ SHIFT",
    description: "AfterSHIFT: ตั้งเป้าหมายรายสัปดาห์ ทำโปรเจกต์ต่อกับทีม และเจอกันใน Discord",
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
              จบ 7 วันแล้ว
              <br />
              <span>ยังสร้างต่อด้วยกัน</span>
            </h1>
            <p className={space.lede}>
              เลือกเป้าหมายของสัปดาห์ ลงมือทำกับเพื่อน และเอาสิ่งที่ติดมาคุยกันใน Discord
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
          <h2 id="aftershift-heading" className={styles.sectionTitle}>ให้โปรเจกต์ไปต่อ<br />ทีละก้าว ทุกสัปดาห์</h2>
          <p className={styles.introCopy}>ทำโปรเจกต์เดิม เริ่มสิ่งใหม่ หรือช่วยของเพื่อน เลือกทางที่อยากทำต่อได้เอง</p>
          <ol className={styles.buildLoop}>
            <li><span className={styles.loopIndex}>01</span><div><h3>ตั้งเป้าหมายที่ทำได้จริง</h3><p>เลือกหนึ่งอย่างที่จะทำให้เสร็จสัปดาห์นี้ พร้อมก้าวแรกที่เริ่มได้ใน 10 นาที</p></div></li>
            <li><span className={styles.loopIndex}>02</span><div><h3>มีทีมให้กลับมาอัปเดต</h3><p>นัดเวลาทำงานกับทีมเล็กๆ แชร์ว่าทำอะไรแล้ว จะทำอะไรต่อ และติดตรงไหน</p></div></li>
            <li><span className={styles.loopIndex}>03</span><div><h3>เอาสิ่งที่ติดมาคุยกัน</h3><p>กลับมาเจอเพื่อนและพี่เมนเทอร์ในนัดประจำสัปดาห์ ลองของกัน แล้วเลือกก้าวต่อไป</p></div></li>
          </ol>
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
