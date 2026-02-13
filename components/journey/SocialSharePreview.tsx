"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Share2, Sparkles, Check, ArrowRight } from "lucide-react";
import { DirectionFinderResult, DirectionVector } from "@/types/direction-finder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface SocialSharePreviewProps {
  result: DirectionFinderResult;
  onClose?: () => void;
}

// Instagram Feed/Portrait optimal size
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1350;

export function SocialSharePreview({
  result,
  onClose,
}: SocialSharePreviewProps) {
  const [step, setStep] = useState<'select' | 'generating' | 'preview'>('select');
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const generateImages = async () => {
    if (selectedPathIndex === null) return;

    setStep('generating');
    try {
      const refs = [page1Ref, page2Ref];
      const images: string[] = [];

      for (const ref of refs) {
        if (ref.current) {
          await document.fonts.ready;
          await new Promise((r) => setTimeout(r, 800));

          const dataUrl = await toPng(ref.current, {
            cacheBust: true,
            pixelRatio: 3,
            canvasWidth: TARGET_WIDTH,
            canvasHeight: TARGET_HEIGHT,
            width: TARGET_WIDTH,
            height: TARGET_HEIGHT,
          });
          images.push(dataUrl);
        }
      }
      setGeneratedImages(images);
      setStep('preview');
      toast.success("✨ Your story graphics are ready!");
    } catch (e) {
      console.error("Generation failed", e);
      toast.error("Failed to generate preview");
      setStep('select');
    }
  };

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement("a");
    link.download = `my-north-star-${index + 1}.png`;
    link.href = url;
    link.click();
    toast.success(`Image ${index + 1} downloaded!`);
  };

  const handleShareSystem = async (url: string) => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "my-north-star.png", { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "My North Star",
            text: "Discovering my path ✨ #NorthStar #PassionSeed",
          });
          toast.success("Shared successfully!");
        } catch (shareError) {
          if ((shareError as Error).name !== "AbortError") {
            console.error("Native share failed:", shareError);
            handleDownload(url, 0);
          }
        }
      } else {
        handleDownload(url, 0);
        toast.info("Image downloaded! Share it on your story ✨");
      }
    } catch (e) {
      console.error("Share preparation failed", e);
      toast.error("Failed to prepare image for sharing");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Share Your Story
          </h3>
          <p className="text-slate-400 text-base">
            Create beautiful graphics for Instagram • Optimized for Stories & Feed
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Close
          </Button>
        )}
      </div>

      {/* Step 1: Path Selection */}
      {step === 'select' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-3 py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-2">
              <Sparkles className="w-8 h-8 text-pink-400" />
            </div>
            <h4 className="text-2xl font-bold text-white">
              Choose Your Featured Path
            </h4>
            <p className="text-slate-400 max-w-md mx-auto">
              Select the career path you want to highlight in your Instagram story
            </p>
          </div>

          <div className="grid gap-4">
            {result.vectors.slice(0, 3).map((vector, index) => (
              <PathSelectionCard
                key={index}
                vector={vector}
                index={index}
                isSelected={selectedPathIndex === index}
                onSelect={() => setSelectedPathIndex(index)}
              />
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              disabled={selectedPathIndex === null}
              onClick={generateImages}
              className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 px-12 py-6 text-lg rounded-full disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
              Create Story Graphics
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Generating */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center p-20 animate-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 blur-3xl opacity-20 animate-pulse" />
            <Loader2 className="w-16 h-16 animate-spin text-purple-400 relative z-10" />
          </div>
          <h4 className="text-2xl font-bold text-white mt-8 mb-2">
            Crafting Your Story
          </h4>
          <p className="text-slate-400">
            Creating Instagram-worthy graphics...
          </p>
        </div>
      )}

      {/* Step 3: Preview & Download */}
      {step === 'preview' && generatedImages.length > 0 && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-emerald-400 mb-2">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Ready to share!</span>
            </div>
            <p className="text-slate-400 text-sm">
              Tap and hold to save, or use the share button
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {generatedImages.map((img, idx) => (
              <div key={idx} className="space-y-4">
                <div className="relative group aspect-[4/5] w-full max-w-[400px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 hover:border-purple-500/50 transition-all">
                  <Image
                    src={img}
                    alt={`Story Page ${idx + 1}`}
                    width={400}
                    height={500}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end gap-3 p-6">
                    <Button
                      size="lg"
                      onClick={() => handleDownload(img, idx)}
                      className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" /> Save to Photos
                    </Button>
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg"
                      onClick={() => handleShareSystem(img)}
                    >
                      <Share2 className="w-4 h-4 mr-2" /> Share to Instagram
                    </Button>
                  </div>
                </div>
                <p className="text-center text-sm font-semibold text-slate-400">
                  {idx === 0 ? "📊 Your Profile" : "🎯 Your Path"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep('select');
                setGeneratedImages([]);
              }}
              className="border-slate-700 hover:bg-slate-800"
            >
              Choose Different Path
            </Button>
          </div>
        </div>
      )}

      {/* Hidden Render Container */}
      {selectedPathIndex !== null && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div
            ref={page1Ref}
            style={{
              width: TARGET_WIDTH,
              height: TARGET_HEIGHT,
            }}
            className="bg-[#0a0a0a] text-white relative overflow-hidden"
          >
            <InstagramPage1 result={result} />
          </div>

          <div
            ref={page2Ref}
            style={{
              width: TARGET_WIDTH,
              height: TARGET_HEIGHT,
            }}
            className="bg-[#0a0a0a] text-white relative overflow-hidden"
          >
            <InstagramPage2
              result={result}
              selectedPathIndex={selectedPathIndex}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Path Selection Card Component
function PathSelectionCard({
  vector,
  index,
  isSelected,
  onSelect,
}: {
  vector: DirectionVector;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group hover:scale-[1.02]",
        isSelected
          ? "border-purple-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-lg shadow-purple-500/20"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
      )}
    >
      {/* Selection Indicator */}
      <div className={cn(
        "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        isSelected
          ? "border-purple-500 bg-purple-500"
          : "border-slate-600 bg-transparent group-hover:border-slate-500"
      )}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className="space-y-3 pr-8">
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-5xl font-black",
            isSelected ? "text-purple-400" : "text-slate-700"
          )}>
            {index + 1}
          </span>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
              {vector.industry || vector.name}
            </h4>
            <p className="text-sm text-slate-400 line-clamp-1">
              {vector.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-pink-300">Passion</span>
              <span className="font-bold text-white">{vector.match_scores?.passion || 90}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
                style={{ width: `${vector.match_scores?.passion || 90}%` }}
              />
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-300">Skill</span>
              <span className="font-bold text-white">{vector.match_scores?.skill || 85}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                style={{ width: `${vector.match_scores?.skill || 85}%` }}
              />
            </div>
          </div>
        </div>

        {vector.rarity && (
          <div className="inline-block px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            {vector.rarity}
          </div>
        )}
      </div>
    </button>
  );
}

// Instagram Page 1: Profile (Redesigned)
function InstagramPage1({ result }: { result: DirectionFinderResult }) {
  return (
    <div className="relative w-full h-full p-16 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sophisticated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-purple-600/10 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-radial from-pink-600/8 via-transparent to-transparent blur-3xl" />

      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-2 h-40 bg-gradient-to-b from-purple-500/50 to-transparent" />
      <div className="absolute bottom-32 left-20 w-40 h-2 bg-gradient-to-r from-pink-500/50 to-transparent" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-6 mb-12">
        <div className="inline-block">
          <div className="text-sm font-bold tracking-[0.3em] text-purple-300/80 uppercase mb-4">
            My Discovery
          </div>
          <h1 className="text-7xl font-black leading-none mb-3" style={{
            background: 'linear-gradient(135deg, #f8f8f8 0%, #d4d4d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            My Ikigai
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 mx-auto rounded-full" />
        </div>
      </div>

      {/* Profile Sections */}
      <div className="flex-1 space-y-8 relative z-10">
        {/* Energizers */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 flex items-center justify-center text-3xl">
              ⚡
            </div>
            <h2 className="text-3xl font-bold text-blue-300 uppercase tracking-wider" style={{ fontFamily: 'system-ui' }}>
              What Energizes Me
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {result.profile.energizers.slice(0, 4).map((e, i) => (
              <span
                key={i}
                className="px-6 py-3 rounded-2xl bg-blue-950/40 backdrop-blur-sm text-blue-100 border border-blue-800/50 text-xl font-medium"
              >
                {e.name}
              </span>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-400/30 flex items-center justify-center text-3xl">
              💪
            </div>
            <h2 className="text-3xl font-bold text-emerald-300 uppercase tracking-wider" style={{ fontFamily: 'system-ui' }}>
              My Strengths
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {result.profile.strengths.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="px-6 py-3 rounded-2xl bg-emerald-950/40 backdrop-blur-sm text-emerald-100 border border-emerald-800/50 text-xl font-medium"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-400/30 flex items-center justify-center text-3xl">
              💎
            </div>
            <h2 className="text-3xl font-bold text-purple-300 uppercase tracking-wider" style={{ fontFamily: 'system-ui' }}>
              Core Values
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {result.profile.values.slice(0, 4).map((v, i) => (
              <span
                key={i}
                className="px-6 py-3 rounded-2xl bg-purple-950/40 backdrop-blur-sm text-purple-100 border border-purple-800/50 text-xl font-medium"
              >
                {v.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black tracking-wider text-white/90 mb-1">
              PASSIONSEED.ORG
            </div>
            <div className="text-lg text-slate-400 font-medium">
              Find YOUR North Star ✨
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
            ✨
          </div>
        </div>
      </div>
    </div>
  );
}

// Instagram Page 2: Featured Path (Comprehensive Info)
function InstagramPage2({
  result,
  selectedPathIndex,
}: {
  result: DirectionFinderResult;
  selectedPathIndex: number;
}) {
  const featuredPath = result.vectors[selectedPathIndex];

  return (
    <div className="relative w-full h-full p-12 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sophisticated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-gradient-radial from-indigo-600/10 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-gradient-radial from-pink-600/8 via-transparent to-transparent blur-3xl" />

      {/* Header - Compact */}
      <div className="relative z-10 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-purple-400/30 backdrop-blur-sm mb-3">
              <span className="text-xs font-bold tracking-[0.2em] text-purple-300 uppercase">
                My Career Direction
              </span>
            </div>
            <h1 className="text-4xl font-black leading-tight mb-2" style={{
              background: 'linear-gradient(135deg, #f8f8f8 0%, #d4d4d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
              {featuredPath.industry || featuredPath.name}
            </h1>
            <p className="text-xl text-slate-300 font-semibold mb-1">
              {featuredPath.role}
            </p>
            {featuredPath.specialization && (
              <p className="text-sm text-slate-500 italic">
                → {featuredPath.specialization}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {featuredPath.rarity && (
              <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  {featuredPath.rarity}
                </span>
              </div>
            )}
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                Match
              </div>
              <div className="text-2xl font-black text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
                {featuredPath.match_scores?.overall || 90}%
              </div>
            </div>
          </div>
        </div>

        {/* Match Scores - Compact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-pink-950/40 to-pink-900/20 border border-pink-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-pink-300 font-semibold uppercase tracking-wider">Passion</span>
              <span className="text-2xl font-black text-pink-200">
                {featuredPath.match_scores?.passion || 90}%
              </span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
                style={{ width: `${featuredPath.match_scores?.passion || 90}%` }}
              />
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Skill</span>
              <span className="text-2xl font-black text-emerald-200">
                {featuredPath.match_scores?.skill || 85}%
              </span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                style={{ width: `${featuredPath.match_scores?.skill || 85}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable sections */}
      <div className="flex-1 space-y-4 relative z-10 overflow-hidden">
        {/* Why This Path - All 3 Alignments */}
        <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <h3 className="text-base font-bold text-indigo-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="text-xl">🎯</span>
            Why This Path Fits You
          </h3>
          <div className="space-y-3 text-sm">
            {/* Interest Alignment */}
            <div>
              <div className="text-pink-300 font-semibold mb-1 text-xs uppercase tracking-wider flex items-center gap-1">
                <span>💖</span> Passion Match
              </div>
              <p className="text-white/90 leading-relaxed">
                {featuredPath.fit_reason.interest_alignment}
              </p>
            </div>
            {/* Strength Alignment */}
            <div>
              <div className="text-emerald-300 font-semibold mb-1 text-xs uppercase tracking-wider flex items-center gap-1">
                <span>💪</span> Strength Match
              </div>
              <p className="text-white/90 leading-relaxed">
                {featuredPath.fit_reason.strength_alignment}
              </p>
            </div>
            {/* Value Alignment */}
            <div>
              <div className="text-purple-300 font-semibold mb-1 text-xs uppercase tracking-wider flex items-center gap-1">
                <span>💎</span> Value Match
              </div>
              <p className="text-white/90 leading-relaxed">
                {featuredPath.fit_reason.value_alignment}
              </p>
            </div>
          </div>
        </div>

        {/* University Programs */}
        {featuredPath.recommended_faculty && (
          <div className="bg-gradient-to-br from-amber-950/30 to-orange-950/30 border border-amber-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-base font-bold text-amber-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className="text-xl">🎓</span>
              University Path
            </h3>
            <div className="space-y-2">
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3">
                <div className="font-bold text-amber-200 text-base mb-1">
                  {featuredPath.recommended_faculty}
                </div>
                <div className="text-xs text-amber-300/70">
                  Recommended Faculty/Program
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Skills Preview */}
        {featuredPath.skill_tree?.beginner_level && (
          <div className="bg-gradient-to-br from-emerald-950/30 to-teal-950/30 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-base font-bold text-emerald-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <span className="text-xl">🚀</span>
              Start Learning
            </h3>
            <div className="flex flex-wrap gap-2">
              {featuredPath.skill_tree.beginner_level.slice(0, 6).map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/40 backdrop-blur-sm text-emerald-200 border border-emerald-800/40 text-xs font-medium"
                >
                  {skill.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* First Step */}
        {featuredPath.first_step && (
          <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <h3 className="text-base font-bold text-blue-300 mb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="text-xl">👣</span>
              Your First Step
            </h3>
            <p className="text-sm text-white/90 leading-relaxed">
              {featuredPath.first_step}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-black tracking-wider text-white/90">
              PASSIONSEED.ORG
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Find YOUR path • Free ✨
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
            ✨
          </div>
        </div>
      </div>
    </div>
  );
}
