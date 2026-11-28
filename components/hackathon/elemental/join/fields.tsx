import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { PixelIcon } from "@/components/hackathon/poster/elemental/pixel-art";

import styles from "./join.module.css";

/**
 * TextInput: the older cream input, still used by TeamInvite on the pay page. The sign-up steps use
 * share/ui.tsx's TextInput (the paper look) and CheckRow below.
 */

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

/**
 * A checkbox that's a whole tappable row, not a tiny box: square, a 1px rule, and a square tick
 * box that fills with the action colour. Colours come from the surface (share/ui.tsx), so the same
 * row works on the cream page and inside the dark slab. Use it inside <Page surface> or <DarkSlab>.
 */
export function CheckRow({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-invalid={error ? true : undefined}
        onClick={() => onChange(!checked)}
        data-error={error ? true : undefined}
        className={`${styles.pick} flex min-h-[52px] w-full items-start gap-3 rounded-[2px] px-4 py-3.5 text-left`}
        style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}
      >
        <span aria-hidden="true" data-on={checked} className={`${styles.box} mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center`}>
          {checked && <PixelIcon name="check" size={18} />}
        </span>
        <span>{children}</span>
      </button>
      {error && (
        <p role="alert" className="mt-1.5" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: "var(--el-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
