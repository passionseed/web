"use client";

import { useEffect, useId, useMemo, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitQuestCard } from "@/app/shift/island/actions";
import {
  CANVAS_RELOAD_CODES,
  CARD_LIMITS,
  type QuestCanvasContext,
  type QuestCardTarget,
} from "@/lib/shift-island/quest-canvas";
import { buildSnapshot, pickNotes } from "@/lib/supabase/shift-quests/canvas-snapshot";
import type { QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { useDraft } from "../drafts";
import { InSheetFooter } from "../InSheetFooter";
import island from "../island.module.css";
import { refKey } from "../model";
import { CardPickStep } from "./CardPickStep";
import { CardReviewStep } from "./CardReviewStep";
import { COMPOSER, PREVIEW, SUBMIT } from "./copy";
import styles from "./canvas.module.css";

/** Step 1 picks the notes; step 2 shows the card as the mentor gets it, and sends it. */
export type CardStep = "pick" | "review";

export interface QuestCardComposerProps {
  target: QuestCardTarget;
  context: Extract<QuestCanvasContext, { state: "ready" }>;
  /** The step on show; the sheet holds it, so its back button (top left) can say where it goes. */
  step: CardStep;
  onStep: (step: CardStep) => void;
  /**
   * The sheet's footer: the step's one button goes there and submits this
   * form through its `form` attribute. Null renders no button.
   */
  footer: HTMLElement | null;
  /** What the mentor looks for (เสร็จเมื่อ), compact on step 1. */
  doneWhen?: string[];
  /** Re-read the canvas (after notes_changed and the other canvas refusals). */
  onReload: () => void;
  /** Saved: the server's answer, with the quest's gift when it earned one. */
  onSubmitted: (result: QuestSubmitResult) => void;
  /** The canvas is being read again (after notes_changed): nothing is sent until it is back. */
  loading?: boolean;
}

interface CardDraft {
  ids: string[];
  line: string;
  link: string;
}

const EMPTY: CardDraft = { ids: [], line: "", link: "" };
const NONE: string[] = [];

function isHttpsUrl(value: string): boolean {
  if (!/^https:\/\/\S+$/.test(value) || Array.from(value).length > CARD_LIMITS.link) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The quest card, in two steps of one form: tick notes from the linked canvas
 * (the zones this quest uses), then see the exact card the mentor will read,
 * add one optional line and link, and send. The server re-reads the canvas,
 * checks each note and stores the text, so it cannot change after review.
 * The text is never edited here. Ticks, line and link are a draft that
 * survives the sheet closing.
 */
export function QuestCardComposer({
  target,
  context,
  step,
  onStep,
  footer,
  doneWhen = NONE,
  onReload,
  onSubmitted,
  loading = false,
}: QuestCardComposerProps) {
  const formId = useId();
  const [draft, setDraft, clearDraft] = useDraft<CardDraft>(`card:${refKey(target.ref)}`, EMPTY);
  const [linkError, setLinkError] = useState(false);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(context.notes.map((n) => [n.id, n])), [context.notes]);
  // Ticks for notes that are gone since (a reload) drop out.
  const ticked = draft.ids.filter((id) => byId.has(id));
  // Cheap (a canvas holds tens of notes): the same pure function the server stores with.
  const chosen = pickNotes(context.notes, ticked);
  const full = ticked.length >= CARD_LIMITS.notes;
  // Step 2 needs a card: when a reload takes every picked note away, it is step 1 again.
  const review = step === "review" && chosen.length > 0;
  useEffect(() => {
    if (step === "review" && chosen.length === 0) onStep("pick");
  }, [step, chosen.length, onStep]);

  function toggle(id: string, on: boolean) {
    setDraft((current) => {
      const live = current.ids.filter((x) => byId.has(x));
      if (on) return live.includes(id) || live.length >= CARD_LIMITS.notes ? { ...current, ids: live } : { ...current, ids: [...live, id] };
      return { ...current, ids: live.filter((x) => x !== id) };
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) {
      if (chosen.length > 0) onStep("review");
      return;
    }
    if (pending || loading) return;
    const link = draft.link.trim();
    if (link && !isHttpsUrl(link)) {
      setLinkError(true);
      return;
    }
    const line = draft.line.trim();
    startTransition(async () => {
      const result = await submitQuestCard({
        ref: target.ref,
        slug: target.slug,
        version: target.version,
        notes: chosen.map((n) => ({ id: n.id, hash: n.hash })),
        line: line || null,
        link: link || null,
      });
      if (result.ok) {
        clearDraft();
        onSubmitted(result.data);
        return;
      }
      toast.error(result.error || COMPOSER.failed);
      if (CANVAS_RELOAD_CODES.has(result.code)) onReload();
    });
  }

  return (
    <form id={formId} className={styles.composer} onSubmit={onSubmit} noValidate>
      {review ? (
        <CardReviewStep
          snapshot={buildSnapshot(context.canvas.title, chosen)}
          lineLabel={target.reflectionPrompt.trim() || COMPOSER.lineFallback}
          line={draft.line}
          link={draft.link}
          linkError={linkError}
          onLine={(line) => setDraft((current) => ({ ...current, line }))}
          onLink={(link) => {
            setDraft((current) => ({ ...current, link }));
            if (linkError) setLinkError(false);
          }}
        />
      ) : (
        <CardPickStep
          notes={context.notes}
          ticked={ticked}
          full={full}
          locked={pending}
          doneWhen={doneWhen}
          onToggle={toggle}
        />
      )}

      {loading ? (
        <p className={styles.quiet} role="status">
          {COMPOSER.rereading}
        </p>
      ) : null}

      <InSheetFooter slot={footer}>
        {review ? (
          <div className={styles.sendBar}>
            <p className={styles.frozen}>{PREVIEW.frozen}</p>
            <button
              type="submit"
              form={formId}
              className={`ei-button-dawn ${island.primary} ${island.barButton}`}
              disabled={pending || loading}
              aria-busy={pending || loading}
            >
              {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
              <span>{pending ? COMPOSER.sending : target.resubmit ? COMPOSER.resubmit : COMPOSER.submit}</span>
            </button>
          </div>
        ) : (
          <button
            type="submit"
            form={formId}
            className={`ei-button-dawn ${island.primary} ${island.barButton}`}
            disabled={chosen.length === 0}
          >
            <span>{chosen.length === 0 ? SUBMIT.needOne : SUBMIT.next(chosen.length)}</span>
          </button>
        )}
      </InSheetFooter>
    </form>
  );
}
