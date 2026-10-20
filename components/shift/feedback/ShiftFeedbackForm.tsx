"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

import { ChoiceChips, INPUT, Question } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import type { ShiftCohort } from "@/lib/content/shift-cohort";
import {
  communitySignupOffer,
  FEEDBACK_CONTINUE_PROJECTS,
  FEEDBACK_DAYS,
  FEEDBACK_MOTIVATIONS,
  FEEDBACK_NEXT_STEPS,
  FEEDBACK_PAYERS,
  FEEDBACK_PRICE_FIT,
  FEEDBACK_QUOTE_MODES,
  shiftFeedbackSchema,
  toFeedbackErrors,
  type ShiftFeedbackErrors,
  type ShiftFeedbackInput,
} from "@/lib/shift/feedback";

import { CheckChips, DayChips, ScaleChips } from "./FeedbackChips";
import { FeedbackConsent } from "./FeedbackConsent";
import styles from "./feedback.module.css";
import space from "../next/shiftNext.module.css";

/**
 * End-of-round SHIFT feedback: 15 questions, about 5 minutes, no login.
 * Ends with the alumni ask (one project to keep going, days for the weekly
 * session) and a real community sign-up. Validates with the API's schema so errors show before submit.
 */

type Values = Omit<ShiftFeedbackInput, "satisfaction" | "confidence" | "ownership" | "recommend"> & {
  satisfaction?: number;
  confidence?: number;
  ownership?: number;
  recommend?: number;
};
type Field = keyof Values;
type Status = "idle" | "sending" | "done" | "error";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Picking the stand-alone option (e.g. "not now") clears the rest;
 *  picking anything else clears it. */
function toggleExclusive<T extends string>(picked: T[], item: T, alone: T): T[] {
  if (picked.includes(item)) return picked.filter((p) => p !== item);
  if (item === alone) return [alone];
  return [...picked.filter((p) => p !== alone), item];
}

function revealFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const alert = form?.querySelector<HTMLElement>("[role=alert]");
    alert?.closest("fieldset")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function PartHeading({ index, children }: { index: number; children: string }) {
  return (
    <p className={styles.part}>
      <span className={styles.partIndex}>{String(index).padStart(2, "0")}</span>
      <span className={styles.partTitle}>{children}</span>
    </p>
  );
}

