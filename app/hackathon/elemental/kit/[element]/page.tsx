import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ANY_PROBLEM_NOTE, ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { ELEMENT_KITS, EVERY_QUESTION_TH } from "@/components/hackathon/elemental/kit";
import { FrameTool } from "@/components/hackathon/elemental/kit/FrameTool";
import { CaseCard, ElementNav, H2, LookList, Tag, TodayList, WhoCanHelp, Words, kitLine } from "@/components/hackathon/elemental/kit/KitParts";
import { ELEMENT_CHAPTERS, elementLabel, type ElementKey } from "@/components/hackathon/elemental/media";
import { PixelBand } from "@/components/hackathon/elemental/quiz/PixelBand";
import { TrackStep } from "@/components/hackathon/elemental/TrackStep";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { QUIZ_PALETTE } from "@/lib/hackathon/elemental/quiz";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";

type Params = Promise<{ element: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KEYS = ELEMENT_CHAPTERS.map((c) => c.key);
const isElement = (v: string): v is ElementKey => (KEYS as readonly string[]).includes(v);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Only the five elements exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return KEYS.map((element) => ({ element }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { element } = await params;
  if (!isElement(element)) return {};
  const c = ELEMENT_CHAPTERS.find((x) => x.key === element)!;
  const title = `${elementLabel(c.th)}: จากโทษ เป็นโจทย์ | Elemental`;
  const description = `${c.subtitleTh} ปัญหาจริงในไทย แหล่งข้อมูล คำยาก และเครื่องมือที่ช่วยเปลี่ยนความโกรธให้เป็นคำถามที่ลงมือได้`;
  const url = `/hackathon/elemental/kit/${element}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "PassionSeed", locale: "th_TH", title, description, url, images: [c.after] },
    twitter: { card: "summary_large_image", title, description, images: [c.after] },
  };
}

/**
 * One element's kit: the problem and its real cases, the frame tool, and the
 * starter pack (where to look, questions, hard words, staying safe), then
 * what anyone can do today. For anyone who cares, not only students.
 */
export default async function KitElementPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { element } = await params;
  if (!isElement(element)) notFound();
  const sp = await searchParams;
  const src = normalizeSource(first(sp.src) ?? first(sp.utm_source));
  const chapter = ELEMENT_CHAPTERS.find((c) => c.key === element)!;
  const brief = ELEMENT_DETAILS[element];
  const k = ELEMENT_KITS[element];
  const p = QUIZ_PALETTE[element];
  const label = elementLabel(chapter.th);
  const open = elementalRegistrationOpen();
  const joinHref = `/hackathon/join?src=${src ?? "kit"}&utm_campaign=kit&utm_content=${element}`;

  return (
    <main className={`${trirong.variable} min-h-[100dvh]`} style={{ backgroundColor: p.bg, color: p.ink }}>
      <TrackStep step="kit_view" detail={element} source={src} />
      <PixelBand element={element} />
      <div className="mx-auto max-w-2xl px-6 pb-16">
        <Link href="/hackathon/elemental/kit" className="inline-flex items-center gap-1 text-sm" style={{ color: p.soft }}>
          <ArrowLeft className="h-4 w-4" /> ทั้งห้าธาตุ
        </Link>

        <header className="mt-6 flex items-start justify-between gap-6">
          <div>
            <Tag>{chapter.en.toUpperCase()} · จากโทษ เป็นโจทย์</Tag>
            <h1 className="mt-3 text-balance text-6xl sm:text-7xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
              {label}
            </h1>
            <p className="mt-3 text-xl" style={{ fontFamily: EL_FONT.display }}>
              {chapter.subtitleTh}
            </p>
          </div>
          <div className="shrink-0 pt-2">
            <ElementIcon element={element} size={96} id="kit-hero" />
          </div>
        </header>

        <p className="mt-6 text-pretty text-lg">{brief.problemTh}</p>
        <p className="mt-3 text-pretty" style={{ color: p.soft }}>
          <strong style={{ color: p.ink }}>ใครเจอเรื่องนี้:</strong> {k.whoTh}
        </p>

        <section className="mt-12">
          <Tag>ข่าวบอกว่า</Tag>
          <H2>เกิดขึ้นจริงแล้ว</H2>
          <div className="mt-6 grid gap-4">
            {brief.cases.map((c) => (
              <CaseCard key={c.titleTh} c={c} />
            ))}
          </div>
        </section>

        <section id="frame" className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag color={EL.flameLight}>ลองเลย 2 นาที</Tag>
          <H2>จากโทษ เป็นโจทย์</H2>
          <p className="mt-3 text-pretty" style={{ color: p.soft }}>
            ข่าวแบบนี้ทำให้โกรธ และเราก็มักหยุดอยู่ที่ว่าใครผิด สี่ขั้นนี้พาไปอีกทาง: หาคนหนึ่งคนที่เจ็บ หาช่วงที่มันพัง แล้วตั้งเป็นคำถามที่ลงมือได้ ภาพด้านล่างจะค่อยๆ
            ถูกซ่อมไปพร้อมกับคุณ
          </p>
          <div className="mt-8">
            <FrameTool element={element} elementTh={label} />
          </div>
          <p className="mt-6 text-sm" style={{ color: p.soft }}>
            ตัวอย่างคำถามจากทีมงาน: “{brief.howMightWeTh}”
          </p>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>ทำได้วันนี้ ไม่ต้องรอใคร</Tag>
          <H2>สามอย่างที่ทุกคนทำได้</H2>
          <TodayList items={k.today} />
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>ชุดเริ่มต้น</Tag>
          <H2>อยากเข้าใจให้ลึกกว่าข่าว</H2>
          <p className="mt-3 text-pretty" style={{ color: p.soft }}>
            ชุดนี้ชี้ว่าควรไปดูที่ไหน ไม่ได้บอกคำตอบ เปิดดูเอง แล้วตัดสินใจเอง {ANY_PROBLEM_NOTE}
          </p>

          <h3 className="mt-10 text-xl" style={{ fontFamily: EL_FONT.display }}>
            ที่ที่ควรไปดู
          </h3>
          <LookList items={k.look} />

          <h3 className="mt-10 text-xl" style={{ fontFamily: EL_FONT.display }}>
            คำถามชวนขุด
          </h3>
          <ul className="mt-4 grid gap-3">
            {[...k.questions, ...EVERY_QUESTION_TH].map((q) => (
              <li key={q} className="flex gap-3">
                <span aria-hidden="true" style={{ color: chapter.color }}>
                  ▪
                </span>
                <span className="text-pretty">{q}</span>
              </li>
            ))}
          </ul>

          {k.toolsTh && (
            <>
              <h3 className="mt-10 text-xl" style={{ fontFamily: EL_FONT.display }}>
                เครื่องมือที่ลองได้
              </h3>
              <p className="mt-3 text-pretty" style={{ color: p.soft }}>
                {k.toolsTh}
              </p>
            </>
          )}

          <h3 className="mt-10 text-xl" style={{ fontFamily: EL_FONT.display }}>
            คำที่เจอบ่อยในข่าว
          </h3>
          <Words words={k.words} />

          <div className="mt-10 rounded-2xl border-2 p-5" style={{ borderColor: EL.flame }}>
            <Tag color={EL.flameLight}>ปลอดภัยไว้ก่อน</Tag>
            <p className="mt-2 text-pretty">{k.safeTh}</p>
          </div>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>ไปต่อ</Tag>
          <H2>มีคำถามแล้ว ทำอะไรต่อได้บ้าง</H2>
          <div className="mt-6">
            <WhoCanHelp open={open} joinHref={joinHref} />
          </div>
        </section>

        <section className="mt-16">
          <Tag>ธาตุอื่นๆ</Tag>
          <div className="mt-4">
            <ElementNav current={element} />
          </div>
        </section>

        <p className="mt-10 text-xs" style={{ color: p.soft }}>
          ภาพ: {chapter.credit} · ลิงก์ทุกอันถูกเปิดตรวจเมื่อ 24 พ.ย. 2569 · คำถามที่คุณพิมพ์อยู่ในเครื่องของคุณ ไม่ถูกส่งมาที่เรา
        </p>
      </div>
    </main>
  );
}
