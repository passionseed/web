"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ShiftApplicationModal } from "./ShiftApplicationModal";

export const SHIFT_APPLY_URL = "https://forms.gle/3DaMNzuuFV4EHD2m7";

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
  const [modalOpen, setModalOpen] = useState(false);

  // If pointing to external / custom route (e.g. techseed bridge pointing to /shift)
  const isNavigational = href !== SHIFT_APPLY_URL;

  const logClick = () => {
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
      // Fail silently
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    logClick();
    if (!isNavigational) {
      e.preventDefault();
      setModalOpen(true);
    }
  };

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={`shift-button cursor-pointer ${className}`}
      >
        <span>{children}</span>
        <ArrowRight className="h-4 w-4" />
      </a>

      {!isNavigational && (
        <ShiftApplicationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          sourceLocation={location}
        />
      )}
    </>
  );
}
