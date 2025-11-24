"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Map, Target, Rocket } from "lucide-react";

interface JourneyMapOnboardingProps {
  onComplete: () => void;
}

export function JourneyMapOnboarding({ onComplete }: JourneyMapOnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      id: "vibe-check",
      icon: <Sparkles className="w-12 h-12 text-yellow-400" />,
      title: "The Vibe Check",
      description: "Your life isn't a to-do list. It's an open-world RPG.",
      content: (
        <div className="space-y-4 text-center">
          <p className="text-lg text-slate-300">
            Forget boring planners. This is your canvas to design the future you actually want.
          </p>
        </div>
      ),
    },
    {
      id: "mechanics",
      icon: <Map className="w-12 h-12 text-blue-400" />,
      title: "The Mechanics",
      description: "How to play the game of life.",
      content: (
        <div className="space-y-6 text-left bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-500/20 rounded-lg mt-1">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-amber-400">Set Your North Star</h4>
              <p className="text-sm text-slate-400">The big dream. The main quest. Where you're headed.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg mt-1">
              <Map className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-blue-400">Map Your Quests</h4>
              <p className="text-sm text-slate-400">Break it down into projects. These are your side quests and XP grinds.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "launch",
      icon: <Rocket className="w-12 h-12 text-purple-400" />,
      title: "Ready to Launch?",
      description: "Your map is empty. That's a good thing.",
      content: (
        <div className="space-y-4 text-center">
          <p className="text-lg text-slate-300">
            It means anything is possible. Let's set your first coordinate.
          </p>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {/* Icon */}
            <div className="mb-8 p-6 bg-slate-900/50 rounded-full border border-slate-800 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
              {steps[step].icon}
            </div>

            {/* Text Content */}
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-center bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
              {steps[step].title}
            </h2>
            <p className="text-xl text-slate-400 mb-12 text-center max-w-lg font-medium">
              {steps[step].description}
            </p>

            {/* Dynamic Content */}
            <div className="w-full mb-12 min-h-[120px] flex items-center justify-center">
              {steps[step].content}
            </div>

            {/* Action Button */}
            <Button
              size="lg"
              onClick={handleNext}
              className="group relative px-8 py-6 text-lg font-bold bg-white text-slate-950 hover:bg-slate-200 transition-all duration-300 rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:scale-105"
            >
              {step === steps.length - 1 ? "Start Your Journey" : "Next"}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Progress Indicators */}
            <div className="flex gap-3 mt-12">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === step ? "w-8 bg-white" : "w-2 bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
