/**
 * The team's tree in Discord (schema 13, 20261114120000_shift_quest_tree_style):
 * 🔍 the close-up, 🌰 the seed, and the gifts after a campfire round and after
 * a quest's first submit. Every card is private and names nobody: a gift and
 * a seed belong to the team.
 *
 * Custom ids: is_tree (🔍), tr_seed (the four seeds), tr_seed_pick|<seed>
 * (opens the idea form tr_seed_go|<seed>), tr_gift (🎁 the oldest waiting
 * gift), tr_pick|<giftId>|<0..2> and tr_later (the gift waits). A pick reads
 * the gift's options from shift_quest_tree_get and takes the item at that
 * index, never an item named by the button; a gift that no longer waits
 * answers gift_gone, never an error. A gift never offers a look the team
 * owns by now (openOptions), and one with nothing left is skipped.
 *
 * A gift after a save comes as its own private message, after the saved or
 * sent reply: picking or keeping it replaces only the gift card, never that
 * reply's own buttons (the round's 🧱 help button). It can never fail the
 * save: any failure is logged by its code and the gift waits behind 🎁.
 */
import { AttachmentBuilder, MessageFlags, type ButtonBuilder, type RepliableInteraction } from "discord.js";

import type { CloseupInput } from "@/lib/shift-island/tree-closeup";
import { openGifts, openOptions, SEEDS, treeItem, type SeedId, type TreeItem } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { QuestError } from "../api";
import { requireStudent, type Ctx } from "../context";
import { errorText } from "../copy";
import { cid, isUuid } from "../ids";
import { closeupPng, giftPreviewPng, SEED_ORDER, seedPreviewPng } from "../island/closeup-png";
import { I, PRE_STAGE, STAGE_NAMES, TREE, stageBar } from "../island/copy";
import { myTreeFrom, readMyTree, reasonOf, TREE_SCHEMA } from "../island/tree";
import { schemaOf } from "../schema";
import { ButtonStyle, REVISION, button, buttonRows, errorRef, modal, renderView, show, textValue, type Block, type Replyable, type View } from "../ui";
import { islandLinkButton } from "../weblink";
import type { HandlerSet } from "./types";

/** Attachment names: an image block shows each with { kind: "image", name }. */
export const CLOSEUP_PNG = "shift-tree.png";
export const GIFT_PNG = "shift-tree-gift.png";
export const SEED_PNG = "shift-tree-seeds.png";

/** A waiting gift: its options are an index-ordered list, as the database stores them. */
export interface Gift {
  id: string;
  options: string[];
}

/** A gift has at most three options (the database's check); a pick is an index into them. */
const MAX_OPTIONS = 3;

const isSeed = (value: string | undefined): value is SeedId => typeof value === "string" && Object.hasOwn(SEEDS, value);

/** A gift as the database answers it ({id, options}), checked; null for anything else. */
export function giftFrom(raw: unknown): Gift | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, options } = raw as { id?: unknown; options?: unknown };
  if (typeof id !== "string" || !isUuid(id) || !Array.isArray(options)) return null;
  if (!options.length || !options.every((o) => typeof o === "string")) return null;
  return { id, options: options.slice(0, MAX_OPTIONS) as string[] };
}

/** A look's button and name: the part of the tree, then the look (สีใบ ทอง). */
function lookName(item: TreeItem): string {
  return `${TREE.slots[item.slot]} ${item.name}`;
}

function closeupOf(tree: MyTree): CloseupInput {
  return { style: tree.equipped, stage: tree.stage, seeded: tree.seed != null, roots: tree.roots };
}

function stageLine(tree: MyTree): string {
  const stage = Math.min(Math.max(Math.trunc(tree.stage), 0), 7);
  const name = stage === 0 && tree.seed ? PRE_STAGE : STAGE_NAMES[stage];
  return `${stageBar(stage)} ${name} **${stage}**/7`;
}

/** A picture that could not be drawn: one log line with a reference; the card still works without it. */
function drawn(action: string, draw: () => Buffer): Buffer | { ref: string } {
  try {
    return draw();
  } catch (error) {
    const ref = errorRef();
    console.error(`[shift-quests] ref=${ref} action=${action} code=draw:${(error as Error)?.name ?? "unknown"} rev=${REVISION}`);
    return { ref };
  }
}

