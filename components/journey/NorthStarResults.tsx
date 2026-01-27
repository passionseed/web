"use client";

import {
  DirectionFinderResult,
  AssessmentAnswers,
  DirectionVector,
  ProfileItem,
} from "@/types/direction-finder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Share2,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Heart,
  CheckCircle2,
  ArrowRight,
  User,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
} from "lucide-react";
import { useState } from "react";
import { SocialSharePreview } from "./SocialSharePreview";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";
import { translations } from "@/lib/i18n/direction-finder";

interface NorthStarResultsProps {
  result: DirectionFinderResult;
  answers: AssessmentAnswers;
  onBack: () => void;
  userRole?: string;
  backLabel?: string;
}

export function NorthStarResults({
  result,
  answers,
  onBack,
  userRole,
  backLabel = "Back to AI Chat",
}: NorthStarResultsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { language } = useLanguage();
  const t = translations[language as "en" | "th"].results;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Button>
        {userRole && (
          <Badge
            variant="outline"
            className="text-xs text-yellow-500 border-yellow-500/50"
          >
            {userRole} Mode
          </Badge>
        )}
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-6 relative py-10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
            Your North Star
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Based on your Ikigai profile and our AI analysis, here are the paths
            that align best with your authentic self.
          </p>
        </div>
      </div>

      {/* Ikigai Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <IkigaiCard
          title="Energizers"
          icon={Zap}
          items={result.profile.energizers}
          color="blue"
          delay={0}
        />
        <IkigaiCard
          title="Strengths"
          icon={TrendingUp}
          items={result.profile.strengths}
          color="green"
          delay={100}
        />
        <IkigaiCard
          title="Core Values"
          icon={Target}
          items={result.profile.values}
          color="purple"
          delay={200}
        />
      </div>

      {/* Recommended Paths */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center">{t.directions_title}</h2>
        <div className="grid grid-cols-1 gap-8">
          {result.vectors.slice(0, 3).map((vector, index) => (
            <PathCard key={index} vector={vector} index={index} t={t} />
          ))}
        </div>
      </div>

      {/* Feedback / Retry Tip */}
      <div className="flex justify-center pb-4">
        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-full px-6 py-3 flex items-center gap-3 text-indigo-200 max-w-xl text-sm md:text-base">
          <div className="p-1.5 bg-indigo-500/20 rounded-full shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>
            Feel like this isn't quite you?{" "}
            <button
              onClick={onBack}
              className="underline font-semibold hover:text-white transition-colors"
            >
              Go back to chat
            </button>{" "}
            and help the AI understand you better!
          </span>
        </div>
      </div>

      {/* Social Share Section (Live Preview) */}
      <div
        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-8"
        id="share-section"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Share2 className="w-6 h-6 text-pink-500" /> Share Your Discovery
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
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg px-8 py-6 text-lg rounded-full"
            >
              <Sparkles className="w-5 h-5 mr-3 animate-pulse" /> Create Story
              Graphics
            </Button>
          ) : (
            <div className="w-full max-w-5xl">
              <SocialSharePreview
                result={result}
                onClose={() => setIsSharing(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div
      className={cn(
        "bg-gradient-to-br rounded-2xl p-6 border space-y-4 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both hover:-translate-y-1 transition-transform",
        colorStyles[color],
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-black/20")}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold uppercase tracking-wider text-sm">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="px-3 py-1.5 rounded-lg bg-black/20 text-sm font-medium border border-white/5"
            title={item.insight}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PathCard({
  vector,
  index,
  t,
}: {
  vector: DirectionVector;
  index: number;
  t: any;
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
      <div className="p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {/* Top Row: Rarity & Rank */}
          <div className="flex items-center gap-3 mb-2">
            {isTop && (
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 border-0">
                {t.best_match}
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
            <h3 className="text-3xl font-bold text-white group-hover:text-indigo-300 transition-colors">
              {vector.name}
            </h3>
            <span className="text-4xl text-slate-800 font-black">
              0{index + 1}
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed text-lg">
            {vector.fit_reason.interest_alignment}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {vector.differentiators?.skill_tree?.slice(0, 3).map((s, i) => (
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

        <div className="w-full md:w-64 space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
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
              {vector.match_context?.passion_context && (
                <p className="text-xs text-slate-400 leading-tight pt-1">
                  {vector.match_context.passion_context}
                </p>
              )}
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
              {vector.match_context?.skill_context && (
                <p className="text-xs text-slate-400 leading-tight pt-1">
                  {vector.match_context.skill_context}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            {isExpanded ? t.collapse_details : t.expand_details}
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
        <div className="border-t border-white/5 bg-black/20 p-8 animate-in slide-in-from-top-4 duration-300">
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

            {/* Right Col: Deep Skill Tree */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Award className="w-5 h-5" /> {t.skills_label || "Skill Tree"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {vector.differentiators?.skill_tree?.map((skill, i) => (
                  <Badge
                    key={i}
                    className="px-3 py-1 bg-emerald-950/50 text-emerald-200 border-emerald-500/20 hover:bg-emerald-900/50"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
