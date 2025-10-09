"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Star, Users, BookOpen, Heart, Brain, Calendar, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types/project";
import { ReflectionHeatmap } from "@/components/reflection/reflection-heatmap";
import { StreakCounter } from "@/components/reflection/StreakCounter";
import { useState, useEffect } from "react";
import { getMindmapReflections } from "@/lib/supabase/mindmap-reflections";
import { getOrCreatePersonalJourneyMap } from "@/lib/supabase/maps";

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

interface UserPortalProps {
  dashboardData: {
    projects: Project[];
    reflectionStreak: number;
    workshops: any[];
  };
}

export function UserPortal({ dashboardData }: UserPortalProps) {
  const { projects, reflectionStreak, workshops } = dashboardData;
  const [reflections, setReflections] = useState<MindmapReflection[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<MindmapReflection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingJourneyMap, setIsCreatingJourneyMap] = useState(false);

  useEffect(() => {
    const fetchReflections = async () => {
      try {
        const data = await getMindmapReflections(20); // Get more to deduplicate

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

        // Convert back to array and sort by date (newest first), limit to 6
        const uniqueReflections = Array.from(deduplicatedReflections.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 6);

        setReflections(uniqueReflections);
      } catch (error) {
        console.error("Error fetching reflections:", error);
        // Silently handle the error - user might not be authenticated on client
        // or might not have any reflections yet
        setReflections([]);
      }
    };
    fetchReflections();
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // Parse overall_reflection text to extract topic-specific notes
  // Format: "topic1: note1\ntopic2: note2\n..."
  const parseOverallReflection = (text: string): Map<string, string> => {
    const topicNotesMap = new Map<string, string>();

    if (!text || text.trim() === '') return topicNotesMap;

    // Split by newlines and parse each line
    const lines = text.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      // Look for pattern "topic: note"
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

  const handleReflectionClick = (reflection: MindmapReflection) => {
    setSelectedReflection(reflection);
    setIsModalOpen(true);
  };

  const handleJourneyMapClick = async () => {
    setIsCreatingJourneyMap(true);
    try {
      const journeyMap = await getOrCreatePersonalJourneyMap();
      // Navigate to the journey map in edit mode
      window.location.href = `/map/${journeyMap.id}/edit`;
    } catch (error) {
      console.error("Error accessing journey map:", error);
      // You could add a toast notification here if available
    } finally {
      setIsCreatingJourneyMap(false);
    }
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Your Passion Portal
          </h1>
          <p className="text-muted-foreground">
            Track your projects, reflections, and workshops.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="mr-2 h-5 w-5 text-red-400" />
                Reflection Heatmap
              </CardTitle>
              <CardDescription className="text-white/70">
                Your reflection activity over the past year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReflectionHeatmap />
            </CardContent>
          </Card>

          <div className="col-span-1 flex flex-col gap-6">
            <StreakCounter
              streak={reflectionStreak}
              onClick={() => window.location.href = '/me/reflection'}
            />

            <Link href="/me/reflection/mindmap">
              <Card className="bg-gradient-to-br from-blue-800 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-600 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-blue-400" />
                    Daily Reflection
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Map your current activities and reflect on your day
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button size="default" className="w-full bg-blue-600 hover:bg-blue-700">
                    Start Reflecting
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card 
            className="col-span-1 bg-gradient-to-br from-purple-950 to-violet-900 text-white cursor-pointer hover:from-purple-900 hover:to-violet-800 transition-colors"
            onClick={handleJourneyMapClick}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-red-400" />
                My Journey Map
              </CardTitle>
              <CardDescription className="text-white/70">
                Your personal learning map that you can edit and customize
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isCreatingJourneyMap ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-white/80">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Opening your journey map...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs">
                      <span>✏️ Fully editable</span>
                      <span>•</span>
                      <span>🔒 Private to you</span>
                      <span>•</span>
                      <span>🎯 Your learning path</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white border-white/20"
                      disabled={isCreatingJourneyMap}
                    >
                      {isCreatingJourneyMap ? "Opening..." : "Open Journey Map"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-gradient-to-br from-violet-900 to-purple-800 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-yellow-400" />
                Your Skills
              </CardTitle>
              <CardDescription className="text-white/70">
                Skills you're developing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for skills */}
              <p className="text-white/70">Coming soon...</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reflect" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reflect">Reflect</TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
          </TabsList>
          <TabsContent value="reflect">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  Recent Reflections
                </CardTitle>
                <CardDescription>
                  Your latest mindmap reflections and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reflections.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No reflections yet</p>
                    <Button asChild className="mt-4">
                      <Link href="/me/reflection/mindmap">Start Reflecting</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {reflections.map((reflection) => (
                      <Card 
                        key={reflection.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow h-full"
                        onClick={() => handleReflectionClick(reflection)}
                      >
                        <CardContent className="p-4">
                          {/* Header with date */}
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold text-sm">
                              {formatDate(reflection.created_at)}
                            </span>
                          </div>

                          {/* Topics count in top right */}
                          <div className="text-right mb-4">
                            <Badge variant="outline" className="text-xs">
                              {reflection.mindmap_topics.length} topics
                            </Badge>
                          </div>

                          {/* Average ratings summary */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-pink-500 text-xs">💗 Satisfaction</span>
                              <span className="text-xs font-medium">{reflection.satisfaction_rating}</span>
                            </div>
                            <div className="w-full bg-muted/60 rounded-full h-1.5">
                              <div 
                                className="bg-pink-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${reflection.satisfaction_rating}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-blue-500 text-xs">📈 Progress</span>
                              <span className="text-xs font-medium">{reflection.progress_rating}</span>
                            </div>
                            <div className="w-full bg-muted/60 rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${reflection.progress_rating}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-orange-500 text-xs">⚡ Challenge</span>
                              <span className="text-xs font-medium">{reflection.challenge_rating}</span>
                            </div>
                            <div className="w-full bg-muted/60 rounded-full h-1.5">
                              <div 
                                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
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
                                    .slice(0, 2)
                                    .map((topic) => (
                                      <div key={topic.id} className="text-xs">
                                        <span className="font-medium text-emerald-600">{topic.text}:</span>
                                        <span className="text-muted-foreground ml-1 line-clamp-1">
                                          {topic.displayNotes}
                                        </span>
                                      </div>
                                    ))}
                                  {topicsWithNotes.length > 2 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      +{topicsWithNotes.length - 2} more topics
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="workshops">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Workshops You've Joined
                </CardTitle>
                <CardDescription>
                  Track your learning journey through workshops
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workshops.map((workshop, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{workshop.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {workshop.category}
                        </p>
                      </div>
                      <Badge variant="outline">Joined</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="communities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Your Communities
                </CardTitle>
                <CardDescription>
                  Communities you're actively participating in
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder for communities */}
                <p>Coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reflection Detail Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedReflection && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Reflection - {formatDate(selectedReflection.created_at)}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="pt-6">
                  {/* Average Ratings Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                      <Heart className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-pink-600">{selectedReflection.satisfaction_rating}%</div>
                      <div className="text-sm text-muted-foreground">Satisfaction</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{selectedReflection.progress_rating}%</div>
                      <div className="text-sm text-muted-foreground">Progress</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Zap className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-orange-600">{selectedReflection.challenge_rating}%</div>
                      <div className="text-sm text-muted-foreground">Challenge</div>
                    </div>
                  </div>

                  {/* Individual Topic Cards */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Topics & Reflections</h3>
                    <div className="grid gap-4">
                      {(() => {
                        // Parse overall_reflection to get topic notes if topics don't have notes
                        const parsedNotes = parseOverallReflection(selectedReflection.overall_reflection);

                        // Combine topics from mindmap_topics with parsed notes
                        const topicsWithNotes = selectedReflection.mindmap_topics.map(topic => {
                          // If topic already has notes, use them
                          if (topic.notes) {
                            return { ...topic, displayNotes: topic.notes };
                          }

                          // Otherwise, try to find notes from parsed overall_reflection
                          const topicNameLower = topic.text.toLowerCase();
                          const parsedNote = parsedNotes.get(topicNameLower);

                          return {
                            ...topic,
                            displayNotes: parsedNote || null
                          };
                        }).filter(topic => topic.displayNotes);

                        // If no topics with notes, show a message
                        if (topicsWithNotes.length === 0) {
                          return (
                            <p className="text-muted-foreground text-center py-8">
                              No topic reflections available
                            </p>
                          );
                        }

                        return topicsWithNotes.map((topic) => (
                          <Card key={topic.id} className="bg-card/50 border">
                            <CardContent className="p-4">
                              {/* Topic Name */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                <h4 className="font-semibold text-emerald-600">{topic.text}</h4>
                              </div>

                              {/* Updates */}
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-muted-foreground mb-2">Updates:</h5>
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <p className="text-sm leading-relaxed">{topic.displayNotes}</p>
                                </div>
                              </div>

                              {/* Individual Topic Ratings - Show if available */}
                              {(topic.satisfaction_rating || topic.progress_rating || topic.challenge_rating) && (
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div className="text-center p-2 bg-pink-50 dark:bg-pink-900/20 rounded">
                                    <Heart className="h-4 w-4 text-pink-500 mx-auto mb-1" />
                                    <div className="text-sm font-medium">{topic.satisfaction_rating || 0}</div>
                                    <div className="text-xs text-muted-foreground">Satisfaction</div>
                                  </div>
                                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <TrendingUp className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                                    <div className="text-sm font-medium">{topic.progress_rating || 0}</div>
                                    <div className="text-xs text-muted-foreground">Progress</div>
                                  </div>
                                  <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                                    <Zap className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                                    <div className="text-sm font-medium">{topic.challenge_rating || 0}</div>
                                    <div className="text-xs text-muted-foreground">Challenge</div>
                                  </div>
                                </div>
                              )}

                              {/* Reflection Why */}
                              {topic.reflection_why && (
                                <div>
                                  <h5 className="text-sm font-medium text-muted-foreground mb-2">Reflection:</h5>
                                  <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-sm leading-relaxed italic">{topic.reflection_why}</p>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ));
                      })()}
                    </div>


                    {/* Topics without updates */}
                    {(() => {
                      const parsedNotes = parseOverallReflection(selectedReflection.overall_reflection);
                      const topicsWithoutNotes = selectedReflection.mindmap_topics.filter(topic => {
                        if (topic.notes) return false;
                        const topicNameLower = topic.text.toLowerCase();
                        return !parsedNotes.has(topicNameLower);
                      });

                      if (topicsWithoutNotes.length === 0) return null;

                      return (
                        <div className="mt-6">
                          <h4 className="font-medium text-muted-foreground mb-2">Topics Added (No Updates)</h4>
                          <div className="flex flex-wrap gap-2">
                            {topicsWithoutNotes.map((topic) => (
                              <Badge key={topic.id} variant="outline" className="text-xs">
                                {topic.text}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

