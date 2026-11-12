"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { hideTeamNews } from "@/app/shift/island/news-actions";
import type { TeamNews } from "@/lib/supabase/shift-quests/playerTypes";

import { thaiShortDate } from "../copy";
import island from "../island.module.css";
import { NEWS } from "./copy";
import styles from "./news.module.css";

interface TeamCardProps {
  team: TeamNews;
  /** Today in Bangkok (YYYY-MM-DD, IslandNews.day), so each summary is labelled by the day it is for. */
  today?: string;
  /** Reviewers and admins: a control to hide this team's summary. The database checks again. */
  staff: boolean;
}

/**
 * One opted-in team's island news: the plot and team name, the AI summary of
 * the latest day (or "no update"), the weekly recap when there is one, and
 * the AI label. Only what the database stored for the team: never a member,
 * a profile or a contact.
 */
/** "ข่าววันนี้", or the date a stored day summary is for (yesterday's until the evening job runs). */
function dayHeading(day: string | null, today: string | undefined): string | null {
  if (!day) return null;
  return day === today ? NEWS.today : NEWS.dayLabel(thaiShortDate(day));
}

/** A recap ending today (a Bangkok Sunday) is this week's; any earlier one is last week's. */
function weekHeading(day: string | null, today: string | undefined): string {
  return day && today && day < today ? NEWS.lastWeek : NEWS.week;
}

export function TeamCard({ team, staff, today }: TeamCardProps) {
  const headingId = useId();
  const day = team.day && !team.day.noUpdate ? team.day.summary : null;
  const week = team.week && !team.week.noUpdate ? team.week.summary : null;
  const date = thaiShortDate(team.day?.at ?? team.week?.at ?? null);
  const dayTitle = day ? dayHeading(team.day?.day ?? null, today) : null;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.cardTitle}>
        {NEWS.plot(team.slot, team.name)}
      </h3>
      {day ? (
        <div className={styles.week}>
          {dayTitle ? <h4 className={styles.weekTitle}>{dayTitle}</h4> : null}
          <p className={styles.summary}>{day}</p>
        </div>
      ) : (
        <p className={styles.noUpdate}>{NEWS.noUpdate}</p>
      )}
      {week ? (
        <div className={styles.week}>
          <h4 className={styles.weekTitle}>{weekHeading(team.week?.day ?? null, today)}</h4>
          <p className={styles.summary}>{week}</p>
        </div>
      ) : null}
      <p className={styles.meta}>{date ? `${NEWS.aiShort} · ${NEWS.updated(date)}` : NEWS.aiShort}</p>
      {staff ? <HideControl slot={team.slot} describedBy={headingId} /> : null}
    </article>
  );
}

/** Staff only: hide with an optional reason. The page refreshes on success and the card leaves the feed. */
function HideControl({ slot, describedBy }: { slot: number; describedBy: string }) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className={styles.status} role="status">
        {NEWS.hidden}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className={`${island.quietButton} ${styles.staffButton}`} aria-describedby={describedBy} onClick={() => setOpen(true)}>
        {NEWS.hide}
      </button>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await hideTeamNews({ slot, hidden: true, reason: reason.trim() || null });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  };

  return (
    <form className={styles.hideForm} onSubmit={submit}>
      <label className={island.field} htmlFor={reasonId}>
        <span className={island.label}>{NEWS.hideReason}</span>
        <input
          id={reasonId}
          className={`ei-input ${island.input}`}
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          disabled={pending}
        />
      </label>
      {error ? (
        <p className={island.fieldError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.hideActions}>
        <button type="submit" className={island.quietButton} disabled={pending} aria-describedby={describedBy}>
          {pending ? NEWS.working : NEWS.hideConfirm}
        </button>
        <button type="button" className={island.linkButton} disabled={pending} onClick={() => setOpen(false)}>
          {NEWS.cancel}
        </button>
      </div>
    </form>
  );
}
