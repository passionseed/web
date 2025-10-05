"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Heart, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { saveMindmapReflection, MindmapReflectionData } from "@/lib/supabase/mindmap-reflections";
import { useToast } from "@/components/ui/use-toast";

interface Topic {
  id: string;
  text: string;
  x: number;
  y: number;
  notes?: string;
}

interface FeelingRating {
  satisfaction: number;
  progress: number;
  challenge: number;
}

interface ReflectionAnswers {
  overallWhy: string;
}

export default function MindmapSummaryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ratings, setRatings] = useState<FeelingRating>({ satisfaction: 0, progress: 0, challenge: 0 });
  const [reflectionAnswers, setReflectionAnswers] = useState<ReflectionAnswers>({ overallWhy: "" });
  const [currentDate, setCurrentDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFirstView, setIsFirstView] = useState(true);

  useEffect(() => {
    // Get topics from session storage
    const storedTopics = sessionStorage.getItem('mindmap-topics');
    if (storedTopics) {
      setTopics(JSON.parse(storedTopics));
    }

    // Get ratings from session storage
    const storedRatings = sessionStorage.getItem('mindmap-ratings');
    if (storedRatings) {
      setRatings(JSON.parse(storedRatings));
    }

    // Get reflection answers from session storage
    const storedReflection = sessionStorage.getItem('mindmap-reflection');
    if (storedReflection) {
      setReflectionAnswers(JSON.parse(storedReflection));
    }

    // Set current date
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));

    // Remove first view flag after the glow effect
    const timer = setTimeout(() => {
      setIsFirstView(false);
    }, 3000); // 3 seconds of glow effect

    return () => clearTimeout(timer);
  }, []);

  const topicsWithNotes = topics.filter(topic => topic.notes && topic.notes.trim());
  const topicsWithoutNotes = topics.filter(topic => !topic.notes || !topic.notes.trim());

  const handleFinish = async () => {
    if (!reflectionAnswers.overallWhy.trim()) {
      toast({
        title: "Missing reflection",
        description: "Please complete your reflection before finishing.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const reflectionData: MindmapReflectionData = {
        topics: topics,
        satisfaction: ratings.satisfaction,
        progress: ratings.progress,
        challenge: ratings.challenge,
        overallReflection: reflectionAnswers.overallWhy
      };

      await saveMindmapReflection(reflectionData);
      
      // Clear session storage after successful save
      sessionStorage.removeItem('mindmap-topics');
      sessionStorage.removeItem('mindmap-ratings');
      sessionStorage.removeItem('mindmap-reflection');
      
      toast({
        title: "Reflection saved!",
        description: "Your daily reflection has been saved successfully.",
      });
      
      router.push('/me');
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: "Save failed",
        description: "Failed to save your reflection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mindmap
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Daily Reflection Summary</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </p>
        </div>
      </div>



      {/* Topics Needing Attention */}
      {topicsWithoutNotes.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Topics to Focus On Tomorrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topicsWithoutNotes.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/20"
                >
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm font-medium">{topic.text}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Consider adding notes for these topics in your next reflection session.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Daily Reflection Card */}
      {reflectionAnswers.overallWhy && (
        <div className="flex justify-center mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`relative bg-gradient-to-br from-slate-800 via-slate-900 to-black p-4 rounded-xl border-2 border-amber-500 shadow-xl transition-all duration-1000 ${
              isFirstView 
                ? 'shadow-2xl drop-shadow-2xl animate-pulse' 
                : ''
            }`}
            style={{ 
              width: '40vw', 
              maxWidth: '480px',
              ...(isFirstView && {
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.6), 0 0 100px rgba(245, 158, 11, 0.4), 0 0 150px rgba(245, 158, 11, 0.2)',
                filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.8))'
              })
            }}
          >
              
              {/* Ornate corner decorations */}
              <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-amber-400 rounded-tl-lg"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-amber-400 rounded-tr-lg"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-amber-400 rounded-bl-lg"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-amber-400 rounded-br-lg"></div>
              
              {/* Decorative border elements */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                <div className="w-12 h-3 bg-amber-500 rounded-full shadow-lg"></div>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
                <div className="w-12 h-3 bg-amber-500 rounded-full shadow-lg"></div>
              </div>
              
              {/* Mystical corner ornaments */}
              <div className="absolute -top-2 -left-2 text-lg text-amber-400 transform rotate-12">✦</div>
              <div className="absolute -top-2 -right-2 text-lg text-amber-400 transform -rotate-12">✦</div>
              <div className="absolute -bottom-2 -left-2 text-lg text-amber-400 transform -rotate-12">✦</div>
              <div className="absolute -bottom-2 -right-2 text-lg text-amber-400 transform rotate-12">✦</div>
              
              {/* Card Header */}
              <div className="text-center mb-3">
                <h3 className="text-lg font-bold text-amber-300 mb-1 tracking-wide">
                  DAILY REFLECTION
                </h3>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-4 h-0.5 bg-amber-500"></div>
                  <span className="text-amber-400 text-sm">✦</span>
                  <div className="w-4 h-0.5 bg-amber-500"></div>
                </div>
                <p className="text-xs text-amber-200 font-medium">
                  {currentDate}
                </p>
              </div>
              
              {/* Today's Progress */}
              <div className="bg-gradient-to-br from-amber-100/20 via-slate-700/80 to-slate-800/80 rounded-lg p-3 mb-3 border border-amber-400/30">
                <h4 className="font-bold text-center mb-2 text-amber-300 text-sm tracking-wide">
                  TODAY'S PROGRESS
                </h4>
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {topicsWithNotes.map((topic, index) => (
                    <div key={topic.id} className="border-l-2 border-emerald-400 pl-2 py-1 bg-slate-800/50 rounded-r-md">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm"></span>
                        <span className="font-bold text-emerald-300 text-xs">{topic.text}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-tight bg-slate-900/30 p-1.5 rounded">
                        {topic.notes}
                      </p>
                    </div>
                  ))}
                  {topicsWithoutNotes.map((topic, index) => (
                    <div key={topic.id} className="flex items-center gap-1 text-xs opacity-60 py-0.5 border-l-2 border-slate-500 pl-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      <span className="text-slate-400">{topic.text}</span>
                    </div>
                  ))}
                  {topics.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No topics added today</p>
                  )}
                </div>
              </div>
              
              {/* Stats/Attributes Section */}
              <div className="bg-gradient-to-br from-amber-100/20 via-slate-700/80 to-slate-800/80 rounded-lg p-3 mb-3 border border-amber-400/30">
                <h4 className="font-bold text-center mb-2 text-amber-300 text-sm tracking-wide">
                  DAILY ATTRIBUTES
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-0.5">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-pink-400" />
                      <span className="text-xs font-bold text-pink-300">Satisfaction</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-slate-600 rounded-full h-1.5 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-pink-400 to-pink-500 h-1.5 rounded-full shadow-lg transition-all duration-500"
                          style={{ width: `${ratings.satisfaction}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-pink-300 w-6 text-right">{ratings.satisfaction}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-0.5">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-400" />
                      <span className="text-xs font-bold text-blue-300">Progress</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-slate-600 rounded-full h-1.5 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full shadow-lg transition-all duration-500"
                          style={{ width: `${ratings.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-blue-300 w-6 text-right">{ratings.progress}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-0.5">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-400" />
                      <span className="text-xs font-bold text-orange-300">Challenge</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-slate-600 rounded-full h-1.5 shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-orange-500 h-1.5 rounded-full shadow-lg transition-all duration-500"
                          style={{ width: `${ratings.challenge}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-orange-300 w-6 text-right">{ratings.challenge}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reflection Text */}
              <div className="bg-gradient-to-br from-amber-100/20 via-slate-700/80 to-slate-800/80 rounded-lg p-3 border border-amber-400/30">
                <h4 className="font-bold text-center mb-1 text-amber-300 text-sm tracking-wide">
                  REFLECTION
                </h4>
                <div className="text-xs leading-tight text-slate-200 max-h-16 overflow-y-auto bg-slate-900/40 p-2 rounded border border-slate-600/50">
                  {reflectionAnswers.overallWhy}
                </div>
              </div>
              
              {/* Card Footer */}
              <div className="text-center mt-3">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-6 h-0.5 bg-amber-500"></div>
                  <span className="text-amber-400 text-sm">✦</span>
                  <div className="w-6 h-0.5 bg-amber-500"></div>
                </div>
                <p className="text-xs text-amber-200 font-medium italic">
                  "Every day is a new opportunity to grow"
                </p>
                <div className="mt-1 text-amber-400 text-sm">✨</div>
              </div>
          </motion.div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Edit Mindmap
        </Button>
        <Button 
          onClick={handleFinish}
          disabled={isSaving || !reflectionAnswers.overallWhy.trim()}
          size="lg"
          className="px-8"
        >
          {isSaving ? "Saving..." : "Complete Reflection"}
        </Button>
      </div>
    </div>
  );
}