"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import type { AwayCount, AwayLine, AwayReport, AwayState } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { ADMIN_OVERVIEW, AWAY, thaiShortDate } from "../copy";
import island from "../island.module.css";
import styles from "./away.module.css";

/**
 * What the admin overview needs for the come-back section: the page's away
 * state, and the admin-only actions (app/shift/island/admin-actions.ts
 * loadAwayReport and revealAwayAnswer), passed in by the page so the sheet
 * imports no server code. The database refuses everyone but an admin.
 */
export interface AwayAdmin {
  state: AwayState;
  load: () => Promise<IslandActionResult<AwayReport | null>>;
  reveal: (id: string) => Promise<IslandActionResult<{ name: string }>>;
}

type ReportState = { status: "loading" } | { status: "failed" } | { status: "ready"; report: AwayReport };

/** The report, read each time the overview opens (never with the page). A newer read drops an older answer. */
function useAwayReport(open: boolean, load: AwayAdmin["load"]): ReportState {
  const [state, setState] = useState<ReportState>({ status: "loading" });
  const round = useRef(0);
  const reload = useCallback(() => {
    const mine = ++round.current;
    load().then(
      (result) => {
        if (mine !== round.current) return;
        setState(result.ok && result.data ? { status: "ready", report: result.data } : { status: "failed" });
      },
      () => {
        if (mine === round.current) setState({ status: "failed" });
      },
    );
  }, [load]);
  useEffect(() => {
    if (open) reload();
  }, [open, reload]);
  useEffect(
    () => () => {
      round.current++;
    },
    [],
  );
  return state;
}

function Counts({ rows }: { rows: readonly (readonly [string, AwayCount])[] }) {
  return (
    <dl className={styles.adminCounts}>
      {rows.map(([label, count]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  );
}

type RevealStep = "idle" | "confirm" | "pending" | { name: string } | { error: string };

/** One nameless line; who wrote it only behind a confirm, audited by the database, for a safeguarding concern. */
function LineItem({ line, reveal }: { line: AwayLine; reveal: AwayAdmin["reveal"] }) {
  const [step, setStep] = useState<RevealStep>("idle");
  const t = AWAY.admin;
  function confirm() {
    setStep("pending");
    reveal(line.id).then(
      (result) => setStep(result.ok ? { name: result.data.name } : { error: result.error }),
      () => setStep({ error: ADMIN_OVERVIEW.failed }),
    );
  }
  return (
    <li className={styles.adminLine}>
      <p className={island.hint}>{line.reason ? AWAY.card.reasons[line.reason] : t.noReason}</p>
      <p>{line.line}</p>
      {step === "idle" ? (
        <button type="button" className={island.linkButton} onClick={() => setStep("confirm")}>
          {t.reveal}
        </button>
      ) : step === "confirm" || step === "pending" ? (
        <div className={styles.adminConfirm}>
          <p className={island.hint}>{t.revealWhy}</p>
          <button type="button" className={island.quietButton} disabled={step === "pending"} onClick={confirm}>
            {t.revealConfirm}
          </button>
          <button type="button" className={island.linkButton} disabled={step === "pending"} onClick={() => setStep("idle")}>
            {t.revealCancel}
          </button>
        </div>
      ) : "name" in step ? (
        <p role="status">{t.revealed(step.name)}</p>
      ) : (
        <p role="alert">{step.error}</p>
      )}
    </li>
  );
}

/** The lines by their Monday week, in the report's order (newest week first). */
function byWeek(lines: readonly AwayLine[]): [string, AwayLine[]][] {
  const weeks = new Map<string, AwayLine[]>();
  for (const line of lines) weeks.set(line.week, [...(weeks.get(line.week) ?? []), line]);
  return [...weeks.entries()];
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className={styles.adminGroup}>
      <h4 className={island.label}>{heading}</h4>
      {children}
    </div>
  );
}

function ReportView({ report, reveal }: { report: AwayReport; reveal: AwayAdmin["reveal"] }) {
  const t = AWAY.admin;
  const weeks = byWeek(report.lines);
  const reasons = Object.entries(report.answers.byReason).map(
    ([reason, count]) => [AWAY.card.reasons[reason as keyof typeof AWAY.card.reasons], count] as const,
  );
  return (
    <>
      <Group heading={t.consent}>
        <Counts rows={[[t.consentYes, report.consent.yes], [t.consentNo, report.consent.no], [t.consentUnasked, report.consent.unasked]]} />
      </Group>
      <Group heading={t.awayNow}>
        <Counts rows={[[t.resting, report.awayNow.resting], [t.waiting, report.awayNow.waiting], [t.other, report.awayNow.other]]} />
      </Group>
      <Group heading={t.dms}>
        <Counts
          rows={[[t.queued, report.dms.queued], [t.sent, report.dms.sent], [t.unreachable, report.dms.unreachable], [t.dropped, report.dms.dropped]]}
        />
      </Group>
      <Group heading={t.answers}>
        <Counts rows={[...reasons, [t.skipped, report.answers.skipped], [t.cameByDm, report.answers.cameByDm]]} />
      </Group>
      <Group heading={t.lines}>
        {weeks.length === 0 ? <p className={island.quiet}>{t.noLines}</p> : null}
        {weeks.map(([week, lines]) => (
          <section key={week} className={styles.adminGroup} aria-label={t.week(thaiShortDate(week))}>
            <p className={island.hint}>{t.week(thaiShortDate(week))}</p>
            <ul className={styles.adminWeek}>
              {lines.map((line) => (
                <LineItem key={line.id} line={line} reveal={reveal} />
              ))}
            </ul>
          </section>
        ))}
      </Group>
    </>
  );
}

/**
 * The come-back section of the admin overview (schema 23): consent, who is
 * away now, the DMs and the return answers as counts ("1-2" for one or two),
 * and the lines of the last 90 days without names, by week. Never a name, a
 * plot or an exact date; a name only through the audited reveal. Mentors
 * never see this: the overview is the admin's alone.
 */
export function AwaySection({ open, away }: { open: boolean; away: AwayAdmin }) {
  const report = useAwayReport(open, away.load);
  const headingId = useId();
  const t = AWAY.admin;
  return (
    <section className={styles.adminGroup} aria-labelledby={headingId}>
      <h3 id={headingId} className={island.detailHeading}>
        {t.heading}
      </h3>
      <p className={island.hint}>{t.intro}</p>
      {away.state.enabled ? null : <p className={island.hint}>{t.off}</p>}
      {report.status === "loading" ? (
        <p className={island.quiet} role="status">
          {t.loading}
        </p>
      ) : null}
      {report.status === "failed" ? <p role="status">{t.failed}</p> : null}
      {report.status === "ready" ? <ReportView report={report.report} reveal={away.reveal} /> : null}
    </section>
  );
}
