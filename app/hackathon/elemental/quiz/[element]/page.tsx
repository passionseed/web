import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { ANY_PROBLEM_NOTE, ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { elementLabel } from "@/components/hackathon/elemental/media";
import { DaysLeft, QuizShare } from "@/components/hackathon/elemental/quiz/QuizShare";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { QUIZ_ELEMENTS, QUIZ_RESULTS, isQuizElement, quizJoinHref } from "@/lib/hackathon/elemental/quiz";
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

const line = "rgba(29,33,31,0.16)";

/** One result. ?me=1 means the person just took the quiz; without it, a friend opened a shared link. */
export default async function QuizResultPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { element } = await params;
  if (!isQuizElement(element)) notFound();
  const me = (await searchParams).me === "1";
  const r = QUIZ_RESULTS[element];
  const need = QUIZ_RESULTS[r.needs];
  const brief = ELEMENT_DETAILS[element];
  const open = elementalRegistrationOpen();
  const shareText = `ฉันคือ${r.th} “${r.roastTh}” เธอคือธาตุอะไร`;

  return (
    <main className={`${trirong.variable} min-h-[100dvh]`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          [ELEMENTAL QUIZ] / {r.en.toUpperCase()}
        </p>
        <p className="mt-6 text-xl">{me ? "เธอคือ" : "เพื่อนเธอคือ"}</p>
        <h1 className="text-balance text-7xl sm:text-8xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.15 }}>
          {r.th}
        </h1>
        <p className="mt-4 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display }}>“{r.roastTh}”</p>
        <p className="mt-4 text-pretty text-lg" style={{ color: EL.inkSoft }}>
          <strong style={{ color: EL.ink }}>{r.roleTh}</strong> {r.strengthTh}
        </p>

        <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: line }}>
          <p className="text-2xl" style={{ fontFamily: EL_FONT.display }}>
            {r.th}ต้องการ{need.th}
          </p>
          <p className="mt-2 text-pretty" style={{ color: EL.inkSoft }}>
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
                className="mx-auto w-44 rounded-xl border sm:w-full"
                style={{ borderColor: line }}
              />
              <QuizShare element={element} shareText={shareText} />
            </div>
          ) : (
            <Link
              href="/hackathon/elemental/quiz"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
              style={{ backgroundColor: EL.ink, color: EL.cream }}
            >
              เธอคือธาตุอะไร ลองทำดู <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>

        <section className="mt-12 border-t pt-8" style={{ borderColor: line }}>
          <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
            [โจทย์ของ{elementLabel(r.th)}]
          </p>
          <h2 className="mt-3 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
            {brief.howMightWeTh}
          </h2>
          <p className="mt-4 text-pretty" style={{ color: EL.inkSoft }}>
            <strong style={{ color: EL.ink }}>เริ่มจากตรงนี้ได้เลย:</strong> {brief.starterTh}
          </p>
          <p className="mt-3 text-sm" style={{ color: EL.inkSoft }}>
            ธาตุของเธอไม่ได้บังคับโจทย์ {ANY_PROBLEM_NOTE}
          </p>
        </section>

        {open && (
          <section className="mt-10 rounded-2xl p-6" style={{ backgroundColor: EL.ink, color: EL.cream }}>
            <p className="text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
              ทำมันจริงใน 3 วัน กับเพื่อนอีก 1 ถึง 4 คน
            </p>
            <p className="mt-2" style={{ color: EL.creamSoft }}>
              {ELEMENTAL.edition} Hackathon {thaiDateLine()} ออนไลน์ สำหรับ {ELEMENTAL.gradesTh} รางวัลรวม {prizeTotal()} บาท
            </p>
            <p className="mt-4 text-lg">
              มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน <span style={{ color: EL.creamSoft }}>(คนเดียว ฿{ELEMENTAL.priceBaht})</span>
            </p>
            <Link
              href={quizJoinHref(element)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
              style={{ backgroundColor: EL.flame, color: EL.char }}
            >
              สมัครพร้อมเพื่อน <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm" style={{ color: EL.creamSoft }}>
              ปิดรับสมัคร {formatThaiDate(ELEMENTAL.registrationClosesOn, false)} · <DaysLeft closesOn={ELEMENTAL.registrationClosesOn} />
            </p>
          </section>
        )}

        <p className="mt-10 text-center text-sm">
          <Link href="/hackathon/elemental/quiz" className="underline underline-offset-4" style={{ color: EL.inkSoft }}>
            ทำใหม่
          </Link>
          <span style={{ color: EL.inkSoft }}> · </span>
          <Link href="/hackathon/elemental?src=quiz" className="underline underline-offset-4" style={{ color: EL.inkSoft }}>
            ดูรายละเอียดงาน
          </Link>
        </p>
      </div>
    </main>
  );
}
