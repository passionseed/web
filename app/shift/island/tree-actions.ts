"use server";

/**
 * The team's tree on /shift/island (schema 13): choose the seed, pick a
 * gift, put an owned look on the tree. Each action re-derives who is asking
 * from the session (supabase.auth.getUser() through the shared gate, ./gate.ts;
 * the client never sends an actor), calls exactly one shift_quest_* function,
 * and answers with the team's tree as the database now has it. The database
 * enforces every rule (one seed per project, a gift picked once, only offered
 * or owned items); refusals come back as Thai text. A refusal that means the
 * close-up is out of date (gift_gone, seed_planted, item_not_owned) refreshes
 * the page, so the next look is the real tree.
 *
 * The page only shows these controls when it has a tree (schema 13 or
 * later), so a database before schema 13 is never asked.
 */

import { myTreeFrom } from "@/bot/src/quests/island/tree";
import { questApi } from "@/lib/supabase/shift-quests/db";
import type { IslandActionResult, MyTree } from "@/lib/supabase/shift-quests/types";
import { equipItemSchema, pickGiftSchema, plantSeedSchema } from "@/lib/supabase/shift-quests/validate";

import { withReadyViewer } from "./gate";

type TreeResult = IslandActionResult<{ tree: MyTree }>;

/** The tree JSON did not have the shape the database returns. Logged by class name only. */
class TreeShapeError extends Error {
  constructor() {
    super("malformed tree");
    this.name = "TreeShapeError";
  }
}

async function treeCall(fn: string, ...args: unknown[]): Promise<{ tree: MyTree }> {
  const tree = myTreeFrom(await questApi().call<unknown>(fn, ...args));
  if (!tree) throw new TreeShapeError();
  return { tree };
}

/** Choose the team's seed (once per project) with one line on what the team wants to build. */
export async function plantSeed(seed: string, idea: string): Promise<TreeResult> {
  return withReadyViewer("plantSeed", plantSeedSchema, { seed, idea }, ({ actor }, v) =>
    treeCall("shift_quest_seed_plant", actor, v.seed, v.idea),
  );
}

/** Pick one option of a waiting gift: the team owns it and the tree wears it at once. */
export async function pickGift(giftId: string, item: string): Promise<TreeResult> {
  return withReadyViewer("pickGift", pickGiftSchema, { giftId, item }, ({ actor }, v) =>
    treeCall("shift_quest_tree_pick", actor, v.giftId, v.item),
  );
}

/** Put an item the team owns on the tree (any teammate). */
export async function equipItem(item: string): Promise<TreeResult> {
  return withReadyViewer("equipItem", equipItemSchema, { item }, ({ actor }, v) =>
    treeCall("shift_quest_tree_equip", actor, v.item),
  );
}