/** A picture's blocks and files, or the island's "picture failed" line. */
function picture(png: Buffer | { ref: string }, name: string, alt: string): { blocks: Block[]; files: AttachmentBuilder[] } {
  if (!Buffer.isBuffer(png)) return { blocks: [{ kind: "subtext", text: I.pictureFailed(png.ref) }], files: [] };
  return { blocks: [{ kind: "image", name, alt }], files: [new AttachmentBuilder(png, { name, description: alt })] };
}

const backButton = () => button(cid("is_view"), I.btnBack);

/**
 * The tree's own buttons: 🌰 while the team has no seed, 🎁 while a gift
 * waits (with how many), and 🔍 unless the card is the close-up itself.
 */
export function treeButtons(tree: MyTree, closeup = true): ButtonBuilder[] {
  const buttons: ButtonBuilder[] = [];
  if (!tree.seed) buttons.push(button(cid("tr_seed"), TREE.btnSeed, ButtonStyle.Success));
  if (closeup) buttons.push(button(cid("is_tree"), TREE.btnClose));
  const waiting = openGifts(tree.owned, tree.gifts).length;
  if (waiting > 0) buttons.push(button(cid("tr_gift"), waiting > 1 ? `${TREE.btnGift} (${waiting})` : TREE.btnGift, ButtonStyle.Primary));
  return buttons;
}

/**
 * The close-up: the tree large with its roots, its stage and roots in words,
 * then the tree's buttons. lead: a line above (planted, picked). Before the
 * seed and the first stage the drawing has no tree and no roots, so the roots
 * line is left out, as on the website.
 */
function closeupCard(tree: MyTree, action: string, over: { title?: string; tone?: View["tone"]; lead?: string } = {}): View {
  const shot = picture(drawn(action, () => closeupPng(closeupOf(tree))), CLOSEUP_PNG, TREE.closeup.caption);
  const planted = tree.seed != null || tree.stage > 0;
  const lines = [stageLine(tree), ...(planted ? [TREE.closeup.roots(tree.roots.count)] : [])];
  const web = islandLinkButton();
  return {
    tone: over.tone ?? "island",
    title: over.title ?? TREE.btnClose,
    blocks: [
      ...shot.blocks,
      ...(over.lead ? [{ kind: "text" as const, text: over.lead }] : []),
      { kind: "text", text: lines.join("\n") },
      { kind: "subtext", text: TREE.closeup.caption },
    ],
    rows: buttonRows([...treeButtons(tree, false), ...(web ? [web] : []), backButton()]),
    files: shot.files,
  };
}

/**
 * A gift to pick from: the options on the team's tree side by side, a button
 * each (carrying the option's index in the gift as stored), and keep for
 * later. Only options the team can still take (openOptions: known, not owned
 * by now). Null when none is left.
 */
function giftCard(tree: MyTree, gift: Gift, heading: string | null, action: string): View | null {
  const options = openOptions(tree.owned, gift.options);
  if (!options.length) return null;
  const names = options.map((o) => lookName(o.item));
  const shot = picture(drawn(action, () => giftPreviewPng(closeupOf(tree), options.map((o) => o.item.id))), GIFT_PNG, names.join(" · "));
  return {
    tone: "island",
    title: heading ? `🎁 ${heading}` : TREE.btnGift,
    blocks: [...shot.blocks, { kind: "text", text: options.length >= 3 ? TREE.gift.sub : TREE.gift.subFew }],
    rows: buttonRows([
      ...options.map((o) => button(cid("tr_pick", gift.id, o.index), lookName(o.item), ButtonStyle.Primary)),
      button(cid("tr_later"), TREE.btnKeep),
    ]),
    files: shot.files,
  };
}

/** Not possible right now (a teammate was first): the words for the code, then the tree and the way back. */
function refusalCard(code: "gift_gone" | "seed_planted"): View {
  return {
    tone: "warn",
    blocks: [{ kind: "text", text: errorText(code) }],
    rows: buttonRows([button(cid("is_tree"), TREE.btnClose), backButton()]),
  };
}

