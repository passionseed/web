/**
 * Per-career card look (gradient, dot pattern, figure) shared by the Radar hub
 * tiles and the field page. Pure; moved out of RadarPageClient so the field
 * page does not pull the hub's client bundle (spec 2.9).
 */
import type { Database } from "@/lib/supabase/database.types";

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type CareerVisualField = Pick<RadarField, "id" | "slug">;

const CAREER_FIGURES = [
  "/images/radar/chardev.webp",
  "/images/radar/data.webp",
] as const;

/**
 * Decorative figures re-encoded at most 60KB for the field page's first
 * section (public/images/radar/detail/). Same art as the hub tiles.
 */
const DETAIL_FIGURES: Record<string, string> = {
  "/images/radar/cybersec.webp": "/images/radar/detail/cybersec.webp",
  "/images/radar/chardev.webp": "/images/radar/detail/chardev.webp",
  "/images/radar/chardev-orange.webp": "/images/radar/detail/chardev-orange.webp",
  "/images/radar/data.webp": "/images/radar/detail/data.webp",
};

/** The light (at most 60KB) variant of a figure, or the figure itself. */
export function detailFigure(figure: string | undefined): string | undefined {
  if (!figure) return figure;
  return DETAIL_FIGURES[figure] ?? figure;
}

const CAREER_CARD_GRADIENT_TEMPLATES = [
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 88% 6%, #fff4bf 0%, transparent 42%), linear-gradient(180deg, #f2cdb7 0%, #d39a6d 72%, #8a5c37 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 86% 100%, #a7ac63 0%, transparent 38%), radial-gradient(circle at 78% 0%, #1b3f9e 0%, transparent 44%), linear-gradient(180deg, #172a35 0%, #07142f 54%, #33431f 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 12% 12%, #ca0b4d 0%, transparent 36%), radial-gradient(circle at 88% 18%, #ffd3e9 0%, transparent 40%), linear-gradient(180deg, #c50d58 0%, #f2d5ff 46%, #e4bfff 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 92% 14%, #fff36a 0%, transparent 40%), linear-gradient(180deg, #e8932a 0%, #ffc900 74%, #f5b300 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 86% 14%, #9a8467 0%, transparent 38%), radial-gradient(circle at 45% 90%, #ffe0bd 0%, transparent 38%), linear-gradient(180deg, #15130f 0%, #39342c 56%, #17120d 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 86% 4%, #b6ddb6 0%, transparent 42%), radial-gradient(circle at 12% 34%, #0586c8 0%, transparent 42%), linear-gradient(145deg, #0088d0 0%, #a8dcb5 54%, #ffffb8 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 72% 44%, #fa62ff 0%, transparent 38%), radial-gradient(circle at 10% 10%, #057f82 0%, transparent 42%), linear-gradient(180deg, #192f60 0%, #7253d7 64%, #403c8f 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 76% 64%, #4b4a1d 0%, transparent 36%), linear-gradient(180deg, #121311 0%, #0b0d0c 58%, #1d2111 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 76% 0%, #fff 0%, transparent 38%), linear-gradient(160deg, #d6c2ff 0%, #edf5ff 52%, #aae9f5 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 20% 10%, #fff4e2 0%, transparent 36%), radial-gradient(circle at 76% 28%, #b06a00 0%, transparent 34%), linear-gradient(150deg, #fff2bd 0%, #ffd05e 58%, #ffb07c 100%)",
  },
  {
    ink: "dark",
    background:
      "linear-gradient(180deg, #ffe69a 0%, #ffd46f 54%, #edbd54 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 16% 14%, #b9b620 0%, transparent 36%), radial-gradient(circle at 80% 34%, #ae276c 0%, transparent 42%), linear-gradient(150deg, #bb9a1c 0%, #b91466 58%, #ba5f46 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 18% 18%, #f0dbff 0%, transparent 36%), radial-gradient(circle at 62% 52%, #ef006b 0%, transparent 46%), linear-gradient(180deg, #f4c9ff 0%, #ff91bd 62%, #f0b19c 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 76% 80%, #a7a7aa 0%, transparent 36%), radial-gradient(circle at 20% 8%, #4b2d72 0%, transparent 42%), linear-gradient(150deg, #4c2e70 0%, #0b1f4d 48%, #6d5048 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 74% 70%, #916e42 0%, transparent 36%), linear-gradient(180deg, #0d0d0c 0%, #111111 62%, #2c2114 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 24% 18%, #ffe0c8 0%, transparent 36%), linear-gradient(180deg, #ffc9c4 0%, #ffd5b4 48%, #c64ec1 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 14% 20%, #d6bfff 0%, transparent 42%), radial-gradient(circle at 80% 60%, #67c49a 0%, transparent 42%), linear-gradient(180deg, #b8d5ff 0%, #c9b9ff 46%, #7bd2b9 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 84% 6%, #1fc966 0%, transparent 42%), linear-gradient(180deg, #9ef7c8 0%, #b5f7e5 56%, #80e4bd 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 22% 82%, #c76720 0%, transparent 42%), linear-gradient(180deg, #0e1018 0%, #0e1118 48%, #bc5209 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 86% 78%, #e6dbff 0%, transparent 38%), linear-gradient(180deg, #2e75e9 0%, #0048c8 56%, #7960d4 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 78% 86%, #fff4b7 0%, transparent 38%), linear-gradient(180deg, #f4c756 0%, #bc9b00 54%, #fff0a2 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 80% 8%, #d5e0ff 0%, transparent 36%), linear-gradient(180deg, #c44394 0%, #a007bc 54%, #6579ef 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 82% 26%, #d08800 0%, transparent 44%), radial-gradient(circle at 72% 84%, #ffdbba 0%, transparent 38%), linear-gradient(180deg, #ea593d 0%, #d17a00 52%, #ffb082 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 10% 90%, #eef1b7 0%, transparent 34%), linear-gradient(180deg, #f9ffff 0%, #eaffff 56%, #87e6f4 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 16% 52%, #fff 0%, transparent 42%), radial-gradient(circle at 82% 10%, #ff291b 0%, transparent 36%), linear-gradient(180deg, #ec6e24 0%, #fff8e4 50%, #e1c41f 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 18% 58%, #ffe9c8 0%, transparent 38%), linear-gradient(180deg, #26300a 0%, #4f5200 58%, #b48f00 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 78% 22%, #c7c14a 0%, transparent 36%), linear-gradient(180deg, #e7fff6 0%, #c2f3ff 56%, #9ed0ef 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 18% 8%, #bd9b00 0%, transparent 36%), radial-gradient(circle at 86% 6%, #2dbb63 0%, transparent 42%), linear-gradient(180deg, #23984f 0%, #3fd783 58%, #34c9a9 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 20% 10%, #fff7df 0%, transparent 34%), radial-gradient(circle at 72% 18%, #a6a600 0%, transparent 44%), linear-gradient(180deg, #a58b00 0%, #edff31 58%, #f3df16 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 50% 45%, #e8f5ff 0%, transparent 44%), linear-gradient(180deg, #39475c 0%, #262b38 50%, #eef8ff 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 76% 18%, #276bb7 0%, transparent 40%), radial-gradient(circle at 78% 72%, #f7ef5d 0%, transparent 38%), linear-gradient(180deg, #dcefff 0%, #3f6f8d 44%, #e4ef48 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 68% 16%, #7e91ff 0%, transparent 42%), linear-gradient(180deg, #223fbd 0%, #141a5c 50%, #090909 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 34% 20%, #f7bdd5 0%, transparent 40%), linear-gradient(180deg, #e99db5 0%, #f4b1c8 58%, #e98585 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 88% 20%, #d95618 0%, transparent 42%), linear-gradient(180deg, #ee7040 0%, #ff933a 52%, #ffc400 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 12% 12%, #fffde8 0%, transparent 40%), linear-gradient(180deg, #fff4a1 0%, #fff149 56%, #9ec044 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 78% 38%, #fff8d8 0%, transparent 40%), radial-gradient(circle at 18% 0%, #ffe700 0%, transparent 34%), linear-gradient(180deg, #d7e9d2 0%, #fff6a7 55%, #c8d09d 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 72% 42%, #ffb56a 0%, transparent 42%), linear-gradient(180deg, #e76c69 0%, #fa8d5e 54%, #ba5b83 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 82% 88%, #c28c73 0%, transparent 40%), linear-gradient(180deg, #7c554b 0%, #251e1a 52%, #5e4033 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 44% 18%, #b569ff 0%, transparent 36%), linear-gradient(180deg, #b27cff 0%, #1762d8 54%, #4697ff 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 14% 8%, #b58d00 0%, transparent 38%), radial-gradient(circle at 84% 20%, #bf4a2e 0%, transparent 42%), linear-gradient(180deg, #c18400 0%, #b40050 58%, #b00445 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 42% 50%, #c7f7ff 0%, transparent 36%), linear-gradient(180deg, #e00078 0%, #d90073 50%, #b646aa 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 14% 20%, #d3b8ff 0%, transparent 40%), radial-gradient(circle at 82% 54%, #63c5a9 0%, transparent 40%), linear-gradient(180deg, #c4d6f9 0%, #d6c8ff 48%, #e9f5ff 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 38% 8%, #ad12c5 0%, transparent 36%), linear-gradient(180deg, #c240d7 0%, #c8c7ff 52%, #9ea6f6 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 82% 66%, #273b9c 0%, transparent 36%), linear-gradient(180deg, #8ad9d7 0%, #a2e1cf 50%, #6e88ce 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 20% 34%, #fff2d8 0%, transparent 36%), radial-gradient(circle at 76% 20%, #b50c47 0%, transparent 40%), linear-gradient(180deg, #c31b52 0%, #ffe5fa 52%, #fa321e 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 18% 30%, #d31aba 0%, transparent 42%), radial-gradient(circle at 80% 74%, #ffbe28 0%, transparent 42%), linear-gradient(180deg, #d420ae 0%, #ff649a 52%, #ffbd27 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 48% 28%, #fff200 0%, transparent 38%), linear-gradient(150deg, #00449e 0%, #2e80d5 54%, #0b5fa0 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 78% 76%, #fff5bf 0%, transparent 40%), linear-gradient(180deg, #bff7d2 0%, #d9ffe3 52%, #a3a500 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 74% 32%, #b400a8 0%, transparent 42%), linear-gradient(180deg, #ffc8b7 0%, #b4009a 54%, #c68aa5 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 70% 12%, #d979ff 0%, transparent 42%), radial-gradient(circle at 52% 82%, #0c1778 0%, transparent 42%), linear-gradient(180deg, #e66fff 0%, #7e31d6 50%, #12166d 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 28% 10%, #65e681 0%, transparent 38%), radial-gradient(circle at 42% 58%, #083bb4 0%, transparent 44%), linear-gradient(180deg, #31d06a 0%, #043fc5 54%, #53cf6f 100%)",
  },
  {
    ink: "dark",
    background:
      "radial-gradient(circle at 58% 18%, #fff8d7 0%, transparent 44%), linear-gradient(180deg, #ffd19b 0%, #ffc480 58%, #f6a998 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 72% 26%, #786cff 0%, transparent 42%), linear-gradient(180deg, #bd252b 0%, #8f2535 48%, #1c43ff 100%)",
  },
  {
    ink: "light",
    background:
      "radial-gradient(circle at 24% 42%, #e5e180 0%, transparent 38%), radial-gradient(circle at 80% 90%, #d5dde5 0%, transparent 36%), linear-gradient(180deg, #45472f 0%, #111c25 55%, #8d9699 100%)",
  },
] as const;

