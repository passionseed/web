"use client";

import { useId, useState, useTransition } from "react";

import { resetMyIsland } from "@/app/shift/island/admin-actions";

import styles from "./adminReset.module.css";
import { ADMIN_RESET } from "./copy";
import island from "./island.module.css";
import { STORY_SEEN_KEY } from "./story/useStorySeen";
import { DAY_INTENTION_KEY } from "./useDayIntention";
import world from "./world.module.css";

/** Forgets what this browser remembers about the island, so the story and planting play again. */
export function clearIslandKeys(storage: Pick<Storage, "removeItem"> = window.localStorage): void {
  try {
    storage.removeItem(STORY_SEEN_KEY);
    storage.removeItem(DAY_INTENTION_KEY);
  } catch {
    // Storage that throws (private mode) holds nothing to clear.
  }
}

/**
 * Menu section for admins only: reset my own island progress, for testing.
 * One tap opens a confirm step that lists what goes; confirming calls the
 * server action (the database checks the admin role again), then clears this
 * browser's island keys and reloads, so onboarding starts over.
 */
export function AdminReset({ reload = () => window.location.reload() }: { reload?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const hintId = useId();
  const titleId = useId();

  const reset = () => {
    setError(null);
    startTransition(async () => {
      const result = await resetMyIsland();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      clearIslandKeys();
      reload();
    });
  };

  return (
    <section className={world.menuList} aria-label={ADMIN_RESET.heading}>
      <h3 className={island.detailHeading}>{ADMIN_RESET.heading}</h3>
      {confirming ? (
        <div className={styles.panel} role="group" aria-labelledby={titleId}>
          <p id={titleId} className={island.quiet}>
            {ADMIN_RESET.confirmTitle}
          </p>
          <ul className={styles.list}>
            {ADMIN_RESET.removes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={island.hint}>{ADMIN_RESET.keeps}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${island.quietButton} ${styles.confirm}`}
              onClick={reset}
              disabled={pending || done}
            >
              {pending || done ? ADMIN_RESET.pending : ADMIN_RESET.confirm}
            </button>
            <button
              type="button"
              className={island.quietButton}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={pending || done}
            >
              {ADMIN_RESET.cancel}
            </button>
          </div>
          {error ? (
            <p className={island.fieldError} role="alert">
              {error}
            </p>
          ) : null}
          {done ? (
            <p className={island.hint} role="status">
              {ADMIN_RESET.done}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            className={island.quietButton}
            aria-describedby={hintId}
            onClick={() => setConfirming(true)}
          >
            {ADMIN_RESET.open}
          </button>
          <p id={hintId} className={island.hint}>
            {ADMIN_RESET.hint}
          </p>
        </>
      )}
    </section>
  );
}
