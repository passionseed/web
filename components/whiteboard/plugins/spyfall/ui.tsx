import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Small shared pieces for the Spyfall window, in the board's warm glass look. */

const BASE = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium disabled:opacity-40";

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${BASE} bg-orange-500 text-white active:bg-orange-600 ${className}`} {...props} />;
}

export function SoftButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`${BASE} cal-hover border border-[color:var(--wb-hairline)] active:bg-black/5 ${className}`}
      {...props}
    />
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide opacity-60">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A row of mutually exclusive choices, like 1 / 2 / 3 spies. */
export function Segmented<T extends string | number | null>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1.5" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-11 flex-1 rounded-xl border px-2 text-sm disabled:opacity-40 ${
              on ? "border-orange-500 bg-orange-500/15 font-semibold" : "border-[color:var(--wb-hairline)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-semibold">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
