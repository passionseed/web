/**
 * Mentors: review queue, decisions, proposal agreements, the help queue and
 * award retries. The database refuses conflicts of interest and stale
 * revisions; these handlers only present them.
 */
import { requireStaff } from "../context";
import { STATE, T, awardReason, bkkDate, clip, safe } from "../copy";
import { cid, isUuid } from "../ids";
import { ButtonStyle, button, buttonRows, modal, selectRow, show, textFile, textValue } from "../ui";
import { picked, type HandlerSet } from "./types";

const REVIEWERS = ["reviewer", "admin"];

interface Queue {
  submissions: { submission_id: string; title: string; revision: number; student: string | null; created_at: string; appeal: boolean }[];
  proposals: { instance_id: string; title: string; student: string | null; created_at: string }[];
  help_open: number;
}

interface ReviewDetail {
  submission_id: string;
  revision: number;
  status: string;
  is_latest: boolean;
  appeal: boolean;
  appeal_reason: string | null;
  instance_state: string;
  student: string | null;
  title: string;
  why: string | null;
  goal: string;
  criteria: string;
  template_evidence: string | null;
  proposed: boolean;
  repeatable: boolean;
  prior_approved: number;
  evidence: string | null;
  reflection: string | null;
  artifact_url: string | null;
  reward: { amount: number; team_allocation: string | null } | null;
  reward_agreed: boolean;
  awards_live: boolean;
  contributions: { name: string | null; contribution: string | null; status: string }[];
  history: { revision: number; outcome: string; feedback: string | null; created_at: string }[];
}

interface HelpItem {
  id: string;
  student: string | null;
  summary: string;
  visibility: string;
  source: string;
  status: string;
  claimed_by: string | null;
  project: string | null;
  created_at: string;
}

const OUTCOME: Record<string, string> = {
  approved: "อนุมัติ",
  clarification: "ขอข้อมูลเพิ่ม",
  declined: "ยังไม่ผ่าน",
};

const RUBRIC =
  "เกณฑ์: ทำสิ่งที่ตกลงไว้ อธิบายได้น่าเชื่อ มีการเรียนรู้หรือการช่วยคนอื่น และมีก้าวต่อไปที่ใช้ได้ ดูกระบวนการและคำอธิบาย ไม่ใช่ความอลังการของผลลัพธ์ ผลลบที่สะท้อนคิดดีก็ผ่านได้";

type Contribution = ReviewDetail["contributions"][number];
type DecideAward = { issued: boolean; amount?: number; reason?: string } | null;

function contributionText(c: Contribution): string {
  switch (c.status) {
    case "confirmed":
      return c.contribution ?? "(ไม่ได้ระบุ)";
    case "pending":
      return "(ยังไม่ยืนยัน)";
    default:
      return "(บอกว่าไม่ได้มีส่วน)";
  }
}

function rewardLine(d: ReviewDetail): string {
  if (!d.awards_live) return "🪙 ระบบเหรียญปิดอยู่: อนุมัติได้ แต่จะไม่มีเหรียญ";
  if (d.reward && (!d.proposed || d.reward_agreed)) {
    const team = d.contributions.length > 1 ? ` (งานทีม: ${d.reward.team_allocation ?? "ยังไม่มีกติกาแบ่ง"})` : "";
    return `🪙 อนุมัติแล้วได้ ${d.reward.amount} เหรียญ${team}`;
  }
  return "🪙 เควสต์นี้ไม่มีเหรียญ";
}

function awardNote(award: DecideAward): string {
  if (!award) return "";
  if (award.issued) return ` ออกเหรียญแล้ว (${award.amount ?? ""})`;
  if (award.reason) return ` ไม่มีเหรียญ: ${awardReason(award.reason)}`;
  return "";
}

