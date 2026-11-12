/**
 * Quests: browse the library, choose or propose, manage without penalty,
 * submit with a preview, appeal. Every screen is one card (see ../view):
 * what it is, the few facts that matter now, then the buttons.
 */
import type { ButtonBuilder, ModalBuilder } from "discord.js";

import { QuestError, type Quest, type Template } from "../api";
import { requireStudent, type Ctx } from "../context";
import { STATE, T, awardReason, bkkDate, safe } from "../copy";
import { dropDraft, getDraft, putDraft } from "../drafts";
import { cid, isUuid } from "../ids";
import { I } from "../island/copy";
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
  type Block,
  type Replyable,
  type Row,
  type Tone,
  type View,
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

/** Items listed in a card's body; the select below it still holds every one. */
const LIST_SHOWN = 5;

/** A quest's state at a glance, in place of a bullet. */
const STATE_ICON: Record<string, string> = {
  active: "🔨",
  paused: "⏸️",
  submitted: "⏳",
  clarification: "💬",
  approved: "✅",
  declined: "↩️",
  appealed: "⚖️",
  archived: "🗄️",
};

/** Back to the island (an existing action). */
const backButton = () => button(cid("is_view"), I.btnBack);
/** The island's quest list (an existing action), where every quest can be opened. */
const workButton = () => button(cid("is_work"), I.btnWork);

