import type { LessonWatchReason } from "@/lib/elemental/web/learn-actions";

import { LEARN_COPY, WATCH_REASON_COPY } from "./copy";
import styles from "./learn.module.css";
import { LessonDiscordButton } from "./LessonDiscordButton";

/**
 * Whether the viewer's answers are saved. Watching: the reason, and a Discord
 * sign-in when signing in would help. Nothing here names the viewer.
 */
export function ViewerBanner({ mode, reason }: { mode: "save" | "watch"; reason: LessonWatchReason | null }) {
  if (mode === "save") {
    return (
      <p className={styles.modeSave} data-testid="viewer-mode" data-mode="save">
        {LEARN_COPY.saveMode}
      </p>
    );
  }
  const why = reason ?? "signed_out";
  return (
    <section className={styles.banner} data-testid="viewer-mode" data-mode="watch" aria-label={LEARN_COPY.watchOnly}>
      <p className={styles.bannerLabel}>{LEARN_COPY.watchOnly}</p>
      <p className={styles.bannerText}>{WATCH_REASON_COPY[why]}</p>
      {why === "signed_out" || why === "no_discord" ? <LessonDiscordButton switchAccount={why === "no_discord"} /> : null}
    </section>
  );
}
