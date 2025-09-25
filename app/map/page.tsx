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
import { LearningMap } from "@/types/map";
import { useToast } from "@/components/ui/use-toast";
import { MapEnrollmentDialog } from "@/components/map/MapEnrollmentDialog";
import { AnimatedMapPreview } from "@/components/map/AnimatedMapPreview";
import { useAuth } from "@/hooks/use-auth";
import Loading from "./loading";
import { MapSkeleton } from "./map-skeleton";
import Image from "next/image";
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
  isEnrolled: boolean;
  hasStarted: boolean;
  map_type: "personal" | "classroom" | "classroom_exclusive" | "team" | "forked" | "public";
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedMapForEnrollment, setSelectedMapForEnrollment] =
    useState<MapWithStats | null>(null);
  const [selectedMapForPreview, setSelectedMapForPreview] = 
    useState<MapWithStats | null>(null);
  const { toast } = useToast();

  // Use our new auth hook
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        // OPTIMIZATION: Start fetching immediately, don't wait for auth to complete
        const fetchedMaps = await getMapsWithStats();

        // Additional safety filter to remove any null or invalid maps
        const validMaps = fetchedMaps.filter(
          (map) => map && map.id && map.title
        );

        // Maps now include enrollment status from the server
        setMaps(validMaps);
      } catch (err) {
        console.error("Error fetching maps:", err);
        toast({
          title: "Error",
          description: "Failed to load learning maps.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    // OPTIMIZATION: Start fetching maps immediately, concurrent with auth loading
    fetchMaps();
  }, [toast]);

  const handleStartAdventure = (map: MapWithStats, event?: React.MouseEvent) => {
    event?.preventDefault(); // Prevent Link navigation

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
      case "classroom_exclusive":
        return {
          title: "Classroom Exclusive Maps",
          icon: School,
          description: "Maps created exclusively for classrooms",
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

    // Group classroom maps by classroom name (both regular and exclusive)
    const classroomSections: any[] = [];
    const allClassroomMaps = [...(grouped["classroom"] || []), ...(grouped["classroom_exclusive"] || [])];
    
    if (allClassroomMaps.length > 0) {
      const classroomGroups = allClassroomMaps.reduce((acc, map) => {
        const classroomName = map.source_info?.classroom_name || "Unknown Classroom";
        if (!acc[classroomName]) acc[classroomName] = [];
        acc[classroomName].push(map);
        return acc;
      }, {} as Record<string, MapWithStats[]>);

      Object.entries(classroomGroups).forEach(([classroomName, classroomMaps]) => {
        const regularMaps = classroomMaps.filter(m => m.map_type === "classroom");
        const exclusiveMaps = classroomMaps.filter(m => m.map_type === "classroom_exclusive");
        
        classroomSections.push({
          type: "classroom",
          classroomName,
          maps: classroomMaps,
          regularMapsCount: regularMaps.length,
          exclusiveMapsCount: exclusiveMaps.length,
          title: `Classroom: ${classroomName}`,
          icon: School,
          description: `${regularMaps.length} linked maps, ${exclusiveMaps.length} exclusive maps`,
          bgColor: "from-green-900/50 to-emerald-900/50",
          borderColor: "border-green-600/30",
          iconColor: "text-green-400",
        });
      });
    }

    // Order the sections (excluding classroom since we handle it separately)
    const orderedTypes = ["personal", "team", "forked", "public"];
    const regularSections = orderedTypes
      .filter((type) => grouped[type]?.length > 0)
      .map((type) => ({
        type,
        maps: grouped[type],
        ...getMapTypeInfo(type),
      }));

    // Return classroom sections first, then regular sections
    return [...classroomSections, ...regularSections];
  };

  const extractColorsFromImage = (coverImage: string): Promise<Array<{r: number, g: number, b: number, luminance: number}>> => {
    return new Promise((resolve) => {
      // Check if we're running on the client side
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        // Return fallback colors for SSR
        resolve([
          { r: 100, g: 100, b: 100, luminance: 100 },
          { r: 60, g: 60, b: 60, luminance: 60 },
          { r: 30, g: 30, b: 30, luminance: 30 }
        ]);
        return;
      }
      
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve([
              { r: 100, g: 100, b: 100, luminance: 100 },
              { r: 60, g: 60, b: 60, luminance: 60 },
              { r: 30, g: 30, b: 30, luminance: 30 }
            ]);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.drawImage(img, 0, 0);
        
        // Sample colors from different areas of the image
        const colors = [];
        const samplePoints = [
          { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.2 },
          { x: 0.2, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.5 },
          { x: 0.2, y: 0.8 }, { x: 0.5, y: 0.8 }, { x: 0.8, y: 0.8 }
        ];
        
        for (const point of samplePoints) {
          const x = Math.floor(point.x * canvas.width);
          const y = Math.floor(point.y * canvas.height);
          const pixelData = ctx?.getImageData(x, y, 1, 1).data;
          
          if (pixelData) {
            const [r, g, b, a] = pixelData;
            if (a > 0) { // Only non-transparent pixels
              colors.push({ r, g, b, luminance: (r * 0.299 + g * 0.587 + b * 0.114) });
            }
          }
        }
        
        // Sort by luminance and pick diverse colors
        colors.sort((a, b) => a.luminance - b.luminance);
        
        const selectedColors = [];
        if (colors.length >= 3) {
          selectedColors.push(colors[0]); // Darkest
          selectedColors.push(colors[Math.floor(colors.length / 2)]); // Medium
          selectedColors.push(colors[colors.length - 1]); // Brightest
        } else if (colors.length > 0) {
          selectedColors.push(...colors);
        }
        
        resolve(selectedColors);
        } catch (error) {
          // If any canvas operations fail, return fallback colors
          resolve([
            { r: 100, g: 100, b: 100, luminance: 100 },
            { r: 60, g: 60, b: 60, luminance: 60 },
            { r: 30, g: 30, b: 30, luminance: 30 }
          ]);
        }
      };
      
      img.onerror = () => {
        // Fallback colors if image loading fails
        resolve([
          { r: 100, g: 100, b: 100, luminance: 100 },
          { r: 60, g: 60, b: 60, luminance: 60 },
          { r: 30, g: 30, b: 30, luminance: 30 }
        ]);
      };
      
      img.src = coverImage;
    });
  };

  const getVinylColorsFromCover = async (coverImage: string) => {
    try {
      const colors = await extractColorsFromImage(coverImage);
      
      // Ensure we have at least 3 colors
      const fallbackColors = [
        { r: 100, g: 100, b: 100 },
        { r: 60, g: 60, b: 60 },
        { r: 30, g: 30, b: 30 }
      ];
      
      const selectedColors = colors.length >= 3 ? colors : fallbackColors;
      
      // Create a vinyl-appropriate gradient with 3 colors from the cover
      const color1 = selectedColors[0];
      const color2 = selectedColors[Math.floor(selectedColors.length / 2)];
      const color3 = selectedColors[selectedColors.length - 1];
      
      const bg = `linear-gradient(135deg, rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.9), rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.8), rgba(${color3.r}, ${color3.g}, ${color3.b}, 0.9))`;
      
      // Use the brightest color for grooves and label
      const brightColor = selectedColors[selectedColors.length - 1];
      const grooveColor = `rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.6)`;
      
      return {
        bg,
        grooveStyle: { borderColor: grooveColor },
        labelStyle: { 
          background: `linear-gradient(135deg, rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.8), rgba(${Math.max(0, brightColor.r-50)}, ${Math.max(0, brightColor.g-50)}, ${Math.max(0, brightColor.b-50)}, 0.9))`,
          borderColor: `rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.7)`
        }
      };
    } catch (error) {
      console.error('Color extraction failed:', error);
      // Fallback
      return {
        bg: 'linear-gradient(135deg, rgba(100, 100, 100, 0.8), rgba(60, 60, 60, 0.9), rgba(30, 30, 30, 1))',
        grooveStyle: { borderColor: 'rgba(156, 163, 175, 0.6)' },
        labelStyle: { 
          background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
          borderColor: '#b91c1c'
        }
      };
    }
  };

  const MapCard = ({ map }: { map: MapWithStats }) => {
    const cardRouter = useRouter();
    const [vinylColors, setVinylColors] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (isMounted && map.metadata?.coverImage) {
        // OPTIMIZATION: Use requestIdleCallback to defer color extraction
        const extractColors = () => {
          if (map.metadata?.coverImage) {
            getVinylColorsFromCover(map.metadata.coverImage).then(setVinylColors);
          }
        };

        if ('requestIdleCallback' in window) {
          requestIdleCallback(extractColors, { timeout: 1000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(extractColors, 100);
        }
      }
    }, [isMounted, map.metadata?.coverImage]);

    const handleMapClick = (e: React.MouseEvent) => {
      e.preventDefault();
      // Temporarily navigate directly to map instead of showing preview
      cardRouter.push(`/map/${map.id}`);
    };

    return (
      <div 
        onClick={handleMapClick}
        className="block group cursor-pointer"
      >
        <div className="relative w-80 h-80 cursor-pointer perspective-1000">
          {/* Vinyl Record - Behind Cover */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-16 w-72 h-72 transition-all duration-700 group-hover:-translate-y-20" style={{ zIndex: 1 }}>
            <div className="relative w-full h-full">
              {/* Vinyl Record */}
              <div className={`vinyl-record w-full h-full rounded-full shadow-2xl border-4 relative overflow-hidden ${
                !map.metadata?.coverImage ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800 border-gray-700' : 'border-opacity-70'
              }`} style={vinylColors ? {
                background: vinylColors.bg
              } : {}}>
                
                {/* Vinyl Grooves */}
                <div className="absolute inset-4 rounded-full border opacity-40" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.5)' }
                } />
                <div className="absolute inset-8 rounded-full border opacity-25" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.3)' }
                } />
                <div className="absolute inset-12 rounded-full border opacity-15" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.2)' }
                } />
                <div className="absolute inset-16 rounded-full border opacity-10" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.1)' }
                } />
                
                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 flex items-center justify-center shadow-lg" style={
                  vinylColors?.labelStyle ? vinylColors.labelStyle : { 
                    background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                    borderColor: '#b91c1c'
                  }
                }>
                  <div className="w-6 h-6 bg-black rounded-full shadow-inner" />
                </div>

                {/* Vinyl Reflection */}
                <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />
                
                {/* Curved "Click to Play" text that appears on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <svg className="w-full h-full" viewBox="0 0 288 288">
                    <defs>
                      <path id="circle-path" d="M 144,144 m -128,0 a 128,128 0 1,1 256,0 a 128,128 0 1,1 -256,0" />
                    </defs>
                    <text className="text-white/60 text-sm font-thin tracking-widest uppercase fill-white/60">
                      <textPath href="#circle-path" startOffset="0%">
                        click to play • click to play • click to play • click to play • click to play • click to play • 
                      </textPath>
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Album Cover */}
          <div className="relative w-full h-full transform-style-preserve-3d transition-all duration-700" style={{ zIndex: 10 }}>
            <div className="album-cover absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-lg shadow-2xl border border-slate-600 overflow-hidden transform-gpu">
              
              {/* Cover Image or Default Background */}
              {map.metadata?.coverImage ? (
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <Image
                    src={map.metadata.coverImage}
                    alt={map.title}
                    fill
                    className="object-cover"
                  />
                  {/* Dark gradient overlay at bottom for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 via-black/10 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-indigo-500/30" />
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
                                    radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                  }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              )}

              {/* Cover Content - Reference Image Style */}
              <div className="relative z-10 h-full flex flex-col">
                
                {/* Title at bottom - League Gothic font */}
                <div className="mt-auto p-6">
                  <h3 style={{ fontFamily: 'League Gothic' }} className={`font-black text-white leading-none mb-2 tracking-wider uppercase ${
                    map.title.length > 20 
                      ? 'text-2xl' 
                      : map.title.length > 16 
                        ? 'text-3xl' 
                        : map.title.length > 12
                          ? 'text-4xl'
                          : map.title.length > 8
                            ? 'text-5xl'
                            : 'text-6xl'
                  }`}>
                    {map.title}
                  </h3>
                  <div className={`text-gray-300 font-medium ${
                    (map.description || "Learning adventure awaits").length > 50 
                      ? 'text-sm' 
                      : 'text-lg'
                  }`}>
                    {map.description || "Learning adventure awaits"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMapsSections = () => {
    const sections = groupMapsByType(maps);

    if (sections.length === 0) return null;

    return sections.map((section, index) => (
      <div key={section.classroomName ? `${section.type}-${section.classroomName}` : section.type || `section-${index}`} className="space-y-6">
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

        {/* Maps Grid - Adjusted for vinyl records */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 justify-items-center" style={{marginTop: '5rem'}}>
          {/* OPTIMIZATION: Show skeleton while maps are loading in each section */}
          {initialLoad && section.maps.length === 0 ? (
            <MapSkeleton />
          ) : (
            section.maps.map((map) => (
              <MapCard key={map.id} map={map} />
            ))
          )}
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
            <div className="flex items-center justify-center gap-4 mb-4">
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

        {/* Animated Map Preview */}
        <AnimatedMapPreview
          map={selectedMapForPreview}
          isOpen={!!selectedMapForPreview}
          onClose={() => setSelectedMapForPreview(null)}
          onStartAdventure={handleStartAdventure}
        />

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
