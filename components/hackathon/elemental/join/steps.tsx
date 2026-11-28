import type { CSSProperties, ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { buddyOweLabel, type BuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { ADULT_AGE, GRADE_LABEL_TH, GRADE_VALUES, elementalPriceBaht, type Grade } from "@/lib/hackathon/elemental/registration";
import { HEARD_FROM } from "@/lib/hackathon/elemental/heard-from";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import cinema from "../elemental-cinema.module.css";
import { Body, DarkSlab, EditorialLink, Fine, H1, H2, PixelEdge, PixelIcon, Tag, TextInput, v } from "../share/ui";
import {
  ageChoicesFor,
  cleanEmailInput,
  cleanPhone,
  formatPhone,
  isMinor,
  modeOf,
  suggestEmail,
  teamNameFor,
  type BuddyPassOffer,
  type Draft,
  type Errors,
  type Mode,
  type StepKey,
} from "./draft";
import { AlreadySignedUp } from "./AlreadySignedUp";
import { CheckRow } from "./fields";
import { SchoolField } from "./SchoolField";
import styles from "./join.module.css";

/**
 * The three sign-up screens: about you, contact (with the parent for under-20s),
 * review and agree. Built from the Elemental paper primitives (share/ui.tsx):
 * Trirong titles and prices, Bai Jamjuree for everything you read, Space Mono
 * only for [tags]; square choices with a 1px rule and 2px ink when picked. The
 * screen's one primary action sits in JoinFlow's bar.
 *
 * Copy: lines kept from the one-question-a-screen form are unmarked; new lines
 * are marked "PLACEHOLDER copy (Angpao)" until Angpao rewrites them.
 */

export type StepProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  /** Check one box when it loses focus (format only; JoinFlow keeps the error). */
  blur: (field: keyof Draft) => void;
  errors: Errors;
  /** Boxes that have lost focus at least once. */
  touched: Partial<Record<keyof Draft, boolean>>;
  team?: PublicTeam;
  buddyPass?: BuddyPassOffer;
  /** Switch how they sign up without leaving the screen. */
  setMode: (mode: Mode) => void;
  /** Open a screen to fix an answer, from the review. */
  goTo: (step: StepKey) => void;
  /** PR previews and local dev: nothing is sent. */
  demo?: boolean;
};

// ---------- Type helpers (spans, so they can sit inside buttons) ----------

const display = (weight: 200 | 300 | 400, size: number, lineHeight: number | string): CSSProperties => ({
  fontFamily: EL_FONT.display,
  fontWeight: weight,
  fontSize: size,
  lineHeight,
});
const itemTitle: CSSProperties = { fontFamily: EL_FONT.body, fontWeight: 600, fontSize: 18, lineHeight: "28px" };
const secondary: CSSProperties = { fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: v.secondary };
const errorText: CSSProperties = { fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: v.error };
const label: CSSProperties = { fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" };

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

export function StepTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-8">
      <H1>{children}</H1>
      {sub && (
        <p className="mt-3 text-pretty" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px", color: v.secondary }}>
          {sub}
        </p>
      )}
    </header>
  );
}

/** "(ไม่บังคับ)" after a label, in the secondary colour. */
const Optional = ({ children }: { children: ReactNode }) => <span style={{ color: v.secondary }}>{children}</span>;

function GroupError({ children, className = "mt-2" }: { children?: string; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={className} style={errorText}>
      {children}
    </p>
  );
}

/** A secondary way out ("ไม่ใช่ทีมนี้? …"): the landing's Trirong italic link. */
function AltChoice({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div className="mt-6">
      <EditorialLink onClick={onClick} size="sm">
        {children}
      </EditorialLink>
    </div>
  );
}

// ---------- Screen 1: about you ----------

