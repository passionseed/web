"use client";

/**
 * "ข้อมูล ณ 11 พ.ย. 2569 · ที่มา": opens the level's sources sheet (every fact
 * on the level: badge, labels, claim, outlet, date, link). Item chips open the
 * same sheet focused on their facts.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";
import { SourcesSheet } from "../SourcesSheet";
import { asOfLabel } from "./guide-format";
import { useGuideShell } from "./shell-context";

export interface SourcesChipProps {
  titleTh: string;
  asOf: string;
  facts: readonly Fact[];
}

export function SourcesChip({ titleTh, asOf, facts }: SourcesChipProps) {
  const { sources, openSources, closeSources, index } = useGuideShell();
  const label = asOfLabel(asOf);
  return (
    <>
      <button
        type="button"
        className="rg-chip rg-chip--asof"
        onClick={() => openSources([])}
        data-testid="sources-chip"
      >
        {label ? `${label} · ที่มา` : "ที่มา"}
      </button>
      <SourcesSheet
        open={sources.open}
        onOpenChange={(open) => (open ? openSources(sources.focus) : closeSources())}
        titleTh={titleTh}
        asOf={asOf}
        facts={facts}
        focus={sources.focus}
        accent={index.accent}
      />
    </>
  );
}
