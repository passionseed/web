import Link from "next/link";
import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

/** Shared look for the Elemental share pages (student, teacher) and the pay-page card. */

// Every tap target is at least 44px tall.
export const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold disabled:opacity-50";
export const btnSmall = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50";
/** A text link or button in a line of text: padded to 44px tall without moving the line. */
export const inlineTap = "-my-3 inline-block py-3 text-sm underline underline-offset-4";
export const filled = { backgroundColor: EL.flame, color: EL.flameWhite };
export const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };
export const line = "rgba(29,33,31,0.2)";
export const hairline = "rgba(29,33,31,0.12)";

export const schoolLabel = (name: string, province?: string | null) => `โรงเรียน${name}${province ? ` · ${province}` : ""}`;

export function Page({ top, children, footer, bar }: { top: string; children: ReactNode; footer?: ReactNode; bar?: ReactNode }) {
  return (
    <main
      className={`min-h-[100dvh] overflow-x-clip px-5 pt-10 sm:px-8 sm:pt-16 ${bar ? "pb-32" : "pb-10 sm:pb-16"}`}
      style={{ backgroundColor: EL.cream, color: EL.ink }}
    >
      <div className="mx-auto max-w-xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {top}
        </p>
        <div className="mt-6">{children}</div>
        {footer}
      </div>
      {bar}
    </main>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.12 }}>
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
      {children}
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={inlineTap} style={{ color: EL.inkSoft }}>
      {children}
    </Link>
  );
}

export function TextButton({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`${inlineTap} ${className ?? ""}`} style={{ color: EL.inkSoft }}>
      {children}
    </button>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm" style={{ color: EL.ember }}>
      {children}
    </p>
  );
}

/** A code in big spaced capitals: "1A2B 3C4D". */
export function CodeText({ code, className }: { code: string; className?: string }) {
  const c = code.toUpperCase();
  return (
    <span className={className} style={{ fontFamily: EL_FONT.mono, letterSpacing: "0.12em" }}>
      {c.slice(0, 4)}
      <span aria-hidden="true" className="inline-block w-[0.35em]" />
      {c.slice(4)}
    </span>
  );
}
