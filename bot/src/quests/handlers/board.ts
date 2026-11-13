/**
 * The quest card: the island's quest board (/shift/island) in Discord. One
 * line per quest with its state: the next main quest for the tree, the
 * community quests (milestones 6 and 7), and the side quests. Where Discord
 * already has the action it is one tap away: 🌟 sends a main quest (the
 * island's own milestone picker), a side quest opens its note with 🧭 take it
 * or 🌟 send it (shift_quest_side_choose and shift_quest_side_submit, the
 * website's own functions), and 📋 งานที่ส่งไว้ stays where it was. 🌐 opens the
 * board on the website.
 *
 * Read with shift_quest_board(actor), the same read the website uses, so the
 * card and the web board never disagree. Every card is private. The tile
 * states come from lib/supabase/shift-quests/board.ts, the web board's own
 * derivations. A side quest pays only through its normal mentor review.
 */
import type { ButtonBuilder, ModalBuilder } from "discord.js";
import { MessageFlags } from "discord.js";

import { COMMUNITY_RULE_MILESTONES } from "@/lib/content/shift-island-economy";
import { mainTileStatus, missingTitles, sideTileStatus } from "@/lib/supabase/shift-quests/board";
import type { BoardMain, BoardSide, QuestBoard, TileStatus } from "@/lib/supabase/shift-quests/types";

import { requireStudent, type Ctx } from "../context";
import { T, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I, QB } from "../island/copy";
import { roundHash } from "../rounds";
import { ButtonStyle, button, buttonRows, modal, selectRow, show, textValue, type Block, type Field, type View } from "../ui";
import { boardLinkButton } from "../weblink";
import { proofLink } from "./island";
import { questDetail } from "./quest";
import { picked, type HandlerSet } from "./types";

/** Community quests: main quests 6 and 7 (the economy's community rule). */
const COMMUNITY = new Set<number>(COMMUNITY_RULE_MILESTONES);

/** The caller's own open quests, the one that needs them most first (as the web board orders them). */
const OPEN: TileStatus[] = ["clarification", "active", "paused", "submitted", "appealed"];

/** Lines in the main section: the next main quest, then the caller's other open ones. */
const MAIN_SHOWN = 3;
/** Side quests listed by name; the menu below holds every one. */
const SIDE_SHOWN = 5;
/** Discord's cap on a select's options. */
const MENU_MAX = 25;

export function readBoard(ctx: Ctx): Promise<QuestBoard> {
  return ctx.api.call<QuestBoard>("shift_quest_board", ctx.userId);
}

function mainLine(m: BoardMain): string {
  const status = mainTileStatus(m);
  const state = status === "held" ? safe(I.heldBy(m.in_flight?.owner ?? null), 60) : QB.status[status];
  return QB.line(QB.mark[status], m.title, state, m.milestone);
}

function sideLine(s: BoardSide): string {
  const status = sideTileStatus(s);
  return QB.line(QB.mark[status], s.title, QB.status[status]);
}

/** Open first (the one that needs the caller most), then open to take, declined, done; locked last. */
function sideRank(s: BoardSide): number {
  const status = sideTileStatus(s);
  const open = OPEN.indexOf(status);
  if (open >= 0) return open;
  return OPEN.length + ["available", "declined", "done", "locked"].indexOf(status);
}

function sortedSides(board: QuestBoard): BoardSide[] {
  return board.side
    .map((s, at) => ({ s, at }))
    .sort((a, b) => sideRank(a.s) - sideRank(b.s) || a.at - b.at)
    .map(({ s }) => s);
}

/** The next main quest for the tree: the lowest one, outside the community quests, not yet passed. */
export function nextMain(board: QuestBoard): BoardMain | null {
  return (
    board.main
      .filter((m) => !COMMUNITY.has(m.milestone) && !m.done)
      .sort((a, b) => a.milestone - b.milestone)[0] ?? null
  );
}

function mainLines(board: QuestBoard): string[] {
  const next = nextMain(board);
  const lines = [next ? mainLine(next) : QB.coreDone];
  const mine = board.main
    .filter((m) => m !== next && !COMMUNITY.has(m.milestone) && OPEN.includes(mainTileStatus(m)))
    .sort((a, b) => OPEN.indexOf(mainTileStatus(a)) - OPEN.indexOf(mainTileStatus(b)) || a.milestone - b.milestone);
  for (const m of mine.slice(0, MAIN_SHOWN - 1)) lines.push(mainLine(m));
  return lines;
}

