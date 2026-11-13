import {
  ActionRowBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  type AttachmentBuilder,
  type ButtonBuilder,
  type MessageMentionOptions,
  type StringSelectMenuBuilder,
} from "discord.js";

/**
 * Every message the quest bot sends is one Discord Components V2 card: a
 * Container with an accent colour, short markdown blocks, pictures, and the
 * buttons at the bottom. renderView() is pure (no Discord calls) so tests
 * can read exactly what a student would see.
 */

/** Pings nobody: student text could otherwise turn into @everyone. */
export const NO_MENTIONS = { parse: [] as [] };

export type Row = ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>;

/** One accent colour per kind of screen. Pick by what the card is about, not by mood. */
export type Tone = "island" | "season" | "coins" | "staff" | "success" | "warn" | "error" | "neutral";

export const TONE_COLORS: Record<Tone, number> = {
  island: 0x3ba55c,
  season: 0xe3b341,
  coins: 0xf0a020,
  staff: 0x5865f2,
  success: 0x57f287,
  warn: 0xfaa61a,
  error: 0xed4245,
  neutral: 0x99aab5,
};

/**
 * The pieces of a card, top to bottom. Consecutive text and subtext blocks
 * are joined into one text display (one component), with a blank line
 * before each body block that follows another, so Thai text has room to
 * breathe (BLOCK_GAP). Fine print stays right under the line it belongs to;
 * a divider with line: false sets it apart when it is the card's own. Put what matters first: when a card is over
 * Discord's limits, blocks are dropped from the end.
 */
export type Block =
  /** Markdown. Student-written parts must already have gone through safe(). */
  | { kind: "text"; text: string }
  /** Small grey fine print: every line gets "-# ". */
  | { kind: "subtext"; text: string }
  /** 1 to 3 lines of text with a button on the right. */
  | { kind: "section"; text: string | string[]; button: ButtonBuilder }
  /** 1 to 3 lines of text with a small picture on the right: an attachment name or an https URL. */
  | { kind: "section"; text: string | string[]; thumbnail: string; alt?: string }
  /** A gap, with a line unless line is false. */
  | { kind: "divider"; line?: boolean; spacing?: "small" | "large" }
  /** An attached picture (view.files), by its attachment name. Image blocks before any other block sit above the title. */
  | { kind: "image"; name: string; alt?: string }
  /** An attached file (view.files) as a download, by its attachment name. */
  | { kind: "file"; name: string };

export interface View {
  /** Accent colour; neutral when missing. */
  tone?: Tone;
  /** One "### " heading line, at most one emoji. */
  title?: string;
  blocks?: Block[];
  /** Legacy: one text block, after title and before blocks. Unconverted handlers keep working as cards. */
  content?: string;
  /** Buttons and selects, rendered inside the card at the bottom. Never trimmed. */
  rows?: Row[];
  /** Attachments. A file no block references is still shown: pictures as an image, others as a file. */
  files?: AttachmentBuilder[];
}

export const LIMITS = { components: 40, text: 4000, galleryItems: 10 } as const;

export interface RenderOptions {
  /** Private reply (default true). update/editReply must pass false: ephemerality cannot change on edit. */
  ephemeral?: boolean;
  /** For the one warning line when a card had to be trimmed (a function is only called then). */
  action?: string | (() => string);
  /** Slash command name ("project invite") to ID; defaults to the IDs loaded at login. */
  commands?: ReadonlyMap<string, string>;
  /** Outbox channel posts only: the users a post may ping. Everything else pings nobody. */
  allowedMentions?: MessageMentionOptions;
}

export interface ViewPayload {
  components: ContainerBuilder[];
  files: AttachmentBuilder[];
  flags: number;
  allowedMentions: MessageMentionOptions;
}

// ---------------------------------------------------------------------------
// Clickable command mentions

let loadedCommandIds: ReadonlyMap<string, string> = new Map();

/** Called once the bot is logged in, with commandIdMap() of the guild's commands. */
export function setCommandIds(ids: ReadonlyMap<string, string>): void {
  loadedCommandIds = ids;
}

export function commandIds(): ReadonlyMap<string, string> {
  return loadedCommandIds;
}

interface CommandLike {
  id: string;
  name: string;
  options?: readonly { type: number; name: string; options?: readonly { type: number; name: string }[] }[];
}

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

