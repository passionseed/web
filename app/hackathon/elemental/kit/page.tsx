import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { EVERY_QUESTION_TH, FRAME_MOVES } from "@/components/hackathon/elemental/kit";
import { H2, Tag, WhoCanHelp, kitLine } from "@/components/hackathon/elemental/kit/KitParts";
import { NewsToQuestion } from "@/components/hackathon/elemental/kit/NewsToQuestion";
import { RepairScene } from "@/components/hackathon/elemental/kit/RepairScene";
import { ELEMENT_CHAPTERS, elementLabel } from "@/components/hackathon/elemental/media";
import { TrackStep } from "@/components/hackathon/elemental/TrackStep";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";

const TITLE = "จากโทษ เป็นโจทย์ | ห้าปัญหาจริงในไทย";
const DESCRIPTION =
  "น้ำ ดิน อากาศ ไฟ และภัยที่มองไม่เห็น ห้าปัญหาจริงในไทย พร้อมแหล่งข้อมูล คำยาก และเครื่องมือ 2 นาที ที่เปลี่ยนความโกรธให้เป็นคำถามที่ลงมือได้ สำหรับทุกคนที่สนใจ";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/hackathon/elemental/kit" },
  openGraph: {
    type: "website",
    siteName: "PassionSeed",
    locale: "th_TH",
    title: TITLE,
    description: DESCRIPTION,
    url: "/hackathon/elemental/kit",
    images: ["/hackathon/elemental/media/key-visual.webp"],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The problem kit's front door, for anyone who cares about these problems:
 * the idea (from blame to a question), the five elements, and three ways in.
 */
export default async function KitPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const src = normalizeSource(first(sp.src) ?? first(sp.utm_source));
  const open = elementalRegistrationOpen();
  const joinHref = `/hackathon/join?src=${src ?? "kit"}&utm_campaign=kit`;

  return (
    <main className={`${trirong.variable} min-h-[100dvh]`} style={{ backgroundColor: EL.char, color: EL.cream }}>
      <TrackStep step="kit_view" detail="index" source={src} />
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-12 sm:pt-20">
        <Tag>ELEMENTAL · ชุดเริ่มต้น</Tag>
        <h1 className="mt-4 text-balance text-6xl sm:text-8xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          จากโทษ เป็นโจทย์
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-xl" style={{ color: EL.creamSoft }}>
          ห้าปัญหาจริงในไทย ที่เป็นข่าว คนโกรธ แล้วก็เงียบไป ทุกเรื่องในนี้มีคนทำพัง แปลว่ามีคนซ่อมได้ หน้านี้ชวนคุณเริ่มจากคำถามหนึ่งข้อ
        </p>

        <div className="mt-10">
          <RepairScene element="water" />
        </div>

        <section className="mt-16">
          <Tag>ลองกดดู</Tag>
          <H2>ข่าวบอกว่าอะไรพัง โจทย์ถามว่าซ่อมตรงไหนได้</H2>
          <div className="mt-6">
            <NewsToQuestion />
          </div>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>วิธีคิด</Tag>
          <H2>สี่ขั้น จากความโกรธ ไปเป็นคำถาม</H2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {FRAME_MOVES.map((m, i) => (
              <li key={m.th} className="border-t pt-4" style={{ borderColor: kitLine }}>
                <span className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.flameLight }}>
                  0{i + 1}
                </span>
                <p className="mt-1 text-2xl" style={{ fontFamily: EL_FONT.display }}>
                  {m.th}
                </p>
                <p className="mt-2 text-pretty" style={{ color: EL.creamSoft }}>
                  {m.detailTh}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>เลือกหนึ่งธาตุ</Tag>
          <H2>ตั้งโจทย์ของคุณเอง ใช้เวลา 2 นาที</H2>
          <div className="mt-8 grid gap-4">
            {ELEMENT_CHAPTERS.map((c) => (
              <Link
                key={c.key}
                href={`/hackathon/elemental/kit/${c.key}#frame`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 rounded-2xl border p-5 transition-colors hover:bg-[rgba(243,239,230,0.05)]"
                style={{ borderColor: kitLine }}
              >
                <ElementIcon element={c.key} size={48} id={`kit-${c.key}`} />
                <span>
                  <span className="block text-2xl" style={{ fontFamily: EL_FONT.display }}>
                    {elementLabel(c.th)}
                  </span>
                  <span className="mt-1 block text-pretty text-sm" style={{ color: EL.creamSoft }}>
                    {c.subtitleTh} · {ELEMENT_DETAILS[c.key].ctaTh}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" style={{ color: c.color }} />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>คำถามที่ใช้ได้กับทุกปัญหา</Tag>
          <H2>ก่อนเสนอทางแก้ ถามสี่ข้อนี้</H2>
          <ol className="mt-6 grid gap-3">
            {EVERY_QUESTION_TH.map((q, i) => (
              <li key={q} className="flex gap-4">
                <span style={{ fontFamily: EL_FONT.mono, color: EL.flameLight }}>{i + 1}</span>
                <span className="text-pretty text-lg">{q}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>ใครก็ช่วยได้</Tag>
          <H2>ไม่ต้องเป็นผู้เชี่ยวชาญ แค่เริ่มจากคนหนึ่งคน</H2>
          <div className="mt-6">
            <WhoCanHelp open={open} joinHref={joinHref} />
          </div>
        </section>

        <p className="mt-12 text-center text-sm">
          <Link href="/hackathon/elemental?src=kit" className="underline underline-offset-4" style={{ color: EL.creamSoft }}>
            ดูรายละเอียด Elemental Hackathon
          </Link>
        </p>
      </div>
    </main>
  );
}
