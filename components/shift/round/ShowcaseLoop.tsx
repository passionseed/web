"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A silent app screen loop that plays only while it is on screen. Reduced
 * motion keeps the poster frame until the visitor starts it; everyone can
 * pause it.
 */
export function ShowcaseLoop({ src, poster, title }: { src: string; poster: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.4,
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
    <div className="relative">
      <video
        ref={ref}
        src={src}
        poster={poster}
        width={960}
        height={540}
        muted
        loop
        playsInline
        preload="none"
        aria-label={`หน้าจอ ${title} ตอนใช้งานจริง`}
        className="block aspect-video h-auto w-full object-cover object-top"
      />
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "เล่นวิดีโอ" : "หยุดวิดีโอ"}
        className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