/** "island" -> id, "project invite" -> id, "admin group sub" -> id. */
export function commandIdMap(commands: Iterable<CommandLike>): Map<string, string> {
  const ids = new Map<string, string>();
  for (const c of commands) {
    ids.set(c.name, c.id);
    for (const o of c.options ?? []) {
      if (o.type === SUBCOMMAND) ids.set(`${c.name} ${o.name}`, c.id);
      if (o.type === SUBCOMMAND_GROUP) {
        for (const s of o.options ?? []) if (s.type === SUBCOMMAND) ids.set(`${c.name} ${o.name} ${s.name}`, c.id);
      }
    }
  }
  return ids;
}

const THAI = "฀-๿";
/**
 * A "/name" token, up to two subcommand words, starting a text or after a
 * space, bracket, quote or Thai letter. A dot ends it only when no letter or
 * digit follows, so "/data.csv" stays a file name.
 */
const COMMAND_TOKEN = new RegExp(
  `(^|[\\s(\\[{"'“‘${THAI}])\\/([a-z][a-z0-9_-]*)(?: ([a-z][a-z0-9_-]*))?(?: ([a-z][a-z0-9_-]*))?(?=$|[\\s,;:!?)\\]}"'”’…${THAI}]|\\.(?!\\w))`,
  "g"
);
/** Code spans and blocks, and web addresses, are left exactly as written. */
const PROTECTED = /(```[\s\S]*?```|`[^`\n]*`|<?https?:\/\/[^\s<>]+>?)/;

/**
 * Turns "/island" or "/project invite" in bot copy into a clickable command
 * mention (</project invite:ID>). Whole tokens only; URLs, code spans,
 * unknown commands and an empty map are left as they are.
 */
export function linkCommands(text: string, ids: ReadonlyMap<string, string> = loadedCommandIds): string {
  if (!ids.size || !text.includes("/")) return text;
  return text
    .split(PROTECTED)
    .map((part, n) =>
      n % 2 === 1
        ? part
        : part.replace(COMMAND_TOKEN, (match, pre: string, name: string, sub?: string, sub2?: string) => {
            const words = [name, sub, sub2].filter((w): w is string => Boolean(w));
            for (let k = words.length; k > 0; k--) {
              const key = words.slice(0, k).join(" ");
              const id = ids.get(key);
              if (id) return `${pre}</${key}:${id}>${words.slice(k).map((w) => ` ${w}`).join("")}`;
            }
            return match;
          })
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Rendering

type Unit =
  | { type: "text"; text: string }
  | { type: "section"; texts: string[]; button?: ButtonBuilder; thumbnail?: { url: string; alt?: string } }
  | { type: "divider"; line: boolean; large: boolean }
  | { type: "gallery"; items: { url: string; alt?: string }[] }
  | { type: "file"; url: string };

const IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i;

function attachmentUrl(name: string): string {
  return /^https?:\/\//.test(name) ? name : `attachment://${name}`;
}

function clipText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

/**
 * Legacy content first, then the blocks, then any attachment no block shows.
 * A picture or file that is not attached (a drawing that failed) is left out
 * rather than sent as a broken link Discord would refuse.
 */
function blocksOf(view: View): Block[] {
  const attached = new Set((view.files ?? []).map((f) => f.name ?? ""));
  const has = (name: string) => /^https?:\/\//.test(name) || attached.has(name);
  const blocks: Block[] = [];
  if (view.content?.trim()) blocks.push({ kind: "text", text: view.content });
  for (const b of view.blocks ?? []) {
    if ((b.kind === "image" || b.kind === "file") && !has(b.name)) continue;
    if (b.kind === "section" && "thumbnail" in b && !has(b.thumbnail)) {
      blocks.push({ kind: "text", text: (Array.isArray(b.text) ? b.text : [b.text]).join("\n") });
      continue;
    }
    blocks.push(b);
  }
  const shown = new Set<string>();
  for (const b of blocks) {
    if (b.kind === "image" || b.kind === "file") shown.add(b.name);
    if (b.kind === "section" && "thumbnail" in b) shown.add(b.thumbnail);
  }
  for (const file of view.files ?? []) {
    const name = file.name;
    if (!name || shown.has(name)) continue;
    blocks.push(IMAGE_FILE.test(name) ? { kind: "image", name, alt: file.description ?? undefined } : { kind: "file", name });
  }
  return blocks;
}

/** The title as one "### " line. */
function heading(title: string, ids: ReadonlyMap<string, string>): string {
  return `### ${linkCommands(clipText(title.trim().replace(/\s*\n\s*/g, " "), 200), ids)}`;
}

/** Between two blocks joined into one text display: an empty line. */
export const BLOCK_GAP = "\n\n";

