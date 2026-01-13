"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  Users,
  BookOpen,
  Heart,
  Calendar,
  TrendingUp,
  Zap,
  ArrowRight,
  Map as MapIcon,
  CheckCircle2,
  PlayCircle,
  Flame,
  Brain,
  Target,
  Award,
} from "lucide-react";
import Link from "next/link";
import { Project } from "@/types/project";
import { PortalVinyl } from "@/components/song-of-the-day/portal-vinyl";
import { MilestoneList } from "@/components/milestones/MilestoneList";
import { BadgeGallery } from "@/components/profile/BadgeGallery";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMindmapReflections } from "@/lib/supabase/mindmap-reflections";
import { useAuth } from "@/hooks/use-auth";
import { MapNode, LearningMap } from "@/types/map";

const Tabs = dynamic(() => import("@/components/ui/tabs").then((mod) => mod.Tabs), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-muted/10 animate-pulse rounded-lg" />,
});

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
  const { user } = useAuth();
  const router = useRouter();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [reflections, setReflections] = useState<MindmapReflection[]>([]);
  const [selectedReflection, setSelectedReflection] =
    useState<MindmapReflection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextNodes, setNextNodes] = useState<
    Array<{
      node: MapNode;
      map: Pick<LearningMap, "id" | "title" | "category">;
      status: string;
    }>
  >([]);
  const [isLoadingNextNodes, setIsLoadingNextNodes] = useState(true);

  useEffect(() => {
    const fetchReflections = async () => {
      try {
        const data = await getMindmapReflections(20); // Get more to deduplicate

        // Deduplicate: keep only the latest reflection per day
        const deduplicatedReflections = (data || []).reduce(
          (acc, reflection) => {
            const date = new Date(reflection.created_at).toDateString();
            const existing = acc.get(date);

            // Keep the latest reflection for each date
            if (
              !existing ||
              new Date(reflection.created_at) > new Date(existing.created_at)
            ) {
              acc.set(date, reflection);
            }

            return acc;
          },
          new Map<string, MindmapReflection>()
        );

        // Convert back to array and sort by date (newest first), limit to 6
        const uniqueReflections = Array.from(deduplicatedReflections.values())
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
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

  useEffect(() => {
    const fetchNextNodes = async () => {
      try {
        setIsLoadingNextNodes(true);
        const response = await fetch("/api/user/next-nodes");
        if (!response.ok) {
          throw new Error("Failed to fetch next nodes");
        }
        const data = await response.json();
        setNextNodes(data.nextNodes || []);
      } catch (error) {
        console.error("Error fetching next nodes:", error);
        setNextNodes([]);
      } finally {
        setIsLoadingNextNodes(false);
      }
    };
    fetchNextNodes();
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

    if (!text || text.trim() === "") return topicNotesMap;

    // Split by newlines and parse each line
    const lines = text.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      // Look for pattern "topic: note"
      const colonIndex = line.indexOf(":");
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

  // Get randomized motivational text (deterministic based on user)
  const getRandomMotivationalText = () => {
    const texts = [
      "Every great journey begins with a single step. Keep moving forward!",
      "Your passion is your superpower. Use it wisely today.",
      "Growth happens outside your comfort zone. Embrace the challenge!",
      "Small consistent actions lead to extraordinary results.",
      "You're capable of amazing things. Believe in your potential.",
      "Learning is a lifelong adventure. Enjoy the journey!",
      "Your unique perspective makes the world a better place.",
      "Progress over perfection. Celebrate your wins today!",
      "Curiosity is the spark that ignites innovation.",
      "Your dedication inspires others. Keep shining!",
    ];

    // Use user ID or email to create a deterministic "random" index
    const seed = user?.id || user?.email || "anonymous";
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % texts.length;
    return texts[index];
  };

  return (
    <div className="flex flex-col space-y-6 md:space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Hi,{" "}
              {user?.user_metadata?.full_name?.split(" ")[0] ||
                user?.email?.split("@")[0] ||
                "there"}
              ! 👋
            </h1>
            <p className="text-sm md:text-base text-muted-foreground italic">
              {getRandomMotivationalText()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="col-span-1 h-[400px] md:h-[500px] overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <MapIcon className="mr-2 h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                Journey Map
              </CardTitle>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  console.log('Navigating to /me/journey');
                  window.location.assign('/me/journey');
                }}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Enter
              </Button>
            </div>
            <CardDescription className="text-xs md:text-sm">
              Your projects and milestones at a glance
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-80px)] p-4">
            <MilestoneList />
          </CardContent>
        </Card>

        <div className="col-span-1 flex flex-col gap-4 md:gap-6">
          <PortalVinyl />

          {/* Streak section in right column */}
          <div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-[2px] cursor-pointer group hover:scale-[1.02] transition-transform"
            onClick={() => (window.location.href = "/me/reflection")}
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 h-full">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-500/20 to-transparent rounded-full blur-2xl" />

              <div className="relative z-10 flex items-center justify-center gap-6">
                {/* Flame icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 rounded-full blur-xl opacity-60" />
                  <Flame className="relative h-10 w-10 text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]" />
                </div>

                {/* Streak info */}
                <div className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-br from-orange-300 via-orange-400 to-red-500 bg-clip-text text-transparent drop-shadow-lg">
                    {reflectionStreak}
                  </div>
                  <div className="text-orange-200 text-base font-semibold tracking-wider uppercase">
                    {reflectionStreak === 1 ? "Night" : "Nights"}
                  </div>
                  <div className="text-orange-400/80 text-sm font-medium tracking-widest uppercase">
                    Streak
                  </div>
                </div>

                {/* Recent days indicator */}
                {reflectionStreak > 0 && (
                  <div className="flex flex-col items-center gap-1.5">
                    {Array.from({ length: Math.min(5, reflectionStreak) }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="w-2.5 h-6 bg-gradient-to-t from-orange-600 to-orange-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.5)]"
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Motivational text */}
              <p className="text-orange-200/60 text-xs text-center mt-3 max-w-[200px] mx-auto">
                {reflectionStreak === 0
                  ? "Start your reflection journey today!"
                  : reflectionStreak < 3
                    ? "Keep the fire burning! 🔥"
                    : reflectionStreak < 7
                      ? "You're on a roll! ✨"
                      : reflectionStreak < 14
                        ? "Amazing dedication! 🌟"
                        : "Legendary streak! 🏆"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="col-span-1 bg-gradient-to-br from-blue-950 to-indigo-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg md:text-xl">
              <PlayCircle className="mr-2 h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              Next Steps
            </CardTitle>
            <CardDescription className="text-white/70 text-xs md:text-sm">
              Continue your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNextNodes ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading next steps...</span>
                </div>
              </div>
            ) : nextNodes.length > 0 ? (
              <div className="space-y-2">
                {nextNodes.map((item) => (
                  <Link
                    key={item.node.id}
                    href={`/map/${item.map.id}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {item.status === "in_progress" ? (
                            <PlayCircle className="h-4 w-4 text-blue-300" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-white/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapIcon className="h-3 w-3 text-white/60 flex-shrink-0" />
                            <span className="text-xs text-white/60 truncate">
                              {item.map.title}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors line-clamp-2">
                            {item.node.title}
                          </p>
                          {item.status === "in_progress" && (
                            <Badge className="mt-1 bg-blue-500/20 text-blue-200 border-blue-400/30 text-[10px]">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <MapIcon className="h-10 w-10 md:h-12 md:w-12 mx-auto text-white/40 mb-3" />
                <p className="text-white/80 text-sm mb-4">
                  Start your learning journey!
                </p>
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Link href="/map">Browse Learning Maps</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-gradient-to-br from-yellow-900 to-orange-900 text-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <Award className="mr-2 h-4 w-4 md:h-5 md:w-5 text-yellow-400" />
                Achievement Badges
              </CardTitle>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-yellow-300 hover:text-yellow-100 hover:bg-yellow-800/30"
              >
                <Link href="/profile">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription className="text-white/70 text-xs md:text-sm">
              Badges earned from completing seeds
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {user?.id && (
              <BadgeGallery
                userId={user.id}
                showTitle={false}
                maxDisplay={6}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reflect" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger
            value="reflect"
            className="text-xs md:text-sm py-2 md:py-2.5"
          >
            Reflect
          </TabsTrigger>
          <TabsTrigger
            value="workshops"
            className="text-xs md:text-sm py-2 md:py-2.5"
          >
            Workshops
          </TabsTrigger>
          <TabsTrigger
            value="communities"
            className="text-xs md:text-sm py-2 md:py-2.5"
          >
            Communities
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reflect" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <Heart className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Recent Reflections
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Your latest mindmap reflections and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reflections.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-sm md:text-base">
                    No reflections yet
                  </p>
                  <Button asChild className="mt-4 text-sm md:text-base">
                    <Link href="/me/reflection/mindmap">Start Reflecting</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {reflections.map((reflection) => (
                    <Card
                      key={reflection.id}
                      className="cursor-pointer hover:shadow-md transition-shadow h-full"
                      onClick={() => handleReflectionClick(reflection)}
                    >
                      <CardContent className="p-3 md:p-4">
                        {/* Header with date */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                            <span className="font-semibold text-xs md:text-sm truncate">
                              {formatDate(reflection.created_at)}
                            </span>
                          </div>
                          {/* Topics count */}
                          <Badge
                            variant="outline"
                            className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 flex-shrink-0"
                          >
                            {reflection.mindmap_topics.length} topics
                          </Badge>
                        </div>

                        {/* Average ratings summary */}
                        <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-pink-500 text-[10px] md:text-xs">
                              💗 Satisfaction
                            </span>
                            <span className="text-[10px] md:text-xs font-medium">
                              {reflection.satisfaction_rating}
                            </span>
                          </div>
                          <div className="w-full bg-muted/60 rounded-full h-1 md:h-1.5">
                            <div
                              className="bg-pink-500 h-1 md:h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${reflection.satisfaction_rating}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-blue-500 text-[10px] md:text-xs">
                              📈 Progress
                            </span>
                            <span className="text-[10px] md:text-xs font-medium">
                              {reflection.progress_rating}
                            </span>
                          </div>
                          <div className="w-full bg-muted/60 rounded-full h-1 md:h-1.5">
                            <div
                              className="bg-blue-500 h-1 md:h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${reflection.progress_rating}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-orange-500 text-[10px] md:text-xs">
                              ⚡ Challenge
                            </span>
                            <span className="text-[10px] md:text-xs font-medium">
                              {reflection.challenge_rating}
                            </span>
                          </div>
                          <div className="w-full bg-muted/60 rounded-full h-1 md:h-1.5">
                            <div
                              className="bg-orange-500 h-1 md:h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${reflection.challenge_rating}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Topics with updates preview */}
                        <div className="bg-muted/20 rounded p-1.5 md:p-2">
                          {(() => {
                            // Parse overall_reflection to get all topic notes
                            const parsedNotes = parseOverallReflection(
                              reflection.overall_reflection
                            );

                            // Get topics with notes (either from notes field or parsed)
                            const topicsWithNotes = reflection.mindmap_topics
                              .map((topic) => {
                                const displayNotes =
                                  topic.notes ||
                                  parsedNotes.get(topic.text.toLowerCase());
                                return displayNotes
                                  ? { ...topic, displayNotes }
                                  : null;
                              })
                              .filter(Boolean) as Array<{
                                id: string;
                                text: string;
                                displayNotes: string;
                              }>;

                            if (topicsWithNotes.length === 0) {
                              return (
                                <p className="text-[10px] md:text-xs text-muted-foreground italic">
                                  No topic updates available
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-1">
                                {topicsWithNotes.slice(0, 2).map((topic) => (
                                  <div
                                    key={topic.id}
                                    className="text-[10px] md:text-xs"
                                  >
                                    <span className="font-medium text-emerald-600">
                                      {topic.text}:
                                    </span>
                                    <span className="text-muted-foreground ml-1 line-clamp-1">
                                      {topic.displayNotes}
                                    </span>
                                  </div>
                                ))}
                                {topicsWithNotes.length > 2 && (
                                  <p className="text-[10px] md:text-xs text-muted-foreground italic">
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
        <TabsContent value="workshops" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <BookOpen className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Workshops You've Joined
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Track your learning journey through workshops
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {workshops.map((workshop, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between border-b pb-3 md:pb-4 last:border-0 last:pb-0 gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-medium text-sm md:text-base truncate">
                        {workshop.title}
                      </h4>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {workshop.category}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Joined
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="communities" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <Users className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Your Communities
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Communities you're actively participating in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for communities */}
              <p className="text-sm md:text-base">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reflection Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 md:p-6">
          {selectedReflection && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base md:text-lg pr-6">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span className="truncate">
                    Reflection - {formatDate(selectedReflection.created_at)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="pt-4 md:pt-6">
                {/* Average Ratings Summary */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                  <div className="text-center p-2 md:p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                    <Heart className="h-4 w-4 md:h-6 md:w-6 text-pink-500 mx-auto mb-1 md:mb-2" />
                    <div className="text-lg md:text-2xl font-bold text-pink-600">
                      {selectedReflection.satisfaction_rating}%
                    </div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">
                      Satisfaction
                    </div>
                  </div>
                  <div className="text-center p-2 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-blue-500 mx-auto mb-1 md:mb-2" />
                    <div className="text-lg md:text-2xl font-bold text-blue-600">
                      {selectedReflection.progress_rating}%
                    </div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">
                      Progress
                    </div>
                  </div>
                  <div className="text-center p-2 md:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Zap className="h-4 w-4 md:h-6 md:w-6 text-orange-500 mx-auto mb-1 md:mb-2" />
                    <div className="text-lg md:text-2xl font-bold text-orange-600">
                      {selectedReflection.challenge_rating}%
                    </div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">
                      Challenge
                    </div>
                  </div>
                </div>

                {/* Individual Topic Cards */}
                <div className="space-y-3 md:space-y-4">
                  <h3 className="font-semibold text-base md:text-lg">
                    Topics & Reflections
                  </h3>
                  <div className="grid gap-3 md:gap-4">
                    {(() => {
                      // Parse overall_reflection to get topic notes if topics don't have notes
                      const parsedNotes = parseOverallReflection(
                        selectedReflection.overall_reflection
                      );

                      // Combine topics from mindmap_topics with parsed notes
                      const topicsWithNotes = selectedReflection.mindmap_topics
                        .map((topic) => {
                          // If topic already has notes, use them
                          if (topic.notes) {
                            return { ...topic, displayNotes: topic.notes };
                          }

                          // Otherwise, try to find notes from parsed overall_reflection
                          const topicNameLower = topic.text.toLowerCase();
                          const parsedNote = parsedNotes.get(topicNameLower);

                          return {
                            ...topic,
                            displayNotes: parsedNote || null,
                          };
                        })
                        .filter((topic) => topic.displayNotes);

                      // If no topics with notes, show a message
                      if (topicsWithNotes.length === 0) {
                        return (
                          <p className="text-muted-foreground text-center py-6 md:py-8 text-sm">
                            No topic reflections available
                          </p>
                        );
                      }

                      return topicsWithNotes.map((topic) => (
                        <Card key={topic.id} className="bg-card/50 border">
                          <CardContent className="p-3 md:p-4">
                            {/* Topic Name */}
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                              <h4 className="font-semibold text-emerald-600 text-sm md:text-base break-words">
                                {topic.text}
                              </h4>
                            </div>

                            {/* Updates */}
                            <div className="mb-3 md:mb-4">
                              <h5 className="text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">
                                Updates:
                              </h5>
                              <div className="bg-muted/30 rounded-lg p-2 md:p-3">
                                <p className="text-xs md:text-sm leading-relaxed break-words">
                                  {topic.displayNotes}
                                </p>
                              </div>
                            </div>

                            {/* Individual Topic Ratings - Show if available */}
                            {(topic.satisfaction_rating ||
                              topic.progress_rating ||
                              topic.challenge_rating) && (
                                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
                                  <div className="text-center p-1.5 md:p-2 bg-pink-50 dark:bg-pink-900/20 rounded">
                                    <Heart className="h-3 w-3 md:h-4 md:w-4 text-pink-500 mx-auto mb-0.5 md:mb-1" />
                                    <div className="text-xs md:text-sm font-medium">
                                      {topic.satisfaction_rating || 0}
                                    </div>
                                    <div className="text-[10px] md:text-xs text-muted-foreground">
                                      Satisfaction
                                    </div>
                                  </div>
                                  <div className="text-center p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-500 mx-auto mb-0.5 md:mb-1" />
                                    <div className="text-xs md:text-sm font-medium">
                                      {topic.progress_rating || 0}
                                    </div>
                                    <div className="text-[10px] md:text-xs text-muted-foreground">
                                      Progress
                                    </div>
                                  </div>
                                  <div className="text-center p-1.5 md:p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                                    <Zap className="h-3 w-3 md:h-4 md:w-4 text-orange-500 mx-auto mb-0.5 md:mb-1" />
                                    <div className="text-xs md:text-sm font-medium">
                                      {topic.challenge_rating || 0}
                                    </div>
                                    <div className="text-[10px] md:text-xs text-muted-foreground">
                                      Challenge
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Reflection Why */}
                            {topic.reflection_why && (
                              <div>
                                <h5 className="text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-2">
                                  Reflection:
                                </h5>
                                <div className="bg-muted/30 rounded-lg p-2 md:p-3">
                                  <p className="text-xs md:text-sm leading-relaxed italic break-words">
                                    {topic.reflection_why}
                                  </p>
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
                    const parsedNotes = parseOverallReflection(
                      selectedReflection.overall_reflection
                    );
                    const topicsWithoutNotes =
                      selectedReflection.mindmap_topics.filter((topic) => {
                        if (topic.notes) return false;
                        const topicNameLower = topic.text.toLowerCase();
                        return !parsedNotes.has(topicNameLower);
                      });

                    if (topicsWithoutNotes.length === 0) return null;

                    return (
                      <div className="mt-4 md:mt-6">
                        <h4 className="font-medium text-muted-foreground mb-2 text-sm md:text-base">
                          Topics Added (No Updates)
                        </h4>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {topicsWithoutNotes.map((topic) => (
                            <Badge
                              key={topic.id}
                              variant="outline"
                              className="text-[10px] md:text-xs"
                            >
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
  );
}
