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
  }>;
}


export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<MindmapReflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReflections = async () => {
      setLoading(true);
      try {
        const data = await getMindmapReflections();
        setReflections(data);
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
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Daily Reflections</h1>
            <p className="text-muted-foreground">Track your daily mindmap reflections</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" /> New Reflection
          </Button>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Daily Reflections</h1>
          <p className="text-muted-foreground">Track your daily mindmap reflections</p>
        </div>
        <Button onClick={() => router.push("/me/reflection/mindmap")}>
          <Plus className="mr-2 h-4 w-4" /> New Reflection
        </Button>
      </div>

      {reflections.length === 0 ? (
        <div className="text-center mt-16">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No reflections yet</h2>
          <p className="text-muted-foreground mb-6">Start your reflection journey with a mindmap</p>
          <Button onClick={() => router.push("/me/reflection/mindmap")} size="lg">
            Create Your First Reflection
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Reflections
          </h2>
          <p className="text-muted-foreground mb-6">Your latest mindmap reflections and insights</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reflections.map((reflection, index) => (
              <motion.div
                key={reflection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer bg-card/80 backdrop-blur-sm border-border/40">
                  <CardContent className="p-4">
                    {/* Header with date */}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-semibold text-sm">
                        {new Date(reflection.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>

                    {/* Topics count in top right */}
                    <div className="text-right mb-4">
                      <span className="text-xs font-medium">
                        {reflection.mindmap_topics.length} topics
                      </span>
                    </div>

                    {/* Progress bars - compact vertical stack */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-pink-500 text-xs">💝 {reflection.satisfaction_rating}%</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-muted/60 rounded-full h-1.5">
                            <div 
                              className="bg-pink-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${reflection.satisfaction_rating}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-500 text-xs">📈 {reflection.progress_rating}%</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-muted/60 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${reflection.progress_rating}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-500 text-xs">⚡ {reflection.challenge_rating}%</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-muted/60 rounded-full h-1.5">
                            <div 
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${reflection.challenge_rating}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reflection preview */}
                    <div className="bg-muted/20 rounded p-2 mt-auto">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {reflection.overall_reflection}
                      </p>
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