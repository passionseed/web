"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Compass,
  Sparkles,
  Target,
  TrendingUp,
  Lightbulb,
  Heart,
  ArrowRight,
} from "lucide-react";

interface NoNorthStarStateProps {
  onCreateNorthStar: () => void;
}

export function NoNorthStarState({ onCreateNorthStar }: NoNorthStarStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[600px] p-8">
      <Card className="max-w-4xl w-full p-8 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/20 dark:via-background dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Animated Star Icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="w-24 h-24 text-amber-400 opacity-20" />
            </div>
            <div className="relative">
              <Sparkles className="w-24 h-24 text-amber-500 animate-pulse" />
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Set Your North Star
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Your guiding light for life's journey
            </p>
          </div>

          {/* What is a North Star? */}
          <div className="bg-white/50 dark:bg-background/50 rounded-lg p-6 max-w-2xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3 mb-4">
              <Compass className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <h3 className="text-lg font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  What is a North Star?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Just like sailors used the North Star to navigate, your{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    North Star
                  </span>{" "}
                  is your ultimate direction in life — a big dream or purpose that
                  guides all your decisions and projects. It's the{" "}
                  <span className="font-semibold">most important goal</span> that
                  gives meaning to everything else you do.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
            <BenefitCard
              icon={<Target className="w-5 h-5" />}
              title="Clarity"
              description="Know exactly where you're heading"
            />
            <BenefitCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Motivation"
              description="Stay inspired during tough times"
            />
            <BenefitCard
              icon={<Lightbulb className="w-5 h-5" />}
              title="Decision-making"
              description="Choose projects that align with your purpose"
            />
          </div>

          {/* Examples */}
          <div className="bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-6 max-w-2xl border border-amber-200 dark:border-amber-700">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  Examples of North Stars:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    💻 "Become a software engineer solving climate change"
                  </li>
                  <li>🏥 "Work in healthcare to improve rural communities"</li>
                  <li>🎓 "Build educational programs for underprivileged youth"</li>
                  <li>🌍 "Create sustainable businesses for social impact"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4">
            <Button
              onClick={onCreateNorthStar}
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
              Create Your North Star
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              It takes just 2 minutes to define your purpose
            </p>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-amber-200 dark:border-amber-800 w-full max-w-2xl">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-semibold">Pro tip:</span> You can create
              multiple North Stars if you have different life goals. All your
              projects and milestones can connect to them.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/80 dark:bg-background/80 rounded-lg p-4 border border-amber-100 dark:border-amber-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="text-amber-600 dark:text-amber-400">{icon}</div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
