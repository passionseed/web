import { T } from "@/components/shift/theme/tokens";

/**
 * Small printed illustrations for the round page. Colours come from the
 * round's theme variables, so the same art reads right on the holo, pixel,
 * and riso pages. Motion classes live in shiftRound.css.
 */

const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Solid paper and ink keep each certificate legible where the sheets overlap.
const CERTIFICATE_PAPER = `color-mix(in srgb, ${T.text} 80%, ${T.bg})`;
const CERTIFICATE_INK = `color-mix(in srgb, ${T.bg} 80%, ${T.text})`;

function Certificate({ rotate, x, y }: { rotate: number; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} 70 45)`}>
      <rect
        width="140"
        height="92"
        rx="3"
        fill={CERTIFICATE_PAPER}
        stroke={CERTIFICATE_INK}
        strokeWidth="2"
      />
      <rect
        x="7"
        y="7"
        width="126"
        height="78"
        rx="2"
        fill="none"
        stroke={CERTIFICATE_INK}
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <path
        d="M30 30h80M42 44h56M48 56h44"
        stroke={CERTIFICATE_INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="112" cy="70" r="9" fill={CERTIFICATE_INK} />
    </g>
  );
}

/** A pile of identical participation certificates. Grey on purpose. */
export function CertStackArt() {
  return (
    <svg viewBox="0 0 240 170" className="h-auto w-full max-w-[260px]" aria-hidden="true">
      <Certificate rotate={-9} x={36} y={46} />
      <Certificate rotate={5} x={62} y={38} />
      <Certificate rotate={-2} x={48} y={28} />
      <g transform="translate(186 34) rotate(12)">
        <rect
          x="-30"
          y="-14"
          width="60"
          height="28"
          rx="4"
          fill={T.bg}
          stroke={T.text}
          strokeWidth="2"
        />
        <text
          textAnchor="middle"
          y="6"
          fontSize="16"
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
          fill={T.text}
        >
          ×1,000
        </text>
      </g>
    </svg>
  );
}

/** A live product window: working chart, a real cursor, a LIVE light. */
export function LiveWindowArt() {
  const bars = [
    { x: 30, h: 34, c: T.accent1 },
    { x: 58, h: 52, c: T.accent2 },
    { x: 86, h: 44, c: T.accent3 },
    { x: 114, h: 66, c: T.accent1 },
  ];
  return (
    <svg viewBox="0 0 240 170" className="h-auto w-full max-w-[260px]" aria-hidden="true">
      <g transform="translate(24 18)">
        <rect
          x="4"
          y="4"
          width="192"
          height="134"
          rx="8"
          fill={mix(T.accent4, 45)}
        />
        <rect
          width="192"
          height="134"
          rx="8"
          fill={T.bg}
          stroke={T.text}
          strokeWidth="2.5"
        />
        <path d="M0 24h192" stroke={mix(T.text, 40)} strokeWidth="2" />
        <circle cx="13" cy="12" r="3" fill={T.accent1} />
        <circle cx="24" cy="12" r="3" fill={T.accent3} />
        <circle cx="35" cy="12" r="3" fill={mix(T.text, 40)} />

        <g transform="translate(150 12)">
          <circle r="9" fill={T.accent2} className="shift-pulse" />
          <circle r="3.5" fill={T.accent2} />
          <text
            x="8"
            y="4"
            fontSize="10"
            fontWeight="700"
            fontFamily="ui-monospace, monospace"
            fill={T.text}
          >
            LIVE
          </text>
        </g>

        <path d="M18 120h156" stroke={mix(T.text, 30)} strokeWidth="1.5" />
        <g>
          {bars.map((bar) => (
            <rect
              key={bar.x}
              className="shift-bar"
              x={bar.x}
              y={120 - bar.h}
              width="18"
              height={bar.h}
              rx="2"
              fill={bar.c}
            />
          ))}
        </g>
        <path
          d="M146 70l20-18 12 8"
          fill="none"
          stroke={T.accent3}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="146" y="92" width="2" height="14" fill={T.text} className="shift-blink" />
      </g>
      <path
        d="M178 128l18 7-7 3-3 7z"
        fill={T.text}
        stroke={T.bg}
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="shift-float"
      />
    </svg>
  );
}

/**
 * Autonomy, competence, relatedness as three overlapping rings with a
 * dotted orbit turning around them. The overlap in the middle is "you".
 */
export function SdtRingsArt({ labels }: { labels: [string, string, string] }) {
  const rings = [
    { cx: 130, cy: 92, c: T.accent1, float: "shift-float", lx: 130, ly: 62 },
    { cx: 96, cy: 150, c: T.accent2, float: "shift-float-b shift-float", lx: 72, ly: 172 },
    { cx: 164, cy: 150, c: T.accent3, float: "shift-float-c shift-float", lx: 188, ly: 172 },
  ];
  return (
    <svg viewBox="0 0 260 250" className="h-auto w-full max-w-[320px]" aria-hidden="true">
      <g className="shift-orbit">
        <circle
          cx="130"
          cy="128"
          r="118"
          fill="none"
          stroke={mix(T.text, 25)}
          strokeWidth="1.5"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        <circle cx="130" cy="10" r="4" fill={T.accent1} />
        <circle cx="232" cy="187" r="4" fill={T.accent2} />
        <circle cx="28" cy="187" r="4" fill={T.accent3} />
      </g>
      {rings.map((ring, i) => (
        <g key={i} className={ring.float}>
          <circle
            cx={ring.cx}
            cy={ring.cy}
            r="58"
            fill={mix(ring.c, 16)}
            stroke={ring.c}
            strokeWidth="2.5"
          />
          <text
            x={ring.lx}
            y={ring.ly}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            letterSpacing="2"
            fontFamily="ui-monospace, monospace"
            fill={ring.c}
          >
            {labels[i].toUpperCase()}
          </text>
        </g>
      ))}
      <circle cx="130" cy="130" r="5" fill={T.text} />
    </svg>
  );
}
