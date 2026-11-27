import Image from "next/image";
import type { ReactNode } from "react";

import { trirong } from "@/components/hackathon/elemental/fonts";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";

import { ElementMark, PixelScene, VideoOverlay } from "./PixelArt";
import { OwnerUploader } from "./OwnerUploader";
import { ALL_ELEMENTS, ELEMENT_MARKS, type SceneName } from "./scenes";
import { PassionSeedWordmark } from "@/components/hackathon/PassionSeedWordmark";

/**
 * The Elemental problem-owner kit: what we ask an organisation for (a short
 * problem clip, photos and clips of the place, who they are, the impact),
 * how to film it, and where to upload. Looks like the info poster
 * (poster/elemental/info): the key plate behind a dark veil, grain, cream
 * Trirong, Space Mono [tags].
 */

/** Owners send everything by Sunday 29 November (the problem-owner emails Big sent on 2026-11-25; company-brain private/hackathon-ops/voices-and-speakers.md). */
const DUE = "2026-11-29";
/** The interview workshop owners may join for 20 minutes. */
const WORKSHOP = ELEMENTAL.schedule.find((s) => s.kind === "workshop" && s.time?.startsWith("10:00"));

const PLATE = "/hackathon/poster/elemental/plate-key-blue.png";
const RULE = "1px solid rgba(243,239,230,0.28)";

function Tag({ children, color }: { children: ReactNode; color?: string }) {
  return <span style={{ fontFamily: EL_FONT.mono, fontSize: 14, color: color ?? EL.creamSoft }}>[{children}]</span>;
}

function Section({ tag, title, sub, children, accent }: { tag: string; title: string; sub?: string; children: ReactNode; accent: string }) {
  return (
    <section className="mt-16 sm:mt-20">
      <Tag color={accent}>{tag}</Tag>
      <h2 className="mt-2 text-[38px] leading-[1.2] sm:text-[52px]" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>
        {title}
      </h2>
      {sub && (
        <p className="mt-2 text-[18px] leading-[1.55] sm:text-[21px]" style={{ fontWeight: 300, color: EL.creamSoft }}>
          {sub}
        </p>
      )}
      <div className="mt-7">{children}</div>
    </section>
  );
}

const BEATS = [
  { t: "0–10 วิ", h: "เราคือใคร", p: "ชื่อ ทำงานอะไร อยู่ที่ไหน" },
  { t: "10–30 วิ", h: "ปัญหาคืออะไร", p: "เกิดกับใคร เห็นได้จากอะไร หนักแค่ไหน" },
  { t: "30–45 วิ", h: "ลองแก้แล้ว", p: "ที่ผ่านมาทำอะไรไปบ้าง ติดอยู่ตรงไหน" },
  { t: "45–60 วิ", h: "ฝากโจทย์", p: "“อยากให้น้อง ๆ ช่วยคิดว่า...”" },
];

const PAIRS: { ok: SceneName; no: SceneName; noW: number; noH: number; yes: string; nope: string }[] = [
  { ok: "tall", no: "wide", noW: 96, noH: 54, yes: "แนวตั้ง", nope: "แนวนอน" },
  { ok: "eye", no: "below", noW: 84, noH: 150, yes: "กล้องระดับสายตา", nope: "ถ่ายจากข้างล่าง" },
  { ok: "lit", no: "backlit", noW: 84, noH: 150, yes: "หันหน้ารับแสง", nope: "ย้อนแสง หน้ามืด" },
  { ok: "place", no: "wind", noW: 84, noH: 150, yes: "เห็นพื้นที่จริงข้างหลัง", nope: "ลมแรง เสียงดัง" },
];

const SHOTS: { scene: SceneName; video?: string; title: string; kind: string; body: string }[] = [
  { scene: "portrait", title: "รูปคนเล่า", kind: "รูป", body: "คนละ 1 รูป หน้าตรง ครึ่งตัว พื้นหลังเรียบ แสงธรรมชาติ" },
  { scene: "land", video: "00:12", title: "ภาพกว้างของพื้นที่", kind: "รูป + คลิป", body: "ให้คนที่ไม่เคยไปเห็นว่าที่นั่นเป็นยังไง เช่น แม่น้ำ ทุ่ง ป่า ชุมชน" },
  { scene: "evidence", video: "00:08", title: "ภาพใกล้ของหลักฐาน", kind: "รูป + คลิป", body: "สิ่งที่บอกว่ามีปัญหา เช่น ขยะ ควัน น้ำเสีย ผลตรวจ หรือภาพหน้าจอโพสต์ปลอม" },
  { scene: "work", video: "00:15", title: "ภาพตอนลงพื้นที่", kind: "รูป + คลิป", body: "ผู้ใหญ่กำลังทำงานจริง เช่น เก็บตัวอย่าง ลงพื้นที่ คุยกับชาวบ้าน" },
];

