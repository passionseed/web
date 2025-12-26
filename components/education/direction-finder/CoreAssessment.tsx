import { AssessmentStep, AssessmentAnswers } from "@/types/direction-finder";
import { translations } from "@/lib/i18n/direction-finder";
import type { Language } from "@/lib/i18n/direction-finder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronRight,
  ChevronLeft,
  Star,
  Home,
  Sun,
  Calendar,
  Sparkles,
  User,
  Users,
  Wrench,
  Lightbulb,
  Clock,
  Mountain,
  Heart,
  Zap,
  Shuffle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CoreAssessmentProps {
  step: AssessmentStep;
  answers: Partial<AssessmentAnswers>;
  onAnswer: (answers: Partial<AssessmentAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
  lang: Language;
}

const QuestionWrapper = ({
  title,
  subtitle,
  children,
  canProceed = true,
  onBack,
  onNext,
  backLabel,
  nextLabel,
}: any) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-slate-400">{subtitle}</p>}
    </div>
    <div className="py-2">{children}</div>
    <div className="flex justify-between pt-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-slate-400 hover:text-white"
      >
        <ChevronLeft className="w-4 h-4 mr-2" /> {backLabel || "Back"}
      </Button>
      <div className="flex gap-2">
        {process.env.NODE_ENV === "development" && (
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
            "bg-white/10 hover:bg-white/20 text-white border border-white/10",
            !canProceed && "opacity-50 cursor-not-allowed"
          )}
        >
          {nextLabel || "Next"} <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

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
  const [customSkill, setCustomSkill] = useState("");
  const [q5PromptIndex, setQ5PromptIndex] = useState(0);

  const addCustomSkill = () => {
    const selectedSkills = localAnswers.q6_strongest_skills || [];
    if (
      customSkill.trim() &&
      !selectedSkills.includes(customSkill) &&
      selectedSkills.length < 5
    ) {
      updateAnswer("q6_strongest_skills", [
        ...selectedSkills,
        customSkill.trim(),
      ]);
      setCustomSkill("");
    }
  };

  // Sync props to local state when step changes
  useEffect(() => {
    setLocalAnswers(answers);
  }, [step, answers]);

  const updateAnswer = (key: keyof AssessmentAnswers, value: any) => {
    const newAnswers = { ...localAnswers, [key]: value };
    setLocalAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  // Intro Step
  if (step === "intro") {
    return (
      <div className="text-center space-y-6 py-8 animate-in zoom-in duration-300">
        <div className="text-4xl">🧭</div>
        <h2 className="text-2xl font-bold text-white">{t.intro.title}</h2>
        <p className="text-slate-300 max-w-md mx-auto">
          {t.intro.description}
          <br />
          <span className="text-sm text-slate-400 mt-2 block">
            {t.intro.time}
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
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            {t.intro.start_button} <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Q1: Time Flies When... (Select Top 3)
  if (step === "q1") {
    // Use keys from dictionary for stability
    const optionKeys = Object.keys(t.questions.q1.options) as Array<
      keyof typeof t.questions.q1.options
    >;
    const currentSelection = localAnswers.q1_time_flies || [];

    const toggleSelection = (key: string) => {
      // We store the KEY now, not the full text
      if (currentSelection.includes(key)) {
        updateAnswer(
          "q1_time_flies",
          currentSelection.filter((i) => i !== key)
        );
      } else if (currentSelection.length < 3) {
        updateAnswer("q1_time_flies", [...currentSelection, key]);
      }
    };

    return (
      <QuestionWrapper
        title={t.questions.q1.title}
        subtitle={`${t.questions.q1.subtitle} (${currentSelection.length}/3)`}
        canProceed={
          currentSelection.length >= 1 && currentSelection.length <= 3
        }
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid gap-3">
          {optionKeys.map((key) => (
            <div
              key={key as string}
              onClick={() => toggleSelection(key as string)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                currentSelection.includes(key as string)
                  ? "bg-blue-600/20 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
              )}
            >
              <span>
                {
                  t.questions.q1.options[
                    key as keyof typeof t.questions.q1.options
                  ]
                }
              </span>
              {currentSelection.includes(key as string) && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  #{currentSelection.indexOf(key as string) + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q2: Energy Check (Pick 3)
  if (step === "q2") {
    const optionKeys = Object.keys(t.questions.q2.options) as Array<
      keyof typeof t.questions.q2.options
    >;

    const currentSelection = localAnswers.q2_energy_sources || [];

    return (
      <QuestionWrapper
        title={t.questions.q2.title}
        subtitle={`${t.questions.q2.subtitle} (${currentSelection.length}/3)`}
        canProceed={currentSelection.length === 3}
        onBack={onBack}
        onNext={onNext}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {optionKeys.map((key) => (
            <div
              key={key as string}
              onClick={() => {
                if (currentSelection.includes(key as string)) {
                  updateAnswer(
                    "q2_energy_sources",
                    currentSelection.filter((i) => i !== key)
                  );
                } else if (currentSelection.length < 3) {
                  updateAnswer("q2_energy_sources", [
                    ...currentSelection,
                    key as string,
                  ]);
                }
              }}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                currentSelection.includes(key)
                  ? "bg-green-600/20 border-green-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
              )}
            >
              {
                t.questions.q2.options[
                  key as keyof typeof t.questions.q2.options
                ]
              }
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q3: Work Style (Clickers)
  if (step === "q3") {
    const styles = localAnswers.q3_work_style || {
      indoor_outdoor: 50,
      structured_flexible: 50,
      solo_team: 50,
      hands_on_theory: 50,
      routine_challenge: 50,
    };

    const renderClicker = (
      key: keyof typeof styles,
      left: { label: string; icon: any },
      right: { label: string; icon: any }
    ) => {
      const value = styles[key];

      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400 px-1">
            <div className="flex items-center gap-1">
              <left.icon className="w-3 h-3" /> {left.label}
            </div>
            <div className="flex items-center gap-1">
              {right.label} <right.icon className="w-3 h-3" />
            </div>
          </div>
          <div className="flex gap-1 h-10">
            {[0, 25, 50, 75, 100].map((val) => {
              const isSelected = val === value;
              // Determine color based on side
              let bgClass = "bg-slate-800 border-slate-700";
              if (isSelected) {
                if (val < 50)
                  bgClass = "bg-blue-600 border-blue-500 text-white";
                else if (val > 50)
                  bgClass = "bg-purple-600 border-purple-500 text-white";
                else bgClass = "bg-slate-600 border-slate-500 text-white";
              }

              return (
                <button
                  key={val}
                  onClick={() =>
                    updateAnswer("q3_work_style", { ...styles, [key]: val })
                  }
                  className={cn(
                    "flex-1 rounded border transition-all hover:bg-slate-700",
                    bgClass
                  )}
                />
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <QuestionWrapper
        title={t.questions.q3.title}
        subtitle={t.questions.q3.subtitle}
        onBack={onBack}
        onNext={onNext}
        lang={lang}
      >
        <div className="space-y-6 bg-slate-900/30 p-4 rounded-lg border border-slate-800">
          {renderClicker(
            "indoor_outdoor",
            { label: t.questions.q3.labels.indoor, icon: Home },
            { label: t.questions.q3.labels.outdoor, icon: Sun }
          )}
          {renderClicker(
            "structured_flexible",
            { label: t.questions.q3.labels.structured, icon: Calendar },
            { label: t.questions.q3.labels.flexible, icon: Sparkles }
          )}
          {renderClicker(
            "solo_team",
            { label: t.questions.q3.labels.solo, icon: User },
            { label: t.questions.q3.labels.team, icon: Users }
          )}
          {renderClicker(
            "hands_on_theory",
            { label: t.questions.q3.labels.hands_on, icon: Wrench },
            { label: t.questions.q3.labels.theory, icon: Lightbulb }
          )}
          {renderClicker(
            "routine_challenge",
            { label: t.questions.q3.labels.routine, icon: Clock },
            { label: t.questions.q3.labels.challenge, icon: Mountain }
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q4: Subject Love (Matrix: Love vs Capable)
  if (step === "q4") {
    const categories = {
      [t.questions.q4.categories.stem]: [
        "math_logic",
        "science",
        "technology",
        "engineering",
      ],
      [t.questions.q4.categories.creative]: [
        "visual_arts",
        "performing_arts",
        "writing",
      ],
      [t.questions.q4.categories.social]: [
        "psychology",
        "business",
        "healthcare",
        "education",
        "social_issues",
      ],
      [t.questions.q4.categories.other]: [
        "sports",
        "food",
        "fashion",
        "gaming",
      ],
    };
    // Map keys to displayed subjects
    const subjectMap = t.questions.q4.subjects;

    const selections = localAnswers.q4_subject_interests || [];

    const toggleSubject = (subject: string) => {
      const exists = selections.find((s) => s.subject === subject);
      if (exists) {
        updateAnswer(
          "q4_subject_interests",
          selections.filter((s) => s.subject !== subject)
        );
      } else {
        if (selections.length >= 5) return; // Limit to 5
        // Default to 3/3
        updateAnswer("q4_subject_interests", [
          ...selections,
          { subject, love: 3, capable: 3 },
        ]);
      }
    };

    const updateRating = (
      subject: string,
      type: "love" | "capable",
      value: number,
      e: React.MouseEvent
    ) => {
      e.stopPropagation();
      updateAnswer(
        "q4_subject_interests",
        selections.map((s) =>
          s.subject === subject ? { ...s, [type]: value } : s
        )
      );
    };

    // Flatten and sort subjects
    const allSubjects = Object.entries(categories).flatMap(([cat, subs]) =>
      subs.map((sub) => ({ category: cat, subject: sub }))
    );

    const sortedSubjects = [...allSubjects].sort((a, b) => {
      const aSelected = selections.find((s) => s.subject === a.subject);
      const bSelected = selections.find((s) => s.subject === b.subject);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return (
      <QuestionWrapper
        title={t.questions.q4.title}
        subtitle={`${t.questions.q4.subtitle} (${selections.length}/5)`}
        canProceed={selections.length > 0}
        onBack={onBack}
        onNext={onNext}
        lang={lang}
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {sortedSubjects.map(({ category, subject }) => {
            const selection = selections.find((s) => s.subject === subject);
            return (
              <div
                key={subject}
                onClick={() => toggleSubject(subject)}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all flex flex-col gap-3",
                  selection
                    ? "bg-slate-800 border-blue-500"
                    : selections.length >= 5
                      ? "opacity-50 cursor-not-allowed bg-slate-900 border-slate-800"
                      : "bg-slate-900 border-slate-800 hover:border-slate-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span
                      className={
                        selection ? "text-white font-medium" : "text-slate-400"
                      }
                    >
                      {/* Display translated subject name */}
                      {subjectMap[subject as keyof typeof subjectMap] ||
                        subject}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {category}
                    </span>
                  </div>
                </div>

                {selection && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                    {/* Love Rating */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Heart className="w-4 h-4 text-pink-500" />{" "}
                        {t.questions.q4.labels.love}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={(e) =>
                              updateRating(subject, "love", rating, e)
                            }
                            className={cn(
                              "flex-1 h-10 rounded-md font-medium transition-all flex items-center justify-center text-sm",
                              rating <= selection.love
                                ? "bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                            )}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Capable Rating */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Zap className="w-4 h-4 text-yellow-500" />{" "}
                        {t.questions.q4.labels.capable}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={(e) =>
                              updateRating(subject, "capable", rating, e)
                            }
                            className={cn(
                              "flex-1 h-10 rounded-md font-medium transition-all flex items-center justify-center text-sm",
                              rating <= selection.capable
                                ? "bg-yellow-600 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                            )}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </QuestionWrapper>
    );
  }

  // Q5: Flow State
  if (step === "q5") {
    const flowData = localAnswers.q5_flow_state || {
      activity: "",
      engaging_factors: [],
    };
    // Map keys for factors
    const factorKeys = Object.keys(t.questions.q5.factors) as Array<
      keyof typeof t.questions.q5.factors
    >;

    return (
      <QuestionWrapper
        title={t.questions.q5.title}
        subtitle={t.questions.q5.subtitle}
        canProceed={!!flowData.activity && flowData.engaging_factors.length > 0}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-base text-slate-200">
                    {(t.questions.q5 as any).prompts
                      ? (t.questions.q5 as any).prompts[q5PromptIndex]
                      : t.questions.q5.subtitle}
                  </Label>
                </div>
                {(t.questions.q5 as any).prompts &&
                  (t.questions.q5 as any).prompts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setQ5PromptIndex(
                          (prev) =>
                            (prev + 1) % (t.questions.q5 as any).prompts.length
                        )
                      }
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 shrink-0"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      {t.common.skip || "Switch"}
                    </Button>
                  )}
              </div>

              <Textarea
                value={flowData.activity}
                onChange={(e) =>
                  updateAnswer("q5_flow_state", {
                    ...flowData,
                    activity: e.target.value,
                  })
                }
                placeholder={t.questions.q5.activity_placeholder}
                className="bg-slate-900 border-slate-800 min-h-[100px]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.questions.q5.factors_label}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {factorKeys.map((key) => (
                <div
                  key={key as string}
                  onClick={() => {
                    const current = flowData.engaging_factors;
                    // Store key
                    if (current.includes(key as string)) {
                      updateAnswer("q5_flow_state", {
                        ...flowData,
                        engaging_factors: current.filter((f) => f !== key),
                      });
                    } else if (current.length < 2) {
                      updateAnswer("q5_flow_state", {
                        ...flowData,
                        engaging_factors: [...current, key as string],
                      });
                    }
                  }}
                  className={cn(
                    "p-3 rounded border cursor-pointer text-sm",
                    flowData.engaging_factors.includes(key)
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  {
                    t.questions.q5.factors[
                      key as keyof typeof t.questions.q5.factors
                    ]
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  // Part 2 Intro
  if (step === "part2_intro") {
    return (
      <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
        <div className="text-4xl">💪</div>
        <h2 className="text-2xl font-bold text-white">{t.part2.title}</h2>
        <p className="text-slate-300">{t.part2.description}</p>
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
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
          >
            {t.common.continue} <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Q6: Strongest Skills (Pick 5 + Custom)
  if (step === "q6") {
    const skillCategories = {
      [t.questions.q6.categories.creative]: [
        "visual_design",
        "writing",
        "original_ideas",
        "artistic",
      ],
      [t.questions.q6.categories.analytical]: [
        "math",
        "research",
        "problem_solving",
        "pattern_spotting",
      ],
      [t.questions.q6.categories.technical]: [
        "tech",
        "building",
        "systems",
        "coding",
      ],
      [t.questions.q6.categories.people]: [
        "explaining",
        "empathy",
        "public_speaking",
        "comforting",
      ],
      [t.questions.q6.categories.organizational]: [
        "planning",
        "detail",
        "leading",
        "focus",
      ],
      [t.questions.q6.categories.physical]: [
        "athletics",
        "manual",
        "endurance",
      ],
    };

    // Map keys to displayed skills
    const skillMap = t.questions.q6.skills;

    const selectedSkills = localAnswers.q6_strongest_skills || [];

    return (
      <QuestionWrapper
        title={t.questions.q6.title}
        subtitle={`${t.questions.q6.subtitle} (${selectedSkills.length}/5)`}
        canProceed={selectedSkills.length === 5}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="space-y-4">
          {/* Custom Input */}
          <div className="flex gap-2">
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder={t.questions.q6.custom_placeholder}
              className="bg-slate-800 border-slate-700"
              onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
            />
            <Button
              onClick={addCustomSkill}
              disabled={!customSkill.trim() || selectedSkills.length >= 5}
              variant="secondary"
            >
              {t.questions.q6.add_button}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pr-2">
            {Object.entries(skillCategories).map(([category, skills]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-semibold text-green-400 text-sm">
                  {category}
                </h4>
                <div className="space-y-1">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      onClick={() => {
                        if (selectedSkills.includes(skill)) {
                          updateAnswer(
                            "q6_strongest_skills",
                            selectedSkills.filter((s) => s !== skill)
                          );
                        } else if (selectedSkills.length < 5) {
                          updateAnswer("q6_strongest_skills", [
                            ...selectedSkills,
                            skill,
                          ]);
                        }
                      }}
                      className={cn(
                        "p-2 rounded border cursor-pointer text-sm transition-colors",
                        selectedSkills.includes(skill)
                          ? "bg-green-600/20 border-green-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {skillMap[skill as keyof typeof skillMap] || skill}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Skills Summary */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-green-900/30 text-green-300 hover:bg-green-900/50 cursor-pointer"
                  onClick={() =>
                    updateAnswer(
                      "q6_strongest_skills",
                      selectedSkills.filter((s) => s !== skill)
                    )
                  }
                >
                  {skillMap[skill as keyof typeof skillMap] || skill}{" "}
                  <span className="ml-1 text-xs">×</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q7: Proud Moments
  if (step === "q7") {
    const optionKeys = Object.keys(t.questions.q7.options) as Array<
      keyof typeof t.questions.q7.options
    >;
    const selected = localAnswers.q7_proud_moments || [];

    return (
      <QuestionWrapper
        title={t.questions.q7.title}
        subtitle={t.questions.q7.subtitle}
        canProceed={selected.length > 0}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="grid gap-2">
          {optionKeys.map((key) => (
            <div
              key={key as string}
              onClick={() => {
                if (selected.includes(key)) {
                  updateAnswer(
                    "q7_proud_moments",
                    selected.filter((s) => s !== key)
                  );
                } else if (selected.length < 3) {
                  updateAnswer("q7_proud_moments", [...selected, key]);
                }
              }}
              className={cn(
                "p-3 rounded border cursor-pointer",
                selected.includes(key)
                  ? "bg-amber-600/20 border-amber-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              )}
            >
              {t.questions.q7.options[key]}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  // Q8-Q13 Simplified
  if (step === "q8") {
    const optionKeys = Object.keys(t.questions.q8.options) as Array<
      keyof typeof t.questions.q8.options
    >;
    const selected = localAnswers.q8_learning_style || [];
    return (
      <QuestionWrapper
        title={t.questions.q8.title}
        subtitle={t.questions.q8.subtitle}
        canProceed={selected.length === 2}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="grid grid-cols-2 gap-3">
          {optionKeys.map((key) => (
            <div
              key={key as string}
              onClick={() => {
                if (selected.includes(key))
                  updateAnswer(
                    "q8_learning_style",
                    selected.filter((s) => s !== key)
                  );
                else if (selected.length < 2)
                  updateAnswer("q8_learning_style", [...selected, key]);
              }}
              className={cn(
                "p-4 rounded border cursor-pointer text-center",
                selected.includes(key)
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-slate-800 border-slate-700"
              )}
            >
              {t.questions.q8.options[key]}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === "q9") {
    const optionKeys = Object.keys(t.questions.q9.options) as Array<
      keyof typeof t.questions.q9.options
    >;
    const selected = localAnswers.q9_help_requests || [];
    return (
      <QuestionWrapper
        title={t.questions.q9.title}
        subtitle={t.questions.q9.subtitle}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="grid grid-cols-2 gap-2">
          {optionKeys.map((key) => (
            <div
              key={key as string}
              onClick={() => {
                if (selected.includes(key))
                  updateAnswer(
                    "q9_help_requests",
                    selected.filter((s) => s !== key)
                  );
                else updateAnswer("q9_help_requests", [...selected, key]);
              }}
              className={cn(
                "p-3 rounded border cursor-pointer text-sm",
                selected.includes(key)
                  ? "bg-purple-600/20 border-purple-500"
                  : "bg-slate-800 border-slate-700"
              )}
            >
              {t.questions.q9.options[key]}
            </div>
          ))}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === "q10") {
    const data = localAnswers.q10_fast_learner || { is_fast_learner: false };
    const speedKeys = Object.keys(t.questions.q10.speed) as Array<
      keyof typeof t.questions.q10.speed
    >;

    return (
      <QuestionWrapper
        title={t.questions.q10.title}
        subtitle={t.questions.q10.subtitle}
        canProceed={!data.is_fast_learner || (!!data.topic && !!data.speed)}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="space-y-6">
          <div className="flex gap-4">
            <Button
              variant={data.is_fast_learner ? "default" : "outline"}
              onClick={() =>
                updateAnswer("q10_fast_learner", {
                  ...data,
                  is_fast_learner: true,
                })
              }
            >
              {t.questions.q10.yes}
            </Button>
            <Button
              variant={!data.is_fast_learner ? "default" : "outline"}
              onClick={() =>
                updateAnswer("q10_fast_learner", { is_fast_learner: false })
              }
            >
              {t.questions.q10.no}
            </Button>
          </div>
          {data.is_fast_learner && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <Label>{t.questions.q10.what_label}</Label>
                <Input
                  value={data.topic || ""}
                  onChange={(e) =>
                    updateAnswer("q10_fast_learner", {
                      ...data,
                      topic: e.target.value,
                    })
                  }
                  placeholder={t.questions.q10.what_placeholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.questions.q10.how_much_label}</Label>
                <div className="flex gap-2">
                  {speedKeys.map((key) => (
                    <div
                      key={key as string}
                      onClick={() =>
                        updateAnswer("q10_fast_learner", {
                          ...data,
                          speed: key,
                        })
                      }
                      className={cn(
                        "px-4 py-2 rounded border cursor-pointer capitalize",
                        data.speed === key
                          ? "bg-blue-600 border-blue-500"
                          : "bg-slate-800 border-slate-700"
                      )}
                    >
                      {t.questions.q10.speed[key]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </QuestionWrapper>
    );
  }

  // Q11: Zone Activity (REMOVED - Duplicate of Q5)
  // if (step === 'q11') { ... }

  if (step === "q12") {
    const ratings = localAnswers.q12_confidence || {
      creative: 3,
      analytical: 3,
      technical: 3,
      people: 3,
      organizational: 3,
      physical: 3,
    };
    const areaKeys = Object.keys(t.questions.q12.areas) as Array<
      keyof typeof t.questions.q12.areas
    >;
    return (
      <QuestionWrapper
        title={t.questions.q12.title}
        subtitle={t.questions.q12.subtitle}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="space-y-4">
          {areaKeys.map((key) => {
            return (
              <div
                key={key as string}
                className="flex items-center justify-between"
              >
                <span className="text-slate-300">
                  {t.questions.q12.areas[key]}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-6 h-6 cursor-pointer",
                        star <= ratings[key]
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-700"
                      )}
                      onClick={() =>
                        updateAnswer("q12_confidence", {
                          ...ratings,
                          [key]: star,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </QuestionWrapper>
    );
  }

  if (step === "q13") {
    return (
      <QuestionWrapper
        title={t.questions.q13.title}
        subtitle={t.questions.q13.subtitle}
        canProceed={!!localAnswers.q13_recognition}
        onBack={onBack}
        onNext={onNext}
        backLabel={t.common.back}
        nextLabel={t.common.next}
      >
        <div className="space-y-4">
          <Textarea
            value={localAnswers.q13_recognition || ""}
            onChange={(e) => updateAnswer("q13_recognition", e.target.value)}
            placeholder={t.questions.q13.placeholder}
            className="min-h-[150px] bg-slate-800 border-slate-700"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="none"
              onCheckedChange={(checked) => {
                if (checked)
                  updateAnswer("q13_recognition", t.questions.q13.none_label);
                else updateAnswer("q13_recognition", "");
              }}
            />
            <Label htmlFor="none" className="text-slate-400">
              {t.questions.q13.none_label}
            </Label>
          </div>
        </div>
      </QuestionWrapper>
    );
  }

  if (step === "ai_intro") {
    return (
      <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
        <div className="text-4xl">🤖</div>
        <h2 className="text-2xl font-bold text-white">{t.ai_intro.title}</h2>
        <p className="text-slate-300 max-w-md mx-auto">
          {t.ai_intro.description}
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
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {t.ai_intro.button} <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return <div>Unknown step</div>;
}
