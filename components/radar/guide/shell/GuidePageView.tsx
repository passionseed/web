/**
 * One level of a guide (server component). A pixel scene header with the
 * level number, title and question; the "ข้อมูล ณ ... · ที่มา" chip; then the
 * level's steps behind the sticky "ต่อ ▶" (dialogue, in-world items, games,
 * the cutscene...). Render inside <GuideShellProvider> (the (guide) layout, or
 * the filming frame with `forceDemo` and `chrome={false}`).
 *
 * No-JS: every step, the static answers and the fact list are in the HTML.
 */
import Link from "next/link";
import { PixelScene } from "@/components/radar/guide/story";
import type { Fact, GuideIndexEntry, GuidePage } from "@/lib/radar-guide/guide-types";
import { levelSceneSrc, nextLevelKey } from "@/lib/radar-guide/story";
import { StaticFactList, StepView } from "./BlockRenderer";
import { DemoPlayer } from "./DemoPlayer";
import type { GuideClipData } from "./GuideClip";
import { levelHref } from "./guide-routes";
import { buildLevelSteps, pageDemoScript } from "./level-steps";
import { LevelStepper } from "./LevelStepper";
import { SourcesChip } from "./SourcesChip";

export interface GuidePageViewProps {
  /** Index with derived games/cutscene (registry.server guideIndexFor). */
  index: GuideIndexEntry;
  page: GuidePage;
  clip: GuideClipData | null;
  /** The level's facts in page.factIds order. */
  facts: readonly Fact[];
}

export function GuidePageView({ index, page, clip, facts }: GuidePageViewProps) {
  const ordered = [...index.pages].sort((a, b) => a.order - b.order);
  const final = ordered[ordered.length - 1]?.key === page.key;
  const steps = buildLevelSteps(page, { final }).filter((s) => s.kind !== "clip" || clip);
  const indexPage = index.pages.find((p) => p.key === page.key);
  const scene = indexPage?.scene ?? levelSceneSrc(index.slug, page.key);
  const nextKey = nextLevelKey(index.pages, page.key);

  return (
    <article className="rg-level" data-page={page.key}>
      <PixelScene
        src={scene}
        level={page.order}
        total={index.pages.length}
        titleTh={page.titleTh}
        questTh={page.questionTh}
      />

      <div className="rg-level__meta">
        <SourcesChip titleTh={page.titleTh} asOf={page.asOf} facts={facts} />
      </div>

      <LevelStepper
        pageKey={page.key}
        steps={steps.map((step) => ({
          meta: {
            id: step.id,
            kind: step.kind,
            ...(step.labelTh ? { labelTh: step.labelTh } : {}),
            ...(step.pinned ? { pinned: true } : {}),
          },
          content: <StepView step={step} pageKey={page.key} titleTh={page.titleTh} clip={clip} />,
        }))}
      />

      <noscript>
        <StaticFactList facts={facts} />
        {nextKey ? (
          <Link href={levelHref(index.slug, nextKey)} className="rg-pixel-btn rg-pixel-btn--accent">
            ด่านต่อไป
          </Link>
        ) : null}
      </noscript>

      <DemoPlayer steps={pageDemoScript(page)} />
    </article>
  );
}
