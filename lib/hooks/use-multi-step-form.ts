import { useState } from 'react';

type Step = {
  id: string;
  title: string;
  description?: string;
};

export function useMultiStepForm(steps: Step[]) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  function next() {
    setCurrentStepIndex((i) => {
      if (i >= steps.length - 1) return i;
      return i + 1;
    });
  }

  function back() {
    setCurrentStepIndex((i) => {
      if (i <= 0) return i;
      return i - 1;
    });
  }

  function goToStep(stepIndex: number) {
    setCurrentStepIndex(stepIndex);
  }

  return {
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    steps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    next,
    back,
    goToStep,
  };
}
