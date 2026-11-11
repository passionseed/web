/**
 * Projects, teammates (by consent) and the practical ownership checklist.
 */
import type { ModalBuilder } from "discord.js";

import { requireStudent, type Ctx } from "../context";
import { OWNERSHIP_ITEM, OWNERSHIP_STATE, ROUTE, STATE, T, safe } from "../copy";
import { cid, isUuid } from "../ids";
import {
  ButtonStyle,
  GateError,
  button,
  buttonRows,
  modal,
  selectRow,
  selectValues,
  show,
  textValue,
  type Field,
  type Replyable,
  type Row,
} from "../ui";
import { picked, type HandlerSet } from "./types";

interface ProjectSummary {
  id: string;
  name: string;
  route: string;
  status: "active" | "invited";
  is_current: boolean;
  inviter: string | null;
}

interface ProjectView {
  id: string;
  name: string;
  route: string;
  ambition: string | null;
  members: { name: string | null; status: string }[];
  quests: { title: string; state: string; owner: string | null }[];
  ownership: { item: string; state: string; note: string | null; mentor_held: boolean; continuation_path: string | null }[];
}

function currentProject(ctx: Ctx): string {
  if (!ctx.session.current_project_id) throw new GateError(T.projectNone);
  return ctx.session.current_project_id;
}

export function newProjectModal(): ModalBuilder {
  return modal(cid("proj_new"), T.projectNewTitle, [
    { kind: "text", id: "name", label: T.projectName, required: true, max: 80 },
    {
      kind: "select",
      id: "route",
      label: T.projectRoute,
      options: Object.entries(ROUTE).map(([value, label]) => ({ label, value })),
    },
    { kind: "text", id: "ambition", label: T.projectAmbition, long: true, max: 500 },
  ]);
}

async function ownershipView(i: Replyable, ctx: Ctx, projectId: string, replace: boolean): Promise<void> {
  const view = await ctx.api.call<ProjectView>("shift_quest_project_view", ctx.userId, projectId);
  const lines = [`**${safe(view.name, 80)}**`, T.ownershipIntro, ""];
  for (const o of view.ownership) {
    const meta = OWNERSHIP_ITEM[o.item];
    lines.push(`• **${meta.label}**: ${OWNERSHIP_STATE[o.state] ?? o.state}${o.note ? ` (${safe(o.note, 120)})` : ""}`);
    lines.push(`  ${meta.hint}`);
  }
  await show(
    i,
    {
      content: lines.join("\n"),
      rows: [
        selectRow(
          cid("own_pick", projectId),
          T.ownershipPick,
          view.ownership.map((o) => ({ label: OWNERSHIP_ITEM[o.item].label, value: o.item, description: OWNERSHIP_STATE[o.state] }))
        ),
      ],
    },
    { replace }
  );
}

