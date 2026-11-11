"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { startIsland } from "@/app/shift/island/actions";
import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { ViewerCard } from "@/lib/supabase/shift-quests/types";

import { COMMON, GATE, START } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { GateBackdrop } from "./IslandGate";
import { PALETTE, WEB_SPRITES } from "./sprites";
import { STORY } from "./story/copy";
import story from "./story/story.module.css";
import { StoryLauncher } from "./story/StoryLauncher";

/**
 * Before the island: one line and one button, the story one tap away on the
 * book. The story first opens by itself on the island, where the season's
 * Demo Day date and the claim button are real. The four rules stay one tap
 * away under a fold.
 */
export function StartCard({ me }: { me: ViewerCard }) {
  const [pending, startTransition] = useTransition();

  function start() {
    if (pending) return;
    startTransition(async () => {
      const result = await startIsland();
      if (!result.ok) toast.error(result.error || COMMON.failed);
    });
  }

  return (
    <div className={styles.gate}>
      <GateBackdrop />
      <section className={`ei-card ei-card--static ${styles.gateCard}`} aria-labelledby="island-start-heading">
        <div className={story.startHead}>
          <h1 id="island-start-heading" className={styles.gateHeading}>
            {START.heading}
          </h1>
          {/* No season is loaded before the island starts, so the festival panel is undated. */}
          {/* The story's "ไปที่เกาะ" does what it says: it starts the island. */}
          <StoryLauncher demoDay={null} cta="start" autoOpen={false} onCta={start} />
        </div>
        <p className={styles.gateBody}>{GATE.signedOut.body}</p>
        <details className={story.rulesFold}>
          <summary className={story.rulesSummary}>{STORY.rules}</summary>
          <ol className={styles.rules}>
            {START.rules.map((rule) => (
              <li key={rule} className={styles.rule}>
                <PixelIcon grid={WEB_SPRITES.seed} palette={PALETTE} scale={1} className={styles.ruleIcon} />
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </details>
        <div className={styles.gateActions}>
          <button
            type="button"
            className={`ei-button-dawn ${styles.primary}`}
            onClick={start}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
            <span>{pending ? START.pending : START.action}</span>
          </button>
        </div>
        <p className={styles.hint}>{GATE.signedInAs(me.name)}</p>
        <IslandDiscordButton label={START.switchAccount} switchAccount variant="quiet" />
      </section>
    </div>
  );
}
