import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import { ShiftParentShare } from "@/components/shift/ShiftParentShare";
import {
  cohortPath,
  cohortStatus,
  formatThaiDate,
  priceLabel,
  type CohortStatus,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

import styles from "./shiftGallery.module.css";

const STATUS: Record<CohortStatus, string> = {
  open: "เปิดรับสมัคร",
  closed: "ปิดรับสมัครแล้ว",
  running: "กำลังลุยอยู่",
  done: "จบรุ่นแล้ว",
};

function RoundBanner({ cohort, featured }: { cohort: ShiftCohort; featured: boolean }) {
  if (!cohort.bannerSrc) return null;
  return (
    <ShiftAttributedLink href={cohortPath(cohort)} className={styles.artLink}>
      <Image
        src={cohort.bannerSrc}
        alt={`โปสเตอร์ ${cohort.name}, ดูรายละเอียดรุ่น`}
        width={1200}
        height={630}
        sizes={featured ? "(min-width: 1280px) 740px, (min-width: 900px) 60vw, 100vw" : "(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw"}
        priority={featured}
        className={styles.art}
      />
    </ShiftAttributedLink>
  );
}

function RoundFacts({ cohort }: { cohort: ShiftCohort }) {
  return (
    <dl className={styles.facts}>
      <div>
        <dt>วันที่จัด</dt>
        <dd>{formatThaiDate(cohort.startDate, false)} ถึง {formatThaiDate(cohort.endDate, false)}</dd>
      </div>
      <div>
        <dt>เวลาทุกเย็น</dt>
        <dd>{cohort.sessionTime} น.</dd>
      </div>
      <div>
        <dt>ราคา / คน</dt>
        <dd>{priceLabel(cohort)}</dd>
      </div>
      <div>
        <dt>รับทั้งหมด</dt>
        <dd>{cohort.seats} คน</dd>
      </div>
    </dl>
  );
}

/** Open rounds get a landscape feature; earlier rounds stay easy to browse. */
export function ShiftCohortCard({
  cohort,
  status = cohortStatus(cohort),
  featured = false,
}: {
  cohort: ShiftCohort;
  status?: CohortStatus;
  featured?: boolean;
}) {
  return (
    <article className={featured ? styles.featuredRound : styles.archiveRound} data-shift-reveal>
      <RoundBanner cohort={cohort} featured={featured} />
      <div className={styles.roundInfo}>
        <div className={styles.roundHeader}>
          <h3 className="font-kodchasan">{cohort.name}</h3>
          <span className={styles.status} data-status={status}>
            <span aria-hidden="true" />{STATUS[status]}
          </span>
        </div>

        {featured ? (
          <>
            <p className={styles.roundDescription}>จากไอเดียของเรา สู่ของที่คนใช้จริง<br />มีเพื่อนและรุ่นพี่ช่วยตลอด 7 วัน</p>
            <RoundFacts cohort={cohort} />
            {status === "open" && (
              <div className={styles.availability}>
                <p>สมัครภายใน {formatThaiDate(cohort.applyDeadline, false)}</p>
                <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
              </div>
            )}
          </>
        ) : (
          <p className={styles.archiveSummary}>
            {formatThaiDate(cohort.startDate, false)} ถึง {formatThaiDate(cohort.endDate, false)}
            {cohort.showcase?.length ? ` · ${cohort.showcase.length} โปรเจกต์ที่ปล่อยจริง` : ` · ${cohort.seats} คน`}
          </p>
        )}

        <div className={styles.roundActions}>
          {status === "open" && (
            <ShiftApplyButton href={cohort.applyUrl} location={`gallery_${cohort.round}`} className={styles.apply}>
              สมัครรุ่นนี้
            </ShiftApplyButton>
          )}
          <ShiftAttributedLink href={cohortPath(cohort)} className={styles.details}>
            {status === "done" && cohort.showcase?.length ? "ดูผลงานของรุ่นนี้" : "ดูรายละเอียด"}
            <ArrowUpRight size={18} aria-hidden="true" />
          </ShiftAttributedLink>
        </div>
        {status === "open" && <div className={styles.parentShare}><ShiftParentShare cohort={cohort} /></div>}
      </div>
    </article>
  );
}
