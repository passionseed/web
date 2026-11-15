"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { findProjectFriends, inviteFriend } from "@/app/shift/island/actions";

import { COMMON, INVITE_FRIEND } from "./copy";
import styles from "./island.module.css";

/** A deliberate search, so opening the project never downloads a student directory. */
export function InviteFriends({ projectId }: { projectId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Array<{ id: string; name: string }> | null>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [pending, startTransition] = useTransition();

  function search(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSent("");
    if (Array.from(query.trim()).length < 2) {
      setError(INVITE_FRIEND.minimum);
      return;
    }
    startTransition(async () => {
      try {
        const result = await findProjectFriends({ projectId, query: query.trim() });
        if (result.ok) setFriends(result.data);
        else setError(result.error || COMMON.failed);
      } catch {
        setError(COMMON.failed);
      }
    });
  }

  function invite(friend: { id: string; name: string }) {
    if (pending) return;
    setError("");
    setSent("");
    startTransition(async () => {
      try {
        const result = await inviteFriend({ projectId, friendId: friend.id });
        if (result.ok) {
          setSent(friend.name);
          setFriends((rows) => rows?.filter((row) => row.id !== friend.id) ?? null);
        } else setError(result.error || COMMON.failed);
      } catch {
        setError(COMMON.failed);
      }
    });
  }

  return (
    <section className={styles.field}>
      <button type="button" className={styles.quietButton} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        {INVITE_FRIEND.title}
      </button>
      {open ? (
        <div id={`${id}-panel`} className={styles.field} aria-busy={pending}>
          <p id={`${id}-hint`} className={styles.hint}>{INVITE_FRIEND.hint}</p>
          <form onSubmit={search} className={styles.field}>
            <label htmlFor={id} className={styles.label}>{INVITE_FRIEND.label}</label>
            <input
              id={id}
              className={`ei-input ${styles.input}`}
              value={query}
              maxLength={80}
              disabled={pending}
              aria-describedby={`${id}-hint`}
              onChange={(event) => { setQuery(event.target.value); setFriends(null); setError(""); setSent(""); }}
            />
            <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending}>
              <span>{INVITE_FRIEND.search}</span>
            </button>
          </form>
          {error ? <p role="alert" className={styles.fieldError}>{error}</p> : null}
          {sent ? <p role="status" className={styles.hint}>{INVITE_FRIEND.sent}: {sent}. {INVITE_FRIEND.next}</p> : null}
          {friends ? (
            <div aria-live="polite">
              {friends.length === 0 && !sent ? <p className={styles.hint}>{INVITE_FRIEND.empty}</p> : null}
              <ul className={styles.invites}>
                {friends.map((friend) => (
                  <li key={friend.id} className={styles.invite}>
                    <p className={styles.inviteTitle}>{friend.name}</p>
                    <button type="button" className={styles.quietButton} disabled={pending} onClick={() => invite(friend)} aria-label={`${INVITE_FRIEND.invite}: ${friend.name}`}>
                      {INVITE_FRIEND.invite}
                    </button>
                  </li>
                ))}
              </ul>
              {friends.length === 20 ? <p className={styles.hint}>{INVITE_FRIEND.limit}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
