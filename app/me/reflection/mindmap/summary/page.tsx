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

interface TopicRating {
  satisfaction: number;
  progress: number;
  challenge: number;
  why?: string;
}

export default function MindmapSummaryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicRatings, setTopicRatings] = useState<{[topicId: string]: TopicRating}>({});
  const [currentDate, setCurrentDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFirstView, setIsFirstView] = useState(true);

  useEffect(() => {
    // Get topics from session storage
    const storedTopics = sessionStorage.getItem('mindmap-topics');
    if (storedTopics) {
      setTopics(JSON.parse(storedTopics));
    }

    // Get topic ratings from session storage
    const storedTopicRatings = sessionStorage.getItem('mindmap-topic-ratings');
    if (storedTopicRatings) {
      setTopicRatings(JSON.parse(storedTopicRatings));
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

  // Calculate average ratings from topic ratings
  const calculateAverageRatings = () => {
    const topicsWithRatings = topicsWithNotes.filter(topic => topicRatings[topic.id]);
    if (topicsWithRatings.length === 0) {
      return { satisfaction: 0, progress: 0, challenge: 0 };
    }

    const totals = topicsWithRatings.reduce((acc, topic) => {
      const rating = topicRatings[topic.id];
      return {
        satisfaction: acc.satisfaction + rating.satisfaction,
        progress: acc.progress + rating.progress,
        challenge: acc.challenge + rating.challenge
      };
    }, { satisfaction: 0, progress: 0, challenge: 0 });

    return {
      satisfaction: Math.round(totals.satisfaction / topicsWithRatings.length),
      progress: Math.round(totals.progress / topicsWithRatings.length),
      challenge: Math.round(totals.challenge / topicsWithRatings.length)
    };
  };

  const averageRatings = calculateAverageRatings();

  // Combine all topic "why" responses into a single reflection
  const combinedReflection = topicsWithNotes
    .map(topic => {
      const rating = topicRatings[topic.id];
      if (rating?.why && rating.why.trim()) {
        return `${topic.text}: ${rating.why.trim()}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n\n');

  // Debug logging
  console.log('Debug info:', {
    topics: topics.length,
    topicsWithNotes: topicsWithNotes.length,
    topicRatings: Object.keys(topicRatings).length,
    combinedReflection: combinedReflection,
    averageRatings
  });

  const handleFinish = async () => {
    if (!combinedReflection.trim()) {
      toast({
        title: "Missing reflection",
        description: "Please complete your topic reflections before finishing.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const reflectionData: MindmapReflectionData = {
        topics: topics,
        satisfaction: averageRatings.satisfaction,
        progress: averageRatings.progress,
        challenge: averageRatings.challenge,
        overallReflection: combinedReflection
      };

      await saveMindmapReflection(reflectionData);
      
      // Clear session storage after successful save
      sessionStorage.removeItem('mindmap-topics');
      sessionStorage.removeItem('mindmap-topic-ratings');
      
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




      {/* Daily Reflection Card */}
      {combinedReflection && (
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
              
              {/* Individual Topic Sections */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {topicsWithNotes.map((topic, index) => {
                  const rating = topicRatings[topic.id];
                  return (
                    <div key={topic.id} className="bg-gradient-to-br from-amber-100/20 via-slate-700/80 to-slate-800/80 rounded-lg p-3 border border-amber-400/30">
                      {/* Topic Name */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-sm"></span>
                        <h4 className="font-bold text-emerald-300 text-sm tracking-wide">{topic.text}</h4>
                      </div>
                      
                      {/* Updates */}
                      {topic.notes && (
                        <div className="mb-2">
                          <h5 className="text-xs font-semibold text-amber-300 mb-1">Updates:</h5>
                          <p className="text-xs text-slate-300 leading-tight bg-slate-900/40 p-2 rounded border border-slate-600/50">
                            {topic.notes}
                          </p>
                        </div>
                      )}
                      
                      {/* Feelings */}
                      {rating && (
                        <div className="mb-2">
                          <h5 className="text-xs font-semibold text-amber-300 mb-2">Feelings:</h5>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <Heart className="h-2 w-2 text-pink-400" />
                                <span className="text-xs text-pink-300">Satisfaction</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-slate-600 rounded-full h-1 shadow-inner">
                                  <div 
                                    className="bg-gradient-to-r from-pink-400 to-pink-500 h-1 rounded-full shadow-sm transition-all duration-500"
                                    style={{ width: `${rating.satisfaction}%` }}
                                  />
                                </div>
                                <span className="text-xs text-pink-300 w-6 text-right">{rating.satisfaction}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-2 w-2 text-blue-400" />
                                <span className="text-xs text-blue-300">Progress</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-slate-600 rounded-full h-1 shadow-inner">
                                  <div 
                                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-1 rounded-full shadow-sm transition-all duration-500"
                                    style={{ width: `${rating.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-blue-300 w-6 text-right">{rating.progress}</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <Zap className="h-2 w-2 text-orange-400" />
                                <span className="text-xs text-orange-300">Challenge</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-slate-600 rounded-full h-1 shadow-inner">
                                  <div 
                                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-1 rounded-full shadow-sm transition-all duration-500"
                                    style={{ width: `${rating.challenge}%` }}
                                  />
                                </div>
                                <span className="text-xs text-orange-300 w-6 text-right">{rating.challenge}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Why (Reflection) */}
                      {rating?.why && (
                        <div>
                          <h5 className="text-xs font-semibold text-amber-300 mb-1">Reflection:</h5>
                          <p className="text-xs text-slate-200 leading-tight bg-slate-900/40 p-2 rounded border border-slate-600/50">
                            {rating.why}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Topics without updates */}
                {topicsWithoutNotes.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-100/20 via-slate-700/80 to-slate-800/80 rounded-lg p-3 border border-amber-400/30">
                    <h4 className="font-bold text-center mb-2 text-amber-300 text-xs tracking-wide">
                      TOPICS TO EXPLORE NEXT TIME
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {topicsWithoutNotes.map((topic) => (
                        <span key={topic.id} className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-600/50">
                          {topic.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {topics.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No topics added today</p>
                )}
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
          disabled={isSaving || !combinedReflection.trim()}
          size="lg"
          className="px-8"
        >
          {isSaving ? "Saving..." : "Complete Reflection"}
        </Button>
      </div>
    </div>
  );
}