/**
 * Step 0: Welcome & Reflection
 */

import React from "react";
import { WizardStepProps } from "./types";
import { translations } from "./translations";

export function WelcomeStep({ language }: WizardStepProps) {
  const t = translations[language];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 rounded-2xl p-10 border-2 border-purple-200 dark:border-purple-800 shadow-xl">
        {/* Animated Stars Background */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="text-9xl animate-pulse">✨</div>
          </div>
          <div className="relative z-10">
            <div className="text-6xl mb-4 animate-bounce">🌟</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
              {t.welcomeTitle}
            </h2>
          </div>
        </div>

        {/* Inspirational Quote */}
        <div className="mb-8 p-6 bg-white/60 dark:bg-black/20 rounded-xl border border-purple-200 dark:border-purple-700">
          <p className="text-xl italic text-center text-purple-900 dark:text-purple-100 mb-2">
            {t.welcomeQuote}
          </p>
          <p className="text-sm text-center text-purple-700 dark:text-purple-300">
            {t.welcomeAuthor}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-8 text-center">
          <p className="text-lg text-purple-800 dark:text-purple-200 leading-relaxed">
            {t.welcomeIntro}
          </p>
        </div>

        {/* Reflection Questions */}
        <div className="space-y-6">
          <p className="text-base font-semibold text-purple-900 dark:text-purple-100 text-center">
            {t.welcomeReflect}
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-100/50 to-pink-100/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="text-2xl mt-1">💭</div>
              <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                {t.welcomePoint1}
              </p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-pink-100/50 to-indigo-100/50 dark:from-pink-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="text-2xl mt-1">🌍</div>
              <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                {t.welcomePoint2}
              </p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="text-2xl mt-1">🎯</div>
              <p className="text-base text-purple-800 dark:text-purple-200 flex-1">
                {t.welcomePoint3}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-8 pt-6 border-t border-purple-200 dark:border-purple-700">
          <p className="text-center text-sm text-purple-700 dark:text-purple-300 italic mb-4">
            {t.welcomeFooter}
          </p>
          <p className="text-center text-base font-medium text-purple-900 dark:text-purple-100">
            {t.welcomeReady}
          </p>
        </div>
      </div>
    </div>
  );
}
