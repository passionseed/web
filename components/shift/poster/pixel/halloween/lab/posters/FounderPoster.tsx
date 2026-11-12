import { SHIFT3 } from "../../../../shift3/facts";
import { BAT, BAT_PALETTE, HX } from "../../halloweenKit";
import { CAP, CAP_PALETTE, FEDORA, FEDORA_PALETTE, HARD_HAT, HARD_HAT_PALETTE, WITCH, WITCH_PALETTE } from "../labArt";
import { MONO, Moon, Night, Poster, Skyline, Sprite } from "../kit";

/**
 * The founder: a hero shot. The student stands in front of a huge moon
 * while the other hats a founder wears circle them. Every hat is theirs.
 */

const ORBIT = { cx: 540, cy: 560, rx: 430, ry: 96, tilt: -5 };
const HERO_CELL = 26;

/** A point on the tilted orbit; 0-180 degrees is the near side. */
function orbit(deg: number) {
  const a = (deg * Math.PI) / 180;
  const t = (ORBIT.tilt * Math.PI) / 180;
  const dx = ORBIT.rx * Math.cos(a);
  const dy = ORBIT.ry * Math.sin(a);
  return { x: ORBIT.cx + dx * Math.cos(t) - dy * Math.sin(t), y: ORBIT.cy + dx * Math.sin(t) + dy * Math.cos(t) };
}

interface Hat {
  grid: string[];
  palette: Record<string, string>;
  cell: number;
  deg: number;
  role: string;
  /** What the hat does, in Thai: the label people actually read. */
  job: string;
}

/** Back hat first: it is drawn behind the hero. */
const BACK_HAT: Hat = { grid: FEDORA, palette: FEDORA_PALETTE, cell: 8, deg: 232, role: "RESEARCH", job: "คุยกับคนจริง" };
const FRONT_HATS: Hat[] = [
  { grid: CAP, palette: CAP_PALETTE, cell: 13, deg: 160, role: "GROWTH", job: "หาคนมาลองใช้" },
  { grid: HARD_HAT, palette: HARD_HAT_PALETTE, cell: 13, deg: 24, role: "BUILD", job: "สร้างต้นแบบ" },
];

function OrbitHat({ grid, palette, cell, deg }: Hat) {
  const p = orbit(deg);
  return <Sprite grid={grid} palette={palette} cell={cell} x={p.x - (grid[0].length * cell) / 2} y={p.y - (grid.length * cell) / 2} />;
}

/**
 * Label under a hat. Read in one fixation: a short Thai verb phrase (the
 * job, in the reader's first language) in the headline face on a solid ink
 * plate, so it separates from the moon and the lit windows behind it. The
 * English role sits above, small, for anyone who knows the startup word.
 */
function HatLabel({ x, y, role, job }: { x: number; y: number; role: string; job: string }) {
  return (
    <div className="absolute -translate-x-1/2 px-[16px] pb-[8px] pt-[6px] text-center" style={{ left: x, top: y, backgroundColor: HX.ink }}>
      <p className="text-[15px] font-bold tracking-[0.14em]" style={{ fontFamily: MONO, color: HX.pumpkin }}>
        {role}
      </p>
      <p className="whitespace-nowrap font-kodchasan text-[30px] font-bold leading-[1.2]" style={{ color: HX.cream }}>
        {job}
      </p>
    </div>
  );
}

function hatLabelAt({ grid, cell, deg }: Hat) {
  const p = orbit(deg);
  return { x: p.x, y: p.y + (grid.length * cell) / 2 + 12 };
}

/** The ring: back half behind the hero, front half over them. */
function OrbitRing({ half }: { half: "back" | "front" }) {
  const { cx, cy, rx, ry, tilt } = ORBIT;
  const clipId = `founder-orbit-${half}`;
  return (
    <svg className="absolute inset-0" width={1080} height={1350} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y={half === "back" ? 0 : cy} width="1080" height={half === "back" ? cy : 1350 - cy} />
        </clipPath>
      </defs>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        transform={`rotate(${tilt} ${cx} ${cy})`}
        fill="none"
        stroke={HX.lavender}
        strokeOpacity={half === "back" ? 0.35 : 0.7}
        strokeWidth="4"
        strokeDasharray="6 12"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

export function FounderPoster({ id }: { id: string }) {
  const heroW = WITCH[0].length * HERO_CELL;
  return (
    <Poster
      id={id}
      headline={"หมวกทุกใบ\n==เป็นของคุณ=="}
      sub={`ทีมแค่ ${SHIFT3.team} ไม่มีใครคิดแทน ทุกบทบาทคุณลองเอง`}
      front={
        <>
          {/* The hero's own hat: label beside the brim, where the eye already is. */}
          <HatLabel x={826} y={384} role="CEO" job="เลือกโจทย์เอง" />
          {[BACK_HAT, ...FRONT_HATS].map((hat) => (
            <HatLabel key={hat.role} {...hatLabelAt(hat)} role={hat.role} job={hat.job} />
          ))}
        </>
      }
    >
      <Night light={[540, 380]} />
      <Moon x={540} y={370} r={290} />
      <Sprite grid={BAT} palette={BAT_PALETTE} cell={8} x={210} y={170} rotate={-12} />
      <Sprite grid={BAT} palette={BAT_PALETTE} cell={5} x={820} y={120} rotate={10} />
      <Skyline top={560} bottom={800} />
      <Skyline top={650} bottom={800} color={HX.mid} lit={0.22} seed={5} />
      <OrbitRing half="back" />
      <OrbitHat {...BACK_HAT} />
      <Sprite grid={WITCH} palette={WITCH_PALETTE} cell={HERO_CELL} x={540 - heroW / 2} y={290} />
      <OrbitRing half="front" />
      {FRONT_HATS.map((hat) => (
        <OrbitHat key={hat.role} {...hat} />
      ))}
    </Poster>
  );
}
