"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { ADULT_AGE, elementalPriceBaht } from "@/lib/hackathon/elemental/registration";

/**
 * Elemental sign-up: everyone in the group, a parent for each person under
 * 20, one contact, then the price for the whole group. Saving opens the pay
 * page. Validation messages are Thai and sit next to the field.
 */

type Member = {
  fullName: string;
  nickname: string;
  age: string;
  school: string;
  parentName: string;
  parentPhone: string;
  parentConsent: boolean;
};

const emptyMember = (): Member => ({
  fullName: "",
  nickname: "",
  age: "",
  school: "",
  parentName: "",
  parentPhone: "",
  parentConsent: false,
});

const PHONE_RE = /^(\+66|0)\d{8,9}$/;
const cleanPhone = (v: string) => v.replace(/[\s-]/g, "");

const inputClass = "mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none focus:ring-2";
const inputStyle = { borderColor: "rgba(29,33,31,0.25)", color: EL.ink };

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs" style={{ color: EL.ember }}>{error}</span>}
    </label>
  );
}

function Check({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm leading-relaxed">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0"
        style={{ accentColor: EL.flame }}
      />
      <span>
        {children}
        {error && <span className="block text-xs" style={{ color: EL.ember }}>{error}</span>}
      </span>
    </label>
  );
}

type Errors = Record<string, string>;

