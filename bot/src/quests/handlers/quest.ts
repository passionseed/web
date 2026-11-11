/**
 * Quests: browse the library, choose or propose, manage without penalty,
 * submit with a preview, appeal.
 */
import type { ButtonBuilder, ModalBuilder } from "discord.js";

import { QuestError, type Quest, type Template } from "../api";
import { requireStudent, type Ctx } from "../context";
import { STATE, T, awardReason, bkkDate, safe } from "../copy";
import { dropDraft, getDraft, putDraft } from "../drafts";
import { cid, isUuid } from "../ids";
import {
  ButtonStyle,
  button,
  buttonRows,
  modal,
  parseDate,
  selectRow,
  show,
  textValue,
  userValues,
  type Replyable,
} from "../ui";
import { celebrateModal, helpModal } from "./journal";
import { picked, type ActionInteraction, type HandlerSet } from "./types";

interface SubmitDraft {
  instanceId: string;
  version: number;
  title: string;
  hasProject: boolean;
  evidence: string | null;
  reflection: string | null;
  artifact: string | null;
  part: string | null;
  teammates: string[];
}

export function proposeModal(): ModalBuilder {
  return modal(cid("propose"), T.proposeTitle, [
    { kind: "text", id: "title", label: T.proposeName, required: true, max: 80 },
    { kind: "text", id: "why", label: T.proposeWhy, long: true, max: 1000 },
    { kind: "text", id: "goal", label: T.goal, long: true, required: true, max: 1000 },
    { kind: "text", id: "criteria", label: T.criteria, long: true, required: true, max: 1000 },
    { kind: "text", id: "next", label: T.nextStep, required: true, max: 500 },
  ]);
}

export async function browse(i: Replyable, ctx: Ctx, replace = false): Promise<void> {
  const templates = await ctx.api.call<Template[]>("shift_quest_templates", ctx.userId);
  const lines = [T.browseIntro, ""];
  for (const t of templates) lines.push(`• **${safe(t.title, 80)}**: ${safe(t.purpose, 140)}`);
  await show(
    i,
    {
      content: lines.join("\n"),
      rows: templates.length
        ? [selectRow(cid("tpl"), T.browsePick, templates.map((t) => ({ label: t.title, value: t.id, description: t.purpose })))]
        : [],
    },
    { replace }
  );
}

function rewardText(reward: Quest["reward"] | Template["reward"], awardsLive: boolean): string {
  if (!awardsLive || !reward) return T.rewardNone;
  return T.rewardLine(reward.amount, reward.cap);
}

async function findQuest(ctx: Ctx, id: string): Promise<Quest | undefined> {
  const quests = await ctx.api.call<Quest[]>("shift_quest_my_quests", ctx.userId, true);
  return quests.find((q) => q.id === id);
}

function questButtons(q: Quest): ButtonBuilder[] {
  const a = (action: string, label: string, style = ButtonStyle.Secondary) =>
    button(cid("qa", action, q.id, q.version), label, style);
  switch (q.state) {
    case "active":
    case "clarification":
      return [
        a("submit", T.btnSubmit, ButtonStyle.Primary),
        a("resize", T.btnResize),
        a("help", T.btnHelp),
        a("pause", T.btnPause),
        a("archive", T.btnArchive),
      ];
    case "paused":
      return [a("resume", T.btnResume, ButtonStyle.Primary), a("resize", T.btnResize), a("archive", T.btnArchive)];
    case "submitted":
      return [a("submit", `${T.btnSubmit} (ฉบับใหม่)`), a("withdraw", T.btnWithdraw)];
    case "declined":
      return [a("appeal", T.btnAppeal, ButtonStyle.Primary), a("archive", T.btnArchive)];
    case "approved":
      return [a("celebrate", T.btnCelebrate, ButtonStyle.Success)];
    default:
      return [];
  }
}

