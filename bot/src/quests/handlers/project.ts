/**
 * Projects, teammates (by consent) and the practical ownership checklist.
 * Every screen is one card: what it is, the few facts that matter, buttons.
 */
import type { ButtonBuilder, ModalBuilder } from "discord.js";

import { requireStudent, type Ctx } from "../context";
import { OWNERSHIP_ICON, OWNERSHIP_ITEM, OWNERSHIP_STATE, ROUTE, STATE, T, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { I, stageBar } from "../island/copy";
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
  type Block,
  type Field,
  type Replyable,
  type Row,
  type View,
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

/** Quests listed on /project view; the rest are counted. */
const QUESTS_SHOWN = 5;
/** Projects and invites listed on /project list; the rest are counted. */
const PROJECTS_SHOWN = 8;
/** Checklist items that count as done: shown it works, or explained why it does not apply. */
const OWNED = new Set(["demonstrated", "not_applicable"]);

function currentProject(ctx: Ctx): string {
  if (!ctx.session.current_project_id) throw new GateError(T.projectNone);
  return ctx.session.current_project_id;
}

/** "🏝️ กลับเกาะ": the island is home for every project screen. */
function backButton(): ButtonBuilder {
  return button(cid("is_view"), I.btnBack);
}

/** One line of student text: no line breaks, so it can never start a heading or a list. */
function oneLine(text: string | null | undefined, max: number): string {
  return safe(text?.replace(/\s+/g, " ").trim(), max);
}

function ownershipCount(view: ProjectView): { bar: string; done: number; total: number } {
  const total = view.ownership.length;
  const done = view.ownership.filter((o) => OWNED.has(o.state)).length;
  return { bar: stageBar(done, total), done, total };
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

/** The project card: route, ambition, who is in, the quests, and how far the checklist is. */
export function projectCard(projectId: string, view: ProjectView): View {
  const members = view.members.map((m) => `${safe(m.name, 60)}${m.status === "invited" ? T.projectPending : ""}`).join(" · ");
  const quests = view.quests
    .slice(0, QUESTS_SHOWN)
    .map((q) => `• ${safe(q.title, 80)} (${safe(q.owner, 40)}): ${STATE[q.state] ?? q.state}`);
  const rest = view.quests.length - QUESTS_SHOWN;
  const own = ownershipCount(view);
  const blocks: Block[] = [{ kind: "subtext", text: ROUTE[view.route] ?? view.route }];
  if (view.ambition?.trim()) blocks.push({ kind: "text", text: `> ${oneLine(view.ambition, 200)}` });
  blocks.push(
    { kind: "text", text: T.projectTeam(members) },
    { kind: "divider" },
    { kind: "text", text: [T.projectQuests, ...(quests.length ? quests : [T.projectNoQuests])].join("\n") }
  );
  if (rest > 0) blocks.push({ kind: "subtext", text: I.more(rest) });
  blocks.push({ kind: "divider" }, { kind: "text", text: T.projectOwnership(own.bar, own.done, own.total) });
  return {
    tone: "island",
    title: `🌳 ${safe(view.name, 80)}`,
    blocks,
    rows: buttonRows([button(cid("own_view", projectId), T.btnChecklist, ButtonStyle.Primary), backButton()]),
  };
}

/**
 * The ownership checklist as one compact card: one icon per item (✅ ⬜ 🆘 ➖),
 * the student's own note under it, the key and the safety line as fine print.
 */
export function ownershipCard(projectId: string, view: ProjectView): View {
  const own = ownershipCount(view);
  const items: string[] = [];
  for (const o of view.ownership) {
    items.push(`${OWNERSHIP_ICON[o.state] ?? OWNERSHIP_ICON.not_checked} ${OWNERSHIP_ITEM[o.item]?.label ?? o.item}`);
    if (o.note?.trim()) items.push(`-# ${oneLine(o.note, 100)}`);
  }
  const legend = Object.entries(OWNERSHIP_STATE)
    .map(([state, label]) => `${OWNERSHIP_ICON[state]} ${label}`)
    .join(" · ");
  const rows: Row[] = [];
  // A select needs at least one option.
  if (view.ownership.length) {
    rows.push(
      selectRow(
        cid("own_pick", projectId),
        T.ownershipPick,
        view.ownership.map((o) => ({
          label: `${OWNERSHIP_ICON[o.state] ?? OWNERSHIP_ICON.not_checked} ${OWNERSHIP_ITEM[o.item]?.label ?? o.item}`,
          value: o.item,
          description: OWNERSHIP_ITEM[o.item]?.hint ?? OWNERSHIP_STATE[o.state],
        }))
      )
    );
  }
  rows.push(...buttonRows([backButton()]));
  return {
    tone: "island",
    title: T.ownershipTitle,
    blocks: [
      { kind: "text", text: T.ownershipOf(view.name, own.bar, own.done, own.total) },
      { kind: "subtext", text: T.ownershipWhy },
      { kind: "text", text: items.join("\n") },
      { kind: "divider", line: false },
      { kind: "subtext", text: `${legend}\n${T.ownershipFine}` },
    ],
    rows,
  };
}

async function ownershipView(i: Replyable, ctx: Ctx, projectId: string, replace: boolean): Promise<void> {
  const view = await ctx.api.call<ProjectView>("shift_quest_project_view", ctx.userId, projectId);
  await show(i, ownershipCard(projectId, view), { replace });
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
        await show(i, {
          tone: "island",
          title: T.projectListTitle,
          blocks: [{ kind: "text", text: T.projectEmpty }],
          rows: buttonRows([button(cid("proj_new"), T.btnNewProject, ButtonStyle.Success), backButton()]),
        });
        return;
      }
      const lines = projects.slice(0, PROJECTS_SHOWN).map((p) => {
        const route = ROUTE[p.route] ?? p.route;
        return p.status === "invited"
          ? `📨 **${safe(p.name, 80)}** · ${route} · ${T.projectInviteFrom(p.inviter)}`
          : `🌳 **${safe(p.name, 80)}** · ${route}${p.is_current ? ` · ${T.projectCurrent}` : ""}`;
      });
      const rest = projects.length - PROJECTS_SHOWN;
      const active = projects.filter((p) => p.status === "active");
      const invites = projects.filter((p) => p.status === "invited").slice(0, 2);
      const rows: Row[] = [];
      if (active.length > 1) {
        rows.push(selectRow(cid("proj_pick"), T.projectPick, active.map((p) => ({ label: p.name, value: p.id, default: p.is_current }))));
      }
      // One row per invite, so each answer sits next to the project it is for.
      for (const p of invites) {
        rows.push(
          ...buttonRows([
            button(cid("invite", p.id, "y"), `${T.btnAccept}: ${p.name.slice(0, 40)}`, ButtonStyle.Success),
            button(cid("invite", p.id, "n"), T.btnDecline),
          ])
        );
      }
      rows.push(...buttonRows([backButton()]));
      const blocks: Block[] = [{ kind: "text", text: lines.join("\n") }];
      if (rest > 0) blocks.push({ kind: "subtext", text: I.more(rest) });
      await show(i, { tone: "island", title: T.projectListTitle, blocks, rows });
    },

    async "project invite"(i, ctx) {
      requireStudent(ctx);
      const user = i.options.getUser("user", true);
      await ctx.api.call("shift_quest_project_invite", ctx.userId, currentProject(ctx), user.id);
      await show(i, {
        tone: "success",
        title: T.inviteSent,
        blocks: [{ kind: "text", text: T.projectInvited(`<@${user.id}>`) }],
        rows: buttonRows([backButton()]),
      });
    },

    async "project view"(i, ctx) {
      requireStudent(ctx);
      const projectId = currentProject(ctx);
      const view = await ctx.api.call<ProjectView>("shift_quest_project_view", ctx.userId, projectId);
      await show(i, projectCard(projectId, view));
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
        tone: "warn",
        title: T.projectLeaveConfirm(view.name),
        blocks: [{ kind: "subtext", text: T.projectLeaveKeeps }],
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
      await show(i, {
        tone: "success",
        title: T.projectCreatedTitle,
        blocks: [
          { kind: "text", text: T.projectCreated(name ?? "") },
          { kind: "subtext", text: T.projectInviteHint },
        ],
        rows: buttonRows([backButton()]),
      });
    },

    async proj_pick(i, ctx, args) {
      requireStudent(ctx);
      const projectId = picked(i, args);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_select", ctx.userId, projectId);
      await show(i, { tone: "success", title: T.projectSwitched, rows: buttonRows([backButton()]) }, { replace: true });
    },

    async proj_leave(i, ctx, [projectId]) {
      requireStudent(ctx);
      if (!isUuid(projectId)) return;
      await ctx.api.call("shift_quest_project_leave", ctx.userId, projectId);
      await show(i, { tone: "neutral", title: T.projectLeft, rows: buttonRows([backButton()]) }, { replace: true });
    },

    /** Opens the checklist in place: from the project card, an item, or the saved card. */
    async own_view(i, ctx, [projectId]) {
      requireStudent(ctx);
      if (!isUuid(projectId)) return;
      await ownershipView(i, ctx, projectId, true);
    },

    async own_pick(i, ctx, [projectId]) {
      requireStudent(ctx);
      const item = i.isStringSelectMenu() ? i.values[0] : undefined;
      if (!isUuid(projectId) || !item || !OWNERSHIP_ITEM[item]) return;
      const meta = OWNERSHIP_ITEM[item];
      await show(
        i,
        {
          tone: "island",
          title: `🔑 ${meta.label}`,
          blocks: [{ kind: "text", text: meta.hint }],
          rows: [
            ...buttonRows(
              Object.entries(OWNERSHIP_STATE).map(([state, label]) =>
                button(
                  cid("own_set", projectId, item, state),
                  `${OWNERSHIP_ICON[state]} ${label}`,
                  state === "needs_help" ? ButtonStyle.Primary : ButtonStyle.Secondary
                )
              )
            ),
            ...buttonRows([button(cid("own_view", projectId), T.btnChecklist)]),
          ],
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
        await show(i, {
          tone: "success",
          title: T.ownershipSaved,
          blocks: result.help_request_id ? [{ kind: "text", text: T.ownershipHelp }] : [],
          // A help request's status is listed in the inbox.
          rows: buttonRows([
            button(cid("own_view", projectId), T.btnChecklist),
            ...(result.help_request_id ? [button(cid("inbox"), T.btnInbox)] : []),
            backButton(),
          ]),
        });
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
