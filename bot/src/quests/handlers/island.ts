/**
 * /island: the whole student surface in one view. Your tree, your next
 * milestone, the season, and one-tap actions. Forms appear only when a
 * milestone is reached (proof + one portfolio question).
 */
import { AttachmentBuilder, MessageFlags, type ModalBuilder } from "discord.js";

import { QuestError, type Quest } from "../api";
import { requireStudent, type Ctx } from "../context";
import { STATE, T, safe } from "../copy";
import { cid } from "../ids";
import { I, WIP_CORNER, WIP_CORNER_SHORT, seasonHead, seasonParts, type SeasonView } from "../island/copy";
import { RenderError, renderIsland, type IslandPlot, type RenderedIsland } from "../island/render";
import {
  ButtonStyle,
  REVISION,
  button,
  buttonRows,
  errorRef,
  modal,
  selectRow,
  show,
  textValue,
  type Field,
  type Replyable,
  type Block,
  type Row,
  type View,
} from "../ui";
import { islandLinkButton } from "../weblink";
import { newProjectModal } from "./project";
import { helpModal } from "./journal";
import { picked, type HandlerSet } from "./types";

/** The island picture's attachment name: an image block shows it with { kind: "image", name: ISLAND_PNG }. */
export const ISLAND_PNG = "shift-island.png";

interface MilestoneView {
  milestone: number;
  template_id: string;
  title: string;
  purpose: string;
  evidence_criteria: string;
  reflection_prompt: string;
  done: boolean;
  /**
   * The project's one open quest for this milestone, whoever holds it. mine is
   * false when a teammate holds it; owner is that teammate's display name.
   */
  in_flight: { instance_id: string; state: string; version: number; mine?: boolean; owner?: string | null } | null;
}

/** A teammate holds this milestone's open quest: the caller cannot submit it (sq:milestone_open). */
function heldByTeammate(m: MilestoneView): boolean {
  return m.in_flight?.mine === false;
}

export interface IslandView {
  project: null | {
    id: string;
    name: string;
    route: string;
    slot: number;
    stage: number;
    milestones_done: number[];
    next_milestone: number | null;
    show_name: boolean;
    name_visible: boolean;
  };
  milestones: MilestoneView[];
  taps_today: number;
  resting: boolean;
  season: SeasonView | null;
}

export interface IslandMap {
  plots: IslandPlot[];
}

/**
 * Draws the island. When drawing fails (a missing sprite, a bad plot, an
 * island too big for one image) it logs one line and returns its reference
 * instead: the text view and every button still work without the picture.
 */
function drawIsland(plots: IslandPlot[], festival: boolean): { image: RenderedIsland } | { ref: string } {
  try {
    return { image: renderIsland(plots, { scale: 2, markMine: true, festival }) };
  } catch (error) {
    const ref = errorRef();
    const code = error instanceof RenderError ? `${error.code} detail=${error.detail}` : `unexpected:${(error as Error)?.name ?? "unknown"}`;
    console.error(`[shift-quests] ref=${ref} action=island_render code=${code} rev=${REVISION}`);
    return { ref };
  }
}

/** The island card: blocks, buttons and the picture it shows. */
export type IslandCard = View & Required<Pick<View, "blocks" | "rows" | "files">>;

/** Signs shown on the card; the rest are counted. */
const SIGNS_SHOWN = 6;

/** Open work listed on the work card; the menu below it holds every one. */
const WORK_SHOWN = 5;

/**
 * One card: the picture on top, your plot with its stage bar, the next
 * milestone, the season, then the fine print and the buttons.
 */
