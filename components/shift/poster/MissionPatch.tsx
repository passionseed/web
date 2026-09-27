import { useId, type CSSProperties } from "react";

import { INK } from "./riso";

/**
 * Embroidered mission patch for the SHIFT[2] crew poster: a thick merrowed
 * rim, a stitched ring inside it, a label running round the top arc and a
 * sub-label round the bottom. `open` draws the empty seat the student fills:
 * no fill, dashed rim, like a patch that has not been sewn on yet.
 */
export function MissionPatch({
  size,
  ink,
  top,
  bottom,
  center,
  centerSize = 0.3,
  open = false,
  style,
}: {
  size: number;
  ink: string;
  top: string;
  bottom: string;
  center: string;
  /** Center glyph size as a fraction of the patch. */
  centerSize?: number;
  open?: boolean;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const r = 100;
  const textR = 66;
  const arcTop = `M ${r - textR} ${r} A ${textR} ${textR} 0 0 1 ${r + textR} ${r}`;
  const arcBottom = `M ${r - textR - 18} ${r} A ${textR + 18} ${textR + 18} 0 0 0 ${r + textR + 18} ${r}`;
  const thread = INK.paper;

  return (
    <svg
      className="absolute"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        filter: open ? undefined : "drop-shadow(0 8px 14px rgba(8,4,20,0.5))",
        ...style,
      }}
      aria-hidden="true"
    >
      <defs>
        <path id={`${id}-top`} d={arcTop} />
        <path id={`${id}-bottom`} d={arcBottom} />
      </defs>

      {open ? (
        <>
          <circle cx={r} cy={r} r={96} fill={`${INK.black}66`} />
          <circle
            cx={r}
            cy={r}
            r={94}
            fill="none"
            stroke={thread}
            strokeWidth={3}
            strokeDasharray="10 8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Merrowed rim */}
          <circle cx={r} cy={r} r={97} fill={INK.paper} />
          <circle cx={r} cy={r} r={88} fill={ink} />
          {/* Stitched ring */}
          <circle
            cx={r}
            cy={r}
            r={58}
            fill="none"
            stroke={thread}
            strokeOpacity={0.7}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </>
      )}

      <text
        fill={thread}
        fontFamily="var(--font-kodchasan), sans-serif"
        fontWeight={700}
        fontSize={25}
        letterSpacing="1.5"
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text
        fill={thread}
        fontFamily="var(--font-kodchasan), sans-serif"
        fontWeight={600}
        fontSize={21}
        letterSpacing="1"
        fillOpacity={0.85}
      >
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {bottom}
        </textPath>
      </text>
      <text
        x={r}
        y={r}
        fill={thread}
        fontFamily="var(--font-kodchasan), sans-serif"
        fontWeight={700}
        fontSize={200 * centerSize}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {center}
      </text>
    </svg>
  );
}
