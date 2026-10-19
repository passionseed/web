// Pure helpers for the shift-round-jobs edge function (unit-tested in lib_test.ts).

/** Constant-time string comparison (length leak only). */
export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Remove every APP1 "Exif\0\0" segment from a JPEG (E6). Returns the input unchanged when
 * nothing is found or the data is not a parseable JPEG.
 */
export function stripExif(input: Uint8Array): { bytes: Uint8Array; found: boolean } {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return { bytes: input, found: false };
  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let i = 2;
  let found = false;
  while (i + 4 <= input.length) {
    if (input[i] !== 0xff) return { bytes: input, found: false }; // not a marker: give up safely
    const marker = input[i + 1];
    if (marker === 0xd9 || marker === 0xda) {
      parts.push(input.subarray(i)); // EOI or start of scan: copy the rest verbatim
      i = input.length;
      break;
    }
    if (marker === 0xff) { // fill byte
      i += 1;
      continue;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { // standalone markers
      parts.push(input.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = (input[i + 2] << 8) | input[i + 3];
    if (len < 2 || i + 2 + len > input.length) return { bytes: input, found: false };
    const seg = input.subarray(i, i + 2 + len);
    const isExif = marker === 0xe1 && len >= 8 &&
      seg[4] === 0x45 && seg[5] === 0x78 && seg[6] === 0x69 && seg[7] === 0x66 && seg[8] === 0x00 && seg[9] === 0x00;
    if (isExif) found = true;
    else parts.push(seg);
    i += 2 + len;
  }
  if (i < input.length) parts.push(input.subarray(i));
  if (!found) return { bytes: input, found: false };
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return { bytes: out, found: true };
}

/** Appendix C / spec 5.9 push copy. Thai default. */
export const PUSH_COPY: Record<string, { th: string; en: string }> = {
  "push.no_evidence": { th: "วันนี้ยังไม่ได้บันทึกเลย คุยกับใครมาบ้างไหม?", en: "Nothing logged today. Talked to anyone?" },
  "push.no_evidence_last_day": { th: "ปิดคืนนี้ 23:59 เหลืออีก {n} ภารกิจ", en: "Closes tonight at 23:59. {n} Missions to go" },
  "push.closing_tomorrow": { th: "พรุ่งนี้ 23:59 ปิดรอบ เหลืออีก {n} ภารกิจ", en: "The round closes tomorrow at 23:59. {n} Missions to go" },
  "push.rejected": { th: "บันทึก{type}ถูกตีกลับ แตะเพื่อดูวิธีแก้", en: "A {type} log was sent back. Tap to see how to fix it" },
  "push.certificate": { th: "ใบรับรอง SHIFT รอบที่ {n} ของคุณมาแล้ว", en: "Your SHIFT round {n} certificate is here" },
  "push.summary_approved": { th: "สรุปโปรเจกต์ของคุณสาธารณะแล้ว", en: "Your project summary is now public" },
  "push.summary_rejected": { th: "สรุปโปรเจกต์ยังไม่ผ่าน แตะเพื่อดูเหตุผล", en: "Your project summary wasn't approved. Tap to see why" },
  "push.squad_assigned": { th: "เจอสควอดของคุณแล้ว มาทำความรู้จักกัน", en: "You have a squad. Come say hi" },
  "push.round_published": { th: "SHIFT รอบที่ {n} เปิดรับแล้ว", en: "SHIFT round {n} is open" },
  // v2 2.7: session reminder, 30 minutes before the live session
  "push.session": { th: "เซสชันวันที่ {day} เริ่ม {time} บน Discord", en: "Day {day} session starts at {time} on Discord" },
};

export const TYPE_LABEL: Record<string, { th: string; en: string }> = {
  contact: { th: "ติดต่อ", en: "contact" },
  ideas: { th: "ไอเดีย", en: "ideas" },
  interview: { th: "สัมภาษณ์", en: "interview" },
  problem_statement: { th: "โจทย์", en: "problem" },
  mvp: { th: "MVP", en: "MVP" },
  tester: { th: "คนลองใช้", en: "tester" },
  change: { th: "สิ่งที่เปลี่ยน", en: "change" },
  demo_post: { th: "เดโม", en: "demo" },
  daily: { th: "อัปเดตประจำวัน", en: "daily update" },
};

export interface Candidate {
  ledger_id: string;
  user_id: string;
  token: string;
  lang: string;
  kind: string;
  params: Record<string, unknown>;
}

export interface ExpoMessage {
  to: string;
  body: string;
  sound: "default";
  channelId: "shift";
  data: { url: string; kind: string };
}

export function renderPush(c: Candidate): ExpoMessage {
  const lang = c.lang === "en" ? "en" : "th";
  const key = String(c.params.copy_key ?? "");
  const copy = PUSH_COPY[key];
  if (!copy) throw new Error(`unknown copy key ${key}`);
  const n = c.params.n ?? c.params.round_number ?? "";
  const type = TYPE_LABEL[String(c.params.type ?? "")]?.[lang] ?? "";
  const body = copy[lang]
    .replaceAll("{n}", String(n))
    .replaceAll("{type}", type)
    .replaceAll("{day}", String(c.params.day ?? ""))
    .replaceAll("{time}", String(c.params.time ?? ""));
  return {
    to: c.token,
    body,
    sound: "default",
    channelId: "shift",
    data: { url: String(c.params.url ?? "passion-seed://round"), kind: c.kind },
  };
}