export async function islandMessage(ctx: Ctx): Promise<IslandCard> {
  const [view, map] = await Promise.all([
    ctx.api.call<IslandView>("shift_quest_island", ctx.userId),
    ctx.api.call<IslandMap>("shift_quest_island_map", ctx.userId),
  ]);
  const drawn = drawIsland(map.plots, Boolean(view.season));
  const files =
    "image" in drawn ? [new AttachmentBuilder(drawn.image.png, { name: ISLAND_PNG, description: "เกาะ SHIFT" })] : [];
  const blocks: Block[] = [];
  if ("image" in drawn) blocks.push({ kind: "image", name: ISLAND_PNG, alt: "เกาะ SHIFT" });
  else blocks.push({ kind: "subtext", text: I.pictureFailed(drawn.ref) });

  const lines: string[] = [];
  if (!view.project) {
    lines.push(I.noPlot);
  } else {
    const p = view.project;
    // The number on the image is the plot's slot, so it holds even without a picture.
    lines.push(I.plot(p.slot, p.stage, p.name));
    const next = view.milestones.find((m) => m.milestone === p.next_milestone);
    lines.push(next ? I.next(next.title) : I.allDone);
    // A teammate's open quest shows whatever its state, so nobody starts a second one.
    for (const m of view.milestones) {
      const flight = m.in_flight;
      const held = heldByTeammate(m);
      if (!flight || (flight.state === "active" && !held)) continue;
      const state = STATE[flight.state] ?? flight.state;
      lines.push(held ? I.inFlightHeld(m.title, state, flight.owner ?? null) : I.inFlight(m.title, state));
    }
    if (view.resting) lines.push(I.resting);
    if (view.taps_today > 0) lines.push(I.tappedToday);
  }
  blocks.push({ kind: "text", text: lines.join("\n") });

  if (view.season) {
    // The headline and where you stand; unlocks and the island's goal sit behind ℹ️.
    const season = seasonParts(view.season, null, titleLookup(view));
    const text = [seasonHead(view.season), ...season.status, ...(season.wip ? [`-# ${WIP_CORNER_SHORT}`] : [])];
    blocks.push({ kind: "divider" }, { kind: "section", text: text.join("\n"), button: button(cid("is_season"), I.btnSeason) });
  }

  const signs = map.plots
    .filter((plot) => plot.name)
    .sort((a, b) => a.slot - b.slot)
    .map((plot) => `#${plot.slot} ${safe(plot.name, 40)}`);
  const fine: string[] = [];
  if (signs.length) {
    const rest = signs.length - SIGNS_SHOWN;
    fine.push(`${I.signs} ${signs.slice(0, SIGNS_SHOWN).join(" · ")}${rest > 0 ? ` · ${I.more(rest)}` : ""}`);
  }
  fine.push(I.growthRule);
  blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: fine.join("\n") });

  // The island is the hub: review results, invites and help replies are one tap away
  // in the inbox (the existing sq|inbox action), with the unread count on the button.
  const unread = ctx.session.unread ?? 0;
  const inboxButton = button(
    cid("inbox"),
    unread > 0 ? `${T.btnInbox} (${unread})` : T.btnInbox,
    unread > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary
  );
  // The island on the website, when configured: last on the second row while
  // it has room (buttonRows starts a new row after five), or on the claim row.
  const link = islandLinkButton();
  const web = link ? [link] : [];
  // Main actions on the first row, the rest below. Same buttons and IDs as before, plus the inbox.
  const rows = view.project
    ? [
        ...buttonRows([
          button(cid("is_tap"), I.btnTap, ButtonStyle.Primary),
          button(cid("is_ms"), I.btnMilestone, ButtonStyle.Success),
          button(cid("is_work"), I.btnWork),
        ]),
        ...buttonRows([
          button(cid("is_stuck"), I.btnStuck),
          view.resting ? button(cid("is_rest", "off"), I.btnWake) : button(cid("is_rest", "on"), I.btnRest),
          view.project.show_name
            ? button(cid("is_name", view.project.id, "off"), I.btnHideName)
            : button(cid("is_name", view.project.id, "on"), I.btnShowName),
          inboxButton,
          ...web,
        ]),
      ]
    : // No project yet: claim a plot, or read how the island works. Never the old quest form.
      buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), button(cid("is_how"), I.btnHow), inboxButton, ...web]);

  return { tone: "island", title: I.header, blocks, rows, files };
}

function backRow(): Row[] {
  return buttonRows([button(cid("is_view"), I.btnBack)]);
}

