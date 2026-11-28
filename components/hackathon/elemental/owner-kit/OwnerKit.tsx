import Image from "next/image";
import type { ReactNode } from "react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";

import { keep } from "./keep";
import { ElementMark, PixelScene, PixelTick, VideoOverlay } from "./PixelArt";
import { OwnerUploader } from "./OwnerUploader";
import { ALL_ELEMENTS, ELEMENT_MARKS, type SceneName } from "./scenes";
import { ACCENT_TEXT, KIT, MONO_THAI, PUBLIC_ACCENT } from "./tokens";
import { PassionSeedWordmark } from "@/components/hackathon/PassionSeedWordmark";

/**
 * The Elemental problem-owner kit: what we ask an organisation for (one short
 * problem clip, and if they have time, clips and photos of the place), how to
 * film it, and where to upload. Short version first, how-to after. Looks like
 * the info poster (poster/elemental/info): the key plate behind a dark veil,
 * grain, cream Trirong, Space Mono [tags].
 *
 * Readability (2026-11-28 review): body copy is Trirong 400 in KIT.body, never
 * 300 in creamSoft; coloured text uses the light shades in ./tokens, never the
 * pixel colours; Thai lines sit at 1.65; headings set Trirong inline because
 * app/globals.css puts every h1 to h6 in Libre Franklin and Krub.
 */

/**
 * The one deadline on the page: Mon 30 November. company-brain
 * private/hackathon-ops/voices-and-speakers.md: "Done when: 5 element videos
 * live by Mon 30 Nov". (The 2026-11-25 emails said "ideally by Sun 29 Nov".)
 */
const DUE = "2026-11-30";
/** The interview workshop owners may join for 20 minutes. */
const WORKSHOP = ELEMENTAL.schedule.find((s) => s.kind === "workshop" && s.time?.startsWith("10:00"));

/** PassionSeed's public help channels, the same ones the SHIFT pages and emails use. */
const HELP = {
  lineId: "@passionseed",
  lineUrl: "https://line.me/R/ti/p/@passionseed",
  email: "hi@passionseed.org",
};

const PLATE = "/hackathon/poster/elemental/plate-key-blue.png";
const RULE = "1px solid rgba(243,239,230,0.28)";
/** Headings name their face: the global h1 to h6 rule would otherwise win over the inherited Trirong. */
const HEADING = { fontFamily: EL_FONT.display } as const;

/** A [tag]: brackets and digits in Space Mono; a Thai label in Trirong, so it isn't spaced out by a monospace fallback. */
function Tag({ children, color }: { children: string | number; color?: string }) {
  const thai = typeof children === "string" && /[\u0E00-\u0E7F]/.test(children);
  return (
    <span style={{ fontFamily: MONO_THAI, fontSize: 16, fontWeight: 400, color: color ?? KIT.soft }}>
      [<span style={thai ? { fontFamily: EL_FONT.display, padding: "0 0.1em" } : undefined}>{children}</span>]
    </span>
  );
}

