"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { ELEMENT_DETAILS } from "@/components/hackathon/elemental/challenges";
import { ELEMENT_CHAPTERS, type ElementKey } from "@/components/hackathon/elemental/media";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ElementIcon } from "@/components/hackathon/poster/elemental/element-icons";

import kit from "./kit.module.css";

/**
 * The idea in one tap: a real case as the news tells it, then the same case
 * as a question someone can act on. Pick an element, then flip.
 */
export function NewsToQuestion() {
  const [element, setElement] = useState<ElementKey>("water");
  const [flipped, setFlipped] = useState(false);
  const d = ELEMENT_DETAILS[element];
  const c = d.cases[0];
  const chapter = ELEMENT_CHAPTERS.find((x) => x.key === element)!;

  return (
    <div className="rounded-3xl border p-5 sm:p-7" style={{ borderColor: "rgba(243,239,230,0.16)", backgroundColor: "rgba(243,239,230,0.03)" }}>
      <div className="flex gap-2" role="tablist" aria-label="เลือกธาตุ">
        {ELEMENT_CHAPTERS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === element}
            onClick={() => {
              setElement(x.key);
              setFlipped(false);
            }}
            className={`${styles.choice} flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 text-xs`}
            style={{ borderColor: x.key === element ? x.color : "transparent" }}
          >
            <ElementIcon element={x.key} size={24} id={`ntq-${x.key}`} />
            {x.th}
          </button>
        ))}
      </div>

      <div className="relative mt-6 min-h-[15rem]">
        <div className={`${kit.flip} absolute inset-0`} style={{ opacity: flipped ? 0 : 1, transform: flipped ? "translateY(-8px)" : "none" }} aria-hidden={flipped}>
          <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
            [จากข่าว · {c.placeTh}]
          </p>
          <p className="mt-3 text-pretty text-2xl" style={{ fontFamily: EL_FONT.display, lineHeight: 1.4 }}>
            {c.titleTh}
          </p>
          <p className="mt-4">
            <span className="text-4xl" style={{ fontFamily: EL_FONT.display, color: EL.flameLight }}>
              {c.impact[0].value}
            </span>{" "}
            <span style={{ color: EL.creamSoft }}>{c.impact[0].labelTh}</span>
          </p>
          <p className="mt-4 text-sm" style={{ color: EL.creamSoft }}>
            อ่านแล้วอาจนึกว่า “ใครต้องรับผิดชอบเรื่องนี้”
          </p>
        </div>
        <div className={`${kit.flip} absolute inset-0`} style={{ opacity: flipped ? 1 : 0, transform: flipped ? "none" : "translateY(8px)" }} aria-hidden={!flipped}>
          <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: chapter.color }}>
            [ลองถามแบบนี้]
          </p>
          <p className="mt-3 text-pretty text-2xl sm:text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.45 }}>
            {d.howMightWeTh}
          </p>
          <p className="mt-4 text-sm" style={{ color: EL.creamSoft }}>
            ใครเดือดร้อน {c.whoIsHurtTh}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={`${styles.choice} mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-lg font-semibold`}
        style={flipped ? { border: "1px solid rgba(243,239,230,0.3)", color: EL.cream } : { backgroundColor: EL.flame, color: EL.char }}
      >
        <RefreshCw className="h-5 w-5" /> {flipped ? "กลับไปดูข่าว" : "ดูตัวอย่างคำถาม"}
      </button>
    </div>
  );
}
