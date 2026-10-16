"use client";

import { useEffect, useState } from "react";

import { INK } from "@/components/shift/poster/riso";

import { RSVP_ANCHOR, RSVP_DONE_EVENT, doneKey } from "./AlumniRsvp";

/**
 * Phones only: a "ไปด้วย" bar pinned to the bottom until the RSVP box is on
 * screen or this device has already said yes. Tapping it scrolls to the box.
 */
export function AlumniRsvpStickyBar({ date, label }: { date: string; label: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(doneKey(date))) return;
    const target = document.getElementById(RSVP_ANCHOR);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(target);
    const done = () => {
      observer.disconnect();
      setHidden(true);
    };
    window.addEventListener(RSVP_DONE_EVENT, done);
    return () => {
      observer.disconnect();
      window.removeEventListener(RSVP_DONE_EVENT, done);
    };
  }, [date]);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-6 sm:hidden"
      style={{ background: `linear-gradient(to top, ${INK.black} 55%, transparent)` }}
    >
      <button
        type="button"
        onClick={() => document.getElementById(RSVP_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className="shift-button w-full"
      >
        <span>ไปด้วย 🙋 · {label}</span>
      </button>
    </div>
  );
}
