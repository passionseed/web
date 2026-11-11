"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { T, accentFor, tint } from "./homeTheme";
import type { HomeDemo } from "@/lib/content/home";

/**
 * Plays only while on screen, and never on its own for visitors who asked
 * for less motion: they get the still frame and the player's own controls.
 */
function useStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView, calm };
}

function BrowserBar({ host, round }: { host: string; round: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 sm:px-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
      <span className="flex gap-1.5" aria-hidden="true">
        {[tint("59"), tint("40"), tint("26")].map((ink) => (
          <span key={ink} className="h-2 w-2 rounded-full" style={{ backgroundColor: ink }} />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px]" style={{ color: tint("b3") }}>
        {host}
      </span>
      <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] sm:inline" style={{ color: T.accent3 }}>
        Demo day · {round}
      </span>
    </div>
  );
}

interface TabProps {
  demo: HomeDemo;
  index: number;
  active: boolean;
  onSelect: () => void;
}

function DemoTab({ demo, index, active, onSelect }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.06)]"
      style={{
        backgroundColor: active ? tint("12") : undefined,
        boxShadow: `inset 0 0 0 1px ${active ? accentFor(index) : tint("1f")}`,
      }}
    >
      <span className="font-mono text-[11px] font-bold tracking-[0.14em]" style={{ color: accentFor(index) }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="text-sm font-semibold leading-tight" style={{ color: active ? T.text : tint("b8") }}>
        {demo.title}
      </span>
    </button>
  );
}

function DemoPanel({ demo, index, active, tryIt }: { demo: HomeDemo; index: number; active: boolean; tryIt: string }) {
  return (
    <div
      role="tabpanel"
      aria-hidden={!active}
      className={`[grid-area:1/1] ${active ? "home-day-panel" : "invisible"}`}
    >
      <p className="font-kodchasan text-lg font-semibold leading-snug sm:text-xl">{demo.pitch}</p>
      {demo.proof && (
        <p
          className="mt-3 border-l-2 pl-3 text-sm font-medium leading-relaxed"
          style={{ borderColor: accentFor(index), color: T.accent3 }}
        >
          {demo.proof}
        </p>
      )}
      <a
        href={demo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold underline decoration-[rgba(127,227,255,0.55)] decoration-2 underline-offset-[6px] transition hover:decoration-[rgba(127,227,255,1)]"
      >
        {tryIt} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * One screen that plays each student app in turn, built for the hero's right
 * column. It moves on by itself until the visitor picks an app; after that
 * the chosen one loops.
 */
export function DemoReel({ demos, round, tryIt }: { demos: HomeDemo[]; round: string; tryIt: string }) {
  const [active, setActive] = useState(0);
  const [touring, setTouring] = useState(true);
  const { ref, inView, calm } = useStage();
  const video = useRef<HTMLVideoElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const demo = demos[active];

  useEffect(() => {
    const node = video.current;
    if (!node || calm) return;
    if (inView) node.play().catch(() => {});
    else node.pause();
  }, [active, inView, calm]);

  const select = (i: number) => {
    setTouring(false);
    setActive(i);
  };

  const onProgress = () => {
    const node = video.current;
    if (!node || !fill.current || !node.duration) return;
    fill.current.style.transform = `scaleX(${node.currentTime / node.duration})`;
  };

  return (
    <div ref={ref} className="grid gap-4">
      <figure
        className="home-demo-stage overflow-hidden rounded-2xl"
        style={{ boxShadow: `0 0 0 1px ${tint("26")}, 0 40px 100px -50px ${accentFor(active)}` }}
      >
        <BrowserBar host={demo.host} round={round} />
        <video
          key={demo.video}
          ref={video}
          src={demo.video}
          poster={demo.poster}
          muted
          playsInline
          controls={calm}
          loop={!touring || demos.length === 1}
          preload={inView ? "auto" : "none"}
          onTimeUpdate={onProgress}
          onEnded={() => setActive((i) => (i + 1) % demos.length)}
          className="block aspect-video w-full bg-black object-cover"
          aria-label={`คลิปหน้าจอของ ${demo.title}`}
        />
        <div className="h-[3px]" style={{ backgroundColor: tint("1a") }}>
          <div ref={fill} className="h-full origin-left" style={{ backgroundColor: accentFor(active), transform: "scaleX(0)" }} />
        </div>
      </figure>

      <div>
        <div role="tablist" aria-label={`แอปจาก ${round}`} className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {demos.map((d, i) => (
            <DemoTab key={d.url} demo={d} index={i} active={i === active} onSelect={() => select(i)} />
          ))}
        </div>
        <div className="mt-5 grid">
          {demos.map((d, i) => (
            <DemoPanel key={d.url} demo={d} index={i} active={i === active} tryIt={tryIt} />
          ))}
        </div>
      </div>
    </div>
  );
}
