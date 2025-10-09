"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, Brain, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { getMindmapReflections } from "@/lib/supabase/mindmap-reflections";
import { useToast } from "@/components/ui/use-toast";

interface MindmapReflection {
  id: string;
  satisfaction_rating: number;
  progress_rating: number;
  challenge_rating: number;
  overall_reflection: string;
  created_at: string;
  mindmap_topics: Array<{
    id: string;
    text: string;
    notes: string | null;
    satisfaction_rating: number | null;
    progress_rating: number | null;
    challenge_rating: number | null;
    reflection_why: string | null;
  }>;
}


export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<MindmapReflection[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse overall_reflection text to extract topic-specific notes
  const parseOverallReflection = (text: string): Map<string, string> => {
    const topicNotesMap = new Map<string, string>();

    if (!text || text.trim() === '') return topicNotesMap;

    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const topic = line.substring(0, colonIndex).trim().toLowerCase();
        const note = line.substring(colonIndex + 1).trim();
        if (topic && note) {
          topicNotesMap.set(topic, note);
        }
      }
    }

    return topicNotesMap;
  };

  useEffect(() => {
    const fetchReflections = async () => {
      setLoading(true);
      try {
        const data = await getMindmapReflections();

        // Deduplicate: keep only the latest reflection per day
        const deduplicatedReflections = (data || []).reduce((acc, reflection) => {
          const date = new Date(reflection.created_at).toDateString();
          const existing = acc.get(date);

          // Keep the latest reflection for each date
          if (!existing || new Date(reflection.created_at) > new Date(existing.created_at)) {
            acc.set(date, reflection);
          }

          return acc;
        }, new Map<string, MindmapReflection>());

        // Convert back to array and sort by date (newest first)
        const uniqueReflections = Array.from(deduplicatedReflections.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setReflections(uniqueReflections);
      } catch (error) {
        console.error("Error fetching reflections:", error);
        toast({
          title: "Error",
          description: "Failed to load reflections.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReflections();
  }, [toast]);

  if (loading) {
    return (
      <div className="container py-4 px-4 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Daily Reflections</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Track your daily mindmap reflections</p>
          </div>
          <Button disabled className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Reflection
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-2 sm:px-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-1 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-1 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-1 bg-muted rounded"></div>
                </div>
                <div className="h-12 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 px-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Daily Reflections</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track your daily mindmap reflections</p>
        </div>
        <Button 
          onClick={() => router.push("/me/reflection/mindmap")}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> New Reflection
        </Button>
      </div>

      {reflections.length === 0 ? (
        <div className="text-center mt-8 px-4">
          <Brain className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold mb-2">No reflections yet</h2>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">Start your reflection journey with a mindmap</p>
          <Button 
            onClick={() => router.push("/me/reflection/mindmap")} 
            size="lg"
            className="w-full sm:w-auto"
          >
            Create Your First Reflection
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 px-2 sm:px-0">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Recent Reflections
          </h2>
          <p className="text-muted-foreground mb-6 px-2 sm:px-0 text-sm sm:text-base">Your latest mindmap reflections and insights</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-2 sm:px-0">
            {reflections.map((reflection, index) => (
              <motion.div
                key={reflection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm border-border/40">
                  <CardContent className="p-3 sm:p-4">
                    {/* Header with date and topics count */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-semibold text-xs sm:text-sm">
                          {new Date(reflection.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      <span className="text-xs font-medium">
                        {reflection.mindmap_topics.length} topics
                      </span>
                    </div>

                    {/* Average ratings summary */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-pink-500 text-xs">💗 Satisfaction</span>
                        <span className="text-xs font-medium">{reflection.satisfaction_rating}</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-1">
                        <div 
                          className="bg-pink-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${reflection.satisfaction_rating}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-blue-500 text-xs">📈 Progress</span>
                        <span className="text-xs font-medium">{reflection.progress_rating}</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${reflection.progress_rating}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-orange-500 text-xs">⚡ Challenge</span>
                        <span className="text-xs font-medium">{reflection.challenge_rating}</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-1">
                        <div 
                          className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${reflection.challenge_rating}%` }}
                        />
                      </div>
                    </div>

                    {/* Topics with updates preview */}
                    <div className="bg-muted/20 rounded p-2">
                      {(() => {
                        // Parse overall_reflection to get all topic notes
                        const parsedNotes = parseOverallReflection(reflection.overall_reflection);

                        // Get topics with notes (either from notes field or parsed)
                        const topicsWithNotes = reflection.mindmap_topics
                          .map(topic => {
                            const displayNotes = topic.notes || parsedNotes.get(topic.text.toLowerCase());
                            return displayNotes ? { ...topic, displayNotes } : null;
                          })
                          .filter(Boolean) as Array<{ id: string; text: string; displayNotes: string }>;

                        if (topicsWithNotes.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground italic">
                              No topic updates available
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            {topicsWithNotes
                              .slice(0, 1) // Show only 1 on mobile for space
                              .map((topic) => (
                                <div key={topic.id} className="text-xs">
                                  <span className="font-medium text-emerald-600">{topic.text}:</span>
                                  <span className="text-muted-foreground ml-1 line-clamp-1">
                                    {topic.displayNotes}
                                  </span>
                                </div>
                              ))}
                            {topicsWithNotes.length > 1 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{topicsWithNotes.length - 1} more topics
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}