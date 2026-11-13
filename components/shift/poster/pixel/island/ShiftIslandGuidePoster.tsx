import type { ReactNode } from "react";

import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";
import { PassionSeedMark } from "@/components/shift/poster/riso";
import { PixelIcon, Rects } from "@/components/shift/poster/pixel/PixelRects";
import { bands, disc, mix, sprite, type Rect } from "@/components/shift/poster/pixel/pixelKit";

import { COIN, GUIDE_ICONS, dawnPalette } from "./guidePosterArt";
import { ISLAND_GUIDE_POSTER as COPY, type GuidePart, type GuideStep } from "./guidePosterCopy";

/**
 * SHIFT Island guide poster, 1080x1350, for the test group in the SHIFT
 * Discord. Key art first: the island at dawn (students land at dawn, lore
 * section 12), the campfire as the one light, and left to right in step
 * order: an empty plot, the campfire, a grown tree with its roots in the soil. The soil falls into night, and the
 * three steps sit there, numbered like the labels on the picture.
 *
 * Every sprite is the island's own (bot/assets/island), tinted by the live
 * island's dawn light. Copy: ./guidePosterCopy.ts.
 */

export const ISLAND_GUIDE_POSTER_ID = "shift-island-guide";

const W = 1080;
const H = 1350;
/** Px per native pixel for the ground tiles and the sky. */
const TILE_CELL = 4;
const TILE = 16;

/** Scene rows, in px. */
const SKY_END = 272;
const SHORE_TOP = 400;
const GRASS_TOP = 464;
const GROUND = 640;
/** Top of the steps, on the night under the soil. */
const STEPS_TOP = 750;

const DAWN = dawnPalette();
/** The campfire's pit keeps its embers lit, as on the live island (atlas LIT_KEYS). */
const PIT = dawnPalette("yi");

const C = {
  ink: "#182326",
  cream: DAWN.f,
  gold: "#F4C56A",
  ember: "#F09A5B",
  sea: "#59A9BE",
  discordGrey: "#4E5058",
  discordCode: "#2B2D31",
} as const;

const MONO = "var(--font-space-mono), ui-monospace, monospace";

/* ---------- picture ---------- */

function tileRow(name: string, y: number, cols: number): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < cols; i++) out.push(...sprite(SPRITES[name], DAWN, i * TILE, y));
  return out;
}

