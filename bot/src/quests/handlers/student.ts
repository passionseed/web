/**
 * Joining, private notices, coins and rewards, preferences, personal data.
 * Every screen is one compact card: what it is, the few facts that matter
 * now, fine print in small grey lines or behind an ℹ️ button, then buttons.
 */
import type { ButtonBuilder } from "discord.js";

import type { Session } from "../api";
import { isEligible, requireEligible, requireMember, requireStudent, type Ctx } from "../context";
import { DAY_NAMES, STAFF_AWARD_LABEL, T, bkkDate, renderInbox, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I, SQ } from "../island/copy";
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
  type Block,
  type Replyable,
  type Row,
  type Tone,
  type View,
} from "../ui";
import { islandLinkButton } from "../weblink";
import { picked, type HandlerSet } from "./types";

interface Inbox {
  items: { id: string; kind: string; params: Record<string, unknown>; unread: boolean; created_at: string }[];
  recognitions: { share_id: string; from: string; body: string }[];
  contributions: { submission_id: string; title: string; owner: string }[];
  invites: { project_id: string; name: string; from: string }[];
}

interface Coins {
  balance: number;
  reserved: number;
  /** category: a recognition's category; rule_key: the coin rule (schema 9); each when the database returns it. */
  entries: {
    amount: number;
    kind: string;
    reason: string;
    created_at: string;
    title: string | null;
    category?: string | null;
    rule_key?: string | null;
  }[];
  awards_live: boolean;
}

/** Why the member cannot redeem an item yet (shift_quest__item_lock, schema 9). */
type ItemLock = "consent" | "stage" | "community" | null;

interface Catalog {
  live: boolean;
  terms: string | null;
  balance: number;
  /** The gates and this member's lock arrive from schema 9; older databases leave them out. */
  items: {
    id: string;
    name: string;
    description: string | null;
    cost: number;
    in_stock: boolean;
    min_stage?: number;
    requires_community?: boolean;
    locked?: ItemLock;
    affordable?: boolean;
  }[];
  mine: { id: string; item: string; cost: number; status: string; created_at: string }[];
}

/** An item's lock reason in Thai, or null when nothing holds it back. */
export function lockText(item: { locked?: ItemLock; min_stage?: number }): string | null {
  switch (item.locked) {
    case "consent":
      return T.rewardsLock.consent;
    case "stage":
      return T.rewardsLock.stage(item.min_stage ?? 0);
    case "community":
      return T.rewardsLock.community;
    default:
      return null;
  }
}

const LEDGER_KIND: Record<string, string> = {
  award: "ได้จากเควสต์",
  reversal: "ปรับคืน",
  redemption_hold: "แลกของ",
  redemption_release: "คืนจากการยกเลิก",
  recognition: "คำชมจากทีมพี่เลี้ยง",
};

const SEASON_UNLOCK = "ปลดล็อกของซีซัน";
const STAFF_AWARD = "🏅 รางวัลจากทีมงาน";

/** Notices already read: one small line each (with the team's words when they fit), up to OLDER_SHOWN. */
const OLDER_SHOWN = 5;
/**
 * Characters the /inbox card may use, under Discord's 4000. Opening the inbox
 * marks every new notice read, so new ones are fitted here (in full while they
 * fit, else their headline) instead of being clipped later by the renderer.
 */
const INBOX_TEXT_BUDGET = 3600;
/** A /command in copy becomes a clickable mention of about this many characters. */
const LINKED_COMMAND = 30;
/** Coin ledger lines on the card (the database sends up to 20; /data has all). */
const LEDGER_SHOWN = 5;
/** Catalog lines on the card; every in-stock item is still in the select. */
const ITEMS_SHOWN = 5;
const REQUESTS_SHOWN = 5;
const EXPORT_FILE = "shift-high-quests-my-data.json";