/** A friend's team link opens here: the team, who's in it, and a way back for someone already signed up. */
function TeamHeader({ team, demo }: { team: PublicTeam; demo?: boolean }) {
  return (
    <>
      <StepTitle sub={`เพื่อนชวนมา คนละ ${baht(ELEMENTAL.groupPriceBaht)} แต่ละคนสมัครและจ่ายเอง`}>
        เข้าทีม <span style={{ fontStyle: "italic", fontWeight: 300 }}>{team.name}</span>
      </StepTitle>
      <section className="border-y py-5" style={{ borderColor: v.rule }}>
        <p className="flex items-center gap-2.5" style={secondary}>
          <PixelIcon name="friends" />
          ในทีมตอนนี้ · ว่างอีก {team.spotsLeft} ที่
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {team.roster.length ? (
            team.roster.map((r, i) => (
              <li
                key={i}
                className="rounded-[2px] px-3 py-1.5"
                style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "24px", boxShadow: `inset 0 0 0 1px ${v.rule}` }}
              >
                {r.name}
              </li>
            ))
          ) : (
            <li style={secondary}>ยังไม่มีใคร</li>
          )}
        </ul>
      </section>
      <AlreadySignedUp team={team} demo={demo} />
    </>
  );
}

/** A buddy pass link opens here: who sent it, the price, and the IOU. */
function BuddyHeader({ buddyPass }: { buddyPass: BuddyPassOffer }) {
  return (
    <>
      <StepTitle sub={`จ่ายเต็ม ${baht(ELEMENTAL.priceBaht)} ไปแล้ว เลยส่งบัตรเพื่อนมาให้ 1 ใบ ทีมงานจับเข้าทีมเดียวกับ ${buddyPass.senderName} ให้`}>
        {buddyPass.senderName} ชวนมา จ่ายแค่ <span style={{ fontStyle: "italic", fontWeight: 300 }}>{baht(ELEMENTAL.buddyPriceBaht)}</span>
      </StepTitle>
      <section className="relative overflow-hidden rounded-[2px]" style={{ boxShadow: `inset 0 0 0 1px ${v.rule}` }}>
        <PixelEdge />
        <div className="space-y-4 p-5">
          <p className="flex items-center gap-2.5">
            <span style={{ color: EL.flame }}>
              <PixelIcon name="ticket" />
            </span>
            <span style={itemTitle}>บัตรเพื่อน จาก {buddyPass.senderName}</span>
          </p>
          <IouNote debt={`คุณติด ${buddyPass.senderName}`} owe={buddyPass.owe} />
        </div>
      </section>
    </>
  );
}

/**
 * How they're signing up, at the top of the first screen. Starting a team is
 * the default (฿149 each, even before friends join: Big, 2026-11-23); alone
 * at ฿199 is one small link. Replaces the "alone or with friends" screen,
 * where 39 of 232 people left without choosing (24 to 28 Nov 2026).
 */
