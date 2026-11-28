import type { ReactNode } from "react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

import { thaiDayDate } from "../journey-steps";
import { DarkSlab, EditorialLink, ElementalWordmark, Fine, PixelIcon, Tag, v, type PixelIconName } from "../share/ui";
import type { Mode } from "./draft";

/**
 * What you're signing up for, beside the form on a wide screen (from 1024px):
 * the event, the price for the way you're signing up, and what you get. Every
 * fact comes from facts.ts; the lines are the landing's and the old mode
 * screen's where they fit. Phones don't get it: they keep one fast column.
 */

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

const WORKSHOPS = ELEMENTAL.schedule.filter((s) => s.kind === "workshop").length;
const CLOSES = ELEMENTAL.schedule.find((s) => s.kind === "due" && s.date === ELEMENTAL.registrationClosesOn);

/** The price line for each way of signing up. */
const PRICE: Record<Mode, { amount: number; unit: string; note: string }> = {
  // PLACEHOLDER copy (Angpao): unit and note lines below; the notes reuse the old mode screen's.
  create: { amount: ELEMENTAL.groupPriceBaht, unit: "ต่อคน ในทีม", note: "สร้างทีม แล้วส่งลิงก์ให้เพื่อนสมัครเอง แต่ละคนจ่ายเอง" },
  join: { amount: ELEMENTAL.groupPriceBaht, unit: "ต่อคน ในทีม", note: "แต่ละคนสมัครและจ่ายเอง" },
  solo: { amount: ELEMENTAL.priceBaht, unit: "คนเดียว", note: "เราช่วยจับคู่เข้าทีมให้ได้" },
  buddy: { amount: ELEMENTAL.buddyPriceBaht, unit: "บัตรเพื่อน", note: "ทีมงานจับเข้าทีมเดียวกับเพื่อนที่ชวนมาให้" },
};

function Row({ icon, tag, children }: { icon: PixelIconName; tag: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-2.5">
      <span className="mt-0.5" style={{ color: v.secondary }} aria-hidden="true">
        <PixelIcon name={icon} />
      </span>
      <div className="min-w-0">
        <Tag>{tag}</Tag>
        <p className="mt-0.5 text-pretty" style={{ fontFamily: EL_FONT.body, fontSize: 15, lineHeight: "24px" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

export function EventSummary({ mode, className }: { mode: Mode; className?: string }) {
  const price = PRICE[mode];
  return (
    <aside className={className} aria-label={`${ELEMENTAL.edition} Hackathon`}>
      <DarkSlab>
        <ElementalWordmark size={40} />
        <p className="mt-3 text-pretty" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 20, lineHeight: 1.4, color: v.number }}>
          {ELEMENTAL.taglineTh[0]} {ELEMENTAL.taglineTh[1]}
        </p>

        <div className="mt-5 flex items-baseline justify-between gap-4 border-y py-4" style={{ borderColor: v.rule }}>
          <div className="min-w-0">
            {/* PLACEHOLDER copy (Angpao) */}
            <Tag>ค่าสมัคร</Tag>
            <Fine className="mt-1">{price.note}</Fine>
          </div>
          <p className="shrink-0 text-right">
            <span className="block tabular-nums" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 40, lineHeight: 1, color: v.number }}>
              {baht(price.amount)}
            </span>
            <span className="mt-1 block" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.secondary }}>
              {price.unit}
            </span>
          </p>
        </div>

        <div className="divide-y divide-[color:var(--el-rule-soft)]">
          {/* PLACEHOLDER copy (Angpao): the tags (วันที่, รูปแบบ, ใครสมัครได้, ได้อะไร, ปิดรับสมัคร) */}
          <Row icon="date" tag="วันที่">
            {thaiDateLine()}
          </Row>
          <Row icon="online" tag="รูปแบบ">
            {ELEMENTAL.venueTh}
          </Row>
          <Row icon="friends" tag="ใครสมัครได้">
            {ELEMENTAL.gradesTh} ทีมละ {ELEMENTAL.teamMin}–{ELEMENTAL.teamMax} คน มาคนเดียวได้ เราหาทีมให้
          </Row>
          <Row icon="workshop" tag="ได้อะไร">
            {/* PLACEHOLDER copy (Angpao): "เวิร์กช็อป N ครั้ง"; the rest is the landing's */}
            เวิร์กช็อป {WORKSHOPS} ครั้ง มีพี่เลี้ยงช่วยตลอดงาน รางวัลรวม {prizeTotal()} บาท
          </Row>
          {CLOSES?.time && (
            <Row icon="pin" tag="ปิดรับสมัคร">
              {thaiDayDate(CLOSES.date)} {CLOSES.time} น.
            </Row>
          )}
        </div>

        <div className="mt-4">
          {/* A new tab, so the answers in the form stay put. */}
          <EditorialLink href="/hackathon/elemental" external size="sm" tone="action">
            ดูรายละเอียดงาน
          </EditorialLink>
        </div>
      </DarkSlab>
    </aside>
  );
}
