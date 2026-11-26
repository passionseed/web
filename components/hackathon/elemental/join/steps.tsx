import type { ReactNode } from "react";
import { ArrowRight, User, Users } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { ADULT_AGE, elementalPriceBaht } from "@/lib/hackathon/elemental/registration";
import { HEARD_FROM, heardFromLabel } from "@/lib/hackathon/elemental/heard-from";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { formatPhone, type Draft, type Errors, type Mode, type StepKey } from "./draft";
import { CheckRow, Field, TextInput } from "./fields";
import styles from "./join.module.css";

/** One screen per step. Each asks one thing, in the person's own words where we have them. */

export type StepProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Errors;
  team?: PublicTeam;
  /** Pick a mode and move on, for the one step that's a single tap. */
  choose: (mode: Mode) => void;
  goTo: (step: StepKey) => void;
};

/** A small Thai label. Space Mono has no Thai letters, so these use the body font. */
export function Tag({ children, color = EL.inkSoft }: { children: ReactNode; color?: string }) {
  return (
    <p className="text-sm" style={{ color }}>
      {children}
    </p>
  );
}

export function StepTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-balance text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
        {children}
      </h1>
      {sub && (
        <p className="mt-3 text-pretty text-base sm:text-lg" style={{ color: EL.inkSoft }}>
          {sub}
        </p>
      )}
    </header>
  );
}

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

function ModeStep({ draft, team, choose }: StepProps) {
  if (team && draft.mode === "join") {
    return (
      <>
        <StepTitle sub={`เพื่อนชวนมา คนละ ${baht(ELEMENTAL.groupPriceBaht)} แต่ละคนสมัครและจ่ายเอง`}>
          เข้าทีม <span style={{ fontStyle: "italic", fontWeight: 300 }}>{team.name}</span>
        </StepTitle>
        <WhatItIs />
        <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
          <Tag>ในทีมตอนนี้ · ว่างอีก {team.spotsLeft} ที่</Tag>
          <ul className="mt-3 flex flex-wrap gap-2">
            {team.roster.length ? (
              team.roster.map((r, i) => (
                <li key={i} className="rounded-full px-3 py-1 text-sm" style={{ backgroundColor: "rgba(236,100,36,0.1)" }}>
                  {r.name}
                </li>
              ))
            ) : (
              <li className="text-sm" style={{ color: EL.inkSoft }}>ยังไม่มีใคร</li>
            )}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => choose("join")}
          className={`${styles.choice} mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold`}
          style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
        >
          เข้า{teamLabel(team.name)} <ArrowRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => choose("create")}
          className="mt-4 w-full text-center text-sm underline underline-offset-4"
          style={{ color: EL.inkSoft }}
        >
          ไม่ใช่ทีมนี้? สร้างทีมใหม่หรือมาคนเดียว
        </button>
      </>
    );
  }

  const options = [
    { value: "create", icon: Users, title: "มากับเพื่อน", price: ELEMENTAL.groupPriceBaht, note: "สร้างทีม แล้วส่งลิงก์ให้เพื่อนสมัครเอง แต่ละคนจ่ายเอง", unit: "ต่อคน" },
    { value: "solo", icon: User, title: "มาคนเดียว", price: ELEMENTAL.priceBaht, note: "เราช่วยจับคู่เข้าทีมให้ได้", unit: "" },
  ] as const;

  return (
    <>
      <StepTitle sub={`${thaiDateLine()} · ${ELEMENTAL.venueTh} · สมัครก่อน จ่ายทีหลังได้`}>สมัครแบบไหน</StepTitle>
      <div className="grid gap-3" role="radiogroup" aria-label="สมัครแบบไหน">
        {options.map((o) => {
          const on = draft.mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(o.value)}
              className={`${styles.choice} rounded-2xl border bg-white/60 p-5 text-left`}
              style={{ borderColor: on ? EL.flame : "rgba(29,33,31,0.18)", boxShadow: on ? `inset 0 0 0 1px ${EL.flame}` : undefined }}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-lg font-semibold">
                  <o.icon className="h-5 w-5" /> {o.title}
                </span>
                <span className="text-right">
                  <span className="block text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
                    {baht(o.price)}
                  </span>
                  {o.unit && <span className="block text-xs" style={{ color: EL.inkSoft }}>{o.unit}</span>}
                </span>
              </span>
              <span className="mt-2 block text-sm" style={{ color: EL.inkSoft }}>{o.note}</span>
            </button>
          );
        })}
      </div>
      {team && (
        <button
          type="button"
          onClick={() => choose("join")}
          className="mt-5 w-full text-center text-sm underline underline-offset-4"
          style={{ color: EL.inkSoft }}
        >
          กลับไปเข้า{teamLabel(team.name)}
        </button>
      )}
    </>
  );
}

