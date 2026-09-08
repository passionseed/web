"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { ChevronLeft, ChevronRight, FileDown, LayoutGrid, Loader2, Maximize2, MessageSquare, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { SLIDES_DATA } from "@/lib/slide/csii-data";
import { Slide1Cover } from "./Slide1Cover";
import { Slide2Overview } from "./Slide2Overview";
import { Slide3Objectives } from "./Slide3Objectives";
import { Slide4Milestones } from "./Slide4Milestones";
import { Slide5NextMilestone } from "./Slide5NextMilestone";
import { SlideThumbnailModal } from "./SlideThumbnailModal";
import { SpeakerNotesDrawer } from "./SpeakerNotesDrawer";

const SLIDE_COMPONENTS = [Slide1Cover, Slide2Overview, Slide3Objectives, Slide4Milestones, Slide5NextMilestone] as const;
const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;
const PDF_WIDTH = 960;
const PDF_HEIGHT = 540;

export function CsiiSlideDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const exportSlideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalSlides = SLIDES_DATA.length;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) setCurrentSlide(index);
  }, [totalSlides]);

  const nextSlide = useCallback(() => setCurrentSlide((previous) => Math.min(previous + 1, totalSlides - 1)), [totalSlides]);
  const previousSlide = useCallback(() => setCurrentSlide((previous) => Math.max(previous - 1, 0)), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void containerRef.current?.requestFullscreen();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGeneratingPdf) return;
      const target = event.target as HTMLElement | null;
      if (target && ["input", "textarea"].includes(target.tagName.toLowerCase())) return;

      if (["ArrowRight", " ", "PageDown"].includes(event.key)) {
        event.preventDefault();
        nextSlide();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previousSlide();
      } else if (event.key === "Home") {
        event.preventDefault();
        goToSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToSlide(totalSlides - 1);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setIsNotesOpen((open) => !open);
      } else if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        setIsOverviewOpen((open) => !open);
      } else if (event.key === "Escape") {
        setIsNotesOpen(false);
        setIsOverviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToSlide, isGeneratingPdf, nextSlide, previousSlide, toggleFullscreen, totalSlides]);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    toast.info("Generating the 16:9 PDF deck...");

    try {
      await document.fonts.ready;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [PDF_WIDTH, PDF_HEIGHT] });
      pdf.setProperties({ title: "PassionSeed CSII Project Slide Deck", author: "Bunyasit Fang" });

      for (let index = 0; index < totalSlides; index += 1) {
        setPdfProgress(`Rendering ${index + 1}/${totalSlides}`);
        const slide = exportSlideRefs.current[index];
        if (!slide) throw new Error(`Export slide ${index + 1} is unavailable`);

        const image = await toPng(slide, {
          width: EXPORT_WIDTH,
          height: EXPORT_HEIGHT,
          canvasWidth: EXPORT_WIDTH,
          canvasHeight: EXPORT_HEIGHT,
          pixelRatio: 1,
          cacheBust: true,
          backgroundColor: "#000006",
        });

        if (index > 0) pdf.addPage([PDF_WIDTH, PDF_HEIGHT], "landscape");
        pdf.addImage(image, "PNG", 0, 0, PDF_WIDTH, PDF_HEIGHT, undefined, "FAST");
      }

      pdf.save("PassionSeed-CSII-Project-Slide-Deck.pdf");
      toast.success("PDF downloaded in 16:9 format.");
    } catch (error) {
      console.error("PDF generation failed", error);
      toast.error("PDF export failed. Reload the deck and try again.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress("");
    }
  };

  const CurrentSlide = SLIDE_COMPONENTS[currentSlide];

  return (
    <div ref={containerRef} className="relative flex min-h-screen w-full select-none flex-col items-center justify-between overflow-x-hidden bg-[#000006] font-bai-jamjuree text-white">
      <header className="no-print z-20 flex w-full items-center justify-between border-b border-white/[0.06] bg-[#000006]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-bold text-white"><span className="h-2 w-2 rounded-full bg-[#fed95c] shadow-[0_0_8px_#fed95c]" />PassionSeed</span>
          <span className="hidden text-xs text-white/35 sm:inline">/</span>
          <span className="hidden truncate text-xs text-white/55 sm:inline">CSII Project Slide Deck</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsOverviewOpen(true)} className="min-h-10 min-w-10 rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white" title="Slide overview (O)" aria-label="Open slide overview"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setIsNotesOpen((open) => !open)} className={`min-h-10 min-w-10 rounded-lg border p-2 transition-colors ${isNotesOpen ? "border-[#fed95c]/40 bg-[#fed95c]/15 text-[#fed95c]" : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"}`} title="Speaker notes (N)" aria-label="Toggle speaker notes"><MessageSquare className="h-4 w-4" /></button>
          <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="flex min-h-10 items-center gap-2 rounded-lg bg-[#fed95c] px-3 text-xs font-bold text-black transition-colors hover:bg-[#ffe785] disabled:opacity-60" title="Download 16:9 PDF">
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}<span>{pdfProgress || "Download PDF"}</span>
          </button>
          <button onClick={toggleFullscreen} className="hidden min-h-10 min-w-10 rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white sm:block" title="Fullscreen (F)" aria-label="Toggle fullscreen">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
        </div>
      </header>

      <main className="no-print flex w-full flex-1 items-center justify-center p-3 sm:p-5 lg:p-7">
        <div id="csii-slide-stage" className="group relative aspect-[16/9] w-[min(100%,calc(82vh*16/9))] overflow-hidden rounded-xl border border-white/10 bg-[#05091d] shadow-2xl shadow-black/90 lg:rounded-2xl">
          <CurrentSlide />
          {currentSlide > 0 ? <button onClick={previousSlide} className="absolute left-3 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2.5 text-white/65 opacity-0 backdrop-blur-md transition-all hover:text-white focus:opacity-100 group-hover:opacity-100" title="Previous slide" aria-label="Previous slide"><ChevronLeft className="h-6 w-6" /></button> : null}
          {currentSlide < totalSlides - 1 ? <button onClick={nextSlide} className="absolute right-3 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2.5 text-white/65 opacity-0 backdrop-blur-md transition-all hover:text-white focus:opacity-100 group-hover:opacity-100" title="Next slide" aria-label="Next slide"><ChevronRight className="h-6 w-6" /></button> : null}
        </div>
      </main>

      <nav className="no-print z-20 flex items-center justify-center pb-4 pt-1" aria-label="Slide navigation">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-xl">
          <button onClick={previousSlide} disabled={currentSlide === 0} className="min-h-8 min-w-8 rounded-full p-1 text-white/70 disabled:text-white/20" aria-label="Previous slide"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-1.5">
            {SLIDES_DATA.map((slide, index) => <button key={slide.id} onClick={() => goToSlide(index)} className={`rounded-full transition-all ${currentSlide === index ? "h-2 w-7 bg-[#fed95c]" : "h-2 w-2 bg-white/25 hover:bg-white/50"}`} title={`Slide ${index + 1}: ${slide.title}`} aria-label={`Go to slide ${index + 1}`} />)}
          </div>
          <span className="font-mono text-xs text-white/65">0{currentSlide + 1} <span className="text-white/25">/</span> 0{totalSlides}</span>
          <button onClick={nextSlide} disabled={currentSlide === totalSlides - 1} className="min-h-8 min-w-8 rounded-full p-1 text-white/70 disabled:text-white/20" aria-label="Next slide"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </nav>

      <SpeakerNotesDrawer isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} slide={SLIDES_DATA[currentSlide]} />
      <SlideThumbnailModal isOpen={isOverviewOpen} onClose={() => setIsOverviewOpen(false)} currentSlide={currentSlide} onSelectSlide={goToSlide} />

      <div aria-hidden="true" className="fixed left-[-10000px] top-0 pointer-events-none" style={{ width: EXPORT_WIDTH }}>
        {SLIDE_COMPONENTS.map((Slide, index) => <div key={SLIDES_DATA[index].id} ref={(element) => { exportSlideRefs.current[index] = element; }} style={{ width: EXPORT_WIDTH, height: EXPORT_HEIGHT }}><Slide /></div>)}
      </div>
    </div>
  );
}
