import type { LinkedInPost, StudioChannel, StudioSet, StudioSlide } from "./types";

/**
 * Copy rules every marketing string must pass before it renders. Each rule
 * is something a reader, a student, or the founder has already pushed back
 * on; the reason is kept next to the pattern so the rule can be argued with.
 */

export interface CopyRule {
  id: string;
  pattern: RegExp;
  why: string;
  /** Limit the rule to these channels; all channels when omitted. */
  channels?: StudioChannel[];
}

export const COPY_RULES: CopyRule[] = [
  { id: "em-dash", pattern: /—/, why: "No em dashes in user-facing copy: use a comma, a colon, or rewrite." },
  { id: "pivot", pattern: /pivot/i, why: "Never say pivot or Pivot Log; say what changed in plain Thai." },
  { id: "case-study", pattern: /case\s*study/i, why: "Say พอร์ต 1 หน้า / 1-Page Portfolio, not Case Study." },
  { id: "nong", pattern: /น้อง/, why: "No น้อง talk-down; students are builders, not kids." },
  { id: "luk", pattern: /ลูก(?!ค้า|เล่น)/, why: "No ลูก in poster copy; speak to the student or say ผู้ปกครอง / นักเรียน." },
  { id: "dek-dek", pattern: /เด็กๆ|เด็ก\s?ม\./, why: "Talks down to students; say นักเรียน ม.4 or name the grade." },
  { id: "guarantee", pattern: /การันตี|guarantee/i, why: "Never promise admission or outcomes. The refund line is the only promise." },
  { id: "admit-sure", pattern: /ติดแน่|ติดชัวร์|เข้าได้แน่/, why: "Admission is outside our control; never imply it." },
  { id: "fake-anchor", pattern: /ปกติ\s*฿|ราคาเต็ม|จากราคา|~~/, why: "No struck-through anchor price that was never charged." },
  { id: "finished-app", pattern: /แอปเสร็จ|finished app|ในวันเดียว/i, why: "Promise ต้นแบบ, never a finished app; bigger promises read as a scam." },
  { id: "no-1on1", pattern: /ไม่มีแชท\s*1:1|no 1:1/i, why: "Do not advertise a no-1:1 rule on posters." },
  { id: "hype-bang", pattern: /!{2,}/, why: "One exclamation mark at most; hype reads as a camp ad." },
  {
    id: "sdt-spelled",
    pattern: /self[-\s]determination/i,
    why: "On Thai social posts name it SDT Theory; spell it out only on LinkedIn.",
    channels: ["instagram", "story"],
  },
];

export interface CopyViolation {
  where: string;
  rule: string;
  why: string;
  text: string;
}

/** Text inside curly quotes is a verbatim quote and is not ours to rewrite. */
const QUOTED = /“[^”]*”/g;

export function lintText(text: string, where: string, channel: StudioChannel): CopyViolation[] {
  const ours = text.replace(QUOTED, "");
  return COPY_RULES.filter((rule) => !rule.channels || rule.channels.includes(channel))
    .filter((rule) => rule.pattern.test(ours))
    .map((rule) => ({ where, rule: rule.id, why: rule.why, text }));
}

/** Every human-readable string on a slide, with a path for error messages. */
export function slideStrings(slide: StudioSlide): string[] {
  switch (slide.kind) {
    case "cover":
      return [slide.kicker, ...slide.title, slide.sub, slide.note].filter(isText);
    case "points":
      return [slide.tag, slide.title, slide.footnote, ...slide.points.flatMap((p) => [p.title, p.body])].filter(isText);
    case "compare":
      return [
        slide.tag,
        slide.title,
        slide.footnote,
        slide.left.label,
        slide.right.label,
        ...slide.left.items,
        ...slide.right.items,
      ].filter(isText);
    case "chat":
      return [slide.tag, slide.title, slide.footnote, ...slide.lines.map((l) => l.text)].filter(isText);
    case "quote":
      // The quote itself is verbatim and exempt; only our framing is checked.
      return [slide.tag, slide.context].filter(isText);
    case "statement":
      return [slide.tag, ...slide.big, slide.body, slide.note].filter(isText);
    case "cta":
      return [slide.tag, slide.title, slide.body, slide.link].filter(isText);
    case "offer":
    case "schedule":
      return [slide.tag, slide.title];
  }
}

function isText(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export function lintSet(set: StudioSet): CopyViolation[] {
  const slideHits = set.slides.flatMap((slide, i) =>
    slideStrings(slide).flatMap((text) => lintText(text, `${set.slug} slide ${i + 1}`, set.channel)),
  );
  return [...slideHits, ...lintText(set.caption, `${set.slug} caption`, set.channel)];
}

export function lintPost(post: LinkedInPost): CopyViolation[] {
  return lintText(post.body, `${post.slug} body`, "linkedin");
}
