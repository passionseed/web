"use client";

import {
  DirectionFinderResult,
  AssessmentAnswers,
  DirectionVector,
  ProfileItem,
  Message,
} from "@/types/direction-finder";
import { translations, Language } from "@/lib/i18n/direction-finder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  MessageSquare,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  Info,
  Download,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import React, { useState, useEffect, useRef } from "react";
import { saveDirectionFinderResult } from "@/app/actions/save-direction";
import { toPng } from "html-to-image";
import { SocialSharePreview } from "@/components/journey/SocialSharePreview";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import { ModelComparisonDialog } from "./ModelComparisonDialog";
import {
  regenerateDirectionProfile,
  canAccessModelComparison,
  RegenerateResult,
} from "@/app/actions/regenerate-direction";

interface DirectionResultsViewProps {
  // Data
  result: DirectionFinderResult;
  answers: AssessmentAnswers;
  chatHistory?: Message[];

  // Context
  mode: "assessment" | "journey_view"; // Controls auto-save, specific buttons
  userRole?: string; // For journey view debug/admin
  studentName?: string; // For showing student name in journey_view mode

  // Callbacks
  onBack: () => void;
  onSelect?: (vector: DirectionVector, index: number) => void;
  onRetake?: () => void;
  onRefine?: () => void;
  onStartNew?: () => void; // For "New Chat"
  resultId?: string; // For updating existing result
}

