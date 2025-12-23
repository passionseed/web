"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Share2, ZoomIn } from "lucide-react";
import { DirectionFinderResult } from "@/types/direction-finder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface SocialSharePreviewProps {
  result: DirectionFinderResult;
  onClose?: () => void;
}

// Aspect ratio 4:5 (Instagram Portrait / Feed / Story safe zone)
// User asked for 1350px height
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1350;

export function SocialSharePreview({
  result,
  onClose,
}: SocialSharePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true); // Default to true as requested

  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // const bestPath = result.vectors[0]; // No longer needed, derived in render or child

  const generateImages = async () => {
    setIsGenerating(true);
    try {
      const refs = [page1Ref, page2Ref];
      const images: string[] = [];

      for (const ref of refs) {
        if (ref.current) {
          // Must ensure fonts load ? simple delay for now or document.fonts.ready
          await document.fonts.ready;
          // Wait a bit for layout
          await new Promise((r) => setTimeout(r, 500));

          const dataUrl = await toPng(ref.current, {
            cacheBust: true,
            pixelRatio: 3, // High quality for retina
            canvasWidth: TARGET_WIDTH,
            canvasHeight: TARGET_HEIGHT,
            width: TARGET_WIDTH,
            height: TARGET_HEIGHT,
            style: {
              // Force font availability in snapshot if variables are tricky,
              // but usually variables work if defined in root.
              // layout.tsx defines --font-krub
            },
          });
          images.push(dataUrl);
        }
      }
      setGeneratedImages(images);
    } catch (e) {
      console.error("Generation failed", e);
      toast.error("Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate on mount or when selection changes
  useEffect(() => {
    generateImages();
  }, [selectedPathIndex]);

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement("a");
    link.download = `north-star-story-${index + 1}.png`;
    link.href = url;
    link.click();
    toast.success(`Image ${index + 1} downloaded!`);
  };

  const handleShareSystem = async (url: string) => {
    try {
      // 1. Convert Data URL to Blob/File
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "north-star.png", { type: "image/png" });

      // 2. Check if the device supports native file sharing
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            // title/text effectively ignored by Instagram Stories share sheet usually,
            // but good for context in other apps (WhatsApp, etc.)
            title: "My North Star",
            text: "Discovering my path with Passion Seed #NorthStar",
          });
          toast.success("Shared successfully!");
        } catch (shareError) {
          // User cancelled or share failed
          if ((shareError as Error).name !== "AbortError") {
            console.error("Native share failed:", shareError);
            toast.error("Could not open share menu. Downloading instead.");
            handleDownload(url, 0);
          }
        }
      } else {
        // Fallback for desktop or unsupported browsers
        handleDownload(url, 0);
        toast.info("Image downloaded! You can now post it manually.");
      }
    } catch (e) {
      console.error("Share preparation failed", e);
      toast.error("Failed to prepare image for sharing");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Toggle Debugger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Share Your Journey</h3>
          <p className="text-slate-400 text-sm">
            Optimized for Instagram (1080x1350)s
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? "Hide Live View" : "Show Live View (Debug)"}
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* LIVE DEBUGGER VIEW */}
      {showDebug && (
        <div className="space-y-4 border-2 border-yellow-500/50 rounded-xl p-4 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <ZoomIn className="w-5 h-5" />
              <h4 className="font-bold">Live Template Debugger (Scaled 50%)</h4>
            </div>
            {/* Path Selector */}
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg">
              {result.vectors.map((vec, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPathIndex(idx)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    selectedPathIndex === idx
                      ? "bg-indigo-500 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {idx === 0 ? "Top Path" : `Path #${idx + 1}`}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            This shows the raw HTML components that will be screenshotted.
            Select a path above to change the "Recommended Path" view.
          </p>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {/* Preview 1 Wrapper */}
            <div
              className="relative shrink-0"
              style={{
                width: TARGET_WIDTH * 0.5,
                height: TARGET_HEIGHT * 0.5,
              }}
            >
              <div
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "top left",
                  width: TARGET_WIDTH,
                  height: TARGET_HEIGHT,
                }}
              >
                <SocialSharePage1 result={result} />
              </div>
            </div>
            {/* Preview 2 Wrapper */}
            <div
              className="relative shrink-0"
              style={{
                width: TARGET_WIDTH * 0.5,
                height: TARGET_HEIGHT * 0.5,
              }}
            >
              <div
                style={{
                  transform: "scale(0.5)",
                  transformOrigin: "top left",
                  width: TARGET_WIDTH,
                  height: TARGET_HEIGHT,
                }}
              >
                <SocialSharePage2
                  result={result}
                  selectedPathIndex={selectedPathIndex}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-lg border border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
          <p className="text-slate-400">Generating your custom graphics...</p>
        </div>
      )}

      {!isGenerating && generatedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {generatedImages.map((img, idx) => (
            <div key={idx} className="space-y-4">
              <div className="relative group aspect-[4/5] w-full max-w-[300px] mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                <Image
                  src={img}
                  alt={`Story Page ${idx + 1}`}
                  width={300}
                  height={375} // Approx aspect ratio for display
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleDownload(img, idx)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20"
                  >
                    <Download className="w-4 h-4 mr-2" /> Save to Photos
                  </Button>
                  <Button
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-700 text-white border-pink-500 shadow-lg shadow-pink-500/20"
                    onClick={() => handleShareSystem(img)}
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share to Story
                  </Button>
                </div>
              </div>
              <p className="text-center text-sm font-medium text-slate-500">
                {idx === 0 ? "Page 1: Profile" : "Page 2: Paths"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Render Container (The Source of Truth for html-to-image) */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        {/* Page 1 Wrap */}
        <div
          ref={page1Ref}
          style={{
            width: 1080,
            height: 1350,
            fontFamily: "var(--font-krub), sans-serif",
          }}
          className="bg-[#0f172a] text-white p-16 flex flex-col relative overflow-hidden"
        >
          <SocialSharePage1 result={result} />
        </div>

        {/* Page 2 Wrap */}
        <div
          ref={page2Ref}
          style={{
            width: 1080,
            height: 1350,
            fontFamily: "var(--font-krub), sans-serif",
          }}
          className="bg-[#0f172a] text-white p-16 flex flex-col relative overflow-hidden"
        >
          <SocialSharePage2
            result={result}
            selectedPathIndex={selectedPathIndex}
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS for Live Editing
// ----------------------------------------------------------------------

function SocialSharePage1({ result }: { result: DirectionFinderResult }) {
  return (
    <>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-4 pt-10">
        <span className="inline-block px-5 py-1.5 rounded-full bg-white/10 text-xl font-bold tracking-widest backdrop-blur-sm uppercase">
          My Discovery
        </span>
        <h1 className="text-6xl font-black bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight pb-1">
          My Unique Spark
        </h1>
        <p className="text-indigo-200 text-2xl font-medium tracking-wide">
          Powered by Ikigai & AI Analysis
        </p>
      </div>

      {/* Ikigai Chart */}
      <div className="flex-1 flex flex-col justify-center gap-6 relative z-10 my-8">
        {/* Energizers */}
        <div className="bg-slate-900/80 border border-blue-500/30 p-8 rounded-[40px] backdrop-blur-md shadow-xl">
          <h2 className="text-3xl font-bold text-blue-300 mb-6 flex items-center gap-4">
            <span className="p-3 bg-blue-500/20 rounded-2xl">⚡</span>
            What Energizes Me
          </h2>
          <div className="flex flex-wrap gap-3">
            {result.profile.energizers.map((e, i) => (
              <span
                key={i}
                className="text-xl px-4 py-2 rounded-xl bg-blue-950 text-blue-100 border border-blue-800"
              >
                {e}
              </span>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-slate-900/80 border border-green-500/30 p-8 rounded-[40px] backdrop-blur-md shadow-xl">
          <h2 className="text-3xl font-bold text-green-300 mb-6 flex items-center gap-4">
            <span className="p-3 bg-green-500/20 rounded-2xl">💪</span>
            My Strengths
          </h2>
          <div className="flex flex-wrap gap-3">
            {result.profile.strengths.map((e, i) => (
              <span
                key={i}
                className="text-xl px-4 py-2 rounded-xl bg-green-950 text-green-100 border border-green-800"
              >
                {e}
              </span>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="bg-slate-900/80 border border-purple-500/30 p-8 rounded-[40px] backdrop-blur-md shadow-xl">
          <h2 className="text-3xl font-bold text-purple-300 mb-6 flex items-center gap-4">
            <span className="p-3 bg-purple-500/20 rounded-2xl">💎</span>
            Core Values
          </h2>
          <div className="flex flex-wrap gap-3">
            {result.profile.values.map((e, i) => (
              <span
                key={i}
                className="text-xl px-4 py-2 rounded-xl bg-purple-950 text-purple-100 border border-purple-800"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-end justify-between mt-auto pt-6 border-t border-white/10">
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold text-white tracking-widest">
            PASSIONSEED.ORG
          </span>
          <span className="text-slate-200 text-lg font-medium text-nowrap">
            500+ students found theirs. Your turn? 👀
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 rounded-xl shadow-lg animate-pulse whitespace-nowrap">
              What's YOUR North Star? Discover now ➔
            </span>
            {/* Logo SVG */}
            <img
              src="/passionseed-logo.svg"
              alt="Passion Seed"
              className="h-12 w-auto"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function SocialSharePage2({
  result,
  selectedPathIndex,
}: {
  result: DirectionFinderResult;
  selectedPathIndex: number;
}) {
  const bestPath = result.vectors[selectedPathIndex];
  // The other paths are everyone EXCEPT the selected one, capped at 2
  const otherPaths = result.vectors
    .filter((_, i) => i !== selectedPathIndex)
    .slice(0, 2);

  return (
    <>
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-4 pt-10 mb-8">
        <span className="inline-block px-6 py-2 rounded-full bg-indigo-500/20 text-indigo-200 text-2xl font-bold tracking-widest backdrop-blur-sm border border-indigo-500/30">
          GUIDED BY AI
        </span>
        <h1 className="text-6xl font-black text-white">
          My Recommended
          <br />
          Paths
        </h1>
        <p className="text-slate-400 text-2xl font-medium tracking-wide">
          Aligned with your Ikigai & Strengths
        </p>
      </div>

      {/* Top Path Focus */}
      <div className="flex-1 flex flex-col gap-6 relative z-10">
        <div className="p-8 rounded-3xl border bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border-indigo-500/50 ring-4 ring-indigo-500/20 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-4xl font-black text-white leading-tight">
                {bestPath.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {bestPath.rarity && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-lg text-sm font-bold uppercase tracking-wider">
                    {bestPath.rarity}
                  </span>
                )}
                {bestPath.differentiators?.main_focus && (
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-lg text-sm font-bold">
                    Focus: {bestPath.differentiators.main_focus}
                  </span>
                )}
              </div>
            </div>
            <span className="px-5 py-2 rounded-full bg-white text-indigo-900 text-2xl font-bold">
              #{selectedPathIndex + 1}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xl text-slate-300">
                <span>Passion</span>
                <span className="font-bold text-pink-400">
                  {bestPath.match_scores?.passion || 90}%
                </span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${bestPath.match_scores?.passion || 90}%`,
                  }}
                  className="h-full bg-pink-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xl text-slate-300">
                <span>Skill</span>
                <span className="font-bold text-emerald-400">
                  {bestPath.match_scores?.skill || 85}%
                </span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${bestPath.match_scores?.skill || 85}%`,
                  }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 p-6 rounded-2xl mb-8">
            <h3 className="text-white font-bold mb-3 text-2xl flex items-center gap-2">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <ZoomIn className="w-6 h-6" />
              </span>
              Why this path?
            </h3>
            <p className="text-xl text-white leading-[1.6] font-light font-krub opacity-95">
              {bestPath.fit_reason.interest_alignment}
            </p>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <h4 className="text-emerald-300 font-bold text-lg uppercase tracking-widest pl-1">
              Knowledge & Skills
            </h4>
            <div className="flex flex-wrap gap-3">
              {bestPath.differentiators?.knowledge_base?.map(
                (k: string, i: number) => (
                  <span
                    key={`k-${i}`}
                    className="px-3 py-1 bg-emerald-900/40 text-emerald-200 border border-emerald-500/30 rounded-lg text-base font-medium"
                  >
                    {k}
                  </span>
                )
              )}
              {bestPath.differentiators?.skill_tree
                ?.slice(0, 4)
                .map((s: string, i: number) => (
                  <span
                    key={`s-${i}`}
                    className="px-3 py-1 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg text-base overflow-visible text-nowrap"
                  >
                    {s}
                  </span>
                ))}
            </div>
          </div>

          {bestPath.recommended_faculty && (
            <div className="flex items-center gap-4 text-xl text-slate-300">
              <span className="p-2.5 bg-indigo-500/20 rounded-xl">🎓</span>
              <span className="font-bold text-white">
                {bestPath.recommended_faculty}
              </span>
            </div>
          )}
        </div>

        {/* Other Paths Compact */}
        <div className="flex flex-col gap-4">
          {otherPaths.map((vec, idx) => (
            <div
              key={idx}
              className="p-8 rounded-[32px] bg-[#1e293b]/80 border border-[#3d4b6c] flex flex-col gap-5 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3 max-w-[70%]">
                  <h3 className="text-3xl font-black text-white leading-tight">
                    {vec.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {vec.rarity && (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-lg text-sm font-bold uppercase tracking-wider">
                        {vec.rarity}
                      </span>
                    )}
                    {vec.differentiators?.main_focus && (
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-sm font-medium">
                        Focus: {vec.differentiators.main_focus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-indigo-400">
                    {vec.match_scores?.overall || 85}%
                  </div>
                  <div className="text-xs text-slate-500 font-bold tracking-widest uppercase">
                    Match
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Knowledge tags */}
                {vec.differentiators?.knowledge_base
                  ?.slice(0, 2)
                  .map((k: string, i: number) => (
                    <span
                      key={`k-${i}`}
                      className="px-3 py-1.5 bg-emerald-900/20 text-emerald-400 border border-emerald-900/40 rounded-xl text-sm font-medium"
                    >
                      {k}
                    </span>
                  ))}
                {/* Skill tags */}
                {vec.differentiators?.skill_tree
                  ?.slice(0, 3)
                  .map((s: string, i: number) => (
                    <span
                      key={`s-${idx}-${i}`}
                      className="px-3 py-1.5 bg-slate-950/50 text-slate-400 border border-slate-800 rounded-xl text-sm overflow-hidden whitespace-nowrap text-nowrap"
                    >
                      {s}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-end justify-between mt-8 pt-6 border-t border-white/10">
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold text-white tracking-widest">
            PASSIONSEED.ORG
          </span>
          <span className="text-slate-200 text-lg font-medium">
            500+ students found theirs. Your turn? 👀
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
            <span className="text-xl font-bold text-white">
              What's YOUR North Star? Discover now ➔
            </span>
          </div>
          <img
            src="/passionseed-logo.svg"
            alt="Passion Seed"
            className="h-12 w-auto"
          />
        </div>
      </div>
    </>
  );
}
