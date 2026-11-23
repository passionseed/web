"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { answerAway } from "@/app/shift/island/actions";
import { piiFlags } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { AWAY_LINE_MAX, AWAY_REASONS, type AwayReason } from "@/lib/supabase/shift-quests/playerTypes";

import { AWAY, COMMON, DETAIL } from "../copy";
import { Field } from "../Field";
import island from "../island.module.css";
import { InSheetFooter } from "../InSheetFooter";
import { IslandSheet } from "../IslandSheet";
import styles from "./away.module.css";

interface ReturnSheetProps {
  open: boolean;
  /** The stretch the card opened for (ask_return.gap_from, YYYY-MM-DD). */
  gapFrom: string;
  /** The sheet is done: closed by the student, or a way on was taken. */
  onClose: () => void;
  /** "ติดอยู่": the existing group help (StuckSheet), never a private reply. Absent (no plot yet): thanks and close. */
  onStuck?: () => void;
  /** The suggestions channel, for "เกาะใช้ยาก"; null hides that way on. */
  suggestUrl: string | null;
  /**
   * ขอพัก is on this screen (the team sheet, with a plot and not resting), so "อยากพัก" can point to it.
   * Absent (no plot yet): thanks and close, as "ติดอยู่" without a StuckSheet.
   */
  canRest?: boolean;
  /**
   * The page still names this stretch (ask_return.gap_from). False after a refresh (answered in
   * another tab, or no longer due): an unanswered card closes quietly, never as a skip.
   */
  due?: boolean;
}

/** The reasons whose thanks has a way on, shown in the sheet; the rest thank and close. */
type After = Extract<AwayReason, "stuck" | "island" | "unclear" | "break">;

function afterOf(reason: AwayReason, suggestUrl: string | null, stuckHelp: boolean, canRest: boolean): After | null {
  if (reason === "island") return suggestUrl ? "island" : null;
  if (reason === "stuck") return stuckHelp ? "stuck" : null;
  if (reason === "break") return canRest ? "break" : null;
  return reason === "unclear" ? reason : null;
}

/**
 * The return card ("ช่วยเราปรับเกาะหน่อย"), opened once on arrival after a
 * stretch away: six one-tap reasons, an optional short line, one Send. The
 * island asks, never the bot. Closing it is a skip, saved so it never reopens
 * for that stretch. Admins read the answers without names; mentors never
 * see them and nobody replies.
 */
export function ReturnSheet({ open, gapFrom, onClose, onStuck, suggestUrl, canRest = false, due = true }: ReturnSheetProps) {
  // Once Send is on its way (or done), closing is no longer a skip.
  const answered = useRef(false);
  const [after, setAfter] = useState<After | null>(null);
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);

  // The refreshed page no longer asks about this stretch and this card sent nothing: it was
  // answered elsewhere (another tab) or is over. Close without a word and without a skip.
  useEffect(() => {
    if (!open || due || answered.current) return;
    answered.current = true;
    onClose();
  }, [open, due, onClose]);

  function close() {
    if (!answered.current) {
      answered.current = true;
      // A skip: saved quietly; if it fails, the card may simply ask again on a later visit.
      void answerAway({ gapFrom, reason: null, line: null }).catch(() => undefined);
    }
    onClose();
  }

  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={AWAY.card.title}
      description={after ? undefined : AWAY.card.intro}
      // Send stays in view on a phone: the form scrolls, its button sits in the sheet's footer.
      footer={after ? undefined : <div ref={setFooterSlot} className={island.footerSlot} />}
    >
      {after ? (
        <AfterView after={after} suggestUrl={suggestUrl} onStuck={onStuck} onClose={onClose} />
      ) : (
        <ReturnForm
          gapFrom={gapFrom}
          answered={answered}
          footer={footerSlot}
          onSent={(reason) => {
            const next = afterOf(reason, suggestUrl, onStuck != null, canRest);
            if (next) return setAfter(next);
            toast.success(AWAY.card.thanks);
            onClose();
          }}
          onGone={onClose}
        />
      )}
    </IslandSheet>
  );
}

