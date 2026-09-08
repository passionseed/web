"use client";

import React from "react";
import { SLIDES_DATA, SlideData } from "@/lib/slide/csii-data";
import { X, MessageSquare, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";

interface SpeakerNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slide: SlideData;
}

export function SpeakerNotesDrawer({ isOpen, onClose, slide }: SpeakerNotesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-[#100e18]/95 backdrop-blur-xl border-l border-white/[0.1] shadow-2xl shadow-black/80 flex flex-col transition-all duration-300">
      {/* Drawer Header */}
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest">
          <MessageSquare className="w-4 h-4" />
          <span>Speaker Notes & Presenter Script</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Close Notes (N)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Slide Context Meta */}
      <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs">
        <span className="font-mono text-white/50">Slide {slide.number} of {SLIDES_DATA.length}</span>
        <span className="text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
          {slide.section}
        </span>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-white/85">
        {/* Slide Title */}
        <div>
          <h4 className="text-base font-bold text-white mb-1">{slide.title}</h4>
          <p className="text-xs text-white/60">{slide.subtitle}</p>
        </div>

        {/* Verbatim Presentation Script */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Spoken Delivery Script</span>
          </div>
          <div className="space-y-2.5">
            {slide.speakerNotes.map((note, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs sm:text-[13px] leading-relaxed text-white/80"
              >
                <span className="text-amber-400 font-mono font-bold mr-1.5">{idx + 1}.</span>
                {note}
              </div>
            ))}
          </div>
        </div>

        {/* Presenter rationale if present */}
        {slide.defenseScript && (
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Presenter Rationale</span>
            </div>
            <p className="text-xs leading-relaxed text-indigo-100/80">
              {slide.defenseScript}
            </p>
          </div>
        )}

        {/* Anticipated Q&A if present */}
        {slide.anticipatedQuestions && slide.anticipatedQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Anticipated Committee Q&A</span>
            </div>
            {slide.anticipatedQuestions.map((qa, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-emerald-950/15 border border-emerald-500/25 space-y-2 text-xs">
                <p className="font-semibold text-emerald-300">Q: "{qa.q}"</p>
                <p className="text-white/75 leading-relaxed"><strong>Response:</strong> {qa.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-white/[0.08] bg-black/40 text-[11px] text-white/50 flex items-center justify-between">
        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-white font-mono text-[10px]">N</kbd> to toggle</span>
        <span>CSII Project Slide Deck</span>
      </div>
    </div>
  );
}
