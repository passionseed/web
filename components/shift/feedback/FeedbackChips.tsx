"use client";

import { Check } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";

/** Score and tick-all inputs for the SHIFT feedback form, styled like
 *  the shared ChoiceChips so the two forms feel the same. */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

const SELECTED = {
  backgroundColor: INK.paper,
  color: INK.black,
  boxShadow: "3px 3px 2px 0 rgba(255,72,176,0.75)",
};
const IDLE = { backgroundColor: paper("0f"), color: paper("cc") };

const CHIP =
  "rounded-[4px] py-2.5 text-base font-semibold tabular-nums transition-[background-color,box-shadow,color] duration-150";

/** A row of numbered scores with words under each end. */
export function ScaleChips({
  name,
  min,
  max,
  low,
  high,
  value,
  onChange,
}: {
  name: string;
  min: number;
  max: number;
  low: string;
  high: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${scores.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={name}
      >
        {scores.map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            onClick={() => onChange(score)}
            className={CHIP}
            style={value === score ? SELECTED : IDLE}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs" style={{ color: paper("80") }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/** Tick-all-that-apply, one option per row so long labels stay readable. */
export function CheckChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {options.map((option) => {
        const checked = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`${CHIP} flex items-center gap-3 px-4 text-left`}
            style={checked ? SELECTED : IDLE}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px]"
              style={{ boxShadow: `inset 0 0 0 1.5px ${checked ? INK.black : paper("66")}` }}
            >
              {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Day-of-week picker: a row of short day chips, with the "none" option
 *  as a full-width chip underneath. */
export function DayChips<T extends string>({
  options,
  none,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; name: string }[];
  none: T;
  value: T[];
  onChange: (value: T) => void;
}) {
  const days = options.filter((option) => option.value !== none);
  const noneOption = options.find((option) => option.value === none);
  const chip = (option: (typeof options)[number], className: string) => {
    const checked = value.includes(option.value);
    return (
      <button
        key={option.value}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={option.name}
        onClick={() => onChange(option.value)}
        className={`${CHIP} ${className}`}
        style={checked ? SELECTED : IDLE}
      >
        {option.label}
      </button>
    );
  };
  return (
    <div className="grid gap-2.5">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => chip(day, ""))}
      </div>
      {noneOption && chip(noneOption, "px-4 text-left")}
    </div>
  );
}
