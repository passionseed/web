"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserDirectionFinderResult } from "@/app/actions/save-direction";
import {
  DirectionFinderResult,
  AssessmentAnswers,
} from "@/types/direction-finder";

interface DirectionFinderContextType {
  hasResult: boolean;
  result: DirectionFinderResult | null;
  answers: AssessmentAnswers | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const DirectionFinderContext = createContext<DirectionFinderContextType>({
  hasResult: false,
  result: null,
  answers: null,
  isLoading: true,
  refresh: async () => {},
});

export function DirectionFinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [result, setResult] = useState<DirectionFinderResult | null>(null);
  const [answers, setAnswers] = useState<AssessmentAnswers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResult = async () => {
    try {
      setIsLoading(true);
      const data = await getUserDirectionFinderResult();
      if (data) {
        setResult(data.result);
        setAnswers(data.answers);
      } else {
        setResult(null);
        setAnswers(null);
      }
    } catch (error) {
      console.error("Failed to fetch direction finder result", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, []);

  return (
    <DirectionFinderContext.Provider
      value={{
        hasResult: !!result,
        result,
        answers,
        isLoading,
        refresh: fetchResult,
      }}
    >
      {children}
    </DirectionFinderContext.Provider>
  );
}

export const useDirectionFinder = () => useContext(DirectionFinderContext);
