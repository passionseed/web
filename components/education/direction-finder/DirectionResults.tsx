import {
  DirectionFinderResult,
  AssessmentAnswers,
  DirectionVector,
} from "@/types/direction-finder";
import { translations, Language } from "@/lib/i18n/direction-finder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Share2,
  Sparkles,
  Heart,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowLeft,
  Save,
  Plus,
  Map as MapIcon,
  MessageSquare,
  RefreshCw,
  History,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { saveDirectionFinderResult } from "@/app/actions/save-direction";
import { toPng } from "html-to-image";
import { Message } from "@/types/direction-finder";
import { AIConversation } from "./AIConversation";

interface DirectionResultsProps {
  result: DirectionFinderResult;
  answers: AssessmentAnswers;
  onComplete: () => void;
  onBack: () => void;
  chatHistory?: Message[];
  model?: string;
  lang: Language;
  onRefine?: () => void;
  resultId?: string;
  onStartNew?: () => void;
  onSelect?: (vector: DirectionVector, index: number) => void;
  onRetake?: () => void;
}

export function DirectionResults({
  result: initialResult,
  answers,
  onComplete,
  onBack,
  chatHistory: initialHistory,
  model,
  lang,
  onRefine,
  resultId,
  onStartNew,
  onSelect,
  onRetake,
}: DirectionResultsProps) {
  const t = translations[lang];
  const [result, setResult] = useState(initialResult);
  const [history, setHistory] = useState<Message[] | undefined>(initialHistory);
  // Remove isRefining since we use parent navigation now
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync result if prop changes
  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  // Auto-save on mount
  useEffect(() => {
    const autoSave = async () => {
      if (hasAutoSaved) return;

      try {
        await saveDirectionFinderResult(answers, result, history, resultId);
        setHasAutoSaved(true);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };

    autoSave();
  }, [answers, result, hasAutoSaved, history, resultId]);

  // Helper to capture image with consistent settings
  const generateProfileImage = async (node: HTMLElement) => {
    // 1. Force a desktop-like width for the capture to prevent mobile layout clipping
    const scale = 2; // Higher quality
    const targetWidth = 1200; // Force desktop width for the image

    // We need to temporarily style the node to ensure it renders at full width
    // or use the 'style' option in toPng.

    return await toPng(node, {
      cacheBust: true,
      backgroundColor: "#020617", // slate-950
      pixelRatio: scale,
      width: targetWidth,
      height: node.offsetHeight, // Explicitly capture full height
      style: {
        width: `${targetWidth}px`,
        height: "auto",
        maxWidth: "none", // Override any max-width constraints
        transform: "none", // Avoid transform issues
        margin: "0", // Reset margins
        padding: "40px", // Add padding to the captured image itself
      },
      filter: (n) => {
        // Exclude elements with data-hide-on-share attribute
        if (
          n instanceof HTMLElement &&
          n.getAttribute("data-hide-on-share") === "true"
        ) {
          return false;
        }
        return true;
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save to DB first
      await saveDirectionFinderResult(answers, result, history, resultId);

      // 2. Download Image
      if (resultsRef.current) {
        const dataUrl = await generateProfileImage(resultsRef.current);
        downloadImage(dataUrl);
        toast.success("Profile saved & image downloaded!");
      } else {
        toast.success("Profile saved!");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!resultsRef.current) return;

    setIsSharing(true);
    try {
      const dataUrl = await generateProfileImage(resultsRef.current);

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "direction-profile.png", {
        type: "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "My Direction Profile",
            text: "Check out my direction profile!",
            files: [file],
          });
          toast.success("Shared successfully!");
        } catch (shareError) {
          if ((shareError as Error).name !== "AbortError") {
            console.error("Error sharing:", shareError);
            downloadImage(dataUrl);
            toast.success("Image saved to device!");
          }
        }
      } else {
        downloadImage(dataUrl);
        toast.success("Image saved to device!");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `direction-profile-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      ref={resultsRef}
      className="space-y-12 max-w-7xl mx-auto pb-12 relative"
    >
      {/* Back Button - Only show if standard onBack behavior is desired or if we want to allow going 'back' from review mode to selection */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="absolute top-0 left-0 z-10 text-slate-400 hover:text-white"
        data-hide-on-share="true"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> {t.common.back}
      </Button>

      {/* Refine / AI Chat Toggle / New Session */}
      <div
        className="absolute top-0 right-0 z-10 flex gap-2"
        data-hide-on-share="true"
      >
        {onStartNew && (
          <Button
            variant="ghost"
            onClick={onStartNew}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onRefine}
          className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-300"
        >
          <MessageSquare className="w-4 h-4" />{" "}
          {t.results.refine_button || "Refine with AI"}
        </Button>
        <Link href="/me/direction-history">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
        </Link>
      </div>

      {/* Hero Section with Ikigai Visualization */}
      <div className="text-center space-y-6 relative pt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-4 animate-pulse">
            <Sparkles className="w-10 h-10 text-purple-400" />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3 py-2 leading-relaxed">
            {t.results.title}
          </h2>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            {t.results.subtitle}
          </p>
        </div>
      </div>

      {/* Ikigai Breakdown - Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* What Energizes You */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-2xl p-6 space-y-4 hover:border-blue-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">
              {t.results.energizers_title}
            </h3>
          </div>
          <div className="space-y-2">
            {result.profile.energizers.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-blue-100 bg-blue-950/30 px-3 py-2 rounded-lg"
              >
                <Heart className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Strengths */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 rounded-2xl p-6 space-y-4 hover:border-green-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center border border-green-500/30">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">
              {t.results.strengths_title}
            </h3>
          </div>
          <div className="space-y-2">
            {result.profile.strengths.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-green-100 bg-green-950/30 px-3 py-2 rounded-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What You Value */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 rounded-2xl p-6 space-y-4 hover:border-purple-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
              {t.results.values_title}
            </h3>
          </div>
          <div className="space-y-2">
            {result.profile.values.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-purple-100 bg-purple-950/30 px-3 py-2 rounded-lg"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Direction Vectors - Recommended Paths */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <h3 className="text-2xl font-bold text-white">
            {t.results.directions_title}
          </h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {result.vectors.map((vector, idx) => (
            <div
              key={idx}
              className={`group relative flex flex-col border rounded-2xl p-5 transition-all hover:shadow-lg ${
                idx === 0
                  ? "bg-gradient-to-br from-purple-900/30 to-blue-900/20 border-purple-500/50 ring-2 ring-purple-500/20"
                  : "bg-slate-900/60 border-slate-700/50 hover:border-slate-600"
              }`}
            >
              {/* Rank Badge */}
              <div
                className={`absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg border-2 border-slate-900 ${
                  idx === 0
                    ? "bg-gradient-to-br from-purple-500 to-pink-500"
                    : "bg-slate-700"
                }`}
              >
                {idx + 1}
              </div>

              <div className="space-y-4 flex-1 pt-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {vector.name}
                  </h4>
                  {idx === 0 && (
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-2 py-0.5 text-xs font-semibold">
                      {t.results.best_match}
                    </Badge>
                  )}
                </div>

                {/* Match Scores */}
                <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-pink-300 font-medium">
                        <Heart className="w-3 h-3 fill-pink-500/20" />{" "}
                        {t.results.passion_match}
                      </span>
                      <span className="text-white font-bold">
                        {vector.match_scores?.passion || 92}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-600 to-rose-500 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${vector.match_scores?.passion || 92}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1">
                      {vector.fit_reason.interest_alignment}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                        <Zap className="w-3 h-3 fill-emerald-500/20" />{" "}
                        {t.results.skill_match}
                      </span>
                      <span className="text-white font-bold">
                        {vector.match_scores?.skill || 88}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${vector.match_scores?.skill || 88}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1">
                      {vector.fit_reason.strength_alignment}
                    </p>
                  </div>
                </div>

                {/* Differentiators (New) */}
                {vector.differentiators && (
                  <div className="space-y-3 pt-2">
                    {/* Main Focus */}
                    <div className="bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                        Main Focus
                      </p>
                      <p className="text-sm font-medium text-white">
                        {vector.differentiators.main_focus}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Knowledge */}
                      <div className="bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Knowledge
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {vector.differentiators.knowledge_base.map((k, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-blue-900/40 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/20"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {vector.differentiators.skill_tree.map((k, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-emerald-900/40 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/20"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Milestones removed in favor of Interactive Planner */}
              </div>

              {/* First Step */}
              <div className="mt-4 pt-3 border-t border-slate-800/50 text-xs">
                <p className="font-medium text-green-400 mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t.results.start_here}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {vector.first_step}
                </p>
              </div>

              {/* Select Button */}
              {onSelect && (
                <div className="mt-4 pt-3 border-t border-slate-800/50">
                  <Button
                    onClick={() => onSelect(vector, idx)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Select This Path <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Journey Map CTA */}
      <div className="text-center space-y-4 p-8 bg-gradient-to-br from-purple-900/20 via-slate-900 to-blue-900/20 border border-purple-500/20 rounded-3xl">
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
        <h3 className="text-2xl font-bold text-white">
          {t.results.journey_cta_title}
        </h3>
        <p className="text-slate-400 max-w-lg mx-auto">
          {t.results.journey_cta_desc}
        </p>
        <Button
          size="lg"
          onClick={onComplete}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 text-lg px-8 py-6"
        >
          {t.results.journey_cta_button} <ArrowRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div
        className="flex flex-col sm:flex-row justify-center gap-4 pt-8"
        data-hide-on-share="true"
      >
        <Button
          variant="outline"
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300"
        >
          {isSaving ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t.common.save}
        </Button>
        <Button
          size="lg"
          onClick={handleShare}
          disabled={isSharing}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
        >
          {isSharing ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <Share2 className="w-5 h-5" />
          )}
          {t.results.share_button}
        </Button>
      </div>

      {/* Retake Section */}
      {onRetake && (
        <div className="flex justify-center pb-8" data-hide-on-share="true">
          <Button
            variant="ghost"
            onClick={onRetake}
            className="gap-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retake Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
