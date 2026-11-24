"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Share2, X } from "lucide-react";

import styles from "@/components/hackathon/elemental/join/join.module.css";
import { trirong } from "@/components/hackathon/elemental/fonts";
import { buildFrame, checkFrame, ELEMENT_KITS } from "@/components/hackathon/elemental/kit";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { trackElemental } from "../track";
import kit from "./kit.module.css";
import { RepairScene } from "./RepairScene";
import { drawStoryCard } from "./story-card";

const line = "rgba(243,239,230,0.18)";
const STEPS = 4;

type Step = 0 | 1 | 2 | 3 | 4;

/**
 * From blame to a question, in four moves. Everything typed here stays in
 * this browser: nothing is sent or stored, and only "started" and "finished"
 * are counted (with the element, never the words). The scene above repairs a
 * little with every move.
 */
export function FrameTool({ element, elementTh }: { element: ElementKey; elementTh: string }) {
  const k = ELEMENT_KITS[element];
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [blame, setBlame] = useState("");
  const [shattered, setShattered] = useState(false);
  const [person, setPerson] = useState("");
  const [moment, setMoment] = useState("");
  const [need, setNeed] = useState("");
  const [question, setQuestion] = useState("");
  const [edited, setEdited] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // The question follows the picks until the person starts editing it by hand.
  useEffect(() => {
    if (!edited) setQuestion(buildFrame({ person, moment, need }));
  }, [person, moment, need, edited]);

  function go(next: Step) {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
    if (next === 1) trackElemental({ step: "kit_frame_start", detail: element });
    if (next === 4) trackElemental({ step: "kit_frame_done", detail: element });
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setAside() {
    setShattered(true);
    setTimeout(() => go(1), blame.trim() ? 900 : 0);
  }

  function restart() {
    setBlame("");
    setShattered(false);
    setPerson("");
    setMoment("");
    setNeed("");
    setEdited(false);
    go(0);
  }

  const answers: Partial<Record<Step, string>> = { 1: person, 2: moment, 3: need };
  const answer = answers[step];
  const canNext = answer === undefined || answer.trim().length > 0;

  return (
    <div ref={top} className="scroll-mt-6">
      <RepairScene element={element} repaired={step / STEPS} label />
      <div className="mt-5 flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => go((step - 1) as Step)} aria-label="ย้อนกลับ" className="rounded-full p-2" style={{ color: EL.creamSoft }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {Array.from({ length: STEPS + 1 }, (_, i) => (
            <span key={i} className="h-2 flex-1" style={{ backgroundColor: i <= step ? EL.flame : "rgba(243,239,230,0.14)" }} />
          ))}
        </div>
        <span className="text-sm tabular-nums" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
          {step}/{STEPS}
        </span>
      </div>

      <div key={step} className={`${direction === "forward" ? styles.stepForward : styles.stepBack} mt-6`} aria-live="polite">
        {step === 0 && (
          <Move n={0} title="อยากโทษใคร ระบายตรงนี้ก่อน" note="โกรธได้ มันมีเหตุผล พิมพ์ได้เต็มที่ ไม่มีใครเห็น และไม่ถูกส่งไปไหน">
            {shattered && blame.trim() ? (
              <Shatter text={blame} element={element} />
            ) : (
              <textarea
                value={blame}
                onChange={(e) => setBlame(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="เช่น ทำไมไม่มีใครจัดการเรื่องนี้สักที"
                className={`${styles.input} w-full rounded-2xl border bg-transparent px-4 py-3 text-lg outline-none`}
                style={{ borderColor: line, color: EL.cream }}
              />
            )}
            <button
              type="button"
              onClick={setAside}
              disabled={shattered}
              className={`${styles.choice} mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold`}
              style={{ backgroundColor: EL.flame, color: EL.char }}
            >
              {blame.trim() ? "พักความโกรธไว้ตรงนี้" : "ข้าม ไปหาจุดที่ซ่อมได้"} <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-3 text-sm" style={{ color: EL.creamSoft }}>
              ประโยคที่ชี้ว่าใครผิดอาจจะจริง แต่มันไม่ได้บอกว่าต้องซ่อมตรงไหน สี่ขั้นต่อจากนี้จะช่วยหาตรงนั้น
            </p>
          </Move>
        )}

        {step === 1 && (
          <Move n={1} title="ใครหนึ่งคน ที่เจอเรื่องนี้จริง" note="ไม่ใช่ “ชาวบ้าน” หรือ “คนไทย” แต่เป็นคนหนึ่งคนที่คุณนึกหน้าออก">
            <Chips options={k.people} value={person} onChange={setPerson} placeholder="หรือพิมพ์คนของคุณเอง" />
          </Move>
        )}

        {step === 2 && (
          <Move n={2} title="ช่วงไหนที่มันพังสำหรับเขา" note="นาทีที่เขาต้องตัดสินใจ แต่ไม่มีข้อมูล หรือไม่มีใครช่วย">
            <Chips options={k.moments} value={moment} onChange={setMoment} placeholder="หรือพิมพ์ช่วงเวลาเอง" />
          </Move>
        )}

        {step === 3 && (
          <Move n={3} title="ตอนนั้น เขาต้องทำอะไรให้ได้" note="สิ่งที่เขาต้องการ ไม่ใช่สิ่งที่เราอยากสร้าง">
            <Chips options={k.needs} value={need} onChange={setNeed} placeholder="หรือพิมพ์เอง" />
          </Move>
        )}

        {step === 4 && (
          <Result
            element={element}
            elementTh={elementTh}
            question={question}
            person={person}
            onChange={(q) => {
              setEdited(true);
              setQuestion(q);
            }}
            onRestart={restart}
          />
        )}
      </div>

      {step > 0 && step < 4 && (
        <button
          type="button"
          onClick={() => go((step + 1) as Step)}
          disabled={!canNext}
          className={`${styles.choice} mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold disabled:opacity-40`}
          style={{ backgroundColor: EL.flame, color: EL.char }}
        >
          {step === 3 ? "ตั้งเป็นคำถาม" : "ต่อไป"} <ArrowRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function Move({ n, title, note, children }: { n: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        [{n === 0 ? "ก่อนเริ่ม" : `ขั้นที่ ${n}`}]
      </p>
      <h3 className="mt-2 text-balance text-3xl sm:text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.3 }}>
        {title}
      </h3>
      <p className="mt-3 text-pretty" style={{ color: EL.creamSoft }}>
        {note}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Pick a starting point or type your own; the text box always holds the answer. */
function Chips({ options, value, onChange, placeholder }: { options: readonly string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? "" : o)}
            aria-pressed={on}
            className={`${styles.choice} rounded-2xl border px-5 py-4 text-left text-lg`}
            style={{ borderColor: on ? EL.flame : line, backgroundColor: on ? "rgba(236,100,36,0.12)" : "rgba(243,239,230,0.04)" }}
          >
            {o}
          </button>
        );
      })}
      <input
        value={options.includes(value) ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        placeholder={placeholder}
        className={`${styles.input} w-full rounded-2xl border bg-transparent px-5 py-4 text-lg outline-none`}
        style={{ borderColor: line, color: EL.cream }}
      />
    </div>
  );
}

/**
 * The blame, set aside: each character breaks into a pixel and falls away,
 * the campaign's corruption run backwards. Purely visual; the words go nowhere.
 */
function Shatter({ text, element }: { text: string; element: ElementKey }) {
  const colors = [EL.toxicRust, EL.toxicCyan, EL.toxicYellow, EL.flame, EL.aetherViolet];
  const offset = ["earth", "water", "air", "fire", "aether"].indexOf(element);
  return (
    <p className="min-h-[7.5rem] rounded-2xl border px-4 py-3 text-lg" style={{ borderColor: line }} aria-label="พักไว้แล้ว">
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className={kit.shatter}
          style={
            {
              "--dx": `${((i * 37) % 41) - 20}px`,
              "--dy": `${40 + ((i * 53) % 60)}px`,
              "--pixel": colors[(i + offset) % colors.length],
              animationDelay: `${(i % 24) * 18}ms`,
            } as React.CSSProperties
          }
        >
          {ch}
        </span>
      ))}
    </p>
  );
}

