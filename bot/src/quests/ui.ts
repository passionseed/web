import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
  type RepliableInteraction,
} from "discord.js";

import { QuestDbError, QuestError } from "./api";
import { BLOCKER, T, clip, errorText, hasErrorText } from "./copy";
import { cid, parseCid } from "./ids";
import { I } from "./island/copy";
import { renderView, type View } from "./view";

/**
 * Small helpers so handlers read as flows, not as discord.js plumbing. Every
 * bot reply here is one Components V2 card (see ./view), ephemeral (seen only
 * by the person who asked), and pings nobody: student text could otherwise
 * turn into @everyone.
 */

export {
  LIMITS,
  NO_MENTIONS,
  TONE_COLORS,
  commandIdMap,
  commandIds,
  linkCommands,
  renderView,
  setCommandIds,
  type Block,
  type RenderOptions,
  type Row,
  type Tone,
  type View,
  type ViewPayload,
} from "./view";

/** Anything the bot can answer: commands, buttons, selects, modals. */
export type Replyable = RepliableInteraction | MessageComponentInteraction | ModalSubmitInteraction;

/**
 * A message sent before the cards (plain content or embeds) must have both
 * cleared when it is edited into a card: Discord refuses content with V2.
 */
function legacyFields(i: RepliableInteraction): { content?: null; embeds?: [] } {
  if (!i.isMessageComponent()) return {};
  const m = i.message as { content?: string; embeds?: unknown[] } | undefined;
  return m && (m.content || m.embeds?.length) ? { content: null, embeds: [] } : {};
}

/**
 * Shows a private card. A button press on a private message replaces that
 * message (replace: true); everything else is a new private reply. Every
 * path (reply, update, editReply after a defer, followUp) sends Components V2.
 */
export async function show(target: Replyable, view: View, opts: { replace?: boolean } = {}): Promise<void> {
  const i = target as RepliableInteraction;
  const action = () => actionOf(i);
  if (opts.replace && i.isMessageComponent() && !i.replied && !i.deferred) {
    // An edit keeps the message's own privacy: only the V2 flag is sent.
    await i.update({ ...renderView(view, { ephemeral: false, action }), ...legacyFields(i) });
  } else if (i.deferred) {
    await i.editReply({ ...renderView(view, { ephemeral: false, action }), ...legacyFields(i) });
  } else if (i.replied) {
    await i.followUp(renderView(view, { action }));
  } else {
    await i.reply(renderView(view, { action }));
  }
}

/** The deployed revision (bot/deploy.sh writes REVISION next to the app), for log lines. */
export const REVISION = (() => {
  const fromEnv = process.env.BOT_REVISION?.trim();
  if (fromEnv) return fromEnv.slice(0, 40);
  try {
    return fs.readFileSync(path.join(process.cwd(), "REVISION"), "utf8").trim().slice(0, 40) || "dev";
  } catch {
    return "dev";
  }
})();

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A short reference a student can read out to staff; the matching log line carries it. */
export function errorRef(): string {
  let ref = "";
  for (let k = 0; k < 6; k++) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return ref;
}

/** What was pressed or typed: a command name or a custom ID's action. IDs only, never student text. */
function actionOf(i: Replyable): string {
  const r = i as RepliableInteraction;
  if (r.isChatInputCommand()) {
    const sub = r.options.getSubcommand(false);
    return sub ? `${r.commandName}/${sub}` : r.commandName;
  }
  if ("customId" in r && typeof r.customId === "string") return parseCid(r.customId)?.action ?? "other";
  return "other";
}

/** Refusal raised before any database write (eligibility, staff role). */
export class GateError extends Error {}

/** Database codes that mean "not yet" or "not for you", not that something broke. */
const EXPECTED_STATE = new Set(["not_started", "squads_off", "staff_no_squad"]);

/** A friendly "not yet" (a gate, or an expected state), shown without the error colour or a reference. */
function isRefusal(error: unknown): boolean {
  return error instanceof GateError || (error instanceof QuestError && EXPECTED_STATE.has(error.code));
}

