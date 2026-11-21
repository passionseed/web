import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";

import { trirong } from "./fonts";

/**
 * /hackathon: The Next Decade, Elemental. One poster, the three facts
 * people decide on (when, prize, price), how paying works, then sign up.
 * Facts come from ../poster/elemental/facts.ts only.
 */

const ELEMENT_LINES: Record<string, string> = {
  earth: "ขยะและดินที่ปนเปื้อน",
  water: "น้ำเสียที่ไหลลงแม่น้ำ",
  air: "ฝุ่นและควันที่ลอยอยู่ในอากาศ",
  fire: "การเผาที่ลุกลามจนคุมไม่อยู่",
};

const ORDER = ["earth", "water", "air", "fire", "aether"] as const;

function HeroFact({ above, big, below }: { above?: string; big: string; below?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs sm:text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        {above ?? "\u00a0"}
      </p>
      <p className="mt-1 text-xl leading-tight sm:text-4xl lg:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {big}
      </p>
      <p className="mt-1 text-xs sm:text-sm" style={{ color: EL.creamSoft }}>
        {below ?? "\u00a0"}
      </p>
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
      {/*
        Hero: the animated key visual is the whole first screen (the same
        plate as the poster, without its type, from scripts/render-elemental-plate.mjs).
        The type is live text on top. Reduced motion gets the still.
      */}
      <section className="el-hero relative isolate flex min-h-[100svh] flex-col overflow-hidden" style={{ backgroundColor: "#2a2b26", color: EL.cream }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hackathon/elemental/hero-still.webp"
          alt="หุบเขาริมแม่น้ำที่สงบ ถูกพิกเซลของไฟ ควัน น้ำเสีย และขยะกัดกิน"
          width={1080}
          height={1350}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          style={{ objectPosition: "var(--el-pos)" }}
        />
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-reduce:hidden"
          style={{ objectPosition: "var(--el-pos)" }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hackathon/elemental/hero-still.webp"
          aria-hidden="true"
        >
          <source src="/hackathon/elemental/hero.webm" type="video/webm" />
          <source src="/hackathon/elemental/hero.mp4" type="video/mp4" />
        </video>
        {/* Keep the fire in frame: it sits right of centre on the poster. */}
        <style>{`.el-hero{--el-pos:72% 50%;--el-scrim:linear-gradient(0deg,rgba(15,15,13,.92) 0%,rgba(15,15,13,.7) 30%,rgba(15,15,13,0) 58%),linear-gradient(180deg,rgba(15,15,13,.6) 0%,rgba(15,15,13,0) 34%)}@media(min-width:768px){.el-hero{--el-pos:55% 64%;--el-scrim:linear-gradient(90deg,rgba(15,15,13,.72) 0%,rgba(15,15,13,.4) 42%,rgba(15,15,13,0) 70%),linear-gradient(0deg,rgba(15,15,13,.88) 0%,rgba(15,15,13,.55) 22%,rgba(15,15,13,0) 48%),linear-gradient(180deg,rgba(15,15,13,.5) 0%,rgba(15,15,13,0) 28%)}}`}</style>
        {/* Scrims: ink behind the words on the left and under the facts */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "var(--el-scrim)",
          }}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
          {/* Co-brand lockup */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} className="h-8 w-auto sm:h-10" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
            <span className="text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>×</span>
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/passion-seed-logo.png" alt="" width={50} height={50} className="h-8 w-8 sm:h-10 sm:w-10" />
              <span className="text-lg sm:text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>PassionSeed</span>
            </span>
          </div>

          {/* Title */}
          <div className="mt-8 md:mt-14">
            <h1 style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
              <span className="block text-6xl sm:text-8xl xl:text-9xl" style={{ fontWeight: 200 }}>
                {ELEMENTAL.edition}
              </span>
              <span className="block text-6xl sm:text-8xl xl:text-9xl" style={{ fontWeight: 300, fontStyle: "italic" }}>
                Hackathon
              </span>
            </h1>
            <p className="mt-3 text-2xl sm:text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
              ดิน · น้ำ · ลม · ไฟ
            </p>
          </div>

          {/* Bottom group: the pitch and the button, then the three facts people decide on */}
          <div className="mt-auto pt-10">
            <div className="md:max-w-[34rem]">
              <p className="max-w-md text-base leading-relaxed sm:text-lg" style={{ color: EL.creamSoft }}>
                ปัญหาสิ่งแวดล้อมส่วนใหญ่ไม่ได้เกิดขึ้นเอง มีคนทำให้มันเกิด รวมทีมมาสร้างทางแก้ของจริง
                ตลอดวันหยุดยาว {ELEMENTAL.days} วัน {ELEMENTAL.venueTh} อยู่ที่ไหนก็ร่วมได้
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <SignUpButton href={joinHref} open={open} />
                {open && (
                  <p className="text-sm" style={{ color: EL.creamSoft }}>
                    รับสมัครถึง {formatThaiDate(ELEMENTAL.registrationClosesOn)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t pt-5 sm:gap-8 sm:pt-6" style={{ borderColor: "rgba(243,239,230,0.25)" }}>
              <HeroFact above="วันที่" big={thaiDayRange()} below={`${ELEMENTAL.startDate.slice(0, 4)} · หยุดยาว ${ELEMENTAL.days} วัน`} />
              <HeroFact above="รางวัลรวมมูลค่า" big={`${prizeTotal()} บาท`} />
              <HeroFact above="มากับเพื่อน" big={`฿${ELEMENTAL.groupPriceBaht} / คน`} below={`คนเดียว ฿${ELEMENTAL.priceBaht}`} />
            </div>
          </div>
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
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-5">
            {ORDER.map((key) => {
              const el = ELEMENTAL.elements.find((e) => e.key === key);
              if (!el) return null;
              return (
                <li key={key}>
                  <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.flameLight }}>
                    {el.en}
                  </p>
                  <p className="mt-1 text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
                    {el.th}
                  </p>
                  {ELEMENT_LINES[key] && (
                    <p className="mt-1 text-sm" style={{ color: EL.creamSoft }}>
                      {ELEMENT_LINES[key]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
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
