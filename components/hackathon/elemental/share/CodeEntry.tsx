"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { parseShareCode } from "@/lib/hackathon/elemental/share-rules";

import { btn, ErrorLine, filled, line } from "./ui";

/**
 * Type someone's 8-character code to give them the school's free seat.
 * `onSubmit` returns an error to show, or null when it worked.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  placeholder: "เช่น 1A2B3C4D",
  invalid: "รหัสมี 8 ตัว ตัวเลข 0-9 และ A-F",
  busy: "กำลังส่ง…",
};

export function CodeEntry({
  label,
  hint,
  submitLabel,
  onSubmit,
}: {
  label: string;
  hint: string;
  submitLabel: string;
  onSubmit: (code: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const code = parseShareCode(value);
    if (!code) return setError(COPY.invalid);
    setBusy(true);
    setError(null);
    const problem = await onSubmit(code);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-base font-semibold">{label}</span>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={COPY.placeholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          aria-invalid={error ? true : undefined}
          className="mt-2 w-full rounded-xl border bg-white px-4 py-3.5 text-2xl uppercase tracking-[0.14em] outline-none placeholder:text-lg placeholder:normal-case placeholder:tracking-normal"
          style={{ borderColor: error ? EL.ember : line, color: EL.ink, fontFamily: EL_FONT.mono }}
        />
        <span className="mt-1.5 block text-sm" style={{ color: EL.inkSoft }}>
          {hint}
        </span>
      </label>
      {error && <ErrorLine>{error}</ErrorLine>}
      <button type="submit" disabled={busy} className={`${btn} w-full`} style={filled}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? COPY.busy : submitLabel}
      </button>
    </form>
  );
}