function unitsOf(view: View, blocks: Block[], ids: ReadonlyMap<string, string>): Unit[] {
  const units: Unit[] = [];
  const files = new Map((view.files ?? []).map((f) => [f.name ?? "", f]));
  let titled = !view.title?.trim();
  /** What the open text display ends with: the title, body text or fine print. */
  let tail: "heading" | "text" | "subtext" | null = null;
  const pushText = (text: string, kind: "heading" | "text" | "subtext") => {
    if (!text.trim()) return;
    const last = units.at(-1);
    if (last?.type === "text") {
      // A blank line before each new body block. Tight under the title, and for fine
      // print, which belongs to the line above it (a toast's note, a journal entry's detail).
      const tight = tail === "heading" || kind !== "text";
      last.text += `${tight ? "\n" : BLOCK_GAP}${text}`;
    } else units.push({ type: "text", text });
    tail = kind;
  };
  for (const b of blocks) {
    if (!titled && b.kind !== "image") {
      pushText(heading(view.title!, ids), "heading");
      titled = true;
    }
    switch (b.kind) {
      case "text":
        pushText(linkCommands(b.text, ids), "text");
        break;
      case "subtext":
        pushText(
          linkCommands(b.text, ids)
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => (line.startsWith("-# ") ? line : `-# ${line}`))
            .join("\n"),
          "subtext"
        );
        break;
      case "section": {
        const texts = (Array.isArray(b.text) ? b.text : [b.text]).filter((t) => t.trim()).slice(0, 3).map((t) => linkCommands(t, ids));
        if (!texts.length) break;
        units.push(
          "button" in b
            ? { type: "section", texts, button: b.button }
            : { type: "section", texts, thumbnail: { url: attachmentUrl(b.thumbnail), alt: b.alt } }
        );
        break;
      }
      case "divider":
        units.push({ type: "divider", line: b.line ?? true, large: b.spacing === "large" });
        break;
      case "image": {
        const item = { url: attachmentUrl(b.name), alt: b.alt ?? files.get(b.name)?.description ?? undefined };
        const last = units.at(-1);
        if (last?.type === "gallery" && last.items.length < LIMITS.galleryItems) last.items.push(item);
        else units.push({ type: "gallery", items: [item] });
        break;
      }
      case "file":
        units.push({ type: "file", url: attachmentUrl(b.name) });
        break;
    }
  }
  if (!titled) pushText(heading(view.title!, ids), "heading");
  return units;
}

function rowSize(row: Row): number {
  return 1 + row.components.length;
}

function unitSize(u: Unit): number {
  if (u.type === "section") return 2 + u.texts.length;
  if (u.type === "gallery") return 1 + u.items.length;
  return 1;
}

/** Components in the whole message, nested ones included (the container is one). */
function countComponents(units: Unit[], rows: Row[]): number {
  return 1 + units.reduce((n, u) => n + unitSize(u), 0) + rows.reduce((n, r) => n + rowSize(r), 0);
}

function countText(units: Unit[]): number {
  let n = 0;
  for (const u of units) {
    if (u.type === "text") n += u.text.length;
    if (u.type === "section") n += u.texts.reduce((m, t) => m + t.length, 0);
  }
  return n;
}

function textLength(b: Block): number {
  if (b.kind === "text" || b.kind === "subtext") return b.text.length;
  if (b.kind === "section") return (Array.isArray(b.text) ? b.text : [b.text]).reduce((m, t) => m + t.length, 0);
  return 0;
}

/** A clipped text keeps at least its first line (up to this many characters), never a bare "…". */
const KEEP_FIRST_LINE = 200;

/** How short a text may be clipped: its first line (capped), plus the ellipsis. */
function clipFloor(text: string): number {
  const first = text.indexOf("\n");
  return Math.min(first < 0 ? text.length : first, KEEP_FIRST_LINE) + 1;
}

/** The longest text in a block that can still be clipped, and how much it can give. */
function clippable(b: Block): { text: string; spare: number } | null {
  const texts = b.kind === "text" || b.kind === "subtext" ? [b.text] : b.kind === "section" ? (Array.isArray(b.text) ? b.text : [b.text]) : [];
  let best: { text: string; spare: number } | null = null;
  for (const t of texts) {
    const spare = t.length - clipFloor(t);
    if (spare > 0 && (!best || t.length > best.text.length)) best = { text: t, spare };
  }
  return best;
}

/**
 * The longest text block that can still give, cut by over characters (and a
 * little more for the ellipsis), but never below its first line. Whatever is
 * still over is taken from the next longest on the next call, or blocks are
 * dropped from the end. Returns the same array when nothing can be clipped.
 */