function ModeStrip({ mode, draft, setMode }: { mode: "create" | "solo"; draft: Draft; setMode: (m: Mode) => void }) {
  const create = mode === "create";
  return (
    <section className="rounded-[2px] p-5" style={{ boxShadow: `inset 0 0 0 2px ${v.text}` }} aria-label="สมัครแบบไหน">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <PixelIcon name={create ? "friends" : "solo"} />
          <span style={itemTitle}>{create ? "มากับเพื่อน" : "มาคนเดียว"}</span>
        </div>
        <p className="shrink-0 text-right">
          <span className="block tabular-nums" style={{ ...display(300, 32, 1), color: v.text }}>
            {baht(create ? ELEMENTAL.groupPriceBaht : ELEMENTAL.priceBaht)}
          </span>
          {create && (
            <span className="mt-1 block" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.fine }}>
              ต่อคน
            </span>
          )}
        </p>
      </div>
      <p className="mt-2 text-pretty" style={secondary}>
        {/* PLACEHOLDER copy (Angpao): the old name screen's line and the old mode card's "แต่ละคนจ่ายเอง", joined */}
        {create
          ? `เพื่อนยังไม่ต้องสมัครตอนนี้ สมัครเสร็จแล้วจะได้ลิงก์${teamLabel(teamNameFor(draft) || "ทีม")}ไว้ส่งให้เพื่อน แต่ละคนจ่ายเอง`
          : "เราช่วยจับคู่เข้าทีมให้ได้"}
      </p>
      {!create && (
        <p className="mt-3 flex items-start gap-2.5 border-t border-dashed pt-3" style={{ borderColor: v.rule }}>
          <span className="mt-0.5 shrink-0" style={{ color: EL.flame }}>
            <PixelIcon name="ticket" />
          </span>
          <span className="text-balance" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px" }}>
            จ่ายแล้วได้บัตรเพื่อน {baht(ELEMENTAL.buddyPriceBaht)} ชวนเพื่อนมาได้อีก 1 คน
          </span>
        </p>
      )}
      <div className="mt-3">
        {/* PLACEHOLDER copy (Angpao): the two switch links */}
        <EditorialLink size="sm" onClick={() => setMode(create ? "solo" : "create")}>
          {create ? `มาคนเดียว ${baht(ELEMENTAL.priceBaht)}` : `มากับเพื่อน ${baht(ELEMENTAL.groupPriceBaht)} ต่อคน`}
        </EditorialLink>
      </div>
    </section>
  );
}

function GradeAndAge({ draft, set, blur, errors }: StepProps) {
  const choices = ageChoicesFor(draft.grade);
  const custom = draft.age !== "" && !choices.includes(draft.age);
  const picked = (GRADE_VALUES as readonly string[]).includes(draft.grade);
  return (
    <>
      <div>
        <span id="el-join-grade" className="block" style={label}>
          ตอนนี้เรียนชั้น
        </span>
        <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby="el-join-grade">
          {GRADE_VALUES.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={draft.grade === g}
              data-error={errors.grade ? true : undefined}
              onClick={() => set({ grade: g })}
              className={`${styles.pick} h-[52px] rounded-[2px]`}
              style={g === "other" ? { fontFamily: EL_FONT.body, fontSize: 16, lineHeight: 1 } : display(300, 22, 1)}
            >
              {GRADE_LABEL_TH[g]}
            </button>
          ))}
        </div>
        <GroupError>{errors.grade}</GroupError>
      </div>
      {/* Age shows once the grade is picked, with the ages that fit it to tap. The API needs it for everyone. */}
      {(picked || errors.age) && (
        <div>
          <span id="el-join-age" className="block" style={label}>
            อายุ
          </span>
          <div className="mt-2 grid grid-cols-4 gap-2" role={choices.length ? "radiogroup" : undefined} aria-labelledby="el-join-age">
            {choices.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={draft.age === a}
                data-error={errors.age ? true : undefined}
                onClick={() => set({ age: a })}
                className={`${styles.pick} h-[52px] rounded-[2px] tabular-nums`}
                style={display(300, 24, 1)}
              >
                {a}
              </button>
            ))}
            <input
              id="el-join-age-other"
              aria-label={choices.length ? "อายุอื่น" : "อายุ"}
              aria-invalid={errors.age ? true : undefined}
              placeholder={choices.length ? "อื่น" : "อายุ"}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              enterKeyHint="next"
              value={custom ? draft.age : ""}
              data-on={custom}
              data-error={errors.age ? true : undefined}
              onChange={(e) => set({ age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              onBlur={() => blur("age")}
              className={`${styles.tileInput} h-[52px] w-full min-w-0 rounded-[2px] text-center tabular-nums ${choices.length ? "" : "col-span-2"}`}
              style={display(300, 24, 1)}
            />
          </div>
          {errors.age ? (
            <GroupError>{errors.age}</GroupError>
          ) : (
            // PLACEHOLDER copy (Angpao)
            <Fine className="mt-1.5">ต่ำกว่า {ADULT_AGE} ปี ผู้ปกครองต้องยินยอมด้วย กรอกในหน้าถัดไป</Fine>
          )}
        </div>
      )}
    </>
  );
}

