/**
 * Joining, private notices, coins and rewards, preferences, personal data.
 */
import type { Session } from "../api";
import { requireEligible, requireMember, requireStudent, type Ctx } from "../context";
import { DAY_NAMES, T, bkkDate, renderInbox, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { SQ } from "../island/copy";
import {
  ButtonStyle,
  button,
  buttonRows,
  jsonFile,
  modal,
  selectRow,
  selectValues,
  show,
  textValue,
  type Replyable,
  type Row,
  type View,
} from "../ui";
import { picked, type HandlerSet } from "./types";

function navRows(): Row[] {
  return buttonRows([
    button(cid("nav", "island"), T.btnIsland, ButtonStyle.Primary),
    button(cid("nav", "project_new"), T.btnNewProject, ButtonStyle.Success),
  ]);
}

interface Inbox {
  items: { id: string; kind: string; params: Record<string, unknown>; unread: boolean; created_at: string }[];
  recognitions: { share_id: string; from: string; body: string }[];
  contributions: { submission_id: string; title: string; owner: string }[];
  invites: { project_id: string; name: string; from: string }[];
}

interface Coins {
  balance: number;
  reserved: number;
  /** category: a recognition's category, when the database returns it. */
  entries: { amount: number; kind: string; reason: string; created_at: string; title: string | null; category?: string | null }[];
  awards_live: boolean;
}

interface Catalog {
  live: boolean;
  terms: string | null;
  balance: number;
  items: { id: string; name: string; description: string | null; cost: number; in_stock: boolean }[];
  mine: { id: string; item: string; cost: number; status: string; created_at: string }[];
}

const LEDGER_KIND: Record<string, string> = {
  award: "ได้จากเควสต์",
  reversal: "ปรับคืน",
  redemption_hold: "แลกของ",
  redemption_release: "คืนจากการยกเลิก",
  recognition: "คำชมจากทีมพี่เลี้ยง",
};

const SEASON_UNLOCK = "ปลดล็อกของซีซัน";

/**
 * Awards carry the quest title from the quest itself (the append-only ledger
 * stores no student text); reversals carry the admin's stated reason;
 * recognitions carry their category when there is one. Never a raw key.
 */
export function ledgerReason(kind: string, reason: string, title: string | null, category?: string | null): string {
  const label = LEDGER_KIND[kind] ?? "รายการเหรียญ";
  if (kind === "award" && reason === "season_unlock") return SEASON_UNLOCK;
  if (kind === "award") return title ? `${label}: ${safe(title, 80)}` : label;
  if (kind === "recognition") return category ? `${label}: ${safe(category, 80)}` : label;
  if (kind === "reversal") return `${label}: ${safe(reason, 120)}`;
  const text = reason.replace(/^redeem:/, "");
  return text && text !== "redeem_cancelled" && text !== reason ? `${label}: ${safe(text, 80)}` : label;
}

function settingsView(prefs: Session["prefs"], remindersLive: boolean): View {
  const lines = [`**${T.settingsTitle}**`];
  if (prefs?.reminders_opt_in && prefs.reminder_hour !== null) {
    lines.push(T.remindersOn(prefs.reminder_days.map((d) => DAY_NAMES[d]).join(" "), prefs.reminder_hour));
    if (!remindersLive) lines.push(T.remindersPaused);
  } else {
    lines.push(T.remindersOff);
  }
  lines.push(prefs?.notify_dm ? T.dmOn : T.dmOff);
  return {
    content: lines.join("\n"),
    rows: buttonRows([
      button(cid("rem_on"), T.btnRemindersOn, ButtonStyle.Primary),
      button(cid("rem_off"), T.btnRemindersOff, ButtonStyle.Secondary, !prefs?.reminders_opt_in),
      prefs?.notify_dm ? button(cid("dm", "off"), T.btnDmOff) : button(cid("dm", "on"), T.btnDmOn),
    ]),
  };
}

export const student: HandlerSet = {
  commands: {
    async start(i, ctx) {
      requireEligible(ctx);
      if (ctx.session.onboarded) {
        await show(i, { content: T.started, rows: navRows() });
        return;
      }
      await show(i, {
        content: T.intro(ctx.session.settings.awards),
        rows: buttonRows([button(cid("start"), T.startButton, ButtonStyle.Primary)]),
      });
    },

    async inbox(i, ctx) {
      requireMember(ctx);
      const inbox = await ctx.api.call<Inbox>("shift_quest_inbox_list", ctx.userId, true);
      const help = ctx.session.onboarded
        ? await ctx.api.call<{ id: string; summary: string; status: string }[]>("shift_quest_help_mine", ctx.userId)
        : [];
      const lines = [`**${T.inboxTitle}**`];
      for (const item of inbox.items) {
        lines.push(`${item.unread ? "🆕 " : ""}${bkkDate(item.created_at)} ${renderInbox(item.kind, item.params)}`);
      }
      const buttons = [];
      for (const r of inbox.recognitions.slice(0, 3)) {
        lines.push("", T.recognitionAsk(r.from, r.body));
        buttons.push(button(cid("rec", r.share_id, "y"), T.btnAccept, ButtonStyle.Success));
        buttons.push(button(cid("rec", r.share_id, "n"), T.btnDecline));
      }
      for (const c of inbox.contributions.slice(0, 3)) {
        lines.push("", T.contributionAsk(c.owner, c.title));
        buttons.push(button(cid("contrib", c.submission_id), T.btnConfirmPart, ButtonStyle.Primary));
        buttons.push(button(cid("notmine", c.submission_id), T.btnNotMine));
      }
      for (const inv of inbox.invites.slice(0, 3)) {
        lines.push("", T.inviteAsk(inv.from, inv.name));
        buttons.push(button(cid("invite", inv.project_id, "y"), T.btnAccept, ButtonStyle.Success));
        buttons.push(button(cid("invite", inv.project_id, "n"), T.btnDecline));
      }
      // Staff get no squad rows (squads are for students only); expired invites are left out,
      // and so is every invite while squads are switched off (nobody can answer one then).
      const squads = ctx.session.onboarded && ctx.session.settings.squads
        ? await ctx.api.call<{ id: string; name: string; status: string; invite_expires_at?: string | null }[]>(
            "shift_quest_squad_mine",
            ctx.userId
          )
        : [];
      for (const s of squads.filter((x) => x.status === "invited").slice(0, 2)) {
        lines.push("", SQ.inviteLine(s.name, s.invite_expires_at));
        buttons.push(button(cid("squad_rsvp", s.id, "y"), T.btnAccept, ButtonStyle.Success));
        buttons.push(button(cid("squad_rsvp", s.id, "n"), T.btnDecline));
      }
      const open = help.filter((h) => h.status === "open" || h.status === "claimed");
      if (open.length) {
        lines.push("", `**${T.helpMine}**`);
        for (const h of open.slice(0, 5)) {
          lines.push(`• ${safe(h.summary, 120)} (${h.status === "claimed" ? "มีคนรับเรื่องแล้ว" : "รอคนรับเรื่อง"})`);
          buttons.push(button(cid("help_close", h.id), `${T.btnWithdrawHelp}: ${h.summary.slice(0, 40)}`));
        }
      }
      if (lines.length === 1) lines.push(T.inboxEmpty);
      await show(i, { content: lines.join("\n"), rows: buttonRows(buttons) });
    },

    async coins(i, ctx) {
      requireStudent(ctx);
      const coins = await ctx.api.call<Coins>("shift_quest_coins", ctx.userId);
      const lines = [T.coinsBalance(coins.balance, coins.reserved), T.coinsRules];
      if (!coins.awards_live) lines.push(T.coinsOff);
      else if (ctx.session.settings.reward_terms) lines.push("", "**กติกา**", safe(ctx.session.settings.reward_terms, 700));
      lines.push("");
      if (!coins.entries.length) lines.push(T.coinsEmpty);
      for (const e of coins.entries) {
        lines.push(`${bkkDate(e.created_at)} ${e.amount > 0 ? "+" : ""}${e.amount} ${ledgerReason(e.kind, e.reason, e.title, e.category)}`);
      }
      await show(i, { content: lines.join("\n") });
    },

    async rewards(i, ctx) {
      requireStudent(ctx);
      await showRewards(i, ctx);
    },

    async settings(i, ctx) {
      requireStudent(ctx);
      await show(i, settingsView(ctx.session.prefs, ctx.session.settings.reminders));
    },

    async data(i, ctx) {
      requireMember(ctx);
      await show(i, {
        content: `**${T.dataTitle}**\n${T.dataBody}`,
        rows: buttonRows([
          button(cid("data_export"), T.btnExport, ButtonStyle.Primary),
          button(cid("data_fix"), T.btnCorrection),
          button(cid("data_erase"), T.btnErasure, ButtonStyle.Danger),
        ]),
      });
    },
  },

  actions: {
    async start(i, ctx) {
      requireEligible(ctx);
      await ctx.api.call("shift_quest_start", ctx.userId, ctx.name, false);
      await show(i, { content: T.started, rows: navRows() }, { replace: true });
    },

    async rec(i, ctx, [shareId, answer]) {
      requireStudent(ctx);
      if (!isUuid(shareId)) return;
      const status = await ctx.api.call<string>("shift_quest_share_respond", ctx.userId, shareId, answer === "y");
      await show(i, { content: status === "queued" ? T.sharePosted : T.done }, { replace: true });
    },

    async contrib(i, ctx, [submissionId]) {
      requireStudent(ctx);
      if (!isUuid(submissionId)) return;
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_contribution_respond", ctx.userId, submissionId, true, textValue(i, "part"));
        await show(i, { content: T.contributionDone });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("contrib", submissionId), T.contributionTitle, [
          { kind: "text", id: "part", label: T.contributionText, long: true, required: true, max: 1000 },
        ])
      );
    },

    async notmine(i, ctx, [submissionId]) {
      requireStudent(ctx);
      if (!isUuid(submissionId)) return;
      await ctx.api.call("shift_quest_contribution_respond", ctx.userId, submissionId, false, null);
      await show(i, { content: T.contributionDeclined }, { replace: true });
    },

    async invite(i, ctx, [projectId, answer]) {
      requireStudent(ctx);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_respond", ctx.userId, projectId, answer === "y");
      await show(i, { content: answer === "y" ? T.projectJoined : T.projectDeclined }, { replace: true });
    },

    async help_close(i, ctx, [helpId]) {
      requireStudent(ctx);
      if (!isUuid(helpId)) return;
      await ctx.api.call("shift_quest_help_withdraw", ctx.userId, helpId);
      await show(i, { content: T.done });
    },

    // --- Rewards ---------------------------------------------------------------
    async rw_pick(i, ctx, args) {
      requireStudent(ctx);
      const itemId = picked(i, args);
      const catalog = await ctx.api.call<Catalog>("shift_quest_catalog_list", ctx.userId);
      const item = catalog.items.find((x) => x.id === itemId);
      if (!catalog.live || !item) {
        await show(i, { content: T.rewardsOff }, { replace: true });
        return;
      }
      // The interaction ID is this preview's request key: every click on its
      // confirm button is the same request.
      await show(
        i,
        {
          content: T.rewardsPreview(item.name, item.cost, catalog.balance),
          rows: buttonRows([
            button(cid("rw_go", item.id, i.id, item.cost), T.btnRedeem, ButtonStyle.Primary, catalog.balance < item.cost || !item.in_stock),
            button(cid("noop"), T.btnCancel),
          ]),
        },
        { replace: true }
      );
    },

    async rw_go(i, ctx, [itemId, key, cost]) {
      requireStudent(ctx);
      if (!isUuid(itemId) || !key || !/^\d+$/.test(cost ?? "")) return;
      // The price shown in the preview: a change in between is refused, not charged.
      const result = await ctx.api.call<{ duplicate: boolean }>("shift_quest_redeem", ctx.userId, itemId, key, Number(cost));
      await show(i, { content: result.duplicate ? T.redeemDuplicate : T.redeemed }, { replace: true });
    },

    async rw_cancel(i, ctx, [redemptionId]) {
      requireStudent(ctx);
      if (!isUuid(redemptionId)) return;
      await ctx.api.call("shift_quest_redeem_cancel", ctx.userId, redemptionId);
      await show(i, { content: T.redeemCancelled }, { replace: true });
    },

    async noop(i) {
      await show(i, { content: T.cancelled }, { replace: true });
    },

    // --- Preferences -------------------------------------------------------------
    async rem_on(i, ctx) {
      requireStudent(ctx);
      if (i.isModalSubmit()) {
        const days = selectValues(i, "days").map(Number);
        const hour = Number(selectValues(i, "hour")[0]);
        const session = await ctx.api.call<Session>("shift_quest_update_prefs", ctx.userId, true, days, hour, null);
        await show(i, settingsView(session.prefs, session.settings.reminders));
        return;
      }
      const prefs = ctx.session.prefs;
      await i.showModal(
        modal(cid("rem_on"), T.remindersTitle, [
          {
            kind: "select",
            id: "days",
            label: T.remindersDays,
            min: 1,
            max: 7,
            options: DAY_NAMES.map((d, n) => ({ label: d, value: String(n), default: prefs?.reminder_days.includes(n) })),
          },
          {
            kind: "select",
            id: "hour",
            label: T.remindersHour,
            options: Array.from({ length: 24 }, (_, h) => ({
              label: `${h}:00 น.`,
              value: String(h),
              default: prefs?.reminder_hour === h,
            })),
          },
        ])
      );
    },

    async rem_off(i, ctx) {
      requireStudent(ctx);
      const session = await ctx.api.call<Session>("shift_quest_update_prefs", ctx.userId, false, null, null, null);
      await show(i, settingsView(session.prefs, session.settings.reminders), { replace: true });
    },

    async dm(i, ctx, [state]) {
      requireStudent(ctx);
      const session = await ctx.api.call<Session>("shift_quest_update_prefs", ctx.userId, null, null, null, state === "on");
      await show(i, settingsView(session.prefs, session.settings.reminders), { replace: true });
    },

    // --- Personal data -------------------------------------------------------------
    async data_export(i, ctx) {
      requireMember(ctx);
      const data = await ctx.api.call("shift_quest_data_export", ctx.userId);
      await show(i, { content: T.exportReady, files: [jsonFile("shift-high-quests-my-data.json", data)] });
    },

    async data_fix(i, ctx) {
      requireMember(ctx);
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_data_request", ctx.userId, "correction", textValue(i, "note"));
        await show(i, { content: T.requestSent });
        return;
      }
      await i.showModal(
        modal(cid("data_fix"), T.correctionTitle, [
          { kind: "text", id: "note", label: T.correctionNote, long: true, required: true, max: 1000 },
        ])
      );
    },

    async data_erase(i, ctx) {
      requireMember(ctx);
      await show(
        i,
        {
          content: T.erasureConfirm,
          rows: buttonRows([
            button(cid("data_erase_go"), T.btnConfirmErasure, ButtonStyle.Danger),
            button(cid("noop"), T.btnCancel),
          ]),
        },
        { replace: true }
      );
    },

    async data_erase_go(i, ctx) {
      requireMember(ctx);
      await ctx.api.call("shift_quest_data_request", ctx.userId, "erasure", null);
      await show(i, { content: T.requestSent }, { replace: true });
    },
  },
};

