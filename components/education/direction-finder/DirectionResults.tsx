import { DirectionFinderResult, AssessmentAnswers } from '@/types/direction-finder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Download, 
  Share2, 
  Sparkles, 
  Heart, 
  Zap, 
  Target,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  ArrowLeft,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { saveDirectionFinderResult } from '@/app/actions/save-direction';

interface DirectionResultsProps {
  result: DirectionFinderResult;
  answers: AssessmentAnswers;
  onComplete: () => void;
  onBack: () => void;
}

export function DirectionResults({ result, answers, onComplete, onBack }: DirectionResultsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);

  // Auto-save on mount
  useEffect(() => {
    const autoSave = async () => {
      if (hasAutoSaved) return;
      
      try {
        await saveDirectionFinderResult(answers, result);
        setHasAutoSaved(true);
        // Optional: toast.success("Profile auto-saved!"); 
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };
    
    autoSave();
  }, [answers, result, hasAutoSaved]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDirectionFinderResult(answers, result);
      toast.success("Profile saved successfully!");
      // Do NOT call onComplete() here. Let user decide when to proceed.
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12 relative">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="absolute top-0 left-0 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      {/* Hero Section with Ikigai Visualization */}
      <div className="text-center space-y-6 relative pt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-4 animate-pulse">
            <Sparkles className="w-10 h-10 text-purple-400" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3">
            Your Direction Profile
          </h2>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Based on your unique interests, strengths, and values—here's your personalized roadmap.
          </p>
        </div>
      </div>

      {/* Ikigai Breakdown - Visual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* What Energizes You */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-2xl p-6 space-y-4 hover:border-blue-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">What You Love</h3>
          </div>
          <div className="space-y-2">
            {result.profile.energizers.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-blue-100 bg-blue-950/30 px-3 py-2 rounded-lg">
                <Heart className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Strengths */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 rounded-2xl p-6 space-y-4 hover:border-green-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center border border-green-500/30">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">Your Strengths</h3>
          </div>
          <div className="space-y-2">
            {result.profile.strengths.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-100 bg-green-950/30 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What You Value */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30 rounded-2xl p-6 space-y-4 hover:border-purple-600/50 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">What You Value</h3>
          </div>
          <div className="space-y-2">
            {result.profile.values.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-purple-100 bg-purple-950/30 px-3 py-2 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Direction Vectors - Recommended Paths */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <h3 className="text-2xl font-bold text-white">Your Top Directions</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        <div className="space-y-4">
          {result.vectors.map((vector, idx) => (
            <div 
              key={idx} 
              className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]"
            >
              {/* Rank Badge */}
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-slate-900">
                {idx + 1}
              </div>

              <div className="space-y-5">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {vector.name}
                    </h4>
                    <p className="text-slate-400 leading-relaxed">
                      Perfect match for your passion in{' '}
                      <span className="text-blue-400 font-medium">{vector.fit_reason.interest_alignment}</span>
                      {' '}and expertise in{' '}
                      <span className="text-green-400 font-medium">{vector.fit_reason.strength_alignment}</span>.
                    </p>
                  </div>
                  {idx === 0 && (
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg">
                      🎯 Best Match
                    </Badge>
                  )}
                </div>

                {/* Exploration Steps */}
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-5 space-y-4">
                  <h5 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    How to Explore This Path
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vector.exploration_steps.map((step, i) => (
                      <div 
                        key={i} 
                        className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg hover:bg-slate-900/80 transition-colors group/step"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30 group-hover/step:bg-blue-600/40 transition-colors">
                          <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* First Step CTA */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center shrink-0 border border-green-500/30">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-400 uppercase tracking-wider">Start Here</p>
                      <p className="text-sm text-slate-300 mt-0.5">{vector.first_step}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={onComplete}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg"
                  >
                    <ArrowRight className="ml-2 w-4 h-4" />
                    Begin Journey
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
        <Button 
          variant="outline" 
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300"
        >
          {isSaving ? <Sparkles className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
          Save Profile
        </Button>
        <Button 
          size="lg"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
        >
          <Share2 className="w-5 h-5" /> Share Results
        </Button>
      </div>
    </div>
  );
}