export async function questDetail(i: Replyable, ctx: Ctx, id: string, replace: boolean): Promise<void> {
  const q = await findQuest(ctx, id);
  if (!q) {
    await show(i, { content: T.statusEmpty }, { replace });
    return;
  }
  const lines = [
    `**${safe(q.title, 80)}**: ${STATE[q.state] ?? q.state}${q.proposed ? " (เสนอเอง)" : ""}`,
    `เป้าหมาย: ${safe(q.goal, 400)}`,
    `ก้าวถัดไป: ${safe(q.next_step, 200)}`,
    `หลักฐานที่ตกลง: ${safe(q.criteria, 400)}`,
  ];
  if (q.review_date) lines.push(`วันรีวิวที่ตั้งไว้: ${bkkDate(q.review_date)}`);
  if (q.overdue) lines.push(`⏳ ${T.overdue}`);
  if (q.proposed && !q.reward_agreed) lines.push("ยังไม่ได้ตกลงเรื่องเหรียญกับทีมพี่เลี้ยง (ไม่บังคับ)");
  lines.push(`🪙 ${rewardText(q.reward, ctx.session.settings.awards)}`);
  if (q.latest_review?.feedback && q.state !== "approved") {
    lines.push("", `💬 ความเห็นล่าสุด: ${safe(q.latest_review.feedback, 600)}`);
  }
  if (q.state === "approved" && q.award_status === "not_issued" && q.award_note) {
    lines.push(`ยังไม่มีเหรียญ: ${awardReason(q.award_note)}`);
  }
  await show(i, { content: lines.join("\n"), rows: buttonRows(questButtons(q)) }, { replace });
}

function submitModal(q: Quest): ModalBuilder {
  return modal(cid("qa", "submit", q.id, q.version), T.submitTitle, [
    { kind: "text", id: "evidence", label: T.evidence, description: T.evidenceHint, long: true, required: true, max: 2000 },
    {
      kind: "text",
      id: "reflection",
      label: T.reflection,
      description: q.reflection_prompt ?? undefined,
      long: true,
      required: true,
      max: 2000,
    },
    { kind: "text", id: "artifact", label: T.artifact, max: 500, placeholder: "https://" },
    ...(q.project_id
      ? ([
          { kind: "text", id: "part", label: T.myPart, long: true, max: 1000 },
          { kind: "users", id: "teammates", label: T.teammates, max: 5 },
        ] as const)
      : []),
  ]);
}

