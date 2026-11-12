/**
 * Renders one level step from its block. Server component: copy, items and
 * safety lines are server HTML; dialogue, games, bespoke pieces, cutscenes,
 * links and the outro are client islands that receive only their block's data.
 */
import type { CopyText, DialogueLine, Fact, GuideBlock } from "@/lib/radar-guide/guide-types";
import { splitDialogue } from "@/lib/radar-guide/story";
import { BespokeIsland } from "./BespokeIsland";
import { DialogueStep } from "./DialogueStep";
import { FactChips } from "./FactChips";
import { GameIsland } from "./GameIsland";
import { GuideClip, type GuideClipData } from "./GuideClip";
import { ItemCard, SafetyCard } from "./ItemCard";
import { copySpeaker, dialogueGroups, type LevelStep } from "./level-steps";
import { GuideLinkButton, GuideOutroStep, MidShareStep, ProfileStep } from "./OutroSteps";

export interface StepViewProps {
  step: LevelStep;
  pageKey: string;
  titleTh: string;
  clip: GuideClipData | null;
}

function textChips(texts: readonly CopyText[]) {
  const factIds = [...new Set(texts.flatMap((t) => t.factIds ?? []))];
  const badge = texts.find((t) => t.badge)?.badge;
  const labels = [...new Set(texts.flatMap((t) => t.labels ?? []))];
  return <FactChips factIds={factIds} badge={badge} labels={labels} />;
}

function linesOf(block: Extract<GuideBlock, { kind: "dialogue" }>): readonly DialogueLine[] {
  return block.lines;
}

export function StepView({ step, pageKey, titleTh, clip }: StepViewProps) {
  if (step.kind === "profile") return <ProfileStep />;
  const block = step.block;
  if (!block) return null;
  switch (block.kind) {
    case "dialogue":
      return (
        <>
          <DialogueStep pageKey={pageKey} stepId={block.id} groups={dialogueGroups(linesOf(block))} />
          {textChips(block.lines.map((l) => l.text))}
        </>
      );
    case "copy":
      if (block.role === "quote") {
        return <ItemCard item="intel" text={block.text} titleTh={block.titleTh} />;
      }
      return (
        <>
          <DialogueStep
            pageKey={pageKey}
            stepId={block.id}
            groups={[{ speaker: copySpeaker(block.role), lines: splitDialogue(block.text.th) }]}
          />
          {textChips([block.text])}
        </>
      );
    case "item":
      return (
        <ItemCard
          item={block.item}
          text={block.text}
          titleTh={block.titleTh}
          metaTh={block.metaTh}
          simulated={block.simulated}
        />
      );
    case "game":
      return (
        <GameIsland
          pageKey={pageKey}
          blockId={block.id}
          game={block.game}
          track={block.track}
          answersTh={block.answersTh}
        />
      );
    case "bespoke":
      return (
        <>
          <BespokeIsland
            pageKey={pageKey}
            blockId={block.id}
            component={block.component}
            props={block.props}
            fallbackTh={block.fallbackTh}
            track={block.track}
          />
          <FactChips factIds={block.factIds} simulated={block.simulated} />
        </>
      );
    case "clip":
      return clip ? <GuideClip pageKey={pageKey} stepId={block.id} titleTh={titleTh} clip={clip} /> : null;
    case "safety":
      return <SafetyCard lineTh={block.lineTh} />;
    case "link":
      return <GuideLinkButton pageKey={pageKey} labelTh={block.labelTh} href={block.href} cta={block.cta} />;
    case "shareCard":
      return <MidShareStep />;
    case "outro":
      return <GuideOutroStep />;
    case "beat":
      // Beats are flattened by buildLevelSteps.
      return null;
  }
}

/** The no-JS sources list (the sheet needs JS). */
export function StaticFactList({ facts }: { facts: readonly Fact[] }) {
  if (!facts.length) return null;
  return (
    <section className="rg-static-facts" aria-label="ที่มาของข้อมูล">
      <p className="rg-answers__title">ที่มา</p>
      <ul>
        {facts.map((fact) => (
          <li key={fact.id}>
            {fact.sources.map((s) => (
              <a key={s.url} href={s.url} rel="noopener noreferrer">
                {s.outlet}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
