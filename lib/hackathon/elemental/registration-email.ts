import { createHash } from "crypto";
import { Resend } from "resend";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { siteUrl } from "@/lib/shift/notifyDiscord";

/**
 * After sign-up, email the person their own page link, so "pay later" works:
 * they can close the tab and come back to pay, see the team, or share the
 * invite. Best effort: a failed email never fails the sign-up.
 *
 * Sign-up needs no login, so anyone can put any address in the form. The email
 * therefore carries nothing the person typed (not even the team name), and one
 * address gets at most EMAILS_PER_HOUR of them.
 */

const EMAILS_PER_HOUR = 3;

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type RegistrationEmail = {
  to: string;
  payToken: string;
  amountBaht: number;
  team: { name: string; inviteCode: string } | null;
};

/**
 * Where the email's links go: this deployment on a Vercel preview (so a test
 * sign-up comes back to the code being tested), passionseed.org otherwise.
 */
function linkBase(): string {
  const branchUrl = process.env.VERCEL_BRANCH_URL;
  if (process.env.VERCEL_ENV === "preview" && branchUrl) return `https://${branchUrl}`;
  return siteUrl();
}

export function registrationEmailContent({ payToken, amountBaht, team }: Omit<RegistrationEmail, "to">) {
  const base = linkBase();
  const payUrl = `${base}/hackathon/join/${payToken}`;
  const inviteUrl = team ? `${base}/hackathon/join?team=${team.inviteCode}` : null;
  const subject = `สมัคร ${ELEMENTAL.edition} Hackathon แล้ว: ลิงก์ของคุณ`;

  const lines = [
    `สมัคร ${ELEMENTAL.edition} Hackathon เรียบร้อย`,
    `จ่ายค่าสมัคร ฿${amountBaht.toLocaleString("en-US")} ตอนนี้หรือทีหลังก็ได้ ที่นั่งยืนยันเมื่อสลิปผ่าน: ${payUrl}`,
    ...(team && inviteUrl
      ? [`ส่งลิงก์นี้ให้เพื่อนเข้าทีมของคุณ (แต่ละคนสมัครและจ่ายเอง คนละ ฿${ELEMENTAL.groupPriceBaht}): ${inviteUrl}`]
      : []),
    `ปิดรับสมัคร ${ELEMENTAL.registrationClosesOn} มีคำถามทักไลน์ ${SHIFT_PAYMENT.lineId}`,
  ];

  const link = (url: string) => `<a href="${escape(url)}">${escape(url)}</a>`;
  const html = [
    `<p>สมัคร ${ELEMENTAL.edition} Hackathon เรียบร้อย</p>`,
    `<p>จ่ายค่าสมัคร ฿${amountBaht.toLocaleString("en-US")} ตอนนี้หรือทีหลังก็ได้ ที่นั่งยืนยันเมื่อสลิปผ่าน<br>${link(payUrl)}</p>`,
    team && inviteUrl
      ? `<p>ส่งลิงก์นี้ให้เพื่อนเข้าทีมของคุณ แต่ละคนสมัครและจ่ายเอง คนละ ฿${ELEMENTAL.groupPriceBaht}<br>${link(inviteUrl)}</p>`
      : "",
    `<p>ปิดรับสมัคร ${ELEMENTAL.registrationClosesOn} มีคำถามทักไลน์ ${SHIFT_PAYMENT.lineId}</p>`,
  ].join("");

  return { subject, html, text: lines.join("\n\n") };
}

export async function sendRegistrationEmail(email: RegistrationEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM_EMAIL || "hi@noreply.passionseed.org";
  try {
    const address = email.to.trim().toLowerCase();
    const key = createHash("sha256").update(`hackathon-register-email:${address}`).digest("hex");
    const { allowed } = await checkRateLimit(key, EMAILS_PER_HOUR);
    if (!allowed) {
      console.warn("[hackathon register] email skipped: hourly limit for this address");
      return;
    }
    const { subject, html, text } = registrationEmailContent(email);
    const { error } = await new Resend(apiKey).emails.send({
      from: `PassionSeed <${from}>`,
      to: [email.to],
      subject,
      html,
      text,
    });
    if (error) console.error("[hackathon register] email failed", error.message);
  } catch (error) {
    console.error("[hackathon register] email failed", error instanceof Error ? error.message : error);
  }
}