function AboutFields(p: StepProps) {
  const { draft, set, blur, errors } = p;
  const mode = modeOf(draft);
  return (
    <div className="space-y-6">
      <TextInput
        id="el-join-fullname"
        label="ชื่อ-นามสกุล"
        error={errors.fullName}
        data-autofocus
        value={draft.fullName}
        autoComplete="name"
        autoCapitalize="words"
        maxLength={120}
        enterKeyHint="next"
        onChange={(e) => set({ fullName: e.target.value })}
        onBlur={() => blur("fullName")}
      />
      <TextInput
        id="el-join-nickname"
        label={
          <>
            ชื่อเล่น <Optional>(ไม่บังคับ)</Optional>
          </>
        }
        hint={mode === "create" ? "ใช้ตั้งชื่อทีมด้วย เปลี่ยนชื่อทีมทีหลังได้" : "เพื่อนในทีมจะเห็นชื่อนี้"}
        error={errors.nickname}
        value={draft.nickname}
        autoComplete="nickname"
        maxLength={60}
        enterKeyHint="next"
        onChange={(e) => set({ nickname: e.target.value, teamName: "" })}
        onBlur={() => blur("nickname")}
      />
      <GradeAndAge {...p} />
      <SchoolField value={draft.school} onChange={(school) => set({ school })} onBlur={() => blur("school")} error={errors.school} />
    </div>
  );
}

function AboutStep(p: StepProps) {
  const { draft, team, buddyPass, setMode, demo } = p;
  const mode = modeOf(draft);
  const invite = mode === "join" && team ? team : null;
  const pass = mode === "buddy" && buddyPass ? buddyPass : null;
  return (
    <>
      {invite ? (
        <TeamHeader team={invite} demo={demo} />
      ) : pass ? (
        <BuddyHeader buddyPass={pass} />
      ) : (
        <>
          <StepTitle>ข้อมูลของคุณ</StepTitle>
          <ModeStrip mode={mode === "solo" ? "solo" : "create"} draft={draft} setMode={setMode} />
        </>
      )}

      {(invite || pass) && <H2 className="mb-6 mt-10">ข้อมูลของคุณ</H2>}
      <div className={invite || pass ? "" : "mt-8"}>
        <AboutFields {...p} />
      </div>

      {/* What the friend is invited to; on a wide screen it's the panel beside the form. */}
      {(invite || pass) && <WhatItIs className="mt-10 lg:hidden" />}

      {invite && <AltChoice onClick={() => setMode("create")}>ไม่ใช่ทีมนี้? สร้างทีมใหม่หรือมาคนเดียว</AltChoice>}
      {pass && <AltChoice onClick={() => setMode("create")}>ไม่ใช้บัตรนี้? สมัครแบบปกติ</AltChoice>}
      {!invite && team && <AltChoice onClick={() => setMode("join")}>กลับไปเข้า{teamLabel(team.name)}</AltChoice>}
      {!pass && buddyPass && (
        <AltChoice onClick={() => setMode("buddy")}>
          กลับไปใช้บัตรเพื่อนจาก {buddyPass.senderName} ({baht(ELEMENTAL.buddyPriceBaht)})
        </AltChoice>
      )}
      {!team && !buddyPass && (
        <div className="mt-6">
          <EditorialLink href={demo ? "/hackathon/join/find?demo=1" : "/hackathon/join/find"} size="sm">
            สมัครไว้แล้ว? หาหน้าของฉัน
          </EditorialLink>
        </div>
      )}
    </>
  );
}

/**
 * What the friend is being invited to. Invite links open straight onto this
 * form, and most invited friends left before naming themselves (12 of 19,
 * 24 to 25 Nov 2026), so the poster's line and the basic facts sit on the
 * first screen, with the full page a tap away. A dark slab: a piece of the
 * event on the cream page.
 */
