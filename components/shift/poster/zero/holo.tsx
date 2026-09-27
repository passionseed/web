import type { CSSProperties } from "react";

/**
 * Shared look of SHIFT[0], the holographic pilot print: the purple to orange
 * sky, glassy light bands, glass panels, the gradient headline fill and the
 * iridescent wordmark. Used by the gallery banner and the /shift/0 page.
 */

export const SKY =
  "linear-gradient(128deg, #1c0a4a 0%, #3a1275 30%, #7a1b8f 55%, #d0306f 78%, #ff7a2a 100%)";

export const HEADLINE_FILL: CSSProperties = {
  background: "linear-gradient(90deg, #ffe45c 0%, #ffb52e 45%, #ff6a1f 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter: "drop-shadow(0 3px 0 rgba(20, 4, 40, 0.45))",
};

export const GLASS: CSSProperties = {
  background: "linear-gradient(160deg, rgba(30, 10, 60, 0.72), rgba(20, 6, 40, 0.6))",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 12px 30px rgba(10, 2, 24, 0.35)",
  backdropFilter: "blur(6px)",
};

export interface LightBand {
  top: number;
  /** px, or a CSS length such as "40%" for fluid layouts. */
  left: number | string;
  width: number;
  opacity: number;
}

const BANNER_BANDS: LightBand[] = [
  { top: -120, left: 380, width: 150, opacity: 0.1 },
  { top: -160, left: 610, width: 60, opacity: 0.08 },
  { top: -80, left: 900, width: 220, opacity: 0.07 },
];

/** Diagonal glassy light bands laid over the gradient, as on the poster. */
export function LightBands({ bands = BANNER_BANDS }: { bands?: LightBand[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bands.map((b) => (
        <div
          key={String(b.left)}
          className="absolute"
          style={{
            top: b.top,
            left: b.left,
            width: b.width,
            height: 1000,
            transform: "rotate(32deg)",
            background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,${b.opacity}) 50%, rgba(255,255,255,0))`,
          }}
        />
      ))}
    </div>
  );
}

/** Holographic chrome "SHIFT[0]", the poster's iridescent wordmark. */
export function HoloWordmark({ size, name }: { size: number | string; name: string }) {
  const shared: CSSProperties = {
    fontFamily: "var(--font-libre-franklin), sans-serif",
    fontStyle: "italic",
    fontWeight: 700,
    fontSize: size,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
    padding: "0 0.08em",
  };
  return (
    <div className="relative inline-block select-none" style={{ transform: "rotate(-3deg)" }}>
      <p aria-hidden="true" className="absolute inset-0" style={{ ...shared, color: "#1a0636", translate: "5px 6px", opacity: 0.6 }}>
        {name}
      </p>
      <p
        className="relative"
        style={{
          ...shared,
          background:
            "linear-gradient(176deg, #ffffff 0%, #eef2ff 18%, #b9c4e6 34%, #6f6f9e 46%, #c9a2ff 50%, #8ff0ff 60%, #fff3c4 72%, #ff9ecf 84%, #ffffff 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.7)",
          filter: "drop-shadow(0 0 18px rgba(200, 170, 255, 0.35))",
        }}
      >
        {name}
      </p>
    </div>
  );
}