/** Each line of a text as a Discord quote, so a reviewer's words read as theirs. */
function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
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
  // Names only: each purpose is in the select below, one tap away.
  const names = templates.slice(0, LIST_SHOWN).map((t) => `• **${safe(t.title, 80)}**`);
  const blocks: Block[] = [{ kind: "text", text: [T.browseIntro, ...names].join("\n") }];
  if (templates.length > LIST_SHOWN) blocks.push({ kind: "subtext", text: I.more(templates.length - LIST_SHOWN) });
  await show(
    i,
    {
      tone: "island",
      title: T.browseTitle,
      blocks,
      rows: [
        ...(templates.length
          ? [selectRow(cid("tpl"), T.browsePick, templates.map((t) => ({ label: t.title, value: t.id, description: t.purpose })))]
          : []),
        ...buttonRows([backButton()]),
      ],
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

async function findTemplate(ctx: Ctx, id: string | undefined): Promise<Template | undefined> {
  const templates = await ctx.api.call<Template[]>("shift_quest_templates", ctx.userId);
  return templates.find((x) => x.id === id);
}

function chooseButton(t: Template): ButtonBuilder {
  return button(cid("tpl_choose", t.id), T.btnChoose, ButtonStyle.Primary, t.taken && !t.repeatable);
}

/** The quest list: state icons, the first few by name, and a select holding all of them. */
export function questListView(quests: Quest[]): View {
  if (!quests.length) {
    return { tone: "island", title: I.btnWork, blocks: [{ kind: "text", text: T.statusEmpty }], rows: buttonRows([backButton()]) };
  }
  const lines = quests
    .slice(0, LIST_SHOWN)
    .map((q) => `${STATE_ICON[q.state] ?? "•"} **${safe(q.title, 80)}** · ${STATE[q.state] ?? q.state}${q.overdue ? " · ⏰" : ""}`);
  const blocks: Block[] = [{ kind: "text", text: lines.join("\n") }];
  if (quests.length > LIST_SHOWN) blocks.push({ kind: "subtext", text: I.more(quests.length - LIST_SHOWN) });
  return {
    tone: "island",
    title: I.btnWork,
    blocks,
    rows: [
      selectRow(
        cid("q"),
        T.statusPick,
        quests.map((q) => ({ label: q.title, value: q.id, description: STATE[q.state] ?? q.state }))
      ),
      ...buttonRows([backButton()]),
    ],
  };
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
      return [a("submit", T.btnSubmitAgain), a("withdraw", T.btnWithdraw)];
    case "declined":
      return [a("appeal", T.btnAppeal, ButtonStyle.Primary), a("archive", T.btnArchive)];
    case "approved":
      return [a("celebrate", T.btnCelebrate, ButtonStyle.Success)];
    default:
      return [];
  }
}

/** The main actions on the first row; the quieter ones and the way back below. */
function questRows(q: Quest): Row[] {
  const main = questButtons(q);
  if (main.length <= 3) return buttonRows([...main, backButton()]);
  return [...buttonRows(main.slice(0, 3)), ...buttonRows([...main.slice(3), backButton()])];
}

/** Green when it passed, amber when a reviewer is waiting on the student, island green otherwise. */
function questTone(state: string): Tone {
  if (state === "approved") return "success";
  if (state === "clarification" || state === "declined") return "warn";
  return "island";
}

/** "💬 **กำลังทำ** · เสนอเอง · วันรีวิว 1 ธ.ค." */
function stateLine(q: Quest): string {
  const parts = [`${STATE_ICON[q.state] ?? "•"} **${STATE[q.state] ?? q.state}**`];
  if (q.proposed) parts.push(T.questProposed);
  if (q.review_date) parts.push(T.questReviewOn(bkkDate(q.review_date)));
  return parts.join(" · ");
}

/**
 * One quest: its state, the reviewer's latest words (first when they are the
 * reason for the state), what was agreed, then the coin fine print. notice is
 * the confirmation of the button just pressed (pause, resume, archive, withdraw).
 */
export async function questDetail(i: Replyable, ctx: Ctx, id: string, replace: boolean, notice?: string): Promise<void> {
  const q = await findQuest(ctx, id);
  if (!q) {
    await show(i, questListView([]), { replace });
    return;
  }
  const blocks: Block[] = [];
  if (notice) blocks.push({ kind: "text", text: `✅ ${notice}` });
  blocks.push({ kind: "text", text: stateLine(q) });

  const feedback: Block[] =
    q.latest_review?.feedback && q.state !== "approved"
      ? [{ kind: "text", text: `**${T.questFeedback}**\n${quote(safe(q.latest_review.feedback, 600))}` }]
      : [];
  const waitingOnStudent = q.state === "clarification" || q.state === "declined";
  if (waitingOnStudent) blocks.push(...feedback);
  blocks.push({
    kind: "text",
    text: [
      `**${T.questGoal}** ${safe(q.goal, 400)}`,
      `**${T.questNext}** ${safe(q.next_step, 200)}`,
      `**${T.questCriteria}** ${safe(q.criteria, 400)}`,
      q.overdue ? `⏰ ${T.overdue}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  if (!waitingOnStudent) blocks.push(...feedback);

  const fine = [`🪙 ${rewardText(q.reward, ctx.session.settings.awards)}`];
  if (q.proposed && !q.reward_agreed) fine.push(T.rewardNotAgreed);
  if (q.state === "approved" && q.award_status === "not_issued" && q.award_note) fine.push(T.noAwardYet(awardReason(q.award_note)));
  blocks.push({ kind: "divider", line: false }, { kind: "subtext", text: fine.join("\n") });

  await show(i, { tone: questTone(q.state), title: `📋 ${safe(q.title, 80)}`, blocks, rows: questRows(q) }, { replace });
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

/** What the student typed, before anything is written, with the who-sees-it choice as the buttons. */
function submitPreview(title: string, key: string, draft: SubmitDraft): View {
  const lines = [
    `**${safe(title, 80)}** · ${T.notSentYet}`,
    `**${T.tplEvidence}** ${safe(draft.evidence, 700)}`,
    `**${T.reflection}** ${safe(draft.reflection, 500)}`,
    draft.artifact ? `**${T.previewLink}** ${safe(draft.artifact, 200)}` : "",
    draft.part ? `**${T.previewPart}** ${safe(draft.part, 300)}` : "",
    draft.teammates.length ? `**${T.previewTeammates}** ${draft.teammates.map((u) => `<@${u}>`).join(" ")}` : "",
  ].filter(Boolean);
  const blocks: Block[] = [{ kind: "text", text: lines.join("\n") }];
  if (draft.teammates.length) blocks.push({ kind: "subtext", text: T.previewTeammatesNote });
  blocks.push({ kind: "divider" }, { kind: "text", text: `**${T.visibility}**` });
  return {
    tone: "neutral",
    title: T.submitPreview,
    blocks,
    rows: buttonRows([
      button(cid("sub_go", key, "reviewers"), T.visReviewers, ButtonStyle.Primary),
      button(cid("sub_go", key, "team"), T.visTeam, ButtonStyle.Primary, !draft.hasProject),
      button(cid("sub_no", key), T.btnCancel),
    ]),
  };
}

/** Confirmation of a form sent about one quest: open it again, or go back to the island. */
function questToast(title: string, id: string, text?: string): View {
  return {
    tone: "success",
    title,
    blocks: text ? [{ kind: "text", text }] : [],
    rows: buttonRows([button(cid("q", id), T.btnViewQuest), backButton()]),
  };
}

const NOTICE: Record<string, string> = {
  pause: T.paused,
  resume: T.resumed,
  archive: T.archived,
  withdraw: T.withdrawn,
};

async function questAction(i: ActionInteraction, ctx: Ctx, action: string, id: string, version: number): Promise<void> {
  switch (action) {
    case "pause":
    case "resume":
    case "archive": {
      await ctx.api.call("shift_quest_set_state", ctx.userId, id, version, action);
      await questDetail(i, ctx, id, true, NOTICE[action]);
      return;
    }
    case "withdraw": {
      await ctx.api.call("shift_quest_withdraw", ctx.userId, id, version);
      await questDetail(i, ctx, id, true, NOTICE.withdraw);
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
        await show(i, submitPreview(q.title, key, draft));
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
        await show(i, questToast(`✅ ${T.updated}`, id));
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
        await show(i, questToast(T.appealedTitle, id, T.appealed));
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
      await show(i, questListView(quests));
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
      await show(i, {
        tone: "success",
        title: T.proposedTitle,
        blocks: [
          { kind: "text", text: T.proposed },
          { kind: "subtext", text: T.proposedCoins },
        ],
        rows: buttonRows([workButton(), backButton()]),
      });
    },

    /** One template: what it is for, what counts as done, coins. Routes and examples sit behind ℹ️. */
    async tpl(i, ctx, args) {
      requireStudent(ctx);
      const t = await findTemplate(ctx, picked(i, args));
      if (!t) return;
      const awards = ctx.session.settings.awards;
      const facts = [
        safe(t.purpose, 300),
        `**${T.tplEvidence}** ${safe(t.evidence_criteria, 400)}`,
        `🪙 ${rewardText(t.reward, awards)}${t.repeatable ? ` · ${T.tplRepeatable}` : ""}`,
      ];
      if (t.taken) facts.push(`ℹ️ ${T.alreadyTaken}`);
      const blocks: Block[] = [{ kind: "text", text: facts.join("\n") }];
      if (t.reward && awards) blocks.push({ kind: "subtext", text: `${T.tplEligibility}: ${safe(t.reward.eligibility, 300)}` });
      await show(
        i,
        {
          tone: "island",
          title: `📜 ${safe(t.title, 80)}`,
          blocks,
          rows: buttonRows([chooseButton(t), button(cid("tpl_more", t.id), T.btnTplMore), button(cid("browse"), T.btnBack)]),
        },
        { replace: true }
      );
    },

    /** A template's details, read-only: the ways to do it, examples, the reflection question, support. */
    async tpl_more(i, ctx, [templateId]) {
      requireStudent(ctx);
      if (!isUuid(templateId)) return;
      const t = await findTemplate(ctx, templateId);
      if (!t) return;
      const part = (label: string, text: string | null | undefined, max: number) =>
        text?.trim() ? `**${label}**\n${safe(text, max)}` : "";
      const text = [
        part(T.tplRoutes, t.routes, 400),
        part(T.tplExamples, t.examples, 400),
        part(T.tplReflection, t.reflection_prompt, 200),
        part(T.tplSupport, t.support_options, 300),
      ]
        .filter(Boolean)
        .join("\n");
      await show(
        i,
        {
          tone: "island",
          title: `ℹ️ ${safe(t.title, 80)}`,
          blocks: [{ kind: "text", text }],
          rows: buttonRows([chooseButton(t), button(cid("tpl", t.id), T.btnBack)]),
        },
        { replace: true }
      );
    },

    async tpl_choose(i, ctx, [templateId]) {
      requireStudent(ctx);
      if (!isUuid(templateId)) return;
      const t = await findTemplate(ctx, templateId);
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
        const blocks: Block[] = t?.title ? [{ kind: "text", text: `**${safe(t.title, 80)}**` }] : [];
        blocks.push({ kind: "subtext", text: T.chosenNote });
        await show(i, { tone: "success", title: T.chosenTitle, blocks, rows: buttonRows([workButton(), backButton()]) });
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
        await show(
          i,
          { tone: "warn", blocks: [{ kind: "text", text: T.previewExpired }], rows: buttonRows([workButton(), backButton()]) },
          { replace: true }
        );
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
      await show(
        i,
        {
          tone: "success",
          title: T.submittedTitle,
          blocks: [
            { kind: "text", text: T.submitted(result.revision) },
            { kind: "subtext", text: T.submittedNote },
          ],
          rows: buttonRows([backButton()]),
        },
        { replace: true }
      );
    },

    async sub_no(i, _ctx, [key]) {
      dropDraft(key);
      await show(i, { tone: "neutral", blocks: [{ kind: "text", text: T.cancelled }], rows: buttonRows([backButton()]) }, { replace: true });
    },
  },
};
