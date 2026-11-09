import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AdminShiftSnapshot } from "@/lib/admin/console";

import { formatNumber, percentOf } from "./format";
import {
  applicationsHref,
  shiftCountdown,
  shiftFunnel,
  SHIFT_STATUS_LABEL,
  type FunnelStep,
} from "./shift";

/**
 * The SHIFT round at a glance: status, countdown, seats, the application
 * funnel (each step opens the filtered list), and the live round.
 * Server-renderable; `today` is the Bangkok YYYY-MM-DD key.
 */
export function ShiftPanel({
  snapshot,
  today,
}: {
  snapshot: AdminShiftSnapshot | null;
  today: string;
}) {
  if (!snapshot) {
    return (
      <div className="overview-shift">
        <p className="overview-quiet">SHIFT numbers could not load right now.</p>
        <Link href="/admin/shift/applications" className="admin-quiet-link">
          Open applications <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const { cohort, funnel, liveRound } = snapshot;
  const countdown = shiftCountdown(cohort, today);
  const model = shiftFunnel(snapshot);

  return (
    <div className="overview-shift">
      <div className="overview-shift-head">
        <h3>{cohort.name}</h3>
        <span className="overview-chip" data-status={cohort.status}>
          {SHIFT_STATUS_LABEL[cohort.status]}
        </span>
      </div>

      {countdown && (
        <p className="overview-countdown">
          <span className="overview-countdown-value">{countdown.value}</span>
          <span className="overview-countdown-caption">{countdown.caption}</span>
        </p>
      )}

      <SeatsMeter paid={funnel?.paid ?? null} seats={cohort.seats} />

      {model ? (
        <>
          <h4 className="overview-shift-subhead">Applications</h4>
          <ol className="overview-funnel">
            {model.steps.map((step) => (
              <li key={step.key}>
                <FunnelStepLink step={step} />
              </li>
            ))}
          </ol>
          <ul className="overview-funnel-secondary" aria-label="Waiting on a decision">
            {model.secondary.map((step) => (
              <li key={step.key}>
                <Link href={step.href} className="overview-funnel-chip">
                  {step.label}
                  <span className="overview-funnel-chip-count">{formatNumber(step.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="overview-quiet">Applications could not load.</p>
      )}

      <LiveRound round={liveRound} />

      <Link href={applicationsHref(cohort.name)} className="admin-quiet-link overview-shift-more">
        All {cohort.name} applications <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

function SeatsMeter({ paid, seats }: { paid: number | null; seats: number }) {
  if (paid === null || seats <= 0) return null;
  const left = Math.max(0, seats - paid);
  return (
    <div className="overview-seats">
      <p>
        <span className="overview-seats-value">
          {formatNumber(paid)}/{formatNumber(seats)}
        </span>{" "}
        seats paid
        <span className="overview-seats-left">
          {left === 0 ? "Full" : `${formatNumber(left)} left`}
        </span>
      </p>
      <span className="overview-meter" aria-hidden="true">
        <span style={{ width: `${percentOf(paid, seats)}%` }} />
      </span>
    </div>
  );
}

function FunnelStepLink({ step }: { step: FunnelStep }) {
  return (
    <Link href={step.href} className="overview-funnel-step">
      <span className="overview-funnel-label">{step.label}</span>
      <span className="overview-funnel-count">{formatNumber(step.count)}</span>
      <span className="overview-funnel-bar" aria-hidden="true">
        <span style={{ width: `${step.share}%` }} />
      </span>
      {step.key !== "applied" && (
        <span className="overview-funnel-share">{Math.round(step.share)}% of applied</span>
      )}
    </Link>
  );
}

function LiveRound({ round }: { round: AdminShiftSnapshot["liveRound"] }) {
  if (!round) {
    return <p className="overview-quiet overview-round-none">No round is running right now.</p>;
  }
  return (
    <Link href={round.href} className="overview-round">
      <span className="overview-round-head">
        <span>
          <span className="overview-round-eyebrow">Live round</span>
          <span className="overview-round-title">{round.title}</span>
        </span>
        <ArrowRight size={17} className="admin-work-arrow" aria-hidden="true" />
      </span>
      <dl className="overview-round-stats">
        <div>
          <dt>Entrants</dt>
          <dd>{formatNumber(round.entrants)}</dd>
        </div>
        <div data-attention={round.pendingReview > 0 || undefined}>
          <dt>To review</dt>
          <dd>{formatNumber(round.pendingReview)}</dd>
        </div>
        <div>
          <dt>Certificates</dt>
          <dd>{formatNumber(round.certificatesIssued)}</dd>
        </div>
      </dl>
    </Link>
  );
}