/**
 * Awards carry the quest title from the quest itself (the append-only ledger
 * stores no student text); reversals carry the admin's stated reason;
 * recognitions carry their category when there is one. Staff awards
 * (20261111095000) carry the admin's reason, written for the student, and no
 * quest title; ruleKey names which one when the read returns it (/admin ledger
 * does not: there an award with no title that is not a quest award is a staff
 * award). Never a raw key.
 */
export function ledgerReason(
  kind: string,
  reason: string,
  title: string | null,
  category?: string | null,
  ruleKey?: string | null
): string {
  const label = LEDGER_KIND[kind] ?? "รายการเหรียญ";
  if (kind === "award" && reason === "season_unlock") return SEASON_UNLOCK;
  if (kind === "award") {
    const staff = ruleKey ? STAFF_AWARD_LABEL[ruleKey] : undefined;
    if (staff || (!ruleKey && !title && reason !== "quest_award")) {
      return `${STAFF_AWARD}${staff ? ` ${staff}` : ""}: ${safe(reason, 120)}`;
    }
    return title ? `${label}: ${safe(title, 80)}` : label;
  }
  if (kind === "recognition") return category ? `${label}: ${safe(category, 80)}` : label;
  if (kind === "reversal") return `${label}: ${safe(reason, 120)}`;
  const text = reason.replace(/^redeem:/, "");
  return text && text !== "redeem_cancelled" && text !== reason ? `${label}: ${safe(text, 80)}` : label;
}

// ---------------------------------------------------------------------------
// Small card pieces

/** 🏝️ กลับเกาะ: an existing action (sq|is_view). Only for people who pass requireStudent. */
function islandButton(): ButtonBuilder {
  return button(cid("is_view"), I.btnBack);
}

/** 🌐 the island on the website, last on the row, when its address is configured. */
function webLink(): ButtonBuilder[] {
  const link = islandLinkButton();
  return link ? [link] : [];
}

/** "and N more" as a small line, or nothing. */
function moreLine(rest: number, words: (n: number) => string = I.more): Block[] {
  return rest > 0 ? [{ kind: "subtext", text: words(rest) }] : [];
}

/**
 * A tiny confirmation: one line (✅ when it went through), an optional small
 * line about what happens next, and the next useful buttons.
 */
function toast(text: string, more: { tone?: Tone; next?: string; rows?: Row[] } = {}): View {
  const tone = more.tone ?? "success";
  const blocks: Block[] = [{ kind: "text", text: tone === "success" ? `✅ ${text}` : text }];
  if (more.next) blocks.push({ kind: "subtext", text: more.next });
  return { tone, blocks, rows: more.rows };
}

/** After answering something from the inbox: back to the inbox, or to the island. */
function answeredRows(): Row[] {
  return buttonRows([button(cid("inbox"), T.btnInbox), islandButton()]);
}

/** After a redemption changes: the student's requests, or the island. */
function redeemedRows(): Row[] {
  return buttonRows([button(cid("rw_view"), T.btnMyRedemptions), islandButton()]);
}

/** Each group of buttons on a row of its own while that fits in five rows; packed five to a row otherwise. */
function groupedRows(groups: ButtonBuilder[][]): Row[] {
  const filled = groups.filter((g) => g.length > 0);
  if (filled.length <= 5) return filled.flatMap((g) => buttonRows(g.slice(0, 5)));
  return buttonRows(filled.flat());
}

/** A Discord timestamp ("2 hours ago" in the viewer's own language), or nothing for a bad date. */
function ago(iso: string): string {
  const at = Date.parse(iso);
  return Number.isNaN(at) ? "" : ` · <t:${Math.floor(at / 1000)}:R>`;
}

// ---------------------------------------------------------------------------
// Screens

function introView(): View {
  return {
    tone: "island",
    title: T.introTitle,
    blocks: [
      { kind: "text", text: T.introBody },
      { kind: "subtext", text: T.introExamples },
      { kind: "text", text: T.introPromise },
    ],
    rows: buttonRows([button(cid("start"), T.startButton, ButtonStyle.Primary), button(cid("start_info"), T.btnRules), ...webLink()]),
  };
}

