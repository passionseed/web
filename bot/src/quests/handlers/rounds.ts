/**
 * The campfire round's buttons (rounds.ts posts the round message): 🎯 sets
 * what this round is for (a work session's intention), ✍️ closes the round
 * with what was learned and, optionally, where it is stuck. Both answer only
 * the person who pressed, privately. The reflection is a private journal
 * entry, the same as /progress add, so /data, erasure and the journal cover
 * it; the roots count it (design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md).
 *
 * On a rest with an encounter (rounds.ts encounterAt), its button shows the
 * note it left: one side quest from the board, the same starting pick for
 * everyone at the fire (handlers/board.ts pickSide), as the quest card's own
 * side quest card. Nothing is stored and nothing pays for being there: the
 * side quest pays only through its normal mentor review.
 *
 * The evening guest's 🎁 (rd_guest|<day>, on the round messages and the
 * campfire call from the guest's arrival, schema 21): a new private reply,
 * acknowledged first, about the presser's own team only
 * (shift_quest_guest_status): what tonight's guest left for the team, or a
 * warm line when nothing, never a name and never which teammate was there. A
 * waiting guest gift follows as the normal gift card (offerGift). A button of
 * another day, or a database without the function (42883), answers that the
 * guest has gone.
 */
import { MessageFlags } from "discord.js";

import { treeItem, type TreeItem } from "@/lib/shift-island/tree-style";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import { GUESTS, REVEAL, isGuestKey } from "../callCopy";
import { requireStudent } from "../context";
import { cid } from "../ids";
import { I, TREE } from "../island/copy";
import { TREE_SCHEMA } from "../island/tree";
import { encounterAt } from "../rounds";
import { schemaOf } from "../schema";
import { R } from "../rounds-copy";
import { ButtonStyle, button, buttonRows, modal, show, textValue, type View } from "../ui";
import { pickSide, readBoard, sideView } from "./board";
import { reflectionModal, reflectionSavedView } from "./reflection";
import { giftFrom, offerGift, type Gift } from "./tree";
import type { HandlerSet } from "./types";

const oneLine = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/** Ends this member's open work session, if any, and returns its intention. */
async function endSession(api: QuestApi, userId: string, reflection: string | null): Promise<string | null> {
  try {
    const ended = await api.call<{ intention?: string }>("shift_quest_work_end", userId, reflection);
    return typeof ended?.intention === "string" ? ended.intention : null;
  } catch (error) {
    if (error instanceof QuestError && error.code === "no_session") return null;
    throw error;
  }
}

/** The encounter's note when no side quest is open to the person who pressed. */
function emptyNote(found: string, hasPlot: boolean): View {
  return {
    tone: "island",
    title: R.encounterEmptyTitle,
    blocks: [
      { kind: "subtext", text: found },
      { kind: "text", text: hasPlot ? R.encounterNone : R.encounterNoPlot },
    ],
    rows: buttonRows(
      hasPlot
        ? [button(cid("is_board"), I.btnBoard), button(cid("is_view"), I.btnBack)]
        : [button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), button(cid("is_view"), I.btnBack)]
    ),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A look's name as the gift card says it: the part of the tree, then the look (สีใบ แก้วทะเล). */
function lookName(item: TreeItem): string {
  return `${TREE.slots[item.slot]} ${item.name}`;
}

/**
 * The guest's private answer for the presser's team, from
 * shift_quest_guest_status, for the button of `day`. A button of another day
 * (or an answer without a known guest) is the guest gone. Pure: the gift
 * itself follows as its own card (rd_guest).
 */
export function guestReveal(raw: unknown, day: string): View {
  const status = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const state = typeof status.state === "string" ? status.state : "gone";
  if (state === "gone" || status.day !== day || !isGuestKey(status.guest)) {
    return { tone: "island", title: REVEAL.goneTitle, blocks: [{ kind: "text", text: REVEAL.gone }] };
  }
  const g = GUESTS[status.guest];
  const looks = (Array.isArray(status.looks) ? status.looks : [])
    .map((id) => (typeof id === "string" ? treeItem(id) : null))
    .filter((item): item is TreeItem => !!item);
  const looksLine = looks.length > 0 ? [{ kind: "subtext", text: REVEAL.looks(looks.map(lookName)) } as const] : [];
  const fine = { kind: "subtext", text: REVEAL.fine } as const;
  const tree = buttonRows([button(cid("is_tree"), TREE.btnClose)]);
  switch (state) {
    case "noplot":
      return {
        tone: "island",
        title: REVEAL.awayTitle(g),
        blocks: [{ kind: "text", text: REVEAL.noPlot }, fine],
        rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success)]),
      };
    case "arriving":
      return { tone: "island", title: REVEAL.arrivingTitle, blocks: [{ kind: "text", text: REVEAL.arriving }] };
    case "quiet":
      // The guest's first rest passed with no drop: nobody got anything tonight, never "your team was not there".
      return { tone: "island", title: REVEAL.quietTitle(g), blocks: [{ kind: "text", text: REVEAL.quiet }, ...looksLine, fine] };
    case "won": {
      const item = typeof status.look === "string" ? treeItem(status.look) : null;
      const waiting = status.gift && typeof status.gift === "object";
      return {
        tone: "success",
        title: REVEAL.wonTitle(g),
        blocks: [
          ...(item ? [{ kind: "text", text: REVEAL.won(lookName(item)) } as const] : []),
          { kind: "text", text: waiting ? REVEAL.wonWaiting : REVEAL.wonTaken },
          fine,
        ],
        rows: waiting ? undefined : tree,
      };
    }
    case "full":
      return { tone: "island", title: REVEAL.fullTitle(g), blocks: [{ kind: "text", text: REVEAL.full(g) }, ...looksLine, fine], rows: tree };
    case "lost":
      return { tone: "island", title: REVEAL.lostTitle(g), blocks: [{ kind: "text", text: REVEAL.lost }, ...looksLine, fine], rows: tree };
    default:
      // away, and anything newer than this bot: the team had nobody at the fire when the guest arrived.
      return { tone: "island", title: REVEAL.awayTitle(g), blocks: [{ kind: "text", text: REVEAL.away }, ...looksLine, fine] };
  }
}

