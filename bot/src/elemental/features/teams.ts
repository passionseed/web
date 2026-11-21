import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  Events,
  TextInputStyle,
  type APIActionRowComponent,
  type APIComponentInMessageActionRow,
  type APIModalInteractionResponseCallbackData,
  type ChatInputCommandInteraction,
  type Client,
  type MessageComponentInteraction,
} from "discord.js";

import { refusePii } from "../../../../lib/elemental/core";
import { candidateSlots } from "../../../../lib/elemental/island/sectors";
import { ElementalError } from "../api";
import { SWEEP_INTERVAL_MS, channelPort, enqueueTeamChannel, onTeamLive, sweepPendingTeams, type TeamJson } from "../channels";
import { notify, say, type ComponentOrModal, type ElCtx, type ElementalFeature, type ElementalSettings } from "../context";
import { COPY, teamErrorText } from "../copy/teams";
import { cid, isSnowflake, isUuid } from "../ids";
import { withRetry } from "../queue";
import { ELEMENTS, elementOf, isElement, requirePaid, type ElementKey } from "../roles";

/**
 * /team create (E13): a student makes a PENDING team, each teammate gets an
 * Accept/Decline message in #start-here, and the first Accept takes the team
 * live (SQL picks the slot from candidateSlots). The private channel is then
 * made on the channel queue (channels.ts), which also retries after 429s and
 * restarts.
 *
 * Flow: /team create → project-name form → a private panel with an element
 * select, a teammate select (1-4) and "send invites" → _team_create.
 * Every check that can be made in the bot (window, sizes, PII, claimed, free)
 * is made before any database write; SQL checks them all again.
 */

const CMD = "team";
const SUB_CREATE = "create";

/** Custom-id actions. Invite buttons carry ids only: el|tacc|<team uuid>|<invitee>|<element>. */
export const ACTIONS = {
  name: "tname",
  reopen: "tnew",
  element: "tel",
  members: "tmem",
  create: "tgo",
  accept: "tacc",
  decline: "tdec",
} as const;

export const NAME_INPUT = "name";
export const NAME_MIN = 3;
export const NAME_MAX = 60;
export const MIN_INVITEES = 1;
export const MAX_INVITEES = 4;

// ---------------------------------------------------------------------------
// The create window
// ---------------------------------------------------------------------------

export type CreateWindow = "open" | "not_yet" | "closed";

/** Open in [team_create_opens_at, team_create_closes_at); no opens_at means not open yet. */
export function createWindow(settings: Pick<ElementalSettings, "teamCreateOpensAt" | "teamCreateClosesAt">, now = Date.now()): CreateWindow {
  const opens = settings.teamCreateOpensAt ? Date.parse(settings.teamCreateOpensAt) : NaN;
  if (!Number.isFinite(opens) || now < opens) return "not_yet";
  const closes = settings.teamCreateClosesAt ? Date.parse(settings.teamCreateClosesAt) : NaN;
  if (Number.isFinite(closes) && now >= closes) return "closed";
  return "open";
}

function windowRefusal(settings: ElementalSettings): string | null {
  const w = createWindow(settings);
  return w === "open" ? null : w === "not_yet" ? COPY.notOpenYet : COPY.closed;
}

// ---------------------------------------------------------------------------
// Drafts: the project name between the form and "send invites". In memory
// only (a restart asks to start again); never logged.
// ---------------------------------------------------------------------------

export const DRAFT_TTL_MS = 30 * 60_000;

interface Draft {
  name: string;
  element: ElementKey | null;
  invitees: string[];
  at: number;
}

const drafts = new Map<string, Draft>();

function draftKey(ctx: Pick<ElCtx, "guildId" | "userId">): string {
  return `${ctx.guildId}:${ctx.userId}`;
}

function getDraft(ctx: Pick<ElCtx, "guildId" | "userId">): Draft | null {
  const d = drafts.get(draftKey(ctx));
  if (!d) return null;
  if (Date.now() - d.at > DRAFT_TTL_MS) {
    drafts.delete(draftKey(ctx));
    return null;
  }
  return d;
}

function sweepDrafts(): void {
  const now = Date.now();
  for (const [key, d] of drafts) if (now - d.at > DRAFT_TTL_MS) drafts.delete(key);
}

