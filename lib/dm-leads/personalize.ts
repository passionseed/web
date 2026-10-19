/**
 * Personalizes every outbound DM template for one lead via the tailnet Qwen
 * model. Templates stay the source of truth: Qwen rewrites voice and fills
 * known facts, then we restore any `[placeholder]` the model dropped.
 *
 * Pure helpers live here so the rewrite rules are unit-tested without a
 * network. The Qwen call is isolated behind `completeQwenChat`.
 */

import { getFieldCoverage, type FieldCoverage } from "@/lib/dm-leads/playbook";
import { completeQwenChat } from "@/lib/dm-leads/qwen-client";
import type { DmConversation, DmMessage } from "@/types/dm-leads";

export type PersonalizeKind =
  | "script"
  | "quick_reply"
  | "button_prompt"
  | "public_comment"
  | "plan_dm"
  | "composed";

export interface PersonalizeLead {
  displayName?: string | null;
  username?: string | null;
  gradeLevel?: string | null;
  interests?: string[];
  stage?: string | null;
  activitiesSummary?: string | null;
  coverage?: FieldCoverage;
  wantsPathlab?: boolean;
  pathlabPayReady?: boolean;
  wantsCommunity?: boolean;
  wantsTalent?: boolean;
  hasHandsOnExperience?: boolean;
  lastInbound?: string | null;
}

export interface PersonalizeRequest {
  template: string;
  lead: PersonalizeLead;
  kind?: PersonalizeKind;
}

const PLACEHOLDER_PATTERN = /\[[^\]\n]+\]/g;
const FENCE_PATTERN = /^```(?:\w+)?\s*([\s\S]*?)\s*```$/;
const QUOTE_PATTERN = /^["“]([\s\S]*)["”]$/;

export function leadFromConversation(
  conversation: Pick<
    DmConversation,
    | "display_name"
    | "username"
    | "grade_level"
    | "interests"
    | "stage"
    | "activities_summary"
    | "wants_pathlab"
    | "pathlab_pay_ready"
    | "wants_community"
    | "wants_talent"
    | "has_hands_on_experience"
  >,
  extras?: { lastInbound?: string | null }
): PersonalizeLead {
  return {
    displayName: conversation.display_name,
    username: conversation.username,
    gradeLevel: conversation.grade_level,
    interests: conversation.interests,
    stage: conversation.stage,
    activitiesSummary: conversation.activities_summary,
    coverage: getFieldCoverage(conversation.interests),
    wantsPathlab: conversation.wants_pathlab,
    pathlabPayReady: conversation.pathlab_pay_ready,
    wantsCommunity: conversation.wants_community,
    wantsTalent: conversation.wants_talent,
    hasHandsOnExperience: conversation.has_hands_on_experience,
    lastInbound: extras?.lastInbound ?? null,
  };
}

export function lastInboundFromMessages(
  messages: Pick<DmMessage, "direction" | "body">[] | undefined
): string | null {
  if (!messages?.length) return null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.direction === "inbound" && message.body?.trim()) return message.body.trim();
  }
  return null;
}

export function extractPlaceholders(body: string): string[] {
  return body.match(PLACEHOLDER_PATTERN) ?? [];
}

export function stripModelWrapper(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  const fence = text.match(FENCE_PATTERN);
  if (fence) text = fence[1].trim();
  const quoted = text.match(QUOTE_PATTERN);
  if (quoted) text = quoted[1].trim();
  return text;
}

/**
 * Keep the playbook's required slots even if the model dropped them.
 * Known facts (name, grade, field) stay filled. Unknown slots like
 * `[วันที่]` are appended so the operator still has to fill them.
 */
export function restorePlaceholders(template: string, rewritten: string): string {
  const required = extractPlaceholders(template);
  if (required.length === 0) return rewritten;

  let next = rewritten;
  for (const slot of required) {
    if (next.includes(slot)) continue;
    next = `${next.trimEnd()} ${slot}`;
  }
  return next.trim();
}

