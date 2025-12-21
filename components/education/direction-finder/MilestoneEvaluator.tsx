import { useState, useEffect } from "react";
import { DirectionVector, MilestoneEvaluation } from "@/types/direction-finder";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MilestoneEvaluatorProps {
  vector: DirectionVector;
  onComplete: (evaluations: MilestoneEvaluation[]) => void;
  onBack: () => void;
}

export function MilestoneEvaluator({
  vector,
  onComplete,
  onBack,
}: MilestoneEvaluatorProps) {
  // Initialize evaluations state
  const [evaluations, setEvaluations] = useState<MilestoneEvaluation[]>([]);

  // Initialize once on mount
  useEffect(() => {
    if (evaluations.length === 0 && vector.exploration_steps) {
      setEvaluations(
        vector.exploration_steps.map((step, index) => ({
          stepIndex: index,
          originalDescription: step.description,
          description: step.description,
          theoryScore: 85 + ((index * 3) % 13), // Pseudo-random high score
          practiceScore: 0,
          obstacle: "",
          plan: "",
        }))
      );
    }
  }, [vector, evaluations.length]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleUpdateEvaluation = (
    index: number,
    field: keyof MilestoneEvaluation,
    value: any
  ) => {
    const newEvaluations = [...evaluations];
    newEvaluations[index] = { ...newEvaluations[index], [field]: value };
    setEvaluations(newEvaluations);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(evaluations[index].description || "");
  };

  const handleSaveEdit = (index: number) => {
    handleUpdateEvaluation(index, "description", editValue);
    setEditingIndex(null);
  };

  const handleAddStep = () => {
    const newStep: MilestoneEvaluation = {
      stepIndex: evaluations.length,
      description: "New Milestone",
      originalDescription: "New Milestone",
      theoryScore: 90,
      practiceScore: 0,
      obstacle: "",
      plan: "",
    };
    setEvaluations([...evaluations, newStep]);
    // Automatically start editing the new step
    setEditingIndex(evaluations.length);
    setEditValue("New Milestone");
  };

  const handleDeleteStep = (index: number) => {
    if (confirm("Are you sure you want to delete this step?")) {
      const newEvaluations = evaluations
        .filter((_, i) => i !== index)
        .map((ev, i) => ({
          ...ev,
          stepIndex: i, // Re-index
        }));
      setEvaluations(newEvaluations);
    }
  };

  const handleFinish = () => {
    onComplete(evaluations);
  };

  // Check if ready: require at least one step and ALL steps must have passing practice score
  const isReady =
    evaluations.length > 0 && evaluations.every((ev) => ev.practiceScore >= 80);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Interactive Planner</h2>
          <p className="text-slate-400 max-w-xl">
            Review the suggested path. You can <strong>edit</strong> any step,
            add your own, and create a plan for obstacles. This is YOUR journey.
          </p>
        </div>
        <Button
          onClick={handleAddStep}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Step
        </Button>
      </div>

      <div className="space-y-8">
        {evaluations.map((ev, index) => {
          // Identify if this was an original step type or a custom added one
          const originalStep = vector.exploration_steps[index];
          const type = originalStep ? originalStep.type : "custom";

          const isPassing = ev.practiceScore >= 80;

          return (
            <Card
              key={index}
              className={`bg-slate-900/50 border-slate-700 relative group transition-all hover:border-slate-600 ${isPassing ? "border-l-4 border-l-green-500" : "border-l-4 border-l-yellow-500"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-blue-400 border-blue-400 capitalize bg-blue-950/30"
                      >
                        {type}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono">
                        STEP {index + 1}
                      </span>
                    </div>

                    {editingIndex === index ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-slate-950 text-white border-blue-500 focus-visible:ring-blue-500 font-medium text-lg h-10"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(index)}
                          className="bg-green-600 hover:bg-green-700 h-10 px-4"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingIndex(null)}
                          className="h-10 w-10 p-0 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 group/title">
                        <CardTitle className="text-xl text-white font-bold leading-tight">
                          {ev.description}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(index)}
                          className="opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-white p-0 h-6 w-6 transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteStep(index)}
                    className="text-slate-600 hover:text-red-400 hover:bg-red-950/30 -mt-1 -mr-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {/* Top Row: Scores */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                  <div className="md:col-span-4 space-y-2 border-r border-slate-800/50 pr-6 mr-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        AI Impact Score
                      </span>
                      <span className="text-green-400 font-bold">
                        {ev.theoryScore}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${ev.theoryScore}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Estimated impact on your goal achievement.
                    </p>
                  </div>

                  <div className="md:col-span-8 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-sm font-medium">
                        Feasibility Check
                      </span>
                      <span
                        className={`${ev.practiceScore >= 80 ? "text-green-400" : "text-yellow-400"} font-bold`}
                      >
                        {ev.practiceScore}%
                      </span>
                    </div>
                    <Slider
                      value={[ev.practiceScore]}
                      onValueChange={(vals) =>
                        handleUpdateEvaluation(index, "practiceScore", vals[0])
                      }
                      max={100}
                      step={5}
                      className="py-1 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      {ev.practiceScore < 80
                        ? "Slide right as you solve obstacles below →"
                        : "Great! You are ready for this step."}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Planning */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500/80" />{" "}
                      Potential Obstacles
                    </label>
                    <Textarea
                      placeholder="What could go wrong? (e.g. Lack of funds, No time)"
                      value={ev.obstacle}
                      onChange={(e) =>
                        handleUpdateEvaluation(
                          index,
                          "obstacle",
                          e.target.value
                        )
                      }
                      className="bg-slate-800/50 border-slate-700 min-h-[80px] text-sm focus-visible:ring-yellow-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-500/80" />{" "}
                      Your Solution
                    </label>
                    <Textarea
                      placeholder="How will you overcome it? (e.g. Apply for grant, Wake up earlier)"
                      value={ev.plan}
                      onChange={(e) =>
                        handleUpdateEvaluation(index, "plan", e.target.value)
                      }
                      className="bg-slate-800/50 border-slate-700 min-h-[80px] text-sm focus-visible:ring-blue-500/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {evaluations.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <p className="text-slate-500 mb-4">No steps in this plan yet.</p>
            <Button
              onClick={handleAddStep}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              Start Planning
            </Button>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-20 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-2 rounded-2xl shadow-2xl flex flex-col items-center gap-3 pointer-events-auto">
          {!isReady && evaluations.length > 0 && (
            <div className="text-center">
              <p className="text-yellow-400 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> All steps must have ≥80%
                feasibility to proceed
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleAddStep}
              className="text-slate-300 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Step
            </Button>
            <div className="w-px bg-slate-800 my-1"></div>
            <Button
              onClick={handleFinish}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white min-w-[200px] shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isReady}
            >
              Confirm Roadmap <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
