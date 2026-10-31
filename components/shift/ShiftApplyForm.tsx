"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

import { getShiftSource, normalizeShiftSource } from "@/lib/shift/attribution";
import { trackMetaEvent } from "@/components/shift/MetaPixel";
import { INK } from "@/components/shift/poster/riso";
import {
  formatThaiDateRange,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

import { PdpaNotice } from "@/components/shift/consent/PdpaNotice";
import { SHIFT_NOTICE, applicantNeedsParent } from "@/lib/shift/parentConsent";

import { ShiftApplyDone } from "./apply/ShiftApplyDone";
import { ChoiceChips, INPUT, Question } from "./form/ShiftQuestion";
import {
  clearApplyDraft,
  clearSubmittedApplication,
  readSubmittedApplication,
  saveSubmittedApplication,
  useApplyDraft,
  type SubmittedApplication,
} from "./apply/useApplyDraft";
import {
  SHIFT_AVAILABILITY,
  SHIFT_FOUND_VIA,
  SHIFT_GRADES,
  shiftApplicationSchema,
  toFieldErrors,
  type ShiftApplicationErrors,
  type ShiftApplicationInput,
} from "@/lib/shift/application";

/**
 * Public SHIFT application: one screen, no login, thumb-friendly.
 * Validates with the same schema as the API so errors show before submit,
 * but the server stays the real gate.
 */

type Field = keyof ShiftApplicationInput;
type Status = "idle" | "sending" | "done" | "error" | "closed";

const EMPTY: ShiftApplicationInput = {
  fullName: "",
  nickname: "",
  grade: "" as ShiftApplicationInput["grade"],
  birthDate: "",
  targetTrack: "",
  problem: "",
  availability: "" as ShiftApplicationInput["availability"],
  igHandle: "",
  discordHandle: "",
  parentEmail: "",
  parentContact: "",
  foundVia: "" as ShiftApplicationInput["foundVia"],
  consent: false as unknown as true,
  source: "",
  website: "",
};

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Mirrors the schema's limits for the problem field, for the live counter. */
const PROBLEM_MIN = 20;
const PROBLEM_MAX = 800;

/** Brings the first invalid question into view, which on a phone is often
 *  far above the submit button, and focuses its input. */
function revealFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const alert = form?.querySelector<HTMLElement>("[role=alert]");
    const fieldset = alert?.closest("fieldset") ?? alert?.parentElement;
    if (!fieldset) return;
    fieldset.scrollIntoView({ behavior: "smooth", block: "center" });
    // Questions 1, 2, 6 and 7 hold two inputs; the empty one is the likely culprit.
    const inputs = Array.from(
      fieldset.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type=checkbox]), textarea",
      ),
    );
    (inputs.find((input) => !input.value.trim()) ?? inputs[0])?.focus({
      preventScroll: true,
    });
  });
}

function CharCount({ length }: { length: number }) {
  const short = length < PROBLEM_MIN;
  return (
    <p
      className="mt-2 text-right text-xs tabular-nums"
      style={{ color: short ? paper("80") : INK.yellow }}
      aria-live="polite"
    >
      {short
        ? `อีก ${PROBLEM_MIN - length} ตัวอักษร`
        : `${length}/${PROBLEM_MAX}`}
    </p>
  );
}

/** "Some days" is fine, but a whole other week may fit better. */
function SomeDaysNote({ otherRounds }: { otherRounds: ShiftCohort[] }) {
  if (otherRounds.length === 0) return null;
  return (
    <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("b3") }}>
      ถ้าอีกสัปดาห์ว่างกว่า สมัครรอบนั้นแทนได้ คำตอบที่กรอกไว้ตามไปด้วย:{" "}
      {otherRounds.map((other, i) => (
        <span key={other.round}>
          {i > 0 && " / "}
          <a
            href={other.applyUrl}
            className="font-semibold underline underline-offset-4"
            style={{ color: INK.yellow }}
          >
            {other.name} ({formatThaiDateRange(other.startDate, other.endDate)})
          </a>
        </span>
      ))}
    </p>
  );
}

