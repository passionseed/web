"use client";

import { useId, useState } from "react";
import type { AdminIslandOverview, AdminIslandProject } from "@/lib/supabase/shift-quests/adminTypes";
import { AwaySection, type AwayAdmin } from "./away/AwayAdmin";
import { ADMIN_OVERVIEW } from "./copy";
import { IslandSheet } from "./IslandSheet";
import styles from "./island.module.css";
import world from "./world.module.css";
import admin from "./admin.module.css";

export function AdminProjectDetails({ project }: { project: AdminIslandProject }) {
  return (
    <div className={admin.details}>
      <p><strong>{ADMIN_OVERVIEW.members}</strong> {project.members.join(", ") || ADMIN_OVERVIEW.noMembers}</p>
      {project.ambition ? <p>{project.ambition}</p> : null}
      <dl className={admin.metrics}>
        <div><dt>{ADMIN_OVERVIEW.milestones}</dt><dd>{ADMIN_OVERVIEW.milestonesOf(project.milestones.length)}</dd></div>
        <div><dt>{ADMIN_OVERVIEW.waitingReview}</dt><dd>{project.waitingReview}</dd></div>
        <div><dt>{ADMIN_OVERVIEW.openHelp}</dt><dd>{project.openHelp}</dd></div>
        <div><dt>{ADMIN_OVERVIEW.checkinsWeek}</dt><dd>{project.checkinsWeek}</dd></div>
      </dl>
      <p className={styles.hint}>{ADMIN_OVERVIEW.updated} <time dateTime={project.lastActivity}>{new Date(project.lastActivity).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</time></p>
    </div>
  );
}

export function AdminOverview({
  open,
  onClose,
  data,
  away = null,
}: {
  open: boolean;
  onClose: () => void;
  data: AdminIslandOverview | null;
  /**
   * The come-back section (schema 23): the page's away state and the admin
   * actions that read the report, passed in by the page so this sheet stays
   * free of server imports. Null before the migration: no section.
   */
  away?: AwayAdmin | null;
}) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const projects = data?.projects.filter((p) => [p.name, String(p.slot), ...p.members].some((s) => s.toLocaleLowerCase().includes(needle))) ?? [];
  return (
    <IslandSheet open={open} onOpenChange={(value) => { if (!value) onClose(); }} title={ADMIN_OVERVIEW.title}>
      <div className={world.sheetStack}>
        <p className={styles.hint}>{ADMIN_OVERVIEW.intro}</p>
        {data ? <>
          <p>{ADMIN_OVERVIEW.summary(data.projects.length, data.projects.reduce((n, p) => n + p.waitingReview, 0), data.projects.reduce((n, p) => n + p.openHelp, 0))}</p>
          <label htmlFor={inputId}>{ADMIN_OVERVIEW.search}</label>
          <input id={inputId} className={styles.input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className={admin.projects}>
            {projects.map((p) => <section className={admin.project} key={p.slot}>
              <h3 className={styles.detailHeading}>{ADMIN_OVERVIEW.plot(p.slot, p.name)}</h3>
              <p className={styles.hint}>{p.route}</p>
              <AdminProjectDetails project={p} />
            </section>)}
          </div>
          {projects.length === 0 ? <p className={styles.quiet}>{needle ? ADMIN_OVERVIEW.noMatch : ADMIN_OVERVIEW.empty}</p> : null}
        </> : <p role="status">{ADMIN_OVERVIEW.failed}</p>}
        {away ? <AwaySection open={open} away={away} /> : null}
      </div>
    </IslandSheet>
  );
}
