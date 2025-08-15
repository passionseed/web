"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  Heart,
  Map,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { getMapsWithStats } from "@/lib/supabase/maps";
import { LearningMap, UserMapEnrollment } from "@/types/map";
import { useProgressMaps } from "@/hooks/use-progress-maps";
import { LearningMapsSkeleton } from "@/components/learning-maps-skeleton";
import { ClassroomSection } from "@/components/dashboard/ClassroomSection";

interface DashboardHomeProps {
  user: any;
}

type MapWithStats = LearningMap & {
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
};

type EnrolledMapWithStats = MapWithStats & {
  enrollment: UserMapEnrollment;
  isEnrolled: true;
  realTimeProgress: {
    progressPercentage: number;
    completedNodes: number;
    totalNodes: number;
    passedNodes: number;
    failedNodes: number;
    submittedNodes: number;
    inProgressNodes: number;
  };
};

export function DashboardHome({ user }: DashboardHomeProps) {
  const { enrolledMaps, availableMaps, isLoading, error } = useProgressMaps();

  const getProgressStatus = (map: MapWithStats | EnrolledMapWithStats) => {
    // For enrolled maps with real-time progress, use the calculated progress
    if ("isEnrolled" in map && map.isEnrolled && map.realTimeProgress) {
      const progress = map.realTimeProgress.progressPercentage;
      const { passedNodes, failedNodes, submittedNodes, inProgressNodes } =
        map.realTimeProgress;

      if (progress === 100) return { status: "Completed", progress: 100 };
      if (
        passedNodes > 0 ||
        failedNodes > 0 ||
        submittedNodes > 0 ||
        inProgressNodes > 0
      ) {
        return { status: "In Progress", progress };
      }
      return { status: "Not Started", progress: 0 };
    }

    // For enrolled maps without real-time progress (fallback), use enrollment progress
    if ("isEnrolled" in map && map.isEnrolled) {
      const progress = map.enrollment.progress_percentage;
      if (progress === 0) return { status: "Not Started", progress: 0 };
      if (progress < 100) return { status: "In Progress", progress };
      return { status: "Completed", progress: 100 };
    }

    // For non-enrolled maps, show as "Not Started"
    return { status: "Not Started", progress: 0 };
  };

  return (
    <div className="container py-10 px-4 md:px-6">
      {/* Welcome Section */}
      <div className="mb-12">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, {user?.user_metadata?.name || "Passion Explorer"}! 🌱
          </h1>
          <p className="text-xl text-muted-foreground">
            Let's nurture your passion tree and watch it grow
          </p>
        </div>
        <div className="mt-6">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700"
          >
            <Link href="/me" className="flex items-center gap-2">
              See Your Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card className="bg-gradient-to-br from-purple-950 to-violet-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Flame className="mr-2 h-5 w-5 text-red-400" />
              Passion Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Growth Progress</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-900 to-purple-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <BookOpen className="mr-2 h-5 w-5 text-yellow-400" />
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Streak</span>
                <span>5 days</span>
              </div>
              <Progress value={50} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-800 to-violet-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Users className="mr-2 h-5 w-5 text-blue-400" />
              Community Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Contributions</span>
                <span>12</span>
              </div>
              <Progress value={60} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Maps Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Learning Maps</h2>
          <Button variant="ghost" asChild>
            <Link href="/map" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <LearningMapsSkeleton />
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-destructive mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2 text-destructive">
                Failed to Load Maps
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                {error}
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : enrolledMaps.length > 0 || availableMaps.length > 0 ? (
          <div className="space-y-8">
            {/* Enrolled Maps Section */}
            {enrolledMaps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Continue Learning
                </h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {enrolledMaps
                    .filter((map) => map && map.id && map.title)
                    .map((map) => {
                      const { status, progress } = getProgressStatus(map);
                      return (
                        <Link key={map.id} href={`/map/${map.id}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-primary/20">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                  {map.title}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Map className="h-4 w-4" />
                                  <span>{map.node_count}</span>
                                </div>
                              </div>
                              <CardDescription>
                                {map.description ||
                                  "Embark on an exciting learning journey through interactive islands"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Progress
                                  </span>
                                  <span className="font-medium">
                                    {progress}%
                                  </span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                {/* Real-time progress details */}
                                {map.realTimeProgress && (
                                  <div className="text-xs text-muted-foreground">
                                    {map.realTimeProgress.passedNodes > 0 && (
                                      <span className="text-green-600">
                                        {map.realTimeProgress.passedNodes}{" "}
                                        passed
                                      </span>
                                    )}
                                    {map.realTimeProgress.submittedNodes >
                                      0 && (
                                      <span className="text-blue-600 ml-2">
                                        {map.realTimeProgress.submittedNodes}{" "}
                                        submitted
                                      </span>
                                    )}
                                    {map.realTimeProgress.inProgressNodes >
                                      0 && (
                                      <span className="text-orange-600 ml-2">
                                        {map.realTimeProgress.inProgressNodes}{" "}
                                        in progress
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <Badge
                                    variant={
                                      status === "In Progress"
                                        ? "default"
                                        : status === "Completed"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {status}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Sparkles className="h-3 w-3" />
                                    <span>{map.total_assessments} Quests</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Available Maps Section */}
            {availableMaps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Compass className="h-5 w-5" />
                  Discover New Adventures
                </h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {availableMaps
                    .slice(0, 6)
                    .filter((map) => map && map.id && map.title)
                    .map((map) => (
                      <Link key={map.id} href={`/map/${map.id}`}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {map.title}
                              </CardTitle>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Map className="h-4 w-4" />
                                <span>{map.node_count}</span>
                              </div>
                            </div>
                            <CardDescription>
                              {map.description ||
                                "Embark on an exciting learning journey through interactive islands"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <Badge variant="outline" className="text-xs">
                                  Start Adventure
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{map.total_assessments} Quests</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Map className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Learning Maps Yet
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                Discover interactive learning adventures with gamified islands
                and quests.
              </p>
              <Button asChild>
                <Link href="/map">Explore Maps</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Classrooms Section */}
      <ClassroomSection />

      {/* Recommended Workshops */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Workshops for You
          </h2>
          <Button variant="ghost" asChild>
            <Link href="/workshops" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Advanced JavaScript Patterns",
              description: "Master modern JavaScript techniques",
              category: "Build",
              date: "Starting in 2 days",
            },
            {
              title: "Creative UI Design",
              description: "Learn the principles of beautiful design",
              category: "Inspire",
              date: "Starting tomorrow",
            },
            {
              title: "Community Leadership",
              description: "Become an effective community leader",
              category: "Scale",
              date: "Starting next week",
            },
          ].map((workshop, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{workshop.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      workshop.category === "Inspire"
                        ? "bg-yellow-600 text-white border-none"
                        : workshop.category === "Build"
                          ? "bg-orange-600 text-white border-none"
                          : "bg-red-600 text-white border-none"
                    }
                  >
                    {workshop.category}
                  </Badge>
                </div>
                <CardDescription>{workshop.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{workshop.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Discover Communities */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Discover Communities
          </h2>
          <Button variant="ghost" asChild>
            <Link href="/communities" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "JavaScript Developers",
              members: 1250,
              description: "Share knowledge and build amazing things together",
              tag: "Technology",
            },
            {
              name: "Creative Designers",
              members: 980,
              description: "Explore design principles and share your work",
              tag: "Design",
            },
            {
              name: "Community Builders",
              members: 750,
              description: "Learn how to build and grow communities",
              tag: "Leadership",
            },
          ].map((community, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{community.name}</CardTitle>
                  <Badge variant="secondary">{community.tag}</Badge>
                </div>
                <CardDescription>{community.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{community.members.toLocaleString()} members</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
