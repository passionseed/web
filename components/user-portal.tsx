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
import { useState, useEffect } from "react";
import { getMindmapReflections } from "@/lib/supabase/mindmap-reflections";

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

  useEffect(() => {
    const fetchReflections = async () => {
      try {
        const data = await getMindmapReflections(6); // Get latest 6 reflections
        setReflections(data || []);
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

  const handleReflectionClick = (reflection: MindmapReflection) => {
    setSelectedReflection(reflection);
    setIsModalOpen(true);
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
            <Link href="/me/reflection" className="block">
              <Card className="bg-gradient-to-r from-green-800 to-emerald-700 hover:from-green-700 hover:to-emerald-600 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Reflection Journey
                    </h3>
                    <p className="text-white/80">
                      You have a {reflectionStreak}-day reflection streak! Keep
                      it up.
                    </p>
                  </div>
                  <Heart className="h-12 w-12 text-red-300" />
                </CardContent>
              </Card>
            </Link>
            
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
          <Card className="col-span-1 bg-gradient-to-br from-purple-950 to-violet-900 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-red-400" />
                Your Projects
              </CardTitle>
              <CardDescription className="text-white/70">
                Projects you're currently working on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{project.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
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

        <Tabs defaultValue="workshops" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="reflect">Reflect</TabsTrigger>
          </TabsList>
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

                          {/* Progress bars - stacked vertically */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-pink-500" />
                                <span className="text-xs font-medium">Satisfaction</span>
                              </div>
                              <span className="text-xs font-bold">{reflection.satisfaction_rating}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-pink-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${reflection.satisfaction_rating}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-blue-500" />
                                <span className="text-xs font-medium">Progress</span>
                              </div>
                              <span className="text-xs font-bold">{reflection.progress_rating}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${reflection.progress_rating}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-orange-500" />
                                <span className="text-xs font-medium">Challenge</span>
                              </div>
                              <span className="text-xs font-bold">{reflection.challenge_rating}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${reflection.challenge_rating}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Preview of reflection text */}
                          <div className="bg-muted/30 rounded p-2">
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {reflection.overall_reflection}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reflection Detail Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedReflection && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Reflection - {formatDate(selectedReflection.created_at)}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 pt-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
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

                  {/* Topics */}
                  <div>
                    <h3 className="font-semibold mb-3">Topics Reflected On</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReflection.mindmap_topics.map((topic) => (
                        <div key={topic.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-sm font-medium">{topic.text}</span>
                          {topic.notes && (
                            <Badge variant="outline" className="text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress Made */}
                  {selectedReflection.mindmap_topics.filter(topic => topic.notes).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Progress Made</h3>
                      <div className="space-y-3">
                        {selectedReflection.mindmap_topics
                          .filter(topic => topic.notes)
                          .map(topic => (
                            <div key={topic.id} className="border-l-4 border-emerald-400 pl-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-r-lg">
                              <div className="font-medium text-emerald-700 dark:text-emerald-300">{topic.text}</div>
                              <div className="text-sm text-muted-foreground mt-1">{topic.notes}</div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Full Reflection */}
                  <div>
                    <h3 className="font-semibold mb-3">Reflection</h3>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedReflection.overall_reflection}
                      </p>
                    </div>
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

