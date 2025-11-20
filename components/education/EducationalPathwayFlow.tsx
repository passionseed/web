"use client";

import { useState, useEffect } from 'react';
import { University, SimpleRoadmap, EducationalFlowData } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

import { UniversityPicker } from './UniversityPicker';
import { InterestPriorityList } from './InterestPriorityList';
import { RoadmapDisplay } from './RoadmapDisplay';

interface EducationalPathwayFlowProps {
  vision: string;
  universities: University[];
  onComplete: (data: EducationalFlowData & { roadmap: SimpleRoadmap }) => void;
  onCancel: () => void;
}

type FlowStep = 'universities' | 'interests' | 'roadmap' | 'complete';

interface InterestItem {
  id: string;
  name: string;
  priority: number;
}

export function EducationalPathwayFlow({
  vision,
  universities,
  onComplete,
  onCancel
}: EducationalPathwayFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('universities');
  const [selectedUniversities, setSelectedUniversities] = useState<University[]>([]);
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<SimpleRoadmap | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 'universities', title: 'Choose Universities', description: 'Select your top 3 university choices' },
    { id: 'interests', title: 'Set Priorities', description: 'Add and prioritize your interests' },
    { id: 'roadmap', title: 'Your Roadmap', description: 'AI-generated path to your goals' },
    { id: 'complete', title: 'Complete', description: 'Finalize your educational pathway' }
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const progress = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const canProceedFromUniversities = selectedUniversities.length === 3;
  const canProceedFromInterests = interests.length > 0;

  const handleNext = async () => {
    if (currentStep === 'universities' && canProceedFromUniversities) {
      setCurrentStep('interests');
    } else if (currentStep === 'interests' && canProceedFromInterests) {
      await generateRoadmap();
    } else if (currentStep === 'roadmap') {
      const flowData: EducationalFlowData & { roadmap: SimpleRoadmap } = {
        vision,
        selectedUniversities,
        interests: interests.map(i => i.name),
        roadmap: generatedRoadmap!
      };
      onComplete(flowData);
    }
  };

  const handleBack = () => {
    if (currentStep === 'universities') {
      // Go back to edit vision statement
      onCancel();
    } else if (currentStep === 'interests') {
      setCurrentStep('universities');
    } else if (currentStep === 'roadmap') {
      setCurrentStep('interests');
    }
  };

  const generateRoadmap = async () => {
    if (interests.length === 0 || selectedUniversities.length === 0) return;

    setIsGeneratingRoadmap(true);
    setError(null);

    try {
      const response = await fetch('/api/education/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vision_statement: vision,
          top_university: selectedUniversities[0], // First choice university
          primary_interest: interests[0]?.name,
          secondary_interests: interests.slice(1).map(i => i.name)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate roadmap');
      }

      const data = await response.json();
      setGeneratedRoadmap(data.roadmap);
      setCurrentStep('roadmap');
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setError('Failed to generate roadmap. Please try again.');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleRegenerateRoadmap = () => {
    generateRoadmap();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-white">
                Educational Pathway Setup
              </CardTitle>
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
            
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Step {getCurrentStepIndex() + 1} of {steps.length}</span>
                <span className="text-slate-400">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Step titles */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`text-center p-2 rounded ${
                      getCurrentStepIndex() >= index
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="text-xs font-medium">{step.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vision reminder */}
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <p className="text-sm text-slate-300">
                <strong>Your Vision:</strong> "{vision}"
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 'universities' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Choose Your Top 3 Universities</CardTitle>
              <p className="text-slate-400 text-sm">
                Select exactly 3 universities you'd like to attend, in order of preference.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <UniversityPicker
                universities={universities}
                selectedUniversities={selectedUniversities}
                onSelectionChange={setSelectedUniversities}
                maxSelections={3}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 'interests' && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Set Your Interest Priorities</CardTitle>
              <p className="text-slate-400 text-sm">
                Add your interests and arrange them by priority. Your top interest will be the focus of your roadmap.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <InterestPriorityList
                interests={interests}
                onUpdate={setInterests}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 'roadmap' && (
          <div className="space-y-6">
            {isGeneratingRoadmap ? (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Generating Your Roadmap
                    </h3>
                    <p className="text-slate-400">
                      Creating a personalized 3-year plan based on your goals...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : generatedRoadmap ? (
              <RoadmapDisplay
                roadmap={generatedRoadmap}
                onRegenerateRoadmap={handleRegenerateRoadmap}
              />
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="text-center py-12">
                  <p className="text-slate-400 mb-4">
                    Failed to generate roadmap. Please try again.
                  </p>
                  <Button onClick={generateRoadmap}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isGeneratingRoadmap}
              className="border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 'universities' ? 'Edit Vision' : 'Back'}
            </Button>

            <div className="text-center">
              {getCurrentStepIndex() < steps.length - 1 && (
                <p className="text-sm text-slate-400">
                  {steps[getCurrentStepIndex()]?.description}
                </p>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 'universities' && !canProceedFromUniversities) ||
                (currentStep === 'interests' && !canProceedFromInterests) ||
                isGeneratingRoadmap ||
                (currentStep === 'roadmap' && !generatedRoadmap)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentStep === 'roadmap' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}