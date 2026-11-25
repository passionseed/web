"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import type { Keyword } from "./learn";

const BODY_FONT = "var(--font-bai-jamjuree), sans-serif";

/** Clipboard API first; the old select-and-copy for browsers that block it (some in-app browsers). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/**
 * Under the brief's โจทย์: one button that copies a prompt for any AI chat,
 * and the element's keywords folded away, each with its English term.
 */
interface LearnDeeperProps {
  prompt: string;
  keywords: readonly Keyword[];
  color: string;
}

export function LearnDeeper({ prompt, keywords, color }: LearnDeeperProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onCopy(): Promise<void> {
    if (!(await copyText(prompt))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-[#faf8f4] transition-colors hover:bg-[#faf8f4]/10"
        style={{ fontFamily: BODY_FONT, borderColor: color }}
      >
        {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        {copied ? "คัดลอกแล้ว วางใน ChatGPT, Claude หรือ Gemini ได้เลย" : "คัดลอก prompt ไปถาม AI ต่อ"}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "คัดลอก prompt แล้ว" : ""}
      </span>

      <details className="group">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-[#e6e1d7] transition-colors hover:text-[#faf8f4] [&::-webkit-details-marker]:hidden"
          style={{ fontFamily: BODY_FONT }}
        >
          คำที่ควรรู้ {keywords.length} คำ
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-3 space-y-3">
          {keywords.map((k) => (
            <div key={k.th}>
              <dt className="text-[0.95rem] text-[#faf8f4]" style={{ fontFamily: BODY_FONT }}>
                {k.th}{" "}
                <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color }}>
                  {k.en}
                </span>
              </dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-[#cfc9bd]" style={{ fontFamily: BODY_FONT }}>
                {k.meaningTh}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
