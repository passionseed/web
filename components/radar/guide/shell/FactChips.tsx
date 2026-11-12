"use client";

/**
 * The small chips under a line or an item: source badge, labels (สหรัฐฯ,
 * เราคำนวณเอง...), "จำลอง", and a "ที่มา" button that opens the level's sources
 * sheet focused on these facts.
 */
import {
  COPY_LABEL_TH,
  FACT_BADGE_TH,
  type CopyLabel,
  type FactBadge,
  type FactId,
} from "@/lib/radar-guide/guide-types";
import { useGuideShellOptional } from "./shell-context";

export interface FactChipsProps {
  factIds?: readonly FactId[];
  badge?: FactBadge;
  labels?: readonly CopyLabel[];
  simulated?: boolean;
}

export function FactChips({ factIds = [], badge, labels = [], simulated }: FactChipsProps) {
  const shell = useGuideShellOptional();
  const badges: FactBadge[] = [];
  if (simulated) badges.push("simulated");
  if (badge && !badges.includes(badge)) badges.push(badge);
  if (!badges.length && !labels.length && !factIds.length) return null;
  return (
    <div className="rg-chips">
      {badges.map((b) => (
        <span key={b} className="rg-chip" data-badge={b}>
          {FACT_BADGE_TH[b]}
        </span>
      ))}
      {labels.map((l) => (
        <span key={l} className="rg-chip rg-chip--label">
          {COPY_LABEL_TH[l]}
        </span>
      ))}
      {factIds.length && shell ? (
        <button type="button" className="rg-chip rg-chip--source" onClick={() => shell.openSources(factIds)}>
          ที่มา
        </button>
      ) : null}
    </div>
  );
}
