import { tint } from "@/components/shift/theme/tokens";

import { StageSprite } from "./StageSprite";

/**
 * The island's one rule as a picture: the same tree at every stage, left to
 * right on one ground line, from an empty plot to blossom. Nothing to press.
 * The row keeps the home page's class name (`home-stage-row`) so the invite
 * letter's module (`.tree :global(.home-stage-row)`) lays it out on paper.
 */
export function IslandTree({ stages, caption }: { stages: readonly string[]; caption: string }) {
  return (
    <figure>
      <div className="home-stage-row" aria-hidden="true">
        {stages.map((name, stage) => (
          <StageSprite key={name} stage={stage} scale={1} />
        ))}
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed" style={{ color: tint("b8") }}>
        {caption}
      </figcaption>
    </figure>
  );
}
