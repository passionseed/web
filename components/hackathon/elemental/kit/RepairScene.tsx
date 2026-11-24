"use client";

import { useId, useState } from "react";

import { ELEMENT_CHAPTERS, type ElementKey } from "@/components/hackathon/elemental/media";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

/**
 * The element's scene, broken on top of healthy. The campaign's idea is that
 * someone added the damage, so someone can take it away: dragging the handle
 * (or finishing the frame tool, through `repaired`) wipes the corruption off
 * from left to right and shows the calm place underneath.
 *
 * Uncontrolled when `repaired` is undefined: the person drags. Controlled
 * otherwise: the frame tool sets how far along they are (0..1).
 */
export function RepairScene({
  element,
  repaired,
  label = true,
  className = "",
}: {
  element: ElementKey;
  repaired?: number;
  label?: boolean;
  className?: string;
}) {
  const chapter = ELEMENT_CHAPTERS.find((c) => c.key === element)!;
  const [dragged, setDragged] = useState(0.18);
  const id = useId();
  const controlled = repaired !== undefined;
  const value = controlled ? repaired : dragged;
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <figure className={`relative overflow-hidden rounded-2xl ${className}`} style={{ backgroundColor: EL.char }}>
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={chapter.before} alt={`${chapter.th} ก่อนถูกทำพัง`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={chapter.after}
          alt={`${chapter.th} หลังถูกทำพัง`}
          className="absolute inset-0 h-full w-full object-cover motion-safe:transition-[clip-path] motion-safe:duration-700"
          style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-[3px] motion-safe:transition-[left] motion-safe:duration-700"
          style={{ left: `calc(${pct}% - 1px)`, backgroundColor: EL.cream, opacity: pct > 0 && pct < 100 ? 0.9 : 0 }}
          aria-hidden="true"
        />
        {label && (
          <>
            <span
              className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs tracking-widest"
              style={{ fontFamily: EL_FONT.mono, backgroundColor: "rgba(29,33,31,0.7)", color: EL.cream, opacity: pct > 8 ? 1 : 0 }}
            >
              [ซ่อมแล้ว]
            </span>
            <span
              className="absolute right-3 top-3 rounded-full px-3 py-1 text-xs tracking-widest"
              style={{ fontFamily: EL_FONT.mono, backgroundColor: "rgba(29,33,31,0.7)", color: EL.cream, opacity: pct < 92 ? 1 : 0 }}
            >
              [มีคนทำพัง]
            </span>
          </>
        )}
      </div>
      {!controlled && (
        <div className="px-4 pb-4 pt-3">
          <label htmlFor={id} className="text-sm" style={{ color: EL.creamSoft }}>
            ลากเพื่อซ่อม
          </label>
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setDragged(Number(e.target.value) / 100)}
            className="mt-2 w-full"
            style={{ accentColor: EL.flame }}
          />
        </div>
      )}
      <figcaption className="sr-only">ภาพ: {chapter.credit}</figcaption>
    </figure>
  );
}
