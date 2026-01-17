import {
  AssessmentStep,
  AssessmentAnswers,
  ZoneGridItem,
  classifyZoneItem,
} from "@/types/direction-finder";
import { translations } from "@/lib/i18n/direction-finder";
import type { Language } from "@/lib/i18n/direction-finder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  ChevronLeft,
  Home,
  Sun,
  Calendar,
  Sparkles,
  User,
  Users,
  Wrench,
  Lightbulb,
  Zap,
  Gauge,
  GripVertical,
  Star,
  TrendingUp,
  AlertTriangle,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface CoreAssessmentProps {
  step: AssessmentStep;
  answers: Partial<AssessmentAnswers>;
  onAnswer: (answers: Partial<AssessmentAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
  lang: Language;
}

// Reusable Question Wrapper
const QuestionWrapper = ({
  questionNumber,
  totalQuestions = 6,
  title,
  subtitle,
  emoji,
  children,
  canProceed = true,
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  showDevSkip = true,
}: {
  questionNumber?: number;
  totalQuestions?: number;
  title: string;
  subtitle?: string;
  emoji?: string;
  children: React.ReactNode;
  canProceed?: boolean;
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  showDevSkip?: boolean;
}) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Question Counter */}
    {questionNumber && (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-1.5 rounded-full transition-all",
                i < questionNumber ? "bg-blue-500" : "bg-slate-700"
              )}
            />
          ))}
        </div>
      </div>
    )}

    {/* Title */}
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h3>
      {subtitle && <p className="text-slate-400">{subtitle}</p>}
    </div>

    {/* Content */}
    <div className="py-2">{children}</div>

    {/* Navigation */}
    <div className="flex justify-between pt-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-slate-400 hover:text-white"
      >
        <ChevronLeft className="w-4 h-4 mr-2" /> {backLabel}
      </Button>
      <div className="flex gap-2">
        {process.env.NODE_ENV === "development" && showDevSkip && (
          <Button
            variant="ghost"
            onClick={onNext}
            className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 text-xs"
          >
            Skip (Dev)
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className={cn(
            "bg-blue-600 hover:bg-blue-700 text-white",
            !canProceed && "opacity-50 cursor-not-allowed"
          )}
        >
          {nextLabel} <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

// ==========================================
// DOMAIN OPTIONS FOR Q2 ZONE GRID
// ==========================================
const DOMAIN_OPTIONS = [
  { key: "math", label: "Math/Logic", emoji: "🔢" },
  { key: "science", label: "Science", emoji: "🔬" },
  { key: "coding", label: "Coding/Tech", emoji: "💻" },
  { key: "engineering", label: "Engineering", emoji: "⚙️" },
  { key: "art", label: "Art/Design", emoji: "🎨" },
  { key: "music", label: "Music", emoji: "🎵" },
  { key: "writing", label: "Writing", emoji: "✍️" },
  { key: "speaking", label: "Public Speaking", emoji: "🎤" },
  { key: "sports", label: "Sports/Fitness", emoji: "⚽" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "psychology", label: "Psychology", emoji: "🧠" },
  { key: "medicine", label: "Medicine/Health", emoji: "🏥" },
  { key: "teaching", label: "Teaching", emoji: "📚" },
  { key: "gaming", label: "Gaming/Esports", emoji: "🎮" },
  { key: "cooking", label: "Cooking/Food", emoji: "🍳" },
  { key: "fashion", label: "Fashion/Style", emoji: "👗" },
  { key: "social", label: "Social Impact", emoji: "🌍" },
  { key: "leadership", label: "Leadership", emoji: "👑" },
];

// ==========================================
// ACTIVITY OPTIONS FOR Q1
// ==========================================
const ACTIVITY_OPTIONS = [
  { key: "creating", label: "Creating/Building" },
  { key: "helping", label: "Helping/Teaching" },
  { key: "solving", label: "Problem Solving" },
  { key: "competing", label: "Competing" },
  { key: "learning", label: "Learning/Researching" },
  { key: "performing", label: "Performing" },
  { key: "leading", label: "Leading/Organizing" },
  { key: "analyzing", label: "Analyzing" },
];

// ==========================================
// REPUTATION OPTIONS FOR Q4
// ==========================================
const REPUTATION_OPTIONS = [
  { key: "tech", label: "Tech/Computer stuff" },
  { key: "creative", label: "Creative ideas" },
  { key: "emotional", label: "Emotional support" },
  { key: "explaining", label: "Explaining things clearly" },
  { key: "organizing", label: "Organizing/Planning events" },
  { key: "problem_solving", label: "Problem-solving" },
  { key: "fun", label: "Making things fun" },
  { key: "calm", label: "Staying calm under pressure" },
  { key: "patterns", label: "Spotting patterns/details" },
  { key: "design", label: "Design/Aesthetics" },
  { key: "leadership", label: "Taking the lead" },
  { key: "listening", label: "Being a good listener" },
];

// ==========================================
// PROUD MOMENT TAGS FOR Q5
// ==========================================
const PROUD_TAGS = [
  { key: "helped", label: "Helped others" },
  { key: "achieved", label: "Won or achieved something" },
  { key: "built", label: "Built/Created something" },
  { key: "overcame", label: "Overcame difficulty" },
  { key: "learned", label: "Learned something hard" },
  { key: "recognized", label: "Got recognized" },
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export function CoreAssessment({
  step,
  answers,
  onAnswer,
  onNext,
  onBack,
  lang,
}: CoreAssessmentProps) {
  const t = translations[lang];
  const [localAnswers, setLocalAnswers] =
    useState<Partial<AssessmentAnswers>>(answers);

  // Sync props to local state when step changes
  useEffect(() => {
    setLocalAnswers(answers);
  }, [step, answers]);

  const updateAnswer = <K extends keyof AssessmentAnswers>(
    key: K,
    value: AssessmentAnswers[K]
  ) => {
    const newAnswers = { ...localAnswers, [key]: value };
    setLocalAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  // ==========================================
  // INTRO STEP
  // ==========================================
  if (step === "intro") {
    return (
      <div className="text-center space-y-6 py-8 animate-in zoom-in duration-300">
        <div className="text-5xl">🧭</div>
        <h2 className="text-2xl font-bold text-white">
          {lang === "th" ? "ค้นหาเส้นทางที่ใช่" : "Find Your Direction"}
        </h2>
        <p className="text-slate-300 max-w-md mx-auto">
          {lang === "th"
            ? "ตอบคำถาม 6 ข้อสั้นๆ เพื่อค้นหาสิ่งที่คุณรักและถนัด"
            : "Answer 6 quick questions to discover what you love and what you're good at"}
          <br />
          <span className="text-sm text-slate-400 mt-2 block">
            {lang === "th" ? "⏱️ ใช้เวลา 6-8 นาที" : "⏱️ Takes 6-8 minutes"}
          </span>
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={onNext}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {lang === "th" ? "เริ่มเลย" : "Let's Go"}{" "}
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // Q1: ENERGY & FLOW DISCOVERY 🔥
  // ==========================================
  if (step === "q1") {
    const flowData = localAnswers.q1_flow || {
      description: "",
      activities: [],
    };
    const descriptionLength = flowData.description.trim().length;
    const hasMinLength = descriptionLength >= 20;
    const hasActivities = flowData.activities.length > 0;

    return (
      <QuestionWrapper
        questionNumber={1}
        title={lang === "th" ? "เวลาที่คุณ 'ลืมโลก'" : "When Time Flies"}
        subtitle={
          lang === "th"
            ? "คิดถึงตอนที่คุณจดจ่อกับอะไรบางอย่างจนลืมเวลา คุณกำลังทำอะไรอยู่?"
            : "Think of a time you were so absorbed in something you lost track of time. What were you doing?"
        }
        emoji="🔥"
        canProceed={hasMinLength && hasActivities}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-6">
          {/* Free Text */}
          <div className="space-y-2">
            <Textarea
              value={flowData.description}
              onChange={(e) =>
                updateAnswer("q1_flow", {
                  ...flowData,
                  description: e.target.value,
                })
              }
              placeholder={
                lang === "th"
                  ? "เช่น ตอนที่ผมตัดต่อวิดีโอให้เพื่อน ผมนั่งทำอยู่ 4 ชั่วโมงโดยไม่รู้ตัว..."
                  : "e.g. I was editing a video for my friend's birthday. I spent 4 hours without realizing..."
              }
              className="bg-slate-900 border-slate-700 min-h-[120px] text-white"
            />
            <div className="flex justify-between text-xs">
              <span
                className={cn(
                  "transition-colors",
                  hasMinLength ? "text-green-400" : "text-slate-500"
                )}
              >
                {descriptionLength}/20{" "}
                {lang === "th" ? "ตัวอักษรขั้นต่ำ" : "min characters"}
              </span>
              {!hasMinLength && descriptionLength > 0 && (
                <span className="text-amber-400">
                  {lang === "th" ? "เล่าเพิ่มอีกนิดนะ!" : "Tell us a bit more!"}
                </span>
              )}
            </div>
          </div>

          {/* Activity Checkboxes */}
          <div className="space-y-3">
            <Label className="text-slate-300">
              {lang === "th"
                ? "กิจกรรมนี้เกี่ยวกับ... (เลือกที่ใช่)"
                : "This activity involved... (select all that apply)"}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  onClick={() => {
                    const current = flowData.activities;
                    const newActivities = current.includes(option.key)
                      ? current.filter((a) => a !== option.key)
                      : [...current, option.key];
                    updateAnswer("q1_flow", {
                      ...flowData,
                      activities: newActivities,
                    });
                  }}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all text-sm",
                    flowData.activities.includes(option.key)
                      ? "bg-orange-600/20 border-orange-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {lang === "th" ? getThaiLabel(option.key) : option.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // Q2: ZONE GRID 🎯
  // ==========================================
  if (step === "q2") {
    const gridData = localAnswers.q2_zone_grid || { items: [] };
    const selectedDomains = gridData.items.map((i) => i.domain);
    const hasEnoughItems = gridData.items.length >= 3;

    const addDomain = (domain: string) => {
      if (selectedDomains.includes(domain)) return;
      const newItem: ZoneGridItem = { domain, interest: 5, capability: 5 };
      updateAnswer("q2_zone_grid", {
        items: [...gridData.items, newItem],
      });
    };

    const removeDomain = (domain: string) => {
      updateAnswer("q2_zone_grid", {
        items: gridData.items.filter((i) => i.domain !== domain),
      });
    };

    const updateDomainRating = (
      domain: string,
      field: "interest" | "capability",
      value: number
    ) => {
      updateAnswer("q2_zone_grid", {
        items: gridData.items.map((i) =>
          i.domain === domain ? { ...i, [field]: value } : i
        ),
      });
    };

    const getQuadrantInfo = (item: ZoneGridItem) => {
      const quadrant = classifyZoneItem(item);
      switch (quadrant) {
        case "genius":
          return {
            label: "Zone of Genius ⭐",
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
          };
        case "growth":
          return {
            label: "Growth Edge 🌱",
            color: "text-green-400",
            bg: "bg-green-500/10",
          };
        case "trap":
          return {
            label: "Capability Trap ⚠️",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          };
        default:
          return {
            label: "Not a priority",
            color: "text-slate-500",
            bg: "bg-slate-800",
          };
      }
    };

    return (
      <QuestionWrapper
        questionNumber={2}
        title={lang === "th" ? "Zone ที่คุณเก่ง" : "Your Zone"}
        subtitle={
          lang === "th"
            ? "เลือกสิ่งที่คุณสนใจ แล้วให้คะแนนว่าชอบและถนัดแค่ไหน"
            : "Pick areas you're interested in, then rate how much you ENJOY vs how CAPABLE you are"
        }
        emoji="🎯"
        canProceed={hasEnoughItems}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-6">
          {/* Domain Chips Pool */}
          <div className="space-y-2">
            <Label className="text-slate-400 text-sm">
              {lang === "th"
                ? "เลือกอย่างน้อย 3 หัวข้อ"
                : "Select at least 3 domains"}
            </Label>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map((domain) => {
                const isSelected = selectedDomains.includes(domain.key);
                return (
                  <button
                    key={domain.key}
                    onClick={() =>
                      isSelected
                        ? removeDomain(domain.key)
                        : addDomain(domain.key)
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    <span>{domain.emoji}</span>
                    <span>
                      {lang === "th" ? getThaiDomain(domain.key) : domain.label}
                    </span>
                    {isSelected && <X className="w-3 h-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Domains with Sliders */}
          {gridData.items.length > 0 && (
            <div className="space-y-4">
              <Label className="text-slate-300">
                {lang === "th" ? "ให้คะแนนแต่ละหัวข้อ" : "Rate each domain"}
              </Label>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {gridData.items.map((item) => {
                  const domain = DOMAIN_OPTIONS.find(
                    (d) => d.key === item.domain
                  );
                  const quadrantInfo = getQuadrantInfo(item);
                  return (
                    <div
                      key={item.domain}
                      className={cn(
                        "p-4 rounded-lg border border-slate-700 space-y-4",
                        quadrantInfo.bg
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{domain?.emoji}</span>
                          <span className="font-medium text-white">
                            {lang === "th"
                              ? getThaiDomain(item.domain)
                              : domain?.label || item.domain}
                          </span>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs",
                            quadrantInfo.color,
                            "bg-transparent border-0"
                          )}
                        >
                          {quadrantInfo.label}
                        </Badge>
                      </div>

                      {/* Interest Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-pink-400">
                            ❤️ {lang === "th" ? "ความชอบ" : "Interest"}:{" "}
                            {item.interest}/10
                          </span>
                        </div>
                        <Slider
                          value={[item.interest]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={([v]) =>
                            updateDomainRating(item.domain, "interest", v)
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Capability Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-yellow-400">
                            ⚡ {lang === "th" ? "ความถนัด" : "Capability"}:{" "}
                            {item.capability}/10
                          </span>
                        </div>
                        <Slider
                          value={[item.capability]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={([v]) =>
                            updateDomainRating(item.domain, "capability", v)
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-yellow-400">
              <Star className="w-3 h-3" /> Zone of Genius (High/High)
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <TrendingUp className="w-3 h-3" /> Growth Edge (High Interest/Low
              Skill)
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-3 h-3" /> Capability Trap (Low
              Interest/High Skill)
            </div>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // Q3: WORK STYLE ⚙️
  // ==========================================
  if (step === "q3") {
    const workStyle = localAnswers.q3_work_style || {
      indoor_outdoor: "neutral" as const,
      structured_flexible: "neutral" as const,
      solo_team: "neutral" as const,
      hands_on_theory: "neutral" as const,
      steady_fast: "neutral" as const,
    };

    type StyleKey = keyof typeof workStyle;
    type StyleValue =
      | "indoor"
      | "outdoor"
      | "structured"
      | "flexible"
      | "solo"
      | "team"
      | "hands_on"
      | "theory"
      | "steady"
      | "fast"
      | "neutral";

    const renderToggle = (
      key: StyleKey,
      left: { value: StyleValue; label: string; icon: any },
      right: { value: StyleValue; label: string; icon: any }
    ) => {
      const current = workStyle[key];
      return (
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
          {/* Left Option */}
          <button
            onClick={() =>
              updateAnswer("q3_work_style", {
                ...workStyle,
                [key]: current === left.value ? "neutral" : left.value,
              })
            }
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all",
              current === left.value
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            )}
          >
            <left.icon className="w-4 h-4" />
            <span className="text-sm">{left.label}</span>
          </button>

          {/* Divider */}
          <span className="text-slate-600">|</span>

          {/* Right Option */}
          <button
            onClick={() =>
              updateAnswer("q3_work_style", {
                ...workStyle,
                [key]: current === right.value ? "neutral" : right.value,
              })
            }
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all",
              current === right.value
                ? "bg-purple-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            )}
          >
            <right.icon className="w-4 h-4" />
            <span className="text-sm">{right.label}</span>
          </button>
        </div>
      );
    };

    return (
      <QuestionWrapper
        questionNumber={3}
        title={lang === "th" ? "สไตล์การทำงาน" : "How You Like to Work"}
        subtitle={
          lang === "th"
            ? "คลิกเพื่อเลือกสิ่งที่คุณชอบมากกว่า"
            : "Click to show your preferences"
        }
        emoji="⚙️"
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-4">
          {renderToggle(
            "indoor_outdoor",
            {
              value: "indoor",
              label: lang === "th" ? "ในร่ม" : "Indoor",
              icon: Home,
            },
            {
              value: "outdoor",
              label: lang === "th" ? "กลางแจ้ง" : "Outdoor",
              icon: Sun,
            }
          )}
          {renderToggle(
            "structured_flexible",
            {
              value: "structured",
              label: lang === "th" ? "มีแบบแผน" : "Structured",
              icon: Calendar,
            },
            {
              value: "flexible",
              label: lang === "th" ? "ยืดหยุ่น" : "Flexible",
              icon: Sparkles,
            }
          )}
          {renderToggle(
            "solo_team",
            {
              value: "solo",
              label: lang === "th" ? "ทำคนเดียว" : "Solo",
              icon: User,
            },
            {
              value: "team",
              label: lang === "th" ? "ทำเป็นทีม" : "Team",
              icon: Users,
            }
          )}
          {renderToggle(
            "hands_on_theory",
            {
              value: "hands_on",
              label: lang === "th" ? "ลงมือทำ" : "Hands-on",
              icon: Wrench,
            },
            {
              value: "theory",
              label: lang === "th" ? "ทฤษฎี" : "Theory",
              icon: Lightbulb,
            }
          )}
          {renderToggle(
            "steady_fast",
            {
              value: "steady",
              label: lang === "th" ? "สม่ำเสมอ" : "Steady pace",
              icon: Gauge,
            },
            {
              value: "fast",
              label: lang === "th" ? "ท้าทาย" : "Fast-paced",
              icon: Zap,
            }
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // Q4: REPUTATION 💬
  // ==========================================
  if (step === "q4") {
    const reputation = localAnswers.q4_reputation || [];
    const hasEnough = reputation.length >= 1 && reputation.length <= 3;

    const toggleReputation = (key: string) => {
      if (reputation.includes(key)) {
        updateAnswer(
          "q4_reputation",
          reputation.filter((r) => r !== key)
        );
      } else if (reputation.length < 3) {
        updateAnswer("q4_reputation", [...reputation, key]);
      }
    };

    return (
      <QuestionWrapper
        questionNumber={4}
        title={lang === "th" ? "ที่พึ่งของเพื่อน" : "Your Reputation"}
        subtitle={
          lang === "th"
            ? "คนอื่นมักจะมาขอให้คุณช่วยเรื่องอะไร หรือชมว่าคุณเก่งเรื่องอะไร? (เลือก 1-3 ข้อ)"
            : "What do people often ask you for help with OR compliment you about? (Pick 1-3)"
        }
        emoji="💬"
        canProceed={hasEnough}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {REPUTATION_OPTIONS.map((option) => (
            <div
              key={option.key}
              onClick={() => toggleReputation(option.key)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all text-sm",
                reputation.includes(option.key)
                  ? "bg-cyan-600/20 border-cyan-500 text-white"
                  : reputation.length >= 3
                    ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {lang === "th" ? getThaiReputation(option.key) : option.label}
              {reputation.includes(option.key) && (
                <span className="ml-2 text-cyan-400">✓</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-500 mt-4">
          {lang === "th"
            ? `เลือกแล้ว ${reputation.length}/3`
            : `Selected ${reputation.length}/3`}
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // Q5: PROUD MOMENT 🏆
  // ==========================================
  if (step === "q5") {
    const proudData = localAnswers.q5_proud || { story: "", tags: [] };
    const hasStory = proudData.story.trim().length >= 10;
    const hasTags = proudData.tags.length > 0;

    return (
      <QuestionWrapper
        questionNumber={5}
        title={lang === "th" ? "ความภูมิใจ" : "What Makes You Proud"}
        subtitle={
          lang === "th"
            ? "เล่าถึงสิ่งที่คุณทำสำเร็จแล้วรู้สึกภูมิใจ (เรื่องเล็กหรือใหญ่ก็ได้)"
            : "Describe something you accomplished that made you genuinely proud (big or small)"
        }
        emoji="🏆"
        canProceed={hasStory && hasTags}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="space-y-6">
          <Textarea
            value={proudData.story}
            onChange={(e) =>
              updateAnswer("q5_proud", { ...proudData, story: e.target.value })
            }
            placeholder={
              lang === "th"
                ? "เช่น ตอนที่ผมสอนน้องๆ ในค่ายอาสา พวกเขาเข้าใจและยิ้มให้ ผมรู้สึกดีใจมาก..."
                : "e.g. When I taught kids at a volunteer camp and they finally understood, seeing their smiles made me so happy..."
            }
            className="bg-slate-900 border-slate-700 min-h-[100px] text-white"
          />

          <div className="space-y-2">
            <Label className="text-slate-300">
              {lang === "th"
                ? "ทำไมถึงรู้สึกภูมิใจ? (เลือก 1-2 ข้อ)"
                : "What made it meaningful? (Pick 1-2)"}
            </Label>
            <div className="flex flex-wrap gap-2">
              {PROUD_TAGS.map((tag) => (
                <button
                  key={tag.key}
                  onClick={() => {
                    const current = proudData.tags;
                    const newTags = current.includes(tag.key)
                      ? current.filter((t) => t !== tag.key)
                      : current.length < 2
                        ? [...current, tag.key]
                        : current;
                    updateAnswer("q5_proud", { ...proudData, tags: newTags });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm transition-all",
                    proudData.tags.includes(tag.key)
                      ? "bg-amber-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {lang === "th" ? getThaiProudTag(tag.key) : tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // Q6: SECRET WEAPON ✨
  // ==========================================
  if (step === "q6") {
    const uniqueData = localAnswers.q6_unique || {
      description: "",
      skipped: false,
    };
    const canProceed =
      uniqueData.skipped || uniqueData.description.trim().length > 0;

    return (
      <QuestionWrapper
        questionNumber={6}
        title={lang === "th" ? "อาวุธลับ" : "Your Secret Weapon"}
        subtitle={
          lang === "th"
            ? "มีอะไรพิเศษเกี่ยวกับตัวคุณไหม? เช่น เรียนรู้บางอย่างได้เร็วมาก หรือมีความสนใจที่แปลกใหม่?"
            : "Is there something unique about you - maybe you learn certain things crazy fast, or you have an unusual combination of interests?"
        }
        emoji="✨"
        canProceed={canProceed}
        onBack={onBack}
        onNext={onNext}
        nextLabel={lang === "th" ? "วิเคราะห์ผล" : "Analyze"}
      >
        <div className="space-y-4">
          <Textarea
            value={uniqueData.description}
            onChange={(e) =>
              updateAnswer("q6_unique", {
                ...uniqueData,
                description: e.target.value,
                skipped: false,
              })
            }
            placeholder={
              lang === "th"
                ? "เช่น ผมเรียนรู้ภาษาใหม่ได้เร็วมาก หรือ ผมชอบทั้งวิทย์และศิลป์..."
                : "e.g. I pick up new languages really fast, or I'm into both science AND art..."
            }
            className="bg-slate-900 border-slate-700 min-h-[80px] text-white"
            disabled={uniqueData.skipped}
          />

          <div className="flex items-center gap-3">
            <Checkbox
              id="skip-unique"
              checked={uniqueData.skipped}
              onCheckedChange={(checked) =>
                updateAnswer("q6_unique", {
                  description: "",
                  skipped: Boolean(checked),
                })
              }
            />
            <label
              htmlFor="skip-unique"
              className="text-sm text-slate-400 cursor-pointer"
            >
              {lang === "th"
                ? "นึกไม่ออกตอนนี้"
                : "I can't think of anything right now"}
            </label>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // ==========================================
  // AI INTRO
  // ==========================================
  if (step === "ai_intro") {
    return (
      <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">
          {lang === "th" ? "เยี่ยมมาก!" : "Great Job!"}
        </h2>
        <p className="text-slate-300 max-w-md mx-auto">
          {lang === "th"
            ? "ตอนนี้พี่ Seed AI จะช่วยวิเคราะห์คำตอบของคุณ และสร้างโปรไฟล์เส้นทางที่ใช่"
            : "Now our AI advisor will analyze your answers and create your personalized direction profile."}
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> {t.common.back}
          </Button>
          <Button
            onClick={onNext}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            {lang === "th" ? "เริ่มบทสนทนา" : "Start Conversation"}{" "}
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="text-center py-8 text-slate-400">Unknown step: {step}</div>
  );
}

// ==========================================
// THAI TRANSLATION HELPERS
// ==========================================
function getThaiLabel(key: string): string {
  const map: Record<string, string> = {
    creating: "สร้างสรรค์/สร้างของ",
    helping: "ช่วยเหลือ/สอน",
    solving: "แก้ปัญหา",
    competing: "แข่งขัน",
    learning: "เรียนรู้/ค้นคว้า",
    performing: "แสดงออก",
    leading: "นำ/จัดการ",
    analyzing: "วิเคราะห์",
  };
  return map[key] || key;
}

function getThaiDomain(key: string): string {
  const map: Record<string, string> = {
    math: "คณิต/ตรรกะ",
    science: "วิทยาศาสตร์",
    coding: "เขียนโค้ด/IT",
    engineering: "วิศวกรรม",
    art: "ศิลปะ/ดีไซน์",
    music: "ดนตรี",
    writing: "การเขียน",
    speaking: "พูดในที่สาธารณะ",
    sports: "กีฬา/ออกกำลังกาย",
    business: "ธุรกิจ",
    psychology: "จิตวิทยา",
    medicine: "การแพทย์/สุขภาพ",
    teaching: "การสอน",
    gaming: "เกม/อีสปอร์ต",
    cooking: "ทำอาหาร",
    fashion: "แฟชั่น",
    social: "สังคม/ช่วยเหลือ",
    leadership: "ผู้นำ",
  };
  return map[key] || key;
}

function getThaiReputation(key: string): string {
  const map: Record<string, string> = {
    tech: "เรื่องไอที/คอม",
    creative: "ไอเดียสร้างสรรค์",
    emotional: "ปรึกษาเรื่องชีวิต",
    explaining: "อธิบายเรื่องยากให้ง่าย",
    organizing: "จัดงาน/วางแผน",
    problem_solving: "แก้ปัญหา",
    fun: "ทำให้สนุก",
    calm: "ใจเย็น/รับมือแรงกดดัน",
    patterns: "มองเห็นรายละเอียด",
    design: "ดีไซน์/ความสวยงาม",
    leadership: "นำทีม",
    listening: "รับฟังที่ดี",
  };
  return map[key] || key;
}

function getThaiProudTag(key: string): string {
  const map: Record<string, string> = {
    helped: "ช่วยเหลือคนอื่น",
    achieved: "ชนะ/สำเร็จ",
    built: "สร้างสิ่งใหม่",
    overcame: "ผ่านอุปสรรค",
    learned: "เรียนรู้เรื่องยาก",
    recognized: "ได้รับการยอมรับ",
  };
  return map[key] || key;
}