/** Tests only. */
export function clearDrafts(): void {
  drafts.clear();
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/** Spaces collapsed and trimmed, as SQL's elemental__project_name does. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function nameModal(retry = false): APIModalInteractionResponseCallbackData {
  return {
    custom_id: cid(ACTIONS.name),
    title: retry ? COPY.modalTitleRetry : COPY.modalTitle,
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            custom_id: NAME_INPUT,
            label: COPY.nameLabel,
            placeholder: COPY.namePlaceholder,
            style: TextInputStyle.Short,
            min_length: NAME_MIN,
            max_length: NAME_MAX,
            required: true,
          },
        ],
      },
    ],
  };
}

type Row = APIActionRowComponent<APIComponentInMessageActionRow>;

function retryRow(): Row {
  return {
    type: ComponentType.ActionRow,
    components: [{ type: ComponentType.Button, custom_id: cid(ACTIONS.reopen), label: COPY.retryButton, style: ButtonStyle.Secondary }],
  };
}

function draftView(d: Draft) {
  const rows: Row[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.StringSelect,
          custom_id: cid(ACTIONS.element),
          placeholder: COPY.elementPlaceholder,
          min_values: 1,
          max_values: 1,
          options: ELEMENTS.map((e) => ({ label: COPY.elementOption(e), value: e, default: d.element === e })),
        },
      ],
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.UserSelect,
          custom_id: cid(ACTIONS.members),
          placeholder: COPY.membersPlaceholder,
          min_values: MIN_INVITEES,
          max_values: MAX_INVITEES,
          default_values: d.invitees.map((id) => ({ id, type: "user" as never })),
        },
      ],
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          custom_id: cid(ACTIONS.create),
          label: COPY.createButton,
          style: ButtonStyle.Primary,
          disabled: !d.element || d.invitees.length < MIN_INVITEES,
        },
      ],
    },
  ];
  return { content: COPY.draft(d.name, d.element, d.invitees), components: rows };
}

function inviteRow(teamId: string, inviteeId: string, element: ElementKey): Row {
  return {
    type: ComponentType.ActionRow,
    components: [
      { type: ComponentType.Button, custom_id: cid(ACTIONS.accept, teamId, inviteeId, element), label: COPY.acceptButton, style: ButtonStyle.Success },
      { type: ComponentType.Button, custom_id: cid(ACTIONS.decline, teamId, inviteeId, element), label: COPY.declineButton, style: ButtonStyle.Secondary },
    ],
  };
}

// ---------------------------------------------------------------------------
// Checks before any write
// ---------------------------------------------------------------------------

/** A refusal shown to the person; nothing was written. */
class Refusal extends Error {
  constructor(
    public readonly text: string,
    public readonly retry = false
  ) {
    super("refused");
    this.name = "Refusal";
  }
}

function checkName(name: string): void {
  if (name.length < NAME_MIN || name.length > NAME_MAX) throw new Refusal(COPY.nameLength, true);
  // The matched text is never echoed or logged; the form names the field.
  if (!refusePii({ project_name: name }).ok) throw new Refusal(COPY.namePii, true);
}

/** Teammates other than the creator, deduplicated, 1-4 of them. */
export function checkInvitees(creatorId: string, invitees: readonly string[]): string[] {
  const others = [...new Set(invitees)].filter((id) => id !== creatorId);
  if (others.some((id) => !isSnowflake(id))) throw new Refusal(COPY.teamSize);
  if (others.length < MIN_INVITEES || others.length > MAX_INVITEES) throw new Refusal(COPY.teamSize);
  return others;
}

interface MemberJson {
  member_id: string;
  team: TeamJson | null;
}

/** Reads only: creator and every invitee claimed and on no live team. */
async function checkPeople(ctx: ElCtx, invitees: readonly string[]): Promise<void> {
  const me = await ctx.api.call<MemberJson | null>("elemental_bot_member_get", ctx.guildId, ctx.userId);
  if (!me) throw new Refusal(teamErrorText("not_claimed")!);
  if (me.team) throw new Refusal(teamErrorText("already_teamed")!);
  for (const id of invitees) {
    const m = await ctx.api.call<MemberJson | null>("elemental_bot_member_get", ctx.guildId, id);
    if (!m) throw new Refusal(teamErrorText("invitee_not_claimed", id)!);
    if (m.team) throw new Refusal(teamErrorText("invitee_teamed", id)!);
  }
}

/** Shows a refusal or a known SQL code; anything else goes to the wrapper. */
async function answerRefusal(i: ComponentOrModal | ChatInputCommandInteraction, error: unknown): Promise<boolean> {
  if (error instanceof Refusal) {
    if (error.retry) await say(i, { content: error.text, components: [retryRow()] });
    else await notify(i, error.text);
    return true;
  }
  if (error instanceof ElementalError) {
    const text = teamErrorText(error.code, isSnowflake(error.detail) ? error.detail : undefined);
    if (text) {
      const retry = error.code === "pii" || error.code === "bad_project_name";
      if (retry) await say(i, { content: text, components: [retryRow()] });
      else await notify(i, text);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Posting the invites
// ---------------------------------------------------------------------------

const INVITE_POST_KIND = "team_invite";

/** One message per pending invitee in #start-here, once each (elemental_posts claim). Returns how many failed. */
async function postInvites(ctx: ElCtx, team: TeamJson, creatorId: string, invitees: readonly string[]): Promise<number> {
  const channelId = ctx.settings.channels.start_here;
  if (!channelId) return invitees.length;
  const port = channelPort(ctx.rt, ctx.guildId);
  let failed = 0;
  for (const inviteeId of invitees) {
    const key = `${team.team_id}:${inviteeId}`;
    try {
      const claimed = await ctx.api.call<boolean>("elemental_bot_post_claim", ctx.guildId, INVITE_POST_KIND, key, 300);
      if (!claimed) continue;
      try {
        const sent = await withRetry(
          () =>
            port.send(channelId, {
              content: COPY.invite({ inviteeId, creatorId, name: team.project_name, element: team.element }),
              // Only the invitee is pinged; the creator's mention stays silent.
              allowedMentions: { parse: [], users: [inviteeId] },
              components: [inviteRow(team.team_id, inviteeId, team.element)],
            }),
          { maxAttempts: 3 }
        );
        await ctx.api.call("elemental_bot_post_mark", ctx.guildId, INVITE_POST_KIND, key, "sent", sent.id);
      } catch (error) {
        await ctx.api.call("elemental_bot_post_mark", ctx.guildId, INVITE_POST_KIND, key, "failed", null).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      failed += 1;
      console.error(`[elemental] team invite not posted: ${(error as { status?: number })?.status ?? (error as Error)?.name ?? "error"}`);
    }
  }
  return failed;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function openForm(i: ChatInputCommandInteraction | MessageComponentInteraction, ctx: ElCtx, retry: boolean): Promise<void> {
  requirePaid(ctx);
  const refusal = windowRefusal(ctx.settings);
  if (refusal) {
    await notify(i, refusal);
    return;
  }
  await i.showModal(nameModal(retry));
}

async function onName(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  requirePaid(ctx);
  const refusal = windowRefusal(ctx.settings);
  if (refusal) return notify(i, refusal);
  if (!i.isModalSubmit()) return;
  try {
    const name = cleanName(i.fields.getTextInputValue(NAME_INPUT) ?? "");
    checkName(name);
    sweepDrafts();
    const previous = getDraft(ctx);
    const draft: Draft = {
      name,
      element: previous?.element ?? elementOf(ctx.memberRoleIds, ctx.settings),
      invitees: previous?.invitees ?? [],
      at: Date.now(),
    };
    drafts.set(draftKey(ctx), draft);
    await say(i, draftView(draft));
  } catch (error) {
    if (!(await answerRefusal(i, error))) throw error;
  }
}

async function onElement(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  const draft = getDraft(ctx);
  if (!draft) return say(i, { content: COPY.draftGone, components: [] });
  const value = i.isStringSelectMenu() ? i.values[0] : undefined;
  if (!isElement(value)) return notify(i, COPY.needElement);
  draft.element = value;
  draft.at = Date.now();
  await say(i, draftView(draft));
}

async function onMembers(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  const draft = getDraft(ctx);
  if (!draft) return say(i, { content: COPY.draftGone, components: [] });
  if (!i.isUserSelectMenu()) return;
  if (i.users.some((u) => u.bot)) return notify(i, COPY.noBots);
  draft.invitees = i.values.filter((id) => id !== ctx.userId).slice(0, 10);
  draft.at = Date.now();
  await say(i, draftView(draft));
}

async function onCreate(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  const draft = getDraft(ctx);
  if (!draft) return say(i, { content: COPY.draftGone, components: [] });
  try {
    requirePaid(ctx);
    const refusal = windowRefusal(ctx.settings);
    if (refusal) throw new Refusal(refusal);
    checkName(draft.name);
    if (!draft.element) throw new Refusal(COPY.needElement);
    const invitees = checkInvitees(ctx.userId, draft.invitees);
    await checkPeople(ctx, invitees);

    const team = await ctx.api.call<TeamJson & { repeated?: boolean }>(
      "elemental_bot_team_create",
      ctx.guildId,
      ctx.userId,
      draft.name,
      draft.element,
      invitees
    );
    drafts.delete(draftKey(ctx));
    const pending = team.invites.filter((inv) => !inv.is_creator && inv.state === "pending").map((inv) => inv.discord_user_id);
    const failed = await postInvites(ctx, team, ctx.userId, pending.length ? pending : invitees);
    await say(i, { content: failed ? COPY.invitesNotPosted : COPY.created({ name: team.project_name, invitees }), components: [] });
  } catch (error) {
    if (!(await answerRefusal(i, error))) throw error;
  }
}

/** Codes after which the invite can never be answered again: its buttons go. */
const CLOSED_CODES = new Set(["team_not_found", "team_archived", "invite_closed", "invite_expired", "team_full", "already_teamed"]);

async function closeInvite(i: ComponentOrModal, content: string): Promise<void> {
  if (!i.isMessageComponent()) return;
  await i.editReply({ content, components: [], allowedMentions: { parse: [] } }).catch(() => undefined);
}

async function onAnswer(i: ComponentOrModal, ctx: ElCtx, args: string[], accept: boolean): Promise<void> {
  const [teamId, inviteeId, elementArg] = args;
  // Only the invitee's click counts: anyone else gets a private line and nothing changes.
  if (!inviteeId || ctx.userId !== inviteeId) return notify(i, COPY.notYours);
  if (!isUuid(teamId)) return notify(i, COPY.inviteClosed);
  try {
    if (!accept) {
      await ctx.api.call("elemental_bot_team_decline", ctx.guildId, teamId, ctx.userId);
      await closeInvite(i, COPY.inviteDeclined(ctx.userId));
      await notify(i, COPY.declined);
      return;
    }
    let element: ElementKey | null = isElement(elementArg) ? elementArg : null;
    if (!element) {
      const team = await ctx.api.call<TeamJson | null>("elemental_bot_team_get", ctx.guildId, teamId);
      element = team && isElement(team.element) ? team.element : null;
    }
    const slots = element ? candidateSlots(element) : [];
    const team = await ctx.api.call<TeamJson & { activated: boolean; joined: boolean; repeated: boolean }>(
      "elemental_bot_team_accept",
      ctx.guildId,
      teamId,
      ctx.userId,
      slots
    );
    await closeInvite(i, COPY.inviteAccepted(ctx.userId, team.project_name));
    if (team.activated) {
      void onTeamLive(ctx.rt, ctx.guildId, ctx.settings.edition, team);
      await notify(i, COPY.activated(team.slot ?? 0));
    } else if (team.joined || (team.repeated && team.slot)) {
      void enqueueTeamChannel(ctx.rt, ctx.guildId, team.team_id);
      await notify(i, COPY.joined(team.slot));
    } else {
      await notify(i, COPY.acceptedWaiting);
    }
  } catch (error) {
    if (error instanceof ElementalError && CLOSED_CODES.has(error.code)) {
      await closeInvite(i, COPY.inviteClosed);
    }
    if (!(await answerRefusal(i, error))) throw error;
  }
}

export const feature: ElementalFeature = {
  name: "teams",
  commands: [
    {
      name: CMD,
      description: COPY.commandDescription,
      options: [{ type: ApplicationCommandOptionType.Subcommand, name: SUB_CREATE, description: COPY.createDescription }],
    },
  ],
  commandHandlers: {
    [`${CMD} ${SUB_CREATE}`]: { ack: "modal", run: (i, ctx) => openForm(i, ctx, false) },
  },
  actions: {
    [ACTIONS.reopen]: {
      ack: "modal",
      run: async (i, ctx) => {
        if (i.isMessageComponent()) await openForm(i, ctx, true);
      },
    },
    [ACTIONS.name]: { ack: "ephemeral", run: (i, ctx) => onName(i, ctx) },
    [ACTIONS.element]: { ack: "update", run: (i, ctx) => onElement(i, ctx) },
    [ACTIONS.members]: { ack: "update", run: (i, ctx) => onMembers(i, ctx) },
    [ACTIONS.create]: { ack: "update", run: (i, ctx) => onCreate(i, ctx) },
    [ACTIONS.accept]: { ack: "update", run: (i, ctx, args) => onAnswer(i, ctx, args, true) },
    [ACTIONS.decline]: { ack: "update", run: (i, ctx, args) => onAnswer(i, ctx, args, false) },
  },
  start(rt) {
    // Teams that went live before a restart (or whose channel failed) get their channel now, then every few minutes.
    const sweep = () => void sweepPendingTeams(rt).catch(() => undefined);
    // The module starts before login: the first sweep waits for the gateway (the bot's own id, the channel cache).
    const client = rt.client as Partial<Pick<Client, "isReady" | "once">>;
    if (typeof client.isReady === "function" && !client.isReady() && typeof client.once === "function") {
      client.once(Events.ClientReady, sweep);
    } else {
      sweep();
    }
    const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  },
};
