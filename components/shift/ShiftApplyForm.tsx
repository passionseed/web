"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";

import { INK, MISREG_TEXT } from "@/components/shift/poster/riso";
import { SHIFT_COHORT, formatThaiDateRange } from "@/lib/content/shift-cohort";
import {
  SHIFT_AVAILABILITY,
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
type Status = "idle" | "sending" | "done" | "error";

const EMPTY: ShiftApplicationInput = {
  fullName: "",
  nickname: "",
  grade: "" as ShiftApplicationInput["grade"],
  targetTrack: "",
  problem: "",
  availability: "" as ShiftApplicationInput["availability"],
  igHandle: "",
  discordHandle: "",
  parentContact: "",
  consent: false as unknown as true,
  source: "",
  website: "",
};

const paper = (alpha: string) => `${INK.paper}${alpha}`;

const COHORT_DATES = formatThaiDateRange(SHIFT_COHORT.startDate, SHIFT_COHORT.endDate);

const INPUT =
  "w-full border-0 border-b bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[rgba(242,234,217,0.3)] focus:border-[#ff6c2f] focus:ring-0";

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
    <fieldset className="border-t py-7" style={{ borderColor: paper("1f") }}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-baseline gap-4">
        <span className="font-kodchasan text-2xl font-bold" style={{ color: INK.orange }}>
          {num}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-kodchasan text-lg font-semibold leading-snug">{label}</p>
          {hint && (
            <p className="mt-1 text-sm leading-relaxed" style={{ color: paper("80") }}>
              {hint}
            </p>
          )}
          <div className="mt-3">{children}</div>
          {error && (
            <p className="mt-2 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
              {error}
            </p>
          )}
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
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="min-w-[4rem] flex-1 rounded-[4px] px-3 py-2.5 text-base font-semibold sm:flex-none sm:px-5 transition-[background-color,box-shadow,color] duration-150"
            style={
              selected
                ? {
                    backgroundColor: INK.paper,
                    color: INK.black,
                    boxShadow: `3px 3px 2px 0 rgba(255,72,176,0.75)`,
                  }
                : { backgroundColor: paper("0f"), color: paper("cc") }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Done({ nickname }: { nickname: string }) {
  return (
    <div className="py-16 text-center">
      <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: INK.paper }}>
        <Check className="h-7 w-7" style={{ color: INK.black }} />
      </p>
      <h2 className="mt-8 font-kodchasan text-3xl font-bold sm:text-4xl" style={MISREG_TEXT}>
        ได้รับใบสมัครแล้ว{nickname ? ` ${nickname}` : ""}
      </h2>
      <p className="mx-auto mt-4 max-w-md leading-relaxed" style={{ color: paper("b3") }}>
        เราจะทักกลับทาง IG ภายใน 24 ชม. ระหว่างนี้ลองคิดต่อว่าใครอีก 3 คนที่เจอปัญหาเดียวกับเรา
      </p>
    </div>
  );
}

export function ShiftApplyForm({ source }: { source?: string }) {
  const [values, setValues] = useState<ShiftApplicationInput>({ ...EMPTY, source: source ?? "" });
  const [errors, setErrors] = useState<ShiftApplicationErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  const set = <K extends Field>(field: K, value: ShiftApplicationInput[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const text = (field: Field) => ({
    value: (values[field] as string) ?? "",
    onChange: (e: { target: { value: string } }) => set(field, e.target.value as never),
    className: INPUT,
    style: { borderColor: errors[field] ? INK.pink : paper("33"), color: INK.paper },
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = shiftApplicationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/shift/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.fields) setErrors(data.fields);
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") return <Done nickname={values.nickname.trim()} />;

  return (
    <form onSubmit={submit} noValidate>
      <Question num={1} label="ชื่อเล่น และชื่อจริง" error={errors.nickname ?? errors.fullName}>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <input {...text("nickname")} placeholder="ชื่อเล่น" autoComplete="nickname" />
          <input {...text("fullName")} placeholder="ชื่อ นามสกุล" autoComplete="name" />
        </div>
      </Question>

      <Question num={2} label="ตอนนี้เรียนชั้นไหน" error={errors.grade}>
        <ChoiceChips
          name="ชั้นเรียน"
          options={SHIFT_GRADES}
          value={values.grade}
          onChange={(v) => set("grade", v)}
        />
      </Question>

      <Question num={3} label="คณะหรือสายที่เล็งไว้ใน TCAS1" hint="ยังไม่รู้ก็ข้ามได้" error={errors.targetTrack}>
        <input {...text("targetTrack")} placeholder="เช่น วิศวะคอม, BBA, ยังไม่แน่ใจ" />
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
          className={`${INPUT} resize-none leading-relaxed`}
        />
      </Question>

      <Question num={5} label={`ว่างช่วง ${COHORT_DATES} วันละ 1-2 ชม. ไหม`} error={errors.availability}>
        <ChoiceChips
          name="เวลาว่าง"
          options={SHIFT_AVAILABILITY}
          value={values.availability}
          onChange={(v) => set("availability", v)}
        />
      </Question>

      <Question num={6} label="IG และ Discord" hint="เราจะทักกลับทาง IG ส่วน Discord ถ้ายังไม่มีก็ไม่เป็นไร" error={errors.igHandle ?? errors.discordHandle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <input {...text("igHandle")} placeholder="@ig ของเรา" autoCapitalize="none" autoCorrect="off" />
          <input {...text("discordHandle")} placeholder="Discord (ถ้ามี)" autoCapitalize="none" autoCorrect="off" />
        </div>
      </Question>

      <Question
        num={7}
        label="ช่องทางติดต่อผู้ปกครอง"
        hint="เบอร์โทรหรือ LINE ไว้ยืนยันการเข้าร่วมและการชำระเงินเท่านั้น"
        error={errors.parentContact}
      >
        <input {...text("parentContact")} placeholder="เช่น 08x-xxx-xxxx หรือ LINE ID" />
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
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed" style={{ color: paper("b3") }}>
          <input
            type="checkbox"
            checked={Boolean(values.consent)}
            onChange={(e) => set("consent", e.target.checked as true)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#ff6c2f]"
          />
          ยินยอมให้ PassionSeed ใช้ข้อมูลนี้เพื่อคัดเลือกและติดต่อเรื่อง SHIFT เท่านั้น ไม่ส่งต่อให้ใคร
        </label>
        {errors.consent && (
          <p className="mt-2 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
            {errors.consent}
          </p>
        )}

        {status === "error" && (
          <p className="mt-6 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
            ส่งไม่สำเร็จ ลองกดส่งใหม่อีกครั้งนะ ข้อมูลที่กรอกยังอยู่ครบ
          </p>
        )}

        <button type="submit" disabled={status === "sending"} className="shift-button mt-8 w-full sm:w-auto">
          <span>{status === "sending" ? "กำลังส่ง..." : "ส่งใบสมัคร"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
