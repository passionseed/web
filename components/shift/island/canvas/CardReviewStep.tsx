"use client";

import { useId } from "react";

import { CARD_LIMITS } from "@/lib/shift-island/quest-canvas";
import { piiFlags } from "@/lib/supabase/shift-quests/canvas-snapshot";

import { StepHead } from "./CardPickStep";
import { COMPOSER, SUBMIT } from "./copy";
import { QuestCardPreview, type QuestCardPreviewProps } from "./QuestCardPreview";
import styles from "./canvas.module.css";

interface CardReviewStepProps {
  snapshot: QuestCardPreviewProps["snapshot"];
  /** The quest's own question, the line's label. */
  lineLabel: string;
  line: string;
  link: string;
  linkError: boolean;
  onLine: (value: string) => void;
  onLink: (value: string) => void;
}

/**
 * Step 2, ตรวจแล้วส่ง: the card exactly as the mentor gets it, then one
 * optional line (who never goes on the card is its hint) and one optional
 * link. The button and "this card will not change" sit in the sheet's bar.
 */
export function CardReviewStep({ snapshot, lineLabel, line, link, linkError, onLine, onLink }: CardReviewStepProps) {
  const ids = { line: useId(), link: useId() };
  // The student's own line is stored as written too: the same warning as a note's.
  const linePii = piiFlags(line);
  const lineDescribedBy = [`${ids.line}-hint`, linePii ? `${ids.line}-pii` : null].filter(Boolean).join(" ");
  return (
    <div className={styles.step}>
      <StepHead index={1} hint={SUBMIT.reviewHint} />
      <QuestCardPreview snapshot={snapshot} />

      <div className={styles.field}>
        <label htmlFor={ids.line} className={styles.label}>
          {lineLabel}
        </label>
        <p id={`${ids.line}-hint`} className={styles.fieldHint}>
          {COMPOSER.privacy}
        </p>
        <textarea
          id={ids.line}
          rows={2}
          className={`ei-input ${styles.input}`}
          placeholder={COMPOSER.linePlaceholder}
          value={line}
          maxLength={CARD_LIMITS.line}
          aria-describedby={lineDescribedBy}
          onChange={(event) => onLine(event.target.value)}
        />
        {linePii ? (
          <p id={`${ids.line}-pii`} className={styles.pii} role="note">
            {COMPOSER.piiLine}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.link} className={styles.label}>
          {COMPOSER.linkLabel}
        </label>
        <input
          id={ids.link}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          className={`ei-input ${styles.input}`}
          value={link}
          maxLength={CARD_LIMITS.link}
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? `${ids.link}-error` : undefined}
          onChange={(event) => onLink(event.target.value)}
        />
        {linkError ? (
          <p id={`${ids.link}-error`} role="alert" className={styles.fieldError}>
            {COMPOSER.linkError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