/**
 * After a failed button press, the same button again (its own custom ID, an
 * existing action) and the way back to the island, so an error that replaced
 * the card never leaves the student stranded. Buttons only: a select's or a
 * modal's custom ID would reach its handler without the values it needs.
 */
function retryRows(i: Replyable): ActionRowBuilder<ButtonBuilder>[] {
  if (!i.isButton() || !parseCid(i.customId)) return [];
  const buttons = [new ButtonBuilder().setCustomId(i.customId).setLabel(T.btnRetry).setStyle(ButtonStyle.Secondary)];
  if (parseCid(i.customId)?.action !== "is_view") {
    buttons.push(new ButtonBuilder().setCustomId(cid("is_view")).setLabel(I.btnBack).setStyle(ButtonStyle.Secondary));
  }
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)];
}

/**
 * Replies with an error card (the error's words, then "-# อ้างอิง REF"), and logs one line
 * with that reference, the action, the database function, the sq code or
 * SQLSTATE and the release revision. Never student text. Returns the reference.
 */
export async function showError(i: Replyable, error: unknown): Promise<string> {
  const ref = errorRef();
  let content = T.generic;
  let code: string;
  let fn = "-";
  let msg = "";
  let unknownCode = false;
  if (error instanceof QuestError) {
    content = errorText(error.code);
    code = `sq:${error.code}`;
    fn = error.fn ?? "-";
    unknownCode = !hasErrorText(error.code);
    if (error.code === "config_incomplete" && error.detail) {
      try {
        const keys = JSON.parse(error.detail) as string[];
        content += `\n${keys.map((k) => `• ${BLOCKER[k] ?? k}`).join("\n")}`;
      } catch {
        // detail is ours; a malformed one just shows the headline
      }
    }
  } else if (error instanceof GateError) {
    content = error.message;
    code = "gate";
  } else if (error instanceof QuestDbError) {
    code = `sqlstate:${error.sqlstate}`;
    fn = error.fn;
  } else {
    const e = error as Error | undefined;
    // Not a database error, so no student text: discord.js and runtime messages.
    code = `unexpected:${e?.name ?? "unknown"}`;
    msg = ` msg="${clip(String(e?.message ?? "").replace(/\s+/g, " "), 160)}"`;
  }
  const line = `[shift-quests] ref=${ref} action=${actionOf(i)} fn=${fn} code=${code} rev=${REVISION}${msg}`;
  // Refusals are expected; only failures are errors.
  if (error instanceof QuestError || error instanceof GateError) console.warn(line);
  else console.error(line);
  // A "not yet" reads as a heads-up, not as something broken: no red, no reference.
  const refusal = isRefusal(error) && !unknownCode;
  try {
    await show(
      i,
      refusal
        ? { tone: "warn", title: T.notYetTitle, blocks: [{ kind: "text", text: content }] }
        : {
            tone: "error",
            blocks: [
              { kind: "text", text: content },
              // A code without Thai words yet is shown, so staff can still tell what happened.
              { kind: "subtext", text: `อ้างอิง ${ref}${unknownCode ? ` · ${code}` : ""}` },
            ],
            rows: retryRows(i),
          }
    );
  } catch {
    // The interaction may have expired; nothing more to tell the user.
  }
  return ref;
}

export function button(id: string, label: string, style: ButtonStyle = ButtonStyle.Secondary, disabled = false): ButtonBuilder {
  return new ButtonBuilder().setCustomId(id).setLabel(label.slice(0, 80)).setStyle(style).setDisabled(disabled);
}

/** Buttons, five to a row, at most five rows. */
export function buttonRows(buttons: ButtonBuilder[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let n = 0; n < Math.min(buttons.length, 25); n += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(n, n + 5)));
  }
  return rows;
}

export interface Option {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
}

