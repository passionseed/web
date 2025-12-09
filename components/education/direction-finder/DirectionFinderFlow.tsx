import { useState, useEffect } from 'react';
import { AssessmentAnswers, DirectionFinderResult, AssessmentStep, Message } from '@/types/direction-finder';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CoreAssessment } from './CoreAssessment';
import { AIConversation } from './AIConversation';
import { DirectionResults } from './DirectionResults';
import { getDirectionFinderResults, getDirectionFinderResultById } from '@/app/actions/save-direction';
import { Database, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [isLoaded, setIsLoaded] = useState(false);
  
  // DEV: Saved sessions state
  const [devSessions, setDevSessions] = useState<{ id: string; user_id: string; created_at: string }[]>([]);
  const [loadingDevSession, setLoadingDevSession] = useState(false);
  const [model, setModel] = useState<string | undefined>(undefined);

  // DEV: Load sessions list on mount (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      getDirectionFinderResults(10).then(setDevSessions).catch(console.error);
    }
  }, []);

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('direction_finder_progress');
    if (saved) {
      try {
        const { step, answers: savedAnswers, history } = JSON.parse(saved);
        if (step !== undefined) setCurrentStepIndex(step);
        if (savedAnswers) setAnswers(savedAnswers);
        if (history) setChatHistory(history);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save progress on change
  useEffect(() => {
    if (!isLoaded) return;
    
    // Don't save if we are on the results page (completed)
    // But do save if we are in chat or any other step
    if (result) return; 

    // Don't save if we are on the very first intro step and haven't done anything
    if (currentStepIndex === 0 && Object.keys(answers).length === 0) return;

    localStorage.setItem('direction_finder_progress', JSON.stringify({
      step: currentStepIndex,
      answers,
      history: chatHistory
    }));
  }, [currentStepIndex, answers, chatHistory, isLoaded, result]);

  // Clear progress on completion or explicit cancel (optional, typically we keep it until finished)
  const clearProgress = () => {
      localStorage.removeItem('direction_finder_progress');
  };

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
    clearProgress();
    setResult(finalResult);
    setCurrentStepIndex(STEPS_ORDER.indexOf('results'));
    // Do NOT call onComplete here anymore. 
    // Let the user review the results first.
  };

  const handleBackFromResults = () => {
    console.log("handleBackFromResults called. chatHistory:", chatHistory?.length);
    // If we have chat history, go back to AI chat
    if (chatHistory && chatHistory.length > 0) {
      const aiChatIndex = STEPS_ORDER.indexOf('ai_chat');
      console.log("Going to ai_chat at index:", aiChatIndex);
      if (aiChatIndex !== -1) {
        setCurrentStepIndex(aiChatIndex);
        return;
      }
    }
    // No chat history available (e.g., loaded from DB)
    // Go to the last answered questionnaire step, or ai_intro if we have answers
    if (Object.keys(answers).length > 0) {
      // User has answers, go to ai_intro so they can start the AI chat
      const aiIntroIndex = STEPS_ORDER.indexOf('ai_intro');
      console.log("Has answers, going to ai_intro at index:", aiIntroIndex);
      if (aiIntroIndex !== -1) {
        setCurrentStepIndex(aiIntroIndex);
        return;
      }
    }
    // Fallback: just go back one step
    handleBack();
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
          onBack={handleBack}
          model={model}
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
          chatHistory={chatHistory}
          model={model}
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

      {/* DEV: Load Saved Session */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex gap-2 mb-4">
          <details className="flex-1 text-xs bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
            <summary className="cursor-pointer text-yellow-400 font-bold flex items-center gap-2">
              <Database className="w-3 h-3" /> DEV: Load Saved Session
            </summary>
            {/* ... keeping existing content ... */}
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {devSessions.length === 0 && <p className="text-slate-500">No saved sessions found.</p>}
              {devSessions.map(s => (
                <button
                  key={s.id}
                  onClick={async () => {
                    setLoadingDevSession(true);
                    try {
                      const full = await getDirectionFinderResultById(s.id);
                      setAnswers(full.answers);
                      setResult(full.result);
                      setCurrentStepIndex(STEPS_ORDER.indexOf('results'));
                    } catch (e) {
                      console.error('Failed to load session', e);
                    }
                    setLoadingDevSession(false);
                  }}
                  disabled={loadingDevSession}
                  className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                >
                  <span className="text-white">{s.id.slice(0, 8)}...</span>
                  <span className="text-slate-500 ml-2">({s.user_id.slice(0, 8)}...)</span>
                  <span className="text-slate-600 ml-2">{new Date(s.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </details>
          
          <div className="w-[200px]">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-full bg-slate-900 border-slate-700 text-xs">
                <Settings className="w-3 h-3 mr-2 text-slate-400" />
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Default)</SelectItem>
                <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                <SelectItem value="deepseek-v3">DeepSeek V3</SelectItem>
                <SelectItem value="deepseek/deepseek-r1">DeepSeek R1 (Reasoner)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}