function startedView(): View {
  return {
    tone: "island",
    title: T.startedTitle,
    blocks: [
      { kind: "text", text: T.started },
      { kind: "subtext", text: T.startedFine },
    ],
    rows: buttonRows([
      button(cid("nav", "island"), T.btnIsland, ButtonStyle.Primary),
      button(cid("nav", "project_new"), T.btnNewProject, ButtonStyle.Success),
      button(cid("start_info"), T.btnRules),
      ...webLink(),
    ]),
  };
}

/** The whole agreement, with the one next step: start, or the island once started. */
function rulesView(ctx: Ctx): View {
  return {
    tone: "island",
    title: T.rulesTitle,
    blocks: [{ kind: "text", text: T.rules(ctx.session.settings.awards) }],
    rows: ctx.session.onboarded
      ? buttonRows([
          button(cid("nav", "island"), T.btnIsland, ButtonStyle.Primary),
          button(cid("nav", "project_new"), T.btnNewProject, ButtonStyle.Success),
        ])
      : buttonRows([button(cid("start"), T.startButton, ButtonStyle.Primary)]),
  };
}

/** Something waiting for the student's answer; its buttons take a label prefix ("2 · ") when several wait. */
interface Ask {
  text: string;
  buttons: (tag: string) => ButtonBuilder[];
}

/** The notice a request also leaves in the inbox, and the params key naming that request. */
const REQUEST_NOTICE: Record<string, string> = {
  recognition_request: "share_id",
  contribution_requested: "submission_id",
  project_invite: "project_id",
  squad_invite: "squad_id",
};

/** Review results whose next step is in 📋 งานที่ส่งไว้ (resubmit, appeal, revise or archive). */
const WORK_NOTICES = new Set(["review_clarification", "review_declined"]);

/** Text length once sent: every /command may grow into a clickable mention. */
function sentLength(text: string): number {
  return text.length + (text.split("/").length - 1) * LINKED_COMMAND;
}

type InboxItem = Inbox["items"][number];

/** A new notice in full: its headline with a relative time, then the team's words and the hint. */
function noticeFull(item: InboxItem): string {
  const [head, ...rest] = renderInbox(item.kind, item.params).split("\n");
  return [`${head}${ago(item.created_at)}`, ...rest].join("\n");
}

/** A notice's headline only, with its relative time. */
function noticeHead(item: InboxItem): string {
  return `${renderInbox(item.kind, item.params).split("\n")[0]}${ago(item.created_at)}`;
}

/** A notice already read: a small dated headline, then the team's own words (feedback, a mentor's note). */
function noticeRead(item: InboxItem, withWords: boolean): string {
  const [head, ...rest] = renderInbox(item.kind, item.params).split("\n");
  const words = withWords ? rest.filter((line) => line.startsWith("> ")) : [];
  return [`-# ${bkkDate(item.created_at)} · ${head}`, ...words].join("\n");
}

/**
 * The private inbox: new notices (in full while they fit), older ones one
 * small line each, the student's open help requests, then what waits for an
 * answer, right above its buttons. Same database calls, in the same order, as
 * before the cards.
 */
