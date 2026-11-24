import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check as CheckIcon } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import styles from "./join.module.css";

/** Inputs for the sign-up steps: big, calm, with the error right under the field. */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm" style={{ color: EL.ember }}>
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm" style={{ color: EL.inkSoft }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ invalid, className, style, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${styles.input} mt-2 w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none ${className ?? ""}`}
        style={{ borderColor: invalid ? EL.ember : "rgba(29,33,31,0.2)", color: EL.ink, ...style }}
        {...props}
      />
    );
  },
);

/** A checkbox that's a whole tappable row, not a tiny box. */
export function CheckRow({
  checked,
  onChange,
  children,
  error,
  dark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  error?: string;
  dark?: boolean;
}) {
  const line = dark ? "rgba(243,239,230,0.28)" : "rgba(29,33,31,0.2)";
  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-invalid={error ? true : undefined}
        onClick={() => onChange(!checked)}
        className={`${styles.choice} flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-base leading-relaxed`}
        style={{ borderColor: error ? EL.ember : checked ? EL.flame : line }}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
          style={{ backgroundColor: checked ? EL.flame : "transparent", borderColor: checked ? EL.flame : line }}
        >
          {checked && <CheckIcon className="h-4 w-4" style={{ color: EL.flameWhite }} strokeWidth={3} />}
        </span>
        <span>{children}</span>
      </button>
      {error && (
        <span role="alert" className="mt-1.5 block text-sm" style={{ color: dark ? EL.flameLight : EL.ember }}>
          {error}
        </span>
      )}
    </div>
  );
}
