import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";

import { ANY_PROBLEM_NOTE, ELEMENT_CHALLENGES } from "./challenges";
import { trirong } from "./fonts";

/**
 * /hackathon: The Next Decade, Elemental. One poster, the three facts
 * people decide on (when, prize, price), how paying works, then sign up.
 * Facts come from ../poster/elemental/facts.ts only.
 */

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: "rgba(29,33,31,0.2)" }}>
      <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
        [{label}]
      </p>
      <p className="mt-1 text-2xl sm:text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {value}
      </p>
      {note && <p className="text-sm" style={{ color: EL.inkSoft }}>{note}</p>}
    </div>
  );
}

function SignUpButton({ href, open }: { href: string; open: boolean }) {
  if (!open) {
    return (
      <span
        className="inline-flex w-full items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold sm:w-auto"
        style={{ boxShadow: `inset 0 0 0 1px ${EL.inkSoft}`, color: EL.inkSoft }}
      >
        ปิดรับสมัครแล้ว
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition-transform active:scale-[0.98] sm:w-auto"
      style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
    >
      สมัครเลย <ArrowRight className="h-5 w-5" />
    </Link>
  );
}

export function ElementalLanding({ joinHref, open }: { joinHref: string; open: boolean }) {
  return (
    <main className={`${trirong.variable} min-h-screen`} style={{ backgroundColor: EL.cream, color: EL.ink }}>
      {/* Hero: the words on the left, the key visual on the right */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-8 md:grid-cols-[1fr_minmax(0,440px)] md:pt-16">
        <div>
          <p className="text-xs sm:text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
            [{ELEMENTAL.series} × PassionSeed]
          </p>
          <h1 className="mt-3" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02 }}>
            <span className="block text-6xl sm:text-8xl" style={{ fontWeight: 200 }}>
              {ELEMENTAL.edition}
            </span>
            <span className="block text-6xl sm:text-8xl" style={{ fontWeight: 300, fontStyle: "italic" }}>
              Hackathon
            </span>
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            ดิน · น้ำ · ลม · ไฟ
          </p>
          <p className="mt-6 max-w-lg text-lg leading-relaxed">
            ปัญหาสิ่งแวดล้อมส่วนใหญ่ไม่ได้เกิดขึ้นเอง มีคนทำให้มันเกิด รวมทีมมาสร้างทางแก้ของจริง
            ตลอดวันหยุดยาว {ELEMENTAL.days} วัน {ELEMENTAL.venueTh} อยู่ที่ไหนก็ร่วมได้
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Fact label="วันที่" value={thaiDateLine()} note={`หยุดยาว ${ELEMENTAL.days} วัน · ${ELEMENTAL.venueTh}`} />
            <Fact label="รางวัลรวม" value={`${prizeTotal()} บาท`} />
            <Fact
              label="ค่าสมัคร"
              value={`฿${ELEMENTAL.groupPriceBaht} / คน`}
              note={`มากับเพื่อน · คนเดียว ฿${ELEMENTAL.priceBaht}`}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SignUpButton href={joinHref} open={open} />
            {open && (
              <p className="text-sm" style={{ color: EL.inkSoft }}>
                รับสมัครถึง {formatThaiDate(ELEMENTAL.registrationClosesOn)}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[440px]">
          <Image
            src="/hackathon/poster/elemental/sheets/elemental-key.webp"
            alt="โปสเตอร์ Elemental Hackathon: หุบเขาริมแม่น้ำที่สงบ ถูกพิกเซลของไฟ ควัน น้ำเสีย และขยะกัดกิน"
            width={1080}
            height={1350}
            priority
            className="h-auto w-full rounded-xl shadow-xl"
          />
        </div>
      </section>

      {/* The five elements */}
      <section style={{ backgroundColor: EL.char, color: EL.cream }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
            [โจทย์]
          </p>
          <h2 className="mt-2 text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>
            ห้าธาตุ ที่มีคนทำพัง
          </h2>
          <ul className="mt-10">
            {ELEMENT_CHALLENGES.map((c) => {
              const el = ELEMENTAL.elements.find((e) => e.key === c.key);
              if (!el) return null;
              return (
                <li
                  key={c.key}
                  className="grid gap-4 border-t py-6 md:grid-cols-[minmax(0,14rem)_1fr_1fr] md:gap-8"
                  style={{ borderColor: "rgba(243,239,230,0.2)" }}
                >
                  <div>
                    <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.flameLight }}>
                      {el.en}
                    </p>
                    <p className="mt-1 text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
                      {el.th}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: EL.creamSoft }}>
                      {c.kind}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
                      [ตัวอย่าง]
                    </p>
                    <p className="mt-1 leading-relaxed">{c.example}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
                      [ผลที่ตามมา]
                    </p>
                    <p className="mt-1 leading-relaxed">{c.effect}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="border-t pt-6 text-sm" style={{ borderColor: "rgba(243,239,230,0.2)", color: EL.creamSoft }}>
            {ANY_PROBLEM_NOTE}
          </p>
        </div>
      </section>

      {/* How to sign up and pay */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          [สมัครยังไง]
        </p>
        <h2 className="mt-2 text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200 }}>
          สมัครครั้งเดียว จ่ายครั้งเดียว ทั้งกลุ่ม
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            ["กรอกชื่อทุกคนในกลุ่ม", `มาได้ ${ELEMENTAL.maxGroupSize} คนต่อการสมัคร หรือมาคนเดียวก็ได้ เราหาทีมให้`],
            ["สแกน QR พร้อมเพย์", "คนเดียวจ่ายให้ทั้งกลุ่มได้เลย ในการโอนครั้งเดียว"],
            ["อัปโหลดสลิป", "ระบบตรวจสลิปให้ทันที แล้วยืนยันที่นั่งบนหน้าเว็บ"],
          ].map(([title, body], i) => (
            <li key={title} className="border-t pt-4" style={{ borderColor: "rgba(29,33,31,0.2)" }}>
              <p className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.flame }}>
                0{i + 1}
              </p>
              <p className="mt-1 text-xl font-semibold">{title}</p>
              <p className="mt-1" style={{ color: EL.inkSoft }}>{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-3 rounded-2xl p-6 text-sm sm:grid-cols-3" style={{ backgroundColor: "rgba(29,33,31,0.05)" }}>
          <p>
            <span className="font-semibold">อายุต่ำกว่า 20 ปี</span> ต้องได้รับความยินยอมจากผู้ปกครอง
            เราขอชื่อและเบอร์ผู้ปกครองตอนสมัคร
          </p>
          <p>
            <span className="font-semibold">ไม่มีการคืนเงิน</span> หลังชำระค่าสมัครแล้ว
          </p>
          <p>
            <span className="font-semibold">ขอแค่ชื่อโรงเรียน</span> เราไม่ขอสำเนาบัตรประชาชน
          </p>
        </div>

        <div className="mt-10">
          <SignUpButton href={joinHref} open={open} />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl border-t px-4 py-8 text-sm sm:px-8" style={{ borderColor: "rgba(29,33,31,0.15)" }}>
        <Link href="/hackathon/past" className="underline underline-offset-4" style={{ color: EL.inkSoft }}>
          ดู Hackathon ที่ผ่านมา
        </Link>
      </footer>
    </main>
  );
}
