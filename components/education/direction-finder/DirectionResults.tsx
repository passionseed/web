import { DirectionFinderResult, AssessmentAnswers } from '@/types/direction-finder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Share2, 
  Sparkles, 
  Heart, 
  Zap, 
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowLeft,
  Save,
  Plus,
  Map as MapIcon,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { saveDirectionFinderResult } from '@/app/actions/save-direction';
import { toPng } from 'html-to-image';
import { Message } from '@/types/direction-finder';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { AIConversation } from './AIConversation';

interface DirectionResultsProps {
  result: DirectionFinderResult;
  answers: AssessmentAnswers;
  onComplete: () => void;
  onBack: () => void;
  chatHistory?: Message[];
  model?: string;
}

export function DirectionResults({ result: initialResult, answers, onComplete, onBack, chatHistory: initialHistory, model }: DirectionResultsProps) {
  const [result, setResult] = useState(initialResult);
  const [history, setHistory] = useState<Message[] | undefined>(initialHistory);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-save on mount
  useEffect(() => {
    const autoSave = async () => {
      if (hasAutoSaved) return;
      
      try {
        await saveDirectionFinderResult(answers, result, history);
        setHasAutoSaved(true);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };
    
    autoSave();
  }, [answers, result, hasAutoSaved, history]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDirectionFinderResult(answers, result, history);
      toast.success("Profile saved successfully!");
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!resultsRef.current) return;
    
    setIsSharing(true);
    try {
      // Generate image
      const dataUrl = await toPng(resultsRef.current, { 
        cacheBust: true,
        backgroundColor: '#020617', // slate-950
        filter: (node) => {
          // Exclude elements with data-hide-on-share attribute
          if (node instanceof HTMLElement && node.getAttribute('data-hide-on-share') === 'true') {
            return false;
          }
          return true;
        },
        style: {
          padding: '40px', // Add some padding to the image
        }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'direction-profile.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'My Direction Profile',
            text: 'Check out my direction profile!',
            files: [file],
          });
          toast.success("Shared successfully!");
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Error sharing:', shareError);
            downloadImage(dataUrl);
            toast.success("Image saved to device!");
          }
        }
      } else {
        downloadImage(dataUrl);
        toast.success("Image saved to device!");
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error("Failed to generate image");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = 'direction-profile.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div ref={resultsRef} className="space-y-12 max-w-7xl mx-auto pb-12 relative">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="absolute top-0 left-0 z-10 text-slate-400 hover:text-white"
        data-hide-on-share="true"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      {/* Refine Button */}
      <div className="absolute top-0 right-0 z-10" data-hide-on-share="true">
           <Dialog open={isRefining} onOpenChange={setIsRefining}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-300">
                <MessageSquare className="w-4 h-4" /> Refine with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] p-0 bg-slate-950 border-slate-800 flex flex-col overflow-hidden">
               <DialogTitle className="sr-only">Refine Direction with AI</DialogTitle>
              <AIConversation
                answers={answers}
                history={history}
                onHistoryChange={setHistory}
                onComplete={(newResult) => {
                  setResult(newResult);
                  setIsRefining(false);
                  toast.success("Profile updated!");
                }}
                onBack={() => setIsRefining(false)}
                model={model}
                className="h-full border-0"
              />
            </DialogContent>
          </Dialog>
      </div>

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
          <h3 className="text-2xl font-bold text-white">Your Top 3 Directions</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {result.vectors.map((vector, idx) => (
            <div 
              key={idx} 
              className={`group relative flex flex-col border rounded-2xl p-5 transition-all hover:shadow-lg ${
                idx === 0 
                  ? 'bg-gradient-to-br from-purple-900/30 to-blue-900/20 border-purple-500/50 ring-2 ring-purple-500/20' 
                  : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {/* Rank Badge */}
              <div className={`absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg border-2 border-slate-900 ${
                idx === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-slate-700'
              }`}>
                {idx + 1}
              </div>

              <div className="space-y-4 flex-1 pt-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {vector.name}
                  </h4>
                  {idx === 0 && (
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-2 py-0.5 text-xs font-semibold">
                      Best Match
                    </Badge>
                  )}
                </div>

                {/* Match Scores */}
                <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-pink-300 font-medium"><Heart className="w-3 h-3 fill-pink-500/20" /> Passion Match</span>
                      <span className="text-white font-bold">{vector.match_scores?.passion || 92}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-600 to-rose-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${vector.match_scores?.passion || 92}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1">{vector.fit_reason.interest_alignment}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-300 font-medium"><Zap className="w-3 h-3 fill-emerald-500/20" /> Skill Match</span>
                      <span className="text-white font-bold">{vector.match_scores?.skill || 88}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${vector.match_scores?.skill || 88}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1">{vector.fit_reason.strength_alignment}</p>
                  </div>
                </div>
                
                {/* Suggested Milestones (formerly Exploration Steps) */}
                <div className="pt-2">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MapIcon className="w-3 h-3 text-purple-400" /> Suggested Projects
                  </h5>
                  <div className="relative pl-4 space-y-4 border-l border-slate-800 ml-1.5 space-y-4">
                    {vector.exploration_steps.map((step, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-purple-500/50 group-hover:border-purple-500 transition-colors" />
                        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                          <p className="text-xs text-slate-200 leading-relaxed font-medium">{step.description}</p>
                        </div>
                      </div>
                    ))}
                    {/* Visual cue for user to add to their plan */}
                    <div className="relative opacity-50 group-hover:opacity-100 transition-opacity">
                      <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-dashed border-slate-600" />
                      <button 
                         onClick={onComplete}
                         className="w-full text-left bg-transparent border border-dashed border-slate-700 p-2 rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/30 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add to my roadmap...
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* First Step */}
              <div className="mt-4 pt-3 border-t border-slate-800/50 text-xs">
                <p className="font-medium text-green-400 mb-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Start Here:</p>
                <p className="text-slate-300 leading-relaxed">{vector.first_step}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Journey Map CTA */}
      <div className="text-center space-y-4 p-8 bg-gradient-to-br from-purple-900/20 via-slate-900 to-blue-900/20 border border-purple-500/20 rounded-3xl">
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
        <h3 className="text-2xl font-bold text-white">Ready to Start Your Journey?</h3>
        <p className="text-slate-400 max-w-lg mx-auto">
          Your personalized Journey Map is waiting. It will guide you step-by-step towards your North Star.
        </p>
        <Button 
          size="lg"
          onClick={onComplete}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 text-lg px-8 py-6"
        >
          Go to My Journey Map <ArrowRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8" data-hide-on-share="true">
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
          onClick={handleShare}
          disabled={isSharing}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
        >
          {isSharing ? <Sparkles className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />} 
          Share Results
        </Button>
      </div>
    </div>
  );
}
