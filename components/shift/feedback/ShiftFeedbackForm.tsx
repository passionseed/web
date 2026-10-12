"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

import { ChoiceChips, INPUT, Question } from "@/components/shift/form/ShiftQuestion";
import { INK } from "@/components/shift/poster/riso";
import type { ShiftCohort } from "@/lib/content/shift-cohort";
import {
  FEEDBACK_MOTIVATIONS,
  FEEDBACK_NEXT_STEPS,
  FEEDBACK_PAYERS,
  FEEDBACK_PRICE_FIT,
  FEEDBACK_QUOTE_OK,
  shiftFeedbackSchema,
  toFeedbackErrors,
  type ShiftFeedbackErrors,
  type ShiftFeedbackInput,
} from "@/lib/shift/feedback";

import { CheckChips, ScaleChips } from "./FeedbackChips";

/**
 * End-of-round SHIFT feedback: 12 questions, about 5 minutes, no login.
 * Validates with the API's schema so errors show before submit.
 */

type Values = Omit<ShiftFeedbackInput, "satisfaction" | "confidence" | "ownership" | "recommend"> & {
  satisfaction?: number;
  confidence?: number;
  ownership?: number;
  recommend?: number;
};
type Field = keyof Values;
type NextStep = ShiftFeedbackInput["nextSteps"][number];
type Status = "idle" | "sending" | "done" | "error";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

/** Picking "not now" clears the rest; picking anything else clears "not now". */
function toggleNextStep(steps: NextStep[], step: NextStep): NextStep[] {
  if (steps.includes(step)) return steps.filter((s) => s !== step);
  if (step === "not_now") return ["not_now"];
  return [...steps.filter((s) => s !== "not_now"), step];
}

function revealFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const alert = form?.querySelector<HTMLElement>("[role=alert]");
    alert?.closest("fieldset")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function PartHeading({ children }: { children: string }) {
  return (
    <p
      className="mt-12 pb-2 font-kodchasan text-sm font-semibold uppercase tracking-[0.2em]"
      style={{ color: INK.yellow }}
    >
      {children}
    </p>
  );
}

function FeedbackDone() {
  return (
    <div className="py-16 text-center">
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: INK.paper, color: INK.black }}
      >
        <Check className="h-7 w-7" strokeWidth={3} />
      </span>
      <p className="mt-6 font-kodchasan text-2xl font-bold">ได้รับแล้ว ขอบคุณนะ</p>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed" style={{ color: paper("b3") }}>
        ทุกคำตอบพี่อ่านเองหมด และจะเอาไปปรับ SHIFT รอบหน้า
      </p>
    </div>
  );
}

export function ShiftFeedbackForm({ cohort }: { cohort: ShiftCohort }) {
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
    nextSteps: [],
    quoteOk: "" as Values["quoteOk"],
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

  if (status === "done") return <FeedbackDone />;

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <Question label="ชื่อเล่น" hint="พี่อ่านคู่กับสิ่งที่เห็นตลอด 7 วัน ไม่เอาชื่อไปเผยแพร่" error={errors.nickname}>
        <input {...text("nickname")} placeholder="ชื่อเล่น" autoComplete="nickname" />
      </Question>

      <PartHeading>1 · 7 วันที่ผ่านมา</PartHeading>

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

      <PartHeading>2 · คุ้มไหม</PartHeading>

      <Question num={7} label="ส่วนไหนของ SHIFT มีค่ากับเรามากที่สุด" error={errors.mostValuable}>
        {longText("mostValuable", "พิมพ์แบบที่เล่าให้เพื่อนฟังได้เลย")}
      </Question>

      <Question num={8} label="SHIFT รอบหน้าควรเปลี่ยนอะไร" hint="ติตรงๆ ได้เต็มที่" error={errors.changeNext}>
        {longText("changeNext", "อยากให้...")}
      </Question>

      <Question num={9} label="เทียบกับสิ่งที่ได้ ราคาถือว่า" error={errors.priceFit}>
        <ChoiceChips name="ราคา" options={FEEDBACK_PRICE_FIT} value={values.priceFit} onChange={(v) => set("priceFit", v)} />
      </Question>

      <Question num={10} label="ใครจ่ายค่าที่นั่งให้เรา" error={errors.payer}>
        <ChoiceChips name="คนจ่าย" options={FEEDBACK_PAYERS} value={values.payer} onChange={(v) => set("payer", v)} />
      </Question>

      <Question num={11} label="จะแนะนำ SHIFT ให้เพื่อนแค่ไหน" error={errors.recommend}>
        <ScaleChips name="แนะนำเพื่อน" min={0} max={10} low="ไม่แนะนำเลย" high="แนะนำแน่นอน" value={values.recommend} onChange={(v) => set("recommend", v)} />
      </Question>

      <PartHeading>3 · ต่อจากนี้</PartHeading>

      <Question num={12} label="อยากทำอะไรต่อ" hint="เลือกได้หลายข้อ" error={errors.nextSteps}>
        <CheckChips options={FEEDBACK_NEXT_STEPS} value={values.nextSteps} onChange={(v) => set("nextSteps", toggleNextStep(values.nextSteps, v))} />
      </Question>

      <Question label="ขอยกคำตอบไปใช้ โดยไม่ใส่ชื่อได้ไหม" hint="เช่น เล่าให้น้องรุ่นหน้าฟังว่ารุ่นพี่ได้อะไร ไม่ได้ก็ไม่เป็นไรเลย" error={errors.quoteOk}>
        <ChoiceChips name="ยกคำตอบไปใช้" options={FEEDBACK_QUOTE_OK} value={values.quoteOk} onChange={(v) => set("quoteOk", v)} />
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
        {status === "error" && (
          <p className="mb-6 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
            ส่งไม่สำเร็จ ลองกดส่งใหม่อีกครั้งนะ คำตอบที่กรอกยังอยู่ครบ
          </p>
        )}
        <button type="submit" disabled={status === "sending"} className="shift-button w-full sm:w-auto">
          <span>{status === "sending" ? "กำลังส่ง..." : "ส่งคำตอบ"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