/**
 * What the friend is being invited to. Invite links open straight onto this
 * form, and most invited friends left before naming themselves (12 of 19,
 * 24 to 25 Nov 2026), so the poster's line and the basic facts come first,
 * with the full page a tap away. Lines reused from the poster and the quiz
 * result page.
 */
function WhatItIs() {
  return (
    <section className="mb-6 rounded-2xl p-5" style={{ backgroundColor: EL.char, color: EL.cream }}>
      <p className="text-pretty text-xl leading-snug" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {ELEMENTAL.taglineTh[0]} {ELEMENTAL.taglineTh[1]}
      </p>
      <p className="mt-3 text-pretty text-sm" style={{ color: EL.creamSoft }}>
        {ELEMENTAL.edition} Hackathon {thaiDateLine()} {ELEMENTAL.venueTh} สำหรับ {ELEMENTAL.gradesTh} รางวัลรวม {prizeTotal()} บาท
      </p>
      <LegalLink href="/hackathon/elemental?src=team" className="mt-3 inline-block text-sm">
        ดูรายละเอียดงาน
      </LegalLink>
    </section>
  );
}

function TeamStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle sub="เพื่อนจะเห็นชื่อนี้ตอนกดลิงก์ เปลี่ยนทีหลังได้">ตั้งชื่อทีม</StepTitle>
      <Field label="" error={errors.teamName}>
        <TextInput
          aria-label="ชื่อทีม"
          data-autofocus
          value={draft.teamName}
          maxLength={80}
          invalid={!!errors.teamName}
          enterKeyHint="next"
          onChange={(e) => set({ teamName: e.target.value })}
        />
      </Field>
    </>
  );
}

function NameStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle>ข้อมูลของคุณ</StepTitle>
      <div className="space-y-5">
        <Field label="ชื่อ-นามสกุล" error={errors.fullName}>
          <TextInput
            data-autofocus
            value={draft.fullName}
            autoComplete="name"
            maxLength={120}
            invalid={!!errors.fullName}
            enterKeyHint="next"
            onChange={(e) => set({ fullName: e.target.value })}
          />
        </Field>
        <Field label="ชื่อเล่น (ไม่บังคับ)" hint="เพื่อนในทีมจะเห็นชื่อนี้">
          <TextInput value={draft.nickname} autoComplete="nickname" maxLength={60} enterKeyHint="next" onChange={(e) => set({ nickname: e.target.value })} />
        </Field>
      </div>
    </>
  );
}

const QUICK_AGES = ["15", "16", "17", "18"];