function WhatItIs({ className }: { className?: string }) {
  return (
    <DarkSlab className={className}>
      <p className="text-pretty" style={{ ...display(300, 22, 1.35), color: v.number }}>
        {ELEMENTAL.taglineTh[0]} {ELEMENTAL.taglineTh[1]}
      </p>
      <p className="mt-3 text-pretty" style={secondary}>
        {ELEMENTAL.edition} Hackathon {thaiDateLine()} {ELEMENTAL.venueTh} สำหรับ {ELEMENTAL.gradesTh} รางวัลรวม {prizeTotal()} บาท
      </p>
      {/* A new tab, so the answers on this page stay put. */}
      <div className="mt-4">
        <EditorialLink href="/hackathon/elemental?src=team" external tone="action">
          ดูรายละเอียดงาน
        </EditorialLink>
      </div>
    </DarkSlab>
  );
}

/** The IOU that comes with a buddy pass: a dashed, torn-ticket box. */
function IouNote({ debt, owe }: { debt: string; owe: BuddyOwe }) {
  return (
    <div className="rounded-[2px] border border-dashed px-4 py-3" style={{ borderColor: v.rule }}>
      <Tag>ใบติดหนี้</Tag>
      <p className="mt-1" style={display(300, 20, 1.4)}>
        {debt} {buddyOweLabel(owe)}
      </p>
    </div>
  );
}

// ---------- Screen 2: contact, and the parent for under-20s ----------

