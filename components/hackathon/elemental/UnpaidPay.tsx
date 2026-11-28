import Link from "next/link";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";

/**
 * The unpaid pay page (PayView while status is pending), laid out so it reads
 * on a laptop too (Big, 2026-11-28: the Elemental pages "look bad on
 * desktop"). On a phone it is one column: the title, the parent handoff, the
 * payment, then the team. From lg it is two: the title, the handoff and the
 * team on the left, and the payment on the right, held in view while the left
 * scrolls. The order on a phone is the DOM order; lg only moves the payment.
 */
export function UnpaidLayout({ intro, handoff, pay, rest }: { intro: ReactNode; handoff?: ReactNode; pay: ReactNode; rest?: ReactNode }) {
  return (
    <section className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_34rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-16 lg:gap-y-10">
      <div className="lg:col-start-1">{intro}</div>
      {handoff && <div className="lg:col-start-1">{handoff}</div>}
      <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">{pay}</div>
      {rest && <div className="lg:col-start-1">{rest}</div>}
    </section>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
      {children}
    </h1>
  );
}

/** A receipt-style row: a Space Mono label and its value. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-t py-3" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
      <dt className="text-[13px] leading-6" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
        [{label}]
      </dt>
      <dd className="text-base leading-6">{children}</dd>
    </div>
  );
}

/**
 * The top of the page a parent opens from the student's link (?for=parent):
 * whose sign-up it is (nickname only), what the event is, and who runs it.
 * The payment and the slip upload sit next to it, as on the student's page.
 */
export function ParentIntro({ who }: { who: string }) {
  return (
    <div>
      {/* PLACEHOLDER copy (Angpao) */}
      <Heading>ค่าสมัครของ {who}</Heading>
      <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
        {/* PLACEHOLDER copy (Angpao) */}
        {who} สมัคร {ELEMENTAL.edition} Hackathon ไว้แล้ว และส่งหน้านี้มาให้ชำระค่าสมัคร โอนตามยอดแล้วส่งสลิปในหน้านี้ ที่นั่งยืนยันทันทีที่สลิปผ่าน
      </p>
      <dl className="mt-8 border-b" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
        {/* PLACEHOLDER copy (Angpao): the labels and the "นักเรียน", "หัวข้อ" and "จัดโดย" wording */}
        <Row label="งาน">
          {ELEMENTAL.edition} Hackathon หัวข้อ{ELEMENTAL.theme}
        </Row>
        <Row label="ใคร">นักเรียน {ELEMENTAL.gradesTh} จากทั่วประเทศ</Row>
        <Row label="วันที่">{thaiDateLine()}</Row>
        <Row label="ที่ไหน">{ELEMENTAL.venueTh}</Row>
        <Row label="จัดโดย">PassionSeed</Row>
      </dl>
      <p className="mt-4 text-sm leading-6" style={{ color: EL.inkSoft }}>
        <Link href="/hackathon/elemental" target="_blank" className="underline underline-offset-4">
          {/* PLACEHOLDER copy (Angpao) */}
          ดูรายละเอียดงาน
        </Link>
        {/* PLACEHOLDER copy (Angpao) */} · มีคำถามทักไลน์{" "}
        <a href={SHIFT_PAYMENT.lineUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {SHIFT_PAYMENT.lineId}
        </a>
      </p>
    </div>
  );
}
