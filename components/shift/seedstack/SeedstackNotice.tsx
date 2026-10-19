import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { FLOW_TEXT, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { SEEDSTACK_NOTICE, type SeedstackNoticeRow } from "@/lib/seedstack/consent";

/**
 * The PDPA notice, one emoji row per point, in three sizes:
 * - "summary": before the student agrees. One-line gists, every point's full
 *   wording one tap away under "อ่านแบบละเอียด".
 * - "full": every row in full, for the parent deciding.
 * - "collapsed": after agreeing. One line that opens to the full rows, so
 *   the link step stays the focus.
 */
export type SeedstackNoticeVariant = "summary" | "full" | "collapsed";

const ROWS = SEEDSTACK_NOTICE.rows;

function Emoji({ children }: { children: string }) {
  return (
    <span className="w-7 shrink-0 text-lg leading-7" aria-hidden="true">
      {children}
    </span>
  );
}

function FullRow({ row }: { row: SeedstackNoticeRow }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <Emoji>{row.emoji}</Emoji>
      <div className="min-w-0 space-y-1">
        <p className="font-kodchasan text-[15px] font-bold leading-7" style={{ color: FLOW_TEXT.strong }}>
          {row.lead}
        </p>
        {row.text && <p>{row.text}</p>}
        {row.items && (
          <ul className="space-y-1">
            {row.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" style={{ color: FLOW_TEXT.sky }}>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function FullRows() {
  return (
    <ul className="divide-y divide-[rgba(242,234,217,0.16)]">
      {ROWS.map((row) => (
        <FullRow key={row.lead} row={row} />
      ))}
    </ul>
  );
}

function ShortRows() {
  return (
    <ul className="space-y-2">
      {ROWS.map((row) => (
        <li key={row.lead} className="flex gap-3">
          <Emoji>{row.emoji}</Emoji>
          <p className="min-w-0 pt-0.5">
            <strong className="font-kodchasan font-bold" style={{ color: FLOW_TEXT.strong }}>
              {row.lead}
            </strong>{" "}
            {row.short}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Native disclosure: works without JS, keyboard and screen-reader friendly. */
export function Disclosure({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <details className={`group ${className}`}>
      <summary
        className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 font-semibold [&::-webkit-details-marker]:hidden"
        style={{ color: FLOW_TEXT.strong }}
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        {label}
      </summary>
      <div className="pb-1 pt-3">{children}</div>
    </details>
  );
}

function Title() {
  return (
    <h2 className="font-kodchasan text-lg font-bold" style={{ color: FLOW_TEXT.strong }}>
      {SEEDSTACK_NOTICE.title}
    </h2>
  );
}

export function SeedstackNotice({ variant = "full" }: { variant?: SeedstackNoticeVariant }) {
  const text = { color: FLOW_TEXT.body };

  if (variant === "collapsed") {
    return (
      <section className={`${flowPanelClass} px-4 text-[15px] leading-relaxed`} style={text} aria-label={SEEDSTACK_NOTICE.title}>
        <Disclosure label="ข้อมูลที่ส่งให้พี่ mentor">
          <div className="pb-3">
            <FullRows />
          </div>
        </Disclosure>
      </section>
    );
  }

  return (
    <section className={`${flowPanelClass} space-y-4 p-5 text-[15px] leading-relaxed`} style={text}>
      <Title />
      {variant === "summary" ? (
        <>
          <ShortRows />
          <Disclosure label="อ่านแบบละเอียด" className="border-t border-[rgba(242,234,217,0.2)] pt-1">
            <FullRows />
          </Disclosure>
        </>
      ) : (
        <FullRows />
      )}
    </section>
  );
}