function validate(members: Member[], email: string, phone: string, noRefund: boolean): Errors {
  const e: Errors = {};
  members.forEach((m, i) => {
    if (!m.fullName.trim()) e[`m${i}.fullName`] = "ใส่ชื่อ-นามสกุล";
    const age = Number(m.age);
    if (!m.age || !Number.isInteger(age) || age < 10 || age > 99) e[`m${i}.age`] = "ใส่อายุเป็นตัวเลข";
    if (!m.school.trim()) e[`m${i}.school`] = "ใส่ชื่อโรงเรียนหรือสถาบัน";
    if (Number.isInteger(age) && age < ADULT_AGE) {
      if (!m.parentName.trim()) e[`m${i}.parentName`] = "ใส่ชื่อผู้ปกครอง";
      if (!PHONE_RE.test(cleanPhone(m.parentPhone))) e[`m${i}.parentPhone`] = "ใส่เบอร์ผู้ปกครอง 10 หลัก";
      if (!m.parentConsent) e[`m${i}.parentConsent`] = "ต้องได้รับความยินยอมจากผู้ปกครองก่อน";
    }
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "ใส่อีเมลที่ใช้ได้";
  if (!PHONE_RE.test(cleanPhone(phone))) e.phone = "ใส่เบอร์โทร 10 หลัก";
  if (!noRefund) e.noRefund = "ติ๊กเพื่อรับทราบก่อนสมัคร";
  return e;
}

export function JoinForm({ source, utm }: { source?: string; utm?: Record<string, string> }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([emptyMember()]);
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [wantsTeam, setWantsTeam] = useState(true);
  const [noRefund, setNoRefund] = useState(false);
  const [contactAfter, setContactAfter] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const solo = members.length === 1;
  const total = elementalPriceBaht(members.length);

  const update = (i: number, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(members, email, phone, noRefund);
    setErrors(found);
    if (Object.keys(found).length) {
      setServerError("ยังมีช่องที่ต้องแก้ ดูข้อความสีแดงด้านบน");
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/hackathon/elemental/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: solo ? undefined : teamName,
          members: members.map((m) => {
            const minor = Number(m.age) < ADULT_AGE;
            return {
              fullName: m.fullName,
              nickname: m.nickname,
              age: Number(m.age),
              school: m.school,
              parentName: minor ? m.parentName : undefined,
              parentPhone: minor ? m.parentPhone : undefined,
              parentConsent: minor ? m.parentConsent : false,
            };
          }),
          contactEmail: email,
          contactPhone: phone,
          contactLineId: lineId,
          wantsTeamMatching: solo && wantsTeam,
          noRefundAck: noRefund,
          contactAfterConsent: contactAfter,
          source,
          utm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { payToken?: string; error?: string };
      if (res.ok && data.payToken) {
        router.push(`/hackathon/join/${data.payToken}`);
        return;
      }
      setServerError(
        data.error === "closed"
          ? "ปิดรับสมัครแล้ว"
          : "บันทึกไม่สำเร็จ ลองตรวจข้อมูลอีกครั้ง หรือทักไลน์ @passionseed",
      );
    } catch {
      setServerError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-10">
      <section className="space-y-6">
        {members.map((m, i) => {
          const minor = m.age !== "" && Number(m.age) < ADULT_AGE;
          return (
            <fieldset key={i} className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
              <legend className="px-2 text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                [คนที่ {i + 1}{i === 0 ? " · คนกรอก" : ""}]
              </legend>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}
                  className="float-right -mt-2 inline-flex items-center gap-1 text-xs"
                  style={{ color: EL.inkSoft }}
                >
                  <X className="h-4 w-4" /> เอาออก
                </button>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ชื่อ-นามสกุล" error={errors[`m${i}.fullName`]}>
                  <input className={inputClass} style={inputStyle} value={m.fullName} autoComplete={i === 0 ? "name" : "off"} onChange={(e) => update(i, { fullName: e.target.value })} />
                </Field>
                <Field label="ชื่อเล่น (ไม่บังคับ)">
                  <input className={inputClass} style={inputStyle} value={m.nickname} onChange={(e) => update(i, { nickname: e.target.value })} />
                </Field>
                <Field label="อายุ" error={errors[`m${i}.age`]}>
                  <input className={inputClass} style={inputStyle} inputMode="numeric" value={m.age} onChange={(e) => update(i, { age: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                </Field>
                <Field label="โรงเรียนหรือสถาบัน" error={errors[`m${i}.school`]}>
                  <input className={inputClass} style={inputStyle} value={m.school} onChange={(e) => update(i, { school: e.target.value })} />
                </Field>
              </div>
              {minor && (
                <div className="space-y-4 rounded-xl p-4" style={{ backgroundColor: "rgba(236,100,36,0.08)" }}>
                  <p className="text-sm">อายุต่ำกว่า {ADULT_AGE} ปี ต้องได้รับความยินยอมจากผู้ปกครอง ทีมงานอาจโทรยืนยันกับผู้ปกครอง</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ชื่อผู้ปกครอง" error={errors[`m${i}.parentName`]}>
                      <input className={inputClass} style={inputStyle} value={m.parentName} onChange={(e) => update(i, { parentName: e.target.value })} />
                    </Field>
                    <Field label="เบอร์โทรผู้ปกครอง" error={errors[`m${i}.parentPhone`]}>
                      <input className={inputClass} style={inputStyle} inputMode="tel" value={m.parentPhone} onChange={(e) => update(i, { parentPhone: e.target.value })} />
                    </Field>
                  </div>
                  <Check checked={m.parentConsent} onChange={(v) => update(i, { parentConsent: v })} error={errors[`m${i}.parentConsent`]}>
                    ผู้ปกครองของ{m.nickname || m.fullName ? ` ${m.nickname || m.fullName}` : "คนนี้"} รู้และยินยอมให้เข้าร่วม {ELEMENTAL.edition} Hackathon แล้ว
                  </Check>
                </div>
              )}
            </fieldset>
          );
        })}

        {members.length < ELEMENTAL.maxGroupSize && (
          <button
            type="button"
            onClick={() => setMembers((ms) => [...ms, emptyMember()])}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ boxShadow: `inset 0 0 0 1px ${EL.ink}` }}
          >
            <Plus className="h-4 w-4" /> เพิ่มเพื่อนในกลุ่ม (สูงสุด {ELEMENTAL.maxGroupSize} คน)
          </button>
        )}

        {solo ? (
          <Check checked={wantsTeam} onChange={setWantsTeam}>
            มาคนเดียว อยากให้ทีมงานช่วยจับคู่เข้าทีม
          </Check>
        ) : (
          <Field label="ชื่อทีม (ไม่บังคับ)">
            <input className={inputClass} style={inputStyle} value={teamName} maxLength={80} onChange={(e) => setTeamName(e.target.value)} />
          </Field>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>ช่องทางติดต่อ</h2>
        <p className="text-sm" style={{ color: EL.inkSoft }}>ของคนกรอก เราจะส่งข่าวของงานให้ทั้งกลุ่มผ่านช่องทางนี้</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="อีเมล" error={errors.email}>
            <input className={inputClass} style={inputStyle} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="เบอร์โทร" error={errors.phone}>
            <input className={inputClass} style={inputStyle} inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="LINE ID (ไม่บังคับ)">
            <input className={inputClass} style={inputStyle} value={lineId} onChange={(e) => setLineId(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl p-5 sm:p-6" style={{ backgroundColor: EL.char, color: EL.cream }}>
        <div className="flex items-baseline justify-between gap-4">
          <span>
            {solo ? "สมัครคนเดียว" : `${members.length} คน × ฿${ELEMENTAL.groupPriceBaht}`}
          </span>
          <span className="text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            ฿{total.toLocaleString("en-US")}
          </span>
        </div>
        {solo && (
          <p className="text-sm" style={{ color: EL.creamSoft }}>
            มากับเพื่อนตั้งแต่ 2 คน เหลือคนละ ฿{ELEMENTAL.groupPriceBaht}
          </p>
        )}
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(243,239,230,0.2)" }}>
          <Check checked={noRefund} onChange={setNoRefund} error={errors.noRefund}>
            รับทราบว่าชำระค่าสมัครแล้ว <strong>ไม่มีการคืนเงิน</strong>
          </Check>
          <Check checked={contactAfter} onChange={setContactAfter}>
            ให้ PassionSeed ติดต่อเรื่องกิจกรรมอื่นหลังจบ Hackathon ได้ (ไม่บังคับ)
          </Check>
        </div>
      </section>

      {serverError && (
        <p role="alert" className="text-sm" style={{ color: EL.ember }}>
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold disabled:opacity-60 sm:w-auto"
        style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        ไปหน้าชำระเงิน ฿{total.toLocaleString("en-US")}
      </button>
    </form>
  );
}
