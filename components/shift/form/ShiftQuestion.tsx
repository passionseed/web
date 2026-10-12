"use client";

import type { ReactNode } from "react";

import { INK } from "@/components/shift/poster/riso";

/**
 * Building blocks for the public SHIFT forms (apply, feedback): numbered
 * questions on riso paper, thumb-sized choice chips.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

export const INPUT =
  "w-full border-0 border-b bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[rgba(242,234,217,0.3)] focus:border-[#ff6c2f] focus:ring-0";

export function Question({
  num,
  label,
  hint,
  error,
  children,
}: {
  /** Omitted for warm-up questions that sit outside the numbered set. */
  num?: number;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-t py-7" style={{ borderColor: paper("1f") }}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-baseline gap-4">
        {num !== undefined && (
          <span
            className="font-kodchasan text-2xl font-bold"
            style={{ color: INK.orange }}
          >
            {num}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-kodchasan text-lg font-semibold leading-snug">
            {label}
          </p>
          {hint && (
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: paper("80") }}
            >
              {hint}
            </p>
          )}
          <div className="mt-3">{children}</div>
          {error && (
            <p
              className="mt-2 text-sm font-semibold"
              style={{ color: INK.pink }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

export function ChoiceChips<T extends string>({
  name,
  options,
  value,
  onChange,
  stacked = false,
}: {
  name: string;
  options: readonly { value: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
  /** One option per row, for labels too long to share a line on a phone. */
  stacked?: boolean;
}) {
  return (
    <div
      className={stacked ? "grid gap-2.5" : "flex flex-wrap gap-2.5"}
      role="radiogroup"
      aria-label={name}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-[4px] py-2.5 text-base font-semibold transition-[background-color,box-shadow,color] duration-150 ${
              stacked ? "px-4 text-left" : "min-w-[4rem] flex-1 px-3 sm:flex-none sm:px-5"
            }`}
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
