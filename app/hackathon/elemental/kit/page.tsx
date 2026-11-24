import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { EVERY_QUESTION_TH, FRAME_MOVES, KIT_TITLE_TH } from "@/components/hackathon/elemental/kit";
import { H2, Tag, WhoCanHelp, kitLine } from "@/components/hackathon/elemental/kit/KitParts";
import { NewsToQuestion } from "@/components/hackathon/elemental/kit/NewsToQuestion";
import { RepairScene } from "@/components/hackathon/elemental/kit/RepairScene";
import { ELEMENT_CHAPTERS, elementLabel } from "@/components/hackathon/elemental/media";
import { TrackStep } from "@/components/hackathon/elemental/TrackStep";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";
import { elementalRegistrationOpen, normalizeSource } from "@/lib/hackathon/elemental/registration";

const TITLE = `${KIT_TITLE_TH} | ห้าปัญหาจริงในไทย`;
const DESCRIPTION =
  "ลองตั้งคำถามจากข่าวใน 2 นาที เลือกเรื่องน้ำ ดิน ลม ไฟ หรืออีเธอร์ แต่ละเรื่องมีแหล่งข้อมูลให้อ่านต่อและคำที่เจอบ่อยในข่าว";

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
        <Tag>ELEMENTAL</Tag>
        <h1 className="mt-4 text-balance text-6xl sm:text-8xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          {KIT_TITLE_TH}
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-xl" style={{ color: EL.creamSoft }}>
          เคยอ่านข่าวแล้วนึกว่า “ทำไมไม่มีใครทำอะไรสักที” ไหม ลองเลือกสักข่าวจากห้าปัญหาในไทย แล้วถามว่าใครกำลังเดือดร้อนและจะช่วยเขาได้ยังไง
        </p>

        <div className="mt-10">
          <RepairScene element="water" />
        </div>

        <section className="mt-16">
          <Tag>ลองกดดู</Tag>
          <H2>ลองดูว่าข่าวหนึ่งเรื่องตั้งเป็นคำถามได้ยังไง</H2>
          <div className="mt-6">
            <NewsToQuestion />
          </div>
        </section>

        <section className="mt-16 border-t pt-10" style={{ borderColor: kitLine }}>
          <Tag>วิธีคิด</Tag>
          <H2>จากข่าวเป็นคำถามใน 4 ขั้น</H2>
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
          <Tag>เลือกธาตุ</Tag>
          <H2>ลองตั้งคำถามใน 2 นาที</H2>
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
          <H2>มีคำถามแล้ว ทำอะไรต่อได้บ้าง</H2>
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
