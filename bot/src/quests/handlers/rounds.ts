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
 */
import { MessageFlags } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import { requireStudent } from "../context";
import { cid } from "../ids";
import { I } from "../island/copy";
import { encounterAt } from "../rounds";
import { schemaOf } from "../schema";
import { R } from "../rounds-copy";
import { ButtonStyle, button, buttonRows, modal, show, textValue, type View } from "../ui";
import { pickSide, readBoard, sideView } from "./board";
import { reflectionModal, reflectionSavedView } from "./reflection";
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
      if ((await schemaOf(ctx.api)) >= 12) {
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
    },
  },
};
