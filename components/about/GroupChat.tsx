"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, Flame, Hash, PartyPopper, Plus, SendHorizontal, Smartphone } from "lucide-react";

import type { ABOUT_ROOM } from "@/lib/content/about";
import { PixelFace } from "./PixelFace";

type Copy = typeof ABOUT_ROOM;

const PAPER = "#f2ead9";
const YELLOW = "#ffe800";
/** Each member's name colour, light enough to read on the dark window. */
const NAME_INKS = ["#5cb8f0", "#ff7cc6", "#ff9466", "#ffe800"];
const MUTED = "rgba(242,234,217,0.55)";
const LINE = "rgba(242,234,217,0.08)";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Avatar({ index, size = 36 }: { index: number; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-end justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, backgroundColor: "#2e2b36", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
    >
      <PixelFace ink={NAME_INKS[index % NAME_INKS.length]} variant={index} size={Math.round(size * 0.82)} />
    </span>
  );
}

function Reaction({ icon, count }: { icon: ReactNode; count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: "rgba(92,184,240,0.14)", color: "#9fd4f6", boxShadow: "inset 0 0 0 1px rgba(92,184,240,0.35)" }}
    >
      {icon}
      {count}
    </span>
  );
}

/**
 * Belief 3 as a toy: a group chat window. Open the invite and the room
 * fills in, one typing indicator at a time, with the staff badge always in
 * the header. No private chats, so this is the only kind of room there is.
 */
export function GroupChat({ copy }: { copy: Copy }) {
  const [shown, setShown] = useState(-1);
  const [typing, setTyping] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const join = () => {
    if (reducedMotion()) {
      setShown(copy.messages.length);
      return;
    }
    setShown(0);
    copy.messages.forEach((_, i) => {
      const at = 350 + i * 1150;
      timers.current.push(window.setTimeout(() => setTyping(i), at));
      timers.current.push(
        window.setTimeout(() => {
          setTyping(null);
          setShown(i + 1);
        }, at + 700),
      );
    });
  };

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        backgroundColor: "#1f1d25",
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5), 14px 34px 60px -20px rgba(0,0,0,0.9)",
      }}
    >
      {/* Window title bar. */}
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3.5 py-2.5"
        style={{ backgroundColor: "#2b2832", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(0,0,0,0.45)" }}
      >
        <span className="flex gap-1.5" aria-hidden="true">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, #ff8a84, #ff5f57 60%, #d9443d)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.45)",
            }}
          />
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, #ffe08a, #febc2e 60%, #d69613)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.45)",
            }}
          />
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, #6ee87e, #28c840 60%, #1ba130)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.45)",
            }}
          />
        </span>
        <span className="text-[12px] font-medium" style={{ color: MUTED }}>
          {copy.example}
        </span>
        <span aria-hidden="true" />
      </div>

      {/* Channel header: the room, and who else can see it. */}
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
        <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold" style={{ color: PAPER }}>
          <Hash className="h-4 w-4 shrink-0" style={{ color: MUTED }} aria-hidden="true" />
          <span className="truncate">{copy.roomName}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold" style={{ color: YELLOW }}>
          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> {copy.visible}
        </span>
      </div>

      <div className="flex min-h-[330px] flex-col justify-end px-4 py-4" aria-live="polite">
        {shown < 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <span className="flex -space-x-2.5" aria-hidden="true">
              {NAME_INKS.map((ink, i) => (
                <span key={ink} className="rounded-full p-[3px]" style={{ backgroundColor: "#1f1d25" }}>
                  <Avatar index={i} size={40} />
                </span>
              ))}
            </span>
            <span className="flex items-center gap-1 text-lg font-semibold" style={{ color: PAPER }}>
              <Hash className="h-4 w-4" style={{ color: MUTED }} aria-hidden="true" />
              {copy.roomName}
            </span>
            <button type="button" className="shift-button !px-5 !py-3 !text-base" onClick={join}>
              <span>{copy.joinButton}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 text-[11px] font-semibold" style={{ color: MUTED }} aria-hidden="true">
              <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
              {copy.today}
              <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
            </div>
            <ol className="flex flex-col gap-4">
              {copy.messages.slice(0, shown).map((m, i) => (
                <li key={m.text} className="about-pop flex gap-3">
                  <Avatar index={i} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                      <span className="text-sm font-semibold" style={{ color: NAME_INKS[i % NAME_INKS.length] }}>
                        {m.name}
                      </span>
                      {m.role && (
                        <span className="rounded-[4px] px-1.5 py-px text-[10.5px] font-bold" style={{ backgroundColor: YELLOW, color: "#17151c" }}>
                          {m.role}
                        </span>
                      )}
                      <span className="text-[11px] tabular-nums" style={{ color: MUTED }}>
                        {m.time}
                      </span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(242,234,217,0.9)" }}>
                      {m.text}
                    </p>
                    {m.link && (
                      <>
                        <span
                          className="mt-2 flex max-w-[15rem] items-center gap-3 rounded-lg p-2.5"
                          style={{ backgroundColor: "#28252f", boxShadow: `inset 0 0 0 1px ${LINE}` }}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ backgroundColor: "#ff48b0" }}>
                            <Smartphone className="h-4 w-4 text-[#17151c]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold" style={{ color: PAPER }}>
                              {m.link.title}
                            </span>
                            <span className="block text-[11px]" style={{ color: MUTED }}>
                              {m.link.meta}
                            </span>
                          </span>
                        </span>
                        <span className="mt-2 flex gap-1.5">
                          <Reaction icon={<Flame className="h-3 w-3" aria-hidden="true" />} count={3} />
                          <Reaction icon={<PartyPopper className="h-3 w-3" aria-hidden="true" />} count={2} />
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex h-5 items-center gap-2 text-xs" style={{ color: MUTED }}>
              {typing !== null && (
                <>
                  <span className="about-typing flex gap-[3px]" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  <span>
                    <span className="font-semibold">{copy.messages[typing].name}</span> {copy.typing}
                  </span>
                </>
              )}
            </p>
          </>
        )}
      </div>

      {/* The message box: part of the window, not a real input. */}
      <div className="px-3 pb-3" aria-hidden="true">
        <div
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
          style={{
            backgroundColor: "#26232d",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <Plus className="h-4 w-4 shrink-0 rounded-full" style={{ color: MUTED }} />
          <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "rgba(242,234,217,0.4)" }}>
            {copy.composer} #{copy.roomName}
          </span>
          <SendHorizontal className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
        </div>
      </div>
    </div>
  );
}
