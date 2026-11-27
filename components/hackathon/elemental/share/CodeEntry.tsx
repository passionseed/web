"use client";

import { useId, useState } from "react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { parseShareCode } from "@/lib/hackathon/elemental/share-rules";

import { PrimaryButton, TextInput } from "./ui";

/**
 * Type someone's 8-character code to give them a free seat. `onSubmit`
 * returns an error to show, or null when it worked.
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
  const id = useId();
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
    <form onSubmit={submit} className="space-y-3" noValidate>
      <TextInput
        id={`code-${id}`}
        label={label}
        hint={hint}
        error={error}
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
        style={{ fontFamily: EL_FONT.mono, fontSize: 18, letterSpacing: value ? "0.12em" : undefined, textTransform: value ? "uppercase" : undefined }}
      />
      <PrimaryButton type="submit" disabled={busy} full arrow={!busy}>
        {busy ? COPY.busy : submitLabel}
      </PrimaryButton>
    </form>
  );
}
