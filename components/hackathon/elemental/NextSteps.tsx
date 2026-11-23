import { ArrowUpRight } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";

/**
 * What to do after signing up, so the pay page never ends in a dead end:
 * join Discord (once paid) and the LINE OpenChat, and invite the team.
 * The Discord invite shows only on a paid seat's page.
 */
export function NextSteps({ inTeam, paid }: { inTeam: boolean; paid: boolean }) {
  const steps = [
    paid
      ? {
          title: "เข้า Discord ของงาน",
          body: `งานจัด${ELEMENTAL.venueTh} ${thaiDateLine()}`,
          action: { href: ELEMENTAL.discordInviteUrl, label: "เข้า Discord", color: "#5865F2" },
        }
      : {
          title: "ลิงก์ Discord ขึ้นที่หน้านี้เมื่อสลิปผ่าน",
          body: `งานจัด${ELEMENTAL.venueTh} ${thaiDateLine()}`,
          action: null,
        },
    {
      title: "เข้ากลุ่ม LINE OpenChat ของงาน",
      body: "คุยกับทีมงานและคนที่สมัครด้วยกัน",
      action: { href: ELEMENTAL.lineOpenChatUrl, label: "เข้า OpenChat", color: "#06C755" },
    },
    ...(inTeam
      ? [{ title: "ชวนเพื่อนเข้าทีม", body: "ส่งลิงก์ชวนเข้าทีมด้านบนให้เพื่อน แต่ละคนสมัครและจ่ายเอง", action: null }]
      : []),
  ];

  return (
    <section className="space-y-4">
      <p className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>ขั้นต่อไป</p>
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="pt-1 text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.flame }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="space-y-2">
              <p className="text-lg">{step.title}</p>
              <p style={{ color: EL.inkSoft }}>{step.body}</p>
              {step.action && (
                <a
                  href={step.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
                  style={{ backgroundColor: step.action.color }}
                >
                  {step.action.label} <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        เก็บลิงก์หน้านี้ไว้ เปิดดูสถานะได้ตลอด มีคำถามทักไลน์ {SHIFT_PAYMENT.lineId}
      </p>
    </section>
  );
}
