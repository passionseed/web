import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ringOf } from "../../chrome/ring";

/** Small shared pieces for the Spyfall window, in the board's Grain look (see whiteboard.css). */

const BASE = "inline-flex min-h-11 items-center justify-center gap-1.5 px-3 text-sm font-medium disabled:opacity-40";

/** The one primary action on a screen: the grain bloom. Everything else is a SoftButton. */
export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${BASE} wb-btn wb-btn--primary ${className}`} {...props} />;
}

/** Paper with an ink border. */
export function SoftButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${BASE} wb-btn ${className}`} {...props} />;
}

/** A numeral in the mono face with tabular figures: counts, seats, minutes. */
export function Num({ children }: { children: ReactNode }) {
  return <span className="wb-num">{children}</span>;
}

/**
 * A titled block. `title` is "ไทย · English": the Thai is the heading, the English sits soft at
 * the right. `count` goes after the Thai (wrap its numbers in `<Num>`). The stylesheet numbers
 * the titles down the panel: "01", "02"...
 */
export function Section({ title, count, aside, children }: { title: string; count?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  const [th, ...rest] = title.split(" · ");
  const en = rest.join(" · ");
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3 className="wb-sec__title">
          <span className="wb-sec__th">{th}</span>
          {count !== undefined && <span className="wb-sec__count">{count}</span>}
          {en && <span className="wb-sec__en">{en}</span>}
        </h3>
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
  /** `num` is set in the mono face before the label: `{ num: 5, label: "นาที" }`. */
  options: { label: string; num?: number; value: T; disabled?: boolean }[];
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
            className={`wb-pick min-h-11 flex-1 px-2 text-sm disabled:opacity-40 ${on ? "wb-pick--on" : ""}`}
          >
            {o.num !== undefined && <span className="wb-num">{o.num}</span>}
            {o.num !== undefined && " "}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A face with a thin ring. Pass `userId` for that person's own ring colour, the same one they have in the people card. */
export function Avatar({ name, url, userId }: { name: string; url: string | null; userId?: string }) {
  const tone = userId === undefined ? "" : `wb-ring-${ringOf(userId)}`;
  return (
    <span className="inline-flex h-7 w-7 shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className={`wb-avatar ${tone}`} />
      ) : (
        <span className={`wb-avatar ${tone}`}>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