export async function showRewards(i: Replyable, ctx: Ctx): Promise<void> {
  const catalog = await ctx.api.call<Catalog>("shift_quest_catalog_list", ctx.userId);
  const lines: string[] = [];
  const rows: Row[] = [];
  if (!catalog.live) {
    lines.push(T.rewardsOff);
  } else {
    lines.push(T.coinsBalance(catalog.balance, 0));
    if (catalog.terms) lines.push("", "**เงื่อนไข**", safe(catalog.terms, 600));
    lines.push("");
    for (const item of catalog.items) {
      lines.push(`• **${safe(item.name, 80)}** ${item.cost} เหรียญ${item.in_stock ? "" : " (หมด)"}${item.description ? `: ${safe(item.description, 150)}` : ""}`);
    }
    const available = catalog.items.filter((x) => x.in_stock);
    if (available.length) {
      rows.push(
        selectRow(
          cid("rw_pick"),
          T.rewardsPick,
          available.map((x) => ({ label: `${x.name} (${x.cost})`, value: x.id }))
        )
      );
    }
  }
  if (catalog.mine.length) {
    lines.push("", "**คำขอของคุณ**");
    const cancels = [];
    for (const r of catalog.mine) {
      lines.push(`• ${safe(r.item, 80)} ${r.cost} เหรียญ: ${T.redemptionStatus[r.status] ?? r.status}`);
      if (r.status === "reserved") cancels.push(button(cid("rw_cancel", r.id), `${T.btnCancelRedeem}: ${r.item.slice(0, 40)}`));
    }
    rows.push(...buttonRows(cancels.slice(0, 15)));
  }
  await show(i, { content: lines.join("\n"), rows: rows.slice(0, 5) });
}
