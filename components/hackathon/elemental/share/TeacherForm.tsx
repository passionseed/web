"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Field, TextInput } from "@/components/hackathon/elemental/join/fields";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { demoDayLine, ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { parseOptionalPhone, parseTeacherContact } from "@/lib/hackathon/elemental/share-rules";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

import { lineHelp } from "./copy-shared";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { btn, ErrorLine, filled, hairline, Lead, Page, Title } from "./ui";

/**
 * The public teacher page (Big, 2026-11-27): no sign-up. A teacher gives a
 * name, picks the school and leaves an email or LINE ID; they get a private
 * page with their own poster and link. 50 devices: invited to Demo Day.
 * 3 paid as well, first at the school: the school's free seat, for a student
 * they choose. Teachers are adults; their name and contact are for staff only.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  top: `${ELEMENTAL.edition} Hackathon · สำหรับคุณครู`,
  title: "ลิงก์แชร์ของคุณครู",
  lead: "สร้างโปสเตอร์และลิงก์ของคุณครูเอง ส่งให้นักเรียนในกลุ่ม LINE ไม่ต้องสมัครสมาชิก",
  rewards: [
    { n: `${SHARE.devicesGoal}`, what: "คนเปิดลิงก์", get: `เชิญคุณครูมา ${demoDayLine()}` },
    { n: `+${SHARE.paidGoal}`, what: "คนสมัครแล้วจ่าย", get: "ที่นั่งฟรี 1 ที่ ให้นักเรียนที่คุณครูเลือก" },
  ],
  seatRule: "ที่นั่งฟรีมีโรงเรียนละ 1 ที่ ลิงก์แรกในโรงเรียนที่ครบได้ นับทั้งลิงก์ครูและลิงก์นักเรียน",
  formHeading: "สร้างลิงก์",
  name: "ชื่อ-นามสกุล",
  school: "โรงเรียน",
  contact: "อีเมล หรือ LINE ID",
  contactHint: "ทีมงานใช้ติดต่อเรื่อง Demo Day",
  phone: "เบอร์โทร (ไม่บังคับ)",
  privacy: "ชื่อและช่องทางติดต่อของคุณครูเห็นเฉพาะทีมงาน ไม่แสดงบนหน้าไหน",
  submit: "สร้างลิงก์ของฉัน",
  busy: "กำลังสร้าง…",
  closedTitle: "ลิงก์แชร์ของคุณครู",
  closed: "ตอนนี้ยังไม่เปิด",
  errors: {
    name: "ใส่ชื่อ-นามสกุล",
    school: "เลือกโรงเรียน",
    contact: "ใส่อีเมล หรือ LINE ID ให้ถูก",
    phone: "เบอร์โทรไม่ถูก ใส่ตัวเลข 9 ถึง 15 หลัก หรือเว้นว่างไว้",
    invalid: "เช็กชื่ออีกครั้ง",
    exists: `อีเมลหรือ LINE ID นี้มีลิงก์แล้ว ${lineHelp} เพื่อขอลิงก์เดิม`,
    rate_limited: "สร้างลิงก์ถี่เกินไป ลองใหม่ในอีก 1 ชั่วโมง",
    closed: "ตอนนี้ปิดแล้ว",
    other: "ยังสร้างไม่ได้ ลองอีกครั้ง",
  } as Record<string, string>,
};

type Errors = Partial<Record<"name" | "school" | "contact" | "phone" | "form", string>>;

function Rewards() {
  return (
    <div className="mt-8 rounded-2xl border" style={{ borderColor: hairline }}>
      {COPY.rewards.map((r, i) => (
        <div key={r.what} className="flex items-center gap-4 p-5" style={i > 0 ? { borderTop: `1px solid ${hairline}` } : undefined}>
          <span className="w-16 shrink-0 text-4xl tabular-nums" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flame }}>
            {r.n}
          </span>
          <span className="min-w-0">
            <span className="block text-sm" style={{ color: EL.inkSoft }}>
              {r.what}
            </span>
            <span className="block text-base font-semibold">{r.get}</span>
          </span>
        </div>
      ))}
      <p className="px-5 pb-5 text-sm" style={{ color: EL.inkSoft }}>
        {COPY.seatRule}
      </p>
    </div>
  );
}

export function TeacherForm({ open, demo }: { open: boolean; demo?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState<SchoolChoice | null>(null);
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Page top={COPY.top}>
        <Title>{COPY.closedTitle}</Title>
        <Lead>{COPY.closed}</Lead>
      </Page>
    );
  }

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = COPY.errors.name;
    else if (isRudeTeamName(name)) next.name = COPY.errors.invalid;
    if (!school) next.school = COPY.errors.school;
    if (!parseTeacherContact(contact)) next.contact = COPY.errors.contact;
    if (!parseOptionalPhone(phone).ok) next.phone = COPY.errors.phone;
    setErrors(next);
    if (Object.keys(next).length > 0 || !school) return;

    setBusy(true);
    try {
      if (demo) {
        router.push("/hackathon/elemental/teacher/demo?s=start");
        return;
      }
      const res = await fetch("/api/hackathon/elemental/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          phone: phone.trim() || undefined,
          school: "custom" in school ? { customName: school.name, province: school.province || undefined } : { schoolKey: school.key },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        router.push(`/hackathon/elemental/teacher/${data.token}`);
        return;
      }
      const field = data.error === "contact" || data.error === "phone" || data.error === "school" ? data.error : null;
      setErrors(field ? { [field]: COPY.errors[field] } : { form: COPY.errors[data.error] ?? COPY.errors.other });
      setBusy(false);
    } catch {
      setErrors({ form: COPY.errors.other });
      setBusy(false);
    }
  };

  return (
    <Page top={COPY.top}>
      <Title>{COPY.title}</Title>
      <Lead>{COPY.lead}</Lead>
      <Rewards />

      <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
        <h2 className="text-xl font-semibold">{COPY.formHeading}</h2>
        <Field label={COPY.name} error={errors.name}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} invalid={!!errors.name} />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">{COPY.school}</p>
          <SchoolPicker startQuery="" value={school} onChange={setSchool} />
          {errors.school && (
            <div className="mt-1.5">
              <ErrorLine>{errors.school}</ErrorLine>
            </div>
          )}
        </div>
        <Field label={COPY.contact} hint={COPY.contactHint} error={errors.contact}>
          <TextInput value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email" autoCapitalize="none" maxLength={120} invalid={!!errors.contact} />
        </Field>
        <Field label={COPY.phone} error={errors.phone}>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" maxLength={30} invalid={!!errors.phone} />
        </Field>
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {COPY.privacy}
        </p>
        {errors.form && <ErrorLine>{errors.form}</ErrorLine>}
        <button type="submit" disabled={busy} className={`${btn} w-full`} style={filled}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? COPY.busy : COPY.submit}
        </button>
      </form>
    </Page>
  );
}
