import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ShiftApplyButton } from "@/components/shift/ShiftApplyButton";
import { ShiftAttributedLink } from "@/components/shift/ShiftAttributedLink";
import type { LeadCta } from "@/lib/content/home-lead";

/**
 * The site's main button, pointed at whatever leads right now (see
 * lib/content/home-lead.ts). A SHIFT round keeps ShiftApplyButton, which
 * fires the Meta pixel; the hackathon is tracked by its ?src= tag instead,
 * so it must not count as a SHIFT checkout.
 */
export function LeadButton({
  cta,
  location,
  label,
  className = "",
}: {
  cta: LeadCta;
  location: string;
  label?: string;
  className?: string;
}) {
  const text = label ?? cta.label;
  if (cta.kind === "shift") {
    return (
      <ShiftApplyButton href={cta.href} location={location} className={className}>
        {text}
      </ShiftApplyButton>
    );
  }
  const inner = (
    <>
      <span>{text}</span>
      <ArrowRight className="h-4 w-4" />
    </>
  );
  if (cta.kind === "shift-next") {
    return (
      <ShiftAttributedLink href={cta.href} className={`shift-button ${className}`}>
        {inner}
      </ShiftAttributedLink>
    );
  }
  return (
    <Link href={cta.href} className={`shift-button ${className}`}>
      {inner}
    </Link>
  );
}