export function OwnerKit({ element, upload }: { element: OwnerElement | null; upload: { org: string; signature: string } | null }) {
  const shown = element ? [element] : ALL_ELEMENTS;
  const accent = element ? ELEMENT_MARKS[element].color : "#ffd067";
  const elementTh = element ? ELEMENTAL.elements.find((e) => e.key === element)?.th : null;

  const asks = [
    { k: "คลิปโจทย์ 1 ถึง 3 คลิป", v: "เรื่องละ 1 คลิป ไม่เกิน 60 วินาที ตามข้อ 01" },
    { k: "คนเล่า", v: "ชื่อ นามสกุล ตำแหน่ง และรูปคนละ 1 รูป" },
    { k: "แนะนำองค์กร", v: "3 ถึง 5 บรรทัด โลโก้ และลิงก์เพจให้เราแท็ก" },
    { k: "ผลกระทบ", v: "ตัวเลขหรือเรื่องจริง เช่น กี่หมู่บ้าน กี่ครอบครัว พร้อมแหล่งที่มาถ้ามี" },
    { k: "รูปและคลิปพื้นที่", v: "รูป 3 ถึง 5 รูป และคลิปสั้น 5 ถึง 15 วินาที ตามข้อ 02" },
  ];

  return (
    <main className={`${trirong.variable} relative min-h-screen overflow-x-hidden`} style={{ backgroundColor: EL.char, color: EL.cream, fontFamily: EL_FONT.display }}>
      {/* The key plate behind a dark veil, then grain, fixed while the page scrolls. */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <Image src={PLATE} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: EL.char, opacity: 0.82 }} />
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.16, mixBlendMode: "screen" }}>
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
            <span style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>×</span>
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
        <h1 className="mt-5 text-[44px] leading-[1.15] sm:text-[72px]" style={{ fontWeight: 200 }}>
          ชุดเจ้าของโจทย์
          <br />
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>{ELEMENTAL.edition}</span> Hackathon
        </h1>
        <p className="mt-4 max-w-[640px] text-[19px] leading-[1.6] sm:text-[22px]" style={{ fontWeight: 300, color: EL.creamSoft }}>
          ขอบคุณที่มาเป็นเจ้าของโจทย์ให้น้อง ๆ ม.3 ถึง ม.6 หน้านี้บอกทุกอย่างที่เราขอ ตัวอย่างวิธีถ่าย และที่อัปโหลดไฟล์
        </p>
        <p className="mt-6 inline-block px-4 py-2 text-[18px] sm:text-[20px]" style={{ border: `1px solid ${accent}`, color: accent, fontWeight: 400 }}>
          ส่งภายใน {formatThaiDate(DUE)}
        </p>

        <Section tag="01" title="คลิปโจทย์ 60 วินาที" sub="เรื่องละ 1 คลิป ส่งได้ 1 ถึง 3 เรื่อง ถ่ายด้วยมือถือได้เลย ไม่ต้องตัดต่อ" accent={accent}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {BEATS.map((b) => (
              <div key={b.t} style={{ borderTop: `2px solid ${EL.cream}`, paddingTop: 12 }}>
                <Tag color={accent}>{b.t}</Tag>
                <h3 className="mt-1 text-[24px] leading-[1.3]" style={{ fontWeight: 400 }}>{b.h}</h3>
                <p className="mt-1 text-[17px] leading-[1.5]" style={{ fontWeight: 300, color: EL.creamSoft }}>{b.p}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[17px] leading-[1.55]" style={{ fontWeight: 300, color: EL.creamSoft, borderLeft: `3px solid ${accent}`, paddingLeft: 14 }}>
            เล่าที่ตัวปัญหา ไม่ต้องเอ่ยชื่อหรือกล่าวหาบริษัท หน่วยงาน หรือบุคคลใด
          </p>

          <h3 className="mt-12 text-[26px]" style={{ fontWeight: 400 }}>ถ่ายแบบนี้</h3>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
            {PAIRS.map((p) => (
              <div key={p.ok}>
                <div className="flex items-end gap-2.5">
                  <div className="flex-[118]" style={{ outline: `2px solid ${EL.cream}`, outlineOffset: 3 }}>
                    <PixelScene scene={p.ok} width={118} height={210} elements={shown} accent={accent} />
                  </div>
                  <div className="flex-[84] opacity-85" style={{ outline: `2px dashed ${EL.flame}`, outlineOffset: 3 }}>
                    <PixelScene scene={p.no} width={p.noW} height={p.noH} elements={shown} accent={accent} />
                  </div>
                </div>
                <p className="mt-4 text-[16px] leading-[1.5] sm:text-[17px]" style={{ fontWeight: 300 }}>
                  <span style={{ color: EL.toxicCyan }}>✓ {p.yes}</span>
                  <br />
                  <span style={{ color: EL.flame }}>✗ {p.nope}</span>
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section tag="02" title="รูปและคลิปที่อยากได้" sub="ส่งไฟล์ต้นฉบับจากมือถือ ไม่ต้องแต่ง ไม่ต้องใส่ข้อความ" accent={accent}>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {SHOTS.map((s, i) => (
              <div key={s.scene}>
                <div className="relative" style={{ outline: `2px solid ${EL.cream}`, outlineOffset: 3 }}>
                  <PixelScene scene={s.scene} width={440} height={250} elements={shown} accent={accent} />
                  {s.video && <VideoOverlay time={s.video} />}
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <Tag color={accent}>{i + 1}</Tag>
                  <h3 className="text-[23px]" style={{ fontWeight: 400 }}>{s.title}</h3>
                  <span className="ml-auto whitespace-nowrap">
                    <Tag>{s.kind}</Tag>
                  </span>
                </div>
                <p className="mt-1 text-[17px] leading-[1.5]" style={{ fontWeight: 300, color: EL.creamSoft }}>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-2 pt-4 sm:flex-row sm:gap-4" style={{ borderTop: RULE }}>
            <span className="flex-none"><Tag color={accent}>คลิปสั้น</Tag></span>
            <p className="text-[18px] leading-[1.55]" style={{ fontWeight: 300 }}>
              คลิปละ 5 ถึง 15 วินาที แนวตั้ง ถือมือถือนิ่ง ๆ ไม่ต้องพูดก็ได้ เราจะใช้ประกอบคลิปโจทย์และโพสต์
            </p>
          </div>
          <p className="mt-4 pt-4 text-[18px] leading-[1.55]" style={{ borderTop: RULE, fontWeight: 300, color: EL.creamSoft }}>
            <span style={{ color: EL.flame, fontWeight: 400 }}>ถ้ามีเด็กหรือนักเรียนในคลิปหรือรูป</span> รบกวนขออนุญาตผู้ปกครองก่อน หรือถ่ายแบบไม่เห็นหน้า
          </p>
        </Section>

        <Section tag="03" title="สิ่งที่เราขอ" accent={accent}>
          <ul>
            {asks.map((a) => (
              <li key={a.k} className="flex gap-4 py-4" style={{ borderTop: RULE }}>
                <span className="mt-1.5 h-5 w-5 flex-none" style={{ border: `2px solid ${EL.cream}` }} />
                <div>
                  <p className="text-[21px] leading-[1.4]" style={{ fontWeight: 400 }}>{a.k}</p>
                  <p className="mt-0.5 text-[17px] leading-[1.5]" style={{ fontWeight: 300, color: EL.creamSoft }}>{a.v}</p>
                </div>
              </li>
            ))}
            <li className="flex gap-4 py-4" style={{ borderTop: RULE, borderBottom: RULE }}>
              <span className="mt-1.5 h-5 w-5 flex-none" style={{ border: `2px dashed ${EL.creamSoft}` }} />
              <div>
                <p className="text-[21px] leading-[1.4]" style={{ fontWeight: 400, color: EL.creamSoft }}>ถ้าสะดวก</p>
                <p className="mt-0.5 text-[17px] leading-[1.5]" style={{ fontWeight: 300, color: EL.creamSoft }}>
                  {WORKSHOP ? `ออนไลน์ 20 นาที ${formatThaiDate(WORKSHOP.date)} ${WORKSHOP.time} ให้ทีมได้ฟังโจทย์จริงและถามคำถาม` : "ออนไลน์ 20 นาทีในเวิร์กช็อปสัมภาษณ์"} และร่วมตัดสินรอบสุดท้ายแบบออนไลน์
                </p>
              </div>
            </li>
          </ul>
        </Section>

        <Section tag="04" title="อัปโหลดไฟล์" sub={`ส่งภายใน ${formatThaiDate(DUE)}`} accent={accent}>
          {upload ? (
            <OwnerUploader org={upload.org} element={element} signature={upload.signature} />
          ) : (
            <p className="text-[19px] leading-[1.6]" style={{ fontWeight: 300 }}>
              ใช้ลิงก์อัปโหลดที่ทีมงานส่งให้องค์กรของคุณ หรือส่งทาง LINE แบบ <span style={{ fontWeight: 400 }}>“ไฟล์”</span> ไม่ใช่ส่งเป็นวิดีโอ ภาพจะได้ไม่แตก
            </p>
          )}
        </Section>
      </div>
    </main>
  );
}