function factLine(label: string, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

export function buildLeadFacts(lead: PersonalizeLead): string {
  const coverageLabel =
    lead.coverage === "covered"
      ? "มี PathLab seed แล้ว — ขาย cohort 299"
      : lead.coverage === "uncovered"
        ? "ยังไม่มี seed — pre-sell ที่ 299 ห้ามบอกว่ายังไม่มีสายนี้แล้วจบ"
        : "ยังไม่รู้สาย — ถามก่อน อย่าปิดการขาย";

  return [
    factLine("ชื่อ", lead.displayName),
    factLine("username", lead.username ? `@${lead.username.replace(/^@+/, "")}` : null),
    factLine("ชั้นปี", lead.gradeLevel),
    factLine("สายที่สนใจ", lead.interests?.length ? lead.interests.join(", ") : null),
    factLine("stage", lead.stage),
    factLine("ข้อเสนอ", coverageLabel),
    factLine("ผลงาน/กิจกรรม", lead.activitiesSummary),
    lead.pathlabPayReady ? "สัญญาณ: พร้อมสมัคร/ถามราคา" : null,
    lead.wantsPathlab ? "สัญญาณ: อยากลอง PathLab" : null,
    lead.wantsCommunity ? "สัญญาณ: อยากมีเพื่อนสายเดียวกัน" : null,
    lead.wantsTalent ? "สัญญาณ: อยากหางาน/ฝึกงาน" : null,
    lead.hasHandsOnExperience ? "สัญญาณ: มีผลงานอยู่แล้ว" : null,
    factLine("ข้อความล่าสุดของน้อง", lead.lastInbound),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

const SYSTEM_PROMPT = `คุณคือพี่บุญ (PassionSeed) กำลังทักน้องม.ปลายทาง IG เป็นภาษาไทย

งาน: เขียนข้อความนี้ใหม่ให้อุ่นและเป็นเรื่องของน้องคนนี้ โดยไม่เปลี่ยนจุดประสงค์ของเทมเพลต

กติกา:
- ส่งเฉพาะข้อความที่จะส่งให้น้องเท่านั้น ไม่มีคำอธิบาย ไม่มีหัวข้อ ไม่มีเครื่องหมายคำพูดครอบทั้งข้อความ
- ภาษาไทย น้ำเสียงพี่ชายที่เป็นกันเอง ใช้ครับ
- สั้น กระชับ อ่านบนมือถือได้ ปกติ 1–4 ประโยค ห้ามเขียนเรียงความ
- ใส่ชื่อ/ชั้นปี/สายที่เรารู้แล้ว อย่าถามซ้ำในสิ่งที่รู้แล้ว
- ห้ามคิดวันเริ่มค่าย เดดไลน์แข่ง จำนวนที่ หรือลิงก์ใหม่ ช่องที่เป็น [วันที่] [เดือน] [n] [ลิงก์ field page] [มหาลัย] [X] ต้องคงรูปแบบ [..] ไว้ถ้ายังไม่รู้ค่า
- ห้ามลดราคาจาก 299 ห้ามขาย Community ห้ามเปิดด้วยลิงก์เปล่า ห้ามลงท้ายว่า "ยังไม่มีสายนั้น"
- ถ้าเป็นสายที่ยังไม่มี seed ให้พูดว่ากำลังทำและจองรอบแรกได้
- ถ้าเทมเพลตมีราคา/วันที่/คำถามอยู่แล้ว ต้องยังมีสิ่งนั้นในฉบับใหม่
- ถ้าเทมเพลตมีชื่อรุ่น ราคา วันที่ปิดรับ จำนวนที่นั่ง หรือลิงก์ ให้คัดลอกค่าเหล่านั้นตรงๆ ห้ามเปลี่ยนเป็นรุ่นอื่น
- รักษาหน้าที่ของเทมเพลต: ถ้าเป็นคำถาม ให้ยังเป็นคำถาม ถ้ายังไม่ปิดการขาย ห้ามกระโดดไปบอกราคาเอง`;

function kindInstruction(kind: PersonalizeKind): string {
  switch (kind) {
    case "script":
      return "นี่คือสคริปต์ตามบันไดขาย รักษาขั้นของบันไดไว้";
    case "quick_reply":
      return "นี่คือคำตอบด่วนในแชท ทำให้ฟังดูเขียนให้น้องคนนี้โดยเฉพาะ";
    case "button_prompt":
      return "นี่คือข้อความนำหน้าปุ่มคำถาม รักษาคำถามเดิม อย่าเพิ่มปุ่มใหม่";
    case "public_comment":
      return "นี่คือคอมเมนต์สาธารณะใต้โพสต์ IG ต้องแท็กน้องถ้ามี @username และชวนให้น้องทัก DM มาก่อน";
    case "plan_dm":
      return "นี่คือข้อความส่งแผนพอร์ต รักษาอันดับ 3 ข้อและน้ำเสียง value-first ไว้";
    default:
      return "นี่คือข้อความที่พี่กำลังจะส่ง ปรับให้น้องคนนี้โดยไม่เปลี่ยนจุดประสงค์";
  }
}

export function buildPersonalizeMessages(
  request: PersonalizeRequest
): { role: "system" | "user"; content: string }[] {
  const kind = request.kind ?? "composed";
  const facts = buildLeadFacts(request.lead);
  const user = [
    kindInstruction(kind),
    "",
    "ข้อมูลน้อง:",
    facts || "ยังไม่รู้ชื่อ ชั้นปี หรือสายที่สนใจ",
    "",
    "เทมเพลต:",
    request.template,
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

function isShiftCommentTemplate(template: string): boolean {
  return template.includes("/shift/apply") || /SHIFT\[\d+\]/.test(template);
}

/** URLs, round names, prices, deadline, seats, and @mentions the rewrite must keep. */
function shiftLocks(template: string): string[] {
  return [
    ...(template.match(/https?:\/\/[^\s]+/g) ?? []).map((url) => url.replace(/[),.\]]+$/, "")),
    ...(template.match(/SHIFT\[\d+\]/g) ?? []),
    ...(template.match(/฿[\d,]+/g) ?? []),
    ...(template.match(/ปิดรับ [^\n]+/g) ?? []),
    ...(template.match(/รับแค่ \d+ คน/g) ?? []),
    ...(template.match(/@[A-Za-z0-9._]+/g) ?? []),
  ];
}

/** Round names, apply rounds, and prices. A rewrite may not introduce a new one. */
function shiftCohortTokens(text: string): string[] {
  return [
    ...(text.match(/SHIFT\[\d+\]/g) ?? []),
    ...(text.match(/[?&]round=\d+/g) ?? []),
    ...(text.match(/\/shift\/\d+/g) ?? []),
    ...(text.match(/฿[\d,]+/g) ?? []),
  ];
}

/**
 * Details from the closed SHIFT[1] round. Allowed only when the template
 * itself uses them, so a later round (round=10, SHIFT[10]) is not treated
 * as round 1 just because the digits overlap.
 */
const STALE_SHIFT_MARKERS: RegExp[] = [
  /SHIFT\[1\]/,
  /[?&]round=1(?:&|$)/,
  /\/shift\/1(?!\d)/,
  /฿670(?!\d)/,
  /ส\. 3 ต\.ค\./,
  /รับแค่ 15 คน/,
  /(?<!\d)5–11(?!\d)/,
  /(?<!\d)5-11(?!\d)/,
];

/**
 * SHIFT comment rewrites have to keep the cohort the template named.
 * Other templates are left alone so PathLab personalization is unchanged.
 * Returns false when the rewrite should be discarded for the template.
 */
export function rewriteKeepsShiftFacts(template: string, rewritten: string): boolean {
  if (!isShiftCommentTemplate(template)) return true;
  if (!shiftLocks(template).every((fact) => rewritten.includes(fact))) return false;
  if (STALE_SHIFT_MARKERS.some((pattern) => pattern.test(rewritten) && !pattern.test(template))) {
    return false;
  }
  const allowed = new Set(shiftCohortTokens(template));
  return shiftCohortTokens(rewritten).every((token) => allowed.has(token));
}

export function sanitizePersonalizedMessage(template: string, raw: string): string | null {
  const cleaned = stripModelWrapper(raw);
  if (!cleaned) return null;
  if (cleaned.length > Math.max(template.length * 3, 900)) return null;
  const restored = restorePlaceholders(template, cleaned);
  if (!rewriteKeepsShiftFacts(template, restored)) return null;
  return restored;
}

/**
 * Rewrite one outbound template for this lead. Returns the original
 * template when Qwen is down or the rewrite fails the safety checks.
 */
export async function personalizeMessage(request: PersonalizeRequest): Promise<string> {
  const template = request.template.trim();
  if (!template) return request.template;

  try {
    const raw = await completeQwenChat({
      messages: buildPersonalizeMessages(request),
      maxTokens: request.kind === "plan_dm" ? 700 : 360,
      temperature: 0.35,
      timeoutMs: 20_000,
    });
    return sanitizePersonalizedMessage(template, raw) ?? template;
  } catch (error) {
    console.warn("[dm-leads.personalize] Qwen rewrite failed, using template", error);
    return template;
  }
}

export async function personalizeMany(
  templates: string[],
  lead: PersonalizeLead,
  kind: PersonalizeKind = "composed"
): Promise<string[]> {
  return Promise.all(templates.map((template) => personalizeMessage({ template, lead, kind })));
}
