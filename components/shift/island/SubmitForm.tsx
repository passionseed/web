"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitMainQuest, submitProposedQuest, submitSideQuest } from "@/app/shift/island/actions";
import { setPeerOpen } from "@/app/shift/island/peer-actions";
import { TEXT_LIMITS, type IslandActionResult, type QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, PEER, PHOTOS } from "./copy";
import { DoneWhenLine } from "./DoneWhenLine";
import { Field } from "./Field";
import { useDraft } from "./drafts";
import { InSheetFooter } from "./InSheetFooter";
import styles from "./island.module.css";
import { refKey, type QuestView } from "./model";
import peerStyles from "./peer/peer.module.css";
import { PhotoPicker } from "./photos/PhotoPicker";
import photoStyles from "./photos/photos.module.css";
import { HELPER_ICONS } from "./questArt";
import { HintIcon } from "./QuestSections";
import { dropPhoto, uploadPhotos, type PickedPhoto } from "./photos/upload";

interface SubmitFormProps {
  quest: QuestView;
  /** ส่งฉบับใหม่ instead of ส่งให้พี่เลี้ยงดู (submitted or clarification). */
  resubmit: boolean;
  /** Saved: the server's answer, with the quest's gift when it earned one. */
  onSubmitted: (result: QuestSubmitResult) => void;
  /** The sheet's footer: the send button goes there and submits this form through `form`. */
  footer: HTMLElement | null;
  /** What the mentor looks for (เสร็จเมื่อ), as a reminder on top. */
  doneWhen?: string[];
  /** One line above the form (quest 5: the checklist is attached by the server). */
  note?: string;
  /** A lower cap for the proof, when the server adds text under it (quest 5's checklist). */
  proofMax?: number;
  /** Photos can go with the work (schema 14): the picker shows and the photos upload after the save. */
  photos?: boolean;
  /** The peer check (schema 15): a tick (on by default) opens the saved work to peers. */
  peer?: boolean;
}

interface Draft {
  proof: string;
  url: string;
  reflection: string;
}

type FieldErrors = Partial<Record<keyof Draft, string>>;

const EMPTY: Draft = { proof: "", url: "", reflection: "" };

/** Field moved to ./Field so forms without photos do not load the photo upload; re-exported for older imports. */
export { Field };

/** Same rules as the database (__check_len / __check_url): required text, caps, https only. */
export function validateSubmission(draft: Draft, proofMax: number = TEXT_LIMITS.proof): FieldErrors {
  const errors: FieldErrors = {};
  const proof = draft.proof.trim();
  const reflection = draft.reflection.trim();
  const url = draft.url.trim();
  if (!proof) errors.proof = DETAIL.errors.proofRequired;
  else if (proof.length > proofMax) errors.proof = DETAIL.errors.tooLong(proofMax);
  if (!reflection) errors.reflection = DETAIL.errors.reflectionRequired;
  else if (reflection.length > TEXT_LIMITS.reflection) errors.reflection = DETAIL.errors.tooLong(TEXT_LIMITS.reflection);
  if (url) {
    if (url.length > TEXT_LIMITS.artifactUrl) errors.url = DETAIL.errors.tooLong(TEXT_LIMITS.artifactUrl);
    else if (!isHttpsUrl(url)) errors.url = DETAIL.errors.url;
  }
  return errors;
}

function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** One submit call per quest kind. Ids and capped text only; the server derives who is acting. */
function send(quest: QuestView, proof: string, reflection: string, artifactUrl: string | null): Promise<IslandActionResult<QuestSubmitResult>> {
  const ref = quest.ref;
  switch (ref.kind) {
    case "main":
      return submitMainQuest({ milestone: ref.milestone, proof, reflection, artifactUrl });
    case "side":
      return submitSideQuest({ templateId: ref.templateId, proof, reflection, artifactUrl });
    case "proposed":
      return submitProposedQuest({ instanceId: ref.instanceId, version: quest.version ?? 0, proof, reflection, artifactUrl });
  }
}

const NONE: string[] = [];

/**
 * The written form: what the mentor looks for on top, then the two required
 * answers (proof and one reflection), then the optional link and photos as one
 * quiet group, and the peer tick last. Sent for a mentor's review from the
 * sheet's bar.
 */
