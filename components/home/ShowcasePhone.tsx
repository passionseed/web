"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { INK, paper } from "@/components/shift/ShiftRiso";

const TILT = ["", "home-phone-2", "home-phone-3"];

/** Flags the element once it is mostly on screen, for touch-only motion. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

/**
 * A shipped app in a phone frame. Hover (or tap, on touch) turns to its
 * second screen, so visitors see it is a working product, not one mockup.
 */
export function ShowcasePhone({
  title,
  shots,
  index,
}: {
  title: string;
  shots: [string, string];
  index: number;
}) {
  const [page, setPage] = useState(0);
  const { ref, inView } = useInView<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      type="button"
      data-in-view={inView}
      // Mouse only: touch fires an emulated enter before the tap, which would
      // flip the page and let the click flip it straight back.
      onPointerEnter={(e) => e.pointerType === "mouse" && setPage(1)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPage(0)}
      onClick={() => setPage((p) => 1 - p)}
      aria-label={`${title}: ดูหน้าจอ${page === 0 ? "ถัดไป" : "แรก"}`}
      className={`home-phone ${TILT[index % TILT.length]} relative mx-auto block w-full max-w-[240px] rounded-[2.2rem] p-2.5 text-left`}
      style={{ backgroundColor: "#0c0b10", boxShadow: `inset 0 0 0 1.5px ${paper("26")}` }}
    >
      <div className="relative aspect-[390/844] overflow-hidden rounded-[1.7rem] bg-black">
        {shots.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === 0 ? `หน้าจอ ${title}` : ""}
            fill
            sizes="240px"
            data-active={page === i}
            className="home-shot object-cover object-top"
          />
        ))}
      </div>
      <span className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
        {shots.map((src, i) => (
          <span
            key={src}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: page === i ? 18 : 6,
              backgroundColor: page === i ? INK.yellow : paper("40"),
            }}
          />
        ))}
      </span>
    </button>
  );
}
