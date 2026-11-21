import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  Routes,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord.js";

import { ElementalError } from "../api";
import { notify, say, type ComponentOrModal, type ElCtx, type ElementalFeature } from "../context";
import { REPORT } from "../copy/report";
import { cid, isSnowflake, isUuid } from "../ids";
import { withRetry, type RetryOptions } from "../queue";
import { REPORT_STAFF, roleId } from "../roles";

/**
 * /report (E33): anyone in the guild, claimed or not, in any channel
 * (#start-here included) can tell the Safety staff that something is wrong.
 *
 * 1. /report opens a modal at once (no gate, no Paid check): what happened
 *    (required), where (optional); nobody has to be named.
 * 2. The submit is acknowledged ephemerally, saved with
 *    elemental_bot_report_add, then posted to the guild's #reports channel
 *    (settings.channels.reports) and nowhere else, with a Handled button.
 * 3. The reporter gets one ephemeral line. Nothing is ever posted in the
 *    channel /report was used in, and the bot never sends a DM.
 *
 * Posting is claimed per report (elemental_bot_post_claim kind 'report'),
 * so a retry of the same text (SQL returns the first report for 2 minutes)
 * posts once, and a failed post is posted on that retry.
 *
 * Handled is for Safety (and Host, who passes every gate), never Helper,
 * Mentor or Judge. Logs carry codes only, never the text.
 */

export const REPORT_COMMAND = "report";
/** Modal custom id action: el|report. */
export const REPORT_MODAL = "report";
/** Button custom id action: el|report_handled|<report uuid>. */
export const REPORT_HANDLED = "report_handled";
/** elemental_posts kind for a report's #reports message, keyed by report id. */
export const REPORT_POST_KIND = "report";

export const FIELD_TEXT = "text";
export const FIELD_WHERE = "where";
export const TEXT_MAX = 1000;
export const WHERE_MAX = 200;

/** A claim older than this (a crash between claim and send) may be taken over by a retry. */
const POST_LEASE_SECONDS = 60;
/** Bounded: the reporter is waiting on a deferred reply. */
export const POST_RETRY: RetryOptions = { maxAttempts: 4, baseDelayMs: 1_000, maxDelayMs: 10_000 };

export function reportModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(cid(REPORT_MODAL))
    .setTitle(REPORT.modalTitle.slice(0, 45))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(REPORT.modalNote))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(REPORT.textLabel.slice(0, 45))
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_TEXT)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(TEXT_MAX)
            .setPlaceholder(REPORT.textPlaceholder.slice(0, 100))
        ),
      new LabelBuilder()
        .setLabel(REPORT.whereLabel.slice(0, 45))
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_WHERE)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(WHERE_MAX)
            .setPlaceholder(REPORT.wherePlaceholder.slice(0, 100))
        )
    );
}

function fieldValue(i: ModalSubmitInteraction, id: string, max: number): string {
  try {
    return (i.fields.getTextInputValue(id) ?? "").trim().slice(0, max);
  } catch {
    return "";
  }
}

export interface ReportAdded {
  report_id: string;
  created_at?: string;
  repeated?: boolean;
}

export interface ReportPostInput {
  reportId: string;
  reporterId: string;
  /** Where /report was used (a channel id), if known. */
  fromChannelId: string | null;
  text: string;
  where: string;
  /** The Safety role, mentioned so Safety is notified (role pings only, never users). */
  safetyRoleId: string | null;
}

