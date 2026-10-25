import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";

import { FeedbackMotion } from "@/components/shift/feedback/FeedbackMotion";
import { ShiftFeedbackForm } from "@/components/shift/feedback/ShiftFeedbackForm";
import styles from "@/components/shift/feedback/feedback.module.css";
import { ShiftTopBar } from "@/components/shift/ShiftTopBar";
import { ShiftNextCosmos, ShiftNextHero } from "@/components/shift/next/ShiftNextHero";
import { ShiftNextLight } from "@/components/shift/next/ShiftNextLight";
import space from "@/components/shift/next/shiftNext.module.css";
import {
  SHIFT_COHORTS,
  cohortStatus,
  getShiftCohort,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import { FEEDBACK_QUESTION_COUNT, alumniSessionHint, alumniSessionWhen } from "@/lib/shift/feedback";

export const metadata: Metadata = {
  title: "SHIFT feedback",
  description: "แบบสอบถามหลังจบ SHIFT ใช้เวลาประมาณ 5 นาที",
  // Sent to each round's group only; not a page for search results.
  robots: { index: false, follow: false },
};

/** `?round=1` picks the round; otherwise the round that most recently ended
 *  (or is running, for a day-7 session that has not closed yet). */
function feedbackCohort(round?: string): ShiftCohort {
  const requested = round ? getShiftCohort(Number(round)) : undefined;
  if (requested) return requested;
  const started = SHIFT_COHORTS.filter((c) => {
    const status = cohortStatus(c);
    return status === "done" || status === "running";
  });
  return started.at(-1) ?? SHIFT_COHORTS[0];
}

/** /shift/feedback: end-of-round feedback under the shared SHIFT globe. */
export default async function ShiftFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const cohort = feedbackCohort((await searchParams).round);

  return (
    <div className={`${space.page} font-bai-jamjuree antialiased`} lang="th">
      <ShiftNextCosmos />
      <ShiftNextLight />
      <FeedbackMotion />

      <ShiftNextHero>
        <ShiftTopBar />
        <div className={`${space.container} ${space.heroInner}`}>
          <div className={`${space.heroCopy} ${styles.heroCalm}`}>
            <p className={space.missionTag}>
              <span className={space.liveDot} aria-hidden="true" />
              Mission complete · Round {String(cohort.round).padStart(2, "0")}
            </p>
            <div className={space.wordmark} aria-hidden="true">
              <span className={space.wordmarkText}>SHIFT</span>
              <span className={space.lens}>
                <span>{cohort.round}</span>
              </span>
            </div>
            <h1 className={space.headline}>
              <span className="sr-only">{cohort.name} feedback: </span>
              จบ 7 วันแล้ว
              <br />
              <span>เล่าให้พี่ฟังหน่อย ว่าเป็นยังไง</span>
            </h1>
            <p className={space.lede}>
              ตอบตามจริงได้เลย คำตอบนี้พี่ใช้ปรับ SHIFT รอบหน้า ไม่มีผลกับอะไรของเราทั้งนั้น
            </p>
            <div className={space.ctaRow}>
              <a href="#feedback" className={space.cta} style={{ ["--nudge" as string]: "0 2px" }}>
                <span>เริ่มตอบ</span>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <dl className={`${space.glass} ${space.hud} ${styles.hudCalm}`} data-glass>
            <div>
              <dt>Questions</dt>
              <dd>{FEEDBACK_QUESTION_COUNT} ข้อ</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>ประมาณ 5 นาที</dd>
            </div>
            <div>
              <dt>Login</dt>
              <dd>ไม่ต้อง</dd>
            </div>
          </dl>
        </div>
      </ShiftNextHero>

      <main id="feedback" className={styles.content}>
        <div className={`${space.glass} ${styles.panel}`} data-glass data-feedback-panel>
          <span className={styles.sheen} aria-hidden="true" />
          <ShiftFeedbackForm cohort={cohort} sessionHint={alumniSessionHint()} sessionWhen={alumniSessionWhen()} />
        </div>
      </main>
    </div>
  );
}