/** The quest card. web: the 🌐 board link, when the website's address is set. */
export function boardView(board: QuestBoard, web: ButtonBuilder | null = null): View {
  const back = button(cid("is_view"), I.btnBack);
  if (!board.project) {
    return {
      tone: "island",
      title: QB.title,
      blocks: [{ kind: "text", text: QB.noPlot }],
      rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), back, ...(web ? [web] : [])]),
    };
  }

  const blocks: Block[] = [{ kind: "text", text: [QB.main, ...mainLines(board)].join("\n") }];
  const community = board.main.filter((m) => COMMUNITY.has(m.milestone)).sort((a, b) => a.milestone - b.milestone);
  if (community.length) blocks.push({ kind: "text", text: [QB.community, ...community.map(mainLine)].join("\n") });

  const sides = sortedSides(board);
  const open = sides.filter((s) => sideTileStatus(s) !== "locked");
  const locked = sides.length - open.length;
  const sideText = [QB.side];
  if (!sides.length) sideText.push(QB.noSide);
  for (const s of open.slice(0, SIDE_SHOWN)) sideText.push(sideLine(s));
  blocks.push({ kind: "text", text: sideText.join("\n") });
  const sideFine: string[] = [];
  if (open.length > SIDE_SHOWN) sideFine.push(I.more(open.length - SIDE_SHOWN));
  if (locked > 0) sideFine.push(QB.locked(locked));
  if (sideFine.length) blocks.push({ kind: "subtext", text: sideFine.join(" · ") });
  blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: `${QB.legend}\n${QB.growth}` });

  const menu = sides.slice(0, MENU_MAX).map((s) => {
    const status = sideTileStatus(s);
    return { label: s.title, value: s.template_id, description: `${QB.mark[status]} ${QB.status[status]} · ${s.purpose}` };
  });
  return {
    tone: "island",
    title: QB.title,
    blocks,
    rows: [
      ...(menu.length ? [selectRow(cid("qb_side"), QB.pickSide, menu)] : []),
      ...buttonRows([
        button(cid("is_ms"), I.btnMilestone, ButtonStyle.Success),
        button(cid("is_work"), I.btnWork),
        back,
        ...(web ? [web] : []),
      ]),
    ],
  };
}

/** What a side quest card says around the quest: a line above it (an encounter's), fine print below. */
export interface SideExtras {
  intro?: string;
  fine?: string;
}

/**
 * One side quest: its state, what it is for, when it is done, what still
 * locks it, then the one action that fits (take it or send it; open it when
 * the caller already has it). Also the note an encounter at the campfire leaves.
 */
export function sideView(board: QuestBoard, s: BoardSide, extras: SideExtras = {}): View {
  const status = sideTileStatus(s);
  const blocks: Block[] = [];
  if (extras.intro) blocks.push({ kind: "subtext", text: extras.intro });
  const offRoute = board.project && status !== "locked" && !s.route_match ? ` · ${QB.offRoute}` : "";
  blocks.push({ kind: "text", text: `${QB.mark[status]} **${QB.status[status]}**${offRoute}` });
  const facts = [safe(s.purpose, 300), `**${QB.doneWhen}** ${safe(s.evidence_criteria, 400)}`];
  if (s.examples?.trim()) facts.push(`**${QB.examples}** ${safe(s.examples, 300)}`);
  blocks.push({ kind: "text", text: facts.join("\n") });
  if (status === "locked") {
    const titles = missingTitles(board, s).map((t) => safe(t, 60));
    blocks.push({ kind: "text", text: board.project && titles.length ? QB.needs(titles.join(", ")) : QB.needsPlot });
  }
  blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: [QB.sideFine, extras.fine].filter(Boolean).join("\n") });

  const actions: ButtonBuilder[] = [];
  if (status === "available" || status === "declined") {
    actions.push(
      button(cid("qb_take", s.template_id), QB.btnTake, ButtonStyle.Primary),
      button(cid("qb_send", s.template_id), QB.btnSend, ButtonStyle.Success)
    );
  } else if (OPEN.includes(status) && s.mine) {
    actions.push(button(cid("q", s.mine.instance_id), T.btnViewQuest, ButtonStyle.Primary));
  } else if (status === "done" && s.repeatable) {
    actions.push(button(cid("qb_send", s.template_id), QB.btnSendAgain));
  }
  return {
    tone: "island",
    title: QB.sideTitle(s.title),
    blocks,
    rows: buttonRows([...actions, button(cid("is_board"), I.btnBoard), button(cid("is_view"), I.btnBack)]),
  };
}