export const review: HandlerSet = {
  commands: {
    async "review queue"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      const queue = await ctx.api.call<Queue>("shift_quest_review_queue", ctx.userId);
      const lines = [
        `**งานรอรีวิว** ${queue.submissions.length} · **เควสต์ที่เสนอรอตกลง** ${queue.proposals.length} · **คำขอความช่วยเหลือ** ${queue.help_open} (/review help)`,
        "งานของตัวเอง ของทีมที่คุณอยู่ หรือที่คุณปฏิเสธไปแล้วจะไม่แสดง",
      ];
      const rows = [];
      if (queue.submissions.length) {
        rows.push(
          selectRow(
            cid("rv_sub"),
            "เลือกงานที่จะรีวิว",
            queue.submissions.map((s) => ({
              label: `${s.appeal ? "[อุทธรณ์] " : ""}${s.title}`,
              value: s.submission_id,
              description: `${s.student ?? ""} · ครั้งที่ ${s.revision} · ${bkkDate(s.created_at)}`,
            }))
          )
        );
      }
      if (queue.proposals.length) {
        rows.push(
          selectRow(
            cid("rv_prop"),
            "เลือกเควสต์ที่เสนอ",
            queue.proposals.map((p) => ({ label: p.title, value: p.instance_id, description: `${p.student ?? ""} · ${bkkDate(p.created_at)}` }))
          )
        );
      }
      await show(i, { content: lines.join("\n"), rows });
    },

    async "review help"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      const items = await ctx.api.call<HelpItem[]>("shift_quest_help_queue", ctx.userId);
      if (!items.length) {
        await show(i, { content: "ไม่มีคำขอที่เปิดอยู่" });
        return;
      }
      const lines = items.slice(0, 15).map(
        (h) =>
          `• ${bkkDate(h.created_at)} **${safe(h.student, 60)}**${h.project ? ` (${safe(h.project, 40)})` : ""}: ${safe(h.summary, 160)}${
            h.claimed_by ? ` · รับโดย ${safe(h.claimed_by, 40)}` : ""
          }`
      );
      await show(i, {
        content: lines.join("\n"),
        rows: [
          selectRow(
            cid("rv_help"),
            "เลือกคำขอ",
            items.map((h) => ({ label: `${h.student ?? ""}: ${h.summary}`, value: h.id, description: h.status }))
          ),
        ],
      });
    },

    async "review awards"(i, ctx) {
      requireStaff(ctx, REVIEWERS);
      const items = await ctx.api.call<{ instance_id: string; title: string; student: string | null; reason: string }[]>(
        "shift_quest_awards_pending",
        ctx.userId
      );
      if (!items.length) {
        await show(i, { content: "ไม่มีเหรียญที่ค้างอยู่" });
        return;
      }
      await show(i, {
        content: items.map((x) => `• **${safe(x.title, 80)}** (${safe(x.student, 60)}): ${awardReason(x.reason)}`).join("\n"),
        rows: [
          selectRow(
            cid("rv_award"),
            "ลองออกเหรียญอีกครั้ง",
            items.map((x) => ({ label: x.title, value: x.instance_id, description: x.student ?? undefined }))
          ),
        ],
      });
    },
  },

  actions: {
    async rv_sub(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const d = await ctx.api.call<ReviewDetail>("shift_quest_review_get", ctx.userId, id);
      const full = [
        `${d.appeal ? "[อุทธรณ์] " : ""}${d.title} (ครั้งที่ ${d.revision}) โดย ${d.student ?? ""}`,
        d.why ? `ทำไมสำคัญ: ${d.why}` : "",
        `เป้าหมาย: ${d.goal}`,
        `หลักฐานที่ตกลง: ${d.criteria}`,
        d.template_evidence && d.template_evidence !== d.criteria ? `หลักฐานตามแม่แบบ: ${d.template_evidence}` : "",
        "",
        `สิ่งที่ทำ: ${d.evidence ?? ""}`,
        `สะท้อนคิด: ${d.reflection ?? ""}`,
        d.artifact_url ? `ลิงก์: ${d.artifact_url}` : "",
        ...d.contributions.map((c) => `ส่วนของ ${c.name ?? ""}: ${contributionText(c)}`),
        d.appeal_reason ? `เหตุผลอุทธรณ์: ${d.appeal_reason}` : "",
        ...d.history.map((h) => `ก่อนหน้า ครั้งที่ ${h.revision}: ${OUTCOME[h.outcome] ?? h.outcome}${h.feedback ? `: ${h.feedback}` : ""}`),
      ]
        .filter((l) => l !== "")
        .join("\n");

      const repeat = d.repeatable && d.prior_approved > 0;
      const summary = clip(
        [
          safe(full, 1300),
          "",
          rewardLine(d),
          repeat ? `ℹ️ นักเรียนเคยผ่านเควสต์นี้ ${d.prior_approved} ครั้ง ให้เหรียญซ้ำเฉพาะเมื่อขอบเขตและสิ่งที่เรียนรู้ต่างจากเดิม` : "",
          RUBRIC,
        ]
          .filter(Boolean)
          .join("\n"),
        1900
      );
      const buttons = [
        button(cid("rv_dec", d.submission_id, "approved", "0"), "อนุมัติ", ButtonStyle.Success),
        ...(repeat ? [button(cid("rv_dec", d.submission_id, "approved", "1"), "อนุมัติ + ต่างจากเดิม", ButtonStyle.Success)] : []),
        button(cid("rv_dec", d.submission_id, "clarification", "0"), "ขอข้อมูลเพิ่ม", ButtonStyle.Primary),
        button(cid("rv_dec", d.submission_id, "declined", "0"), "ยังไม่ผ่าน", ButtonStyle.Danger),
      ];
      // Long evidence goes in a private file so nothing is cut off.
      await show(
        i,
        {
          content: summary,
          rows: d.is_latest ? buttonRows(buttons) : [],
          files: full.length > 1300 ? [textFile("submission.txt", full)] : [],
        },
        { replace: true }
      );
    },

    async rv_dec(i, ctx, [submissionId, outcome, distinct]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(submissionId) || !OUTCOME[outcome]) return;
      if (i.isModalSubmit()) {
        const result = await ctx.api.call<{ already: boolean; award: DecideAward }>(
          "shift_quest_review_decide",
          ctx.userId,
          submissionId,
          outcome,
          textValue(i, "feedback"),
          distinct === "1"
        );
        const saved = result.already ? "รีวิวนี้บันทึกไปแล้ว" : `บันทึกแล้ว: ${OUTCOME[outcome]}`;
        await show(i, { content: `${saved}${awardNote(result.award)}` });
        return;
      }
      if (!i.isButton()) return;
      await i.showModal(
        modal(cid("rv_dec", submissionId, outcome, distinct), OUTCOME[outcome], [
          {
            kind: "text",
            id: "feedback",
            label: outcome === "approved" ? "ความเห็นถึงนักเรียน (ไม่บังคับ)" : "บอกสิ่งที่ควรทำต่อให้ชัด",
            description:
              outcome === "approved"
                ? "ชมสิ่งที่ทำได้จริงแบบเจาะจง"
                : "เป็นมิตร เจาะจง และบอกก้าวถัดไปหนึ่งอย่าง นักเรียนอุทธรณ์ได้",
            long: true,
            required: outcome !== "approved",
            max: 2000,
          },
        ])
      );
    },

    async rv_prop(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const p = await ctx.api.call<{
        title: string;
        why: string | null;
        goal: string;
        criteria: string;
        next_step: string;
        student: string | null;
        state: string;
        rules: { key: string; amount: number }[];
      }>("shift_quest_proposal_get", ctx.userId, id);
      await show(
        i,
        {
          content: [
            `**${safe(p.title, 80)}** โดย ${safe(p.student, 60)} (${STATE[p.state] ?? p.state})`,
            p.why ? `ทำไมสำคัญ: ${safe(p.why, 400)}` : "",
            `เป้าหมาย: ${safe(p.goal, 400)}`,
            `หลักฐาน: ${safe(p.criteria, 400)}`,
            `ก้าวถัดไป: ${safe(p.next_step, 200)}`,
            "",
            "ตกลงขอบเขตและหลักฐานกับนักเรียนในห้องกลุ่มก่อน แล้วเลือกกติกาเหรียญที่ใช้ (หรือไม่มีเหรียญ) เควสต์ที่เสนอเองต้องเข้าถึงการยอมรับได้เทียบเท่าเควสต์ตัวอย่าง",
          ]
            .filter(Boolean)
            .join("\n"),
          rows: [
            selectRow(cid("rv_agree", id), "ตกลงด้วยกติกา", [
              { label: "ตกลงขอบเขต ไม่มีเหรียญ", value: "-" },
              ...p.rules.map((r) => ({ label: `${r.key} (${r.amount} เหรียญ)`, value: r.key })),
            ]),
          ],
        },
        { replace: true }
      );
    },

    async rv_agree(i, ctx, [instanceId]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(instanceId) || !i.isStringSelectMenu()) return;
      const key = i.values[0] === "-" ? null : i.values[0];
      await ctx.api.call("shift_quest_proposal_agree", ctx.userId, instanceId, key, null);
      await show(i, { content: "บันทึกข้อตกลงแล้ว นักเรียนจะเห็นใน /inbox" }, { replace: true });
    },

    async rv_help(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const items = await ctx.api.call<HelpItem[]>("shift_quest_help_queue", ctx.userId);
      const h = items.find((x) => x.id === id);
      if (!h) return;
      await show(
        i,
        {
          content: [
            `**${safe(h.student, 60)}**${h.project ? ` (${safe(h.project, 40)})` : ""} · ${h.visibility === "community" ? "ห้อง help" : "ทีมพี่เลี้ยง"}`,
            safe(h.summary, 1000),
            "",
            "ตอบในห้องกลุ่มเท่านั้น ห้ามย้ายไปคุยส่วนตัวกับนักเรียน",
          ].join("\n"),
          rows: buttonRows([
            button(cid("rv_hact", id, "claim"), "รับเรื่อง", ButtonStyle.Primary, h.status === "claimed"),
            button(cid("rv_hact", id, "resolve"), "ปิดเรื่อง", ButtonStyle.Success),
            button(cid("rv_hact", id, "release"), "ปล่อยเรื่อง", ButtonStyle.Secondary, h.status !== "claimed"),
          ]),
        },
        { replace: true }
      );
    },

    async rv_hact(i, ctx, [helpId, action]) {
      requireStaff(ctx, REVIEWERS);
      if (!isUuid(helpId) || !["claim", "resolve", "release"].includes(action)) return;
      if (action === "resolve" && i.isButton()) {
        await i.showModal(
          modal(cid("rv_hact", helpId, action), "ปิดเรื่อง", [
            { kind: "text", id: "note", label: "สรุปสั้นๆ ถึงนักเรียน (ไม่บังคับ)", long: true, max: 1000 },
          ])
        );
        return;
      }
      await ctx.api.call("shift_quest_help_update", ctx.userId, helpId, action, i.isModalSubmit() ? textValue(i, "note") : null);
      await show(i, { content: T.done }, { replace: !i.isModalSubmit() });
    },

    async rv_award(i, ctx, args) {
      requireStaff(ctx, REVIEWERS);
      const id = picked(i, args);
      if (!isUuid(id)) return;
      const result = await ctx.api.call<{ issued: boolean; reason?: string }>("shift_quest_issue_award", ctx.userId, id);
      await show(i, { content: result.issued ? "ออกเหรียญแล้ว" : `ยังออกไม่ได้: ${awardReason(result.reason)}` }, { replace: true });
    },
  },
};
