import type { ReactNode } from "react";

import { FLOW_TEXT, flowPanelClass, paper } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { ParentStep } from "@/components/shift/seedstack/SeedstackConnect";
import { LinkStep } from "@/components/shift/seedstack/SeedstackLinkStep";
import { Disclosure } from "@/components/shift/seedstack/SeedstackNotice";
import {
  EVENT_LABELS,
  SEEDSTACK_DASHBOARD as COPY,
  STATUS_LABELS,
  STEP_LABELS,
} from "@/lib/content/seedstack-dashboard";
import type { SeedstackConsentState } from "@/lib/seedstack/consent";
import {
  eventTime,
  formatThaiWhen,
  summarizeSeedstackProgress,
  type SeedstackEventRow,
  type SeedstackStepSummary,
} from "@/lib/seedstack/dashboard";
import type { SeedstackDashboard as DashboardData } from "@/lib/seedstack/server";

/**
 * The student's home once a computer is linked: is it working, where am I,
 * and exactly what the mentors can see. Server-rendered from the same rows
 * the mentor board reads.
 */

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-kodchasan text-lg font-bold" style={{ color: FLOW_TEXT.strong }}>
      {children}
    </h2>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
      {children}
    </p>
  );
}

function sendingLine(state: SeedstackConsentState): { text: string; ok: boolean } {
  if (state === "awaiting_parent") return { text: COPY.status.awaitingParent, ok: false };
  if (state === "parent_declined") return { text: COPY.status.parentDeclined, ok: false };
  return { text: COPY.status.sending, ok: true };
}

function StatusCard({ state, data, now }: { state: SeedstackConsentState; data: DashboardData; now: number }) {
  const sending = sendingLine(state);
  return (
    <section className={`${flowPanelClass} space-y-3 p-4`} aria-label={COPY.status.title}>
      <p className="font-kodchasan text-[17px] font-bold" style={{ color: FLOW_TEXT.strong }}>
        💻 {COPY.status.devices(data.devices)}
      </p>
      {data.lastSeenAt ? (
        <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
          {COPY.status.lastSeen} {formatThaiWhen(data.lastSeenAt, now)}
        </p>
      ) : (
        sending.ok && (
          <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
            {COPY.status.neverSynced}
          </p>
        )
      )}
      <p className="text-[15px] font-semibold leading-relaxed" style={{ color: sending.ok ? FLOW_TEXT.sky : FLOW_TEXT.warn }}>
        {sending.ok ? "👀" : "⏸️"} {sending.text}
      </p>
    </section>
  );
}

function StatusChip({ summary }: { summary: SeedstackStepSummary }) {
  const status = STATUS_LABELS[summary.status];
  const color = summary.status === "stuck" ? INK.orange : summary.status === "done" ? INK.yellow : paper("c2");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold"
      style={{ color, boxShadow: `inset 0 0 0 1.5px ${color}` }}
    >
      <span aria-hidden="true">{status.emoji}</span>
      {status.label}
    </span>
  );
}

function ProgressRow({ summary, now }: { summary: SeedstackStepSummary; now: number }) {
  const step = STEP_LABELS[summary.step];
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="font-kodchasan text-[16px] font-bold" style={{ color: FLOW_TEXT.strong }}>
          <span aria-hidden="true">{step.emoji}</span> {step.label}
        </p>
        <StatusChip summary={summary} />
      </div>
      {summary.next && summary.status !== "done" && (
        <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
          {COPY.progress.next}: {summary.next}
        </p>
      )}
      {summary.lastAt && <Muted>{formatThaiWhen(summary.lastAt, now)}</Muted>}
    </li>
  );
}

function ProgressBoard({ events, held, now }: { events: readonly SeedstackEventRow[]; held: boolean; now: number }) {
  const progress = summarizeSeedstackProgress(events);
  return (
    <section className="space-y-3">
      <SectionTitle>{COPY.progress.title}</SectionTitle>
      {held && <Muted>{COPY.progress.held}</Muted>}
      <ul className={`${flowPanelClass} divide-y divide-[rgba(242,234,217,0.16)] p-4`}>
        {progress.steps.map((summary) => (
          <ProgressRow key={summary.step} summary={summary} now={now} />
        ))}
      </ul>
      {progress.liveUrl && (
        <p className="text-[15px]" style={{ color: FLOW_TEXT.body }}>
          🌐 {COPY.progress.live}:{" "}
          <a
            href={progress.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all font-semibold underline underline-offset-4"
            style={{ color: FLOW_TEXT.link }}
          >
            {progress.liveUrl}
          </a>
        </p>
      )}
    </section>
  );
}

/** One stored event, every field as stored, nothing added. */
function TimelineItem({ event, now }: { event: SeedstackEventRow; now: number }) {
  const step = STEP_LABELS[event.step];
  return (
    <li className="space-y-1 py-3 first:pt-0 last:pb-0 text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
      <p>
        <strong className="font-kodchasan" style={{ color: FLOW_TEXT.strong }}>
          {step.emoji} {step.label} · {EVENT_LABELS[event.event]}
        </strong>
        {event.minutes !== null && <> · {COPY.timeline.minutes(event.minutes)}</>}
      </p>
      {event.detail && <p>“{event.detail}”</p>}
      {event.next && (
        <p>
          {COPY.timeline.next}: {event.next}
        </p>
      )}
      {event.live_url && <p className="break-all">🌐 {event.live_url}</p>}
      <Muted>{formatThaiWhen(eventTime(event), now)}</Muted>
    </li>
  );
}

function Timeline({ events, now }: { events: readonly SeedstackEventRow[]; now: number }) {
  return (
    <section className="space-y-3">
      <SectionTitle>{COPY.timeline.title}</SectionTitle>
      <Muted>{COPY.timeline.intro}</Muted>
      {events.length ? (
        <ul className={`${flowPanelClass} divide-y divide-[rgba(242,234,217,0.16)] p-4`}>
          {events.map((event, i) => (
            <TimelineItem key={`${event.created_at}-${i}`} event={event} now={now} />
          ))}
        </ul>
      ) : (
        <div className={`${flowPanelClass} p-4`}>
          <p className="text-[15px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
            {COPY.timeline.empty}
          </p>
        </div>
      )}
    </section>
  );
}

export function SeedstackDashboard({
  state,
  data,
  now,
}: {
  state: SeedstackConsentState;
  data: DashboardData;
  now: number;
}) {
  const parentPending = state === "awaiting_parent" || state === "parent_declined";
  return (
    <>
      <StatusCard state={state} data={data} now={now} />
      {parentPending && <ParentStep link={null} declined={state === "parent_declined"} />}
      <ProgressBoard events={data.events} held={parentPending} now={now} />
      <Timeline events={data.events} now={now} />
      <section className={`${flowPanelClass} px-4 text-[15px]`}>
        <Disclosure label={COPY.otherDevice}>
          <div className="pb-4">
            <LinkStep devices={data.devices} />
          </div>
        </Disclosure>
      </section>
    </>
  );
}
