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
  await sendLimited(email.to, () => registrationEmailContent(email));
}

/**
 * "Send me my page link", asked from a friend's team link by someone who
 * already signed up on another device. It goes only to an address a sign-up
 * was made with, and carries the person's own page links (one per sign-up on
 * that address, newest first), each opening with the friend's team ready to
 * join (?join=<code>). Nothing typed by anyone is in it.
 */
export function myPageEmailContent({ payTokens, joinCode }: { payTokens: string[]; joinCode: string | null }) {
  const base = linkBase();
  const urls = payTokens.map((t) => `${base}/hackathon/join/${t}${joinCode ? `?join=${joinCode}` : ""}`);
  const subject = `ลิงก์หน้าของคุณ ${ELEMENTAL.edition} Hackathon`;
  const lead = joinCode
    ? "มีคนขอลิงก์หน้าการสมัครของอีเมลนี้ จากลิงก์ทีมที่เพื่อนส่งมา เปิดลิงก์แล้วกดเข้าทีมได้เลย ไม่ต้องสมัครใหม่"
    : "มีคนขอลิงก์หน้าการสมัครของอีเมลนี้";
  const many = urls.length > 1 ? `อีเมลนี้สมัครไว้ ${urls.length} ครั้ง ลิงก์ละหนึ่งการสมัคร ใหม่สุดอยู่บน` : null;
  const outro = `ถ้าไม่ได้ขอ ไม่ต้องทำอะไร มีคำถามทักไลน์ ${SHIFT_PAYMENT.lineId}`;
  const link = (url: string) => `<a href="${escape(url)}">${escape(url)}</a>`;
  return {
    subject,
    text: [lead, ...(many ? [many] : []), ...urls, outro].join("\n\n"),
    html: [
      `<p>${lead}</p>`,
      many ? `<p>${many}</p>` : "",
      `<p>${urls.map(link).join("<br>")}</p>`,
      `<p>${outro}</p>`,
    ].join(""),
  };
}

export async function sendMyPageEmail(email: { to: string; payTokens: string[]; joinCode: string | null }): Promise<void> {
  if (!email.payTokens.length) return;
  await sendLimited(email.to, () => myPageEmailContent(email));
}

/** Send one email, sharing the per-address hourly limit with the sign-up email. */
async function sendLimited(to: string, content: () => { subject: string; html: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM_EMAIL || "hi@noreply.passionseed.org";
  try {
    const address = to.trim().toLowerCase();
    const key = createHash("sha256").update(`hackathon-register-email:${address}`).digest("hex");
    const { allowed } = await checkRateLimit(key, EMAILS_PER_HOUR);
    if (!allowed) {
      console.warn("[hackathon register] email skipped: hourly limit for this address");
      return;
    }
    const { subject, html, text } = content();
    const { error } = await new Resend(apiKey).emails.send({
      from: `PassionSeed <${from}>`,
      to: [to],
      subject,
      html,
      text,
    });
    if (error) console.error("[hackathon register] email failed", error.message);
  } catch (error) {
    console.error("[hackathon register] email failed", error instanceof Error ? error.message : error);
  }
}
