"use client";

/**
 * "อยากให้ทำอาชีพไหนต่อ?" (spec 2.8). Validates with the same rule as the SQL
 * before calling the tracker, and stores no contact details: URLs, emails,
 * @handles and long digit runs are refused on both sides.
 *
 * Optional suggestion chips (other careers) fill the field on tap; the student
 * still presses "ส่ง". Inside the guide shell it takes the pixel look.
 */
import { useId, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { CAREER_REQUEST_MAX_CHARS, validateCareerRequest } from "@/lib/radar-guide/career-request";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { useFunnelContext, type FunnelLook } from "./funnel-look";
import { careerRequestMessage, type CareerRequestFormState } from "./guide-helpers";
import "./guide.css";
import "./share-pixel.css";

export interface CareerRequestFormProps {
  tracker: GuideTracker;
  /** Career names offered as chips, e.g. the other pilot careers. */
  suggestionsTh?: readonly string[];
  look?: FunnelLook;
  className?: string;
}

export function CareerRequestForm({ tracker, suggestionsTh = [], look: lookProp, className }: CareerRequestFormProps) {
  const { look } = useFunnelContext(lookProp);
  const pixel = look === "pixel";
  const inputId = useId();
  const messageId = useId();
  const [text, setText] = useState("");
  const [state, setState] = useState<CareerRequestFormState>("idle");
  const message = careerRequestMessage(state);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "submitting") return;
    const checked = validateCareerRequest(text);
    if (!checked.ok) {
      setState("invalid");
      return;
    }
    setState("submitting");
    let result: CareerRequestFormState;
    try {
      result = await tracker.submitCareerRequest(checked.text);
    } catch {
      result = "failed";
    }
    setState(result);
    if (result === "ok") setText("");
  };

  const chips = suggestionsTh.filter((s) => validateCareerRequest(s).ok);

  return (
    <form
      className={`${pixel ? "rgf rgf-request" : "radar-guide-request"} ${className ?? ""}`}
      onSubmit={onSubmit}
      noValidate
    >
      <label htmlFor={inputId} className={pixel ? "rgf-heading rgf-dot" : "radar-guide-outro__heading"}>
        อยากให้ทำอาชีพไหนต่อ?
      </label>
      {chips.length > 0 ? (
        <div className={pixel ? "rgf-chips mt-3" : "mt-3 flex flex-wrap gap-2"}>
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={pixel ? "rgf-chip" : "radar-guide-chip"}
              aria-pressed={text.trim() === chip}
              onClick={() => {
                setText(chip);
                if (state !== "submitting") setState("idle");
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="text"
          enterKeyHint="send"
          autoComplete="off"
          maxLength={CAREER_REQUEST_MAX_CHARS}
          placeholder="เช่น นักบัญชี หมอฟัน นักออกแบบเกม"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (state !== "submitting" && state !== "idle") setState("idle");
          }}
          aria-describedby={message ? messageId : undefined}
          aria-invalid={state === "invalid" || undefined}
          className={`${pixel ? "rgf-input" : "radar-guide-input"} min-w-0 flex-1`}
        />
        <button
          type="submit"
          className={pixel ? "rgf-btn rgf-btn--accent shrink-0" : "radar-guide-button radar-guide-button--accent shrink-0 px-4"}
          style={pixel ? { width: "auto" } : undefined}
          disabled={state === "submitting" || text.trim().length === 0}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>ส่ง</span>
        </button>
      </div>
      <p
        id={messageId}
        role="status"
        aria-live="polite"
        className={pixel ? "rgf-status" : "radar-guide-request__message"}
        data-state={state}
      >
        {message}
      </p>
      <p className={pixel ? "rgf-note mt-1" : "mt-1 text-xs text-neutral-500"}>หรือคอมเมนต์ชื่ออาชีพใต้คลิปใน IG ก็ได้</p>
    </form>
  );
}