function Result({
  element,
  elementTh,
  question,
  person,
  onChange,
  onRestart,
}: {
  element: ElementKey;
  elementTh: string;
  question: string;
  person: string;
  onChange: (q: string) => void;
  onRestart: () => void;
}) {
  const checks = useMemo(() => checkFrame(question, person), [question, person]);
  const passed = checks.filter((c) => c.ok).length;
  return (
    <section>
      <p className="text-sm tracking-widest" style={{ fontFamily: EL_FONT.mono, color: EL.creamSoft }}>
        [โจทย์ของคุณ]
      </p>
      <label htmlFor="kit-question" className="sr-only">
        คำถามของคุณ แก้ได้
      </label>
      <textarea
        id="kit-question"
        value={question}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={240}
        className={`${styles.input} mt-3 w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-2xl outline-none sm:text-3xl`}
        style={{ borderColor: line, color: EL.cream, fontFamily: EL_FONT.display, fontWeight: 300, lineHeight: 1.45 }}
      />
      <p className="mt-2 text-sm" style={{ color: EL.creamSoft }}>
        แก้ได้ทุกคำ ให้เป็นภาษาของคุณเอง
      </p>

      <ul className="mt-6 grid gap-2" aria-label={`ผ่าน ${passed} จาก ${checks.length} ข้อ`}>
        {checks.map((c) => (
          <li key={c.key} className="flex gap-3">
            <span className="mt-0.5 shrink-0" style={{ color: c.ok ? EL.toxicGreen : EL.flameLight }}>
              {c.ok ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </span>
            <span>
              {c.th}
              {!c.ok && c.hintTh && (
                <span className="block text-sm" style={{ color: EL.creamSoft }}>
                  {c.hintTh}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <ShareQuestion element={element} elementTh={elementTh} question={question} />

      <button type="button" onClick={onRestart} className="mt-6 text-sm underline underline-offset-4" style={{ color: EL.creamSoft }}>
        ลองตั้งโจทย์ใหม่
      </button>
    </section>
  );
}

function ShareQuestion({ element, elementTh, question }: { element: ElementKey; elementTh: string; question: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const pageUrl = () => `${window.location.origin}/hackathon/elemental/kit/${element}`;
  const shareText = () => `โจทย์ของฉัน: ${question}\nลองตั้งโจทย์ของคุณ`;

  async function shareImage() {
    setBusy(true);
    try {
      const blob = await drawStoryCard({
        element,
        elementTh,
        question,
        fontFamily: trirong.style.fontFamily,
        url: `passionseed.org/hackathon/elemental/kit`,
      });
      const file = new File([blob], `elemental-kit-${element}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText()} ${pageUrl()}` });
        trackElemental({ step: "kit_shared", detail: "image" }, { once: false });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
        trackElemental({ step: "kit_shared", detail: "download" }, { once: false });
      }
    } catch {
      // The person closed the share sheet: nothing to do.
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${shareText()} ${pageUrl()}`);
      setCopied(true);
      trackElemental({ step: "kit_shared", detail: "copy" }, { once: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the question is on screen to copy by hand.
    }
  }

  function shareLine() {
    trackElemental({ step: "kit_shared", detail: "line" }, { once: false });
    window.open(`https://line.me/R/share?text=${encodeURIComponent(`${shareText()} ${pageUrl()}`)}`, "_blank", "noopener");
  }

  return (
    <div className="mt-8 grid gap-3">
      <button
        type="button"
        onClick={shareImage}
        disabled={busy || !question.trim()}
        className={`${styles.choice} inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold disabled:opacity-50`}
        style={{ backgroundColor: EL.flame, color: EL.char }}
      >
        <Share2 className="h-5 w-5" /> {busy ? "กำลังทำรูป" : "ทำเป็นรูป ลงสตอรี่"}
      </button>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <button type="button" onClick={shareLine} className={`${styles.choice} rounded-full border px-3 py-3`} style={{ borderColor: "rgba(243,239,230,0.25)" }}>
          ส่งใน LINE
        </button>
        <button
          type="button"
          onClick={copy}
          className={`${styles.choice} inline-flex items-center justify-center gap-1 rounded-full border px-3 py-3`}
          style={{ borderColor: "rgba(243,239,230,0.25)" }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "คัดลอกแล้ว" : "คัดลอกคำถาม"}
        </button>
      </div>
      <p className="text-xs" style={{ color: EL.creamSoft }}>
        <Download className="mr-1 inline h-3 w-3" />
        บนคอมพิวเตอร์ รูปจะถูกดาวน์โหลด รูปถูกสร้างในเครื่องของคุณ ไม่ถูกส่งมาที่เรา
      </p>
    </div>
  );
}