function handledRow(reportId: string, handled: boolean): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(cid(REPORT_HANDLED, reportId))
    .setLabel(REPORT.handledButton)
    .setStyle(handled ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(handled);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

/** The #reports message. The reporter is shown as a mention that pings nobody. */
export function reportPostBody(input: ReportPostInput): RESTPostAPIChannelMessageJSONBody {
  const embed = new EmbedBuilder()
    .setTitle(REPORT.postTitle)
    .setDescription(input.text)
    .addFields(
      { name: REPORT.fieldReporter, value: `<@${input.reporterId}>`, inline: true },
      ...(input.fromChannelId ? [{ name: REPORT.fieldFrom, value: `<#${input.fromChannelId}>`, inline: true }] : []),
      { name: REPORT.fieldWhere, value: input.where || REPORT.noWhere }
    )
    .setFooter({ text: input.reportId });
  const safety = input.safetyRoleId && isSnowflake(input.safetyRoleId) ? input.safetyRoleId : null;
  return {
    ...(safety ? { content: `<@&${safety}>` } : {}),
    embeds: [embed.toJSON()],
    components: [handledRow(input.reportId, false).toJSON()],
    allowed_mentions: { parse: [], roles: safety ? [safety] : [] },
  };
}

type PostOutcome = "posted" | "already" | "failed";

/**
 * Posts the report to #reports once. Returns "already" when another attempt
 * holds or finished the post, "failed" when there is no #reports channel or
 * Discord refused (marked failed, so the reporter's retry posts it).
 */
async function postReport(ctx: ElCtx, input: ReportPostInput): Promise<PostOutcome> {
  const claimed = await ctx.api.call<boolean>("elemental_bot_post_claim", ctx.guildId, REPORT_POST_KIND, input.reportId, POST_LEASE_SECONDS);
  if (!claimed) return "already";
  const channelId = ctx.settings.channels.reports ?? null;
  if (!channelId) {
    console.error("[elemental] report not posted: no reports channel in settings");
    await ctx.api.call("elemental_bot_post_mark", ctx.guildId, REPORT_POST_KIND, input.reportId, "failed", null);
    return "failed";
  }
  let messageId: string | null = null;
  try {
    const sent = (await withRetry(
      () => ctx.rt.client.rest.post(Routes.channelMessages(channelId), { body: reportPostBody(input) }),
      POST_RETRY
    )) as { id?: unknown } | null;
    messageId = isSnowflake(sent?.id) ? sent.id : null;
  } catch (error) {
    const e = error as { status?: number; code?: number | string; name?: string };
    console.error(`[elemental] report post failed: ${e?.status ?? e?.code ?? e?.name ?? "error"}`);
    await ctx.api.call("elemental_bot_post_mark", ctx.guildId, REPORT_POST_KIND, input.reportId, "failed", null);
    return "failed";
  }
  try {
    await ctx.api.call("elemental_bot_post_mark", ctx.guildId, REPORT_POST_KIND, input.reportId, "sent", messageId);
  } catch (error) {
    // The post is already in #reports: the reporter must hear "received", not
    // "try again" (a retry after the lease would post the report twice).
    const e = error as { code?: string; sqlstate?: string; name?: string };
    console.error(`[elemental] report posted but not marked sent: ${e?.code ?? e?.sqlstate ?? e?.name ?? "error"}`);
  }
  return "posted";
}

async function submitReport(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  if (!i.isModalSubmit()) return;
  const text = fieldValue(i, FIELD_TEXT, TEXT_MAX);
  const where = fieldValue(i, FIELD_WHERE, WHERE_MAX);
  if (!text) {
    await notify(i, REPORT.emptyText);
    return;
  }
  let added: ReportAdded;
  try {
    added = await ctx.api.call<ReportAdded>("elemental_bot_report_add", ctx.guildId, ctx.userId, text, where || null);
  } catch (error) {
    if (error instanceof ElementalError && error.code === "rate_limited") return notify(i, REPORT.rateLimited);
    if (error instanceof ElementalError && error.code === "bad_text") return notify(i, REPORT.emptyText);
    throw error;
  }
  if (!added || !isUuid(added.report_id)) throw new ElementalError("failed", undefined, "elemental_bot_report_add");

  const outcome = await postReport(ctx, {
    reportId: added.report_id,
    reporterId: ctx.userId,
    fromChannelId: ctx.channelId,
    text,
    where,
    safetyRoleId: roleId(ctx.settings, "safety"),
  });
  await say(i, outcome === "failed" ? REPORT.savedNotPosted : REPORT.received);
}

async function markHandled(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  const reportId = args[0];
  if (!isUuid(reportId)) {
    await notify(i, REPORT.notFound);
    return;
  }
  let result: { already?: boolean };
  try {
    result = await ctx.api.call<{ already?: boolean }>("elemental_bot_report_handled", ctx.guildId, reportId, ctx.userId);
  } catch (error) {
    if (error instanceof ElementalError && error.code === "report_not_found") return notify(i, REPORT.notFound);
    throw error;
  }
  if (result?.already) {
    // Someone pressed it first: their name stays on the post.
    await say(i, { components: [handledRow(reportId, true)] });
    await notify(i, REPORT.alreadyHandled);
    return;
  }
  await say(i, { content: REPORT.handledBy(`<@${ctx.userId}>`), components: [handledRow(reportId, true)] });
}

export const feature: ElementalFeature = {
  name: "report",
  commands: [
    {
      name: REPORT_COMMAND,
      description: REPORT.commandDescription.slice(0, 100),
    },
  ],
  commandHandlers: {
    // No gate and no Paid check: anyone in the guild, claimed or not, any channel.
    [REPORT_COMMAND]: {
      ack: "modal",
      async run(i) {
        await i.showModal(reportModal());
      },
    },
  },
  actions: {
    // The modal submit: ephemeral ack, so nothing shows in the channel it came from.
    [REPORT_MODAL]: { ack: "ephemeral", run: submitReport },
    // The button on the #reports post: Safety (and Host) only.
    [REPORT_HANDLED]: { ack: "update", gate: REPORT_STAFF, run: markHandled },
  },
};