/** No plot yet: the island's own no-plot card (claim a plot, or go back). */
function noPlotCard(): View {
  return {
    tone: "island",
    title: I.header,
    blocks: [{ kind: "text", text: I.noPlot }],
    rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), backButton()]),
  };
}

/** The four seeds: one picture, each with its line and its button, in the same order. */
function seedCard(action: string): View {
  const shot = picture(drawn(action, seedPreviewPng), SEED_PNG, SEED_ORDER.map((s) => TREE.seeds[s].name).join(" · "));
  return {
    tone: "island",
    title: TREE.btnSeed,
    blocks: [
      ...shot.blocks,
      { kind: "text", text: TREE.pick },
      { kind: "text", text: SEED_ORDER.map((s) => `🌰 **${TREE.seeds[s].name}** ${TREE.seeds[s].blurb}`).join("\n") },
    ],
    rows: buttonRows([...SEED_ORDER.map((s) => button(cid("tr_seed_pick", s), TREE.seeds[s].name)), backButton()]),
    files: shot.files,
  };
}

/** The team's tree (shift_quest_tree_get), or null without a project. Other failures go to the error card. */
async function ownTree(ctx: Ctx): Promise<MyTree | null> {
  let raw: unknown;
  try {
    raw = await ctx.api.call<unknown>("shift_quest_tree_get", ctx.userId);
  } catch (error) {
    if (error instanceof QuestError && error.code === "no_project") return null;
    throw error;
  }
  const tree = myTreeFrom(raw);
  if (!tree) throw new Error("shift_quest_tree_get answered something that is not a tree");
  return tree;
}

/**
 * After a save whose reply is already shown: the gift as its own private
 * message. Without the team's tree to draw it on, it waits for 🎁. Never throws.
 */
export async function offerGift(i: Replyable, ctx: Ctx, gift: Gift, heading: string, action: string): Promise<void> {
  try {
    const tree = await readMyTree(ctx.api, ctx.userId);
    const card = tree ? giftCard(tree, gift, heading, action) : null;
    if (card) await (i as RepliableInteraction).followUp(renderView(card, { action }));
  } catch (error) {
    console.error(`[shift-quests] action=${action} gift not shown (${reasonOf(error)}) rev=${REVISION}`);
  }
}

/**
 * The gift a saved quest submit earned (schema 13): the first submit of each
 * quest gives the team one. Asked in its own call after the submit, so it can
 * never fail it: any failure is logged by its code only and answers none.
 */
export async function questGift(ctx: Ctx, instanceId: unknown, action: string): Promise<Gift | null> {
  if (typeof instanceId !== "string" || !isUuid(instanceId)) return null;
  try {
    if (!((await schemaOf(ctx.api)) >= TREE_SCHEMA)) return null;
    const raw = await ctx.api.call<{ gift?: unknown } | null>("shift_quest_quest_gift", ctx.userId, instanceId);
    return giftFrom(raw?.gift);
  } catch (error) {
    console.error(`[shift-quests] action=${action} quest gift skipped (${reasonOf(error)}) rev=${REVISION}`);
    return null;
  }
}

/** After a quest submit is saved and its sent reply shown: the quest's gift, when it earned one. Never throws. */
export async function offerQuestGift(i: Replyable, ctx: Ctx, instanceId: unknown, action: string): Promise<void> {
  const gift = await questGift(ctx, instanceId, action);
  if (gift) await offerGift(i, ctx, gift, TREE.gift.questHeading, action);
}

