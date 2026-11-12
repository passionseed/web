/**
 * Progress journal, coworking intentions, help requests and opt-in sharing.
 * Every screen is one card (see ../view); private by default, and nothing is
 * posted until the student has seen the preview and pressed the button.
 */
import type { ModalBuilder } from "discord.js";

import { requireStudent, type Ctx } from "../context";
import { T, bkkDate, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I } from "../island/copy";
import {
  ButtonStyle,
  button,
  buttonRows,
  modal,
  selectRow,
  selectValues,
  show,
  textValue,
  type Block,
  type Field,
  type Replyable,
  type View,
} from "../ui";
import { picked, type HandlerSet } from "./types";

interface Entry {
  id: string;
  author: string | null;
  own: boolean;
  changed: string;
  learned: string | null;
  next_step: string | null;
  blocker: string | null;
  artifact_url: string | null;
  visibility: "private" | "team";
  version: number;
  created_at: string;
}

interface Share {
  id: string;
  kind: string;
  body: string;
  status: string;
  author: string | null;
  peer: string | null;
  title: string | null;
}

/** Entries listed on the journal card; the newest come first. */
const ENTRIES_SHOWN = 5;

/** Back to the island (an existing action). */
const backButton = () => button(cid("is_view"), I.btnBack);

/**
 * The island's private note (an existing action): only with a project, since
 * a note is kept on the current project.
 */
function noteButtons(ctx: Ctx) {
  return ctx.session.current_project_id ? [button(cid("is_note"), I.btnNote)] : [];
}

/** A student's text on one line, escaped and capped: list views stay short. */
function oneLine(text: string | null | undefined, max: number): string {
  return safe(text?.replace(/\s+/g, " ").trim(), max);
}

/** Each line of a text as a Discord quote: the post as it will read. */
function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function progressFields(entry?: Entry): Field[] {
  return [
    { kind: "text", id: "changed", label: T.changed, long: true, required: true, max: 1000, value: entry?.changed },
    { kind: "text", id: "learned", label: T.learned, long: true, max: 1000, value: entry?.learned },
    { kind: "text", id: "next", label: T.nextStepShort, max: 500, value: entry?.next_step },
    { kind: "text", id: "blocker", label: T.blocker, long: true, max: 1000, value: entry?.blocker },
    { kind: "text", id: "link", label: T.artifact, max: 500, value: entry?.artifact_url },
  ];
}

/**
 * One entry in two lines: who sees it, the date and what changed; then the
 * rest as fine print. A blocker shows only to its author, or in the team view.
 */
function entryBlocks(e: Entry, withAuthor: boolean): Block[] {
  const head = `${e.visibility === "team" ? "👥" : "🔒"} **${bkkDate(e.created_at)}**${withAuthor ? ` ${oneLine(e.author, 60)}` : ""}`;
  const extra = [
    e.learned ? `${T.entryLearned}: ${oneLine(e.learned, 100)}` : "",
    e.next_step ? `${T.entryNext}: ${oneLine(e.next_step, 80)}` : "",
    e.blocker && (e.own || withAuthor) ? `${T.entryBlocker}: ${oneLine(e.blocker, 100)}` : "",
    e.artifact_url ? safe(e.artifact_url, 150) : "",
  ].filter(Boolean);
  // Five entries at their longest stay well under Discord's 4000 characters.
  const blocks: Block[] = [{ kind: "text", text: `${head} · ${oneLine(e.changed, 160)}` }];
  if (extra.length) blocks.push({ kind: "subtext", text: extra.join(" · ") });
  return blocks;
}

/** No entries yet: the way to add one (with a project), and the way back. */
function emptyJournal(ctx: Ctx, title: string, text: string): View {
  return { tone: "island", title, blocks: [{ kind: "text", text }], rows: buttonRows([...noteButtons(ctx), backButton()]) };
}

