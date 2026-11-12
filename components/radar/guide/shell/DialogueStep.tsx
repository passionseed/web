"use client";

/**
 * A story beat: the host NPC (or the player, or a system note) talking in
 * typewriter dialogue boxes, tap to advance (U7 DialogueBox, which draws the
 * NPC beside host lines). Consecutive lines from one speaker share a box; a
 * new speaker's box opens once the previous one is read. The whole text is
 * also in <noscript> for no-JS readers.
 *
 * On a cleared level (a revisit, the back arrow, a reload) the dialogue is
 * already read: every speaker group shows at once, typed, on its last box,
 * and the step counts as done straight away.
 */
import { useCallback, useState } from "react";
import { DialogueBox } from "@/components/radar/guide/story";
import type { DialogueGroup } from "./level-steps";
import { useGuideShell } from "./shell-context";

export interface DialogueStepProps {
  pageKey: string;
  stepId: string;
  groups: readonly DialogueGroup[];
}

export function DialogueStep({ pageKey, stepId, groups }: DialogueStepProps) {
  const { markStepDone, demo, reducedMotion, dialogueNudge, progress } = useGuideShell();
  // "ต่อ" pressed while this dialogue is current: the open box reads on.
  const nudge = dialogueNudge && dialogueNudge.key === `${pageKey}:${stepId}` ? dialogueNudge.seq : undefined;
  const [shown, setShown] = useState(0);
  const read = !demo && (progress.cleared ?? []).includes(pageKey);
  // Demo mode (filming) and read levels: every box at once, already typed.
  const last = demo || read ? groups.length - 1 : shown;

  const onGroupDone = useCallback(
    (i: number) => {
      if (i < groups.length - 1) setShown((n) => Math.max(n, i + 1));
      else markStepDone(pageKey, stepId);
    },
    [groups.length, markStepDone, pageKey, stepId]
  );

  if (!groups.length) return null;
  return (
    <div className="rg-dialogue">
      {groups.slice(0, last + 1).map((group, i) => (
        // The key remounts each box when the level turns out to be read
        // (progress loads from storage after the first render).
        <div key={`${i}-${read ? "read" : "new"}`} className="rg-dialogue__row" data-speaker={group.speaker}>
          <DialogueBox
            speaker={group.speaker}
            mood={group.mood}
            lines={group.lines}
            reducedMotion={reducedMotion || demo || read}
            startRead={read}
            advanceSignal={i === last ? nudge : undefined}
            doneWhenRead={i === groups.length - 1}
            onDone={() => onGroupDone(i)}
          />
        </div>
      ))}
      <noscript>
        <div className="rg-dialogue__static">
          {groups.flatMap((group, i) => group.lines.map((line, j) => <p key={`${i}-${j}`}>{line}</p>))}
        </div>
      </noscript>
    </div>
  );
}