/** A milestone's title by its number, for the season's "needs milestone 2 / 3" hints. */
function titleLookup(view: IslandView): (milestone: number) => string | null {
  return (n) => view.milestones.find((m) => m.milestone === n)?.title ?? null;
}

/**
 * The season in full: Demo Day, where you stand, the work-in-progress corner,
 * unlocks and the island's shared goal. The island card shows only the headline.
 */
export function seasonCard(view: IslandView): View {
  if (!view.season) return { tone: "neutral", blocks: [{ kind: "text", text: I.noSeason }], rows: backRow() };
  const titleOf = titleLookup(view);
  const goal = view.season.goal;
  const season = seasonParts(view.season, goal ? titleOf(goal.milestone) : null, titleOf);
  const blocks: Block[] = [{ kind: "text", text: [season.when, ...season.status, ...(season.wip ? [WIP_CORNER] : [])].join("\n") }];
  if (season.extras.length) blocks.push({ kind: "divider" }, { kind: "text", text: season.extras.join("\n") });
  blocks.push({ kind: "subtext", text: I.seasonFine });
  const back = button(cid("is_view"), I.btnBack);
  return {
    tone: "season",
    title: season.title,
    blocks,
    rows: buttonRows(view.project ? [button(cid("is_ms"), I.btnMilestone, ButtonStyle.Success), back] : [back]),
  };
}

/**
 * The milestone form: proof once (a link or a line) and one portfolio
 * question. The evidence criteria sit on the proof field, or above the fields
 * when they are longer than a field description can hold.
 */
export function milestoneModal(m: MilestoneView): ModalBuilder {
  const criteria = m.evidence_criteria?.trim() ?? "";
  const fitsDescription = criteria.length > 0 && criteria.length <= 100;
  const fields: Field[] = [];
  if (criteria && !fitsDescription) fields.push({ kind: "note", text: I.criteria(criteria) });
  fields.push(
    {
      kind: "text",
      id: "proof",
      label: I.proof,
      description: fitsDescription ? criteria : undefined,
      placeholder: I.proofHint,
      long: true,
      required: true,
      max: 1000,
    },
    {
      kind: "text",
      id: "note",
      label: I.portfolio,
      description: `${m.reflection_prompt} · ${I.portfolioHint}`,
      long: true,
      required: true,
      max: 1000,
    }
  );
  return modal(cid("is_msgo", m.milestone), m.title, fields);
}

/** The first https link in the proof, also sent as the work's link so reviewers can open it. */
export function proofLink(proof: string | null): string | null {
  const match = /https:\/\/[^\s<>"'`]+/.exec(proof ?? "");
  const url = match?.[0].replace(/[.,;:!?)\]]+$/, "");
  return url && url.length <= 500 ? url : null;
}

async function showIsland(i: Replyable, ctx: Ctx, replace: boolean): Promise<void> {
  // Rendering plus two queries can approach Discord's 3-second limit: acknowledge first.
  if (replace && i.isMessageComponent()) await i.deferUpdate();
  else if (!replace && (i.isChatInputCommand() || i.isMessageComponent() || i.isModalSubmit()) && !i.deferred && !i.replied) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
  }
  await show(i, await islandMessage(ctx));
}

function milestoneLabel(m: MilestoneView): string {
  return `${m.milestone} · ${m.title}`;
}

