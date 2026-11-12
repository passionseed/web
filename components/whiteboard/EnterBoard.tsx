"use client";

import { useEffect } from "react";

/** Shown for a moment while a share link signs in and joins. */
export function EnterBoard({ href }: { href: string }) {
  useEffect(() => {
    // Wait for the stream to finish (preview tags arrive late); leaving early aborts it.
    const go = () => window.location.replace(href);
    if (document.readyState === "complete") return go();
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, [href]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#fbf6ee] text-sm text-neutral-500">
      <a href={href}>กำลังพาเข้าบอร์ด · Opening board</a>
    </main>
  );
}
