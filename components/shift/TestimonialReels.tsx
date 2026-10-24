"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ShiftTestimonialReel } from "@/lib/content/shift-testimonials";

interface ReelColors {
  /** Frame colour per reel, cycled. */
  inks: string[];
  caption: string;
}

/**
 * One muted Reel that plays only while it is on screen. Reduced-motion
 * visitors get the poster and start it themselves; everyone can pause.
 */
function Reel({ reel, ink, caption }: { reel: ShiftTestimonialReel; ink: string; caption: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (inView && !paused) video.play().catch(() => setPaused(true));
    else video.pause();
  }, [inView, paused]);

  const Icon = paused ? Play : Pause;
  return (
    <figure className="flex w-[64%] shrink-0 snap-center flex-col sm:w-auto">
      <div className="relative overflow-hidden rounded-2xl border-2" style={{ borderColor: ink }}>
        <video
          ref={ref}
          src={reel.src}
          poster={reel.poster}
          width={576}
          height={800}
          muted
          loop
          playsInline
          preload="none"
          aria-label={`วิดีโอผลงาน ${reel.project.title} พร้อมคำบอกเล่าของน้องที่สร้าง`}
          className="block h-auto w-full"
        />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "เล่นวิดีโอ" : "หยุดวิดีโอ"}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <figcaption className="mt-4">
        <a
          href={reel.project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 py-2 text-sm font-semibold underline underline-offset-4"
          style={{ color: caption }}
        >
          ลองใช้ {reel.project.title} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

/** SHIFT[0] apps told in the student's own words, swiped sideways on mobile. */
export function TestimonialReels({
  reels,
  colors,
  className = "",
}: {
  reels: ShiftTestimonialReel[];
  colors: ReelColors;
  className?: string;
}) {
  if (reels.length === 0) return null;
  return (
    <div
      className={`-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:max-w-2xl sm:grid-cols-2 sm:gap-10 sm:overflow-visible sm:px-0 ${className}`}
    >
      {reels.map((reel, i) => (
        <Reel key={reel.src} reel={reel} ink={colors.inks[i % colors.inks.length]} caption={colors.caption} />
      ))}
    </div>
  );
}
