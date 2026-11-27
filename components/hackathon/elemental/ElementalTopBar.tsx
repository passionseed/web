import type { ReactNode, Ref } from "react";
import Image from "next/image";
import Link from "next/link";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import styles from "./elemental-cinema.module.css";

/**
 * The Elemental top bar: The Next Decade × PassionSeed, as on the poster, and
 * one link on the right. The landing page uses it over its hero ("sky": ink on
 * the photo) and once scrolled past it ("ground": cream on black). The share,
 * teacher, editor and board pages use "ground"; the cream pay page uses
 * "paper" (ink on cream).
 */

export type TopBarTone = "sky" | "ground" | "paper";

const TONE: Record<TopBarTone, { bg: string; color: string; border: string; logo: string }> = {
  sky: { bg: "transparent", color: EL.ink, border: "1px solid transparent", logo: "brightness(0)" },
  ground: { bg: "#0c0d0c", color: EL.cream, border: "1px solid rgba(243,239,230,0.12)", logo: "brightness(0) invert(1)" },
  paper: { bg: EL.cream, color: EL.ink, border: "1px solid rgba(29,33,31,0.12)", logo: "brightness(0)" },
};

/** "← หน้าของฉัน": back to the pay page. LINE's own back button isn't reliable. */
export function TopBarBack({ href, label = "หน้าของฉัน" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="-mr-2 inline-flex min-h-11 items-center px-2 text-[15px] italic" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
      <span className={styles.textLink}>← {label}</span>
    </Link>
  );
}

export function ElementalTopBar({
  tone,
  position = "sticky",
  homeHref = "/hackathon/elemental",
  homeLabel = `${ELEMENTAL.series}: หน้า Elemental Hackathon`,
  back,
  right,
  ref,
}: {
  tone: TopBarTone;
  /** fixed over the landing's hero; sticky on the other pages. */
  position?: "fixed" | "sticky";
  /** Where The Next Decade logo goes ("#top" on the landing). */
  homeHref?: string;
  homeLabel?: string;
  /** Shows "← หน้าของฉัน" on the right (ignored when right is given). */
  back?: { href: string; label?: string };
  right?: ReactNode;
  ref?: Ref<HTMLElement>;
}) {
  const t = TONE[tone];
  const logo = (
    <Image
      src="/hackathon/HackLogo-header.png"
      alt={ELEMENTAL.series}
      width={70}
      height={28}
      priority
      className="block h-6 w-auto sm:h-7"
      style={{ filter: t.logo, opacity: 0.85, transition: "filter 200ms ease" }}
    />
  );

  return (
    <header
      ref={ref}
      className={`${position === "fixed" ? "fixed inset-x-0" : "sticky"} top-0 z-40 transition-colors duration-200`}
      style={{ backgroundColor: t.bg, color: t.color, borderBottom: t.border }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
        {/* Who runs it: The Next Decade × PassionSeed, as on the poster */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {homeHref.startsWith("#") ? (
            <a href={homeHref} aria-label={homeLabel}>
              {logo}
            </a>
          ) : (
            <Link href={homeHref} aria-label={homeLabel}>
              {logo}
            </Link>
          )}
          <span className="text-[11px] opacity-60" style={{ fontFamily: EL_FONT.mono }} aria-hidden="true">
            ×
          </span>
          <Link href="/" className="flex items-center gap-1.5">
            <Image src="/passion-seed-logo-84.png" alt="" width={28} height={28} priority className="block h-6 w-6 sm:h-7 sm:w-7" />
            <span className="text-[15px] sm:text-[17px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
              PassionSeed
            </span>
          </Link>
        </div>

        {right ?? (back ? <TopBarBack href={back.href} label={back.label} /> : null)}
      </div>
    </header>
  );
}