/** Sky, sun, sea, shore, grass and the soil falling into night, as one pixel layer. */
function Ground() {
  const cols = W / TILE_CELL;
  const tiles = Math.ceil(cols / TILE);
  const g = (px: number) => px / TILE_CELL;
  const sea: Rect[] = [];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < tiles; i++) {
      sea.push(...sprite(SPRITES[(i + r) % 2 ? "water_a" : "water_b"], DAWN, i * TILE, g(SKY_END) + r * TILE));
    }
  }
  const grass: Rect[] = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < tiles; i++) {
      const name = (i * 7 + r * 3) % 5 === 0 ? "grass_c" : (i + r) % 2 ? "grass_a" : "grass_b";
      grass.push(...sprite(SPRITES[name], DAWN, i * TILE, g(GRASS_TOP) + r * TILE));
    }
  }
  const soil = DAWN.b;
  const rects: Rect[] = [
    ...bands(0, cols, [
      [0, "#27375a"],
      [24, "#34476f"],
      [44, "#4f5d88"],
      [58, "#86769a"],
      [68, "#c48a8c"],
      [76, "#eba97c"],
      [g(SKY_END), C.gold],
    ]),
    ...disc(206, g(SKY_END) + 2, 11, "#ffe3a6"),
    ...sea,
    ...tileRow("shore_n", g(SHORE_TOP), tiles),
    ...grass,
    ...bands(0, cols, [
      [g(GROUND), DAWN.c],
      [g(GROUND) + 1, soil],
      [g(GROUND) + 14, mix(soil, C.ink, 0.45)],
      [g(GROUND) + 26, mix(soil, C.ink, 0.8)],
      [g(GROUND) + 36, C.ink],
      [H / TILE_CELL, C.ink],
    ]),
  ];
  return (
    <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${cols} ${H / TILE_CELL}`} shapeRendering="crispEdges" aria-hidden="true">
      <Rects rects={rects} />
    </svg>
  );
}

/** One island sprite at `scale` px per pixel, its top left at x, y. */
function Sprite({
  rows,
  palette = DAWN,
  scale,
  x,
  y,
  flip,
  glow,
}: {
  rows: string[];
  palette?: Record<string, string>;
  scale: number;
  x: number;
  y: number;
  flip?: boolean;
  glow?: string;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: flip ? "scaleX(-1)" : undefined,
        filter: glow ? `drop-shadow(0 0 ${scale * 3}px ${glow})` : undefined,
      }}
    >
      <PixelIcon grid={rows} palette={palette} scale={scale} />
    </div>
  );
}

/** The campfire as the live plaza seats it (app/shift/island/guide/pictures.tsx), at `scale`. */
function Campfire({ x, y, scale }: { x: number; y: number; scale: number }) {
  const at = (px: number) => px * scale;
  const sitter = (name: keyof typeof MOTION_SPRITES, sx: number, sy: number, flip: boolean) => (
    <Sprite rows={MOTION_SPRITES[name]} scale={scale} x={x + at(sx)} y={y + at(sy)} flip={flip} />
  );
  return (
    <>
      {/* The one light in the picture: a warm pool on the grass around the pit. */}
      <div
        className="absolute rounded-full"
        style={{
          left: x + at(17) - 260,
          top: y + at(17) - 170,
          width: 520,
          height: 340,
          background: `radial-gradient(closest-side, ${C.gold}66, ${C.ember}22 60%, transparent)`,
          mixBlendMode: "screen",
        }}
      />
      <Sprite rows={MOTION_SPRITES.campfire_pit} palette={PIT} scale={scale} x={x + at(10)} y={y + at(12)} />
      {sitter("sit_c_0", 2, 0, false)}
      {sitter("sit_d_0", 24, 0, true)}
      <Sprite rows={MOTION_SPRITES.campfire_flame_0} palette={dawnPalette("yifrpk")} scale={scale} x={x + at(12)} y={y + at(4)} glow={`${C.gold}cc`} />
      {sitter("sit_a_0", 0, 20, false)}
      {sitter("sit_b_0", 26, 20, true)}
    </>
  );
}

/** A label on the picture: the step's number and a short Thai phrase on an ink plate. */
function Tag({ n, text, x, y }: { n?: number; text: string; x: number; y: number }) {
  return (
    <div
      className="absolute flex items-center gap-[12px] py-[6px] pl-[8px] pr-[18px]"
      style={{ left: x, top: y, backgroundColor: C.ink, boxShadow: `6px 6px 0 ${C.ink}66` }}
    >
      {n !== undefined ? <Num n={n} size={40} /> : null}
      <span className="whitespace-nowrap font-kodchasan text-[32px] font-bold leading-[1.25]" style={{ color: C.cream }}>
        {text}
      </span>
    </div>
  );
}

function Num({ n, size }: { n: number; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center font-kodchasan font-bold leading-none"
      style={{ width: size, height: size, fontSize: size * 0.68, backgroundColor: C.gold, color: C.ink }}
    >
      {n}
    </span>
  );
}

const TREE = { x: 704, scale: 10 } as const;
const PLOT = { x: 44, scale: 5, ground: 556 } as const;
const FIRE = { x: 330, y: 428, scale: 7 } as const;

function Picture() {
  const treeTop = GROUND - 39 * TREE.scale;
  const plotTop = PLOT.ground - 39 * PLOT.scale;
  return (
    <>
      <Ground />
      <Sprite rows={SPRITES.boat} scale={4} x={560} y={SKY_END + 22} />
      <Sprite rows={MOTION_SPRITES.gull_0} scale={4} x={846} y={SKY_END - 150} />
      <Sprite rows={MOTION_SPRITES.gull_1} scale={4} x={930} y={SKY_END - 186} />
      <Sprite rows={SPRITES.stage_0} scale={PLOT.scale} x={PLOT.x} y={plotTop} />
      <Sprite rows={MOTION_SPRITES.builder_0} scale={6} x={PLOT.x + 172} y={PLOT.ground - 80} />
      <Campfire x={FIRE.x} y={FIRE.y} scale={FIRE.scale} />
      <Sprite rows={SPRITES.stage_5} scale={TREE.scale} x={TREE.x} y={treeTop} />
      <Sprite rows={SPRITES.roots_3} scale={TREE.scale} x={TREE.x} y={GROUND + TREE.scale} />
    </>
  );
}

function Labels() {
  const L = COPY.labels;
  return (
    <>
      <Tag n={1} text={L.plot} x={PLOT.x - 8} y={PLOT.ground - 196} />
      <Tag n={3} text={L.tree} x={TREE.x - 104} y={GROUND - 222} />
      <Tag n={2} text={L.fire} x={FIRE.x + 6} y={FIRE.y - 76} />
      <Tag text={L.roots} x={TREE.x - 200} y={GROUND + 26} />
    </>
  );
}

/* ---------- type ---------- */

function Headline() {
  const parts = COPY.headline.split(/(==[^=]+==)/g).filter(Boolean);
  return (
    <div className="absolute left-[64px] top-[40px]">
      <h1 className="whitespace-pre-line font-kodchasan text-[90px] font-bold leading-[1.12] tracking-[-0.01em]" style={{ color: C.cream }}>
        {parts.map((p, i) =>
          p.startsWith("==") ? (
            <span key={i} style={{ color: C.gold }}>
              {p.slice(2, -2)}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </h1>
    </div>
  );
}

const ICON_SCALE: Record<string, number> = { seed: 2, star: 2, flame: 3, wave: 3, pencil: 2 };

function Icon({ name }: { name: keyof typeof GUIDE_ICONS }) {
  return <PixelIcon grid={GUIDE_ICONS[name]} palette={dawnPalette("yifrpkuvwo")} scale={ICON_SCALE[name]} className="shrink-0" />;
}

/** A Discord button, pixel-cornered, with the bot's own label. */
function Button({ children }: { children: ReactNode }) {
  return (
    <span
      className="mx-[4px] inline-flex items-center gap-[8px] px-[14px] align-middle text-[26px] font-semibold leading-[44px]"
      style={{
        backgroundColor: C.discordGrey,
        color: "#ffffff",
        clipPath: "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))",
      }}
    >
      {children}
    </span>
  );
}

function Part({ part }: { part: GuidePart }) {
  if ("text" in part) return <Words text={part.text} />;
  if ("command" in part) {
    return (
      <>
        <code className="mx-[4px] px-[10px] py-[2px] align-middle text-[25px] font-bold" style={{ fontFamily: MONO, backgroundColor: C.discordCode, color: C.gold }}>
          {part.command}
        </code>{" "}
      </>
    );
  }
  if ("button" in part) {
    return (
      <>
        <Button>
          <Icon name={part.icon} />
          {part.button}
        </Button>{" "}
      </>
    );
  }
  const tone = part.tone === "focus" ? C.ember : C.sea;
  return (
    <>
      <span
        className="mx-[4px] inline-flex items-center gap-[8px] px-[12px] align-middle text-[26px] font-semibold leading-[42px]"
        style={{ border: `3px solid ${tone}`, color: C.cream }}
      >
        <Icon name={part.icon} />
        {part.phase}
      </span>{" "}
    </>
  );
}

/**
 * Thai wraps only at the spaces between phrases: each phrase is kept whole,
 * so a loan word like โปรเจกต์ never splits across lines.
 */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span className="whitespace-nowrap">{w}</span>{" "}
        </span>
      ))}
    </>
  );
}

/** A numbered row: the badge, then the step's name in bold leading into its lines. */
function Row({ badge, children }: { badge: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-[20px]">
      <span className="mt-[2px] flex w-[46px] shrink-0 justify-center">{badge}</span>
      <div className="min-w-0 text-[26px] leading-[48px]" style={{ color: `${C.cream}e6` }}>
        {children}
      </div>
    </li>
  );
}

function Step({ step }: { step: GuideStep }) {
  return (
    <Row badge={<Num n={step.n} size={44} />}>
      {step.lines.map((line, i) => (
        <p key={i}>
          {i === 0 ? (
            <span className="mr-[12px] whitespace-nowrap font-kodchasan text-[32px] font-bold" style={{ color: C.cream }}>
              {step.title}
            </span>
          ) : null}
          {line.map((part, j) => (
            <Part key={j} part={part} />
          ))}
        </p>
      ))}
    </Row>
  );
}

function Steps() {
  return (
    <ol className="absolute inset-x-[64px] flex flex-col gap-[16px]" style={{ top: STEPS_TOP }}>
      {COPY.steps.map((s) => (
        <Step key={s.n} step={s} />
      ))}
      <Row badge={<PixelIcon grid={COIN} palette={dawnPalette("yife")} scale={3} className="shrink-0" />}>
        <p>
          <Words text={COPY.coins.line} />
          {COPY.coins.commands.map((c) => (
            <Part key={c} part={{ command: c }} />
          ))}
        </p>
      </Row>
    </ol>
  );
}

function Footer() {
  return (
    <div
      className="absolute inset-x-[64px] bottom-[30px] flex items-center justify-between border-t-[3px] pt-[18px]"
      style={{ borderColor: `${C.cream}26` }}
    >
      <PassionSeedMark size={30} />
      <p className="text-[24px]" style={{ color: `${C.cream}cc` }}>
        {COPY.more.label}{" "}
        <span className="font-bold" style={{ fontFamily: MONO, color: C.gold }}>
          {COPY.more.link}
        </span>
      </p>
    </div>
  );
}

export function ShiftIslandGuidePoster({ id = ISLAND_GUIDE_POSTER_ID }: { id?: string }) {
  return (
    <div
      id={id}
      lang="th"
      role="img"
      aria-label={COPY.alt}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: W, height: H, backgroundColor: C.ink }}
    >
      <Picture />
      <Labels />
      <Headline />
      <Steps />
      <Footer />
    </div>
  );
}
