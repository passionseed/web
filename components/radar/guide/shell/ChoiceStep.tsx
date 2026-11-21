"use client";

/**
 * A dating-game choice: the host asks in a dialogue box, the student picks
 * one of 2 to 3 answers, then their answer and the host's reply to it play
 * as a normal dialogue (the shell's "ต่อ" reads it on, and the step is done
 * when the reply is read). Replies react, they never grade.
 *
 * Until a pick is made the sticky "ต่อ" steps aside (the shell's
 * `gameWaiting`): the answers are the only way on. The pick is saved as the
 * choice `<pageKey>:<id>`, so a revisit shows the same answer and reply.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChoiceOption, DialogueLine } from "@/lib/radar-guide/guide-types";
import { DialogueBox } from "@/components/radar/guide/story";
import { DialogueStep } from "./DialogueStep";
import { scrollToMiddle } from "./follow-scroll";
import { dialogueGroups } from "./level-steps";
import { useGuideShell } from "./shell-context";

export interface ChoiceStepProps {
  pageKey: string;
  stepId: string;
  ask: readonly DialogueLine[];
  options: readonly ChoiceOption[];
}

export function ChoiceStep({ pageKey, stepId, ask, options }: ChoiceStepProps) {
  const { progress, dispatch, tracker, demo, reducedMotion } = useGuideShell();
  const key = `${pageKey}:${stepId}`;
  const saved = progress.choices[key];
  const picked = options.find((o) => o.id === saved) ?? null;
  const cleared = !demo && (progress.cleared ?? []).includes(pageKey);
  // A saved pick or a cleared level: the question was read already.
  const [askRead, setAskRead] = useState(false);
  const showAnswers = askRead || demo || cleared || Boolean(picked);

  const pick = useCallback(
    (opt: ChoiceOption) => {
      if (picked) return;
      dispatch({ type: "choice", key, value: opt.id });
      tracker.track({ type: "interactive_tap", pageKey, target: `${key}:${opt.id}` });
    },
    [picked, dispatch, tracker, key, pageKey]
  );

  // Keep the answers, then the reply, in the middle of the screen.
  const answersRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const seen = useRef({ answers: showAnswers, reply: Boolean(picked) });
  useEffect(() => {
    if (demo) return;
    if (showAnswers && !seen.current.answers && answersRef.current) scrollToMiddle(answersRef.current, reducedMotion);
    if (picked && !seen.current.reply && replyRef.current) scrollToMiddle(replyRef.current, reducedMotion);
    seen.current = { answers: showAnswers, reply: Boolean(picked) };
  }, [showAnswers, picked, demo, reducedMotion]);

  const askLines = ask.flatMap((l) => dialogueGroups([l]).flatMap((g) => g.lines));
  const mood = ask.find((l) => l.mood)?.mood;

  return (
    <div className="rg-choice" data-testid={`choice-${stepId}`}>
      <div className="rg-dialogue__row" data-speaker="host">
        <DialogueBox
          key={showAnswers ? "read" : "new"}
          speaker="host"
          mood={mood}
          lines={askLines}
          reducedMotion={reducedMotion || demo || showAnswers}
          startRead={showAnswers}
          doneWhenRead
          onDone={() => setAskRead(true)}
        />
      </div>

      {showAnswers ? (
        <div ref={answersRef} className="rg-choice__answers" role="group" aria-label="เลือกคำตอบ">
          {options.map((opt) => {
            const chosen = picked?.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className="rg-choice__answer"
                data-chosen={chosen ? "true" : undefined}
                data-dim={picked && !chosen ? "true" : undefined}
                data-demo={`${stepId}.answer-${opt.id}`}
                data-testid={`choice-answer-${opt.id}`}
                aria-pressed={chosen}
                disabled={Boolean(picked)}
                onClick={() => pick(opt)}
              >
                <span className="rg-choice__cursor" aria-hidden="true">
                  ▶
                </span>
                {opt.labelTh}
              </button>
            );
          })}
        </div>
      ) : null}

      {picked ? (
        <div ref={replyRef}>
          <DialogueStep pageKey={pageKey} stepId={stepId} groups={dialogueGroups(picked.reply)} />
        </div>
      ) : null}

      <noscript>
        <ul className="rg-dialogue__static">
          {options.map((opt) => (
            <li key={opt.id}>
              {opt.labelTh}: {opt.reply.map((l) => l.text.th).join(" ")}
            </li>
          ))}
        </ul>
      </noscript>
    </div>
  );
}
