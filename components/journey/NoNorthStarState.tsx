"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight, Compass, Star } from "lucide-react";

interface NoNorthStarStateProps {
  onCreateNorthStar: () => void;
}

export function NoNorthStarState({ onCreateNorthStar }: NoNorthStarStateProps) {
  return (
    <div className="h-full w-full flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="w-full text-center space-y-8">
        
        {/* Hero Icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 p-6 rounded-full border-2 border-amber-200 dark:border-amber-700 shadow-xl">
            <Compass className="w-full h-full text-amber-600 dark:text-amber-400" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-bounce" />
          </div>
        </div>

        {/* Main Text */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 dark:from-amber-400 dark:via-orange-400 dark:to-amber-400 bg-clip-text text-transparent bg-300% animate-gradient">
            Find Your North Star
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Stop wandering. Start moving with purpose. <br/>
            Define your ultimate goal and let it guide your journey.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            onClick={onCreateNorthStar}
            size="lg"
            className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create North Star
          </Button>
          
          <Button
            onClick={onCreateNorthStar}
            variant="outline"
            size="lg"
            className="h-14 px-8 text-lg rounded-full border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
          >
            I'm not sure yet...
          </Button>
        </div>

        {/* Footer Info */}
        <div className="pt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Star className="w-4 h-4" />
            </div>
            <span>Clarity</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Compass className="w-4 h-4" />
            </div>
            <span>Direction</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Purpose</span>
          </div>
        </div>
      </div>
    </div>
  );
}
