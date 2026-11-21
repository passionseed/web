import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  Routes,
  type ChatInputCommandInteraction,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord.js";

import { refusePii } from "../../../../lib/elemental/core/index";
import { ElementalError } from "../api";
import { notify, say, type ElCtx, type ElementalFeature, type ElementalRuntime, type RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { JOIN } from "../copy/join";
import { cid } from "../ids";
import { withRetry } from "../queue";
import { ELEMENTS, elementRoleIds, isElement, roleId, type ElementKey, type RoleKey } from "../roles";

/**
 * /join code: (E12) and the element picker.
 *
 * /join: #start-here only, ephemeral. elemental_bot_claim takes the guild id,
 * so the edition always comes from the guild's settings row: a rehearsal code
 * in the real guild is refused in SQL (wrong_edition). On success the bot
 * adds exactly the Paid role. Discord refusing the role (403: the bot's role
 * sits below Paid) costs the student nothing: the claim stands, they get a
 * friendly line, and staff get one alert.
 *
 * Picker: a Host posts five element buttons with /el picker. A click runs
 * elemental_bot_set_element first (claimed, not on a live team: SQL decides),
 * then swaps the element role so exactly one is held.
 *
 * Nothing the person typed is logged, echoed or sent anywhere but the claim
 * call, and only after it looks like a code.
 */

export const CLAIM_FN = "elemental_bot_claim";
export const SET_ELEMENT_FN = "elemental_bot_set_element";
export const MEMBER_GET_FN = "elemental_bot_member_get";
export const PICK_ACTION = "pick";

/** What elemental_bot_claim and elemental_bot_member_get return. */
export interface ClaimResult {
  member_id: string;
  edition: string;
  edition_kind: "event" | "rehearsal";
  already: boolean;
  is_staff: boolean;
  element_pick: string | null;
  team: Record<string, unknown> | null;
}

/** Same alphabet and length as elemental_issue_claims (no 0, 1, I, O). */
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;

/** As SQL does: uppercase, drop everything but letters and digits ("abcd-efgh" works). */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Refusals from elemental_bot_claim the person can act on. */
const CLAIM_REFUSALS: Record<string, string> = {
  unknown_code: JOIN.unknownCode,
  code_used: JOIN.codeUsed,
  wrong_edition: JOIN.wrongEdition,
  wrong_event: JOIN.wrongEvent,
  not_paid: JOIN.notPaid,
  registration_not_found: JOIN.registrationNotFound,
  already_claimed: JOIN.alreadyClaimed,
  unknown_guild: COMMON.notSetUp,
};

const PICK_REFUSALS: Record<string, string> = {
  not_claimed: JOIN.notClaimed,
  on_team: JOIN.onTeam,
  unknown_guild: COMMON.notSetUp,
};

// ---------------------------------------------------------------------------
// Discord REST: role edits and posts, with 429 retry (a 403 is not retried)
// ---------------------------------------------------------------------------

/** Tries per Discord call; discord.js already waits out most 429s itself. */
const DISCORD_ATTEMPTS = 3;
const AUDIT_REASON = "Elemental /join";

function rest(rt: ElementalRuntime) {
  return rt.client.rest;
}

export function isForbidden(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 403;
}

async function addRole(rt: ElementalRuntime, guildId: string, userId: string, role: string): Promise<void> {
  await withRetry(() => rest(rt).put(Routes.guildMemberRole(guildId, userId, role), { reason: AUDIT_REASON }), {
    maxAttempts: DISCORD_ATTEMPTS,
  });
}

async function removeRole(rt: ElementalRuntime, guildId: string, userId: string, role: string): Promise<void> {
  await withRetry(() => rest(rt).delete(Routes.guildMemberRole(guildId, userId, role), { reason: AUDIT_REASON }), {
    maxAttempts: DISCORD_ATTEMPTS,
  });
}

async function postMessage(rt: ElementalRuntime, channelId: string, body: RESTPostAPIChannelMessageJSONBody): Promise<void> {
  await withRetry(() => rest(rt).post(Routes.channelMessages(channelId), { body }), { maxAttempts: DISCORD_ATTEMPTS });
}

// ---------------------------------------------------------------------------
// Staff alerts: one per guild and problem, then quiet for a while
// ---------------------------------------------------------------------------

export const ALERT_COOLDOWN_MS = 30 * 60_000;
const ALERTS = new WeakMap<ElementalRuntime, Map<string, number>>();

/** Where staff alerts go: the staff mirror channel, else #reports. */
export function staffAlertChannel(ctx: Pick<ElCtx, "settings">): string | null {
  return ctx.settings.channels.mirror ?? ctx.settings.channels.reports ?? null;
}

/**
 * Posts text to the staff channel once per (guild, key) per cooldown, so 200
 * students hitting the same role problem make one alert, not 200. Never
 * names a student. Never throws.
 */
export async function staffAlert(ctx: ElCtx, key: string, text: string, now: () => number = Date.now): Promise<boolean> {
  const sent = ALERTS.get(ctx.rt) ?? new Map<string, number>();
  ALERTS.set(ctx.rt, sent);
  const mapKey = `${ctx.guildId}:${key}`;
  const last = sent.get(mapKey);
  if (last !== undefined && now() - last < ALERT_COOLDOWN_MS) return false;
  const channelId = staffAlertChannel(ctx);
  if (!channelId) {
    console.error(`[elemental] staff alert ${key}: no staff channel set`);
    return false;
  }
  sent.set(mapKey, now());
  try {
    await postMessage(ctx.rt, channelId, { content: text, allowed_mentions: { parse: [] } });
    return true;
  } catch (error) {
    sent.delete(mapKey);
    console.error(`[elemental] staff alert ${key} failed: ${(error as Error)?.name ?? "error"}`);
    return false;
  }
}

type RoleOutcome = "ok" | "missing_role" | "forbidden" | "failed";

/** Reports a role failure to staff (once) and logs its kind, never the person. */
async function reportRoleProblem(ctx: ElCtx, outcome: RoleOutcome, key: RoleKey, where: string): Promise<void> {
  if (outcome === "forbidden") await staffAlert(ctx, "roles_forbidden", JOIN.staffRoleForbidden);
  else if (outcome === "missing_role") await staffAlert(ctx, `role_missing_${key}`, JOIN.staffRoleMissing(key));
  else if (outcome === "failed") console.error(`[elemental] ${where}: role change failed`);
}

async function roleCall(task: () => Promise<void>): Promise<RoleOutcome> {
  try {
    await task();
    return "ok";
  } catch (error) {
    return isForbidden(error) ? "forbidden" : "failed";
  }
}

/** Adds the Paid role unless the member already holds it. */
async function ensurePaid(ctx: ElCtx): Promise<RoleOutcome> {
  const paid = roleId(ctx.settings, "paid");
  if (!paid) return "missing_role";
  if (ctx.memberRoleIds.includes(paid)) return "ok";
  return roleCall(() => addRole(ctx.rt, ctx.guildId, ctx.userId, paid));
}

/** Adds element's role, then removes every other element role the member holds. */
async function swapElementRole(ctx: ElCtx, element: ElementKey): Promise<RoleOutcome> {
  const target = roleId(ctx.settings, element);
  if (!target) return "missing_role";
  if (!ctx.memberRoleIds.includes(target)) {
    const added = await roleCall(() => addRole(ctx.rt, ctx.guildId, ctx.userId, target));
    if (added !== "ok") return added;
  }
  for (const other of elementRoleIds(ctx.settings)) {
    if (other.element === element || !ctx.memberRoleIds.includes(other.roleId)) continue;
    const removed = await roleCall(() => removeRole(ctx.rt, ctx.guildId, ctx.userId, other.roleId));
    if (removed !== "ok") return removed;
  }
  return "ok";
}

// ---------------------------------------------------------------------------
// /join code:
// ---------------------------------------------------------------------------

function refusal(error: unknown, table: Record<string, string>): string | null {
  return error instanceof ElementalError ? (table[error.code] ?? null) : null;
}

function joinedText(result: ClaimResult | null, again: boolean): string {
  const lines: string[] = [again ? JOIN.joinedAgain : JOIN.joined];
  if (result && isElement(result.element_pick)) lines.push(JOIN.currentElement(result.element_pick));
  return lines.join("\n");
}

async function runJoin(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const startHere = ctx.settings.channels.start_here;
  if (startHere && ctx.channelId !== startHere) {
    await notify(i, JOIN.wrongChannel(startHere));
    return;
  }

  const typed = i.options.getString("code", true);
  const code = normalizeCode(typed);
  if (!CODE.test(code)) {
    // Not a code: no database call. Say so without repeating it, and if it
    // looks like a contact, say that instead.
    const pii = refusePii({ code: typed });
    await notify(i, pii.ok ? JOIN.unknownCode : JOIN.codeLooksLikeContact);
    return;
  }

  let result: ClaimResult;
  try {
    result = await ctx.api.call<ClaimResult>(CLAIM_FN, ctx.guildId, code, ctx.userId);
  } catch (error) {
    const text = refusal(error, CLAIM_REFUSALS);
    if (!text) throw error;
    if (error instanceof ElementalError && error.code === "already_claimed") {
      await repairPaid(ctx);
    }
    await notify(i, text);
    return;
  }

  const outcome = await ensurePaid(ctx);
  if (outcome !== "ok") {
    await reportRoleProblem(ctx, outcome, "paid", "/join");
    await say(i, JOIN.rolePending);
    return;
  }
  await say(i, joinedText(result, result.already === true));
}

/**
 * Already a member of this edition (another code, or staff linked them): put
 * the Paid role back if it went missing. Best effort, quiet on failure.
 */
async function repairPaid(ctx: ElCtx): Promise<void> {
  const paid = roleId(ctx.settings, "paid");
  if (!paid || ctx.memberRoleIds.includes(paid)) return;
  try {
    const member = await ctx.api.call<ClaimResult | null>(MEMBER_GET_FN, ctx.guildId, ctx.userId);
    if (!member || member.is_staff) return;
  } catch {
    return;
  }
  const outcome = await ensurePaid(ctx);
  if (outcome !== "ok") await reportRoleProblem(ctx, outcome, "paid", "/join repair");
}

// ---------------------------------------------------------------------------
// Element picker
// ---------------------------------------------------------------------------

export function pickerMessage(): RESTPostAPIChannelMessageJSONBody {
  return {
    content: JOIN.pickerPost,
    allowed_mentions: { parse: [] },
    components: [
      {
        type: ComponentType.ActionRow,
        components: ELEMENTS.map((element) => ({
          type: ComponentType.Button as const,
          style: ButtonStyle.Secondary as const,
          label: JOIN.pickerButton(element),
          custom_id: cid(PICK_ACTION, element),
        })),
      },
    ],
  };
}

async function runPostPicker(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const channelId = ctx.settings.channels.start_here ?? ctx.channelId;
  if (!channelId) {
    await notify(i, JOIN.pickerNoChannel);
    return;
  }
  await postMessage(ctx.rt, channelId, pickerMessage());
  await say(i, JOIN.pickerPosted(channelId));
}

async function runPick(i: RepliableInteraction, ctx: ElCtx, args: string[]): Promise<void> {
  const element = (args[0] ?? "").trim().toLowerCase();
  if (!isElement(element)) {
    await notify(i, COMMON.failed);
    return;
  }
  try {
    await ctx.api.call(SET_ELEMENT_FN, ctx.guildId, ctx.userId, element);
  } catch (error) {
    const text = refusal(error, PICK_REFUSALS);
    if (!text) throw error;
    await notify(i, text);
    return;
  }
  const outcome = await swapElementRole(ctx, element);
  if (outcome !== "ok") {
    await reportRoleProblem(ctx, outcome, element, "el|pick");
    await say(i, JOIN.pickRolePending(element));
    return;
  }
  await say(i, JOIN.picked(element));
}

// ---------------------------------------------------------------------------
// The feature
// ---------------------------------------------------------------------------

export const feature: ElementalFeature = {
  name: "join",
  commands: [
    {
      name: "join",
      description: JOIN.commandDescription,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "code",
          description: JOIN.codeDescription,
          required: true,
          min_length: 4,
          max_length: 32,
        },
      ],
    },
  ],
  staffSubcommands: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "picker",
      description: JOIN.pickerDescription,
    },
  ],
  commandHandlers: {
    join: { ack: "ephemeral", run: runJoin },
    // Host only (Host always passes a gate; "host" is the only role listed).
    "el picker": { ack: "ephemeral", gate: ["host"], run: runPostPicker },
  },
  actions: {
    [PICK_ACTION]: { ack: "ephemeral", run: runPick },
  },
};