function cleanOptions(options: Option[]): Option[] {
  return options.slice(0, 25).map((o) => ({
    label: (o.label || "-").slice(0, 100),
    value: o.value,
    description: o.description ? o.description.replace(/\s+/g, " ").slice(0, 100) : undefined,
    default: o.default,
  }));
}

export function selectRow(id: string, placeholder: string, options: Option[]): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder.slice(0, 150)).addOptions(cleanOptions(options))
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

export type Field =
  | {
      kind: "text";
      id: string;
      label: string;
      description?: string;
      long?: boolean;
      required?: boolean;
      max?: number;
      /** Fewest characters Discord accepts (it then refuses the submit with its own hint). */
      min?: number;
      value?: string | null;
      placeholder?: string;
    }
  | {
      kind: "select";
      id: string;
      label: string;
      description?: string;
      options: Option[];
      min?: number;
      max?: number;
      required?: boolean;
    }
  | { kind: "users"; id: string; label: string; description?: string; max?: number; required?: boolean }
  /** Read-only text above the fields (markdown). */
  | { kind: "note"; text: string };

/** Discord caps a modal at 5 components, titles and labels at 45 characters. */
export function modal(id: string, title: string, fields: Field[]): ModalBuilder {
  const m = new ModalBuilder().setCustomId(id).setTitle(title.slice(0, 45));
  for (const field of fields.slice(0, 5)) {
    if (field.kind === "note") {
      m.addTextDisplayComponents(new TextDisplayBuilder().setContent(field.text.slice(0, 4000)));
      continue;
    }
    const label = new LabelBuilder().setLabel(field.label.slice(0, 45));
    if (field.description) label.setDescription(field.description.slice(0, 100));
    if (field.kind === "text") {
      const input = new TextInputBuilder()
        .setCustomId(field.id)
        .setStyle(field.long ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(field.required ?? false)
        .setMaxLength(field.max ?? (field.long ? 1000 : 200));
      if (field.min) input.setMinLength(field.min);
      if (field.value) input.setValue(field.value.slice(0, field.max ?? 4000));
      if (field.placeholder) input.setPlaceholder(field.placeholder.slice(0, 100));
      label.setTextInputComponent(input);
    } else if (field.kind === "select") {
      const options = cleanOptions(field.options);
      label.setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId(field.id)
          .setRequired(field.required ?? true)
          .setMinValues(field.min ?? 1)
          .setMaxValues(Math.min(field.max ?? 1, options.length))
          .addOptions(options)
      );
    } else {
      label.setUserSelectMenuComponent(
        new UserSelectMenuBuilder()
          .setCustomId(field.id)
          .setRequired(field.required ?? false)
          .setMinValues(0)
          .setMaxValues(field.max ?? 5)
      );
    }
    m.addLabelComponents(label);
  }
  return m;
}

export function textValue(i: ModalSubmitInteraction, id: string): string | null {
  try {
    const value = i.fields.getTextInputValue(id).trim();
    return value || null;
  } catch {
    return null;
  }
}

export function selectValues(i: ModalSubmitInteraction, id: string): string[] {
  try {
    return [...i.fields.getStringSelectValues(id)];
  } catch {
    return [];
  }
}

export function userValues(i: ModalSubmitInteraction, id: string): string[] {
  try {
    return [...(i.fields.getSelectedUsers(id)?.keys() ?? [])];
  } catch {
    return [];
  }
}

/** "2026-12-01" or empty. Throws QuestError('bad_date') otherwise. */
export function parseDate(value: string | null): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new QuestError("bad_date");
  }
  return value;
}

export function jsonFile(name: string, data: unknown): AttachmentBuilder {
  return new AttachmentBuilder(Buffer.from(JSON.stringify(data, null, 2), "utf8"), { name });
}

export function textFile(name: string, text: string): AttachmentBuilder {
  return new AttachmentBuilder(Buffer.from(text, "utf8"), { name });
}

export { ButtonStyle };