export function ShiftApplyForm({
  cohort,
  source,
  otherRounds = [],
  intro,
}: {
  cohort: ShiftCohort;
  source?: string;
  /** Other open rounds, offered when this week only partly fits. */
  otherRounds?: ShiftCohort[];
  /** Shown above the questions, hidden once the application is in. */
  intro?: ReactNode;
}) {
  const [values, setValues] = useState<ShiftApplicationInput>({
    ...EMPTY,
    source: source ?? "",
    round: cohort.round,
  });
  const cohortDates = formatThaiDateRange(cohort.startDate, cohort.endDate);
  const [errors, setErrors] = useState<ShiftApplicationErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitted, setSubmitted] = useState<SubmittedApplication | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Under 20 (or no valid birth date yet) the parent question shows. PDPA s.20.
  const needsParent = applicantNeedsParent(values.birthDate);

  useApplyDraft(values, (draft) => setValues((prev) => ({ ...prev, ...draft })));

  // Back from an abandoned Discord sign-in reloads this page: show the done
  // screen again instead of a blank form. After mount, like the draft.
  useEffect(() => {
    setSubmitted(readSubmittedApplication(cohort.round));
  }, [cohort.round]);

  const set = <K extends Field>(field: K, value: ShiftApplicationInput[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const text = (field: Field) => ({
    value: (values[field] as string) ?? "",
    onChange: (e: { target: { value: string } }) =>
      set(field, e.target.value as never),
    className: INPUT,
    style: {
      borderColor: errors[field] ? INK.pink : paper("33"),
      color: INK.paper,
    },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { ...values, source: normalizeShiftSource(source) ?? getShiftSource() ?? "direct" };
    const parsed = shiftApplicationSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      revealFirstError(formRef.current);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/shift/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { joinUrl?: string };
        const entry = { round: cohort.round, values, joinUrl: data.joinUrl ?? null };
        saveSubmittedApplication(entry);
        clearApplyDraft();
        setSubmitted(entry);
        setStatus("done");
        trackMetaEvent("Lead", { content_name: cohort.name, content_category: "shift" });
        return;
      }
      // The round closed while the form was open (e.g. past midnight on the deadline).
      if (res.status === 409) {
        setStatus("closed");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.fields) {
        setErrors(data.fields);
        revealFirstError(formRef.current);
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  // A friend applying next on the same phone starts from a blank form.
  function applyForSomeoneElse() {
    clearSubmittedApplication();
    setSubmitted(null);
    setStatus("idle");
    setErrors({});
    setValues({ ...EMPTY, source: source ?? "", round: cohort.round });
  }

  if (submitted) {
    return (
      <ShiftApplyDone
        cohort={cohort}
        values={submitted.values}
        joinUrl={submitted.joinUrl}
        onApplyAgain={applyForSomeoneElse}
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      {intro && (
        <>
          {intro}
          <p
            className="mt-10 text-center font-kodchasan text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: paper("80") }}
          >
            ใบสมัคร · {needsParent ? 8 : 7} ข้อ · 2 นาที
          </p>
        </>
      )}
      <Question
        num={1}
        label="ชื่อเล่น และชื่อจริง"
        error={errors.nickname ?? errors.fullName}
      >
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <input
            {...text("nickname")}
            placeholder="ชื่อเล่น"
            autoComplete="nickname"
          />
          <input
            {...text("fullName")}
            placeholder="ชื่อ นามสกุล"
            autoComplete="name"
          />
        </div>
      </Question>

      <Question
        num={2}
        label="ตอนนี้เรียนชั้นไหน และวันเกิด"
        hint="อายุยังไม่ถึง 20 ปี ผู้ปกครองต้องกดยินยอมด้วยตามกฎหมาย PDPA"
        error={errors.grade ?? errors.birthDate}
      >
        <ChoiceChips
          name="ชั้นเรียน"
          options={SHIFT_GRADES}
          value={values.grade}
          onChange={(v) => set("grade", v)}
        />
        <input
          {...text("birthDate")}
          type="date"
          aria-label="วันเกิด"
          autoComplete="bday"
          className={`${INPUT} mt-4`}
          style={{ ...text("birthDate").style, colorScheme: "dark" }}
        />
      </Question>

      <Question
        num={3}
        label="คณะหรือสายที่เล็งไว้ใน TCAS1"
        hint="ยังไม่รู้ก็ข้ามได้"
        error={errors.targetTrack}
      >
        <input
          {...text("targetTrack")}
          placeholder="เช่น วิศวะคอม, BBA, ยังไม่แน่ใจ"
        />
      </Question>

      <Question
        num={4}
        label="ปัญหา 1 ข้อที่อยากแก้"
        hint="ใครเจอปัญหานี้ และเรารู้ได้ยังไงว่าเขาเจอจริง ไอเดียดิบๆ ได้เลย ไม่ต้องสวย"
        error={errors.problem}
      >
        <textarea
          {...text("problem")}
          rows={4}
          placeholder="เช่น เพื่อนในห้องจำตารางสอบไม่ได้ เพราะครูประกาศคนละที่ เห็นเพื่อน 5 คนสอบพลาดเทอมนี้"
          maxLength={PROBLEM_MAX}
          className={`${INPUT} resize-none leading-relaxed`}
        />
        <CharCount length={values.problem.trim().length} />
      </Question>

      <Question
        num={5}
        label={`ว่างช่วง ${cohortDates} ${cohort.sessionTime} น. ไหม`}
        error={errors.availability}
      >
        <ChoiceChips
          name="เวลาว่าง"
          options={SHIFT_AVAILABILITY}
          value={values.availability}
          onChange={(v) => set("availability", v)}
        />
        {values.availability === "some_days" && (
          <SomeDaysNote otherRounds={otherRounds} />
        )}
      </Question>

      <Question
        num={6}
        label="IG และ Discord"
        hint="เราจะทักกลับทาง IG ส่วน Discord ถ้ายังไม่มีก็ไม่เป็นไร"
        error={errors.igHandle ?? errors.discordHandle}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            {...text("igHandle")}
            placeholder="@ig ของเรา"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <input
            {...text("discordHandle")}
            placeholder="Discord (ถ้ามี)"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </Question>

      {needsParent && (
        <Question
          num={7}
          label="อีเมล และเบอร์หรือ LINE ผู้ปกครอง"
          hint="เราส่งลิงก์ให้ผู้ปกครองกดยินยอมทางอีเมล เบอร์หรือ LINE ไว้ยืนยันการเข้าร่วมและการชำระเงินเท่านั้น"
          error={errors.parentEmail ?? errors.parentContact}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              {...text("parentEmail")}
              type="email"
              inputMode="email"
              placeholder="อีเมลผู้ปกครอง"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input
              {...text("parentContact")}
              placeholder="เช่น 08x-xxx-xxxx หรือ LINE ID"
            />
          </div>
        </Question>
      )}

      <Question num={needsParent ? 8 : 7} label="รู้จัก SHIFT จากไหน" error={errors.foundVia}>
        <div className="relative">
          <select
            name="foundVia"
            value={values.foundVia}
            onChange={(e) => set("foundVia", e.target.value as ShiftApplicationInput["foundVia"])}
            aria-invalid={errors.foundVia ? true : undefined}
            className={`${INPUT} appearance-none pr-10`}
            style={{ ...text("foundVia").style, colorScheme: "dark" }}
          >
            <option value="" disabled>
              เลือกช่องทาง
            </option>
            {SHIFT_FOUND_VIA.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: paper("99") }}
            aria-hidden="true"
          />
        </div>
      </Question>

      {/* Honeypot: hidden from people, visible to naive bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={values.website}
        onChange={(e) => set("website", e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="border-t pt-7" style={{ borderColor: paper("1f") }}>
        <PdpaNotice
          notice={SHIFT_NOTICE}
          variant="collapsed"
          collapsedLabel="ข้อมูลในใบสมัครไปไหนบ้าง (อ่านก่อนติ๊ก)"
        />
        <label
          className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
          style={{ color: paper("b3") }}
        >
          <input
            type="checkbox"
            checked={Boolean(values.consent)}
            onChange={(e) => set("consent", e.target.checked as true)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#ff6c2f]"
          />
          อ่านแล้วว่าข้อมูลไปไหนบ้าง และยินยอมให้ PassionSeed ใช้ข้อมูลนี้เพื่อคัดเลือก
          ติดต่อ และดูแลเรื่อง SHIFT ตามที่แจ้งไว้ด้านบน
        </label>
        {errors.consent && (
          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: INK.pink }}
            role="alert"
          >
            {errors.consent}
          </p>
        )}

        {status === "error" && (
          <p
            className="mt-6 text-sm font-semibold"
            style={{ color: INK.pink }}
            role="alert"
          >
            ส่งไม่สำเร็จ ลองกดส่งใหม่อีกครั้งนะ ข้อมูลที่กรอกยังอยู่ครบ
          </p>
        )}
        {status === "closed" && (
          <p
            className="mt-6 text-sm font-semibold"
            style={{ color: INK.pink }}
            role="alert"
          >
            {cohort.name} ปิดรับสมัครไปแล้ว รีเฟรชหน้านี้เพื่อดูรอบที่ยังเปิดอยู่ ข้อมูลที่กรอกยังอยู่ครบ
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="shift-button mt-8 w-full sm:w-auto"
        >
          <span>{status === "sending" ? "กำลังส่ง..." : "ส่งใบสมัคร"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
