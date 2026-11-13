/**
 * The campfire round's buttons (rounds.ts posts the round message): 🎯 sets
 * what this round is for (a work session's intention), ✍️ closes the round
 * with what was learned and, optionally, where it is stuck. Both answer only
 * the person who pressed, privately. The reflection is a private journal
 * entry, the same as /progress add, so /data, erasure and the journal cover
 * it; the roots count it (design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md).
 */
import { QuestError, type QuestApi } from "../api";
import { requireStudent } from "../context";
import { T } from "../copy";
import { cid } from "../ids";
import { LEARNED_MIN, R } from "../rounds-copy";
import { ButtonStyle, button, buttonRows, modal, show, textValue } from "../ui";
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

export const rounds: HandlerSet = {
  actions: {
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
      await i.showModal(
        modal(cid("rd_close_go"), R.closeTitle, [
          { kind: "text", id: "learned", label: R.closeLearned, description: R.closeLearnedHint, long: true, required: true, min: LEARNED_MIN, max: 1000 },
          { kind: "text", id: "stuck", label: R.closeStuck, description: R.closeStuckHint, long: true, required: false, max: 1000 },
        ])
      );
    },

    async rd_close_go(i, ctx) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) return;
      const learned = textValue(i, "learned");
      if (!learned) return;
      const stuck = textValue(i, "stuck");
      const intention = await endSession(ctx.api, ctx.userId, learned);
      const id = await ctx.api.call<string>(
        "shift_quest_progress_add",
        ctx.userId,
        intention ?? R.changedDefault,
        learned,
        null,
        stuck,
        null,
        "private",
        null
      );
      await show(i, {
        tone: "success",
        title: R.closedTitle,
        blocks: [
          { kind: "text", text: R.closed },
          { kind: "subtext", text: R.closedFine },
        ],
        rows: stuck ? buttonRows([button(cid("prog_help", id), T.btnSendBlocker, ButtonStyle.Primary)]) : undefined,
      });
    },
  },
};
