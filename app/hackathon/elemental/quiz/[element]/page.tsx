import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { ANY_PROBLEM_NOTE, ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { elementLabel } from "@/components/hackathon/elemental/media";
import { PixelBand } from "@/components/hackathon/elemental/quiz/PixelBand";
import { DaysLeft, QuizShare } from "@/components/hackathon/elemental/quiz/QuizShare";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { QUIZ_ELEMENTS, QUIZ_PALETTE, QUIZ_RESULTS, isQuizElement, quizJoinHref } from "@/lib/hackathon/elemental/quiz";
import { elementalRegistrationOpen } from "@/lib/hackathon/elemental/registration";

type Params = Promise<{ element: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateStaticParams() {
  return QUIZ_ELEMENTS.map((element) => ({ element }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { element } = await params;
  if (!isQuizElement(element)) return {};
  const r = QUIZ_RESULTS[element];
  const title = `ฉันคือ${r.th} | เธอคือธาตุอะไร`;
  const description = `“${r.roastTh}” ทำแบบทดสอบ 8 ข้อ แล้วดูว่าเธอคือธาตุไหน`;
  return {
    title,
    description,
    alternates: { canonical: `/hackathon/elemental/quiz/${element}` },
    openGraph: { type: "website", siteName: "PassionSeed", locale: "th_TH", title, description, url: `/hackathon/elemental/quiz/${element}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const line = "rgba(243,239,230,0.16)";
const tag = "text-sm tracking-widest";

/**
 * One result, on the element's own dark ground with its pixel icon from
 * Instagram slide 2. ?me=1 means the person just took the quiz; without it, a
 * friend opened a shared link.
 */
export default async function QuizResultPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { element } = await params;
  if (!isQuizElement(element)) notFound();
  const me = (await searchParams).me === "1";
  const r = QUIZ_RESULTS[element];
  const p = QUIZ_PALETTE[element];
  const need = QUIZ_RESULTS[r.needs];
  const brief = ELEMENT_DETAILS[element];
  const open = elementalRegistrationOpen();
  const shareText = `ฉันคือ${r.th} “${r.roastTh}” เธอคือธาตุอะไร`;

  return (
    <main className={`${trirong.variable} min-h-[100dvh]`} style={{ backgroundColor: p.bg, color: p.ink }}>
      <PixelBand element={element} />
      <div className="mx-auto max-w-xl px-6 pb-12">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className={tag} style={{ fontFamily: EL_FONT.mono, color: p.soft }}>
              [{r.en.toUpperCase()}]
            </p>
            <p className="mt-6 text-xl">{me ? "เธอคือ" : "เพื่อนเธอคือ"}</p>
          </div>
          <div className="shrink-0 pt-1">
            <ElementIcon element={element} size={112} id="hero" />
          </div>
        </div>
        <h1 className="mt-2 text-balance text-7xl sm:text-8xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.15 }}>
          {r.th}
        </h1>
        <p className="mt-4 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display }}>
          “{r.roastTh}”
        </p>
        <p className="mt-4 text-pretty text-lg" style={{ color: p.soft }}>
          <strong style={{ color: p.ink }}>{r.roleTh}</strong> {r.strengthTh}
        </p>

        <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: p.accent }}>
          <div className="flex items-center gap-3">
            <ElementIcon element={element} size={40} id="need-me" />
            <span className="text-2xl" style={{ color: p.soft }} aria-hidden="true">
              +
            </span>
            <ElementIcon element={r.needs} size={40} id="need-them" />
          </div>
          <p className="mt-4 text-2xl" style={{ fontFamily: EL_FONT.display }}>
            {r.th}ต้องการ{need.th}
          </p>
          <p className="mt-2 text-pretty" style={{ color: p.soft }}>
            {r.needsWhyTh}
          </p>
        </div>

        <div className="mt-8">
          {me ? (
            <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/hackathon/elemental/quiz/${element}/story`}
                alt={`การ์ดผลแบบทดสอบ: ฉันคือ${r.th}`}
                width={1080}
                height={1920}
                className="mx-auto w-48 rounded-xl border sm:w-full"
                style={{ borderColor: line }}
              />
              <QuizShare element={element} shareText={shareText} />
            </div>
          ) : (
            <Link
              href="/hackathon/elemental/quiz"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
              style={{ backgroundColor: EL.flame, color: EL.char }}
            >
              เธอคือธาตุอะไร ลองทำดู <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>

        <section className="mt-12 border-t pt-8" style={{ borderColor: line }}>
          <div className="flex items-center gap-3">
            <ElementIcon element={element} size={24} id="brief" />
            <p className={tag} style={{ fontFamily: EL_FONT.mono, color: p.soft }}>
              [โจทย์ของ{elementLabel(r.th)}]
            </p>
          </div>
          <h2 className="mt-3 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
            {brief.howMightWeTh}
          </h2>
          <p className="mt-4 text-pretty" style={{ color: p.soft }}>
            <strong style={{ color: p.ink }}>เริ่มจากตรงนี้ได้เลย:</strong> {brief.starterTh}
          </p>
          <p className="mt-3 text-sm" style={{ color: p.soft }}>
            ธาตุของเธอไม่ได้บังคับโจทย์ {ANY_PROBLEM_NOTE}
          </p>
        </section>

        {open && (
          <section className="mt-10 rounded-2xl p-6" style={{ backgroundColor: EL.cream, color: EL.ink }}>
            <div className="flex gap-2" aria-hidden="true">
              {QUIZ_ELEMENTS.map((el) => (
                <ElementIcon key={el} element={el} size={22} id={`cta-${el}`} />
              ))}
            </div>
            <p className="mt-4 text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
              ทำมันจริงใน {ELEMENTAL.days} วัน กับเพื่อนอีก 1 ถึง 4 คน
            </p>
            <p className="mt-2" style={{ color: EL.inkSoft }}>
              {ELEMENTAL.edition} Hackathon {thaiDateLine()} {ELEMENTAL.venueTh} สำหรับ {ELEMENTAL.gradesTh} รางวัลรวม {prizeTotal()} บาท
            </p>
            <p className="mt-4 text-lg">
              มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน <span style={{ color: EL.inkSoft }}>(คนเดียว ฿{ELEMENTAL.priceBaht})</span>
            </p>
            <Link
              href={quizJoinHref(element)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
              style={{ backgroundColor: EL.ink, color: EL.cream }}
            >
              สมัครพร้อมเพื่อน <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm" style={{ color: EL.inkSoft }}>
              ปิดรับสมัคร {formatThaiDate(ELEMENTAL.registrationClosesOn, false)} · <DaysLeft closesOn={ELEMENTAL.registrationClosesOn} />
            </p>
          </section>
        )}

        <section className="mt-12">
          <p className={tag} style={{ fontFamily: EL_FONT.mono, color: p.soft }}>
            [ธาตุอื่นๆ]
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {QUIZ_ELEMENTS.map((el) => (
              <Link
                key={el}
                href={`/hackathon/elemental/quiz/${el}`}
                aria-current={el === element ? "page" : undefined}
                className="flex flex-col items-center gap-2 rounded-xl border px-1 py-3 text-center text-xs"
                style={{ borderColor: el === element ? QUIZ_PALETTE[el].accent : line }}
              >
                <ElementIcon element={el} size={32} id={`all-${el}`} />
                {el === "aether" ? "มองไม่เห็น" : QUIZ_RESULTS[el].th}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-sm">
          <Link href="/hackathon/elemental/quiz" className="underline underline-offset-4" style={{ color: p.soft }}>
            ทำใหม่
          </Link>
          <span style={{ color: p.soft }}> · </span>
          <Link href="/hackathon/elemental?src=quiz" className="underline underline-offset-4" style={{ color: p.soft }}>
            ดูรายละเอียดงาน
          </Link>
        </p>
      </div>
    </main>
  );
}