function ReturnForm({
  gapFrom,
  answered,
  footer,
  onSent,
  onGone,
}: {
  gapFrom: string;
  answered: { current: boolean };
  /** The sheet's footer, where Send stays in view; null until it mounts (Send then stays in the form). */
  footer: HTMLElement | null;
  onSent: (reason: AwayReason) => void;
  /**
   * The card is not due any more: the database refused the stretch (not_found) or kept an answer
   * sent from elsewhere ({saved: false}). Close without a word: nothing of this one was saved.
   */
  onGone: () => void;
}) {
  const lineId = useId();
  const choiceName = useId();
  const formId = useId();
  const [reason, setReason] = useState<AwayReason | null>(null);
  const [line, setLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pii = piiFlags(line);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!reason) return setError(AWAY.card.needReason);
    const text = line.trim();
    if (Array.from(text).length > AWAY_LINE_MAX) return setLineError(DETAIL.errors.tooLong(AWAY_LINE_MAX));
    setError(null);
    answered.current = true;
    startTransition(async () => {
      const result = await answerAway({ gapFrom, reason, line: text || null });
      if (result.ok) return result.data.saved ? onSent(reason) : onGone();
      if (result.code === "not_found") return onGone();
      // Not saved: closing the card now is a skip again.
      answered.current = false;
      toast.error(result.error || COMMON.failed);
    });
  }

  const send = (
    <button type="submit" form={formId} className={`ei-button-dawn ${island.primary}`} disabled={pending} aria-busy={pending}>
      {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
      <span>{pending ? COMMON.sending : AWAY.card.send}</span>
    </button>
  );

  return (
    <form id={formId} className={island.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.chips} aria-describedby={error ? `${choiceName}-error` : undefined}>
        <legend className={`${island.label} ${styles.legend}`}>{AWAY.card.legend}</legend>
        <div className={island.routePicker}>
          {AWAY_REASONS.map((value) => (
            <label key={value} className={island.routeOption} data-checked={reason === value ? "true" : undefined}>
              <input
                type="radio"
                name={choiceName}
                value={value}
                checked={reason === value}
                onChange={() => {
                  setReason(value);
                  setError(null);
                }}
                className={island.choiceInput}
              />
              <span>{AWAY.card.reasons[value]}</span>
            </label>
          ))}
        </div>
        {error ? (
          <p id={`${choiceName}-error`} role="alert" className={island.fieldError}>
            {error}
          </p>
        ) : null}
      </fieldset>
      <div className={styles.line}>
        <Field
          id={lineId}
          label={AWAY.card.lineLabel}
          hint={AWAY.card.lineHint}
          value={line}
          max={AWAY_LINE_MAX}
          error={lineError ?? undefined}
          rows={2}
          onChange={(value) => {
            setLine(value);
            if (lineError) setLineError(null);
          }}
        />
        <div aria-live="polite">
          {pii ? (
            <p className={styles.note} role="note">
              {AWAY.card.pii}
            </p>
          ) : null}
        </div>
      </div>
      <p className={styles.safety}>{AWAY.card.safety}</p>
      <p className={island.hint}>{AWAY.card.who}</p>
      {footer ? <InSheetFooter slot={footer}>{send}</InSheetFooter> : send}
    </form>
  );
}

/** After Send: one line and at most one way on. */
function AfterView({
  after,
  suggestUrl,
  onStuck,
  onClose,
}: {
  after: After;
  suggestUrl: string | null;
  onStuck?: () => void;
  onClose: () => void;
}) {
  const text = AWAY.card.after;
  return (
    <div className={styles.after}>
      <p className={styles.afterLine} role="status">
        {text[after]}
      </p>
      {after === "stuck" && onStuck ? (
        <button type="button" className={`ei-button-dawn ${island.primary}`} aria-haspopup="dialog" onClick={onStuck}>
          {text.stuckAction}
        </button>
      ) : after === "island" && suggestUrl ? (
        <a className={`ei-button-dawn ${island.primary}`} href={suggestUrl} target="_blank" rel="noopener noreferrer">
          {text.islandAction}
        </a>
      ) : after === "unclear" ? (
        <button type="button" className={`ei-button-dawn ${island.primary}`} onClick={onClose}>
          {text.unclearAction}
        </button>
      ) : (
        <button type="button" className={island.quietButton} onClick={onClose}>
          {text.back}
        </button>
      )}
    </div>
  );
}
