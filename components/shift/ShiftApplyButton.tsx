"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

import { SHIFT_COHORT } from "@/lib/content/shift-cohort";
import { getShiftSource, trackShiftEvent, withShiftSource } from "@/lib/shift/attribution";

export const SHIFT_APPLY_URL = SHIFT_COHORT.applyUrl;

interface ShiftApplyButtonProps {
  children: React.ReactNode;
  className?: string;
  location?: "hero" | "final_cta" | "sticky_bar" | "techseed_bridge" | string;
  href?: string;
}

export function ShiftApplyButton({
  children,
  className = "",
  location = "hero",
  href = SHIFT_APPLY_URL,
}: ShiftApplyButtonProps) {
  const [source, setSource] = React.useState<string | null>(null);
  React.useEffect(() => { setSource(getShiftSource()); }, []);
  const handleClick = () => {
    trackShiftEvent("shift_apply_click", { location });
  };

  return (
    <a
      href={withShiftSource(href, source)}
      // The native form lives on-site; only external forms open a new tab.
      {...(href.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      onClick={handleClick}
      className={`shift-button ${className}`}
    >
      <span>{children}</span>
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}