async function questAction(i: ActionInteraction, ctx: Ctx, action: string, id: string, version: number): Promise<void> {
  switch (action) {
    case "pause":
    case "resume":
    case "archive": {
      await ctx.api.call("shift_quest_set_state", ctx.userId, id, version, action);
      await questDetail(i, ctx, id, true);
      return;
    }
    case "withdraw": {
      await ctx.api.call("shift_quest_withdraw", ctx.userId, id, version);
      await questDetail(i, ctx, id, true);
      return;
    }
    case "submit": {
      if (i.isModalSubmit()) {
        const q = await findQuest(ctx, id);
        if (!q) return;
        const draft: SubmitDraft = {
          instanceId: id,
          version,
          title: q.title,
          hasProject: Boolean(q.project_id),
          evidence: textValue(i, "evidence"),
          reflection: textValue(i, "reflection"),
          artifact: textValue(i, "artifact"),
          part: textValue(i, "part"),
          teammates: userValues(i, "teammates").filter((u) => u !== ctx.userId),
        };
        const key = putDraft(ctx.userId, draft);
        const preview = [
          `**${T.submitPreview}** ${safe(q.title, 80)}`,
          `${T.evidence}: ${safe(draft.evidence, 700)}`,
          `${T.reflection}: ${safe(draft.reflection, 500)}`,
          draft.artifact ? `${T.artifact}: ${safe(draft.artifact, 200)}` : "",
          draft.part ? `${T.myPart}: ${safe(draft.part, 300)}` : "",
          draft.teammates.length ? `${T.teammates}: ${draft.teammates.map((u) => `<@${u}>`).join(" ")}` : "",
          "",
          `**${T.visibility}**`,
        ].filter(Boolean);
        await show(i, {
          content: preview.join("\n"),
          rows: buttonRows([
            button(cid("sub_go", key, "reviewers"), T.visReviewers, ButtonStyle.Primary),
            button(cid("sub_go", key, "team"), T.visTeam, ButtonStyle.Primary, !draft.hasProject),
            button(cid("sub_no", key), T.btnCancel),
          ]),
        });
        return;
      }
      if (!i.isButton()) return;
      const q = await findQuest(ctx, id);
      if (q) await i.showModal(submitModal(q));
      return;
    }
    case "resize": {
      if (i.isModalSubmit()) {
        const dateText = textValue(i, "date");
        const clearDate = dateText === "-";
        await ctx.api.call(
          "shift_quest_update",
          ctx.userId,
          id,
          version,
          textValue(i, "goal"),
          textValue(i, "next"),
          textValue(i, "criteria"),
          clearDate ? null : parseDate(dateText),
          clearDate
        );
        await show(i, { content: T.updated });
        return;
      }
      if (!i.isButton()) return;
      const q = await findQuest(ctx, id);
      if (!q) return;
      await i.showModal(
        modal(cid("qa", "resize", id, version), T.resizeTitle, [
          { kind: "text", id: "goal", label: T.goal, long: true, required: true, max: 1000, value: q.goal },
          { kind: "text", id: "next", label: T.nextStep, required: true, max: 500, value: q.next_step },
          { kind: "text", id: "criteria", label: T.criteria, long: true, required: true, max: 1000, value: q.criteria },
          { kind: "text", id: "date", label: T.reviewDate, description: T.clearDate, max: 10, value: q.review_date },
        ])
      );
      return;
    }
    case "appeal": {
      if (i.isModalSubmit()) {
        await ctx.api.call("shift_quest_appeal", ctx.userId, id, textValue(i, "reason"));
        await show(i, { content: T.appealed });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("qa", "appeal", id, version), T.appealTitle, [
          { kind: "text", id: "reason", label: T.appealReason, long: true, required: true, max: 1000 },
        ])
      );
      return;
    }
    case "help": {
      if (!i.isButton()) return;
      await i.showModal(helpModal(id));
      return;
    }
    case "celebrate": {
      if (!i.isButton()) return;
      await i.showModal(celebrateModal(id, null));
      return;
    }
  }
}