async function inboxView(ctx: Ctx): Promise<View> {
  const inbox = await ctx.api.call<Inbox>("shift_quest_inbox_list", ctx.userId, true);
  const help = ctx.session.onboarded
    ? await ctx.api.call<{ id: string; summary: string; status: string }[]>("shift_quest_help_mine", ctx.userId)
    : [];
  const asks: Ask[] = [];
  // Each kind names its own answer, so the buttons read right however far they sit from the request.
  const yesNo = (action: string, id: string, yes: string, no: string) => (tag: string) => [
    button(cid(action, id, "y"), `${tag}${yes}`, ButtonStyle.Success),
    button(cid(action, id, "n"), `${tag}${no}`),
  ];
  const recognitions = inbox.recognitions.slice(0, 3);
  const contributions = inbox.contributions.slice(0, 3);
  const invites = inbox.invites.slice(0, 3);
  for (const r of recognitions) {
    asks.push({ text: T.recognitionAsk(r.from, r.body), buttons: yesNo("rec", r.share_id, T.btnRecYes, T.btnRecNo) });
  }
  for (const c of contributions) {
    asks.push({
      text: T.contributionAsk(c.owner, c.title),
      buttons: (tag) => [
        button(cid("contrib", c.submission_id), `${tag}${T.btnConfirmPart}`, ButtonStyle.Primary),
        button(cid("notmine", c.submission_id), `${tag}${T.btnNotMine}`),
      ],
    });
  }
  for (const inv of invites) {
    asks.push({ text: T.inviteAsk(inv.from, inv.name), buttons: yesNo("invite", inv.project_id, T.btnInviteYes, T.btnInviteNo) });
  }
  // Staff get no squad rows (squads are for students only); expired invites are left out,
  // and so is every invite while squads are switched off (nobody can answer one then).
  const squads = ctx.session.onboarded && ctx.session.settings.squads
    ? await ctx.api.call<{ id: string; name: string; status: string; invite_expires_at?: string | null }[]>(
        "shift_quest_squad_mine",
        ctx.userId
      )
    : [];
  const squadInvites = squads.filter((x) => x.status === "invited").slice(0, 2);
  for (const s of squadInvites) {
    asks.push({ text: SQ.inviteLine(s.name, s.invite_expires_at), buttons: yesNo("squad_rsvp", s.id, T.btnSquadYes, T.btnSquadNo) });
  }

  // A request waiting under "รอคุณตอบ" is not listed a second time as its notice.
  const pending = new Set<unknown>([
    ...recognitions.map((r) => r.share_id),
    ...contributions.map((c) => c.submission_id),
    ...invites.map((x) => x.project_id),
    ...squadInvites.map((x) => x.id),
  ]);
  const shown = inbox.items.filter((x) => !(x.kind in REQUEST_NOTICE && pending.has(x.params[REQUEST_NOTICE[x.kind]])));
  // Unread first, newest first within each.
  const unread = shown.filter((x) => x.unread);
  const read = shown.filter((x) => !x.unread);

  const open = help.filter((h) => h.status === "open" || h.status === "claimed").slice(0, 5);
  const helpText = open.length
    ? [`**${T.helpMine}**`, ...open.map((h) => `• ${safe(h.summary, 120)} · ${h.status === "claimed" ? T.helpClaimed : T.helpWaiting}`)].join("\n")
    : "";
  // Several requests at once: number them, and their buttons, so each answer is unambiguous.
  const numbered = asks.length > 1;
  const askText = asks.length
    ? [`**${T.inboxAsks}**`, ...asks.map((ask, n) => (numbered ? `**${n + 1}** ${ask.text}` : ask.text))].join("\n")
    : "";

  // What is left for notices once the title, the requests and the help list are counted.
  let room = INBOX_TEXT_BUDGET - [T.inboxTitle, T.onlyYou, helpText, askText, T.inboxNewMore(99), T.inboxOlder(99)]
    .reduce((n, t) => n + sentLength(t) + 4, 0);
  const take = (text: string): boolean => {
    const cost = sentLength(text) + 4;
    if (cost > room) return false;
    room -= cost;
    return true;
  };
  // Every new notice's headline first (opening the inbox marks them all read), then in full while that fits.
  const heads = unread.filter((item) => take(noticeHead(item)));
  const notices: Block[] = heads.map((item) => {
    const full = noticeFull(item);
    const extra = sentLength(full) - sentLength(noticeHead(item));
    if (extra <= room) {
      room -= extra;
      return { kind: "text", text: full };
    }
    return { kind: "subtext", text: noticeHead(item) };
  });
  notices.push(...moreLine(unread.length - heads.length, T.inboxNewMore));
  let readShown = 0;
  for (const item of read.slice(0, OLDER_SHOWN)) {
    const withWords = noticeRead(item, true);
    const line = take(withWords) ? withWords : take(noticeRead(item, false)) ? noticeRead(item, false) : null;
    if (!line) break;
    notices.push({ kind: "text", text: line });
    readShown++;
  }
  notices.push(...moreLine(read.length - readShown, T.inboxOlder));

  // Notices and the help list first, then the requests, so each request sits right above its buttons.
  const blocks: Block[] = [{ kind: "subtext", text: T.onlyYou }, ...notices];
  if (helpText) {
    if (notices.length) blocks.push({ kind: "divider" });
    blocks.push({ kind: "text", text: helpText });
  }
  if (askText) {
    if (blocks.length > 1) blocks.push({ kind: "divider" });
    blocks.push({ kind: "text", text: askText });
  }
  if (!asks.length && !shown.length && !open.length) blocks.push({ kind: "text", text: T.inboxEmpty });

  const isStudent = ctx.session.onboarded && isEligible(ctx);
  // A review result asks for a resubmit, an appeal or a change: 📋 งานที่ส่งไว้ is where that happens.
  const workNext = isStudent && [...heads, ...read.slice(0, readShown)].some((x) => WORK_NOTICES.has(x.kind));
  const rows = groupedRows([
    ...asks.map((ask, n) => ask.buttons(numbered ? `${n + 1} · ` : "")),
    open.map((h) => button(cid("help_close", h.id), `${T.btnWithdrawHelp}: ${h.summary.slice(0, 40)}`)),
    isStudent ? [...(workNext ? [button(cid("is_work"), I.btnWork)] : []), islandButton()] : [],
  ]);
  return { tone: "neutral", title: T.inboxTitle, blocks, rows };
}

