/**
 * Squads: opt-in groups of 3 to 4 student builders on a short sprint with a
 * target they chose. Visible only to their members; celebrated as one group
 * number; never ranked against other squads or between members. Students
 * only: no adult ever shares a squad with a student (safeguarding). Behind
 * the squads switch (/admin feature squads, off by default): while it is off,
 * /squad stays registered and answers that squads are not open yet.
 */
import type { ButtonBuilder } from "discord.js";

import { isStaff, requireStudent, type Ctx } from "../context";
import { T, errorText, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I, SQ } from "../island/copy";
import { ButtonStyle, GateError, button, buttonRows, show, type Block, type Replyable, type Row, type View } from "../ui";
import type { HandlerSet } from "./types";

type Phase = "forming" | "running" | "ended";

export interface SquadSummary {
  id: string;
  name: string;
  status: "active" | "invited";
  starts_on: string;
  ends_on: string;
  phase?: Phase;
  running: boolean;
  members_active?: number;
  invite_expires_at?: string | null;
}

export interface SquadView {
  id: string;
  name: string;
  target: string | null;
  starts_on: string;
  ends_on: string;
  days_left: number;
  phase?: Phase;
  running?: boolean;
  members_active?: number;
  /** The group's one number: counted milestones in the window, each project once. Null while forming. */
  milestones_gained?: number | null;
  /** Names only: the database never sends a number per member. */
  members: { name: string | null; me: boolean }[];
}

/**
 * Invites listed on the invites card; the first two get answer buttons (SQ.moreInvites
 * says so), and the next ones get theirs once those are answered. /inbox offers two too.
 */
const INVITES_SHOWN = 5;
const INVITES_ANSWERABLE = 2;

/**
 * Squads are for students. Staff hear so before anything else (also before
 * "run /start first"), and the database refuses them anyway (sq:staff_no_squad).
 */
function requireSquadStudent(ctx: Ctx): void {
  if (isStaff(ctx)) throw new GateError(errorText("staff_no_squad"));
  requireStudent(ctx);
}

/** /squad and invite answers while the squads switch is off: a friendly "not open yet", no database call. */
function requireSquadsOpen(ctx: Ctx): void {
  requireSquadStudent(ctx);
  if (!ctx.session.settings.squads) throw new GateError(SQ.notOpen);
}

/** The squad the caller is active in and whose window is still open. */
async function currentSquad(ctx: Ctx): Promise<SquadSummary | undefined> {
  const mine = await ctx.api.call<SquadSummary[]>("shift_quest_squad_mine", ctx.userId);
  const active = mine.filter((s) => s.status === "active" && s.phase !== "ended");
  return active.find((s) => s.running) ?? active[0];
}

function backButton(): ButtonBuilder {
  return button(cid("is_view"), I.btnBack);
}

/** No squad yet: where to start one. */
function noSquadCard(): View {
  return { tone: "neutral", title: SQ.none, blocks: [{ kind: "text", text: SQ.noneHint }], rows: buttonRows([backButton()]) };
}

/**
 * The squad as its members see it: dates, the target, one group number once
 * running, who is in (names only, nothing to compare), then the fine print.
 */
export function squadCard(v: SquadView): View {
  const phase: Phase = v.phase ?? (v.running ? "running" : "forming");
  const total = v.milestones_gained;
  let progress: string;
  if (phase === "ended") progress = total === null || total === undefined ? SQ.endedQuiet : SQ.ended(total);
  else if (phase === "running") progress = SQ.together(total ?? 0);
  else progress = SQ.forming(v.members_active ?? v.members.length);
  // Names only: members carry no numbers to compare.
  const names = v.members.map((m) => `${safe(m.name, 40)}${m.me ? ` (${SQ.you})` : ""}`).join(" · ");
  const hints: string[] = [];
  if (phase === "forming") hints.push(SQ.inviteHint);
  if (phase !== "ended") hints.push(SQ.withdrawHint);
  const blocks: Block[] = [
    {
      kind: "text",
      text: [SQ.window(v.starts_on, v.ends_on, phase === "ended" ? null : v.days_left), v.target ? SQ.target(v.target) : "", progress, SQ.members(names)]
        .filter(Boolean)
        .join("\n"),
    },
    { kind: "subtext", text: [SQ.private, hints.join(" · ")].filter(Boolean).join("\n") },
  ];
  return {
    tone: "season",
    title: `👥 ${safe(v.name, 60)}`,
    blocks,
    // Leaving takes effect at once: red and on a row of its own, away from the back button.
    rows: [...buttonRows([backButton()]), ...buttonRows([button(cid("squad_leave", v.id), SQ.btnLeave, ButtonStyle.Danger)])],
  };
}