function stableHash(value: string) {
  return Array.from(value).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0
  );
}

export function getCareerCardVisual(field: CareerVisualField) {
  const seed = stableHash(field.slug || field.id);
  const template =
    CAREER_CARD_GRADIENT_TEMPLATES[
      (seed + (seed >>> 8) + (seed >>> 17)) %
        CAREER_CARD_GRADIENT_TEMPLATES.length
    ];
  const dotStyle = {
    "--radar-dot-a-x": `${seed % 13}px`,
    "--radar-dot-a-y": `${(seed >>> 4) % 17}px`,
    "--radar-dot-b-x": `${3 + ((seed >>> 8) % 15)}px`,
    "--radar-dot-b-y": `${2 + ((seed >>> 12) % 19)}px`,
    "--radar-dot-a-size": `${7 + (seed % 4)}px`,
    "--radar-dot-b-size": `${9 + ((seed >>> 5) % 5)}px`,
    "--radar-dot-glow-x": `${18 + ((seed >>> 10) % 66)}%`,
    "--radar-dot-glow-y": `${6 + ((seed >>> 16) % 30)}%`,
    "--radar-grain-x": `${(seed >>> 20) % 160}px`,
    "--radar-grain-y": `${(seed >>> 24) % 160}px`,
  } satisfies Record<`--radar-${string}`, string>;

  return {
    background: template.background,
    dotStyle,
    figure: (() => {
      const slug = (field.slug ?? "").toLowerCase();
      if (slug.includes("cyber")) return "/images/radar/cybersec.webp";
      if (slug.includes("software")) return "/images/radar/chardev.webp";
      if (slug.includes("ai-engineer")) return "/images/radar/chardev-orange.webp";
      return CAREER_FIGURES[seed % CAREER_FIGURES.length];
    })(),
    scrim:
      "linear-gradient(to top, rgb(0 0 0 / 0.92) 0%, rgb(0 0 0 / 0.74) 28%, rgb(0 0 0 / 0.38) 56%, rgb(0 0 0 / 0.08) 78%, transparent 100%)",
    tagBackground: "rgb(0 0 0 / 0.18)",
    textColor: "#ffffff",
    textShadow: "0 2px 18px rgb(0 0 0 / 0.68)",
  };
}

/**
 * The career colour moved to a fixed lightness so it reads on the deck's dark
 * background (the field page's `--radar-accent`, also used by its OG image).
 */
export function readableAccent(hex: string, fallback = "#60a5fa"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) / 255;
  let g = ((n >> 8) & 0xff) / 255;
  let b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const lightness = 0.68;
  s = Math.max(s, 0.55);
  const c = (1 - Math.abs(2 * lightness - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = lightness - c / 2;
  const seg = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60) % 6];
  r = Math.round((seg[0] + mm) * 255);
  g = Math.round((seg[1] + mm) * 255);
  b = Math.round((seg[2] + mm) * 255);
  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}
