/**
 * Free-form drafting from the whole visible thread.
 *
 * The script ladder in `scripts.ts` answers "what rung is this lead on"; it
 * cannot answer "she just asked whether her sister can join too". This module
 * hands the model the actual conversation and asks for replies to the last
 * inbound message, inside the same voice and the same commercial guardrails.
 *
 * It is additive: the deterministic playbook chips stay exactly as they are,
 * and a failure here returns an empty list rather than breaking /advise.
 */

import { completeQwenChat } from "@/lib/dm-leads/qwen-client";
import type { FieldCoverage } from "@/lib/dm-leads/playbook";

export interface ThreadMessage {
  direction: "inbound" | "outbound";
  body: string;
  sent_at: string;
}

export interface ThreadAdviceRequest {
  messages: ThreadMessage[];
  bucketLabel: string;
  coverageOffer: string;
  coverage: FieldCoverage;
  rung: number;
  lead: {
    displayName?: string | null;
    username?: string | null;
    gradeLevel?: string | null;
    interests?: string[];
  };
  timeoutMs?: number;
  /**
   * `dm_conversations.origin`. Radar-origin threads (students who asked for a
   * Career Radar link) are never drafted for (spec 5.6).
   */
  origin?: string | null;
}

export interface ThreadDraft {
  id: string;
  label: string;
  body: string;
}

/** Hard caps so one enormous thread cannot blow the context or the bill. */
const MAX_MESSAGES = 40;
const MAX_BODY_CHARS = 600;
const MAX_DRAFTS = 3;

const SYSTEM_PROMPT = `คุณคือพี่บุญ (PassionSeed) กำลังคุยกับน้องม.ปลายใน DM ของ IG เป็นภาษาไทย

งาน: อ่านบทสนทนาทั้งหมด แล้วเสนอข้อความถัดไปที่พี่ควรส่ง 2-3 แบบ ที่ตอบสิ่งที่น้องเพิ่งพูดจริงๆ

กติกา:
- ภาษาไทย น้ำเสียงพี่ชายที่เป็นกันเอง ใช้ครับ
- สั้น อ่านบนมือถือได้ ปกติ 1-4 ประโยค ห้ามเขียนเรียงความ
- ตอบสิ่งที่น้องถามล่าสุดก่อนเสมอ อย่าเปลี่ยนเรื่องหนีคำถาม
- อย่าถามซ้ำสิ่งที่น้องบอกไปแล้วในแชท
- ห้ามแต่งวันเริ่มค่าย เดดไลน์ ราคา จำนวนที่ หรือลิงก์ที่ไม่มีในแชท ถ้ายังไม่รู้ให้บอกว่าเดี๋ยวเช็คให้
- ห้ามลดราคา ห้ามสัญญาผลลัพธ์การสอบติด
- ถ้ายังไม่รู้ชั้นปีหรือสายของน้อง ให้ถามก่อนขาย
- ห้ามใช้เครื่องหมาย em dash

ตอบเป็น JSON เท่านั้น รูปแบบ:
{"drafts":[{"label":"ป้ายสั้นๆ 2-4 คำ","body":"ข้อความที่จะส่ง"}]}`;

function trimThread(messages: ThreadMessage[]): ThreadMessage[] {
  return messages.slice(-MAX_MESSAGES).map((message) => ({
    ...message,
    body: message.body.slice(0, MAX_BODY_CHARS),
  }));
}

function renderThread(messages: ThreadMessage[]): string {
  return trimThread(messages)
    .map((message) => `${message.direction === "inbound" ? "น้อง" : "พี่"}: ${message.body}`)
    .join("\n");
}

function buildUserPrompt(request: ThreadAdviceRequest): string {
  const facts = [
    request.lead.displayName ? `ชื่อ: ${request.lead.displayName}` : null,
    request.lead.username ? `ig: @${request.lead.username}` : null,
    request.lead.gradeLevel ? `ชั้น: ${request.lead.gradeLevel}` : null,
    request.lead.interests?.length ? `สนใจ: ${request.lead.interests.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    `สถานะตอนนี้: ${request.bucketLabel}`,
    `ข้อเสนอที่เหมาะ: ${request.coverageOffer}`,
    `ขั้นบันไดขายตอนนี้: ${request.rung}`,
    facts ? `ข้อมูลน้องที่เรามี: ${facts}` : "ข้อมูลน้อง: ยังไม่รู้อะไรเลยนอกจากในแชท",
    "",
    "บทสนทนา (เก่าไปใหม่):",
    renderThread(request.messages),
  ].join("\n");
}

/**
 * Pulls the drafts array out of the model's reply. The model is asked for raw
 * JSON but wraps it in a fence often enough that we strip one if present.
 */
export function parseDrafts(raw: string): ThreadDraft[] {
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return [];
  }

  const drafts = (parsed as { drafts?: unknown }).drafts;
  if (!Array.isArray(drafts)) return [];

  return drafts
    .filter((d): d is { label?: unknown; body?: unknown } => Boolean(d) && typeof d === "object")
    .map((d, index) => ({
      id: `ai-${index + 1}`,
      label: typeof d.label === "string" && d.label.trim() ? d.label.trim().slice(0, 40) : `AI ${index + 1}`,
      body: typeof d.body === "string" ? d.body.trim() : "",
    }))
    .filter((d) => d.body.length > 0 && d.body.length <= 900)
    .slice(0, MAX_DRAFTS);
}

/**
 * Drafts replies from the thread. Never throws: the tray must still render
 * its deterministic chips when the model is down.
 */
export async function draftFromThread(request: ThreadAdviceRequest): Promise<ThreadDraft[]> {
  if (request.origin === "radar") return [];
  if (!request.messages.some((m) => m.direction === "inbound")) return [];

  try {
    const raw = await completeQwenChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(request) },
      ],
      maxTokens: 700,
      temperature: 0.5,
      timeoutMs: request.timeoutMs ?? 20_000,
    });
    return parseDrafts(raw);
  } catch (error) {
    console.warn("[thread-advisor] draft failed:", error);
    return [];
  }
}