function SchoolStep({ draft, set, errors }: StepProps) {
  const custom = draft.age !== "" && !QUICK_AGES.includes(draft.age);
  return (
    <>
      <StepTitle sub={`งานนี้สำหรับ ${ELEMENTAL.gradesTh}`}>อายุและโรงเรียน</StepTitle>
      <div className="space-y-6">
        <div>
          <span className="text-sm font-medium">อายุ</span>
          <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="อายุ">
            {QUICK_AGES.map((a) => {
              const on = draft.age === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ age: a })}
                  className={`${styles.choice} rounded-xl border py-3.5 text-lg`}
                  style={{
                    borderColor: on ? EL.flame : errors.age ? EL.ember : "rgba(29,33,31,0.2)",
                    backgroundColor: on ? EL.flame : "white",
                    color: on ? EL.flameWhite : EL.ink,
                  }}
                >
                  {a}
                </button>
              );
            })}
            <input
              aria-label="อายุอื่น"
              placeholder="อื่น"
              inputMode="numeric"
              value={custom ? draft.age : ""}
              onChange={(e) => set({ age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              className={`${styles.input} w-full rounded-xl border bg-white py-3.5 text-center text-lg outline-none`}
              style={{ borderColor: custom ? EL.flame : errors.age ? EL.ember : "rgba(29,33,31,0.2)", color: EL.ink }}
            />
          </div>
          {errors.age && (
            <span role="alert" className="mt-1.5 block text-sm" style={{ color: EL.ember }}>
              {errors.age}
            </span>
          )}
        </div>
        <Field label="โรงเรียนหรือสถาบัน" error={errors.school}>
          <TextInput
            value={draft.school}
            maxLength={160}
            autoComplete="organization"
            invalid={!!errors.school}
            enterKeyHint="next"
            onChange={(e) => set({ school: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

function ParentStep({ draft, set, errors }: StepProps) {
  const who = draft.nickname || draft.fullName;
  return (
    <>
      <StepTitle sub={`ต่ำกว่า ${ADULT_AGE} ปี ต้องให้ผู้ปกครองยินยอม ทีมงานอาจโทรยืนยัน`}>ผู้ปกครอง</StepTitle>
      <div className="space-y-5">
        <Field label="ชื่อผู้ปกครอง" error={errors.parentName}>
          <TextInput
            data-autofocus
            value={draft.parentName}
            maxLength={120}
            invalid={!!errors.parentName}
            enterKeyHint="next"
            onChange={(e) => set({ parentName: e.target.value })}
          />
        </Field>
        <Field label="เบอร์โทรผู้ปกครอง" error={errors.parentPhone}>
          <TextInput
            value={draft.parentPhone}
            inputMode="tel"
            placeholder="08x-xxx-xxxx"
            invalid={!!errors.parentPhone}
            enterKeyHint="next"
            onChange={(e) => set({ parentPhone: formatPhone(e.target.value) })}
          />
        </Field>
        <CheckRow checked={draft.parentConsent} onChange={(v) => set({ parentConsent: v })} error={errors.parentConsent}>
          ผู้ปกครองของ{who ? ` ${who}` : "คนนี้"} รู้และยินยอมแล้ว ตามข้อตกลงของงาน
        </CheckRow>
        <p className="-mt-2 text-sm" style={{ color: EL.inkSoft }}>
          ให้ผู้ปกครองอ่าน<LegalLink href="/hackathon/elemental/terms">ข้อตกลงของงาน</LegalLink>ก่อนติ๊ก
        </p>
      </div>
    </>
  );
}

function ContactStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle sub="เราส่งลิงก์จ่ายเงินและข่าวของงานไปที่นี่">ช่องทางติดต่อ</StepTitle>
      <div className="space-y-5">
        <Field label="อีเมล" error={errors.email}>
          <TextInput
            data-autofocus
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={draft.email}
            invalid={!!errors.email}
            enterKeyHint="next"
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="เบอร์โทร" error={errors.phone}>
          <TextInput
            inputMode="tel"
            autoComplete="tel"
            placeholder="08x-xxx-xxxx"
            value={draft.phone}
            invalid={!!errors.phone}
            enterKeyHint="next"
            onChange={(e) => set({ phone: formatPhone(e.target.value) })}
          />
        </Field>
        <Field label="LINE ID (ไม่บังคับ)">
          <TextInput value={draft.lineId} autoCapitalize="none" spellCheck={false} maxLength={60} enterKeyHint="done" onChange={(e) => set({ lineId: e.target.value })} />
        </Field>
      </div>
    </>
  );
}

function HeardStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle sub="ช่วยให้เรารู้ว่าควรไปโพสต์ที่ไหนอีก">เห็นโพสต์ของงานนี้จากที่ไหน</StepTitle>
      <div className="grid gap-3" role="radiogroup" aria-label="เห็นโพสต์จากที่ไหน">
        {HEARD_FROM.map((o) => {
          const on = draft.heardFrom === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ heardFrom: o.value })}
              className={`${styles.choice} rounded-2xl border bg-white/60 px-5 py-4 text-left text-lg`}
              style={{
                borderColor: on ? EL.flame : errors.heardFrom ? EL.ember : "rgba(29,33,31,0.18)",
                boxShadow: on ? `inset 0 0 0 1px ${EL.flame}` : undefined,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {errors.heardFrom && (
        <span role="alert" className="mt-3 block text-sm" style={{ color: EL.ember }}>
          {errors.heardFrom}
        </span>
      )}
    </>
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm" style={{ color: EL.inkSoft }}>{label}</p>
        <p className="mt-0.5 break-words text-base">{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
        แก้
      </button>
    </div>
  );
}

function ReviewStep({ draft, set, errors, team, goTo }: StepProps) {
  const mode = draft.mode ?? "solo";
  const total = elementalPriceBaht(1, mode !== "solo");
  const how = { solo: "มาคนเดียว", create: `สร้าง${teamLabel(draft.teamName)}`, join: `เข้า${teamLabel(team?.name ?? "")}` }[mode];
  return (
    <>
      <StepTitle>ตรวจอีกครั้ง</StepTitle>
      <div className="divide-y divide-[rgba(29,33,31,0.1)] rounded-2xl border bg-white/60 px-5" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
        <SummaryRow label="สมัครแบบไหน" value={how} onEdit={() => goTo(mode === "create" ? "team" : "mode")} />
        <SummaryRow label="ชื่อ" value={`${draft.fullName}${draft.nickname ? ` (${draft.nickname})` : ""}`} onEdit={() => goTo("name")} />
        <SummaryRow label="อายุ · โรงเรียน" value={`${draft.age} ปี · ${draft.school}`} onEdit={() => goTo("school")} />
        {Number(draft.age) < ADULT_AGE && (
          <SummaryRow label="ผู้ปกครอง" value={`${draft.parentName} · ${draft.parentPhone}`} onEdit={() => goTo("parent")} />
        )}
        <SummaryRow
          label="ช่องทางติดต่อ"
          value={[draft.email, draft.phone, draft.lineId && `LINE ${draft.lineId}`].filter(Boolean).join(" · ")}
          onEdit={() => goTo("contact")}
        />
        <SummaryRow label="เห็นโพสต์จาก" value={heardFromLabel(draft.heardFrom)} onEdit={() => goTo("heard")} />
      </div>

      {mode === "solo" && (
        <div className="mt-4">
          <CheckRow checked={draft.wantsTeam} onChange={(v) => set({ wantsTeam: v })}>
            อยากให้ทีมงานช่วยจับคู่เข้าทีม
          </CheckRow>
        </div>
      )}

      <section className="mt-6 space-y-4 rounded-2xl p-5 sm:p-6" style={{ backgroundColor: EL.char, color: EL.cream }}>
        <div className="flex items-baseline justify-between gap-4">
          <span>{mode === "solo" ? "มาคนเดียว" : "ราคาในทีม ต่อคน"}</span>
          <span className="text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            {baht(total)}
          </span>
        </div>
        <p className="text-sm" style={{ color: EL.creamSoft }}>สมัครก่อน จ่ายทีหลังได้ ที่นั่งยืนยันเมื่อจ่ายแล้ว</p>
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(243,239,230,0.2)" }}>
          <CheckRow dark checked={draft.noRefund} onChange={(v) => set({ noRefund: v })} error={errors.noRefund}>
            รับทราบว่า <strong>ไม่มีการคืนเงิน</strong> หลังชำระค่าสมัครแล้ว
          </CheckRow>
          <CheckRow dark checked={draft.contactAfter} onChange={(v) => set({ contactAfter: v })}>
            ให้ PassionSeed ติดต่อเรื่องกิจกรรมอื่นหลังจบ Hackathon ได้ (ไม่บังคับ)
          </CheckRow>
        </div>
      </section>
    </>
  );
}

/** Sits right above the sign-up button on the review step. The terms page covers promotion use and links the privacy policy. */
export function LegalLine() {
  return (
    <p className="mb-3 text-pretty text-center text-xs" style={{ color: EL.inkSoft }}>
      การกดสมัคร ถือว่ายอมรับ<LegalLink href="/hackathon/elemental/terms">ข้อตกลงของงาน</LegalLink>
    </p>
  );
}

/** Opens in a new tab so the answers on this page stay put. */
function LegalLink({ href, children, className = "mx-1" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={`${className} whitespace-nowrap underline underline-offset-4`}>
      {children}
    </a>
  );
}

export const STEP_VIEWS: Record<StepKey, (p: StepProps) => ReactNode> = {
  mode: ModeStep,
  team: TeamStep,
  name: NameStep,
  school: SchoolStep,
  parent: ParentStep,
  contact: ContactStep,
  heard: HeardStep,
  review: ReviewStep,
};
