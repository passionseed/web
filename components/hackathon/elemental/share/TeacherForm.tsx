"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { parseTeacherContact } from "@/lib/hackathon/elemental/share-rules";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

import { lineHelp } from "./copy-shared";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { EditorialLink, Fine, H1, Page, PrimaryButton, SkyBand, StickyBar, TextInput, v } from "./ui";

/**
 * The public teacher page, on the dark ground (merged direction §8): no
 * sign-up. A teacher gives a name, picks the school and leaves an email or
 * LINE ID; they get a private page with their own poster, QR code and link,
 * and a count of the devices that open it. No rewards (Big, 2026-11-27).
 * Teachers are adults; their name and contact are for staff only.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "ลิงก์แชร์ของคุณครู",
  lead: "สร้างโปสเตอร์และลิงก์ของคุณครูเอง ส่งให้นักเรียนในกลุ่ม LINE ไม่ต้องสมัครสมาชิก",
  name: "ชื่อ-นามสกุล",
  school: "โรงเรียน",
  contact: "อีเมล หรือ LINE ID",
  contactHint: "ทีมงานใช้ติดต่อ",
  privacy: "ชื่อและช่องทางติดต่อของคุณครูเห็นเฉพาะทีมงาน ไม่แสดงบนหน้าไหน",
  submit: "สร้างลิงก์",
  busy: "กำลังสร้าง…",
  closedTitle: "ลิงก์แชร์ของคุณครู",
  closed: "ตอนนี้ยังไม่เปิด",
  errors: {
    name: "ใส่ชื่อ-นามสกุล",
    school: "เลือกโรงเรียน",
    contact: "ใส่อีเมล หรือ LINE ID ให้ถูก",
    invalid: "เช็กชื่ออีกครั้ง",
    exists: `อีเมลหรือ LINE ID นี้มีลิงก์แล้ว ${lineHelp} เพื่อขอลิงก์เดิม`,
    rate_limited: "สร้างลิงก์ถี่เกินไป ลองใหม่ในอีก 1 ชั่วโมง",
    closed: "ตอนนี้ปิดแล้ว",
    other: "ยังสร้างไม่ได้ ลองอีกครั้ง",
  } as Record<string, string>,
};

const FORM_ID = "elemental-teacher-form";

type Errors = Partial<Record<"name" | "school" | "contact" | "form", string>>;

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" style={{ fontSize: 14, lineHeight: "22px", color: v.error }}>
      {children}
    </p>
  );
}

export function TeacherForm({ open, demo }: { open: boolean; demo?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState<SchoolChoice | null>(null);
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const sky = (
    <SkyBand title={<H1>{open ? COPY.title : COPY.closedTitle}</H1>} lead={open ? COPY.lead : COPY.closed} />
  );

  if (!open) {
    return (
      <Page surface="ground" sky={sky}>
        <EditorialLink href="/hackathon/elemental">{ELEMENTAL.edition} Hackathon</EditorialLink>
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
    setErrors(next);
    if (Object.keys(next).length > 0 || !school) return;

    setBusy(true);
    try {
      if (demo) {
        router.push("/hackathon/elemental/teacher/demo?s=start&new=1");
        return;
      }
      const res = await fetch("/api/hackathon/elemental/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          school: "custom" in school ? { customName: school.name, province: school.province || undefined } : { schoolKey: school.key },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        router.push(`/hackathon/elemental/teacher/${data.token}?new=1`);
        return;
      }
      const field = data.error === "contact" || data.error === "school" ? data.error : null;
      setErrors(field ? { [field]: COPY.errors[field] } : { form: COPY.errors[data.error] ?? COPY.errors.other });
      setBusy(false);
    } catch {
      setErrors({ form: COPY.errors.other });
      setBusy(false);
    }
  };

  return (
    <Page
      surface="ground"
      sky={sky}
      bar={
        <StickyBar>
          <PrimaryButton type="submit" form={FORM_ID} disabled={busy} full arrow={!busy}>
            {busy ? COPY.busy : COPY.submit}
          </PrimaryButton>
        </StickyBar>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-7" noValidate>
        <TextInput id="teacher-name" label={COPY.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} error={errors.name} />
        <div>
          <SchoolPicker label={COPY.school} startQuery="" value={school} onChange={setSchool} />
          {errors.school && (
            <div className="mt-1.5">
              <ErrorText>{errors.school}</ErrorText>
            </div>
          )}
        </div>
        <TextInput
          id="teacher-contact"
          label={COPY.contact}
          hint={COPY.contactHint}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          maxLength={120}
          error={errors.contact}
        />
        <Fine>{COPY.privacy}</Fine>
        {errors.form && <ErrorText>{errors.form}</ErrorText>}
      </form>
    </Page>
  );
}
