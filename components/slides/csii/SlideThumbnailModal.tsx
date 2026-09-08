"use client";

import React from "react";
import { SLIDES_DATA } from "@/lib/slide/csii-data";
import { X, LayoutGrid } from "lucide-react";

interface SlideThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlide: number;
  onSelectSlide: (index: number) => void;
}

export function SlideThumbnailModal({
  isOpen,
  onClose,
  currentSlide,
  onSelectSlide,
}: SlideThumbnailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 sm:p-10 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#110f1a] border border-white/[0.1] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <LayoutGrid className="w-5 h-5 text-amber-400" />
            <span>Slide Overview (Jump to Slide)</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close Overview (O or Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnails Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
          {SLIDES_DATA.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => {
                onSelectSlide(idx);
                onClose();
              }}
              className={`group text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-[150px] relative overflow-hidden ${
                currentSlide === idx
                  ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30"
                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.2]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    currentSlide === idx ? "bg-amber-400 text-black" : "bg-white/[0.08] text-white/70"
                  }`}>
                    0{slide.number}
                  </span>
                  <span className="text-white/40 text-[11px] truncate max-w-[140px]">{slide.section}</span>
                </div>
                <h4 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                  {slide.title}
                </h4>
              </div>

              <p className="text-[11px] text-white/50 line-clamp-1 mt-2">
                {slide.subtitle}
              </p>
            </button>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/40">
          <span>Click any slide to jump directly</span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-white font-mono text-[10px]">O</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
