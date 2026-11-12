/**
 * The buttons on the live island post (../live.ts): one action, "sq|lp|<target>".
 *
 * That post is one public message the whole live channel shares, so a press
 * here never changes it: no update, no deferUpdate, no edit. Each press
 * answers only the person who pressed, in a new private reply, with the card
 * its own command or island button already shows. The reply is deferred
 * before any database read, so Discord's 3 seconds always hold, and every
 * card after that edits the private reply, never the post. The buttons on
 * that private card then work exactly as they do everywhere else.
 *
 * Who may press: the slash commands' own gate, so someone who is not in the
 * pilot gets the same polite "not yet". Someone in the pilot who has not
 * started yet gets the welcome card /start shows, with its start button.
 */
import { MessageFlags } from "discord.js";

import { requireEligible, type Ctx } from "../context";
import { isPanelTarget, type PanelTarget } from "../live";
import { show } from "../ui";
import { island, showIsland } from "./island";
import { introView, showRewards } from "./student";
import type { ActionInteraction, HandlerSet } from "./types";

type Open = (i: ActionInteraction, ctx: Ctx) => Promise<void>;

/** One of the island card's own buttons, as it is (each checks the student gate itself). */
const islandAction =
  (action: "is_work" | "is_tap" | "is_stuck" | "is_how"): Open =>
  (i, ctx) =>
    island.actions![action](i, ctx, []);

/**
 * What each button opens. form: the answer is a form, which has to be the
 * first answer, so nothing is deferred before it (its submit is a new private
 * reply too).
 */
const OPEN: Record<PanelTarget, { open: Open; form?: true }> = {
  // /island
  me: { open: (i, ctx) => showIsland(i, ctx, false) },
  // 📋 on the island card: the student's own quests (/quest is retired; they live on the island)
  quests: { open: islandAction("is_work") },
  // 🔨 on the island card: today's private check-in, then ✏️ for a note
  // Without a plot, is_tap offers one (🌱) instead of checking in.
  checkin: { open: islandAction("is_tap") },
  // 🧱 on the island card: the help request form
  help: { open: islandAction("is_stuck"), form: true },
  // /rewards
  rewards: { open: (i, ctx) => showRewards(i, ctx) },
  // 📖 on the island card
  // is_how shows 🌱 only to someone without a project.
  how: { open: islandAction("is_how") },
};

export const panel: HandlerSet = {
  actions: {
    async lp(i, ctx, [target]) {
      if (!i.isButton() || !isPanelTarget(target)) return;
      requireEligible(ctx);
      if (!ctx.session.onboarded) {
        await show(i, introView());
        return;
      }
      const { open, form } = OPEN[target];
      if (!form) await i.deferReply({ flags: MessageFlags.Ephemeral });
      await open(i, ctx);
    },
  },
};
