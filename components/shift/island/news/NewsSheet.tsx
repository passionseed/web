"use client";

import { useId, useState, useTransition } from "react";

import { hideTeamNews } from "@/app/shift/island/news-actions";
import type { IslandNews } from "@/lib/supabase/shift-quests/playerTypes";

import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { NEWS } from "./copy";
import styles from "./news.module.css";
import { TeamCard } from "./TeamCard";

interface NewsSheetProps {
  open: boolean;
  onClose: () => void;
  news: IslandNews;
  /** Reviewers and admins: hide and show controls. The database checks again. */
  staff: boolean;
}

/**
 * ข่าวเกาะ: the stored AI summaries of every team that chose to show its name
 * on the island (and has consent for it), one card per team by plot. The AI
 * label is always visible. Staff can hide a team and see the hidden list.
 * Nothing is generated when the sheet opens: the daily job wrote these.
 */
/** A team has something to read: a day summary or a week recap. */
function hasNews(team: IslandNews["teams"][number]): boolean {
  return Boolean((team.day && !team.day.noUpdate && team.day.summary) || (team.week && !team.week.noUpdate && team.week.summary));
}

export function NewsSheet({ open, onClose, news, staff }: NewsSheetProps) {
  const hidden = staff ? (news.hidden ?? []) : [];
  // Teams with news first, as cards; teams with nothing new fold into one line
  // (staff still get their cards, to hide a team).
  const withNews = news.teams.filter(hasNews);
  const quiet = news.teams.filter((team) => !hasNews(team));
  const cards = staff ? [...withNews, ...quiet] : withNews;
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={NEWS.title}
      description={NEWS.aiLabel}
    >
      <div className={styles.stack}>
        <p className={island.hint}>{NEWS.optInNote}</p>
        {cards.length > 0 ? (
          <ul className={styles.list} aria-label={NEWS.listLabel}>
            {cards.map((team) => (
              <li key={team.slot}>
                <TeamCard team={team} staff={staff} today={news.day} />
              </li>
            ))}
          </ul>
        ) : news.teams.length === 0 ? (
          <p className={island.quiet}>{NEWS.empty}</p>
        ) : null}
        {!staff && quiet.length > 0 ? (
          <p className={island.quiet}>{NEWS.quiet(quiet.map((team) => NEWS.quietPlot(team.slot)).join(", "))}</p>
        ) : null}
        {hidden.length > 0 ? <HiddenTeams teams={hidden} /> : null}
      </div>
    </IslandSheet>
  );
}

function HiddenTeams({ teams }: { teams: { slot: number; name: string }[] }) {
  const headingId = useId();
  return (
    <section className={styles.hiddenSection} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.cardTitle}>
        {NEWS.hiddenHeading}
      </h3>
      <p className={island.hint}>{NEWS.hiddenNote}</p>
      <ul className={styles.hiddenList}>
        {teams.map((team) => (
          <li key={team.slot}>
            <HiddenTeam slot={team.slot} name={team.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HiddenTeam({ slot, name }: { slot: number; name: string }) {
  const labelId = useId();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const show = () => {
    setError(null);
    startTransition(async () => {
      const result = await hideTeamNews({ slot, hidden: false });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  };

  return (
    <div className={styles.hiddenRow}>
      <span id={labelId} className={styles.hiddenName}>
        {NEWS.plot(slot, name)}
      </span>
      {done ? (
        <span className={styles.status} role="status">
          {NEWS.shown}
        </span>
      ) : (
        <button type="button" className={island.quietButton} disabled={pending} aria-describedby={labelId} onClick={show}>
          {pending ? NEWS.working : NEWS.show}
        </button>
      )}
      {error ? (
        <p className={island.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
