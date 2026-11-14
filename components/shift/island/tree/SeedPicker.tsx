"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { plantSeed } from "@/app/shift/island/tree-actions";
import { SEEDS, type SeedId } from "@/lib/shift-island/tree-style";
import { TEXT_LIMITS, type MyTree } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, TREE } from "../copy";
import island from "../island.module.css";
import { TreeCanvas } from "./TreeCanvas";
import styles from "./tree.module.css";

const SEED_IDS: readonly SeedId[] = ["oak", "sakura", "pine", "maple"];

/** Each seed as it grows up: in full blossom, so its shape, leaves, bark and flowers all show. */
const PREVIEW_STAGE = 7;

const chars = (value: string) => Array.from(value).length;

/**
 * เลือกเมล็ด, the team's first step: one line on what the team wants to
 * build (it fills the project's ambition when that is empty), then one of
 * four seeds, each drawn grown up in its look. Any teammate, once per
 * project; no mentor review, the seed is in the ground at once.
 */
export function SeedPicker({ onPlanted }: { onPlanted: (tree: MyTree) => void }) {
  const headingId = useId();
  const ideaId = useId();
  const groupName = useId();
  const [idea, setIdea] = useState("");
  const [seed, setSeed] = useState<SeedId | null>(null);
  const [errors, setErrors] = useState<{ idea?: string; seed?: string }>({});
  const [pending, startTransition] = useTransition();
  const sending = useRef(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const text = idea.trim();
    const found: typeof errors = {};
    if (!text) found.idea = TREE.seed.needIdea;
    else if (chars(text) > TEXT_LIMITS.ambition) found.idea = DETAIL.errors.tooLong(TEXT_LIMITS.ambition);
    if (!seed) found.seed = TREE.seed.needSeed;
    setErrors(found);
    if (found.idea || found.seed || !seed) return;
    sending.current = true;
    startTransition(async () => {
      try {
        const result = await plantSeed(seed, text);
        if (result.ok) {
          toast.success(TREE.seed.planted);
          onPlanted(result.data.tree);
        } else {
          toast.error(result.error || COMMON.failed);
        }
      } catch {
        toast.error(COMMON.failed);
      } finally {
        sending.current = false;
      }
    });
  }

  const ideaDescribedBy = [`${ideaId}-hint`, errors.idea ? `${ideaId}-error` : null].filter(Boolean).join(" ");
  return (
    <section aria-labelledby={headingId} className={styles.card}>
      <h3 id={headingId} className={styles.heading}>
        {TREE.seed.title}
      </h3>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={island.field}>
          <label htmlFor={ideaId} className={island.label}>
            {TREE.seed.ask}
          </label>
          <p id={`${ideaId}-hint`} className={island.hint}>
            {TREE.seed.askHint}
          </p>
          <input
            id={ideaId}
            className={`ei-input ${island.input}`}
            value={idea}
            maxLength={TEXT_LIMITS.ambition}
            placeholder={TREE.seed.askPlaceholder}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={errors.idea ? true : undefined}
            aria-describedby={ideaDescribedBy}
            onChange={(event) => {
              setIdea(event.target.value);
              if (errors.idea) setErrors((current) => ({ ...current, idea: undefined }));
            }}
          />
          {errors.idea ? (
            <p id={`${ideaId}-error`} role="alert" className={island.fieldError}>
              {errors.idea}
            </p>
          ) : null}
        </div>

        <fieldset className={styles.seeds}>
          <legend className={island.label}>{TREE.seed.pick}</legend>
          <div className={styles.seedGrid}>
            {SEED_IDS.map((id) => (
              <label key={id} className={styles.seed} data-checked={seed === id ? "true" : undefined}>
                <input
                  type="radio"
                  name={groupName}
                  value={id}
                  checked={seed === id}
                  className={styles.seedInput}
                  aria-labelledby={`${groupName}-${id}-name`}
                  aria-describedby={`${groupName}-${id}-blurb`}
                  onChange={() => {
                    setSeed(id);
                    if (errors.seed) setErrors((current) => ({ ...current, seed: undefined }));
                  }}
                />
                <TreeCanvas
                  input={{ style: SEEDS[id].style, stage: PREVIEW_STAGE, seeded: true, roots: { count: 0, recent: 0 } }}
                  scale={1}
                  view="tree"
                  className={styles.tileCanvas}
                />
                <span id={`${groupName}-${id}-name`} className={styles.seedName}>
                  {TREE.seeds[id].name}
                </span>
                <span id={`${groupName}-${id}-blurb`} className={styles.seedBlurb}>
                  {TREE.seeds[id].blurb}
                </span>
              </label>
            ))}
          </div>
          {errors.seed ? (
            <p role="alert" className={island.fieldError}>
              {errors.seed}
            </p>
          ) : null}
        </fieldset>

        <button type="submit" className={`ei-button-dawn ${island.primary}`} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{TREE.seed.action}</span>
        </button>
      </form>
    </section>
  );
}