/** /data: what is kept, the student's rights, and the three requests. */
function dataView(): View {
  return {
    tone: "neutral",
    title: T.dataTitle,
    blocks: [
      { kind: "text", text: T.dataBody },
      { kind: "subtext", text: T.dataRights },
    ],
    rows: buttonRows([
      button(cid("data_export"), T.btnExport, ButtonStyle.Primary),
      button(cid("data_fix"), T.btnCorrection),
      button(cid("data_erase"), T.btnErasure, ButtonStyle.Danger),
    ]),
  };
}

function ledgerLine(e: Coins["entries"][number]): string {
  return `\`${e.amount > 0 ? "+" : ""}${e.amount}\` ${ledgerReason(e.kind, e.reason, e.title, e.category, e.rule_key)} · ${bkkDate(e.created_at)}`;
}

function settingsView(prefs: Session["prefs"], remindersLive: boolean): View {
  const blocks: Block[] = [{ kind: "subtext", text: T.onlyYou }];
  if (prefs?.reminders_opt_in && prefs.reminder_hour !== null) {
    blocks.push({ kind: "text", text: T.remindersOn(prefs.reminder_days.map((d) => DAY_NAMES[d]).join(" "), prefs.reminder_hour) });
    if (!remindersLive) blocks.push({ kind: "subtext", text: T.remindersPaused });
  } else {
    blocks.push({ kind: "text", text: T.remindersOff });
  }
  blocks.push({ kind: "text", text: prefs?.notify_dm ? T.dmOn : T.dmOff });
  return {
    tone: "neutral",
    title: T.settingsTitle,
    blocks,
    rows: [
      ...buttonRows([
        button(cid("rem_on"), T.btnRemindersOn, ButtonStyle.Primary),
        button(cid("rem_off"), T.btnRemindersOff, ButtonStyle.Secondary, !prefs?.reminders_opt_in),
        prefs?.notify_dm ? button(cid("dm", "off"), T.btnDmOff) : button(cid("dm", "on"), T.btnDmOn),
      ]),
      ...buttonRows([islandButton()]),
    ],
  };
}

