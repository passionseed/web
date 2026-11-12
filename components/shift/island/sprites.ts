/**
 * Pixel art for the island web board.
 *
 * The trees, visitor, key flag, lantern, path and well come straight from the
 * bot's island sprites, so the web and the Discord picture share one look.
 * The 16x16 icons below are web-only and use ONLY the bot's PALETTE keys
 * (a dot is transparent). Draw them with PixelIcon at integer scales.
 */
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";

export { PALETTE };

export type WebIcon =
  | "compass"
  | "hammer"
  | "door"
  | "gear"
  | "scroll"
  | "paint"
  | "megaphone"
  | "heart"
  | "bubble"
  | "eye"
  | "star"
  | "seed"
  | "moon"
  | "check"
  | "book"
  | "send"
  | "sos"
  | "link"
  | "mail"
  | "menu"
  | "note"
  | "coin"
  | "trophy"
  | "news"
  | "letter";

export const WEB_SPRITES: Record<WebIcon, string[]> = {
  compass: [
    "................",
    ".....oooooo.....",
    "...ooffffffoo...",
    "..offffrrffffo..",
    ".offfffrrfffffo.",
    ".offfffrrfffffo.",
    ".offffrrrrffffo.",
    ".offfffbbfffffo.",
    ".offfffbbfffffo.",
    ".offffzzzzffffo.",
    ".offfffzzfffffo.",
    ".offfffzzfffffo.",
    "..offffzzffffo..",
    "...ooffffffoo...",
    ".....oooooo.....",
    "................",
  ],
  hammer: [
    "................",
    "................",
    "..ooooooo.......",
    ".oaaaaaaao......",
    ".oaaaaaaao......",
    ".ozzzzzzzo......",
    "..oooooebo......",
    ".......oebo.....",
    "........oebo....",
    ".........oebo...",
    "..........oebo..",
    "...........oebo.",
    "............oo..",
    "................",
    "................",
    "................",
  ],
  door: [
    "................",
    "....oooooooo....",
    "...obbbbbbbbo...",
    "...obeeeeeebo...",
    "...obeccccebo...",
    "...obeccccebo...",
    "...obeeeeeebo...",
    "...obecccyebo...",
    "...obeccccebo...",
    "...obeccccebo...",
    "...obeeeeeebo...",
    "...obeccccebo...",
    "...obeccccebo...",
    "...obbbbbbbbo...",
    "..oooooooooooo..",
    "................",
  ],
  gear: [
    "................",
    "......oooo......",
    "..oo..oaao..oo..",
    "..oaooaaaaooao..",
    "...oaaaaaaaao...",
    "..oaaaooooaaao..",
    "ooaaaoo..ooaaaoo",
    "oaaaao....oaaaao",
    "oaaaao....oaaaao",
    "ooaaaoo..ooaaaoo",
    "..oaaaooooaaao..",
    "...oaaaaaaaao...",
    "..oaooaaaaooao..",
    "..oo..oaao..oo..",
    "......oooo......",
    "................",
  ],
  scroll: [
    "................",
    "..oooooooooooo..",
    ".oeeeeeeeeeeeeo.",
    ".oooooooooooooo.",
    "..offffffffffo..",
    "..ofzzzzzzzzfo..",
    "..offffffffffo..",
    "..ofzzzzzzfffo..",
    "..offffffffffo..",
    "..ofzzzzzzzzfo..",
    "..offffffffffo..",
    "..ofzzzzfffffo..",
    ".oooooooooooooo.",
    ".oeeeeeeeeeeeeo.",
    "..oooooooooooo..",
    "................",
  ],
  paint: [
    "................",
    "....oooooooo....",
    "..ooiiiiiiiioo..",
    ".oiirriiiyyiiio.",
    ".oiirriiiyyiiio.",
    "oiiiiiiiiiiiiio.",
    "oimmiiiiiioooo..",
    "oimmiiiiio......",
    "oiiiiiiiio......",
    "oiiwwiiiiio.....",
    ".oiwwiiiiiio....",
    ".oiiiiiiiiiioo..",
    "..ooiiiiiiiio...",
    "....oooooooo....",
    "................",
    "................",
  ],
  megaphone: [
    "................",
    "................",
    "..........oo....",
    "........oorro...",
    "......oorrrro...",
    "..oooorrrrrro...",
    ".offorrrrrrro...",
    ".offorrrrrrro.y.",
    ".offorrrrrrro..y",
    ".offorrrrrrro.y.",
    "..oooorrrrrro...",
    "...obo..oorrro..",
    "...obo....oooo..",
    "...ooo..........",
    "................",
    "................",
  ],
  heart: [
    "................",
    "................",
    "..oooo....oooo..",
    ".orrrro..orrrro.",
    "orrfrrroorrrrrro",
    "orfrrrrrrrrrrrro",
    "orrrrrrrrrrrrrro",
    "orrrrrrrrrrrrrro",
    ".orrrrrrrrrrrro.",
    "..orrrrrrrrrro..",
    "...orrrrrrrro...",
    "....orrrrrro....",
    ".....orrrro.....",
    "......orro......",
    ".......oo.......",
    "................",
  ],
  bubble: [
    "................",
    "................",
    "..oooooooooooo..",
    ".offffffffffffo.",
    ".offffffffffffo.",
    ".offzzffzzffffo.",
    ".offffffffffffo.",
    ".offzzzzzzffffo.",
    ".offffffffffffo.",
    ".offffffffffffo.",
    "..oooffoooooooo.",
    "....offo........",
    "....ofo.........",
    "....oo..........",
    "................",
    "................",
  ],
  eye: [
    "................",
    "................",
    "................",
    "......oooo......",
    "....oofffffo....",
    "...offfooofffo..",
    "..offfowwwofffo.",
    ".offfowwoowoffo.",
    ".offfowwoowoffo.",
    "..offfowwwofffo.",
    "...offfooofffo..",
    "....oofffffo....",
    "......oooo......",
    "................",
    "................",
    "................",
  ],
  star: [
    "................",
    ".......oo.......",
    "......oyyo......",
    "......oyyo......",
    ".....oyyyyo.....",
    "ooooooyyyyoooooo",
    "oyyyyyyyyyyyyyyo",
    ".oyyyyyyyyyyyyo.",
    "..oyyyyyyyyyyo..",
    "...oyyyyyyyyo...",
    "...oyyyyyyyyo...",
    "..oyyyyooyyyyo..",
    "..oyyyoo.oyyyo..",
    ".oyyoo....ooyyo.",
    ".ooo........ooo.",
    "................",
  ],
  seed: [
    "................",
    "................",
    "................",
    ".ooo........ooo.",
    "onnno......onnno",
    "omnnmo....omnnmo",
    ".ommmmo..ommmmo.",
    "..oooommmmoooo..",
    "......ommo......",
    "......ommo......",
    "....ooommooo....",
    "..oobbbbbbbbboo.",
    ".obcccccccccccbo",
    ".obbbbbbbbbbbbo.",
    "..oooooooooooo..",
    "................",
  ],
  moon: [
    "................",
    "................",
    ".....oooo.......",
    "...ooyyyo.......",
    "..oyyyyo........",
    "..oyyyo.........",
    ".oyyyo..........",
    ".oyyyo..........",
    ".oyyyo..........",
    ".oyyyyo.........",
    "..oyyyyo......o.",
    "..oyyyyyooooooo.",
    "...ooyyyyyyyoo..",
    ".....ooooooo....",
    "................",
    "................",
  ],
  check: [
    "................",
    "................",
    "................",
    "...........ooo..",
    "..........offo..",
    ".........offo...",
    "........offo....",
    ".ooo...offo.....",
    ".offo.offo......",
    "..offooffo......",
    "...offffo.......",
    "....offo........",
    ".....oo.........",
    "................",
    "................",
    "................",
  ],
  // Open storybook (the story button).
  book: [
    "................",
    "................",
    ".ooo........ooo.",
    "offfooo..ooofffo",
    "offffffoofoooofo",
    "ofzzzzfoofonnofo",
    "offffffoofommofo",
    "ofzzzffooffbfffo",
    "offffffooffbfffo",
    "ofzzzzfoofggggfo",
    "offffffooffffffo",
    "offffffooffffffo",
    "oooofffoofffoooo",
    "orrroooooooorrro",
    ".ooo...oo...ooo.",
    "................",
  ],
  // Up arrow out of a tray (send a quest, like 📤).
  send: [
    "................",
    ".......oo.......",
    "......oyyo......",
    ".....oyyyyo.....",
    "....oyyyyyyo....",
    "...oooyyyyooo...",
    ".....oyyyyo.....",
    ".....oyyyyo.....",
    ".oo..oyyyyo..oo.",
    ".obo.oooooo.obo.",
    ".obo........obo.",
    ".oboooooooooobo.",
    ".obccccccccccbo.",
    ".obbbbbbbbbbbbo.",
    "..oooooooooooo..",
    "................",
  ],
  // Lifebuoy (the "ติด" help button).
  sos: [
    "................",
    ".....oooooo.....",
    "...oorffffroo...",
    "..orrrffffrrro..",
    "..orrroooorrro..",
    ".orrro....orrro.",
    ".offo......offo.",
    ".offo......offo.",
    ".offo......offo.",
    ".offo......offo.",
    ".orrro....orrro.",
    "..orrroooorrro..",
    "..orrrffffrrro..",
    "...oorffffroo...",
    ".....oooooo.....",
    "................",
  ],
  // Chain link (connect a canvas).
  link: [
    "................",
    "................",
    "................",
    ".......ooooooo..",
    "......oaaaaaaao.",
    ".....oaaoooooaao",
    "..ooooaoo....oao",
    ".oaaaoaoao...oao",
    "oaaoooaaoaoooato",
    "oao...otoaottto.",
    "oao....ooaoooo..",
    "oaaoooooato.....",
    ".ottttttto......",
    "..ooooooo.......",
    "................",
    "................",
  ],
  // Envelope (the HUD's new-messages button).
  mail: [
    "................",
    "................",
    "................",
    ".oooooooooooooo.",
    ".ooffffffffffoo.",
    ".ofoffffffffofo.",
    ".offoffffffoffo.",
    ".offfoffffofffo.",
    ".offffoffoffffo.",
    ".offfffoofffffo.",
    ".offffffffffffo.",
    ".offffffffffffo.",
    ".oooooooooooooo.",
    "................",
    "................",
    "................",
  ],
  // Three dots (the HUD's menu button).
  menu: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    ".oooo.oooo.oooo.",
    ".offo.offo.offo.",
    ".offo.offo.offo.",
    ".oooo.oooo.oooo.",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  // A note pinned up, three lines on it (the linked SHIFT canvas).
  note: [
    "................",
    "................",
    "......oooo......",
    ".....oprrro.....",
    "..oooorrrroooo..",
    "..offfoooofffo..",
    "..offffffffffo..",
    "..ofzzzzzzzzfo..",
    "..offffffffffo..",
    "..ofzzzzzzzffo..",
    "..offffffffffo..",
    "..ofzzzzzffffo..",
    "..offffffffffo..",
    "..oooooooooooo..",
    "................",
    "................",
  ],
  // A gold Passioncoin, lit from the top left (the HUD's coin pill and the wallet).
  coin: [
    "................",
    ".....oooooo.....",
    "...ooyyyyyyoo...",
    "..oyffyyyyyyyo..",
    ".oyfyyyeeyyyyeo.",
    ".ofyyyyeeyyyyeo.",
    ".ofyyyyeeyyyyeo.",
    ".oyyyyyeeyyyyeo.",
    ".oyyyyyeeyyyyeo.",
    ".oyyyyyeeyyyyeo.",
    ".oyyyyyyyyyyeeo.",
    "..oyyyyyyyyeeo..",
    "...ooeeeeeeoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  // A cup on a wooden base (Demo Day prizes).
  trophy: [
    "................",
    "..oooooooooooo..",
    "oooyyfyyyyyyeooo",
    "o.oyfyyyyyyyeo.o",
    "o.oyfyyyyyyyeo.o",
    "oooyfyyyyyyyeooo",
    "...oyyyyyyyeo...",
    "....oyyyyyeo....",
    ".....oyyyeo.....",
    "......oyeo......",
    "......oyeo......",
    ".....oyyyeo.....",
    "....oooooooo....",
    "...obbbbbbbbo...",
    "...oooooooooo...",
    "................",
  ],
  // A news sheet: a headline bar, a picture and lines (ข่าวเกาะ).
  news: [
    "................",
    "................",
    ".oooooooooooooo.",
    ".offffffffffffo.",
    ".ofzzzzzzzzzzfo.",
    ".offffffffffffo.",
    ".ofrrrfzzzzzzfo.",
    ".ofrrrffffffffo.",
    ".ofrrrfzzzzzzfo.",
    ".offffffffffffo.",
    ".ofzzzzzfzzzzfo.",
    ".offffffffffffo.",
    ".ofzzzzzfzzzzfo.",
    ".oooooooooooooo.",
    "................",
    "................",
  ],
  // A sealed letter (the consent letter for a parent).
  letter: [
    "................",
    "................",
    "................",
    ".oooooooooooooo.",
    ".oiiiiiiiiiiiio.",
    ".ooiiiiiiiiiioo.",
    ".oiooiiiiiiooio.",
    ".oiiiooiiooiiio.",
    ".oiiiiorroiiiio.",
    ".oiiiiirriiiiio.",
    ".oiiiiiiiiiiiio.",
    ".oiiiiiiiiiiiio.",
    ".oooooooooooooo.",
    "................",
    "................",
    "................",
  ],
};

/** A small lamp-gold flag for "asked for help". */
export const HELP_FLAG: string[] = [
  "oo......",
  "oyyyyo..",
  "oyyyyyo.",
  "oyyyyo..",
  "oo......",
  "o.......",
  "o.......",
  "o.......",
];

const BOT_ICONS = ["visitor", "key_flag", "lantern", "path", "well"] as const;
type BotIcon = (typeof BOT_ICONS)[number];
export type IconKey = WebIcon | BotIcon;

/** Main quest icons by milestone. No numbers on the board; the icon is the name. */
export const MAIN_ICONS: Record<number, IconKey> = {
  1: "compass",
  2: "hammer",
  3: "visitor",
  4: "door",
  5: "key_flag",
  6: "path",
  7: "lantern",
};

function isIconKey(value: string): value is IconKey {
  return value in WEB_SPRITES || (BOT_ICONS as readonly string[]).includes(value);
}

/** A side quest's icon from the database key (`key` means the key flag); unknown keys get a seed. */
export function sideIcon(icon: string | null | undefined): IconKey {
  if (!icon) return "seed";
  if (icon === "key") return "key_flag";
  return isIconKey(icon) ? icon : "seed";
}

export function mainIcon(milestone: number): IconKey {
  return MAIN_ICONS[milestone] ?? "seed";
}

export function iconGrid(key: IconKey): string[] {
  if (key in WEB_SPRITES) return WEB_SPRITES[key as WebIcon];
  return SPRITES[key] ?? WEB_SPRITES.seed;
}

/** The tree for a stage, 0..7. */
export function treeGrid(stage: number): string[] {
  const n = Math.min(Math.max(Math.trunc(Number.isFinite(stage) ? stage : 0), 0), 7);
  return SPRITES[`stage_${n}`];
}

/** Largest integer scale that fits the grid inside a square of `box` px (at least 1). */
export function iconScale(grid: string[], box: number): number {
  const size = Math.max(grid.length, ...grid.map((row) => row.length));
  return Math.max(1, Math.floor(box / size));
}

/** Every colour key mapped to stone: a locked quest's silhouette. */
export const SILHOUETTE: Record<string, string> = Object.fromEntries(
  Object.keys(PALETTE).map((key) => [key, PALETTE.z]),
);