export function SubmitForm({
  quest,
  resubmit,
  onSubmitted,
  footer,
  doneWhen = NONE,
  note,
  proofMax = TEXT_LIMITS.proof,
  photos = false,
  peer = false,
}: SubmitFormProps) {
  const formId = useId();
  const ids = { proof: useId(), reflection: useId(), optional: useId(), url: useId() };
  // Kept per quest across the sheet closing, so a stray swipe never loses the text.
  const [draft, setDraft, clearDraft] = useDraft<Draft>(`submit:${refKey(quest.ref)}`, EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<PickedPhoto[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [peerOpen, setPeerOpenTick] = useState(true);
  // The link stays a text button until it is wanted (or already holds something).
  const [linkWanted, setLinkWanted] = useState(false);
  const showLink = linkWanted || !!draft.url || !!errors.url;
  const urlRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (linkWanted) urlRef.current?.focus();
  }, [linkWanted]);
  const reflectionLabel = quest.reflectionPrompt.trim() || DETAIL.reflectionFallback;

  function update(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const found = validateSubmission(draft, proofMax);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const url = draft.url.trim();
    startTransition(async () => {
      const result = await send(quest, draft.proof.trim(), draft.reflection.trim(), url ? url : null);
      if (result.ok) {
        clearDraft();
        // The written work is saved; peers and photos follow it onto the same submission.
        const submissionId = result.data.submissionId;
        if (peer && peerOpen && submissionId) {
          const opened = await setPeerOpen({ submissionId, open: true }).catch(() => null);
          // The work is saved either way; peers simply do not see it.
          if (!opened?.ok) toast.error(opened && !opened.ok ? opened.error : COMMON.failed);
        }
        if (photos && picked.length > 0 && submissionId) {
          setUploading(PHOTOS.uploading(0, picked.length));
          const outcome = await uploadPhotos(submissionId, picked, (done) => setUploading(PHOTOS.uploading(done, picked.length)));
          setUploading(null);
          if (outcome.failed > 0) toast.error(PHOTOS.someFailed(outcome.failed));
          picked.forEach(dropPhoto);
          setPicked([]);
        }
        onSubmitted(result.data);
      } else {
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  const linkButton = showLink ? null : (
    <button type="button" className={photoStyles.attach} onClick={() => setLinkWanted(true)} disabled={pending}>
      <HintIcon name={HELPER_ICONS.link} size={20} />
      <span>{DETAIL.addLink}</span>
    </button>
  );

  return (
    <form id={formId} className={styles.form} onSubmit={onSubmit} noValidate>
      <DoneWhenLine items={doneWhen} />
      {note ? <p className={styles.hint}>{note}</p> : null}
      {/* The two answers a mentor needs come first; everything optional waits in one quiet group below. */}
      <Field
        id={ids.proof}
        label={DETAIL.proofLabel}
        hint={DETAIL.proofHint}
        placeholder={DETAIL.proofPlaceholder}
        value={draft.proof}
        max={proofMax}
        error={errors.proof}
        rows={3}
        className={styles.write}
        onChange={(value) => update("proof", value)}
      />
      <Field
        id={ids.reflection}
        label={reflectionLabel}
        placeholder={DETAIL.reflectionPlaceholder}
        value={draft.reflection}
        max={TEXT_LIMITS.reflection}
        error={errors.reflection}
        rows={2}
        className={styles.write}
        onChange={(value) => update("reflection", value)}
      />
      <div className={styles.formOptional} role="group" aria-labelledby={ids.optional}>
        <p id={ids.optional} className={styles.formOptionalHeading}>
          {DETAIL.optional}
        </p>
        {showLink ? (
          <div className={styles.field}>
            <label htmlFor={ids.url} className={styles.label}>
              {DETAIL.urlShort}
            </label>
            <input
              ref={urlRef}
              id={ids.url}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              className={`ei-input ${styles.input} ${styles.write}`}
              value={draft.url}
              maxLength={TEXT_LIMITS.artifactUrl}
              aria-invalid={errors.url ? true : undefined}
              aria-describedby={errors.url ? `${ids.url}-error` : undefined}
              onChange={(event) => update("url", event.target.value)}
            />
            {errors.url ? (
              <p id={`${ids.url}-error`} role="alert" className={styles.fieldError}>
                {errors.url}
              </p>
            ) : null}
          </div>
        ) : null}
        {photos ? (
          <PhotoPicker photos={picked} onChange={setPicked} disabled={pending} label={PHOTOS.formLabel} inline leading={linkButton} />
        ) : (
          linkButton
        )}
      </div>
      {peer ? (
        <label className={peerStyles.toggle}>
          <input type="checkbox" checked={peerOpen} onChange={(event) => setPeerOpenTick(event.target.checked)} disabled={pending} />
          <span className={peerStyles.toggleText}>
            <span>{PEER.openLabel}</span>
            <span className={peerStyles.toggleHint}>{PEER.openHint}</span>
          </span>
        </label>
      ) : null}
      <InSheetFooter slot={footer}>
        <button
          type="submit"
          form={formId}
          className={`ei-button-dawn ${styles.primary} ${styles.barButton}`}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{uploading ?? (pending ? COMMON.sending : resubmit ? DETAIL.resubmit : DETAIL.submit)}</span>
        </button>
      </InSheetFooter>
    </form>
  );
}