export const tree: HandlerSet = {
  actions: {
    /** 🔍 on the island card: the close-up, as a new private reply. */
    async is_tree(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const own = await ownTree(ctx);
      await show(i, own ? closeupCard(own, "is_tree") : noPlotCard());
    },

    async tr_seed(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const own = await ownTree(ctx);
      if (!own) await show(i, noPlotCard());
      else if (own.seed) await show(i, refusalCard("seed_planted"));
      else await show(i, seedCard("tr_seed"));
    },

    /** The idea form: its line starts from the project's ambition when the team wrote one (read first; none on any failure). */
    async tr_seed_pick(i, ctx, [seed]) {
      requireStudent(ctx);
      if (!i.isButton() || !isSeed(seed)) return;
      const { name, blurb } = TREE.seeds[seed];
      const ambition = (await readMyTree(ctx.api, ctx.userId))?.ambition ?? null;
      await i.showModal(
        modal(cid("tr_seed_go", seed), TREE.modalTitle, [
          { kind: "note", text: `🌰 **${name}** ${blurb}` },
          {
            kind: "text",
            id: "idea",
            label: TREE.ideaLabel,
            description: ambition ? TREE.ideaPrefilled : undefined,
            placeholder: TREE.ideaPlaceholder,
            value: ambition,
            required: true,
            min: 1,
            max: 500,
          },
        ])
      );
    },

    async tr_seed_go(i, ctx, [seed]) {
      requireStudent(ctx);
      if (!i.isModalSubmit() || !isSeed(seed)) return;
      const idea = textValue(i, "idea");
      if (!idea) return;
      // A write and a picture: answer Discord first (3 seconds), privately.
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      let planted: MyTree | null;
      try {
        planted = myTreeFrom(await ctx.api.call<unknown>("shift_quest_seed_plant", ctx.userId, seed, idea));
      } catch (error) {
        if (error instanceof QuestError && error.code === "seed_planted") return show(i, refusalCard("seed_planted"));
        throw error;
      }
      const title = `🌰 ${TREE.seeds[seed].name}`;
      await show(
        i,
        planted
          ? closeupCard(planted, "tr_seed_go", { title, tone: "success", lead: TREE.planted })
          : { tone: "success", title, blocks: [{ kind: "text", text: TREE.planted }], rows: buttonRows([backButton()]) }
      );
    },

    /** 🎁 on the island card or the close-up: the oldest waiting gift, as a new private reply. */
    async tr_gift(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const own = await ownTree(ctx);
      if (!own) return show(i, noPlotCard());
      const gift = openGifts(own.owned, own.gifts)[0];
      await show(i, (gift && giftCard(own, gift, null, "tr_gift")) || refusalCard("gift_gone"));
    },

    /** One of a gift's options, by its index in the gift as the database has it now. Replaces the gift card. */
    async tr_pick(i, ctx, [giftId, index]) {
      requireStudent(ctx);
      if (!i.isButton() || !isUuid(giftId) || !/^[0-2]$/.test(index ?? "")) return;
      await i.deferUpdate();
      const own = await ownTree(ctx);
      if (!own) return show(i, noPlotCard(), { clearFiles: true });
      const gift = own.gifts.find((g) => g.id === giftId);
      const id = gift?.options[Number(index)];
      const item = id ? treeItem(id) : null;
      if (!gift || !id || !item) return show(i, refusalCard("gift_gone"), { clearFiles: true });
      if (!openOptions(own.owned, [id]).length) {
        // The team got this look from another gift since the card was drawn: what this gift still offers, or gone.
        return show(i, giftCard(own, gift, null, "tr_pick") ?? refusalCard("gift_gone"), { clearFiles: true });
      }
      let picked: MyTree | null;
      try {
        picked = myTreeFrom(await ctx.api.call<unknown>("shift_quest_tree_pick", ctx.userId, giftId, id));
      } catch (error) {
        if (error instanceof QuestError && error.code === "gift_gone") return show(i, refusalCard("gift_gone"), { clearFiles: true });
        throw error;
      }
      await show(
        i,
        closeupCard(picked ?? own, "tr_pick", { title: `🎁 ${TREE.gift.picked(lookName(item))}`, tone: "success" }),
        { clearFiles: true }
      );
    },

    /** Keep for later: the gift card's buttons and picture go; the gift waits for 🎁. Nothing is written. */
    async tr_later(i, ctx) {
      requireStudent(ctx);
      if (!i.isButton()) return;
      await show(
        i,
        { tone: "island", blocks: [{ kind: "text", text: TREE.gift.kept }], rows: buttonRows([backButton()]) },
        { replace: true, clearFiles: true }
      );
    },
  },
};
