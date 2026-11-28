import type { CSSProperties, ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { buddyOweLabel, type BuddyOwe } from "@/lib/hackathon/elemental/buddy-pass";
import { ADULT_AGE, elementalPriceBaht } from "@/lib/hackathon/elemental/registration";
import { HEARD_FROM, heardFromLabel } from "@/lib/hackathon/elemental/heard-from";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { Body, DarkSlab, EditorialLink, H1, PixelEdge, PixelIcon, Tag, TextInput, v, type PixelIconName } from "../share/ui";
import { formatPhone, teamNameFor, type BuddyPassOffer, type Draft, type Errors, type Mode, type StepKey } from "./draft";
import { CheckRow } from "./fields";
import styles from "./join.module.css";

/**
 * One screen per step. Each asks one thing, in the person's own words where we have them.
 * Built from the Elemental paper primitives (share/ui.tsx): Trirong titles and prices, Bai
 * Jamjuree for everything you read, Space Mono only for [tags]; square choices with a 1px rule
 * and 2px ink when picked. The step's one primary action sits in JoinFlow's sticky bar.
 */

export type StepProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Errors;
  team?: PublicTeam;
  buddyPass?: BuddyPassOffer;
  /** Pick a mode and move on, for the one step that's a single tap. */
  choose: (mode: Mode) => void;
  goTo: (step: StepKey) => void;
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

/** The square radio mark for list choices: an outlined square that fills from the middle. */
function RadioMark() {
  return (
    <span aria-hidden="true" className={`${styles.box} flex h-5 w-5 shrink-0 items-center justify-center`}>
      <span className={`${styles.radioDot} h-2.5 w-2.5`} style={{ backgroundColor: v.text }} />
    </span>
  );
}

/** A secondary way out under an invite ("ไม่ใช่ทีมนี้? …"): the landing's Trirong italic link. */
function AltChoice({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div className="mt-6">
      <EditorialLink onClick={onClick}>{children}</EditorialLink>
    </div>
  );
}

// ---------- Step 1: how they sign up ----------

type Option = { value: Mode; icon: PixelIconName; title: string; price: number; note: string; unit: string; extra: string | null };

function ModeStep({ draft, team, buddyPass, choose }: StepProps) {
  if (team && draft.mode === "join") {
    return (
      <>
        <StepTitle sub={`เพื่อนชวนมา คนละ ${baht(ELEMENTAL.groupPriceBaht)} แต่ละคนสมัครและจ่ายเอง`}>
          เข้าทีม <span style={{ fontStyle: "italic", fontWeight: 300 }}>{team.name}</span>
        </StepTitle>
        <WhatItIs />
        <section className="mt-8 border-y py-5" style={{ borderColor: v.rule }}>
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
        <AltChoice onClick={() => choose("create")}>ไม่ใช่ทีมนี้? สร้างทีมใหม่หรือมาคนเดียว</AltChoice>
      </>
    );
  }

  if (buddyPass && draft.mode === "buddy") {
    return (
      <>
        <StepTitle sub={`จ่ายเต็ม ${baht(ELEMENTAL.priceBaht)} ไปแล้ว เลยส่งบัตรเพื่อนมาให้ 1 ใบ ทีมงานจับเข้าทีมเดียวกับ ${buddyPass.senderName} ให้`}>
          {buddyPass.senderName} ชวนมา จ่ายแค่ <span style={{ fontStyle: "italic", fontWeight: 300 }}>{baht(ELEMENTAL.buddyPriceBaht)}</span>
        </StepTitle>
        <WhatItIs />
        <section className="relative mt-8 overflow-hidden rounded-[2px]" style={{ boxShadow: `inset 0 0 0 1px ${v.rule}` }}>
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
        <AltChoice onClick={() => choose("create")}>ไม่ใช้บัตรนี้? สมัครแบบปกติ</AltChoice>
      </>
    );
  }

  const options: Option[] = [
    { value: "create", icon: "friends", title: "มากับเพื่อน", price: ELEMENTAL.groupPriceBaht, note: "สร้างทีม แล้วส่งลิงก์ให้เพื่อนสมัครเอง แต่ละคนจ่ายเอง", unit: "ต่อคน", extra: null },
    {
      value: "solo",
      icon: "solo",
      title: "มาคนเดียว",
      price: ELEMENTAL.priceBaht,
      note: "เราช่วยจับคู่เข้าทีมให้ได้",
      unit: "",
      extra: `จ่ายแล้วได้บัตรเพื่อน ${baht(ELEMENTAL.buddyPriceBaht)} ชวนเพื่อนมาได้อีก 1 คน`,
    },
  ];

  return (
    <>
      <StepTitle sub={`${thaiDateLine()} · ${ELEMENTAL.venueTh} · สมัครก่อน จ่ายทีหลังได้`}>สมัครแบบไหน</StepTitle>
      <div className="grid gap-3" role="radiogroup" aria-label="สมัครแบบไหน">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={draft.mode === o.value}
            onClick={() => choose(o.value)}
            className={`${styles.pick} block w-full rounded-[2px] p-5 text-left`}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-3">
                <PixelIcon name={o.icon} />
                <span style={itemTitle}>{o.title}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block tabular-nums" style={{ ...display(300, 36, 1), color: v.text }}>
                  {baht(o.price)}
                </span>
                {o.unit && (
                  <span className="mt-1 block" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.fine }}>
                    {o.unit}
                  </span>
                )}
              </span>
            </span>
            <span className="mt-3 block" style={secondary}>
              {o.note}
            </span>
            {o.extra && (
              <span className="mt-4 flex items-start gap-2.5 border-t border-dashed pt-4" style={{ borderColor: v.rule }}>
                <span className="mt-0.5 shrink-0" style={{ color: EL.flame }}>
                  <PixelIcon name="ticket" />
                </span>
                <span className="text-balance" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px" }}>
                  {o.extra}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
      {team && <AltChoice onClick={() => choose("join")}>กลับไปเข้า{teamLabel(team.name)}</AltChoice>}
      {buddyPass && (
        <AltChoice onClick={() => choose("buddy")}>
          กลับไปใช้บัตรเพื่อนจาก {buddyPass.senderName} ({baht(ELEMENTAL.buddyPriceBaht)})
        </AltChoice>
      )}
    </>
  );
}

/**
 * What the friend is being invited to. Invite links open straight onto this
 * form, and most invited friends left before naming themselves (12 of 19,
 * 24 to 25 Nov 2026), so the poster's line and the basic facts come first,
 * with the full page a tap away. Lines reused from the poster and the quiz
 * result page. A dark slab: a piece of the event on the cream page.
 */
function WhatItIs() {
  return (
    <DarkSlab>
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

// ---------- Steps 2 to 6 ----------

function NameStep({ draft, set, errors }: StepProps) {
  // People starting a team left here and on the old team-name screen, likely to go and ask friends first.
  const sub =
    draft.mode === "create"
      ? `เพื่อนยังไม่ต้องสมัครตอนนี้ สมัครเสร็จแล้วจะได้ลิงก์${teamLabel(teamNameFor(draft) || "ทีม")}ไว้ส่งให้เพื่อน`
      : undefined;
  return (
    <>
      <StepTitle sub={sub}>ข้อมูลของคุณ</StepTitle>
      <div className="space-y-6">
        <TextInput
          id="el-join-fullname"
          label="ชื่อ-นามสกุล"
          error={errors.fullName}
          data-autofocus
          value={draft.fullName}
          autoComplete="name"
          maxLength={120}
          enterKeyHint="next"
          onChange={(e) => set({ fullName: e.target.value })}
        />
        <TextInput
          id="el-join-nickname"
          label={
            <>
              ชื่อเล่น <Optional>(ไม่บังคับ)</Optional>
            </>
          }
          hint={draft.mode === "create" ? "ใช้ตั้งชื่อทีมด้วย เปลี่ยนชื่อทีมทีหลังได้" : "เพื่อนในทีมจะเห็นชื่อนี้"}
          error={errors.nickname}
          value={draft.nickname}
          autoComplete="nickname"
          maxLength={60}
          enterKeyHint="next"
          onChange={(e) => set({ nickname: e.target.value, teamName: "" })}
        />
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
          <span id="el-join-age" className="block" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
            อายุ
          </span>
          <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby="el-join-age">
            {QUICK_AGES.map((a) => (
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
              aria-label="อายุอื่น"
              placeholder="อื่น"
              inputMode="numeric"
              value={custom ? draft.age : ""}
              data-on={custom}
              data-error={errors.age ? true : undefined}
              onChange={(e) => set({ age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              className={`${styles.tileInput} h-[52px] w-full min-w-0 rounded-[2px] text-center tabular-nums`}
              style={display(300, 24, 1)}
            />
          </div>
          <GroupError>{errors.age}</GroupError>
        </div>
        <TextInput
          id="el-join-school"
          label="โรงเรียนหรือสถาบัน"
          error={errors.school}
          value={draft.school}
          maxLength={160}
          autoComplete="organization"
          enterKeyHint="next"
          onChange={(e) => set({ school: e.target.value })}
        />
      </div>
    </>
  );
}

function ParentStep({ draft, set, errors }: StepProps) {
  const who = draft.nickname || draft.fullName;
  return (
    <>
      <StepTitle sub={`ต่ำกว่า ${ADULT_AGE} ปี ต้องให้ผู้ปกครองยินยอม ทีมงานอาจโทรยืนยัน`}>ผู้ปกครอง</StepTitle>
      <div className="space-y-6">
        <TextInput
          id="el-join-parent-name"
          label="ชื่อผู้ปกครอง"
          error={errors.parentName}
          data-autofocus
          value={draft.parentName}
          maxLength={120}
          enterKeyHint="next"
          onChange={(e) => set({ parentName: e.target.value })}
        />
        <TextInput
          id="el-join-parent-phone"
          label="เบอร์โทรผู้ปกครอง"
          error={errors.parentPhone}
          value={draft.parentPhone}
          inputMode="tel"
          placeholder="08x-xxx-xxxx"
          enterKeyHint="next"
          onChange={(e) => set({ parentPhone: formatPhone(e.target.value) })}
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
    </>
  );
}

function ContactStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle sub="เราส่งลิงก์จ่ายเงินและข่าวของงานไปที่นี่">ช่องทางติดต่อ</StepTitle>
      <div className="space-y-6">
        <TextInput
          id="el-join-email"
          label="อีเมล"
          error={errors.email}
          data-autofocus
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={draft.email}
          enterKeyHint="next"
          onChange={(e) => set({ email: e.target.value })}
        />
        <TextInput
          id="el-join-phone"
          label="เบอร์โทร"
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
          placeholder="08x-xxx-xxxx"
          value={draft.phone}
          enterKeyHint="next"
          onChange={(e) => set({ phone: formatPhone(e.target.value) })}
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
          spellCheck={false}
          maxLength={60}
          enterKeyHint="done"
          onChange={(e) => set({ lineId: e.target.value })}
        />
      </div>
    </>
  );
}

function HeardStep({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepTitle sub="ช่วยให้เรารู้ว่าควรไปโพสต์ที่ไหนอีก">เห็นโพสต์ของงานนี้จากที่ไหน</StepTitle>
      <div className="grid gap-2" role="radiogroup" aria-label="เห็นโพสต์จากที่ไหน">
        {HEARD_FROM.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={draft.heardFrom === o.value}
            data-error={errors.heardFrom ? true : undefined}
            onClick={() => set({ heardFrom: o.value })}
            className={`${styles.pick} flex min-h-[56px] w-full items-center justify-between gap-4 rounded-[2px] px-5 py-3 text-left`}
            style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}
          >
            {o.label}
            <RadioMark />
          </button>
        ))}
      </div>
      <GroupError className="mt-3">{errors.heardFrom}</GroupError>
    </>
  );
}

// ---------- Step 7: review ----------

function SummaryRow({ label, value, onEdit }: { label: string; value: ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p style={secondary}>{label}</p>
        <div className="mt-0.5 break-words" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
          {value}
        </div>
      </div>
      {/* 44px to tap, without pushing the row taller. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`แก้ ${label}`}
        className="-my-2 -mr-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center px-2 underline underline-offset-4"
        style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: v.secondary }}
      >
        แก้
      </button>
    </div>
  );
}

function ReviewStep({ draft, set, errors, team, buddyPass, goTo }: StepProps) {
  const mode = draft.mode ?? "solo";
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
          onEdit={() => goTo("mode")}
        />
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
    <p className="mb-2.5 text-pretty text-center" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.secondary }}>
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
  mode: ModeStep,
  name: NameStep,
  school: SchoolStep,
  parent: ParentStep,
  contact: ContactStep,
  heard: HeardStep,
  review: ReviewStep,
};
