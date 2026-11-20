import {
  MessageFlags,
  PermissionFlagsBits,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type InteractionEditReplyOptions,
} from "discord.js";

import type { HackathonOpsEnv } from "../env";
import { OpsError, type OpsApi } from "./api";
import { OPS_COMMAND } from "./commands";
import {
  boardEmbed,
  clip,
  operationChoices,
  resolveOperation,
  resolveStep,
  showEmbed,
  stepChoices,
  type OpSummary,
} from "./model";

export interface OpsContext {
  api: OpsApi;
  env: Pick<HackathonOpsEnv, "guildId" | "channelId" | "staffRoleId">;
  now: () => number;
}

/** Nobody is ever pinged by the ops board: names in its text stay plain text. */
export const NO_PINGS = { parse: [] as [] };

const ERRORS: Record<string, string> = {
  not_staff: "Only the staff role can use /ops.",
  not_found: "No operation by that name. Pick one from the list.",
  step_not_found: "No step by that number. Pick one from the list.",
  bad_status: "The status must be 1 to 300 characters.",
  bad_owner: "Your display name could not be used as the owner.",
};
const FALLBACK_ERROR = "The board could not be reached. Try again in a minute.";

export function errorText(error: unknown): string {
  return error instanceof OpsError ? (ERRORS[error.code] ?? FALLBACK_ERROR) : FALLBACK_ERROR;
}

/** The member holds the role: a cached GuildMember (roles.cache) or the raw API member (roles: string[]). */
export function hasRole(member: unknown, roleId: string): boolean {
  const roles = (member as { roles?: unknown } | null | undefined)?.roles;
  if (Array.isArray(roles)) return roles.includes(roleId);
  const cache = (roles as { cache?: { has(id: string): boolean } } | undefined)?.cache;
  return cache?.has(roleId) ?? false;
}

/** The name the server shows for the caller. */
export function displayNameOf(i: Pick<Interaction, "member" | "user">): string {
  const member = i.member as { displayName?: string; nick?: string | null } | null;
  const name = member?.displayName || member?.nick || i.user.globalName || i.user.username;
  return clip(name.trim() || i.user.username, 100);
}

/**
 * The channel is the configured one and @everyone cannot see it, so a reply
 * there is seen by staff only. Anywhere else, every reply is private.
 */
export function isStaffChannel(channel: unknown, channelId: string): boolean {
  const c = channel as {
    id?: string;
    guild?: { roles?: { everyone?: unknown } };
    permissionsFor?: (who: unknown) => { has(flag: bigint): boolean } | null;
  } | null;
  if (!c || c.id !== channelId || typeof c.permissionsFor !== "function") return false;
  const everyone = c.guild?.roles?.everyone;
  if (!everyone) return false;
  const perms = c.permissionsFor(everyone);
  return !!perms && !perms.has(PermissionFlagsBits.ViewChannel);
}

async function findOperation(api: OpsApi, input: string): Promise<OpSummary> {
  const op = resolveOperation(await api.board(), input);
  if (!op) throw new OpsError("not_found");
  return op;
}

/** What one subcommand replies with (before mentions are switched off). */
export async function runSubcommand(
  ctx: OpsContext,
  i: Pick<ChatInputCommandInteraction, "options" | "member" | "user">
): Promise<InteractionEditReplyOptions> {
  const { api } = ctx;
  const sub = i.options.getSubcommand();
  const now = ctx.now();

  if (sub === "board") {
    return { embeds: [boardEmbed(await api.board(), now)] };
  }

  const op = await findOperation(api, i.options.getString("operation", true));

  if (sub === "show") {
    return { embeds: [showEmbed(await api.show(op.slug), now)] };
  }

  if (sub === "claim") {
    const name = displayNameOf(i);
    const result = await api.claim(op.slug, name);
    const before = result.previous_owner && result.previous_owner !== name ? ` (was ${result.previous_owner})` : "";
    return { content: `**${name}** now owns **${result.title}**${before}.` };
  }

  if (sub === "done") {
    const detail = await api.show(op.slug);
    const step = resolveStep(detail.steps, i.options.getString("step", true));
    if (!step) throw new OpsError("step_not_found");
    const undo = i.options.getBoolean("undo") ?? false;
    const result = await api.setStep(op.slug, step.position, !undo, displayNameOf(i));
    const progress = `(${result.steps_done}/${result.steps_total})`;
    const which = `step ${result.position} of **${result.title}**`;
    const text = clip(result.text, 300);
    if (!result.changed) {
      return { content: `${undo ? "Not ticked" : "Already ticked"}: ${which}. ${progress}` };
    }
    return { content: `${undo ? "⬜ Unticked" : "✅ Ticked"} ${which}: ${text} ${progress}` };
  }

  if (sub === "status") {
    const status = i.options.getString("text", true).trim();
    if (!status || status.length > 300) throw new OpsError("bad_status");
    const result = await api.setStatus(op.slug, status);
    return { content: `Status of **${result.title}**: ${result.status ?? status}` };
  }

  throw new OpsError("not_found");
}

async function autocomplete(ctx: OpsContext, i: AutocompleteInteraction): Promise<void> {
  // Outside the staff role the lists stay empty: step text is staff-only too.
  if (!hasRole(i.member, ctx.env.staffRoleId)) {
    await i.respond([]);
    return;
  }
  const focused = i.options.getFocused(true);
  const ops = await ctx.api.board();
  if (focused.name === "operation") {
    await i.respond(operationChoices(ops, String(focused.value)));
    return;
  }
  if (focused.name === "step") {
    const op = resolveOperation(ops, i.options.getString("operation") ?? "");
    await i.respond(op ? stepChoices((await ctx.api.show(op.slug)).steps, String(focused.value)) : []);
    return;
  }
  await i.respond([]);
}

async function command(ctx: OpsContext, i: ChatInputCommandInteraction): Promise<void> {
  if (!hasRole(i.member, ctx.env.staffRoleId)) {
    await i.reply({ content: errorText(new OpsError("not_staff")), flags: MessageFlags.Ephemeral, allowedMentions: NO_PINGS });
    return;
  }
  const shared = isStaffChannel(i.channel, ctx.env.channelId);
  await i.deferReply(shared ? {} : { flags: MessageFlags.Ephemeral });
  try {
    const reply = await runSubcommand(ctx, i);
    await i.editReply({ ...reply, allowedMentions: NO_PINGS });
  } catch (error) {
    const content = errorText(error);
    if (shared) {
      // The thinking message was public: remove it, and say what went wrong to the caller only.
      await i.deleteReply().catch(() => undefined);
      await i.followUp({ content, flags: MessageFlags.Ephemeral, allowedMentions: NO_PINGS });
    } else {
      await i.editReply({ content, allowedMentions: NO_PINGS });
    }
  }
}

/** /ops in the configured server only; everything else is another module's. */
export async function handleOpsInteraction(ctx: OpsContext, i: Interaction): Promise<void> {
  if (!i.inGuild() || i.guildId !== ctx.env.guildId) return;
  if (i.isAutocomplete()) {
    if (i.commandName !== OPS_COMMAND) return;
    await autocomplete(ctx, i).catch(() => i.respond([]).catch(() => undefined));
    return;
  }
  if (i.isChatInputCommand()) {
    if (i.commandName !== OPS_COMMAND) return;
    await command(ctx, i).catch((error: unknown) => {
      console.error(`[hackathon-ops] /ops failed: ${(error as Error)?.name ?? "unknown"}`);
    });
  }
}
