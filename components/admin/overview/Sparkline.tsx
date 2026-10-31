import { cn } from "@/lib/utils";

/**
 * A tiny inline trend line: pure SVG, no chart library, so the overview never
 * loads Recharts. The drawing is decorative (aria-hidden); pass `label` for
 * the text alternative screen readers get instead.
 */

export interface SparklineGeometry {
  /** Stroke path through every point. */
  line: string;
  /** The line closed down to the baseline, for the faint fill. */
  area: string;
  /** The newest point, marked with a dot. */
  last: { x: number; y: number };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Path data for a series in a width x height box. A flat series draws a level
 * line (at the baseline when it is all zeros); an empty series draws nothing.
 */
export function sparklinePath(
  series: readonly number[],
  width: number,
  height: number,
  pad = 2,
): SparklineGeometry | null {
  if (series.length === 0) return null;
  const values = series.map((v) => (Number.isFinite(v) ? v : 0));
  // One point still reads as a level line across the box.
  const points = values.length === 1 ? [values[0], values[0]] : values;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;
  const step = innerWidth / (points.length - 1);
  const flatY = max === 0 ? height - pad : height / 2;

  const coords = points.map((value, i) => ({
    x: round(pad + i * step),
    y: round(span === 0 ? flatY : pad + (1 - (value - min) / span) * innerHeight),
  }));
  const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = `${line} L${last.x} ${height} L${first.x} ${height} Z`;
  return { line, area, last };
}

/** "30-day trend: low 0, high 12, latest 5." */
export function describeSeries(
  series: readonly number[],
  format: (value: number) => string = String,
): string {
  const values = series.filter((v) => Number.isFinite(v));
  if (values.length === 0) return "No trend data.";
  const days = values.length === 1 ? "1-day" : `${values.length}-day`;
  return `${days} trend: low ${format(Math.min(...values))}, high ${format(
    Math.max(...values),
  )}, latest ${format(values[values.length - 1])}.`;
}

export function Sparkline({
  series,
  width = 96,
  height = 28,
  label,
  className,
}: {
  series: readonly number[];
  width?: number;
  height?: number;
  /** Text alternative, read in place of the drawing. */
  label?: string;
  className?: string;
}) {
  const geometry = sparklinePath(series, width, height);
  if (!geometry) return null;
  return (
    <span className={cn("overview-sparkline", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
        data-testid="sparkline"
      >
        <path d={geometry.area} className="overview-sparkline-area" />
        <path d={geometry.line} className="overview-sparkline-line" fill="none" />
        <circle
          cx={geometry.last.x}
          cy={geometry.last.y}
          r={2}
          className="overview-sparkline-dot"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
