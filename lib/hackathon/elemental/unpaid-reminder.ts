import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate, SHIFT_PAYMENT } from "@/lib/content/shift-cohort";

import { baht, parentPayUrl, parentShareMessage } from "./parent-share";

/**
 * The reminder for sign-ups that never paid (scripts/elemental-unpaid-reminder.ts).
 * One email per address, with that sign-up's own pay link and the parent
 * link. Like the sign-up email (registration-email.ts) it carries nothing the
 * person typed, not even their nickname: anyone can put any address in the
 * form, so the email holds only the links and the amount.
 */

/** The columns the script reads. Never print them: they hold a contact address. */
export type ReminderRow = {
  pay_token: string;
  status: string;
  amount_baht: number;
  contact_email: string | null;
  created_at: string;
};

export type Reminder = { to: string; payToken: string; amountBaht: number };

/**
 * Who gets a reminder: each address's newest pending sign-up, made more than
 * `olderThanHours` ago (and at or after `since`, when given). An address that
 * also has a paid sign-up, or one whose slip is waiting for a check, is left
 * out: it already has its seat, so the pending one is a second sign-up.
 */
export function pickUnpaidReminders(
  rows: ReminderRow[],
  { now, olderThanHours, since }: { now: Date; olderThanHours: number; since?: Date | null },
): Reminder[] {
  const cutoff = now.getTime() - olderThanHours * 3_600_000;
  const key = (email: string) => email.trim().toLowerCase();
  const seated = new Set(
    rows.filter((r) => (r.status === "paid" || r.status === "review") && r.contact_email).map((r) => key(r.contact_email!)),
  );
  const newest = new Map<string, ReminderRow>();
  for (const r of rows) {
    if (r.status !== "pending" || !r.contact_email?.includes("@")) continue;
    const at = Date.parse(r.created_at);
    if (!(at <= cutoff) || (since && at < since.getTime())) continue;
    const k = key(r.contact_email);
    if (seated.has(k)) continue;
    const kept = newest.get(k);
    if (!kept || Date.parse(kept.created_at) < at) newest.set(k, r);
  }
  return [...newest.values()]
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((r) => ({ to: r.contact_email!.trim(), payToken: r.pay_token, amountBaht: r.amount_baht }));
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "ศ. 4 ธ.ค. 23:59 น.": when sign-up closes, from the programme. */
function closesTh(): string {
  const slot = ELEMENTAL.schedule.find((s) => s.kind === "due" && s.date === ELEMENTAL.registrationClosesOn);
  return `${formatThaiDate(ELEMENTAL.registrationClosesOn)}${slot?.time ? ` ${slot.time} น.` : ""}`;
}

/** The email for one unpaid sign-up. base: the site the links go to (https://passionseed.org). */
export function unpaidReminderContent({ payToken, amountBaht, base }: { payToken: string; amountBaht: number; base: string }) {
  const site = base.replace(/\/+$/, "");
  const payUrl = `${site}/hackathon/join/${payToken}`;
  const parentUrl = parentPayUrl(site, payToken);
  const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(parentShareMessage({ amountBaht, url: parentUrl }))}`;
  const amount = baht(amountBaht);

  // PLACEHOLDER copy (Angpao)
  const subject = `อีกขั้นเดียว: จ่ายค่าสมัคร ${ELEMENTAL.edition} Hackathon`;
  // PLACEHOLDER copy (Angpao)
  const lead = `คุณสมัคร ${ELEMENTAL.edition} Hackathon ไว้แล้ว เหลือแค่จ่ายค่าสมัคร ${amount} โอนแล้วส่งสลิปในหน้าของคุณ ที่นั่งยืนยันทันทีที่สลิปผ่าน`;
  // PLACEHOLDER copy (Angpao)
  const payLabel = "จ่ายค่าสมัคร";
  // PLACEHOLDER copy (Angpao)
  const parentTitle = "ผู้ปกครองเป็นคนจ่าย?";
  // PLACEHOLDER copy (Angpao)
  const parentBody = "ส่งลิงก์นี้ให้ผู้ปกครอง เปิดแล้วสแกน QR และส่งสลิปได้ในหน้าเดียว ไม่ต้องสมัครใหม่";
  // PLACEHOLDER copy (Angpao)
  const parentLineLabel = "ส่งให้ผู้ปกครองทาง LINE";
  // PLACEHOLDER copy (Angpao)
  const closes = `ปิดรับสมัคร ${closesTh()}`;
  // PLACEHOLDER copy (Angpao)
  const outro = `จ่ายแล้ว ไม่ต้องทำอะไร มีคำถามทักไลน์ ${SHIFT_PAYMENT.lineId}`;
  const eventLine = `${ELEMENTAL.edition} Hackathon · ${thaiDateLine()} · ${ELEMENTAL.gradesTh}`;

  const text = [
    lead,
    `${payLabel}: ${payUrl}`,
    `${parentTitle} ${parentBody}`,
    parentUrl,
    `${closes} · ${outro}`,
  ].join("\n\n");

  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif";
  const p = (body: string, extra = "") => `<p style="margin:0 0 16px;font-size:16px;line-height:26px;${extra}">${body}</p>`;
  const html = `<!doctype html><html lang="th"><body style="margin:0;padding:0;background:${EL.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EL.cream};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${font};color:${EL.ink};">
<tr><td style="padding:0 0 24px;font-size:13px;line-height:20px;color:${EL.inkSoft};">${escape(eventLine)}</td></tr>
<tr><td>
${p(escape(lead))}
<p style="margin:8px 0 4px;font-size:48px;line-height:1;font-weight:300;font-family:Georgia, 'Times New Roman', serif;">${escape(amount)}</p>
<p style="margin:20px 0 28px;"><a href="${escape(payUrl)}" style="display:inline-block;background:${EL.flame};color:${EL.ink};font-size:16px;font-weight:600;line-height:24px;padding:14px 28px;border-radius:2px;text-decoration:none;">${escape(payLabel)}</a></p>
</td></tr>
<tr><td style="border-top:1px solid rgba(29,33,31,0.2);border-bottom:1px solid rgba(29,33,31,0.2);padding:20px 0 4px;">
${p(`<strong>${escape(parentTitle)}</strong><br>${escape(parentBody)}`)}
<p style="margin:0 0 12px;"><a href="${escape(lineUrl)}" style="display:inline-block;color:${EL.ink};font-size:15px;font-weight:600;line-height:24px;padding:10px 20px;border-radius:2px;border:1px solid ${EL.ink};text-decoration:none;">${escape(parentLineLabel)}</a></p>
${p(`<a href="${escape(parentUrl)}" style="color:${EL.inkSoft};word-break:break-all;">${escape(parentUrl)}</a>`, "font-size:13px;line-height:20px;")}
</td></tr>
<tr><td style="padding:20px 0 0;font-size:13px;line-height:20px;color:${EL.inkSoft};">${escape(closes)}<br>${escape(outro)}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
