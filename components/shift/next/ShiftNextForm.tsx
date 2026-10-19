"use client";

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowRight } from "lucide-react";

import { trackMetaEvent } from "@/components/shift/MetaPixel";
import {
  MIN_BUILDERS,
  NEXT_ROUND_NAME,
  SESSION_TIME,
} from "@/lib/content/shift-next";
import { getShiftSource } from "@/lib/shift/attribution";
import {
  SHIFT_INTEREST_STAGES,
  pickBounds,
  shiftInterestSchema,
  toInterestErrors,
  type DateRange,
  type ShiftInterestErrors,
  type ShiftInterestInput,
} from "@/lib/shift/interest";

import { ShiftNextDone } from "./ShiftNextDone";
import { ShiftRangePicker } from "./ShiftRangePicker";
import styles from "./shiftNext.module.css";

/**
 * The /shift/next pre-order form. One screen, no login. The schema is the
 * same one the API runs, so errors show before submit; the server still
 * decides.
 */

type Status = "idle" | "sending" | "done" | "error";
type Field = keyof ShiftInterestInput;

const EMPTY: ShiftInterestInput = {
  freeRanges: [],
  nickname: "",
  stage: "" as ShiftInterestInput["stage"],
  igHandle: "",
  email: "",
  problem: "",
  committed: false as unknown as true,
  consent: false as unknown as true,
  source: "",
  website: "",
};

function revealFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const alert = form?.querySelector<HTMLElement>("[role=alert]");
    (alert?.closest("fieldset") ?? alert)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

/** One numbered question on the glass console. */
function Question({
  num,
  label,
  hint,
  error,
  children,
}: {
  num: number;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.field}>
      <legend className="sr-only">{label}</legend>
      <div className={styles.fieldRow}>
        <span className={styles.fieldNum} aria-hidden="true">
          {String(num).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className={styles.fieldLabel}>{label}</p>
          {hint && <p className={styles.fieldHint}>{hint}</p>}
          <div className={styles.fieldBody}>{children}</div>
          <FieldError>{error}</FieldError>
        </div>
      </div>
    </fieldset>
  );
}

function ChoiceChips<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={styles.chip}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Tick({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={styles.tick}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{children}</span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function ShiftNextForm({ today }: { today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const bounds = useMemo(() => pickBounds(today), [today]);
  const schema = useMemo(() => shiftInterestSchema(today), [today]);
  const [values, setValues] = useState<ShiftInterestInput>(EMPTY);
  const [errors, setErrors] = useState<ShiftInterestErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  function set<K extends Field>(field: K, value: ShiftInterestInput[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { ...values, source: getShiftSource() ?? "" };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErrors(toInterestErrors(parsed.error));
      revealFirstError(formRef.current);
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/shift/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 422 && body.fields) {
        setErrors(body.fields);
        setStatus("idle");
        revealFirstError(formRef.current);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("done");
      trackMetaEvent("Lead", { content_name: "SHIFT next" });
    } catch (error) {
      console.error("[shift] interest submit failed", error);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <ShiftNextDone
        ranges={values.freeRanges as DateRange[]}
        igHandle={values.igHandle}
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <Question
        num={1}
        label="ช่วงไหนที่คุณว่างตอนเย็น?"
        hint={`SHIFT คือ 7 เย็นติดกัน ${SESSION_TIME} เลือกได้หลายช่วง ยิ่งเลือกกว้าง ยิ่งเปิดรอบได้เร็ว`}
        error={errors.freeRanges}
      >
        <ShiftRangePicker
          value={values.freeRanges as DateRange[]}
          onChange={(ranges) => set("freeRanges", ranges)}
          bounds={bounds}
        />
      </Question>

      <Question num={2} label="ให้เราเรียกว่าอะไรดี?" error={errors.nickname}>
        <input
          className={styles.input}
          value={values.nickname}
          onChange={(e) => set("nickname", e.target.value)}
          placeholder="ชื่อเล่น"
          autoComplete="nickname"
          maxLength={30}
        />
      </Question>

      <Question num={3} label="ตอนนี้อยู่ที่ไหน?" error={errors.stage}>
        <ChoiceChips
          name="ตอนนี้อยู่ที่ไหน"
          options={SHIFT_INTEREST_STAGES}
          value={values.stage}
          onChange={(stage) => set("stage", stage)}
        />
      </Question>

      <Question
        num={4}
        label="ช่องทางให้เราทักกลับ"
        hint={`พอช่วงที่คุณเลือกมีคนครบ ${MIN_BUILDERS} คน เราจะทักไปทาง IG นี้ อีเมลไม่บังคับ`}
        error={errors.igHandle ?? errors.email}
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input
            className={styles.input}
            value={values.igHandle}
            onChange={(e) => set("igHandle", e.target.value)}
            placeholder="IG เช่น @yourname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={60}
          />
          <input
            className={styles.input}
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            placeholder="อีเมล (ถ้ามี)"
            type="email"
            autoComplete="email"
            maxLength={120}
          />
        </div>
      </Question>

      <Question
        num={5}
        label="มีปัญหาที่อยากลองแก้ไหม?"
        hint="ยังไม่มีก็ได้ เขียนดิบๆ ได้เลย วันแรกค่อยตัดให้เหลือโจทย์เดียว"
        error={errors.problem}
      >
        <textarea
          className={styles.input}
          value={values.problem ?? ""}
          onChange={(e) => set("problem", e.target.value)}
          placeholder="เช่น เพื่อนในห้องจำวันส่งงานไม่ได้"
          maxLength={500}
        />
      </Question>

      {/* Honeypot: hidden from people, filled by bots. */}
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

      <div className={styles.ticks}>
        <Tick
          checked={Boolean(values.committed)}
          onChange={(checked) => set("committed", checked as true)}
          error={errors.committed}
        >
          <strong>อ่านสิ่งที่ต้องลงเองแล้ว และพร้อมลงแรงแบบนั้น</strong> 7
          เย็นติดกัน คุยกับคนจริง ทักคนนอกมาลองเอง และโชว์ทุกเย็นแม้ยังพัง
        </Tick>
        <Tick
          checked={Boolean(values.consent)}
          onChange={(checked) => set("consent", checked as true)}
          error={errors.consent}
        >
          ยินยอมให้ PassionSeed เก็บข้อมูลนี้ไว้เพื่อนัดวันและติดต่อเรื่อง SHIFT
          เท่านั้น ไม่ส่งต่อให้ใคร ขอให้ลบได้ทุกเมื่อทาง IG หรือ LINE
          @passionseed
        </Tick>

        {status === "error" && (
          <p className={styles.error} role="alert">
            ส่งไม่สำเร็จ ลองกดส่งใหม่อีกครั้งนะ ข้อมูลที่กรอกยังอยู่ครบ
          </p>
        )}

        <div className={styles.submitRow}>
          <button
            type="submit"
            disabled={status === "sending"}
            className={styles.cta}
          >
            <span>
              {status === "sending"
                ? "กำลังส่ง..."
                : `ลงชื่อ ${NEXT_ROUND_NAME}`}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p>ฟรี ยังไม่ต้องจ่าย</p>
        </div>
      </div>
    </form>
  );
}