function Section({ id, tag, title, sub, children, accentText }: { id?: string; tag: string; title: string; sub?: string; children: ReactNode; accent: string; accentText: string }) {
  return (
    <section id={id} className="mt-16 scroll-mt-6 sm:mt-20">
      <Tag color={accentText}>{tag}</Tag>
      <h2 className="mt-2 text-[38px] leading-[1.25] [text-wrap:balance] sm:text-[52px]" style={{ ...HEADING, fontWeight: 300 }}>
        {title}
      </h2>
      {sub && (
        <p className="mt-2 max-w-[640px] text-[18px] leading-[1.65] [text-wrap:pretty] sm:text-[21px]" style={{ fontWeight: 400, color: KIT.body }}>
          {keep(sub)}
        </p>
      )}
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** A short list of how-to lines under a [tag]. */
function TipBlock({ tag, lead, tips, accent, accentText }: { tag: string; lead?: string; tips: string[]; accent: string; accentText: string }) {
  return (
    <div className="mt-10 flex flex-col gap-2 pt-4 sm:flex-row sm:gap-6" style={{ borderTop: RULE }}>
      <span className="flex-none sm:w-[88px]"><Tag color={accentText}>{tag}</Tag></span>
      <div className="max-w-[640px]">
        {lead && <p className="text-[19px] leading-[1.6] [text-wrap:pretty]" style={{ fontWeight: 400 }}>{keep(lead)}</p>}
        <ul className="mt-1 space-y-2">
          {tips.map((t) => (
            <li key={t} className="flex gap-3 text-[17px] leading-[1.65]" style={{ fontWeight: 400, color: KIT.body }}>
              <span className="mt-[0.7em] h-1.5 w-1.5 flex-none" style={{ background: accent }} aria-hidden="true" />
              <span className="[text-wrap:pretty]">{keep(t)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Help() {
  const link = { color: EL.cream, textDecoration: "underline", textUnderlineOffset: 4 } as const;
  // py-2.5 on an inline link grows its tap area to 44px without changing the line spacing.
  return (
    <p className="mt-8 max-w-[640px] pt-4 text-[17px] leading-[1.75] [text-wrap:pretty]" style={{ borderTop: RULE, fontWeight: 400, color: KIT.body }}>
      <span style={{ color: EL.cream }}>ติดขัดตรงไหน</span> ทัก LINE{" "}
      <a href={HELP.lineUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap py-2.5" style={link}>{HELP.lineId}</a> หรืออีเมล{" "}
      <a href={`mailto:${HELP.email}`} className="whitespace-nowrap py-2.5" style={link}>{HELP.email}</a> หรือตอบกลับข้อความที่ส่งลิงก์นี้มา{keep("ได้เลย")}
    </p>
  );
}

/** The four questions the owner answers out loud; someone off camera asks them. */
const QUESTIONS = [
  { h: "คุณคือใคร ทำงานอะไร", p: "ชื่อ องค์กร อยู่ที่ไหน" },
  { h: "ปัญหาที่เห็นทุกวันคืออะไร", p: "เกิดกับใคร เห็นได้จากอะไร" },
  { h: "ลองแก้อะไรไปแล้ว", p: "ติดอยู่ตรงไหน" },
  { h: "อยากให้น้อง ๆ ช่วยคิดเรื่องอะไร", p: "“อยากให้น้อง ๆ ช่วยคิดว่า...”" },
];

const TALK_TIPS = [
  "ให้เพื่อนร่วมงานถือมือถือแล้วถามทีละข้อ มองที่คนถาม ไม่ต้องมองจอ",
  "พูดผิดก็พูดประโยคนั้นใหม่ได้เลย ไม่ต้องหยุดอัด เราตัดให้",
  "รอ 2 วินาทีก่อนเริ่มพูด และหลังพูดจบ",
  "ถ่ายคนเดียวก็ได้ วางมือถือไว้ระดับสายตา เช่น พิงกองหนังสือหรือแก้ว ใช้กล้องหน้าได้",
];

const SOUND_TIPS = [
  "อยู่ห่างมือถือไม่เกิน 1 ช่วงแขน",
  "หลบลมหลังกำแพงหรืออาคาร หรือถ่ายในห้องข้างหน้าต่าง",
  "ปิดพัดลมและแอร์ อยู่ห่างจากถนน",
  "อัดลอง 5 วินาที แล้วเปิดฟังก่อนถ่ายจริง",
];

type Pair = { ok: SceneName; no: SceneName; noWide?: boolean; yes: string; nope: string };

const PAIRS: Pair[] = [
  { ok: "tall", no: "wide", noWide: true, yes: "แนวตั้ง", nope: "แนวนอน" },
  { ok: "eye", no: "below", yes: "กล้องระดับสายตา", nope: "ถ่ายจากข้างล่าง" },
  { ok: "lit", no: "backlit", yes: "หันหน้ารับแสง", nope: "ย้อนแสง หน้ามืด" },
  { ok: "close", no: "far", yes: "ใกล้มือถือ เสียงชัด", nope: "ไกลมือถือ เสียงลมกลบ" },
  { ok: "place", no: "wall", yes: "เห็นพื้นที่จริงข้างหลัง", nope: "กำแพงเปล่า" },
];

/** Frame sizes for the pairs: 9:16 and 16:9 at the same height and pixel size. */
const TALL = { w: 120, h: 213 };
const WIDE = { w: 378, h: 213 };

const SHOTS: { scene: SceneName; video?: string; title: string; kind: string; body: string }[] = [
  { scene: "land", video: "00:12", title: "ภาพกว้างของพื้นที่", kind: "คลิป + รูป", body: "ให้คนที่ไม่เคยไปเห็นว่าที่นั่นเป็นยังไง เช่น แม่น้ำ ทุ่ง ป่า ชุมชน" },
  { scene: "evidence", video: "00:08", title: "ภาพใกล้ของหลักฐาน", kind: "คลิป + รูป", body: "สิ่งที่บอกว่ามีปัญหา เช่น ขยะ ควัน น้ำเสีย ผลตรวจ หรือภาพหน้าจอโพสต์ปลอม" },
  { scene: "work", video: "00:15", title: "ภาพตอนลงพื้นที่", kind: "คลิป + รูป", body: "ผู้ใหญ่กำลังทำงานจริง เช่น เก็บตัวอย่าง คุยกับชาวบ้าน" },
  { scene: "portrait", title: "รูปคนเล่า", kind: "รูป", body: "1 รูป หน้าตรง ครึ่งตัว พื้นหลังเรียบ แสงธรรมชาติ" },
];

/** One example frame with a ✓ or ✗ in its corner. */
function Frame({ scene, size, good, elements, accent }: { scene: SceneName; size: { w: number; h: number }; good: boolean; elements: readonly OwnerElement[]; accent: string }) {
  return (
    <div
      className="relative min-w-0"
      style={{ flex: `${size.w / size.h} 1 0`, outline: good ? `2px solid ${EL.cream}` : `2px dashed ${EL.flame}`, outlineOffset: 3 }}
    >
      <PixelScene scene={scene} width={size.w} height={size.h} cell={4} elements={elements} accent={accent} />
      <span
        className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center"
        style={{ background: good ? EL.toxicCyan : EL.flame, color: EL.char }}
        aria-hidden="true"
      >
        <PixelTick good={good} size={14} />
      </span>
    </div>
  );
}

export function OwnerKit({
  element,
  upload,
  linkBroken = false,
}: {
  element: OwnerElement | null;
  upload: { org: string; signature: string } | null;
  /** The URL had an upload signature that didn't check out (cut short when copied, or the wrong element). */
  linkBroken?: boolean;
}) {
  const shown = element ? [element] : ALL_ELEMENTS;
  /** accent: pixel marks, bullets and rules. accentText: any accent that colours text, light enough to read on the plate. */
  const accent = element ? ELEMENT_MARKS[element].color : PUBLIC_ACCENT;
  const accentText = element ? ACCENT_TEXT[element] : PUBLIC_ACCENT;
  const elementTh = element ? ELEMENTAL.elements.find((e) => e.key === element)?.th : null;
  const due = formatThaiDate(DUE);

  const steps = [
    "ถ่ายคลิปเล่าปัญหาราว 1 นาที แนวตั้ง ด้วยมือถือ",
    upload ? "กดอัปโหลดที่ข้อ 04 ท้ายหน้านี้" : "ส่งไฟล์ให้ทีมงานตามข้อ 04",
    `ภายใน ${due} ส่งก่อนได้ยิ่งดี`,
  ];

  const optional = [
    { k: "คลิปสั้นและรูปของพื้นที่", v: "2 ถึง 3 คลิป คลิปละ 5 ถึง 15 วินาที ตามข้อ 03" },
    { k: "ชื่อ ตำแหน่ง และรูปคนเล่า", v: upload ? "ไว้ใส่ใต้คลิปให้ถูก พิมพ์ในช่องข้อความตอนอัปโหลดได้" : "ไว้ใส่ใต้คลิปให้ถูก" },
    { k: "โลโก้และลิงก์เพจ", v: "ให้เราแท็กในโพสต์" },
    {
      k: "เวิร์กช็อปออนไลน์ 20 นาที",
      v: `${WORKSHOP ? `${formatThaiDate(WORKSHOP.date)} ${WORKSHOP.time} ` : ""}ให้ทีมได้ฟังโจทย์จริงและถามคำถาม และร่วมตัดสินรอบสุดท้ายแบบออนไลน์`,
    },
  ];

  /** What the 2026-11-25 invitation emails promised owners, nothing more. */
  const gets = [
    "ทีมน้อง ๆ ดูคลิปนี้เพื่อเข้าใจปัญหาจริงก่อนเริ่มคิด",
    `ชื่อองค์กรในฐานะเจ้าของโจทย์${elementTh ? `ธาตุ${elementTh}` : ""} บน passionseed.org/hackathon/elemental`,
    "1 โพสต์เล่าโจทย์บน Instagram และ TikTok ของเรา แท็กองค์กร",
    "สรุปผลงานของทีมที่ทำโจทย์ของคุณหลังจบงาน",
  ];

  return (
    <main className={`${trirong.variable} relative min-h-screen overflow-x-hidden`} style={{ backgroundColor: EL.char, color: EL.cream, fontFamily: EL_FONT.display }}>
      {/* The key plate behind a dark veil, then grain, fixed while the page scrolls. */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <Image src={PLATE} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: EL.char, opacity: 0.9 }} />
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.08, mixBlendMode: "screen" }}>
          <filter id="owner-kit-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.5" />
          </filter>
          <rect width="100%" height="100%" filter="url(#owner-kit-grain)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[920px] px-5 pb-24 pt-8 sm:px-10 sm:pt-12">
        <header className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={90} height={36} className="h-7 w-auto sm:h-9" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
            <span style={{ fontFamily: EL_FONT.mono, color: KIT.soft }} aria-hidden="true">×</span>
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/passion-seed-logo.png" alt="" width={34} height={34} />
              <PassionSeedWordmark height={19} />
            </span>
          </span>
          <span className="whitespace-nowrap">
            <Tag>{elementTh ? `ธาตุ${elementTh}` : "เจ้าของโจทย์"}</Tag>
          </span>
        </header>

        <div className="mt-12 flex flex-wrap items-center gap-2">
          {shown.map((k) => (
            <ElementMark key={k} element={k} size={element ? 52 : 32} />
          ))}
        </div>
        <h1 className="mt-5 text-[44px] leading-[1.25] sm:text-[72px]" style={{ ...HEADING, fontWeight: 300 }}>
          ชุดเจ้าของโจทย์
          <br />
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>{ELEMENTAL.edition}</span> Hackathon
        </h1>
        <p className="mt-4 max-w-[640px] text-[19px] leading-[1.65] [text-wrap:pretty] sm:text-[22px]" style={{ fontWeight: 400, color: KIT.body }}>
          {keep("ขอบคุณที่มาเป็นเจ้าของโจทย์ให้น้อง ๆ ม.3 ถึง ม.6 หน้านี้บอกทุกอย่างที่เราขอ ตัวอย่างวิธีถ่าย และที่อัปโหลดไฟล์")}
        </p>
        {/* The one deadline: on a dark panel so it reads on every part of the plate, in every element colour. */}
        <p
          className="mt-6 inline-block px-4 py-2 text-[19px] sm:text-[21px]"
          style={{ border: `2px solid ${accentText}`, background: KIT.panel, color: accentText, fontWeight: 400 }}
        >
          ส่งภายใน {due}
        </p>

        <ol className="mt-6 max-w-[640px]">
          {steps.map((step, i) => (
            <li key={step} className="flex items-baseline gap-4 py-2.5 text-[19px] leading-[1.6]" style={{ borderTop: RULE, fontWeight: 400, color: i === 0 ? EL.cream : KIT.body }}>
              <Tag color={accentText}>{i + 1}</Tag>
              <span className="[text-wrap:pretty]">{keep(step)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>
          {keep("คลิปเดียวก็ครบแล้ว ถ่ายเสร็จส่งมาก่อนได้เลย รูปและอย่างอื่นค่อยส่งตามมา")}
        </p>
        {(upload || linkBroken) && (
          <a
            href="#upload"
            className="mt-6 flex min-h-[56px] w-full items-center justify-center px-5 py-3 text-[20px] sm:w-auto sm:max-w-[360px]"
            style={{ background: EL.cream, color: EL.ink, fontWeight: 400 }}
          >
            {upload ? "อัปโหลดไฟล์" : "ส่งไฟล์"} ↓
          </a>
        )}

        <Section tag="01" title="สิ่งที่เราขอ" accent={accent} accentText={accentText}>
          <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:gap-6">
            <span className="flex-none sm:w-[110px]"><Tag color={accentText}>ต้องมี</Tag></span>
            <div>
              <p className="text-[23px] leading-[1.4]" style={{ fontWeight: 400 }}>คลิปเล่าโจทย์ 1 คลิป</p>
              <p className="mt-0.5 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>
                ราว 1 นาที ถ่ายตามข้อ 02 <span style={{ color: EL.cream, fontWeight: 600 }}>ส่งแค่นี้ก็พอแล้ว</span> ถ้ามีหลายเรื่อง ส่งได้ถึง 3 คลิป
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:gap-6" style={{ borderTop: RULE }}>
            <span className="flex-none sm:w-[110px]"><Tag>ถ้ามีเวลา</Tag></span>
            <ul className="space-y-3">
              {optional.map((a) => (
                <li key={a.k}>
                  <p className="text-[19px] leading-[1.45]" style={{ fontWeight: 400, color: EL.cream }}>{a.k}</p>
                  <p className="mt-0.5 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>{keep(a.v)}</p>
                </li>
              ))}
            </ul>
          </div>
          <TipBlock accentText={accentText} tag="ได้อะไร" tips={gets} accent={accent} />
        </Section>

        <Section tag="02" title="คลิปเล่าโจทย์ ราว 1 นาที" sub="ถ่ายด้วยมือถือได้เลย ไม่ต้องตัดต่อ เกินนิดหน่อยไม่เป็นไร เราตัดให้" accent={accent} accentText={accentText}>
          <p className="max-w-[640px] text-[19px] leading-[1.6]" style={{ fontWeight: 400 }}>ตอบ 4 คำถามนี้ ทีละข้อ</p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {QUESTIONS.map((q, i) => (
              <div key={q.h} style={{ borderTop: `2px solid ${EL.cream}`, paddingTop: 12 }}>
                <Tag color={accentText}>{i + 1}</Tag>
                <h3 className="mt-1 text-[21px] leading-[1.4] [text-wrap:balance]" style={{ ...HEADING, fontWeight: 400 }}>{q.h}</h3>
                <p className="mt-1 text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>{keep(q.p)}</p>
              </div>
            ))}
          </div>
          <TipBlock accentText={accentText} tag="ถ่าย" tips={TALK_TIPS} accent={accent} />
          <p className="mt-6 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body, borderLeft: `3px solid ${accent}`, paddingLeft: 14 }}>
            เล่าที่ตัวปัญหา ไม่ต้องเอ่ยชื่อหรือกล่าวหาบริษัท หน่วยงาน หรือบุคคลใด
          </p>
          <p className="mt-3 max-w-[640px] text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body, borderLeft: `3px solid ${EL.flame}`, paddingLeft: 14 }}>
            <span style={{ color: KIT.warn, fontWeight: 600 }}>ถ้ามีเด็กหรือนักเรียนในคลิป</span> {keep("รบกวนขออนุญาตผู้ปกครองเป็นลายลักษณ์อักษรก่อน หรือถ่ายแบบไม่เห็นหน้า")}
          </p>

          <h3 className="mt-12 text-[26px] leading-[1.35]" style={{ ...HEADING, fontWeight: 400 }}>ถ่ายแบบนี้</h3>
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
            {PAIRS.map((p) => {
              const no = p.noWide ? WIDE : TALL;
              const ratio = TALL.w / TALL.h + no.w / no.h;
              return (
                <div key={p.ok}>
                  {/* Both frames at the same height; tall pairs capped so they don't fill the phone. */}
                  <div className="flex items-end gap-4" style={{ maxWidth: Math.round(230 * ratio) }}>
                    <Frame scene={p.ok} size={TALL} good elements={shown} accent={accent} />
                    <Frame scene={p.no} size={no} good={false} elements={shown} accent={accent} />
                  </div>
                  <p className="mt-4 text-[17px] leading-[1.65]" style={{ fontWeight: 400 }}>
                    <span className="whitespace-nowrap" style={{ color: KIT.ok }}>
                      <PixelTick good /> <span className="sr-only">✓</span>{p.yes}
                    </span>
                    <span className="mx-2" style={{ color: KIT.soft }} aria-hidden="true">·</span>
                    <span className="whitespace-nowrap" style={{ color: KIT.warn }}>
                      <PixelTick good={false} /> <span className="sr-only">✗</span>{p.nope}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          <TipBlock accentText={accentText} tag="เสียง" lead="ภาพไม่สวยยังพอแก้ได้ แต่เสียงไม่ชัดแก้ไม่ได้" tips={SOUND_TIPS} accent={accent} />
          <TipBlock accentText={accentText} tag="ไฟล์" tips={["ตั้งกล้องเป็น 1080p ก็พอ ไม่ต้อง 4K ไฟล์เล็กกว่ามาก อัปโหลดเร็วกว่า"]} accent={accent} />
        </Section>

        <Section tag="03" title="คลิปและรูปของพื้นที่" sub="ถ้ามีเวลา ส่งไฟล์ต้นฉบับจากมือถือ ไม่ต้องแต่ง ไม่ต้องใส่ข้อความ" accent={accent} accentText={accentText}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
            {SHOTS.map((s, i) => (
              <div key={s.scene} className="min-w-0">
                <div className="relative" style={{ outline: `2px solid ${EL.cream}`, outlineOffset: 3 }}>
                  <PixelScene scene={s.scene} width={180} height={320} cell={4} elements={shown} accent={accent} />
                  {s.video && <VideoOverlay time={s.video} />}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <Tag color={accentText}>{i + 1}</Tag>
                  <Tag>{s.kind}</Tag>
                </div>
                <h3 className="mt-1 text-[20px] leading-[1.4] [text-wrap:balance]" style={{ ...HEADING, fontWeight: 400 }}>{keep(s.title)}</h3>
                <p className="mt-1 text-[17px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>{keep(s.body)}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-2 pt-4 sm:flex-row sm:gap-6" style={{ borderTop: RULE }}>
            <span className="flex-none sm:w-[88px]"><Tag color={accentText}>คลิปสั้น</Tag></span>
            <p className="max-w-[640px] text-[18px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>
              {keep("คลิปละ 5 ถึง 15 วินาที ถือมือถือนิ่ง ๆ ไม่ต้องพูดก็ได้")} <span style={{ color: EL.cream, fontWeight: 600 }}>ทุกคลิปถ่ายแนวตั้ง</span> เราจะใช้ประกอบคลิปโจทย์และโพสต์
            </p>
          </div>
          <p className="mt-4 max-w-[640px] pt-4 text-[18px] leading-[1.65] [text-wrap:pretty]" style={{ borderTop: RULE, fontWeight: 400, color: KIT.body }}>
            <span style={{ color: KIT.warn, fontWeight: 600 }}>ถ้ามีเด็กหรือนักเรียนในคลิปหรือรูป</span> {keep("รบกวนขออนุญาตผู้ปกครองก่อน หรือถ่ายแบบไม่เห็นหน้า")}
          </p>
        </Section>

        <Section id="upload" tag="04" title="อัปโหลดไฟล์" sub={`ส่งภายใน ${due}`} accent={accent} accentText={accentText}>
          {upload ? (
            <OwnerUploader org={upload.org} element={element} signature={upload.signature} due={due} />
          ) : (
            <>
              {linkBroken ? (
                <p
                  className="max-w-[640px] px-4 py-3 text-[19px] leading-[1.65] [text-wrap:pretty]"
                  style={{ fontWeight: 400, color: KIT.warn, background: KIT.panel, borderLeft: `3px solid ${EL.flame}` }}
                  role="alert"
                >
                  {keep("ลิงก์อัปโหลดนี้ไม่ครบ ลองเปิดจากข้อความเดิมอีกครั้ง หรือทักทีมงานเพื่อขอลิงก์ใหม่")}
                </p>
              ) : (
                <p className="text-[19px] leading-[1.65]" style={{ fontWeight: 400 }}>
                  ใช้ลิงก์อัปโหลดที่ทีมงานส่งให้องค์กรของคุณ
                </p>
              )}
              <p className="mt-4 max-w-[640px] text-[19px] leading-[1.65] [text-wrap:pretty]" style={{ fontWeight: 400, color: KIT.body }}>
                หรือส่งทาง LINE {HELP.lineId} แบบ <span style={{ color: EL.cream, fontWeight: 600 }}>“ไฟล์”</span> ไม่ใช่ส่งเป็นวิดีโอ ภาพจะได้ไม่แตก
              </p>
              <a
                href={HELP.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex min-h-[56px] w-full items-center justify-center px-5 py-3 text-[20px] sm:w-auto sm:max-w-[360px]"
                style={{ background: EL.cream, color: EL.ink, fontWeight: 400 }}
              >
                เปิด LINE {HELP.lineId}
              </a>
            </>
          )}
          <Help />
        </Section>
      </div>
    </main>
  );
}
