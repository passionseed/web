"use client";

/**
 * Reveals a level one step at a time behind the sticky "ต่อ ▶". The server
 * renders every step (no-JS readers get all of it through the <noscript>
 * style); after hydration, steps ahead of the cursor are unmounted until
 * revealed, so a dialogue starts typing and a game starts loading only when
 * the student gets there. Pinned steps (safety lines) are always shown.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { latestIn, scrollToMiddle } from "./follow-scroll";
import { stepShown, type StepMeta } from "./level-steps";
import { useGuideShell } from "./shell-context";

export interface LevelStepView {
  meta: StepMeta;
  content: ReactNode;
}

export interface LevelStepperProps {
  pageKey: string;
  steps: readonly LevelStepView[];
}

const NO_JS_STYLE = `.rg-step[data-state="ahead"]{display:block!important}`;

export function LevelStepper({ pageKey, steps }: LevelStepperProps) {
  const { registerSteps, cursor, ready, reducedMotion, demo, advanceSeq } = useGuideShell();
  const metas = useMemo(() => steps.map((s) => s.meta), [steps]);
  const metaKey = JSON.stringify(metas);

  useEffect(() => {
    registerSteps(pageKey, metas);
    // metaKey: re-register only when the steps really change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, metaKey, registerSteps]);

  const cur = cursor(pageKey);
  const listRef = useRef<HTMLOListElement>(null);
  // Bring the new step to the middle of the screen, only after a "ต่อ" press
  // (never on arrival, never while filming).
  const seq = useRef(advanceSeq);
  useEffect(() => {
    if (advanceSeq === seq.current) return;
    seq.current = advanceSeq;
    if (demo) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-step-index="${cur}"]`);
    if (el) scrollToMiddle(latestIn(el), reducedMotion);
  }, [advanceSeq, cur, demo, reducedMotion]);

  // Room under the newest step so it can scroll up to the middle; gone once
  // the last step is out.
  const follow = ready && !demo && cur < steps.length - 1;

  return (
    <>
      <ol ref={listRef} className="rg-steps" data-follow={follow ? "true" : undefined}>
        {steps.map((step, i) => {
          const shown = stepShown(metas, i, cur);
          return (
            <li
              key={step.meta.id}
              className="rg-step"
              data-step-index={i}
              data-kind={step.meta.kind}
              data-state={shown ? "shown" : "ahead"}
              data-testid={`step-${step.meta.id}`}
            >
              {shown || !ready ? step.content : null}
            </li>
          );
        })}
      </ol>
      <noscript>
        <style>{NO_JS_STYLE}</style>
      </noscript>
    </>
  );
}