export function DirectionResultsView({
  result: initialResult,
  answers,
  chatHistory,
  mode,
  userRole,
  studentName,
  onBack,
  onSelect,
  onRetake,
  onRefine,
  onStartNew,
  resultId,
}: DirectionResultsViewProps) {
  // Language & Translation
  const { language } = useLanguage();
  const lang = (language as Language) || "en";
  const t = translations[lang];

  // State
  const [result, setResult] = useState(initialResult);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [canCompareModels, setCanCompareModels] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    RegenerateResult[] | null
  >(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync result if prop changes
  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  // Check for dev mode and access
  useEffect(() => {
    const isDevMode =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    console.log("[DirectionResultsView] Dev mode check:", {
      hostname: window.location.hostname,
      isDevMode,
    });
    setIsDev(isDevMode);

    canAccessModelComparison().then((canAccess) => {
      console.log(
        "[DirectionResultsView] Can access model comparison:",
        canAccess,
      );
      setCanCompareModels(canAccess);
    });
  }, []);

  useEffect(() => {
    if (isDev) {
      console.log("DirectionResultsView: Dev mode detected");
      toast("Dev Mode: Debug buttons enabled", {
        icon: <Terminal className="w-4 h-4 text-amber-400" />,
      });
    }
  }, [isDev]);

  // Auto-save logic (only for assessment mode)
  useEffect(() => {
    if (mode !== "assessment" || hasAutoSaved) return;

    const autoSave = async () => {
      try {
        await saveDirectionFinderResult(answers, result, chatHistory, resultId);
        setHasAutoSaved(true);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };

    autoSave();
  }, [answers, result, hasAutoSaved, chatHistory, resultId, mode]);

  // --- Image Generation Logic ---
  const generateProfileImage = async (node: HTMLElement) => {
    const scale = 2;
    const targetWidth = 1200;

    return await toPng(node, {
      cacheBust: true,
      backgroundColor: "#020617", // slate-950
      pixelRatio: scale,
      width: targetWidth,
      height: node.offsetHeight,
      style: {
        width: `${targetWidth}px`,
        height: "auto",
        maxWidth: "none",
        transform: "none",
        margin: "0",
        padding: "40px",
      },
      filter: (n) => {
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
      await saveDirectionFinderResult(
        answers,
        result,
        chatHistory,
        resultId,
        result.debugMetadata?.modelId,
      );

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

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `direction-profile-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleExportDebugData = (data?: any, filename?: string) => {
    const exportData = data || {
      modelUsed: result.debugMetadata?.modelId,
      prompt: result.debugMetadata?.prompt,
      engine: result.debugMetadata?.engine,
      answers,
      chatHistory,
      result: {
        ...result,
        debugMetadata: undefined, // Avoid recursion if stored inside
      },
      exportTimestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ||
      `direction-dev-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Debug data exported!");
  };

  const handleRegenerate = async (modelIds: string[]) => {
    if (!chatHistory) {
      toast.error("Chat history not available");
      return;
    }

    const results = await regenerateDirectionProfile(
      answers,
      chatHistory,
      modelIds,
      lang,
    );

    setComparisonResults(results);
    toast.success(`Generated results with ${modelIds.length} model(s)`);
  };

  return (
    <div className="animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto relative px-4 sm:px-6">
      <div ref={resultsRef} className="space-y-4">
        {/* Top Navigation */}
        <div
          className="flex items-center justify-between pt-12"
          data-hide-on-share="true"
        >
          <div>
            <Link href="/me/direction-history">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </Link>
          </div>
          <div className="flex gap-2">
            {(canCompareModels || isDev) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportDebugData()}
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                  title="Export Dev Data"
                >
                  <Terminal className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export Dev</span>
                </Button>
                {mode === "assessment" && (
                  <ModelComparisonDialog
                    onRegenerate={handleRegenerate}
                    disabled={!chatHistory}
                  />
                )}
              </>
            )}
            {mode === "assessment" && onRetake && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetake}
                className="gap-2 border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
              </Button>
            )}
            {mode === "assessment" && onStartNew && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartNew}
                className="text-slate-400 hover:text-white hidden sm:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            )}
            {mode === "assessment" && onRefine && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefine}
                className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-300"
              >
                <MessageSquare className="w-4 h-4" />
                {t.results.refine_button || "Refine"}
              </Button>
            )}
            {userRole && (
              <Badge
                variant="outline"
                className="text-xs text-yellow-500 border-yellow-500/50"
              >
                {String(userRole)} Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 relative py-0 sm:py-2">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-2 animate-pulse">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent px-4 py-2 leading-tight">
              {mode === "journey_view" && studentName
                ? `${studentName}${studentName.endsWith("s") ? "'" : "'s"} Profile`
                : t.results.title}
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
              {t.results.subtitle}
            </p>
          </div>
        </div>

        {/* Ikigai Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IkigaiCard
            title={t.results.energizers_title}
            icon={Zap}
            items={result.profile.energizers}
            color="blue"
            delay={0}
          />
          <IkigaiCard
            title={t.results.strengths_title}
            icon={TrendingUp}
            items={result.profile.strengths}
            color="green"
            delay={100}
          />
          <IkigaiCard
            title={t.results.values_title}
            icon={Target}
            items={result.profile.values}
            color="purple"
            delay={200}
          />
        </div>

        {/* Recommended Paths */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white py-1 leading-normal">
              {mode === "journey_view" && studentName
                ? `${studentName}${studentName.endsWith("s") ? "'" : "'s"} Top 3 Directions`
                : t.results.directions_title}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {result.vectors
              .slice(0, 3)
              .map((vector: DirectionVector, index: number) => (
                <PathCard
                  key={index}
                  vector={vector}
                  index={index}
                  t={t}
                  mode={mode}
                  lang={lang}
                  onSelect={
                    onSelect ? () => onSelect(vector, index) : undefined
                  }
                />
              ))}
          </div>
        </div>

        {/* Model Comparison Results */}
        {comparisonResults && comparisonResults.length > 0 && (
          <div className="space-y-8 mt-16 pt-16 border-t border-amber-500/30">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800 to-transparent" />
              <h2 className="text-2xl md:text-3xl font-bold text-center text-amber-300 flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                Model Comparison Results
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800 to-transparent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {comparisonResults.map(
                (compResult: RegenerateResult, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-6 space-y-4"
                  >
                    {/* Model Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                      <div>
                        <h3 className="font-bold text-amber-300 text-lg">
                          {compResult.modelId}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {compResult.generationTime}ms
                        </p>
                      </div>
                      {compResult.error ? (
                        <Badge
                          variant="outline"
                          className="text-red-400 border-red-500/30"
                        >
                          Error
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-400 border-green-500/30"
                        >
                          Success
                        </Badge>
                      )}
                      {canCompareModels && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-500 hover:text-amber-400"
                          onClick={() =>
                            handleExportDebugData(
                              {
                                modelId: compResult.modelId,
                                prompt: compResult.prompt,
                                generationTime: compResult.generationTime,
                                result: compResult.result,
                                answers,
                                chatHistory,
                              },
                              `comparison-${compResult.modelId}-${new Date().getTime()}.json`,
                            )
                          }
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Error Message */}
                    {compResult.error && (
                      <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-sm text-red-300">
                        {compResult.error}
                      </div>
                    )}

                    {/* Results Preview */}
                    {!compResult.error && compResult.result.vectors && (
                      <div className="space-y-3">
                        <div className="text-sm text-slate-400">
                          Generated {compResult.result.vectors.length} career
                          vectors
                        </div>
                        {compResult.result.vectors
                          .slice(0, 3)
                          .map((vec: DirectionVector, i: number) => (
                            <div
                              key={i}
                              className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                            >
                              <div className="font-medium text-white text-sm mb-1">
                                {vec.industry || vec.name}
                              </div>
                              <div className="text-xs text-slate-400 mb-2">
                                {vec.role}
                              </div>
                              <div className="flex gap-2 text-xs">
                                <span className="text-pink-300">
                                  Passion: {vec.match_scores?.passion}%
                                </span>
                                <span className="text-emerald-300">
                                  Skill: {vec.match_scores?.skill}%
                                </span>
                              </div>
                              {vec.exploration_steps && (
                                <div className="text-xs text-slate-500 mt-2">
                                  {vec.exploration_steps.length} exploration
                                  steps
                                </div>
                              )}
                              {vec.skill_tree && (
                                <div className="text-xs text-emerald-400 mt-1">
                                  Skill tree:{" "}
                                  {vec.skill_tree.beginner_level?.length || 0}{" "}
                                  beginner +
                                  {vec.skill_tree.intermediate_level?.length ||
                                    0}{" "}
                                  intermediate +
                                  {vec.skill_tree.advanced_level?.length || 0}{" "}
                                  advanced
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Clear Comparison Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setComparisonResults(null)}
                className="border-amber-500/30 hover:bg-amber-500/10 text-amber-400"
              >
                Clear Comparison
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Social Share / Action Section */}
      <div
        className="mt-16 space-y-8"
        data-hide-on-share="true" // Hide from main profile capture, share section has its own capture logic
      >
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              <Share2 className="w-6 h-6 text-pink-500" />
              {t.results.share_button || "Share Discovery"}
            </h2>
            <p className="text-slate-400">
              Generate a beautiful story for Instagram/Tiktok
            </p>
          </div>

          <div className="flex justify-center">
            {!isSharing ? (
              <Button
                size="lg"
                onClick={() => setIsSharing(true)}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg px-8 py-6 text-base sm:text-lg rounded-full w-full sm:w-auto"
              >
                <Sparkles className="w-5 h-5 mr-3 animate-pulse" />
                Create Story Graphics
              </Button>
            ) : (
              <div className="w-full">
                <SocialSharePreview
                  result={result}
                  onClose={() => setIsSharing(false)}
                />
              </div>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300"
            >
              {isSaving ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t.common.save} Image
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportDebugData()}
              className="gap-2 border-amber-500/30 hover:bg-amber-950/20 text-amber-400"
            >
              <Terminal className="w-4 h-4" />
              Export Dev Data (JSON)
            </Button>

            {mode === "assessment" && onRetake && (
              <Button
                variant="ghost"
                onClick={onRetake}
                className="gap-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: IkigaiCard with Popover Tooltips
function IkigaiCard({
  title,
  icon: Icon,
  items,
  color,
  delay,
}: {
  title: string;
  icon: any;
  items: ProfileItem[];
  color: "blue" | "green" | "purple";
  delay: number;
}) {
  const colorStyles = {
    blue: "from-blue-900/20 to-blue-800/10 border-blue-500/20 text-blue-300",
    green:
      "from-green-900/20 to-green-800/10 border-green-500/20 text-green-300",
    purple:
      "from-purple-900/20 to-purple-800/10 border-purple-500/20 text-purple-300",
  };

  const badgeStyles = {
    blue: "bg-blue-900/30 text-blue-200 border-blue-500/20 hover:bg-blue-800/40",
    green:
      "bg-green-900/30 text-green-200 border-green-500/20 hover:bg-green-800/40",
    purple:
      "bg-purple-900/30 text-purple-200 border-purple-500/20 hover:bg-purple-800/40",
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-br rounded-2xl p-6 border space-y-4 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both hover:-translate-y-1 transition-transform",
        colorStyles[color],
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-black/20")}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-bold uppercase tracking-wider text-sm py-1 leading-normal">
            {title}
          </h3>
        </div>
        <Info className="w-3.5 h-3.5 opacity-50 text-current" />
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Popover key={i}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer text-left active:scale-95",
                  badgeStyles[color],
                )}
              >
                {item.name}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-slate-900 border-slate-700 text-slate-200 p-4 shadow-xl z-50">
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {item.description}
                </p>
                {item.insight && (
                  <div className="pt-2 border-t border-slate-800 mt-2">
                    <p className="text-[10px] text-slate-400 italic">
                      "{item.insight}"
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
      <p className="text-[10px] opacity-60 text-center w-full pt-1">
        Tap items for details
      </p>
    </div>
  );
}

// Sub-component: PathCard (Unified)
function PathCard({
  vector,
  index,
  t,
  mode,
  onSelect,
  lang = "en",
}: {
  vector: DirectionVector;
  index: number;
  t: any;
  mode: "assessment" | "journey_view";
  onSelect?: () => void;
  lang?: Language;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTop = index === 0;

  // Rarity Colors
  const rarityColors = {
    Rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    Epic: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    Legendary: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    Mythical: "text-red-400 border-red-400/30 bg-red-400/10 animate-pulse",
  };

  const rarity = vector.rarity || "Rare";

  return (
    <div
      className={cn(
        "relative rounded-3xl border transition-all hover:shadow-2xl group overflow-hidden",
        isTop
          ? "bg-gradient-to-br from-indigo-950/80 to-slate-900 border-indigo-500/40 shadow-indigo-500/10"
          : "bg-slate-900/50 border-slate-700/50 hover:bg-slate-800/50",
      )}
    >
      {/* Header / Summary Section */}
      <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {/* Top Row: Rarity & Rank */}
          <div className="flex items-center gap-3 mb-2">
            {isTop && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 border-0">
                {t.results?.best_match || "Best Match"}
              </Badge>
            )}
            {vector.rarity && (
              <Badge
                variant="outline"
                className={cn(
                  rarityColors[rarity as keyof typeof rarityColors],
                )}
              >
                {vector.rarity}
              </Badge>
            )}
          </div>

          <div className="flex items-start justify-between">
            <h3 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-indigo-300 transition-colors py-1 leading-tight">
              {vector.industry || vector.name}
            </h3>
            <span className="text-4xl text-slate-800 font-black hidden sm:block">
              0{index + 1}
            </span>
          </div>

          {/* Mobile only rank number */}
          <div className="flex justify-between items-center sm:hidden">
            <span className="text-sm text-slate-400 font-medium">
              {vector.role}
            </span>
            <span className="text-2xl text-slate-800 font-black">
              0{index + 1}
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-base sm:text-lg hidden sm:block">
            {vector.fit_reason.interest_alignment}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {/* Show beginner skills from new skill_tree structure, or fallback to old differentiators */}
            {vector.skill_tree?.beginner_level
              ?.slice(0, 3)
              .map((skill: any, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-slate-800 text-slate-300 border-slate-700"
                >
                  {skill.skill_name}
                </Badge>
              )) ||
              vector.differentiators?.skill_tree
                ?.slice(0, 3)
                .map((s: string, i: number) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="bg-slate-800 text-slate-300 border-slate-700"
                  >
                    {s}
                  </Badge>
                ))}
          </div>
        </div>

        <div className="w-full md:w-64 space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-pink-300 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> PASSION
                </span>
                <span className="font-bold text-white">
                  {vector.match_scores?.passion || 90}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full transition-all duration-1000"
                  style={{ width: `${vector.match_scores?.passion || 90}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> SKILL
                </span>
                <span className="font-bold text-white">
                  {vector.match_scores?.skill || 85}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${vector.match_scores?.skill || 85}%` }}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            className="w-full mt-4 bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
          >
            {isExpanded
              ? t.results?.collapse_details || "Less"
              : t.results?.expand_details || "More Details"}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-black/20 p-6 sm:p-8 animate-in slide-in-from-top-4 duration-300">
          {/* Mobile Fit Reason show here if hidden above */}
          <div className="sm:hidden mb-6 pb-6 border-b border-white/5">
            <p className="text-slate-300 leading-relaxed text-sm">
              {vector.fit_reason.interest_alignment}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Faculty & Focus */}
            <div className="space-y-6">
              {vector.recommended_faculty && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-indigo-300 font-semibold">
                    <GraduationCap className="w-5 h-5" />{" "}
                    {t.faculty_label || "Recommended Faculty"}
                  </h4>
                  <div className="p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-lg font-medium text-indigo-100">
                    {vector.recommended_faculty}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-green-300 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />{" "}
                  {t.results?.start_here || "Start Here"}
                </h4>
                <p className="text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                  {vector.first_step}
                </p>
              </div>

              {vector.differentiators?.main_focus && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Target className="w-5 h-5" />{" "}
                    {t.focus_label || "Main Focus"}
                  </h4>
                  <p className="text-slate-300">
                    {vector.differentiators.main_focus}
                  </p>
                </div>
              )}
            </div>

            {/* Right Col: Exploration Steps */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-blue-300 font-semibold">
                <Target className="w-5 h-5" />{" "}
                {t.exploration_label || "Exploration Steps"}
              </h4>
              <div className="space-y-2">
                {vector.exploration_steps?.slice(0, 5).map((step, i) => (
                  <div
                    key={i}
                    className="flex gap-3 items-start p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-blue-500/30 transition-colors"
                  >
                    <Badge
                      variant="outline"
                      className="mt-0.5 text-[10px] border-blue-500/30 text-blue-300 shrink-0"
                    >
                      {step.type}
                    </Badge>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skill Tree Section - Full Width */}
          {vector.skill_tree && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="flex items-center gap-2 text-emerald-300 font-semibold mb-6">
                <Award className="w-5 h-5" /> {t.skills_label || "Skill Tree"}{" "}
                {lang === "th" ? "(เส้นทางการเรียนรู้)" : "(Learning Path)"}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Beginner Level */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-green-300 font-bold text-sm">
                      1
                    </div>
                    <h5 className="font-semibold text-green-300">
                      {lang === "th" ? "ระดับพื้นฐาน" : "Beginner"}
                    </h5>
                  </div>
                  {vector.skill_tree.beginner_level?.map((skill, i) => (
                    <div
                      key={i}
                      className="p-3 bg-green-950/20 border border-green-500/20 rounded-lg space-y-1 hover:bg-green-950/30 transition-colors"
                    >
                      <div className="font-medium text-green-200 text-sm">
                        {skill.skill_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {skill.description}
                      </div>
                      <div className="text-[10px] text-green-400 font-mono">
                        ⏱ {skill.time_estimate}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Intermediate Level */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-blue-300 font-bold text-sm">
                      2
                    </div>
                    <h5 className="font-semibold text-blue-300">
                      {lang === "th" ? "ระดับกลาง" : "Intermediate"}
                    </h5>
                  </div>
                  {vector.skill_tree.intermediate_level?.map((skill, i) => (
                    <div
                      key={i}
                      className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg space-y-1 hover:bg-blue-950/30 transition-colors"
                    >
                      <div className="font-medium text-blue-200 text-sm">
                        {skill.skill_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {skill.description}
                      </div>
                      <div className="text-[10px] text-blue-400 font-mono">
                        ⏱ {skill.time_estimate}
                      </div>
                      {skill.prerequisites &&
                        skill.prerequisites.length > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1">
                            {lang === "th" ? "ต้องมี:" : "Requires:"}{" "}
                            {skill.prerequisites.join(", ")}
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Advanced Level */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center text-purple-300 font-bold text-sm">
                      3
                    </div>
                    <h5 className="font-semibold text-purple-300">
                      {lang === "th" ? "ระดับสูง" : "Advanced"}
                    </h5>
                  </div>
                  {vector.skill_tree.advanced_level?.map((skill, i) => (
                    <div
                      key={i}
                      className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-lg space-y-1 hover:bg-purple-950/30 transition-colors"
                    >
                      <div className="font-medium text-purple-200 text-sm">
                        {skill.skill_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {skill.description}
                      </div>
                      <div className="text-[10px] text-purple-400 font-mono">
                        ⏱ {skill.time_estimate}
                      </div>
                      {skill.prerequisites &&
                        skill.prerequisites.length > 0 && (
                          <div className="text-[10px] text-slate-500 pt-1">
                            {lang === "th" ? "ต้องมี:" : "Requires:"}{" "}
                            {skill.prerequisites.join(", ")}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Select This Path Action */}
          {mode === "assessment" && onSelect && (
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
              <Button
                onClick={onSelect}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
              >
                Select This Path <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