export const student: HandlerSet = {
  commands: {
    async start(i, ctx) {
      requireEligible(ctx);
      await show(i, ctx.session.onboarded ? startedView() : introView());
    },

    async inbox(i, ctx) {
      requireMember(ctx);
      await show(i, await inboxView(ctx));
    },

    async coins(i, ctx) {
      requireStudent(ctx);
      const coins = await ctx.api.call<Coins>("shift_quest_coins", ctx.userId);
      const blocks: Block[] = [{ kind: "text", text: T.coinsBalance(coins.balance, coins.reserved) }];
      if (!coins.awards_live) blocks.push({ kind: "text", text: `⏸️ ${T.coinsOff}` });
      blocks.push({ kind: "divider" });
      if (!coins.entries.length) {
        blocks.push({ kind: "text", text: T.coinsEmpty });
      } else {
        blocks.push({
          kind: "text",
          text: [`**${T.coinsRecent}**`, ...coins.entries.slice(0, LEDGER_SHOWN).map(ledgerLine)].join("\n"),
        });
        blocks.push(...moreLine(coins.entries.length - LEDGER_SHOWN, T.coinsMore));
      }
      blocks.push({ kind: "subtext", text: T.coinsRules });
      // The published coin rules are one tap away instead of filling the card.
      const buttons: ButtonBuilder[] = [];
      if (coins.awards_live && ctx.session.settings.reward_terms) buttons.push(button(cid("rw_terms", "coins"), T.btnCoinTerms));
      if (ctx.session.settings.redemption) buttons.push(button(cid("rw_view"), T.btnRewards));
      buttons.push(islandButton());
      await show(i, { tone: "coins", title: T.coinsTitle, blocks, rows: buttonRows(buttons) });
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
      await show(i, dataView());
    },
  },

  actions: {
    async start(i, ctx) {
      requireEligible(ctx);
      await ctx.api.call("shift_quest_start", ctx.userId, ctx.name, false);
      await show(i, startedView(), { replace: true });
    },

    /** ℹ️ on the welcome cards: the full agreement. Text only, no database call. */
    async start_info(i, ctx) {
      requireEligible(ctx);
      await show(i, rulesView(ctx), { replace: true });
    },

    /** 📬 after answering a request: the inbox again (same call as /inbox). */
    async inbox(i, ctx) {
      requireMember(ctx);
      await show(i, await inboxView(ctx), { replace: true });
    },

    async rec(i, ctx, [shareId, answer]) {
      requireStudent(ctx);
      if (!isUuid(shareId)) return;
      const status = await ctx.api.call<string>("shift_quest_share_respond", ctx.userId, shareId, answer === "y");
      // The stored status says what happened (an already answered request returns its old one).
      const view =
        status === "queued"
          ? toast(T.sharePosted, { rows: answeredRows() })
          : toast(status === "peer_declined" ? T.shareDeclined : T.shareClosed, { tone: "neutral", rows: answeredRows() });
      await show(i, view, { replace: true });
    },

    async contrib(i, ctx, [submissionId]) {
      requireStudent(ctx);
      if (!isUuid(submissionId)) return;
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_contribution_respond", ctx.userId, submissionId, true, textValue(i, "part"));
        await show(i, toast(T.contributionDone, { rows: answeredRows() }));
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
      await show(i, toast(T.contributionDeclined, { tone: "neutral", rows: answeredRows() }), { replace: true });
    },

    async invite(i, ctx, [projectId, answer]) {
      requireStudent(ctx);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_respond", ctx.userId, projectId, answer === "y");
      await show(
        i,
        answer === "y"
          ? toast(T.projectJoined, { rows: answeredRows() })
          : toast(T.projectDeclined, { tone: "neutral", rows: answeredRows() }),
        { replace: true }
      );
    },

    async help_close(i, ctx, [helpId]) {
      requireStudent(ctx);
      if (!isUuid(helpId)) return;
      await ctx.api.call("shift_quest_help_withdraw", ctx.userId, helpId);
      await show(i, toast(T.helpClosed, { rows: buttonRows([islandButton()]) }));
    },

    // --- Rewards ---------------------------------------------------------------
    /** ℹ️ for the coin rules (coins) or the redemption terms (redeem): the session's own text, no database call. */
    async rw_terms(i, ctx, [which]) {
      requireStudent(ctx);
      const coins = which !== "redeem";
      const text = coins ? ctx.session.settings.reward_terms : ctx.session.settings.redemption_terms;
      await show(i, {
        tone: "coins",
        title: coins ? T.coinTermsTitle : T.redeemTermsTitle,
        blocks: [{ kind: "text", text: text ? safe(text, coins ? 700 : 600) : coins ? T.coinsOff : T.rewardsOff }],
      });
    },

    /** 🎁 from /coins or after a redemption: the rewards card (same call as /rewards). */
    async rw_view(i, ctx) {
      requireStudent(ctx);
      await showRewards(i, ctx, true);
    },

    async rw_pick(i, ctx, args) {
      requireStudent(ctx);
      const itemId = picked(i, args);
      const catalog = await ctx.api.call<Catalog>("shift_quest_catalog_list", ctx.userId);
      const item = catalog.items.find((x) => x.id === itemId);
      if (!catalog.live || !item) {
        await show(i, { tone: "neutral", blocks: [{ kind: "text", text: T.rewardsOff }], rows: redeemedRows() }, { replace: true });
        return;
      }
      // The interaction ID is this preview's request key: every click on its
      // confirm button is the same request. A locked item (schema 9) shows why,
      // and its confirm button stays off; the database refuses it anyway.
      const lock = lockText(item);
      await show(
        i,
        {
          tone: "coins",
          title: T.rewardsPreviewTitle,
          blocks: [
            { kind: "text", text: T.rewardsPreview(item.name, item.cost, catalog.balance, item.description) },
            ...(item.in_stock ? [] : [{ kind: "subtext", text: T.rewardsGone } as Block]),
            ...(lock ? [{ kind: "subtext", text: `${T.rewardsLocked}: ${lock}` } as Block] : []),
          ],
          rows: buttonRows([
            button(
              cid("rw_go", item.id, i.id, item.cost),
              T.btnRedeem,
              ButtonStyle.Primary,
              catalog.balance < item.cost || !item.in_stock || Boolean(lock)
            ),
            // Cancel goes back to the rewards card (read only), not to a card with no buttons.
            button(cid("rw_view"), T.btnCancel),
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
      await show(
        i,
        result.duplicate
          ? toast(T.redeemDuplicate, { tone: "neutral", rows: redeemedRows() })
          : toast(T.redeemed, { next: T.redeemedNext, rows: redeemedRows() }),
        { replace: true }
      );
    },

    async rw_cancel(i, ctx, [redemptionId]) {
      requireStudent(ctx);
      if (!isUuid(redemptionId)) return;
      await ctx.api.call("shift_quest_redeem_cancel", ctx.userId, redemptionId);
      await show(i, toast(T.redeemCancelled, { rows: redeemedRows() }), { replace: true });
    },

    // Shared "cancel" for several confirm cards (staff ones too): no buttons, nothing assumed.
    async noop(i) {
      await show(i, toast(T.cancelled, { tone: "neutral" }), { replace: true });
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
      await show(i, {
        tone: "neutral",
        title: T.exportReady,
        blocks: [
          { kind: "subtext", text: T.onlyYou },
          { kind: "file", name: EXPORT_FILE },
        ],
        files: [jsonFile(EXPORT_FILE, data)],
      });
    },

    async data_fix(i, ctx) {
      requireMember(ctx);
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_data_request", ctx.userId, "correction", textValue(i, "note"));
        await show(i, toast(T.requestSent));
        return;
      }
      await i.showModal(
        modal(cid("data_fix"), T.correctionTitle, [
          { kind: "text", id: "note", label: T.correctionNote, long: true, required: true, max: 1000 },
        ])
      );
    },

    /** Cancel on the erasure card: the /data card again. Text only, no database call. */
    async data_view(i, ctx) {
      requireMember(ctx);
      await show(i, dataView(), { replace: true });
    },

    async data_erase(i, ctx) {
      requireMember(ctx);
      await show(
        i,
        {
          tone: "warn",
          title: T.erasureTitle,
          blocks: [
            { kind: "text", text: T.erasureConfirm },
            { kind: "subtext", text: T.erasureKept },
          ],
          rows: buttonRows([
            button(cid("data_erase_go"), T.btnConfirmErasure, ButtonStyle.Danger),
            button(cid("data_view"), T.btnCancel),
          ]),
        },
        { replace: true }
      );
    },

    async data_erase_go(i, ctx) {
      requireMember(ctx);
      await ctx.api.call("shift_quest_data_request", ctx.userId, "erasure", null);
      await show(i, toast(T.requestSent), { replace: true });
    },
  },
};

/** The rewards card: balance, what can be had (picked from the select), and the student's own requests. */
export async function rewardsView(ctx: Ctx): Promise<View> {
  const catalog = await ctx.api.call<Catalog>("shift_quest_catalog_list", ctx.userId);
  const blocks: Block[] = [];
  const rows: Row[] = [];
  if (!catalog.live) {
    blocks.push({ kind: "text", text: T.rewardsOff });
  } else {
    blocks.push({ kind: "text", text: T.coinsBalance(catalog.balance, 0) });
    if (catalog.items.length) {
      blocks.push({
        kind: "text",
        text: catalog.items
          .slice(0, ITEMS_SHOWN)
          .map((item) => {
            const lock = lockText(item);
            return `• **${safe(item.name, 80)}** · ${item.cost} เหรียญ${item.in_stock ? "" : ` · ${T.rewardsSoldOut}`}${lock ? `\n-# 🔒 ${lock}` : ""}`;
          })
          .join("\n"),
      });
      blocks.push(...moreLine(catalog.items.length - ITEMS_SHOWN, T.rewardsMore));
    }
    const available = catalog.items.filter((x) => x.in_stock);
    if (available.length) {
      rows.push(
        selectRow(
          cid("rw_pick"),
          T.rewardsPick,
          available.map((x) => {
            const lock = lockText(x);
            return { label: `${x.name} (${x.cost})`, value: x.id, description: lock ? `🔒 ${lock}` : x.description ?? undefined };
          })
        )
      );
    }
  }
  if (catalog.mine.length) {
    blocks.push(
      { kind: "divider" },
      {
        kind: "text",
        text: [
          `**${T.rewardsMine}**`,
          ...catalog.mine
            .slice(0, REQUESTS_SHOWN)
            .map((r) => `• ${safe(r.item, 80)} · ${r.cost} เหรียญ · ${T.redemptionStatus[r.status] ?? r.status}`),
        ].join("\n"),
      },
      ...moreLine(catalog.mine.length - REQUESTS_SHOWN)
    );
    const cancels = catalog.mine
      .filter((r) => r.status === "reserved")
      .map((r) => button(cid("rw_cancel", r.id), `${T.btnCancelRedeem}: ${r.item.slice(0, 40)}`));
    rows.push(...buttonRows(cancels.slice(0, 15)));
  }
  const nav: ButtonBuilder[] = [];
  if (catalog.live && catalog.terms) nav.push(button(cid("rw_terms", "redeem"), T.btnRedeemTerms));
  nav.push(islandButton());
  rows.push(...buttonRows(nav));
  return { tone: "coins", title: T.rewardsTitle, blocks, rows: rows.slice(0, 5) };
}

export async function showRewards(i: Replyable, ctx: Ctx, replace = false): Promise<void> {
  await show(i, await rewardsView(ctx), { replace });
}
