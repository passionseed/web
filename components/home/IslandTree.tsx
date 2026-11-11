import { StageSprite } from "./StageSprite";
import { tint } from "./homeTheme";

/**
 * The island's one rule as a picture: the same tree at every stage, left to
 * right on one ground line, from an empty plot to blossom. Nothing to press.
 * The sprites are 1x and double once the row is wide enough for all of them
 * at 2x (`.home-stage-row` in home.css), so the scale is always a whole number.
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