export const quest: HandlerSet = {
  commands: {
    async "quest browse"(i, ctx) {
      requireStudent(ctx);
      await browse(i, ctx);
    },

    async "quest propose"(i, ctx) {
      requireStudent(ctx);
      await i.showModal(proposeModal());
    },

    async "quest status"(i, ctx) {
      requireStudent(ctx);
      const quests = await ctx.api.call<Quest[]>("shift_quest_my_quests", ctx.userId, i.options.getBoolean("all") ?? false);
      if (!quests.length) {
        await show(i, { content: T.statusEmpty });
        return;
      }
      const lines = quests.map(
        (q) => `• **${safe(q.title, 80)}**: ${STATE[q.state] ?? q.state}${q.overdue ? " ⏳" : ""}${q.latest_review && q.state === "clarification" ? " 💬" : ""}`
      );
      await show(i, {
        content: lines.join("\n"),
        rows: [
          selectRow(
            cid("q"),
            T.statusPick,
            quests.map((q) => ({ label: q.title, value: q.id, description: STATE[q.state] ?? q.state }))
          ),
        ],
      });
    },
  },

  actions: {
    async browse(i, ctx) {
      requireStudent(ctx);
      await browse(i, ctx, true);
    },

    async propose(i, ctx) {
      requireStudent(ctx);
      if (!i.isModalSubmit()) {
        if (i.isButton()) await i.showModal(proposeModal());
        return;
      }
      await ctx.api.call(
        "shift_quest_propose",
        ctx.userId,
        textValue(i, "title"),
        textValue(i, "why"),
        textValue(i, "goal"),
        textValue(i, "criteria"),
        textValue(i, "next")
      );
      await show(i, { content: T.proposed });
    },

    async tpl(i, ctx, args) {
      requireStudent(ctx);
      const id = picked(i, args);
      const templates = await ctx.api.call<Template[]>("shift_quest_templates", ctx.userId);
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      const lines = [
        `## ${safe(t.title, 80)}`,
        safe(t.purpose, 300),
        "",
        `**ทำได้หลายแบบ**\n${safe(t.routes, 400)}`,
        `**ตัวอย่าง**\n${safe(t.examples, 400)}`,
        `**หลักฐาน**\n${safe(t.evidence_criteria, 400)}`,
        `**คำถามสะท้อนคิด**\n${safe(t.reflection_prompt, 200)}`,
        `**ความช่วยเหลือ**\n${safe(t.support_options, 300)}`,
        "",
        `🪙 ${rewardText(t.reward, ctx.session.settings.awards)}${t.repeatable ? " · ทำซ้ำได้ถ้าเรียนรู้ต่างจากเดิม" : ""}`,
      ];
      if (t.reward && ctx.session.settings.awards) lines.push(`เงื่อนไข: ${safe(t.reward.eligibility, 300)}`);
      if (t.taken) lines.push(`ℹ️ ${T.alreadyTaken}`);
      await show(
        i,
        {
          content: lines.join("\n"),
          rows: buttonRows([button(cid("tpl_choose", t.id), T.btnChoose, ButtonStyle.Primary, t.taken && !t.repeatable), button(cid("browse"), "← กลับ")]),
        },
        { replace: true }
      );
    },

    async tpl_choose(i, ctx, [templateId]) {
      requireStudent(ctx);
      if (!isUuid(templateId)) return;
      const templates = await ctx.api.call<Template[]>("shift_quest_templates", ctx.userId);
      const t = templates.find((x) => x.id === templateId);
      // A milestone quest grows a tree only on a project: without one it would
      // be approved and grow nothing (review finding 14), so a plot comes first.
      if (t?.milestone && !ctx.session.current_project_id) throw new QuestError("no_project");
      if (i.isModalSubmit()) {
        await ctx.api.call(
          "shift_quest_choose",
          ctx.userId,
          templateId,
          textValue(i, "goal"),
          textValue(i, "next"),
          textValue(i, "criteria"),
          parseDate(textValue(i, "date"))
        );
        await show(i, { content: T.chosen(t?.title ?? "") });
        return;
      }
      if (!i.isButton() || !t) return;
      await i.showModal(
        modal(cid("tpl_choose", t.id), T.chooseTitle, [
          { kind: "text", id: "goal", label: T.goal, description: t.purpose, long: true, required: true, max: 1000 },
          { kind: "text", id: "next", label: T.nextStep, required: true, max: 500 },
          { kind: "text", id: "criteria", label: T.criteria, long: true, required: true, max: 1000, value: t.evidence_criteria },
          { kind: "text", id: "date", label: T.reviewDate, max: 10, placeholder: "2026-12-01" },
        ])
      );
    },

    async q(i, ctx, args) {
      requireStudent(ctx);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      await questDetail(i, ctx, id, true);
    },

    async qa(i, ctx, [action, id, version]) {
      requireStudent(ctx);
      if (!isUuid(id) || !/^\d+$/.test(version ?? "")) return;
      await questAction(i, ctx, action, id, Number(version));
    },

    async sub_go(i, ctx, [key, visibility]) {
      requireStudent(ctx);
      const draft = getDraft<SubmitDraft>(key, ctx.userId);
      if (!draft) {
        await show(i, { content: "ตัวอย่างนี้หมดอายุแล้ว กดส่งงานใหม่อีกครั้งได้เลย" }, { replace: true });
        return;
      }
      const result = await ctx.api.call<{ revision: number }>(
        "shift_quest_submit",
        ctx.userId,
        draft.instanceId,
        draft.version,
        draft.evidence,
        draft.reflection,
        draft.artifact,
        visibility === "team" ? "team" : "reviewers",
        draft.part,
        draft.teammates
      );
      dropDraft(key);
      await show(i, { content: T.submitted(result.revision) }, { replace: true });
    },

    async sub_no(i, _ctx, [key]) {
      dropDraft(key);
      await show(i, { content: T.cancelled }, { replace: true });
    },
  },
};
