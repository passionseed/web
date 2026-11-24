import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import type { ElementCase } from "@/components/hackathon/elemental/challenges";
import type { KitAction, KitLink, KitWord } from "@/components/hackathon/elemental/kit";
import { ELEMENT_CHAPTERS, type ElementKey } from "@/components/hackathon/elemental/media";
import { DaysLeft } from "@/components/hackathon/elemental/quiz/QuizShare";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";

/** Server pieces shared by the kit's index and element pages. */

export const kitLine = "rgba(243,239,230,0.16)";

export function Tag({ children, color = EL.creamSoft }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color }}>
      [{children}]
    </p>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-balance text-3xl sm:text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
      {children}
    </h2>
  );
}

/** One real case: what happened, its numbers, who is hurt, and where it was reported. */
export function CaseCard({ c }: { c: ElementCase }) {
  return (
    <article className="rounded-2xl border p-5" style={{ borderColor: kitLine, backgroundColor: "rgba(243,239,230,0.03)" }}>
      <p className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        {c.placeTh} · {c.yearTh}
      </p>
      <h3 className="mt-2 text-pretty text-xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
        {c.titleTh}
      </h3>
      <p className="mt-2 text-pretty" style={{ color: EL.creamSoft }}>
        {c.whatHappenedTh}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {c.impact.map((i) => (
          <div key={i.value}>
            <dt className="text-2xl" style={{ fontFamily: EL_FONT.display, color: EL.flameLight }}>
              {i.value}
            </dt>
            <dd className="text-sm" style={{ color: EL.creamSoft }}>
              {i.labelTh}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm">
        <span style={{ color: EL.creamSoft }}>ใครเจ็บ: </span>
        {c.whoIsHurtTh}
      </p>
      <p className="mt-3 text-xs" style={{ color: EL.creamSoft }}>
        ที่มา:{" "}
        {c.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ", "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {s.name}
            </a>{" "}
            {s.dateTh}
          </span>
        ))}
      </p>
    </article>
  );
}

export function LookList({ items }: { items: readonly KitLink[] }) {
  return (
    <ul className="mt-6 grid gap-3">
      {items.map((l) => (
        <li key={l.nameTh} className="rounded-2xl border px-5 py-4" style={{ borderColor: kitLine }}>
          <div className="flex items-start justify-between gap-3">
            {l.url ? (
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-lg underline-offset-4 hover:underline">
                {l.nameTh} <ArrowUpRight className="inline h-4 w-4 align-[-2px]" />
              </a>
            ) : (
              <span className="text-lg">{l.nameTh}</span>
            )}
            <span className="shrink-0 text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
              {l.kindTh}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: EL.creamSoft }}>
            {l.findTh}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function Words({ words }: { words: readonly KitWord[] }) {
  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      {words.map((w) => (
        <div key={w.th} className="border-t pt-3" style={{ borderColor: kitLine }}>
          <dt className="text-xl" style={{ fontFamily: EL_FONT.display }}>
            {w.th} <span className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>{w.en}</span>
          </dt>
          <dd className="mt-1" style={{ color: EL.creamSoft }}>
            {w.meaningTh}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TodayList({ items }: { items: readonly KitAction[] }) {
  return (
    <ol className="mt-6 grid gap-3">
      {items.map((a, i) => (
        <li key={a.th} className="flex gap-4 rounded-2xl px-5 py-4" style={{ backgroundColor: EL.cream, color: EL.ink }}>
          <span className="text-2xl" style={{ fontFamily: EL_FONT.display, color: EL.ember }}>
            {i + 1}
          </span>
          <span className="pt-1 text-pretty">
            {a.url ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {a.th}
              </a>
            ) : (
              a.th
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Three ways in, for three kinds of people: students make it in the
 * hackathon, adults pass it to a student or back the event, and anyone can
 * do something today (on the element page, above this).
 */
export function WhoCanHelp({ open, joinHref }: { open: boolean; joinHref: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {open && (
        <section className="rounded-2xl p-6" style={{ backgroundColor: EL.cream, color: EL.ink }}>
          <Tag color={EL.inkSoft}>ถ้าคุณเป็นนักเรียน {ELEMENTAL.gradesTh}</Tag>
          <p className="mt-3 text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
            เอาคำถามนี้ไปทำจริงใน 3 วัน
          </p>
          <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
            {ELEMENTAL.edition} Hackathon {thaiDateLine()} ออนไลน์ รางวัลรวม {prizeTotal()} บาท มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน (คนเดียว ฿
            {ELEMENTAL.priceBaht})
          </p>
          <Link
            href={joinHref}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-lg font-semibold"
            style={{ backgroundColor: EL.ink, color: EL.cream }}
          >
            สมัคร <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-center text-sm" style={{ color: EL.inkSoft }}>
            ปิดรับสมัคร {formatThaiDate(ELEMENTAL.registrationClosesOn, false)} · <DaysLeft closesOn={ELEMENTAL.registrationClosesOn} />
          </p>
        </section>
      )}
      <section className="rounded-2xl border p-6" style={{ borderColor: kitLine }}>
        <Tag>ถ้าคุณเป็นผู้ใหญ่ที่อยากช่วย</Tag>
        <p className="mt-3 text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
          ส่งหน้านี้ให้เด็กหนึ่งคนที่คุณรู้จัก
        </p>
        <p className="mt-2 text-sm" style={{ color: EL.creamSoft }}>
          ลูก หลาน หรือนักเรียนของคุณ อาจเป็นคนที่ตั้งคำถามข้อต่อไป ถ้าคุณอยากสนับสนุนงานนี้ ดูวิธีได้ที่หน้าผู้สนับสนุน
        </p>
        <Link href="/hackathon/elemental/sponsor" className="mt-5 inline-flex items-center gap-2 underline underline-offset-4">
          สนับสนุนงานนี้ <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

/** The five elements, each linking to its kit. */
export function ElementNav({ current }: { current?: ElementKey }) {
  return (
    <nav aria-label="ธาตุอื่นๆ" className="grid grid-cols-5 gap-2">
      {ELEMENT_CHAPTERS.map((c) => (
        <Link
          key={c.key}
          href={`/hackathon/elemental/kit/${c.key}`}
          aria-current={c.key === current ? "page" : undefined}
          className="flex flex-col items-center gap-2 rounded-xl border px-1 py-3 text-center text-xs"
          style={{ borderColor: c.key === current ? c.color : kitLine }}
        >
          <ElementIcon element={c.key} size={32} id={`nav-${c.key}`} />
          {c.th}
        </Link>
      ))}
    </nav>
  );
}
