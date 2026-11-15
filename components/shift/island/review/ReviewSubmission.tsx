import type { ReactNode } from "react";

import type { ReviewView } from "@/lib/supabase/shift-quests/review";

import { REVIEW_PAGE } from "../copy";
import styles from "./review.module.css";

/** A labelled block of the student's own text, kept as they wrote it (line breaks included). */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.block}>
      <p className={styles.label}>{label}</p>
      {children}
    </div>
  );
}

/**
 * One submission for a mentor on the web: what the quest asked, what the
 * student did, and the photos Discord cannot show. The decision stays on the
 * Discord review card. `extra` takes what later schemas add (peer checks).
 */
export function ReviewSubmission({ view, extra }: { view: ReviewView; extra?: ReactNode }) {
  return (
    <article className={styles.card} aria-labelledby="review-title">
      <h1 id="review-title" className={styles.title}>
        {view.title}
      </h1>
      <div className={styles.chips}>
        <span className={styles.chip}>{REVIEW_PAGE.revision(view.revision)}</span>
        <span className={styles.chip}>{REVIEW_PAGE.status[view.status] ?? view.status}</span>
        {view.isLatest ? null : (
          <span className={styles.chip} data-tone="warn">
            {REVIEW_PAGE.older}
          </span>
        )}
      </div>

      <Block label={REVIEW_PAGE.goal}>
        <p className={styles.text}>{view.goal}</p>
      </Block>
      <Block label={REVIEW_PAGE.criteria}>
        <p className={styles.text}>{view.criteria}</p>
      </Block>

      {view.redacted ? (
        <p className={styles.note}>{REVIEW_PAGE.redacted}</p>
      ) : (
        <>
          <Block label={REVIEW_PAGE.evidence}>
            <p className={styles.text}>{view.evidence ?? "-"}</p>
          </Block>
          <Block label={REVIEW_PAGE.reflection}>
            <p className={styles.text}>{view.reflection ?? "-"}</p>
          </Block>
          {view.artifactUrl ? (
            <Block label={REVIEW_PAGE.link}>
              <a className={styles.link} href={view.artifactUrl} target="_blank" rel="noopener noreferrer nofollow">
                {view.artifactUrl}
              </a>
            </Block>
          ) : null}
        </>
      )}

      <Block label={REVIEW_PAGE.photos}>
        {view.photos.length === 0 ? (
          <p className={styles.note}>{REVIEW_PAGE.noPhotos}</p>
        ) : (
          <ul className={styles.photos}>
            {view.photos.map((photo, index) => (
              <li key={photo.id}>
                <a className={styles.photo} href={photo.url} target="_blank" rel="noopener noreferrer">
                  {/* Signed, short-lived links from a private bucket: no image optimizer in between. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`${REVIEW_PAGE.photos} ${index + 1}`} width={photo.width} height={photo.height} loading="lazy" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {extra}

      <p className={styles.note}>{REVIEW_PAGE.decideInDiscord}</p>
    </article>
  );
}
