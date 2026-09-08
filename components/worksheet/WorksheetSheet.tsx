import Link from "next/link";

import {
  getSdtNeed,
  getSegment,
  type Worksheet,
} from "@/lib/work/audience-segments";

import { PrintButton } from "./PrintButton";
import { WritingLines } from "./WritingLines";

const needPromise: Record<string, string> = {
  autonomy: "ใบนี้ไม่มีคำตอบให้ลอก เพราะการเลือกต้องเป็นของน้องเอง",
  competence: "ใบนี้ไม่ให้คะแนนน้อง น้องเป็นคนให้คะแนนงานตัวเอง",
  relatedness: "ใบนี้เขียนไว้ให้มีคนอ่านต่อ งานที่ไม่มีใครถามต่อจะหยุดโตตรงนั้น",
};

const routeCta: Record<string, { href: string; label: string; body: string }> = {
  techseed: {
    href: "/techseed",
    label: "ดู TechSeed",
    body: "ถ้าอยากลองทำโปรเจกต์แรกโดยมีรุ่นพี่นั่งอยู่ข้างๆ",
  },
  shift: {
    href: "/shift",
    label: "ดู SHIFT",
    body: "ถ้าอยากดันของที่ทำอยู่ให้กลายเป็นหลักฐานภายใน 7 วัน",
  },
  both: {
    href: "/shift",
    label: "ดูโปรแกรมที่มี",
    body: "ถ้าอยากมีคนช่วยถามคำถามที่ยากกว่านี้ ตอนทำงานจริง",
  },
};

export function WorksheetSheet({ worksheet }: { worksheet: Worksheet }) {
  const segment = getSegment(worksheet.segmentId);
  const need = getSdtNeed(worksheet.need);
  const cta = routeCta[segment?.route ?? "both"];

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16 print:max-w-none print:px-0 print:py-0">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-orange-500/25 bg-orange-500/[0.08] px-2.5 py-1 font-space-mono text-[10px] font-bold tracking-[0.16em] text-orange-700">
            {worksheet.keyword}
          </span>
          <span className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
            PassionSeed · แจกฟรี ไม่ต้องลงทะเบียน
          </span>
        </div>

        <h1 className="mt-5 font-kodchasan text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl">
          {worksheet.thaiTitle}
        </h1>
        <p className="mt-2 font-space-mono text-[11px] uppercase tracking-[0.14em] text-stone-400">
          {worksheet.title}
        </p>
        <p className="mt-4 text-base leading-7 text-stone-700">{worksheet.promise}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500">
          <span>ใช้เวลา {worksheet.timeBox}</span>
          <span>{worksheet.prompts.length} ข้อ</span>
          {segment && <span>ทำเพื่อ {segment.thaiLabel}</span>}
        </div>

        <div className="mt-6 print:hidden">
          <PrintButton />
        </div>
      </header>

      <p className="mt-8 rounded-xl border border-stone-900/10 bg-white/70 px-4 py-3 text-sm leading-6 text-stone-600 print:bg-transparent">
        {needPromise[need.id]}
      </p>

      <ol className="mt-10 space-y-8">
        {worksheet.prompts.map((prompt) => (
          <li key={prompt.n} className="break-inside-avoid rounded-2xl border border-stone-900/10 bg-white p-5 shadow-[0_1px_0_rgba(20,15,10,0.04)] print:shadow-none">
            <div className="flex items-baseline gap-3">
              <span className="font-space-mono text-xs font-bold text-orange-500">
                {String(prompt.n).padStart(2, "0")}
              </span>
              <h2 className="text-base font-semibold leading-7 text-stone-900">{prompt.ask}</h2>
            </div>
            <p className="mt-2 pl-8 text-xs leading-5 text-stone-500">{prompt.why}</p>
            <div className="pl-8">
              <WritingLines count={prompt.n === 1 ? 5 : 3} />
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="break-inside-avoid rounded-2xl border border-stone-900/10 bg-white p-5">
          <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-stone-400">
            ทำเสร็จแล้วน้องจะได้
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-800">{worksheet.output}</p>
        </div>
        <div className="break-inside-avoid rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] p-5">
          <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-700/70">
            อยากให้เราช่วยดูต่อ
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-800">{worksheet.sendBack}</p>
          <a
            href="https://www.instagram.com/passion_seed.th/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-orange-700 hover:text-orange-800"
          >
            ส่งมาที่ @passion_seed.th
          </a>
        </div>
      </section>

      <footer className="mt-12 border-t border-stone-900/10 pt-6 print:hidden">
        <p className="text-sm leading-6 text-stone-600">{cta.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link
            href={cta.href}
            className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
          >
            {cta.label}
          </Link>
          <Link href="/worksheet" className="min-h-11 text-sm text-stone-500 hover:text-stone-800">
            ใบงานอื่นทั้งหมด
          </Link>
        </div>
        <p className="mt-6 text-xs leading-5 text-stone-400">
          ใบงานนี้ใช้ได้ฟรี ถ่ายเอกสารแจกเพื่อนได้ ครูเอาไปใช้ในคาบได้ ไม่ต้องขออนุญาต
        </p>
      </footer>
    </article>
  );
}