export const rounds: HandlerSet = {
  actions: {
    /**
     * The encounter's button on the round's public message: a new private
     * reply, acknowledged before the board is read, never an edit of the
     * message everyone at the fire shares.
     */
    async rd_enc(i, ctx, [roundText]) {
      requireStudent(ctx);
      if (!i.isButton() || !/^\d{1,12}$/.test(roundText ?? "")) return;
      const round = Number(roundText);
      const encounter = encounterAt(round);
      if (!encounter) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const board = await readBoard(ctx);
      const side = pickSide(board, round);
      await show(
        i,
        side ? sideView(board, side, { intro: encounter.found, fine: R.encounterNoteFine }) : emptyNote(encounter.found, Boolean(board.project))
      );
    },

    /**
     * The evening guest's 🎁 on a round message or the call: a new private
     * reply about the presser's own team, acknowledged first. The waiting
     * gift, when the team won one, follows as the normal gift card.
     */
    async rd_guest(i, ctx, [day]) {
      requireStudent(ctx);
      if (!i.isButton() || !DAY.test(day ?? "")) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      let status: unknown = { state: "gone" };
      try {
        status = await ctx.api.call<unknown>("shift_quest_guest_status", ctx.userId);
      } catch (error) {
        // A database older than the guest (schema 21): it has gone.
        if (!(error instanceof QuestDbError && error.sqlstate === "42883")) throw error;
      }
      await show(i, guestReveal(status, day));
      const s = status && typeof status === "object" ? (status as Record<string, unknown>) : {};
      const gift = s.state === "won" && s.day === day && isGuestKey(s.guest) ? giftFrom(s.gift) : null;
      if (gift && isGuestKey(s.guest)) await offerGift(i, ctx, gift, REVEAL.heading(GUESTS[s.guest]), "rd_guest");
    },

    async rd_aim(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("rd_aim_go"), R.aimTitle, [
          { kind: "text", id: "intention", label: R.aimLabel, required: true, max: 300, placeholder: R.aimPlaceholder },
        ])
      );
    },

    async rd_aim_go(i, ctx) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) return;
      const intention = textValue(i, "intention");
      if (!intention) return;
      // Two database calls may follow: answer Discord first (3 seconds), privately.
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await ctx.api.call("shift_quest_work_start", ctx.userId, intention);
      } catch (error) {
        if (!(error instanceof QuestError && error.code === "session_open")) throw error;
        // A round left open (no ✍️ last time): close it without a reflection and start this one.
        await endSession(ctx.api, ctx.userId, null);
        await ctx.api.call("shift_quest_work_start", ctx.userId, intention);
      }
      await show(i, {
        tone: "success",
        title: R.aimedTitle,
        blocks: [
          { kind: "text", text: `**${oneLine(intention, 120)}**` },
          { kind: "subtext", text: R.aimed },
        ],
      });
    },

    async rd_close(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      // One fast read before showModal. Older schemas do not have this read.
      let sessionId: string | null = null;
      try {
        sessionId = await ctx.api.call<string | null>("shift_quest_work_open", ctx.userId);
      } catch (error) {
        if (!(error instanceof QuestDbError && error.sqlstate === "42883")) throw error;
      }
      await i.showModal(reflectionModal("rd_close_go", R.closeTitle, sessionId));
    },

    async rd_close_go(i, ctx, [sessionId]) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) return;
      const learned = textValue(i, "learned");
      if (!learned) return;
      const stuck = textValue(i, "stuck");
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      let id: string;
      let gift: Gift | null = null;
      const version = await schemaOf(ctx.api);
      if (version >= TREE_SCHEMA) {
        // The same close, plus at most one gift for the team (never rolls the close back).
        const closed = await ctx.api.call<{ id?: unknown; gift?: unknown } | null>(
          "shift_quest_round_close_gift", ctx.userId, sessionId || null, learned, stuck
        );
        id = typeof closed?.id === "string" ? closed.id : "";
        gift = giftFrom(closed?.gift);
      } else if (version >= 12) {
        // Empty (or a pre-upgrade modal with no argument) means journal only.
        id = await ctx.api.call<string>("shift_quest_round_close", ctx.userId, sessionId || null, learned, stuck);
      } else {
        const intention = await endSession(ctx.api, ctx.userId, learned);
        id = await ctx.api.call<string>(
          "shift_quest_progress_add", ctx.userId, intention ?? R.changedDefault,
          learned, null, stuck, null, "private", null
        );
      }
      await show(i, reflectionSavedView(id, stuck));
      // Then the gift, as its own private message: picking it never touches the saved reply.
      if (gift) await offerGift(i, ctx, gift, TREE.gift.roundHeading, "rd_close_go");
    },
  },
};