function FeedbackDone({ comingBack, joining }: { comingBack: boolean; joining: boolean }) {
  return (
    <div className={styles.done} role="status">
      <span className={styles.doneMark}>
        <Check className="h-7 w-7" strokeWidth={3} />
      </span>
      <p className={styles.doneTitle}>ได้รับแล้ว ขอบคุณนะ</p>
      <p className={styles.doneNote}>ทุกคำตอบพี่อ่านเองหมด และจะเอาไปปรับ SHIFT รอบหน้า</p>
      {comingBack && <p className={styles.doneNote}>รายละเอียด AfterSHIFT พี่จะส่งในกลุ่มนะ แล้วเจอกัน</p>}
      {joining && <p className={styles.doneNote}>ขอบคุณที่สนใจ AfterSHIFT นะ รายละเอียดกับวิธีจ่าย พี่จะส่งในกลุ่ม</p>}
      <Link href="/shift/alumni" className={`${space.cta} mt-6`}>
        <span>รู้จัก AfterSHIFT และดูนัดต่อไป</span><ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function ShiftFeedbackForm({
  cohort,
  sessionHint,
}: {
  cohort: ShiftCohort;
  /** Day-picker hint, worked out on the server so it matches on hydration. */
  sessionHint: string;
}) {
  const communityOffer = communitySignupOffer(cohort.round);
  const [values, setValues] = useState<Values>({
    round: cohort.round,
    nickname: "",
    canDoNow: "",
    ownDecision: "",
    motivation: "" as Values["motivation"],
    mostValuable: "",
    changeNext: "",
    priceFit: "" as Values["priceFit"],
    payer: "" as Values["payer"],
    continueProject: "" as Values["continueProject"],
    continueProjectNote: "",
    availableDays: [],
    nextSteps: [],
    communitySignup: "" as Values["communitySignup"],
    quoteMode: "" as Values["quoteMode"],
    quoteName: "",
    consent: false as unknown as true,
    website: "",
  });
  const [errors, setErrors] = useState<ShiftFeedbackErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends Field>(field: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const text = (field: Field) => ({
    value: (values[field] as string) ?? "",
    onChange: (e: { target: { value: string } }) => set(field, e.target.value as never),
    className: INPUT,
    style: { borderColor: errors[field] ? INK.pink : paper("33"), color: INK.paper },
  });

  const longText = (field: Field, placeholder: string) => (
    <textarea
      {...text(field)}
      rows={3}
      maxLength={1000}
      placeholder={placeholder}
      className={`${INPUT} resize-none leading-relaxed`}
    />
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = shiftFeedbackSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFeedbackErrors(parsed.error));
      revealFirstError(formRef.current);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/shift/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setStatus("done");
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

  if (status === "done") {
    return (
      <FeedbackDone
        comingBack={values.availableDays.length > 0 && !values.availableDays.includes("none")}
        joining={values.communitySignup === "join"}
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <Question label="ชื่อเล่น" hint="พี่อ่านคู่กับสิ่งที่เห็นตลอด 7 วัน ไม่เอาชื่อไปเผยแพร่" error={errors.nickname}>
        <input {...text("nickname")} placeholder="ชื่อเล่น" autoComplete="nickname" />
      </Question>

      <PartHeading index={1}>7 วันที่ผ่านมา</PartHeading>

      <Question num={1} label="พอใจกับสิ่งที่ทำได้ใน 7 วันแค่ไหน" error={errors.satisfaction}>
        <ScaleChips name="ความพอใจ" min={1} max={5} low="ไม่พอใจเลย" high="พอใจมาก" value={values.satisfaction} onChange={(v) => set("satisfaction", v)} />
      </Question>

      <Question num={2} label="ตอนนี้ทำอะไรได้ ที่วันแรกยังทำไม่ได้" error={errors.canDoNow}>
        {longText("canDoNow", "เช่น คุยกับคนแปลกหน้าเพื่อถามปัญหาได้, ปล่อยเว็บขึ้นจริงได้")}
      </Question>

      <Question num={3} label="มั่นใจแค่ไหนว่าจะเริ่มโปรเจกต์ใหม่ได้เอง โดยไม่มีพี่ mentor" error={errors.confidence}>
        <ScaleChips name="ความมั่นใจ" min={1} max={5} low="ไม่มั่นใจเลย" high="มั่นใจมาก" value={values.confidence} onChange={(v) => set("confidence", v)} />
      </Question>

      <Question num={4} label="โปรเจกต์นี้รู้สึกเป็นของเราแค่ไหน" error={errors.ownership}>
        <ScaleChips name="ความเป็นเจ้าของ" min={1} max={5} low="ไม่ใช่ของเราเลย" high="ของเราเต็มๆ" value={values.ownership} onChange={(v) => set("ownership", v)} />
      </Question>

      <Question num={5} label="มีตอนไหนที่เราตัดสินใจเอง" hint="เล็กๆ ก็นับ เช่น ตัดฟีเจอร์ทิ้ง หรือเปลี่ยนโจทย์" error={errors.ownDecision}>
        {longText("ownDecision", "ตอนที่...")}
      </Question>

      <Question num={6} label="ทำไมถึงทำโปรเจกต์ต่อจนจบ" hint="เลือกข้อที่ตรงที่สุด" error={errors.motivation}>
        <ChoiceChips name="เหตุผล" stacked options={FEEDBACK_MOTIVATIONS} value={values.motivation} onChange={(v) => set("motivation", v)} />
      </Question>

      <PartHeading index={2}>คุ้มไหม</PartHeading>

      <Question num={7} label="ส่วนไหนของ SHIFT มีค่ากับเรามากที่สุด" error={errors.mostValuable}>
        {longText("mostValuable", "พิมพ์แบบที่เล่าให้เพื่อนฟังได้เลย")}
      </Question>

      <Question num={8} label="SHIFT รอบหน้าควรเปลี่ยนอะไร" hint="ติตรงๆ ได้เต็มที่" error={errors.changeNext}>
        {longText("changeNext", "อยากให้...")}
      </Question>

      <Question num={9} label="เทียบกับสิ่งที่ได้ ราคาถือว่า" hint={`ข้อนี้ถามถึงค่าเข้าร่วม ${cohort.name} จำนวน ${cohort.priceBaht.toLocaleString("th-TH")} บาท`} error={errors.priceFit}>
        <ChoiceChips name="ราคา" options={FEEDBACK_PRICE_FIT} value={values.priceFit} onChange={(v) => set("priceFit", v)} />
      </Question>

      <Question num={10} label="ใครจ่ายค่าที่นั่งให้เรา" error={errors.payer}>
        <ChoiceChips name="คนจ่าย" stacked options={FEEDBACK_PAYERS} value={values.payer} onChange={(v) => set("payer", v)} />
      </Question>

      <Question num={11} label="จะแนะนำ SHIFT ให้เพื่อนแค่ไหน" error={errors.recommend}>
        <ScaleChips name="แนะนำเพื่อน" min={0} max={10} low="ไม่แนะนำเลย" high="แนะนำแน่นอน" value={values.recommend} onChange={(v) => set("recommend", v)} />
      </Question>

      <PartHeading index={3}>ต่อจากนี้</PartHeading>

      <Question num={12} label="เลือกโปรเจกต์ไว้ทำต่อหนึ่งอย่าง" hint="ไม่ต้องใหญ่ เลือกอันเดียวพอ" error={errors.continueProject ?? errors.continueProjectNote}>
        <ChoiceChips stacked name="โปรเจกต์ที่จะทำต่อ" options={FEEDBACK_CONTINUE_PROJECTS} value={values.continueProject} onChange={(v) => set("continueProject", v)} />
        {values.continueProject && values.continueProject !== "not_now" && (
          <input
            {...text("continueProjectNote")}
            maxLength={200}
            placeholder={values.continueProject === "join" ? "โปรเจกต์ของใคร (ไม่ใส่ก็ได้)" : "โปรเจกต์อะไร (ไม่ใส่ก็ได้)"}
            className={`${INPUT} mt-4`}
          />
        )}
      </Question>

      <Question num={13} label="มาเจอกันที่ AfterSHIFT ทุกสัปดาห์ วันไหนสะดวกบ้าง" hint={sessionHint} error={errors.availableDays}>
        <DayChips options={FEEDBACK_DAYS} none="none" value={values.availableDays} onChange={(v) => set("availableDays", toggleExclusive(values.availableDays, v, "none"))} />
      </Question>

      <Question num={14} label="อยากช่วยมากกว่านั้นไหม" hint="เลือกได้หลายข้อ" error={errors.nextSteps}>
        <CheckChips options={FEEDBACK_NEXT_STEPS} value={values.nextSteps} onChange={(v) => set("nextSteps", toggleExclusive(values.nextSteps, v, "not_now"))} />
      </Question>

      <Question num={15} label="อยากทำโปรเจกต์ต่อกับ AfterSHIFT ไหม" hint={communityOffer.hint} error={errors.communitySignup}>
        <p className="mb-4 text-sm leading-relaxed"><Link href="/shift/alumni" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">ดูว่า AfterSHIFT ทำอะไรกัน (เปิดแท็บใหม่)</Link></p>
        <ChoiceChips stacked name="AfterSHIFT" options={communityOffer.options} value={values.communitySignup} onChange={(v) => set("communitySignup", v)} />
      </Question>

      <Question
        label="ขอยกคำตอบไปใช้ได้ไหม"
        hint="เช่น เล่าให้น้องรุ่นหน้าฟังว่ารุ่นพี่ได้อะไร ไม่ได้ก็ไม่เป็นไรเลย"
        error={errors.quoteMode ?? errors.quoteName}
      >
        <ChoiceChips stacked name="ยกคำตอบไปใช้" options={FEEDBACK_QUOTE_MODES} value={values.quoteMode} onChange={(v) => set("quoteMode", v)} />
        {values.quoteMode === "named" && (
          <input
            {...text("quoteName")}
            maxLength={40}
            placeholder="ชื่อที่อยากให้ขึ้น เช่น มิว ม.5"
            className={`${INPUT} mt-4`}
          />
        )}
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
        <FeedbackConsent
          checked={Boolean(values.consent)}
          onChange={(checked) => set("consent", checked as true)}
          error={errors.consent}
        />
        {status === "error" && (
          <p className="mb-6 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
            ส่งไม่สำเร็จ ลองกดส่งใหม่อีกครั้งนะ คำตอบที่กรอกยังอยู่ครบ
          </p>
        )}
        <button type="submit" disabled={status === "sending"} className={`${space.cta} ${styles.submit}`}>
          <span>{status === "sending" ? "กำลังส่ง..." : "ส่งคำตอบ"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
