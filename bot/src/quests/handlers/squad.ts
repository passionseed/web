/**
 * Squads: opt-in groups of 3 to 4 student builders on a short sprint with a
 * target they chose. Visible only to their members; celebrated as one group
 * number; never ranked against other squads or between members. Students
 * only: no adult ever shares a squad with a student (safeguarding). Behind
 * the squads switch (/admin feature squads, off by default): while it is off,
 * /squad stays registered and answers that squads are not open yet.
 */
import { isStaff, requireStudent, type Ctx } from "../context";
import { T, bkkDate, errorText, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { SQ } from "../island/copy";
import { ButtonStyle, GateError, button, buttonRows, show, type Replyable } from "../ui";
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

/** The squad as its members see it: dates, the target, who is in, and one group number once running. */
export function squadLines(v: SquadView): string[] {
  const phase: Phase = v.phase ?? (v.running ? "running" : "forming");
  const total = v.milestones_gained;
  let progress: string;
  if (phase === "ended") progress = total === null || total === undefined ? SQ.endedQuiet : SQ.ended(total);
  else if (phase === "running") progress = SQ.together(total ?? 0);
  else progress = SQ.forming(v.members_active ?? v.members.length);
  return [
    `👥 **${safe(v.name, 60)}** ${bkkDate(v.starts_on)} ถึง ${bkkDate(v.ends_on)}${phase !== "ended" && v.days_left ? ` (อีก ${v.days_left} วัน)` : ""}`,
    v.target ? `🎯 เป้าที่ตั้งกันเอง: ${safe(v.target, 200)}` : "",
    progress,
    // Names only: members carry no numbers to compare.
    ...v.members.map((m) => `• ${safe(m.name, 40)}${m.me ? " (คุณ)" : ""}`),
    "",
    `-# ${SQ.private}${phase === "ended" ? "" : ` · ${SQ.withdrawHint}`}`,
  ].filter(Boolean);
}

async function viewSquad(i: Replyable, ctx: Ctx, squadId: string): Promise<void> {
  const v = await ctx.api.call<SquadView>("shift_quest_squad_view", ctx.userId, squadId);
  await show(i, { content: squadLines(v).join("\n"), rows: buttonRows([button(cid("squad_leave", v.id), SQ.btnLeave)]) });
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
      await show(i, { content: SQ.created, rows: buttonRows([button(cid("squad_view", id), SQ.btnView, ButtonStyle.Primary)]) });
    },

    async "squad invite"(i, ctx) {
      requireSquadsOpen(ctx);
      const current = await currentSquad(ctx);
      if (!current) {
        await show(i, { content: SQ.none });
        return;
      }
      const user = i.options.getUser("user", true);
      await ctx.api.call("shift_quest_squad_invite", ctx.userId, current.id, user.id);
      await show(i, { content: SQ.invited(`<@${user.id}>`) });
    },

    async "squad withdraw"(i, ctx) {
      requireSquadsOpen(ctx);
      const current = await currentSquad(ctx);
      if (!current) {
        await show(i, { content: SQ.none });
        return;
      }
      const user = i.options.getUser("user", true);
      // Only the member who sent the invite can take it back (else sq:no_invite).
      await ctx.api.call("shift_quest_squad_withdraw", ctx.userId, current.id, user.id);
      await show(i, { content: SQ.withdrawn(`<@${user.id}>`) });
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
      await show(i, {
        content: invites.length ? invites.map((s) => SQ.inviteLine(s.name, s.invite_expires_at)).join("\n") : SQ.none,
        rows: buttonRows(
          invites.slice(0, 2).flatMap((s) => [
            button(cid("squad_rsvp", s.id, "y"), T.btnAccept, ButtonStyle.Success),
            button(cid("squad_rsvp", s.id, "n"), T.btnDecline),
          ])
        ),
      });
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
      else await show(i, { content: T.done }, { replace: true });
    },

    async squad_leave(i, ctx, [squadId]) {
      requireSquadStudent(ctx);
      if (!isUuid(squadId)) return;
      await ctx.api.call("shift_quest_squad_leave", ctx.userId, squadId);
      await show(i, { content: SQ.left }, { replace: true });
    },
  },
};