export const island: HandlerSet = {
  commands: {
    async island(i, ctx) {
      requireStudent(ctx);
      await showIsland(i, ctx, false);
    },
  },

  actions: {
    async is_view(i, ctx) {
      requireStudent(ctx);
      await showIsland(i, ctx, true);
    },

    async is_claim(i, ctx) {
      requireStudent(ctx);
      if (i.isButton()) await i.showModal(newProjectModal());
    },

    async is_how(i, ctx) {
      requireStudent(ctx);
      // A details screen: it takes the island card's place, and 🏝️ brings the island back.
      await show(
        i,
        {
          tone: "island",
          title: I.btnHow,
          blocks: [
            { kind: "text", text: I.how },
            { kind: "subtext", text: I.howFine },
          ],
          rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), button(cid("is_view"), I.btnBack)]),
        },
        { replace: true }
      );
    },

    async is_season(i, ctx) {
      requireStudent(ctx);
      const view = await ctx.api.call<IslandView>("shift_quest_island", ctx.userId);
      await show(i, seasonCard(view), { replace: true });
    },

    async is_tap(i, ctx) {
      requireStudent(ctx);
      const before = await ctx.api.call<IslandView>("shift_quest_island", ctx.userId);
      await ctx.api.call("shift_quest_checkin", ctx.userId, null);
      const again = before.taps_today > 0;
      await show(i, {
        tone: again ? "island" : "success",
        title: again ? I.tapAgainTitle : I.tappedTitle,
        blocks: [{ kind: "text", text: again ? I.tapAgain : I.tapped }],
        rows: buttonRows([button(cid("is_note"), I.btnNote), button(cid("is_view"), I.btnBack)]),
      });
    },

    async is_note(i, ctx) {
      requireStudent(ctx);
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_checkin", ctx.userId, textValue(i, "note"));
        await show(i, { tone: "success", title: I.noteSavedTitle, blocks: [{ kind: "subtext", text: I.noteSaved }], rows: backRow() });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("is_note"), I.noteTitle, [{ kind: "text", id: "note", label: I.noteLabel, required: true, max: 300 }])
      );
    },

    async is_ms(i, ctx) {
      requireStudent(ctx);
      const view = await ctx.api.call<IslandView>("shift_quest_island", ctx.userId);
      if (!view.project) {
        await show(i, {
          tone: "island",
          title: I.header,
          blocks: [{ kind: "text", text: I.noPlot }],
          rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), button(cid("is_view"), I.btnBack)]),
        });
        return;
      }
      // Not-yet-done milestones first; done ones stay available for distinct repeats.
      // A milestone under appeal waits for its decision, and one a teammate
      // holds is theirs to submit (the project has one open quest per milestone).
      const ordered = view.milestones
        .filter((m) => m.in_flight?.state !== "appealed" && !heldByTeammate(m))
        .sort((a, b) => Number(a.done) - Number(b.done) || a.milestone - b.milestone);
      // One short line per milestone; what each one asks for is in the menu below.
      const list = view.milestones.map((m) => {
        const held = heldByTeammate(m) ? ` (${safe(I.heldBy(m.in_flight!.owner ?? null), 60)})` : "";
        return `${m.done ? "✅" : m.in_flight ? "⏳" : "▫️"} ${milestoneLabel(m)}${held}`;
      });
      const blocks: Block[] = [{ kind: "text", text: list.join("\n") }];
      if (!ordered.length) blocks.push({ kind: "text", text: I.nothingToPick });
      blocks.push({ kind: "subtext", text: I.msLegend });
      await show(i, {
        tone: "island",
        title: `🌟 ${I.pickMilestone}`,
        blocks,
        // A select needs at least one option: with none, the list and the way back only.
        rows: ordered.length
          ? [
              selectRow(
                cid("is_mspick"),
                I.pickMilestone,
                ordered.map((m) => ({
                  label: milestoneLabel(m),
                  value: String(m.milestone),
                  description: m.done
                    ? I.doneRepeat
                    : m.in_flight
                      ? [STATE[m.in_flight.state], m.purpose].filter(Boolean).join(" · ")
                      : m.purpose,
                }))
              ),
              ...backRow(),
            ]
          : backRow(),
      });
    },

    async is_mspick(i, ctx, args) {
      requireStudent(ctx);
      const milestone = Number(picked(i, args));
      if (!i.isStringSelectMenu() || !Number.isInteger(milestone)) return;
      const view = await ctx.api.call<IslandView>("shift_quest_island", ctx.userId);
      const m = view.milestones.find((x) => x.milestone === milestone);
      if (!m) return;
      // An old picker can still offer a milestone a teammate took since: say who, before any typing.
      if (heldByTeammate(m)) throw new QuestError("milestone_open");
      if (m.in_flight?.state === "appealed") throw new QuestError("milestone_appealed");
      await i.showModal(milestoneModal(m));
    },

    async is_msgo(i, ctx, [milestone]) {
      requireStudent(ctx);
      if (!i.isModalSubmit() || !/^[1-7]$/.test(milestone ?? "")) return;
      // Two queries before the reply: acknowledge first so a slow one never shows "failed".
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      // Read at submit time, not when the form opened: a teammate may have
      // passed this milestone meanwhile. A repeat never grows the tree.
      const view = await ctx.api.call<IslandView>("shift_quest_island", ctx.userId);
      const repeat = Boolean(view.milestones.find((x) => x.milestone === Number(milestone))?.done);
      const proof = textValue(i, "proof");
      await ctx.api.call(
        "shift_quest_milestone_submit",
        ctx.userId,
        Number(milestone),
        proof,
        textValue(i, "note"),
        proofLink(proof)
      );
      await show(i, {
        tone: "success",
        title: I.sentTitle,
        blocks: [
          { kind: "text", text: repeat ? I.sentRepeat : I.sent },
          { kind: "subtext", text: I.resultIn },
        ],
        rows: backRow(),
      });
    },

    async is_stuck(i, ctx) {
      requireStudent(ctx);
      if (i.isButton()) await i.showModal(helpModal(null));
    },

    async is_rest(i, ctx, [state]) {
      requireStudent(ctx);
      const on = state === "on";
      const result = await ctx.api.call<{ paused: number; resumed: number }>("shift_quest_rest", ctx.userId, on);
      // Nothing open means nothing was paused: say so rather than claim a rest that never shows.
      let card: View;
      if (!on) card = { tone: "success", title: I.wokeTitle, blocks: [{ kind: "text", text: I.woke(result.resumed) }] };
      else if (result.paused > 0) card = { tone: "island", title: I.restedTitle, blocks: [{ kind: "text", text: I.rested(result.paused) }] };
      else card = { tone: "neutral", title: I.nothingToRestTitle, blocks: [{ kind: "text", text: I.nothingToRest }] };
      await show(i, { ...card, rows: backRow() });
    },

    async is_name(i, ctx, [projectId, state]) {
      requireStudent(ctx);
      const on = state === "on";
      const result = await ctx.api.call<{ project_name_visible: boolean }>(
        "shift_quest_island_optin",
        ctx.userId,
        projectId,
        on
      );
      // Shown, waiting for every teammate to agree, or hidden.
      let card: View;
      if (!on) card = { title: I.nameHiddenTitle, blocks: [{ kind: "text", text: I.nameHidden }] };
      else if (result.project_name_visible) card = { title: I.nameShown };
      else card = { title: I.nameWaitingTitle, blocks: [{ kind: "text", text: I.nameWaiting }] };
      await show(i, { tone: "success", ...card, rows: backRow() });
    },

    async is_work(i, ctx) {
      requireStudent(ctx);
      const quests = await ctx.api.call<Quest[]>("shift_quest_my_quests", ctx.userId, false);
      if (!quests.length) {
        // Nothing open: the next useful thing is sending a milestone.
        await show(i, {
          tone: "island",
          title: I.workTitle,
          blocks: [{ kind: "text", text: I.workEmpty }],
          rows: buttonRows([button(cid("is_ms"), I.btnMilestone, ButtonStyle.Success), button(cid("is_view"), I.btnBack)]),
        });
        return;
      }
      const lines = quests
        .slice(0, WORK_SHOWN)
        .map((q) => `- **${safe(q.title, 80)}** · ${STATE[q.state] ?? q.state}${q.latest_review?.feedback && q.state === "clarification" ? " 💬" : ""}`);
      const rest = quests.length - WORK_SHOWN;
      const blocks: Block[] = [{ kind: "text", text: lines.join("\n") }];
      if (rest > 0) blocks.push({ kind: "subtext", text: I.more(rest) });
      await show(i, {
        tone: "island",
        title: I.workTitle,
        blocks,
        rows: [
          selectRow(
            cid("q"),
            T.statusPick,
            quests.map((q) => ({ label: q.title, value: q.id, description: STATE[q.state] ?? q.state }))
          ),
          ...backRow(),
        ],
      });
    },
  },
};
