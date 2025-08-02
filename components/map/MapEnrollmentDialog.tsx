"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { enrollUserInMap } from "@/lib/supabase/maps";
import { useToast } from "@/components/ui/use-toast";
import {
  Map,
  Users,
  Star,
  Target,
  Sparkles,
  Crown,
  Compass,
  ArrowRight,
  Loader2,
  Trophy,
  BookOpen,
  Zap,
} from "lucide-react";

interface MapEnrollmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  map: {
    id: string;
    title: string;
    description: string | null;
    node_count: number;
    avg_difficulty: number;
    total_assessments: number;
    total_students?: number;
    category?: string;
  };
  onEnrollmentSuccess: () => void;
}

export function MapEnrollmentDialog({
  isOpen,
  onOpenChange,
  map,
  onEnrollmentSuccess,
}: MapEnrollmentDialogProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<
    "welcome" | "enrolling" | "success"
  >("welcome");
  const router = useRouter();
  const { toast } = useToast();

  const getDifficultyInfo = (difficulty: number) => {
    if (difficulty <= 3)
      return {
        label: "Beginner",
        color: "text-green-400",
        bgColor: "bg-green-900/20",
        borderColor: "border-green-500/50",
        description: "Perfect for newcomers to start their journey",
      };
    if (difficulty <= 6)
      return {
        label: "Intermediate",
        color: "text-yellow-400",
        bgColor: "bg-yellow-900/20",
        borderColor: "border-yellow-500/50",
        description: "Ready for some challenges and growth",
      };
    if (difficulty <= 8)
      return {
        label: "Advanced",
        color: "text-orange-400",
        bgColor: "bg-orange-900/20",
        borderColor: "border-orange-500/50",
        description: "For experienced adventurers seeking mastery",
      };
    return {
      label: "Expert",
      color: "text-red-400",
      bgColor: "bg-red-900/20",
      borderColor: "border-red-500/50",
      description: "The ultimate challenge for true masters",
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

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setEnrollmentStep("enrolling");

    try {
      await enrollUserInMap(map.id);

      // Show success state for a moment
      setEnrollmentStep("success");

      // Wait a bit to show the success animation
      setTimeout(() => {
        onEnrollmentSuccess();
        onOpenChange(false);

        toast({
          title: "🚀 Adventure Begins!",
          description: `Welcome to ${map.title}! Your learning journey starts now.`,
        });

        // Navigate to the map
        router.push(`/map/${map.id}`);
      }, 2000);
    } catch (err) {
      console.error("Enrollment failed:", err);
      setEnrollmentStep("welcome");

      toast({
        title: "Enrollment Failed",
        description:
          err instanceof Error
            ? err.message
            : "Failed to join the learning map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const difficultyInfo = getDifficultyInfo(map.avg_difficulty);
  const categoryIcon = getCategoryIcon(map.category);

  const renderWelcomeContent = () => (
    <>
      <DialogHeader className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-800/50 to-purple-800/50 rounded-full flex items-center justify-center text-4xl border-2 border-blue-600/30 animate-pulse">
          {categoryIcon}
        </div>
        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Ready to Start Your Adventure?
        </DialogTitle>
        <DialogDescription className="text-lg text-gray-300">
          You're about to embark on an exciting learning journey through{" "}
          <span className="font-semibold text-blue-400">{map.title}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Map Preview Card */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="font-semibold text-lg mb-2 text-gray-100">
            {map.title}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {map.description ||
              "Embark on an exciting learning journey through interactive islands"}
          </p>

          {/* Difficulty and Stats */}
          <div className="flex items-center gap-3 mb-4">
            <Badge
              className={`${difficultyInfo.bgColor} ${difficultyInfo.color} ${difficultyInfo.borderColor} border`}
            >
              <Star className="h-3 w-3 mr-1" />
              {difficultyInfo.label}
            </Badge>
            {map.node_count > 10 && (
              <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-500/50 border">
                <Crown className="h-3 w-3 mr-1" />
                Epic Journey
              </Badge>
            )}
          </div>

          <div className="text-sm text-gray-400 mb-4">
            {difficultyInfo.description}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <Map className="h-5 w-5 mx-auto mb-1 text-blue-400" />
              <div className="font-medium text-blue-200">{map.node_count}</div>
              <div className="text-blue-400 text-xs">Islands</div>
            </div>
            <div className="text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-green-400" />
              <div className="font-medium text-green-200">
                {map.total_assessments}
              </div>
              <div className="text-green-400 text-xs">Quests</div>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-purple-400" />
              <div className="font-medium text-purple-200">
                {map.total_students || 0}
              </div>
              <div className="text-purple-400 text-xs">Explorers</div>
            </div>
          </div>
        </div>

        {/* What to expect */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-700/30">
          <h4 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <Compass className="h-4 w-4" />
            What to Expect
          </h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              Interactive learning through gamified islands
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              Hands-on quests and assessments
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              Progress tracking and achievements
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
              Community leaderboards and recognition
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-slate-600 hover:bg-slate-700 text-gray-200"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-900/50"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Adventure
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </>
  );

  const renderEnrollingContent = () => (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center animate-spin">
        <Loader2 className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-100">
          Preparing Your Adventure...
        </h3>
        <p className="text-gray-400">
          Setting up your personalized learning journey
        </p>
      </div>
      <div className="space-y-2">
        <Progress value={75} className="w-full" />
        <p className="text-sm text-gray-500">Initializing learning map...</p>
      </div>
    </div>
  );

  const renderSuccessContent = () => (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
        <Trophy className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-green-400">
          Welcome, Explorer!
        </h3>
        <p className="text-gray-300">
          Your adventure in{" "}
          <span className="font-semibold text-blue-400">{map.title}</span> is
          ready
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Zap className="h-4 w-4 text-yellow-400" />
        Redirecting you to your first island...
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        {enrollmentStep === "welcome" && renderWelcomeContent()}
        {enrollmentStep === "enrolling" && renderEnrollingContent()}
        {enrollmentStep === "success" && renderSuccessContent()}
      </DialogContent>
    </Dialog>
  );
}