/**
 * The side quest an encounter offers in a round: the same starting place in
 * the board's own order for everyone at the fire (from the round number),
 * then the first one this person can take, one on their project's route
 * first. null when none is open to them, or they have no project.
 */
export function pickSide(board: QuestBoard, round: number): BoardSide | null {
  const sides = board.side;
  // Side quests belong to a project (the database locks them all without one).
  if (!board.project || !sides.length || !Number.isSafeInteger(round)) return null;
  const start = roundHash(round, 2) % sides.length;
  const ring = sides.map((_, k) => sides[(start + k) % sides.length]).filter((s) => sideTileStatus(s) === "available");
  return ring.find((s) => s.route_match) ?? ring[0] ?? null;
}

/** "I did this side quest": proof once and the quest's own reflection question, like a milestone. */
export function sideModal(s: BoardSide): ModalBuilder {
  const criteria = s.evidence_criteria?.trim() ?? "";
  const fits = criteria.length > 0 && criteria.length <= 100;
  const fields: Field[] = [];
  if (criteria && !fits) fields.push({ kind: "note", text: I.criteria(criteria) });
  fields.push(
    { kind: "text", id: "proof", label: I.proof, description: fits ? criteria : undefined, placeholder: I.proofHint, long: true, required: true, max: 1000 },
    {
      kind: "text",
      id: "note",
      label: I.portfolio,
      description: [s.reflection_prompt, I.portfolioHint].filter(Boolean).join(" · "),
      long: true,
      required: true,
      max: 1000,
    }
  );
  return modal(cid("qb_send", s.template_id), s.title, fields);
}

/** The side quest is gone from the board (unpublished since the card was drawn): the way back to the board. */
function goneView(): View {
  return {
    tone: "warn",
    blocks: [{ kind: "text", text: QB.gone }],
    rows: buttonRows([button(cid("is_board"), I.btnBoard), button(cid("is_view"), I.btnBack)]),
  };
}

export const board: HandlerSet = {
  actions: {
    /** 📜 on the island card, and the live post's quest button (handlers/panel.ts, after its own defer). */
    async is_board(i, ctx) {
      requireStudent(ctx);
      const view = boardView(await readBoard(ctx), boardLinkButton());
      // A details screen in place of the private card it was opened from, like 📖.
      await show(i, view, { replace: true });
    },

    async qb_side(i, ctx, args) {
      requireStudent(ctx);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const b = await readBoard(ctx);
      const s = b.side.find((x) => x.template_id === id);
      await show(i, s ? sideView(b, s) : goneView(), { replace: true });
    },

    async qb_take(i, ctx, [templateId]) {
      requireStudent(ctx);
      if (!i.isButton() || !isUuid(templateId)) return;
      const taken = await ctx.api.call<{ instance_id: string }>("shift_quest_side_choose", ctx.userId, templateId);
      // The quest as the 📋 list shows it, with its own buttons (submit, pause, help).
      await questDetail(i, ctx, taken.instance_id, true, QB.taken);
    },

    async qb_send(i, ctx, [templateId]) {
      requireStudent(ctx);
      if (!isUuid(templateId)) return;
      if (i.isButton()) {
        const s = (await readBoard(ctx)).side.find((x) => x.template_id === templateId);
        if (s) await i.showModal(sideModal(s));
        else await show(i, goneView(), { replace: true });
        return;
      }
      if (!i.isModalSubmit()) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const proof = textValue(i, "proof");
      await ctx.api.call("shift_quest_side_submit", ctx.userId, templateId, proof, textValue(i, "note"), proofLink(proof));
      await show(i, {
        tone: "success",
        title: I.sentTitle,
        blocks: [
          { kind: "text", text: QB.sent },
          { kind: "subtext", text: I.resultIn },
        ],
        rows: buttonRows([button(cid("is_board"), I.btnBoard), button(cid("is_view"), I.btnBack)]),
      });
    },
  },
};
