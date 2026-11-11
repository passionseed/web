import { PIXEL_PALETTE, type LegendEntry } from "@/lib/content/ps01-handmade";
import styles from "./ps01.module.css";

const EMPTY = "#2a1534";

type PixelChartProps = {
  rows: string[];
  legend: LegendEntry[];
  /** Maps a grid character to a legend key (e.g. four disc tones to two threads). */
  keyFor?: (c: string) => string;
  cell?: number;
};

/** A stitch/stencil chart: one square per pixel, symbols, and a bold line every 4 squares. */
export function PixelChart({ rows, legend, keyFor = (c) => c, cell = 30 }: PixelChartProps) {
  const h = rows.length;
  const w = rows[0].length;
  const byKey = new Map(legend.map((l) => [l.key, l]));
  const counts = [];
  for (let i = 0; i <= w; i += 4) counts.push(i);
  const rowLines = [];
  for (let i = h; i >= 0; i -= 4) rowLines.push(i);

  return (
    <div className={styles.gridScroll}>
      <svg
        width={w * cell}
        height={h * cell}
        viewBox={`-1 -1 ${w * cell + 2} ${h * cell + 2}`}
        role="img"
        aria-label={`Chart, ${w} by ${h} squares`}
      >
        {rows.flatMap((row, y) =>
          [...row].map((c, x) => {
            const entry = byKey.get(keyFor(c));
            return (
              <g key={`${x}-${y}`}>
                <rect
                  x={x * cell}
                  y={y * cell}
                  width={cell}
                  height={cell}
                  fill={entry ? entry.color : EMPTY}
                  stroke="rgba(255,255,255,.14)"
                />
                {entry && (
                  <text
                    x={x * cell + cell / 2}
                    y={y * cell + cell * 0.66}
                    fontFamily="var(--font-space-mono), monospace"
                    fontSize={cell * 0.42}
                    fontWeight={700}
                    textAnchor="middle"
                    fill={entry.ink}
                  >
                    {entry.key}
                  </text>
                )}
              </g>
            );
          })
        )}
        {counts.map((x) => (
          <line key={`c${x}`} x1={x * cell} y1={0} x2={x * cell} y2={h * cell} stroke="rgba(254,249,231,.55)" strokeWidth={2} />
        ))}
        {rowLines.map((y) => (
          <line key={`r${y}`} x1={0} y1={y * cell} x2={w * cell} y2={y * cell} stroke="rgba(254,249,231,.55)" strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}

export function ChartLegend({ legend, showEmpty = false }: { legend: LegendEntry[]; showEmpty?: boolean }) {
  return (
    <div className={styles.legend}>
      {legend.map((l) => (
        <span key={l.key}>
          <i style={{ background: l.color, color: l.ink }}>{l.key}</i>
          {l.name}
        </span>
      ))}
      {showEmpty && (
        <span>
          <i style={{ background: EMPTY }} />
          Empty: shirt shows
        </span>
      )}
    </div>
  );
}

/** Plain pixels with no grid, for the logo and shirt previews. */
export function PixelArt({ rows, x0 = 0, y0 = 0, size = 1 }: { rows: string[]; x0?: number; y0?: number; size?: number }) {
  return (
    <>
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => {
          const fill = PIXEL_PALETTE[c];
          return fill ? (
            <rect key={`${x}-${y}`} x={x0 + x * size} y={y0 + y * size} width={size + 0.05} height={size + 0.05} fill={fill} />
          ) : null;
        })
      )}
    </>
  );
}