export const project: HandlerSet = {
  commands: {
    async "project new"(i, ctx) {
      requireStudent(ctx);
      await i.showModal(newProjectModal());
    },

    async "project list"(i, ctx) {
      requireStudent(ctx);
      const projects = await ctx.api.call<ProjectSummary[]>("shift_quest_project_list", ctx.userId);
      if (!projects.length) {
        await show(i, { content: T.projectNone });
        return;
      }
      const lines = projects.map(
        (p) =>
          `• **${safe(p.name, 80)}** (${ROUTE[p.route] ?? p.route})${p.is_current ? " ⭐ ปัจจุบัน" : ""}${
            p.status === "invited" ? ` คำชวนจาก ${safe(p.inviter, 60)}` : ""
          }`
      );
      const active = projects.filter((p) => p.status === "active");
      const invites = projects.filter((p) => p.status === "invited").slice(0, 2);
      const rows: Row[] = [];
      if (active.length > 1) {
        rows.push(selectRow(cid("proj_pick"), T.projectPick, active.map((p) => ({ label: p.name, value: p.id, default: p.is_current }))));
      }
      rows.push(
        ...buttonRows(
          invites.flatMap((p) => [
            button(cid("invite", p.id, "y"), `${T.btnAccept}: ${p.name.slice(0, 40)}`, ButtonStyle.Success),
            button(cid("invite", p.id, "n"), T.btnDecline),
          ])
        )
      );
      await show(i, { content: lines.join("\n"), rows });
    },

    async "project invite"(i, ctx) {
      requireStudent(ctx);
      const user = i.options.getUser("user", true);
      await ctx.api.call("shift_quest_project_invite", ctx.userId, currentProject(ctx), user.id);
      await show(i, { content: T.projectInvited(`<@${user.id}>`) });
    },

    async "project view"(i, ctx) {
      requireStudent(ctx);
      const view = await ctx.api.call<ProjectView>("shift_quest_project_view", ctx.userId, currentProject(ctx));
      const lines = [
        `**${safe(view.name, 80)}** (${ROUTE[view.route] ?? view.route})`,
        view.ambition ? safe(view.ambition, 400) : "",
        "",
        `**ทีม**: ${view.members.map((m) => `${safe(m.name, 60)}${m.status === "invited" ? " (รอตอบรับ)" : ""}`).join(", ")}`,
        "",
        "**เควสต์**",
        ...(view.quests.length
          ? view.quests.slice(0, 15).map((q) => `• ${safe(q.title, 80)} (${safe(q.owner, 40)}): ${STATE[q.state] ?? q.state}`)
          : ["ยังไม่มี"]),
        "",
        `**ความเป็นเจ้าของ**: ${view.ownership.filter((o) => o.state === "demonstrated" || o.state === "not_applicable").length}/${view.ownership.length} ข้อ (ดู /project ownership)`,
      ];
      await show(i, { content: lines.filter((l, n) => l !== "" || n > 1).join("\n") });
    },

    async "project ownership"(i, ctx) {
      requireStudent(ctx);
      await ownershipView(i, ctx, currentProject(ctx), false);
    },

    async "project leave"(i, ctx) {
      requireStudent(ctx);
      const projectId = currentProject(ctx);
      const view = await ctx.api.call<ProjectView>("shift_quest_project_view", ctx.userId, projectId);
      await show(i, {
        content: T.projectLeaveConfirm(view.name),
        rows: buttonRows([button(cid("proj_leave", projectId), T.btnLeave, ButtonStyle.Danger), button(cid("noop"), T.btnCancel)]),
      });
    },
  },

  actions: {
    async proj_new(i, ctx) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) {
        if (i.isButton()) await i.showModal(newProjectModal());
        return;
      }
      const name = textValue(i, "name");
      await ctx.api.call("shift_quest_project_create", ctx.userId, name, selectValues(i, "route")[0], textValue(i, "ambition"));
      await show(i, { content: T.projectCreated(name ?? "") });
    },

    async proj_pick(i, ctx, args) {
      requireStudent(ctx);
      const projectId = picked(i, args);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_select", ctx.userId, projectId);
      await show(i, { content: T.projectSwitched }, { replace: true });
    },

    async proj_leave(i, ctx, [projectId]) {
      requireStudent(ctx);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_leave", ctx.userId, projectId);
      await show(i, { content: T.projectLeft }, { replace: true });
    },

    async own_pick(i, ctx, [projectId]) {
      requireStudent(ctx);
      const item = i.isStringSelectMenu() ? i.values[0] : undefined;
      if (!isUuid(projectId) || !item || !OWNERSHIP_ITEM[item]) return;
      const meta = OWNERSHIP_ITEM[item];
      await show(
        i,
        {
          content: `**${meta.label}**\n${meta.hint}`,
          rows: buttonRows(
            Object.entries(OWNERSHIP_STATE).map(([state, label]) =>
              button(cid("own_set", projectId, item, state), label, state === "needs_help" ? ButtonStyle.Primary : ButtonStyle.Secondary)
            )
          ),
        },
        { replace: true }
      );
    },

    async own_set(i, ctx, [projectId, item, state]) {
      requireStudent(ctx);
      if (!isUuid(projectId) || !OWNERSHIP_ITEM[item] || !OWNERSHIP_STATE[state]) return;

      if (i.isModalSubmit()) {
        const mentorHeld = selectValues(i, "mentor_held")[0] === "yes";
        const result = await ctx.api.call<{ help_request_id: string | null }>(
          "shift_quest_ownership_set",
          ctx.userId,
          projectId,
          item,
          state,
          textValue(i, "note"),
          mentorHeld,
          textValue(i, "continuation")
        );
        await show(i, { content: result.help_request_id ? T.ownershipHelp : T.ownershipSaved });
        return;
      }
      if (state === "not_checked") {
        await ctx.api.call("shift_quest_ownership_set", ctx.userId, projectId, item, state, null, false, null);
        await ownershipView(i, ctx, projectId, true);
        return;
      }
      if (!i.isButton()) return;
      const fields: Field[] = [
        {
          kind: "text",
          id: "note",
          label: T.ownershipNote,
          long: true,
          required: state === "not_applicable",
          max: 1000,
          placeholder: OWNERSHIP_ITEM[item].hint,
        },
      ];
      if (item === "access" && state === "demonstrated") {
        fields.push(
          {
            kind: "select",
            id: "mentor_held",
            label: T.ownershipMentorHeld,
            options: [
              { label: "ไม่ใช่ เป็นบัญชีของทีมเอง", value: "no", default: true },
              { label: "ใช่ อยู่ในบัญชีของพี่เลี้ยง", value: "yes" },
            ],
          },
          { kind: "text", id: "continuation", label: T.ownershipContinuation, long: true, max: 1000 }
        );
      }
      await i.showModal(modal(cid("own_set", projectId, item, state), T.ownershipUpdateTitle, fields));
    },
  },
};
