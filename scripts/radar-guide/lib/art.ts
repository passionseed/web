/**
 * Background art for Radar reels and covers (`radar:cover`, spec 7.2). Pure:
 * prompts, the people guard, parsing agy's output, and the art index.
 *
 * Rules from skills/key-art-poster/SKILL.md and the spec: one image, no text
 * baked in, and never "real people" next to career claims, so prompts are
 * scenery and objects only.
 */
export const ART_SCENES = ["hook", "reality", "money", "ai", "day", "study", "start", "cover"] as const;
export type ArtScene = (typeof ART_SCENES)[number];

const STYLE =
  "Pixel art, Dusk City palette: coral sunset sky, purple dithered mountain peaks, dark plum hills, " +
  "a city skyline made of lit window dots in warm orange and gold, red stippled dunes, square 1:1 composition, " +
  "large calm areas of sky for text to sit on later";

/** What each scene shows, as objects and places, never people. */
const SUBJECTS: Record<ArtScene, string> = {
  hook: "one glowing tower in the skyline where the {field} work happens, its windows brighter than the rest",
  reality: "a split view: on the left a cinematic neon fantasy version of a {field} workspace, on the right the real tidy desk with notes and a laptop",
  money: "a staircase of lit windows climbing a tower, each step brighter, for {field} career levels",
  ai: "a small friendly robot lamp and a desk lamp side by side on a rooftop, sharing the work of a {field} desk",
  day: "a rooftop desk at dusk with the tools of a {field}: laptop, notebook, coffee, a wall of sticky notes",
  study: "a university gate on a hill above the city, paths leading to it from several streets",
  start: "a single lit doorway at street level with a laptop glowing inside, the first step into {field}",
  cover: "a wide view of the whole city at dusk, one district glowing for {field}",
};

/** Words that would put a person in the picture. */
const PEOPLE = /\b(person|people|man|men|woman|women|girl|boy|kid|student|child|face|faces|portrait|selfie|crowd|worker|employee|founder|celebrity)\b|คน|นักเรียน|ใบหน้า/i;

export const PROMPT_SUFFIX = "no people, no faces, no text, no watermark";

export function buildArtPrompt(scene: ArtScene, fieldNameEn: string, override?: string): string {
  const subject = override?.trim() || SUBJECTS[scene].replace(/\{field\}/g, fieldNameEn);
  return `${STYLE}. ${subject}, ${PROMPT_SUFFIX}`;
}

/** The part of a prompt someone wrote (style and suffix excluded), checked for people. */
export function mentionsPeople(text: string): boolean {
  return PEOPLE.test(text);
}

/** The exact agy invocation (spec 7.2). Never with a flag that skips agy's permission prompts. */
export function agyArgs(imageName: string, prompt: string): string[] {
  const safePrompt = prompt.replace(/'/g, "");
  return [
    "-p",
    `Use generate_image once with ImageName '${imageName}' and Prompt '${safePrompt}'. Reply only with the saved path.`,
    "--output-format",
    "stream-json",
    "--print-timeout",
    "180s",
  ];
}

/**
 * Finds the saved PNG path in agy's stream-json output: the tool result says
 * "saved at <path>", and the final reply is the path itself.
 */
export function parseSavedPath(output: string): string | null {
  const texts: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      collectStrings(JSON.parse(trimmed), texts);
    } catch {
      texts.push(trimmed);
    }
  }
  const all = texts.join("\n");
  const saved = all.match(/saved at[:\s]+`?(\/[^\s`'"]+?\.png)/i);
  if (saved) return saved[1];
  const anyPng = all.match(/(\/[^\s`'"]+?\.png)/g);
  return anyPng ? anyPng[anyPng.length - 1] : null;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

export interface ArtEntry {
  url: string;
  prompt: string;
  created_at: string;
}

/** docs/radar-guide/art.json: the current art per career and scene. URLs only, no local paths. */
export interface ArtIndex {
  version: 1;
  fields: Record<string, Partial<Record<ArtScene, ArtEntry>>>;
}

export function emptyArtIndex(): ArtIndex {
  return { version: 1, fields: {} };
}

export function recordArt(index: ArtIndex, slug: string, scene: ArtScene, entry: ArtEntry): ArtIndex {
  const fields = { ...index.fields, [slug]: { ...(index.fields[slug] ?? {}), [scene]: entry } };
  const sorted = Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]]));
  return { version: 1, fields: sorted };
}