/** Invites waiting for an answer: one row of buttons per invite, named, so each answer is clearly for one squad. */
export function invitesCard(invites: SquadSummary[]): View {
  const lines = invites.slice(0, INVITES_SHOWN).map((s) => SQ.inviteItem(s.name, s.invite_expires_at));
  const blocks: Block[] = [{ kind: "text", text: lines.join("\n") }];
  if (invites.length > INVITES_ANSWERABLE) blocks.push({ kind: "subtext", text: SQ.moreInvites });
  const rows: Row[] = invites.slice(0, INVITES_ANSWERABLE).flatMap((s) =>
    buttonRows([
      button(cid("squad_rsvp", s.id, "y"), `${T.btnAccept}: ${s.name.slice(0, 40)}`, ButtonStyle.Success),
      button(cid("squad_rsvp", s.id, "n"), T.btnDecline),
    ])
  );
  return { tone: "season", title: SQ.invitesTitle, blocks, rows: [...rows, ...buttonRows([backButton()])] };
}

async function viewSquad(i: Replyable, ctx: Ctx, squadId: string): Promise<void> {
  const v = await ctx.api.call<SquadView>("shift_quest_squad_view", ctx.userId, squadId);
  await show(i, squadCard(v));
}

export const squad: HandlerSet = {
  commands: {
    async "squad new"(i, ctx) {
      requireSquadsOpen(ctx);
      const id = await ctx.api.call<string>(
        "shift_quest_squad_create",
        ctx.userId,
        i.options.getString("name", true),
        i.options.getString("target"),
        i.options.getInteger("days") ?? 14
      );
      await show(i, {
        tone: "success",
        title: SQ.createdTitle,
        blocks: [
          { kind: "text", text: SQ.created },
          { kind: "subtext", text: SQ.createdFine },
        ],
        rows: buttonRows([button(cid("squad_view", id), SQ.btnView, ButtonStyle.Primary)]),
      });
    },

    async "squad invite"(i, ctx) {
      requireSquadsOpen(ctx);
      const current = await currentSquad(ctx);
      if (!current) {
        await show(i, noSquadCard());
        return;
      }
      const user = i.options.getUser("user", true);
      await ctx.api.call("shift_quest_squad_invite", ctx.userId, current.id, user.id);
      await show(i, {
        tone: "success",
        title: T.inviteSent,
        blocks: [
          { kind: "text", text: SQ.invited(`<@${user.id}>`) },
          { kind: "subtext", text: SQ.withdrawHint },
        ],
        rows: buttonRows([button(cid("squad_view", current.id), SQ.btnView)]),
      });
    },

    async "squad withdraw"(i, ctx) {
      requireSquadsOpen(ctx);
      const current = await currentSquad(ctx);
      if (!current) {
        await show(i, noSquadCard());
        return;
      }
      const user = i.options.getUser("user", true);
      // Only the member who sent the invite can take it back (else sq:no_invite).
      await ctx.api.call("shift_quest_squad_withdraw", ctx.userId, current.id, user.id);
      await show(i, {
        tone: "success",
        title: SQ.withdrawnTitle,
        blocks: [{ kind: "text", text: SQ.withdrawn(`<@${user.id}>`) }],
        rows: buttonRows([button(cid("squad_view", current.id), SQ.btnView)]),
      });
    },

    async "squad view"(i, ctx) {
      requireSquadsOpen(ctx);
      const mine = await ctx.api.call<SquadSummary[]>("shift_quest_squad_mine", ctx.userId);
      const invites = mine.filter((s) => s.status === "invited");
      const active = mine.filter((s) => s.status === "active");
      const current = active.find((s) => s.phase !== "ended") ?? active[0];
      if (current) {
        await viewSquad(i, ctx, current.id);
        return;
      }
      await show(i, invites.length ? invitesCard(invites) : noSquadCard());
    },
  },

  actions: {
    async squad_view(i, ctx, [squadId]) {
      requireSquadStudent(ctx);
      if (!isUuid(squadId)) return;
      await viewSquad(i, ctx, squadId);
    },

    async squad_rsvp(i, ctx, [squadId, answer]) {
      requireSquadsOpen(ctx);
      if (!isUuid(squadId)) return;
      await ctx.api.call("shift_quest_squad_respond", ctx.userId, squadId, answer === "y");
      if (answer === "y") await viewSquad(i, ctx, squadId);
      // Same next step as every other inbox answer: back to the inbox, or the island.
      else
        await show(
          i,
          { tone: "neutral", title: SQ.declined, rows: buttonRows([button(cid("inbox"), T.btnInbox), backButton()]) },
          { replace: true }
        );
    },

    async squad_leave(i, ctx, [squadId]) {
      requireSquadStudent(ctx);
      if (!isUuid(squadId)) return;
      await ctx.api.call("shift_quest_squad_leave", ctx.userId, squadId);
      await show(
        i,
        { tone: "neutral", title: SQ.left, blocks: [{ kind: "text", text: SQ.leftKeeps }], rows: buttonRows([backButton()]) },
        { replace: true }
      );
    },
  },
};
