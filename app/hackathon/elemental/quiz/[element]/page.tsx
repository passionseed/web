import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { ANY_PROBLEM_NOTE, ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { elementLabel } from "@/components/hackathon/elemental/media";
import { PixelCrest } from "@/components/hackathon/elemental/quiz/PixelArt";
import { PlayableIcon } from "@/components/hackathon/elemental/quiz/PlayableIcon";
import fx from "@/components/hackathon/elemental/quiz/quiz.module.css";
import { DaysLeft, QuizShare } from "@/components/hackathon/elemental/quiz/QuizShare";
import { ResultMusic } from "@/components/hackathon/elemental/quiz/ResultMusic";
import { SoundToggle } from "@/components/hackathon/elemental/quiz/SoundToggle";
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
  const title = `ฉันคือ${r.th} | คุณคือธาตุอะไร`;
  const description = `“${r.roastTh}” ทำแบบทดสอบ 8 ข้อ แล้วดูว่าคุณคือธาตุไหน`;
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
  const shareText = `ฉันคือ${r.th} “${r.roastTh}” คุณคือธาตุอะไร`;

  return (
    <main className={`${trirong.variable} min-h-[100dvh] overflow-x-clip`} style={{ backgroundColor: p.bg, color: p.ink }}>
      {/* The element's own theme: carries on from the quiz, or starts on a tap of the icon. */}
      <ResultMusic element={element} />
      {/* The crest, 12 px a pixel on phones and 16 px wider up: whole pixels, never stretched. It drips in a row at a time. */}
      <div className={`mb-8 ${fx.crestIn}`}>
        <div className="sm:hidden">
          <PixelCrest element={element} cell={12} />
        </div>
        <div className="hidden sm:block">
          <PixelCrest element={element} cell={16} />
        </div>
      </div>
      <div className="mx-auto max-w-xl px-6 pb-12">
        <div className="flex items-start justify-between gap-6">
          <div>
            {/* The speaker sits by the tag: tapping the icon plays its sound, so the page needs a way to turn it off. */}
            <div className="-my-[15px] flex items-center gap-1">
              <p className={tag} style={{ fontFamily: EL_FONT.mono, color: p.soft }}>
                [{r.en.toUpperCase()}]
              </p>
              <SoundToggle color={p.soft} />
            </div>
            <p className="mt-6 text-xl">{me ? "คุณคือ" : "เพื่อนคุณคือ"}</p>
          </div>
          <div className="shrink-0 pt-1">
            <PlayableIcon element={element} cell={12} id="hero" label={`ฟังเสียง${elementLabel(r.th)}`} music={element} />
          </div>
        </div>
        <h1 className="mt-2 text-balance text-7xl sm:text-8xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.15 }}>
          {r.th}
        </h1>
        <p className="mt-4 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display }}>
          “{r.roastTh}”
        </p>

        {/* The next step sits right under the result, on the first screen of a phone: share it if it's yours, take the quiz if it's a friend's. */}
        <div className="mt-6">
          {me ? (
            <QuizShare element={element} shareText={shareText} needLabel={need.th} cardAlt={`การ์ดผลแบบทดสอบ: ฉันคือ${r.th}`} />
          ) : (
            <>
              <Link
                href="/hackathon/elemental/quiz"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
                style={{ backgroundColor: EL.flame, color: EL.char }}
              >
                ทำควิซ 8 ข้อ <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-2 text-center text-sm" style={{ color: p.soft }}>
                เพื่อนคุณเป็น{elementLabel(r.th)} แล้วคุณคือธาตุไหน
              </p>
            </>
          )}
          {open && (
            <Link href={quizJoinHref(element)} className="mt-4 inline-flex items-center gap-1 text-sm underline underline-offset-4" style={{ color: p.soft }}>
              สมัคร Elemental Hackathon <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <p className="mt-8 text-pretty text-lg" style={{ color: p.soft }}>
          <strong style={{ color: p.ink }}>{r.roleTh}</strong> {r.strengthTh}
        </p>

        <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: p.accent }}>
          <div className="flex items-center gap-3">
            <ElementIcon element={element} size={36} id="need-me" />
            <span className="text-2xl" style={{ color: p.soft }} aria-hidden="true">
              +
            </span>
            <ElementIcon element={r.needs} size={36} id="need-them" />
          </div>
          <p className="mt-4 text-2xl" style={{ fontFamily: EL_FONT.display }}>
            {r.th}ต้องการ{need.th}
          </p>
          <p className="mt-2 text-pretty" style={{ color: p.soft }}>
            {r.needsWhyTh}
          </p>
        </div>

        {open && (
          <section className="mt-10 rounded-2xl p-6" style={{ backgroundColor: EL.cream, color: EL.ink }}>
            <div className="flex gap-2" aria-hidden="true">
              {QUIZ_ELEMENTS.map((el) => (
                <ElementIcon key={el} element={el} size={18} id={`cta-${el}`} />
              ))}
            </div>
            <p className="mt-4 text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
              ทำมันจริงใน 3 วัน กับเพื่อนอีก 1 ถึง 4 คน
            </p>
            <p className="mt-2" style={{ color: EL.inkSoft }}>
              {ELEMENTAL.edition} Hackathon {thaiDateLine()} ออนไลน์ สำหรับ {ELEMENTAL.gradesTh} รางวัลรวม {prizeTotal()} บาท
            </p>
            <p className="mt-4 text-lg">
              มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} ต่อคน <span style={{ color: EL.inkSoft }}>(คนเดียว ฿{ELEMENTAL.priceBaht})</span>
            </p>
            <Link
              href={quizJoinHref(element)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold"
              style={{ backgroundColor: EL.ink, color: EL.cream }}
            >
              สมัคร Hackathon <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm" style={{ color: EL.inkSoft }}>
              ปิดรับสมัคร {formatThaiDate(ELEMENTAL.registrationClosesOn, false)} · <DaysLeft closesOn={ELEMENTAL.registrationClosesOn} />
            </p>
          </section>
        )}

        <section className="mt-12 border-t pt-8" style={{ borderColor: line }}>
          <div className="flex items-center gap-3">
            <ElementIcon element={element} size={27} id="brief" />
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
            ธาตุของคุณไม่ได้บังคับโจทย์ {ANY_PROBLEM_NOTE}
          </p>
        </section>


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
                <ElementIcon element={el} size={36} id={`all-${el}`} />
                {QUIZ_RESULTS[el].th}
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
