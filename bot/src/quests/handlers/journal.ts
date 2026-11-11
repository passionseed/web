/**
 * Progress journal, coworking intentions, help requests and opt-in sharing.
 */
import type { ModalBuilder } from "discord.js";

import { requireStudent, type Ctx } from "../context";
import { T, bkkDate, safe } from "../copy";
import { cid, isUuid } from "../ids";
import {
  ButtonStyle,
  button,
  buttonRows,
  modal,
  selectRow,
  selectValues,
  show,
  textValue,
  type Field,
  type Replyable,
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

function progressFields(entry?: Entry): Field[] {
  return [
    { kind: "text", id: "changed", label: T.changed, long: true, required: true, max: 1000, value: entry?.changed },
    { kind: "text", id: "learned", label: T.learned, long: true, max: 1000, value: entry?.learned },
    { kind: "text", id: "next", label: T.nextStepShort, max: 500, value: entry?.next_step },
    { kind: "text", id: "blocker", label: T.blocker, long: true, max: 1000, value: entry?.blocker },
    { kind: "text", id: "link", label: T.artifact, max: 500, value: entry?.artifact_url },
  ];
}

function renderEntry(e: Entry, withAuthor: boolean): string {
  return [
    `**${bkkDate(e.created_at)}**${withAuthor ? ` ${safe(e.author, 60)}` : ""}${e.visibility === "team" ? " 👥" : " 🔒"}`,
    `อะไรเปลี่ยนไป: ${safe(e.changed, 300)}`,
    e.learned ? `ได้เรียนรู้: ${safe(e.learned, 200)}` : "",
    e.next_step ? `ต่อไป: ${safe(e.next_step, 150)}` : "",
    e.blocker && (e.own || withAuthor) ? `ติด: ${safe(e.blocker, 200)}` : "",
    e.artifact_url ? safe(e.artifact_url, 200) : "",
  ]
    .filter(Boolean)
    .join("\n");
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

async function sharePreview(i: Replyable, ctx: Ctx, shareId: string): Promise<void> {
  const share = await ctx.api.call<Share>("shift_quest_share_get", ctx.userId, shareId);
  const note = share.kind === "recognition" ? "\n(จะโพสต์เมื่อเพื่อนกดตอบรับเท่านั้น)" : "";
  await show(i, {
    content: `${T.sharePreview}\n\n${shareBody(share)}${note}`,
    rows: buttonRows([
      button(cid("share_go", shareId), T.btnPost, ButtonStyle.Primary, !ctx.session.settings.sharing),
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
        await show(i, { content: T.projectNone });
        return;
      }
      const entries = await ctx.api.call<Entry[]>("shift_quest_progress_list", ctx.userId, projectId, 8);
      if (!entries.length) {
        await show(i, { content: team ? T.progressTeamEmpty : T.progressEmpty });
        return;
      }
      await show(i, { content: entries.map((e) => renderEntry(e, team)).join("\n\n") });
    },

    async "progress edit"(i, ctx) {
      requireStudent(ctx);
      const entries = await ctx.api.call<Entry[]>("shift_quest_progress_list", ctx.userId, null, 25);
      if (!entries.length) {
        await show(i, { content: T.progressEmpty });
        return;
      }
      await show(i, {
        content: T.progressPick,
        rows: [
          selectRow(
            cid("prog_pick"),
            T.progressPick,
            entries.map((e) => ({ label: `${bkkDate(e.created_at)} ${e.changed}`, value: e.id }))
          ),
        ],
      });
    },

    async "work start"(i, ctx) {
      requireStudent(ctx);
      const intention = i.options.getString("intention", true);
      await ctx.api.call("shift_quest_work_start", ctx.userId, intention);
      if (i.options.getBoolean("share")) {
        const shareId = await ctx.api.call<string>("shift_quest_share_create", ctx.userId, "intention", intention, null, null);
        await show(i, { content: T.workStarted });
        await sharePreview(i, ctx, shareId);
        return;
      }
      await show(i, { content: T.workStarted });
    },

    async "work end"(i, ctx) {
      requireStudent(ctx);
      const result = await ctx.api.call<{ intention: string }>(
        "shift_quest_work_end",
        ctx.userId,
        i.options.getString("reflection")
      );
      await show(i, { content: T.workEnded(result.intention) });
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
      await show(i, { content: T.progressSaved, rows: buttonRows(buttons) });
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
          content: next === "team" ? T.progressShared : T.progressPrivate,
          rows: buttonRows([
            next === "team"
              ? button(cid("prog_vis", id, "private"), T.btnMakePrivate)
              : button(cid("prog_vis", id, "team"), T.btnShareTeam),
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
      await show(i, { content: T.updated });
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
      await show(i, { content: T.helpSent(visibility === "community") });
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
      await show(i, { content: status === "awaiting_peer" ? T.shareAwaitingPeer : T.sharePosted }, { replace: true });
    },

    async share_no(i, ctx, [shareId]) {
      requireStudent(ctx);
      if (!isUuid(shareId)) return;
      await ctx.api.call("shift_quest_share_cancel", ctx.userId, shareId);
      await show(i, { content: T.cancelled }, { replace: true });
    },
  },
};