function clipLongest(blocks: Block[], over: number): Block[] {
  let at = -1;
  let pick: { text: string; spare: number } | null = null;
  for (let k = 0; k < blocks.length; k++) {
    const c = clippable(blocks[k]);
    if (c && (!pick || textLength(blocks[k]) > textLength(blocks[at]))) {
      at = k;
      pick = c;
    }
  }
  if (!pick) return blocks;
  const target = pick.text;
  const max = Math.max(clipFloor(target), target.length - over - 1);
  const b = blocks[at];
  const next = [...blocks];
  if (b.kind === "text" || b.kind === "subtext") {
    next[at] = { ...b, text: clipText(b.text, max) };
  } else if (b.kind === "section") {
    const texts = Array.isArray(b.text) ? b.text : [b.text];
    const k = texts.indexOf(target);
    next[at] = { ...b, text: texts.map((t, n) => (n === k ? clipText(t, max) : t)) };
  }
  return next;
}

/**
 * Which block to drop next to fit the component limit: a divider first
 * (decoration), then the last block. A picture above the title goes last.
 */
function dropIndex(blocks: Block[]): number {
  for (let k = blocks.length - 1; k >= 0; k--) if (blocks[k].kind === "divider") return k;
  return blocks.length - 1;
}

function build(view: View, units: Unit[], rows: Row[]): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(TONE_COLORS[view.tone ?? "neutral"]);
  if (!units.length && !rows.length) units = [{ type: "text", text: "​" }];
  for (const u of units) {
    if (u.type === "text") {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(u.text));
    } else if (u.type === "section") {
      const section = new SectionBuilder().addTextDisplayComponents(u.texts.map((t) => new TextDisplayBuilder().setContent(t)));
      if (u.button) section.setButtonAccessory(u.button);
      else {
        const thumb = new ThumbnailBuilder().setURL(u.thumbnail!.url);
        if (u.thumbnail!.alt) thumb.setDescription(clipText(u.thumbnail!.alt, 1000));
        section.setThumbnailAccessory(thumb);
      }
      container.addSectionComponents(section);
    } else if (u.type === "divider") {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(u.line).setSpacing(u.large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
      );
    } else if (u.type === "gallery") {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          u.items.map((item) => {
            const built = new MediaGalleryItemBuilder().setURL(item.url);
            if (item.alt) built.setDescription(clipText(item.alt, 1000));
            return built;
          })
        )
      );
    } else {
      container.addFileComponents(new FileBuilder().setURL(u.url));
    }
  }
  for (const row of rows) container.addActionRowComponents(row.toJSON());
  return container;
}

/**
 * The exact payload for reply/update/editReply/followUp/send: one card,
 * Components V2 (+ Ephemeral unless opts.ephemeral is false), pinging nobody.
 * Over Discord's limits it clips the longest text, then drops blocks from
 * the end (never the buttons), logs one warning line, and never throws.
 */
export function renderView(view: View, opts: RenderOptions = {}): ViewPayload {
  const ids = opts.commands ?? loadedCommandIds;
  const rows = (view.rows ?? []).filter((r) => r.components.length > 0);
  let blocks = blocksOf(view);
  let units = unitsOf(view, blocks, ids);
  const before = { components: countComponents(units, rows), text: countText(units) };

  for (let guard = 0; countText(units) > LIMITS.text && guard < 20; guard++) {
    const next = clipLongest(blocks, countText(units) - LIMITS.text);
    if (next === blocks) break;
    blocks = next;
    units = unitsOf(view, blocks, ids);
  }
  while ((countComponents(units, rows) > LIMITS.components || countText(units) > LIMITS.text) && blocks.length) {
    const drop = dropIndex(blocks);
    blocks = blocks.filter((_, k) => k !== drop);
    units = unitsOf(view, blocks, ids);
  }
  if (before.components > LIMITS.components || before.text > LIMITS.text) {
    console.warn(
      `[shift-quests] view trimmed action=${(typeof opts.action === "function" ? opts.action() : opts.action) ?? "-"} components=${before.components}->${countComponents(units, rows)} text=${before.text}->${countText(units)}`
    );
  }

  return {
    components: [build(view, units, rows)],
    files: [...(view.files ?? [])],
    flags: MessageFlags.IsComponentsV2 | (opts.ephemeral === false ? 0 : MessageFlags.Ephemeral),
    allowedMentions: opts.allowedMentions ?? NO_MENTIONS,
  };
}