function ContactStep({ draft, set, blur, errors, touched }: StepProps) {
  const minor = isMinor(draft);
  const who = draft.nickname || draft.fullName;
  const emailFix = touched.email && !errors.email ? suggestEmail(draft.email) : null;
  const samePhone = minor && cleanPhone(draft.parentPhone).length >= 9 && cleanPhone(draft.parentPhone) === cleanPhone(draft.phone);
  return (
    <>
      <StepTitle sub="เราส่งลิงก์จ่ายเงินและข่าวของงานไปที่นี่">ช่องทางติดต่อ</StepTitle>
      <div className="space-y-6">
        <div>
          <TextInput
            id="el-join-email"
            label="อีเมล"
            error={errors.email}
            data-autofocus
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={draft.email}
            enterKeyHint="next"
            onChange={(e) => set({ email: cleanEmailInput(e.target.value) })}
            onBlur={() => blur("email")}
          />
          {emailFix && (
            <button
              type="button"
              onClick={() => set({ email: emailFix })}
              className="-mb-2 mt-1 inline-flex min-h-11 items-center text-left underline underline-offset-4"
              style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: v.text }}
            >
              {/* PLACEHOLDER copy (Angpao) */}
              หมายถึง {emailFix} ใช่ไหม
            </button>
          )}
        </div>
        <TextInput
          id="el-join-phone"
          label="เบอร์โทร"
          error={errors.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08x-xxx-xxxx"
          value={draft.phone}
          enterKeyHint="next"
          onChange={(e) => set({ phone: formatPhone(e.target.value) })}
          onBlur={() => blur("phone")}
        />
        <TextInput
          id="el-join-line"
          label={
            <>
              LINE ID <Optional>(ไม่บังคับ)</Optional>
            </>
          }
          value={draft.lineId}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={60}
          enterKeyHint={minor ? "next" : "done"}
          onChange={(e) => set({ lineId: e.target.value })}
        />
      </div>

      {minor && (
        <section className="mt-12 border-t pt-8" style={{ borderColor: v.rule }} aria-labelledby="el-join-parent">
          <H2 id="el-join-parent">ผู้ปกครอง</H2>
          <p className="mb-6 mt-2 text-pretty" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px", color: v.secondary }}>
            ต่ำกว่า {ADULT_AGE} ปี ต้องให้ผู้ปกครองยินยอม ทีมงานอาจโทรยืนยัน
          </p>
          <div className="space-y-6">
            <TextInput
              id="el-join-parent-name"
              label="ชื่อผู้ปกครอง"
              error={errors.parentName}
              value={draft.parentName}
              // Not the student's own name from autofill.
              autoComplete="off"
              maxLength={120}
              enterKeyHint="next"
              onChange={(e) => set({ parentName: e.target.value })}
              onBlur={() => blur("parentName")}
            />
            <TextInput
              id="el-join-parent-phone"
              label="เบอร์โทรผู้ปกครอง"
              error={errors.parentPhone}
              // PLACEHOLDER copy (Angpao)
              hint={samePhone ? "เบอร์นี้เหมือนเบอร์ของคุณ ถ้าผู้ปกครองใช้เบอร์อื่น ใส่เบอร์ผู้ปกครอง" : undefined}
              type="tel"
              inputMode="tel"
              // Not the student's own number from autofill.
              autoComplete="off"
              placeholder="08x-xxx-xxxx"
              value={draft.parentPhone}
              enterKeyHint="done"
              onChange={(e) => set({ parentPhone: formatPhone(e.target.value) })}
              onBlur={() => blur("parentPhone")}
            />
            <div>
              <CheckRow checked={draft.parentConsent} onChange={(val) => set({ parentConsent: val })} error={errors.parentConsent}>
                ผู้ปกครองของ{who ? ` ${who}` : "คนนี้"} รู้และยินยอมแล้ว ตามข้อตกลงของงาน
              </CheckRow>
              <p className="mt-3" style={secondary}>
                ให้ผู้ปกครองอ่าน<LegalLink href="/hackathon/elemental/terms">ข้อตกลงของงาน</LegalLink>ก่อนติ๊ก
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ---------- Screen 3: review and agree ----------

function SummaryRow({ label: rowLabel, value, onEdit }: { label: string; value: ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p style={secondary}>{rowLabel}</p>
        <div className="mt-0.5 break-words" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
          {value}
        </div>
      </div>
      {/* The landing's italic editorial link (EditorialLink sm, no arrow), with an aria-label; 44px to tap without pushing the row taller. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`แก้ ${rowLabel}`}
        className="-my-2 -mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center px-2 italic"
        style={{ ...display(300, 15, 1.3), color: v.text }}
      >
        <span className={`${cinema.textLink} ${cinema.textLinkInView}`}>แก้</span>
      </button>
    </div>
  );
}

/**
 * "Where did you see us", now optional: one tap on a chip, tap again to clear.
 * It was a screen of its own; the answer still reaches the admin page.
 */
function HeardChips({ draft, set }: Pick<StepProps, "draft" | "set">) {
  return (
    <fieldset className="mt-8">
      <legend className="mb-3" style={label}>
        เห็นโพสต์ของงานนี้จากที่ไหน <Optional>(ไม่บังคับ)</Optional>
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เห็นโพสต์จากที่ไหน">
        {HEARD_FROM.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={draft.heardFrom === o.value}
            onClick={() => set({ heardFrom: draft.heardFrom === o.value ? "" : o.value })}
            className={`${styles.pick} min-h-11 rounded-[2px] px-4 py-2`}
            style={{ fontFamily: EL_FONT.body, fontSize: 15, lineHeight: "22px" }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ReviewStep({ draft, set, errors, team, buddyPass, goTo }: StepProps) {
  const mode = modeOf(draft);
  const total = mode === "buddy" ? ELEMENTAL.buddyPriceBaht : elementalPriceBaht(1, mode !== "solo");
  const how = {
    solo: "มาคนเดียว",
    create: `สร้าง${teamLabel(teamNameFor(draft))}`,
    join: `เข้า${teamLabel(team?.name ?? "")}`,
    buddy: `บัตรเพื่อนจาก ${buddyPass?.senderName ?? "เพื่อน"}`,
  }[mode];
  const priceLabel =
    mode === "buddy"
      ? `บัตรเพื่อน (จาก ${buddyPass?.senderName ?? "เพื่อน"})`
      : mode === "solo"
        ? "มาคนเดียว"
        : "ราคาในทีม ต่อคน";
  return (
    <>
      <StepTitle>ตรวจอีกครั้ง</StepTitle>
      <div className="divide-y divide-[color:var(--el-rule-soft)] border-y" style={{ borderColor: v.rule }}>
        <SummaryRow
          label="สมัครแบบไหน"
          value={
            mode === "create" ? (
              <>
                {how}
                <span className="block" style={secondary}>
                  เปลี่ยนชื่อทีมได้หลังสมัคร
                </span>
              </>
            ) : (
              how
            )
          }
          onEdit={() => goTo("about")}
        />
        <SummaryRow label="ชื่อ" value={`${draft.fullName}${draft.nickname ? ` (${draft.nickname})` : ""}`} onEdit={() => goTo("about")} />
        <SummaryRow
          label="ชั้น · อายุ · โรงเรียน"
          value={`${draft.grade in GRADE_LABEL_TH ? `${GRADE_LABEL_TH[draft.grade as Grade]} · ` : ""}${draft.age} ปี · ${draft.school}`}
          onEdit={() => goTo("about")}
        />
        <SummaryRow
          label="ช่องทางติดต่อ"
          value={[draft.email, draft.phone, draft.lineId && `LINE ${draft.lineId}`].filter(Boolean).join(" · ")}
          onEdit={() => goTo("contact")}
        />
        {isMinor(draft) && <SummaryRow label="ผู้ปกครอง" value={`${draft.parentName} · ${draft.parentPhone}`} onEdit={() => goTo("contact")} />}
      </div>

      {mode === "solo" && (
        <div className="mt-5">
          <CheckRow checked={draft.wantsTeam} onChange={(val) => set({ wantsTeam: val })}>
            อยากให้ทีมงานช่วยจับคู่เข้าทีม
          </CheckRow>
        </div>
      )}

      {mode === "buddy" && buddyPass && (
        <div className="mt-5">
          <IouNote debt={`คุณติด ${buddyPass.senderName}`} owe={buddyPass.owe} />
        </div>
      )}

      <HeardChips draft={draft} set={set} />

      <DarkSlab className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <span style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>{priceLabel}</span>
          <span className="tabular-nums" style={{ ...display(300, 44, 1), color: v.number }}>
            {baht(total)}
          </span>
        </div>
        <Body secondary className="mt-3">
          สมัครก่อน จ่ายทีหลังได้ ที่นั่งยืนยันเมื่อจ่ายแล้ว
        </Body>
        <div className="mt-5 space-y-3 border-t pt-5" style={{ borderColor: v.rule }}>
          <CheckRow checked={draft.noRefund} onChange={(val) => set({ noRefund: val })} error={errors.noRefund}>
            รับทราบว่า <strong style={{ fontWeight: 600 }}>ไม่มีการคืนเงิน</strong> หลังชำระค่าสมัครแล้ว
          </CheckRow>
          <CheckRow checked={draft.contactAfter} onChange={(val) => set({ contactAfter: val })}>
            ให้ PassionSeed ติดต่อเรื่องกิจกรรมอื่นหลังจบ Hackathon ได้ (ไม่บังคับ)
          </CheckRow>
        </div>
      </DarkSlab>
    </>
  );
}

/** Sits right above the sign-up button on the review step. The terms page covers promotion use and links the privacy policy. */
export function LegalLine() {
  return (
    <p className="mb-2.5 text-pretty text-center lg:text-left" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.secondary }}>
      การกดสมัคร ถือว่ายอมรับ<LegalLink href="/hackathon/elemental/terms">ข้อตกลงของงาน</LegalLink>
    </p>
  );
}

/** Opens in a new tab so the answers on this page stay put. */
function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="mx-1 whitespace-nowrap underline underline-offset-4" style={{ color: v.text }}>
      {children}
    </a>
  );
}

export const STEP_VIEWS: Record<StepKey, (p: StepProps) => ReactNode> = {
  about: AboutStep,
  contact: ContactStep,
  review: ReviewStep,
};