async function ownEntry(ctx: Ctx, id: string): Promise<Entry | undefined> {
  const entries = await ctx.api.call<Entry[]>("shift_quest_progress_list", ctx.userId, null, 25);
  return entries.find((e) => e.id === id);
}

export function helpModal(instanceId: string | null, prefill?: string | null): ModalBuilder {
  return modal(cid("help_new", instanceId), T.helpTitle, [
    { kind: "text", id: "summary", label: T.helpSummary, long: true, required: true, max: 1000, value: prefill },
    {
      kind: "select",
      id: "visibility",
      label: T.helpVisibility,
      options: [
        { label: T.helpCommunity, value: "community", default: true },
        { label: T.helpMentors, value: "mentors" },
      ],
    },
  ]);
}

export function celebrateModal(instanceId: string | null, peerId: string | null): ModalBuilder {
  return modal(cid("celebrate", instanceId, peerId), T.celebrateTitle, [
    {
      kind: "text",
      id: "body",
      label: peerId ? T.recognizeBody : T.celebrateBody,
      long: true,
      required: true,
      max: 1000,
    },
  ]);
}

function shareBody(share: Share): string {
  switch (share.kind) {
    case "recognition":
      return `🙌 ${safe(share.author, 60)} ขอบคุณ ${safe(share.peer, 60)}\n${safe(share.body, 900)}`;
    case "intention":
      return `🔨 ${safe(share.author, 60)} กำลังทำ: ${safe(share.body, 300)}`;
    default:
      return `🎉 ${safe(share.author, 60)}${share.title ? ` ผ่านเควสต์ **${safe(share.title, 80)}**` : ""}\n${safe(share.body, 900)}`;
  }
}

/** The post as it will read, quoted, then why the button may be off. Nothing is posted from here. */
async function sharePreview(i: Replyable, ctx: Ctx, shareId: string): Promise<void> {
  const share = await ctx.api.call<Share>("shift_quest_share_get", ctx.userId, shareId);
  const sharing = ctx.session.settings.sharing;
  const fine = [T.notPostedYet];
  if (share.kind === "recognition") fine.push(T.sharePeerNote);
  if (!sharing) fine.push(T.sharePaused);
  await show(i, {
    tone: "neutral",
    title: T.sharePreview,
    blocks: [
      { kind: "text", text: quote(shareBody(share)) },
      { kind: "subtext", text: fine.join("\n") },
    ],
    rows: buttonRows([
      button(cid("share_go", shareId), T.btnPost, ButtonStyle.Primary, !sharing),
      button(cid("share_no", shareId), T.btnCancel),
    ]),
  });
}

