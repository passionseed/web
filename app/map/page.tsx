"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMapsWithStats } from "@/lib/supabase/maps";
import { checkUserEnrollmentStatus } from "@/lib/api/enrollment-client";
import { LearningMap } from "@/types/map";
import { useToast } from "@/components/ui/use-toast";
import { MapEnrollmentDialog } from "@/components/map/MapEnrollmentDialog";
import { useAuth } from "@/hooks/use-auth";
import Loading from "./loading";
import {
  Map,
  Users,
  Trophy,
  Star,
  Zap,
  Target,
  Clock,
  BookOpen,
  Sparkles,
  Crown,
  Compass,
  Plus,
  ArrowRight,
  LogIn,
  Lock,
  School,
  GitBranch,
  Globe,
  User,
} from "lucide-react";

type MapWithStats = LearningMap & {
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
  isEnrolled?: boolean;
  hasStarted?: boolean;
  map_type: "personal" | "classroom" | "team" | "forked" | "public";
  source_info?: {
    classroom_name?: string;
    team_name?: string;
    original_title?: string;
  };
};

export default function MapsPage() {
  const router = useRouter();
  const [maps, setMaps] = useState<MapWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapForEnrollment, setSelectedMapForEnrollment] =
    useState<MapWithStats | null>(null);
  const { toast } = useToast();

  // Use our new auth hook
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const fetchedMaps = await getMapsWithStats();

        // Additional safety filter to remove any null or invalid maps
        const validMaps = fetchedMaps.filter(
          (map) => map && map.id && map.title
        );

        // Check enrollment status for each map (only for authenticated users)
        const mapsWithEnrollment = await Promise.all(
          validMaps.map(async (map) => {
            // Only check enrollment if user is authenticated
            if (isAuthenticated && !authLoading) {
              try {
                const { isEnrolled, hasStarted } =
                  await checkUserEnrollmentStatus(map.id);
                return { ...map, isEnrolled, hasStarted };
              } catch (err) {
                console.warn(
                  `Failed to check enrollment for map ${map.id}:`,
                  err
                );
                // If there's an error checking enrollment, assume not enrolled
                return { ...map, isEnrolled: false, hasStarted: false };
              }
            } else {
              // For unauthenticated users, set enrollment to false
              return { ...map, isEnrolled: false, hasStarted: false };
            }
          })
        );

        setMaps(mapsWithEnrollment);
      } catch (err) {
        console.error("Error fetching maps:", err);
        toast({
          title: "Error",
          description: "Failed to load learning maps.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Only fetch maps after auth loading is complete
    if (!authLoading) {
      fetchMaps();
    }
  }, [toast, isAuthenticated, authLoading]);

  const handleStartAdventure = (map: MapWithStats, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent Link navigation

    // Check authentication before allowing enrollment
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to start your learning adventure.",
        variant: "default",
      });
      router.push("/login");
      return;
    }

    setSelectedMapForEnrollment(map);
  };

  const handleCreateNewMap = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to create learning maps.",
        variant: "default",
      });
      router.push("/login");
      return;
    }
    router.push("/map/new");
  };

  const handleEnrollmentSuccess = () => {
    if (selectedMapForEnrollment) {
      // Update local state to reflect enrollment
      setMaps((prevMaps) =>
        prevMaps.map((map) =>
          map.id === selectedMapForEnrollment.id
            ? { ...map, isEnrolled: true, hasStarted: false }
            : map
        )
      );
    }
  };

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty <= 3)
      return {
        label: "Beginner",
        className: "bg-green-600 text-green-100 border-green-500",
      };
    if (difficulty <= 6)
      return {
        label: "Intermediate",
        className: "bg-yellow-600 text-yellow-100 border-yellow-500",
      };
    if (difficulty <= 8)
      return {
        label: "Advanced",
        className: "bg-orange-600 text-orange-100 border-orange-500",
      };
    return {
      label: "Expert",
      className: "bg-red-600 text-red-100 border-red-500",
    };
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "ai":
        return "🤖";
      case "3d":
        return "🎮";
      case "unity":
        return "🕹️";
      case "hacking":
        return "🔐";
      default:
        return "🗺️";
    }
  };

  const getCompletionRate = (map: MapWithStats) => {
    if (!map.total_students || map.total_students === 0) return 0;
    return Math.round(
      ((map.finished_students || 0) / map.total_students) * 100
    );
  };

  const getMapTypeInfo = (mapType: string) => {
    switch (mapType) {
      case "personal":
        return {
          title: "My Maps",
          icon: User,
          description: "Maps you created",
          bgColor: "from-blue-900/50 to-indigo-900/50",
          borderColor: "border-blue-600/30",
          iconColor: "text-blue-400",
        };
      case "classroom":
        return {
          title: "Classroom Maps",
          icon: School,
          description: "Learning maps assigned by instructors",
          bgColor: "from-green-900/50 to-emerald-900/50",
          borderColor: "border-green-600/30",
          iconColor: "text-green-400",
        };
      case "team":
        return {
          title: "Team Maps",
          icon: Users,
          description: "Collaborative maps for your team",
          bgColor: "from-purple-900/50 to-violet-900/50",
          borderColor: "border-purple-600/30",
          iconColor: "text-purple-400",
        };
      case "forked":
        return {
          title: "Forked Maps",
          icon: GitBranch,
          description: "Maps you forked and customized",
          bgColor: "from-orange-900/50 to-amber-900/50",
          borderColor: "border-orange-600/30",
          iconColor: "text-orange-400",
        };
      default:
        return {
          title: "Public Maps",
          icon: Globe,
          description: "Community learning maps",
          bgColor: "from-slate-900/50 to-gray-900/50",
          borderColor: "border-slate-600/30",
          iconColor: "text-slate-400",
        };
    }
  };

  const groupMapsByType = (maps: MapWithStats[]) => {
    const grouped = maps.reduce(
      (acc, map) => {
        const type = map.map_type || "public";
        if (!acc[type]) acc[type] = [];
        acc[type].push(map);
        return acc;
      },
      {} as Record<string, MapWithStats[]>
    );

    // Order the sections
    const orderedTypes = ["personal", "classroom", "team", "forked", "public"];
    return orderedTypes
      .filter((type) => grouped[type]?.length > 0)
      .map((type) => ({
        type,
        maps: grouped[type],
        ...getMapTypeInfo(type),
      }));
  };

  const renderMapCard = (map: MapWithStats) => {
    const difficultyInfo = getDifficultyBadge(map.avg_difficulty);
    const completionRate = getCompletionRate(map);
    const categoryIcon = getCategoryIcon(map.category);

    return (
      <Card
        key={map.id}
        className="group relative overflow-hidden hover:shadow-2xl hover:shadow-blue-900/50 transition-all duration-500 hover:scale-105 bg-slate-800/80 backdrop-blur-sm border-2 border-slate-700 hover:border-blue-500/50"
      >
        {/* Floating Islands Background Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-4 right-4 w-8 h-8 bg-blue-400/20 rounded-full animate-float" />
          <div className="absolute bottom-8 left-6 w-6 h-6 bg-purple-400/20 rounded-full animate-float-particle-1" />
          <div className="absolute top-1/2 left-2 w-4 h-4 bg-indigo-400/20 rounded-full animate-float-particle-2" />
        </div>

        <CardHeader className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-800/50 to-purple-800/50 rounded-full flex items-center justify-center text-2xl border border-blue-600/30">
                {categoryIcon}
              </div>
              <div>
                <CardTitle className="text-xl group-hover:text-blue-300 transition-colors text-gray-100">
                  {map.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${difficultyInfo.className}`}>
                    {difficultyInfo.label}
                  </Badge>
                  {map.isEnrolled && !map.hasStarted && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-900/20 text-green-400 border-green-500/50"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      Enrolled
                    </Badge>
                  )}
                  {map.isEnrolled && map.hasStarted && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-900/20 text-blue-400 border-blue-500/50"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Started
                    </Badge>
                  )}
                  {map.node_count > 10 && (
                    <Badge
                      variant="outline"
                      className="text-xs border-yellow-500/50 text-yellow-400 bg-yellow-900/20"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Epic
                    </Badge>
                  )}
                  {map.source_info?.classroom_name && (
                    <Badge
                      variant="outline"
                      className="text-xs border-green-500/50 text-green-300 bg-green-900/20"
                    >
                      {map.source_info.classroom_name}
                    </Badge>
                  )}
                  {map.source_info?.team_name && (
                    <Badge
                      variant="outline"
                      className="text-xs border-purple-500/50 text-purple-300 bg-purple-900/20"
                    >
                      {map.source_info.team_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CardDescription className="text-sm leading-relaxed text-gray-400">
            {map.description ||
              "Embark on an exciting learning journey through interactive islands"}
            {map.source_info?.original_title && (
              <span className="block text-xs text-amber-400 mt-1">
                Forked from: {map.source_info.original_title}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 p-2 bg-blue-900/30 rounded-lg border border-blue-700/30">
              <Map className="h-4 w-4 text-blue-400" />
              <div>
                <div className="font-medium text-blue-200">
                  {map.node_count}
                </div>
                <div className="text-blue-400 text-xs">Islands</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-900/30 rounded-lg border border-green-700/30">
              <Target className="h-4 w-4 text-green-400" />
              <div>
                <div className="font-medium text-green-200">
                  {map.total_assessments}
                </div>
                <div className="text-green-400 text-xs">Quests</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-900/30 rounded-lg border border-purple-700/30">
              <Star className="h-4 w-4 text-purple-400" />
              <div>
                <div className="font-medium text-purple-200">
                  {map.avg_difficulty}/10
                </div>
                <div className="text-purple-400 text-xs">Challenge</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-900/30 rounded-lg border border-orange-700/30">
              <Users className="h-4 w-4 text-orange-400" />
              <div>
                <div className="font-medium text-orange-200">
                  {map.total_students || 0}
                </div>
                <div className="text-orange-400 text-xs">Explorers</div>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          {map.total_students && map.total_students > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Completion Rate
                </span>
                <span className="font-medium text-gray-200">
                  {completionRate}%
                </span>
              </div>
              <Progress value={completionRate} className="h-2 bg-slate-700" />
            </div>
          )}

          {/* Action Button */}
          <div className="relative">
            {map.isEnrolled ? (
              <Link href={`/map/${map.id}`} className="block">
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 group-hover:shadow-xl group-hover:shadow-green-900/60 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-green-500/30 hover:border-green-400/50">
                  {map.hasStarted ? (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Continue Adventure
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Adventure
                    </>
                  )}
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : isAuthenticated ? (
              <Button
                onClick={(e) => handleStartAdventure(map, e)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 group-hover:shadow-xl group-hover:shadow-blue-900/60 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-blue-500/30 hover:border-blue-400/50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Adventure
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button
                onClick={(e) => handleStartAdventure(map, e)}
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-700/50 text-slate-300 hover:text-slate-200 group-hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login to Start Adventure
                <Lock className="h-4 w-4 ml-2" />
              </Button>
            )}

            {/* Backup Link - for those who prefer direct navigation */}
            <Link
              href={`/map/${map.id}`}
              className="absolute inset-0 opacity-0 pointer-events-none"
            >
              <span className="sr-only">Go to {map.title}</span>
            </Link>
          </div>
        </CardContent>

        {/* Floating Achievement Badge */}
        {completionRate >= 80 && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Crown className="h-4 w-4 text-white" />
          </div>
        )}
      </Card>
    );
  };

  const renderMapsSections = () => {
    const sections = groupMapsByType(maps);

    if (sections.length === 0) return null;

    return sections.map((section) => (
      <div key={section.type} className="space-y-6">
        {/* Section Header */}
        <div
          className={`bg-gradient-to-r ${section.bgColor} rounded-lg border ${section.borderColor} p-6`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border ${section.borderColor}`}
            >
              <section.icon className={`h-6 w-6 ${section.iconColor}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {section.title}
              </h2>
              <p className="text-sm text-gray-300">
                {section.description} • {section.maps.length} maps
              </p>
            </div>
          </div>
        </div>

        {/* Maps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {section.maps.map(renderMapCard)}
        </div>
      </div>
    ));
  };

  if (loading || authLoading) {
    return <Loading />;
  }

  if (!maps || maps.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-full flex items-center justify-center border border-blue-600/30">
            <Map className="h-12 w-12 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-4 text-gray-100">
            No Learning Maps Available
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Start your learning adventure by creating your first interactive map
            with floating islands and gamified content.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-900/50"
          >
            <Link href="/map/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Map
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 text-white border-b border-blue-800/50">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-400/30">
                <Compass className="h-8 w-8 text-blue-300" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Learning Maps
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-blue-200 mb-8">
              Navigate through gamified learning adventures on floating islands
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-blue-800/50 hover:bg-blue-700/60 backdrop-blur-sm border-blue-400/30 text-blue-100"
                onClick={isAuthenticated ? undefined : handleCreateNewMap}
              >
                {isAuthenticated ? (
                  <Link href="/map/new" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Map
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer">
                    <LogIn className="h-4 w-4" />
                    Login to Create Maps
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Maps by Category */}
      <div className="container mx-auto px-6 py-12 space-y-12">
        {renderMapsSections()}

        {/* Create New Map CTA */}
        <div className="mt-16 text-center">
          <Card className="max-w-md mx-auto bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-dashed border-slate-600 hover:border-slate-500 transition-colors backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-800/50 to-purple-800/50 rounded-full flex items-center justify-center border border-indigo-600/30">
                <Plus className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-100">
                Create Your Own Map
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Design interactive learning experiences with gamified islands
                and assessments
              </p>
              <Button
                asChild={isAuthenticated}
                variant="outline"
                className="border-slate-600 hover:bg-slate-700 text-gray-200 hover:text-gray-100"
                onClick={isAuthenticated ? undefined : handleCreateNewMap}
              >
                {isAuthenticated ? (
                  <Link href="/map/new">Create New Map</Link>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer">
                    <LogIn className="h-4 w-4" />
                    Login to Create Maps
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Enrollment Dialog */}
        {selectedMapForEnrollment && (
          <MapEnrollmentDialog
            isOpen={!!selectedMapForEnrollment}
            onOpenChange={(open) => !open && setSelectedMapForEnrollment(null)}
            map={selectedMapForEnrollment}
            onEnrollmentSuccess={handleEnrollmentSuccess}
          />
        )}
      </div>
    </div>
  );
}
