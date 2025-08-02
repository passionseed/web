"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LearningMap } from "@/types/map";
import {
  Map,
  Users,
  Star,
  Target,
  Sparkles,
  ArrowRight,
  Flag,
  Navigation,
  Zap,
} from "lucide-react";

interface MapWelcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  map: LearningMap & {
    node_count?: number;
    avg_difficulty?: number;
    total_assessments?: number;
  };
}

export function MapWelcomeDialog({
  isOpen,
  onOpenChange,
  map,
}: MapWelcomeDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const getDifficultyInfo = (difficulty: number = 5) => {
    if (difficulty <= 3)
      return {
        label: "Beginner",
        color: "text-green-400",
        bgColor: "bg-green-900/20",
        borderColor: "border-green-500/50",
      };
    if (difficulty <= 6)
      return {
        label: "Intermediate",
        color: "text-yellow-400",
        bgColor: "bg-yellow-900/20",
        borderColor: "border-yellow-500/50",
      };
    if (difficulty <= 8)
      return {
        label: "Advanced",
        color: "text-orange-400",
        bgColor: "bg-orange-900/20",
        borderColor: "border-orange-500/50",
      };
    return {
      label: "Expert",
      color: "text-red-400",
      bgColor: "bg-red-900/20",
      borderColor: "border-red-500/50",
    };
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "ai":
        return "🤖";
      case "3d":
        return "🎮";
      case "unity":
        return "🕹️";
      case "hacking":
        return "🔐";
      default:
        return "🗺️";
    }
  };

  const steps = [
    {
      title: "Welcome to Your Adventure!",
      icon: "🚀",
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-800/50 to-purple-800/50 rounded-full flex items-center justify-center text-4xl border-2 border-blue-600/30 animate-pulse">
            {getCategoryIcon(map.category)}
          </div>
          <h3 className="text-xl font-semibold text-gray-100">
            You've successfully joined{" "}
            <span className="text-blue-400">{map.title}</span>!
          </h3>
          <p className="text-gray-400">
            {map.description ||
              "Get ready for an exciting learning journey through interactive islands and challenges."}
          </p>
          <div className="flex justify-center">
            <Badge
              className={`${getDifficultyInfo(map.avg_difficulty).bgColor} ${getDifficultyInfo(map.avg_difficulty).color} ${getDifficultyInfo(map.avg_difficulty).borderColor} border`}
            >
              <Star className="h-3 w-3 mr-1" />
              {getDifficultyInfo(map.avg_difficulty).label} Level
            </Badge>
          </div>
        </div>
      ),
    },
    {
      title: "How It Works",
      icon: "🎯",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                <Map className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-200">Explore Islands</h4>
                <p className="text-sm text-gray-400">
                  Navigate through {map.node_count || "multiple"} interactive
                  learning islands
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-200">Complete Quests</h4>
                <p className="text-sm text-gray-400">
                  Take on {map.total_assessments || "engaging"} challenges and
                  assessments
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-200">
                  Join the Community
                </h4>
                <p className="text-sm text-gray-400">
                  Connect with fellow explorers and compete on leaderboards
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Ready to Begin?",
      icon: "⚡",
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-full flex items-center justify-center animate-bounce">
            <Flag className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-100">
            Your Journey Awaits!
          </h3>
          <p className="text-gray-400">
            You're all set to begin your adventure. Navigate to your first
            island and start learning!
          </p>
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-700/30">
            <div className="flex items-center gap-2 text-sm text-blue-300 mb-2">
              <Navigation className="h-4 w-4" />
              <span className="font-medium">Pro Tip</span>
            </div>
            <p className="text-sm text-gray-300">
              Look for unlocked islands (they glow and have no lock icon).
              Complete them to unlock new paths and progress through your
              learning journey!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="text-center space-y-4">
          <div className="text-4xl">{currentStepData.icon}</div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {currentStepData.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {currentStepData.content}

          {/* Progress indicators */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-500"
                    : index < currentStep
                      ? "bg-blue-400/50"
                      : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 border-slate-600 hover:bg-slate-700 text-gray-200"
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-900/50"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Learning!
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
