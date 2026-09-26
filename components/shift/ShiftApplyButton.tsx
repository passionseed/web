"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

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
  const handleClick = () => {
    try {
      const payload = JSON.stringify({
        event_type: "shift_apply_click",
        event_data: {
          location,
          timestamp: new Date().toISOString(),
        },
        page_path: typeof window !== "undefined" ? window.location.pathname : "/shift",
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/hackathon/track-event",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/hackathon/track-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Fail silently to never block user intent
    }
  };

  return (
    <a
      href={href}
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
