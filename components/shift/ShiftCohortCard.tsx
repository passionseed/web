import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import { ShiftSeatsRemaining } from "@/components/shift/ShiftSeatsRemaining";
import { ShiftParentShare } from "@/components/shift/ShiftParentShare";
import { HAIR, INK, paper } from "@/components/shift/ShiftRiso";
import {
  cohortPath,
  cohortStatus,
  type CohortStatus,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

/**
 * One round in the /shift gallery. The banner already carries every fact
 * (dates, price, seats, deadline, shipped work), so the card adds only what
 * a picture cannot: live status and somewhere to click.
 */

const STATUS: Record<CohortStatus, { label: string; ink: string }> = {
  open: { label: "เปิดรับสมัคร", ink: INK.orange },
  closed: { label: "ปิดรับสมัครแล้ว", ink: INK.pink },
  running: { label: "กำลังลุยอยู่", ink: INK.blue },
  done: { label: "จบรุ่นแล้ว", ink: paper("73") },
};

function StatusChip({ status }: { status: CohortStatus }) {
  const { label, ink } = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ color: INK.paper, boxShadow: `inset 0 0 0 1.5px ${ink}` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ink }} />
      {label}
    </span>
  );
}

function Banner({ cohort }: { cohort: ShiftCohort }) {
  if (!cohort.bannerSrc) return null;
  return (
    <ShiftAttributedLink href={cohortPath(cohort)} className="block overflow-hidden">
      <Image
        src={cohort.bannerSrc}
        alt={`โปสเตอร์ ${cohort.name}`}
        width={1200}
        height={630}
        sizes="(min-width: 768px) 480px, 100vw"
        className="h-auto w-full transition-transform duration-300 hover:scale-[1.02]"
      />
    </ShiftAttributedLink>
  );
}

export function ShiftCohortCard({ cohort }: { cohort: ShiftCohort }) {
  const status = cohortStatus(cohort);

  return (
    <article
      className={`flex flex-col overflow-hidden border ${HAIR}`}
      style={{ backgroundColor: "rgba(242,234,217,0.03)" }}
    >
      <Banner cohort={cohort} />
      {status === "open" && (
        <div className="px-5 pt-4">
          <ShiftSeatsRemaining round={cohort.round} capacity={cohort.seats} />
          <ShiftParentShare cohort={cohort} />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <StatusChip status={status} />
        <div className="flex items-center gap-5">
          <ShiftAttributedLink
            href={cohortPath(cohort)}
            className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            ดูรายละเอียด
            <ArrowRight className="h-4 w-4" />
          </ShiftAttributedLink>
          {status === "open" && (
            <ShiftApplyButton
              href={cohort.applyUrl}
              location={`gallery_${cohort.round}`}
              className="!px-5 !py-2.5 !text-sm"
            >
              สมัครเลย
            </ShiftApplyButton>
          )}
        </div>
      </div>
    </article>
  );
}
