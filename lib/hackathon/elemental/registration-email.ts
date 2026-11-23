import { Resend } from "resend";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { siteUrl } from "@/lib/shift/notifyDiscord";

/**
 * After sign-up, email the person their own page link, so "pay later" works:
 * they can close the tab and come back to pay, see the team, or share the
 * invite. Best effort: a failed email never fails the sign-up.
 */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type RegistrationEmail = {
  to: string;
  payToken: string;
  amountBaht: number;
  team: { name: string; inviteCode: string } | null;
};

export function registrationEmailContent({ payToken, amountBaht, team }: Omit<RegistrationEmail, "to">) {
  const base = siteUrl();
  const payUrl = `${base}/hackathon/join/${payToken}`;
  const inviteUrl = team ? `${base}/hackathon/join?team=${team.inviteCode}` : null;
  const subject = `สมัคร ${ELEMENTAL.edition} Hackathon แล้ว: ลิงก์ของคุณ`;

  const lines = [
    `สมัคร ${ELEMENTAL.edition} Hackathon เรียบร้อย`,
    `จ่ายค่าสมัคร ฿${amountBaht.toLocaleString("en-US")} ตอนนี้หรือทีหลังก็ได้ ที่นั่งยืนยันเมื่อสลิปผ่าน: ${payUrl}`,
    ...(team && inviteUrl
      ? [`ส่งลิงก์นี้ให้เพื่อนเข้าทีม ${team.name} (แต่ละคนสมัครและจ่ายเอง คนละ ฿${ELEMENTAL.groupPriceBaht}): ${inviteUrl}`]
      : []),
    `ปิดรับสมัคร ${ELEMENTAL.registrationClosesOn} มีคำถามทักไลน์ ${SHIFT_PAYMENT.lineId}`,
  ];

  const link = (url: string) => `<a href="${escape(url)}">${escape(url)}</a>`;
  const html = [
    `<p>สมัคร ${ELEMENTAL.edition} Hackathon เรียบร้อย</p>`,
    `<p>จ่ายค่าสมัคร ฿${amountBaht.toLocaleString("en-US")} ตอนนี้หรือทีหลังก็ได้ ที่นั่งยืนยันเมื่อสลิปผ่าน<br>${link(payUrl)}</p>`,
    team && inviteUrl
      ? `<p>ส่งลิงก์นี้ให้เพื่อนเข้าทีม <strong>${escape(team.name)}</strong> แต่ละคนสมัครและจ่ายเอง คนละ ฿${ELEMENTAL.groupPriceBaht}<br>${link(inviteUrl)}</p>`
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
