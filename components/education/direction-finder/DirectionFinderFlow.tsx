import { useState } from 'react';
import { AssessmentAnswers, DirectionFinderResult, AssessmentStep } from '@/types/direction-finder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { CoreAssessment } from './CoreAssessment';
import { AIConversation, Message } from './AIConversation';
import { DirectionResults } from './DirectionResults';

interface DirectionFinderFlowProps {
  onComplete: (result: DirectionFinderResult) => void;
  onCancel: () => void;
}

const STEPS_ORDER: AssessmentStep[] = [
  'intro',
  'q1', 'q2', 'q3', 'q4', 'q5',
  'part2_intro',
  'q6', 'q7', 'q8', 'q9', 'q10', 'q12', 'q13',
  'ai_intro',
  'ai_chat',
  'results'
];

export function DirectionFinderFlow({ onComplete, onCancel }: DirectionFinderFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>({});
  const [result, setResult] = useState<DirectionFinderResult | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[] | undefined>(undefined);

  const currentStep = STEPS_ORDER[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS_ORDER.length) * 100;

  const handleAnswer = (stepAnswers: Partial<AssessmentAnswers>) => {
    setAnswers(prev => ({ ...prev, ...stepAnswers }));
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS_ORDER.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleAIComplete = (finalResult: DirectionFinderResult) => {
    setResult(finalResult);
    setCurrentStepIndex(STEPS_ORDER.indexOf('results'));
    // Do NOT call onComplete here anymore. 
    // Let the user review the results first.
  };

  const handleBackFromResults = () => {
    // Go back to AI chat or AI intro
    const aiChatIndex = STEPS_ORDER.indexOf('ai_chat');
    if (aiChatIndex !== -1) {
      setCurrentStepIndex(aiChatIndex);
    } else {
      handleBack();
    }
  };

  // Render content based on current step
  const renderContent = () => {
    if (currentStep === 'ai_chat') {
      return (
        <AIConversation 
          answers={answers as AssessmentAnswers}
          onComplete={handleAIComplete}
          history={chatHistory}
          onHistoryChange={setChatHistory}
        />
      );
    }

    if (currentStep === 'results' && result) {
      return (
        <DirectionResults 
          result={result} 
          answers={answers as AssessmentAnswers}
          onComplete={() => onComplete(result)}
          onBack={handleBackFromResults}
        />
      );
    }

    return (
      <CoreAssessment 
        step={currentStep}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onBack={handleBack}
      />
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header with Progress */}
      {currentStep !== 'results' && (
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Step {currentStepIndex + 1} of {STEPS_ORDER.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}