export const journal: HandlerSet = {
  commands: {
    async "progress add"(i, ctx) {
      requireStudent(ctx);
      await i.showModal(modal(cid("prog_add"), T.progressTitle, progressFields()));
    },

    async "progress view"(i, ctx) {
      requireStudent(ctx);
      const team = i.options.getBoolean("team") ?? false;
      const projectId = team ? ctx.session.current_project_id : null;
      if (team && !projectId) {
        await show(i, {
          tone: "island",
          blocks: [{ kind: "text", text: T.projectNone }],
          rows: buttonRows([button(cid("is_claim"), I.btnClaim, ButtonStyle.Success), backButton()]),
        });
        return;
      }
      const title = team ? T.progressTeamTitle : T.progressMineTitle;
      const entries = await ctx.api.call<Entry[]>("shift_quest_progress_list", ctx.userId, projectId, 8);
      if (!entries.length) {
        await show(i, team ? { tone: "island", title, blocks: [{ kind: "text", text: T.progressTeamEmpty }], rows: buttonRows([backButton()]) } : emptyJournal(ctx, title, T.progressEmpty));
        return;
      }
      const blocks = entries.slice(0, ENTRIES_SHOWN).flatMap((e) => entryBlocks(e, team));
      const fine = [entries.length > ENTRIES_SHOWN ? T.progressLatest(ENTRIES_SHOWN) : "", team ? "" : T.progressLegend].filter(Boolean);
      if (fine.length) blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: fine.join(" · ") });
      await show(i, { tone: "island", title, blocks, rows: buttonRows([backButton()]) });
    },

    async "progress edit"(i, ctx) {
      requireStudent(ctx);
      const entries = await ctx.api.call<Entry[]>("shift_quest_progress_list", ctx.userId, null, 25);
      if (!entries.length) {
        await show(i, emptyJournal(ctx, T.progressMineTitle, T.progressEmpty));
        return;
      }
      await show(i, {
        tone: "island",
        title: T.progressEditTitle,
        rows: [
          selectRow(
            cid("prog_pick"),
            T.progressPick,
            entries.map((e) => ({ label: `${bkkDate(e.created_at)} ${e.changed}`, value: e.id }))
          ),
          ...buttonRows([backButton()]),
        ],
      });
    },

    async "work start"(i, ctx) {
      requireStudent(ctx);
      const intention = i.options.getString("intention", true);
      await ctx.api.call("shift_quest_work_start", ctx.userId, intention);
      const started: View = {
        tone: "success",
        title: T.workStartedTitle,
        blocks: [
          { kind: "text", text: `**${oneLine(intention, 120)}**` },
          { kind: "subtext", text: T.workStarted },
        ],
        rows: buttonRows([backButton()]),
      };
      if (i.options.getBoolean("share")) {
        const shareId = await ctx.api.call<string>("shift_quest_share_create", ctx.userId, "intention", intention, null, null);
        await show(i, started);
        await sharePreview(i, ctx, shareId);
        return;
      }
      await show(i, started);
    },

    async "work end"(i, ctx) {
      requireStudent(ctx);
      const result = await ctx.api.call<{ intention: string }>(
        "shift_quest_work_end",
        ctx.userId,
        i.options.getString("reflection")
      );
      const note = noteButtons(ctx);
      const blocks: Block[] = [{ kind: "text", text: `**${oneLine(result.intention, 120)}**` }];
      if (note.length) blocks.push({ kind: "subtext", text: T.workEndedNote });
      await show(i, { tone: "success", title: T.workEndedTitle, blocks, rows: buttonRows([...note, backButton()]) });
    },

    async help(i, ctx) {
      requireStudent(ctx);
      await i.showModal(helpModal(null));
    },

    async celebrate(i, ctx) {
      requireStudent(ctx);
      const peer = i.options.getUser("peer");
      await i.showModal(celebrateModal(null, peer && peer.id !== ctx.userId ? peer.id : null));
    },
  },

  actions: {
    async prog_add(i, ctx) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) return;
      const blocker = textValue(i, "blocker");
      const id = await ctx.api.call<string>(
        "shift_quest_progress_add",
        ctx.userId,
        textValue(i, "changed"),
        textValue(i, "learned"),
        textValue(i, "next"),
        blocker,
        textValue(i, "link"),
        "private",
        null
      );
      const buttons = [button(cid("prog_vis", id, "team"), T.btnShareTeam, ButtonStyle.Secondary, !ctx.session.current_project_id)];
      if (blocker) buttons.push(button(cid("prog_help", id), T.btnSendBlocker, ButtonStyle.Primary));
      await show(i, {
        tone: "success",
        title: T.progressSavedTitle,
        blocks: [{ kind: "text", text: T.progressSaved }],
        rows: buttonRows([...buttons, backButton()]),
      });
    },

    async prog_vis(i, ctx, [id, visibility]) {
      requireStudent(ctx);
      if (!isUuid(id)) return;
      const e = await ownEntry(ctx, id);
      if (!e) return;
      const next = visibility === "team" ? "team" : "private";
      await ctx.api.call(
        "shift_quest_progress_edit",
        ctx.userId,
        e.id,
        e.version,
        e.changed,
        e.learned,
        e.next_step,
        e.blocker,
        e.artifact_url,
        next
      );
      await show(
        i,
        {
          tone: "success",
          title: next === "team" ? T.progressShared : T.progressPrivate,
          rows: buttonRows([
            next === "team"
              ? button(cid("prog_vis", id, "private"), T.btnMakePrivate)
              : button(cid("prog_vis", id, "team"), T.btnShareTeam),
            backButton(),
          ]),
        },
        { replace: true }
      );
    },

    async prog_help(i, ctx, [id]) {
      requireStudent(ctx);
      if (!isUuid(id) || !i.isButton()) return;
      const e = await ownEntry(ctx, id);
      await i.showModal(helpModal(null, e?.blocker));
    },

    async prog_pick(i, ctx, args) {
      requireStudent(ctx);
      const id = picked(i, args);
      if (!isUuid(id) || !i.isStringSelectMenu()) return;
      const e = await ownEntry(ctx, id);
      if (!e) return;
      await i.showModal(modal(cid("prog_edit", e.id, e.version), T.progressTitle, progressFields(e)));
    },

    async prog_edit(i, ctx, [id, version]) {
      requireStudent(ctx);
      if (!isUuid(id) || !i.isModalSubmit()) return;
      const e = await ownEntry(ctx, id);
      if (!e) return;
      await ctx.api.call(
        "shift_quest_progress_edit",
        ctx.userId,
        id,
        Number(version),
        textValue(i, "changed"),
        textValue(i, "learned"),
        textValue(i, "next"),
        textValue(i, "blocker"),
        textValue(i, "link"),
        e.visibility
      );
      await show(i, { tone: "success", title: `✅ ${T.updated}`, rows: buttonRows([backButton()]) });
    },

    async help_new(i, ctx, [instanceId]) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) {
        if (i.isButton()) await i.showModal(helpModal(isUuid(instanceId) ? instanceId : null));
        return;
      }
      const visibility = selectValues(i, "visibility")[0] === "mentors" ? "mentors" : "community";
      await ctx.api.call(
        "shift_quest_help_create",
        ctx.userId,
        textValue(i, "summary"),
        visibility,
        "student",
        isUuid(instanceId) ? instanceId : null
      );
      await show(i, {
        tone: "success",
        title: T.helpSentTitle,
        blocks: [{ kind: "text", text: T.helpSent(visibility === "community") }],
        // Open requests and who picked them up are listed in the inbox.
        rows: buttonRows([button(cid("inbox"), T.btnInbox), backButton()]),
      });
    },

    async celebrate(i, ctx, [instanceId, peerId]) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) return;
      const shareId = await ctx.api.call<string>(
        "shift_quest_share_create",
        ctx.userId,
        peerId ? "recognition" : "celebration",
        textValue(i, "body"),
        isUuid(instanceId) ? instanceId : null,
        peerId || null
      );
      await sharePreview(i, ctx, shareId);
    },

    async share_go(i, ctx, [shareId]) {
      requireStudent(ctx);
      if (!isUuid(shareId)) return;
      const status = await ctx.api.call<string>("shift_quest_share_confirm", ctx.userId, shareId);
      await show(
        i,
        {
          tone: "success",
          blocks: [{ kind: "text", text: `✅ ${status === "awaiting_peer" ? T.shareAwaitingPeer : T.sharePosted}` }],
          rows: buttonRows([backButton()]),
        },
        { replace: true }
      );
    },

    async share_no(i, ctx, [shareId]) {
      requireStudent(ctx);
      if (!isUuid(shareId)) return;
      await ctx.api.call("shift_quest_share_cancel", ctx.userId, shareId);
      await show(i, { tone: "neutral", blocks: [{ kind: "text", text: T.cancelled }], rows: buttonRows([backButton()]) }, { replace: true });
    },
  },
};
