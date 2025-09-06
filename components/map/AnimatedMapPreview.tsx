"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  Play,
  X,
  Users,
  Trophy,
  Clock,
  Target,
  BookOpen,
  Star,
  ArrowRight,
  LogIn,
  School,
  GitBranch,
  Globe,
  User,
} from "lucide-react";
import { LearningMap } from "@/types/map";

type MapWithStats = LearningMap & {
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
  isEnrolled: boolean;
  hasStarted: boolean;
  map_type: "personal" | "classroom" | "team" | "forked" | "public";
  source_info?: {
    classroom_name?: string;
    team_name?: string;
    original_title?: string;
  };
};

interface AnimatedMapPreviewProps {
  map: MapWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onStartAdventure?: (map: MapWithStats, event?: React.MouseEvent) => void;
}

export function AnimatedMapPreview({ map, isOpen, onClose, onStartAdventure }: AnimatedMapPreviewProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [vinylColors, setVinylColors] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && map?.metadata?.coverImage) {
      getVinylColorsFromCover(map.metadata.coverImage).then(setVinylColors);
    }
  }, [isMounted, map?.metadata?.coverImage]);

  const extractColorsFromImage = (coverImage: string): Promise<Array<{r: number, g: number, b: number, luminance: number}>> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
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
            if (a > 0) {
              colors.push({ r, g, b, luminance: (r * 0.299 + g * 0.587 + b * 0.114) });
            }
          }
        }
        
        colors.sort((a, b) => a.luminance - b.luminance);
        
        const selectedColors = [];
        if (colors.length >= 3) {
          selectedColors.push(colors[0]);
          selectedColors.push(colors[Math.floor(colors.length / 2)]);
          selectedColors.push(colors[colors.length - 1]);
        } else if (colors.length > 0) {
          selectedColors.push(...colors);
        }
        
        resolve(selectedColors);
        } catch (error) {
          resolve([
            { r: 100, g: 100, b: 100, luminance: 100 },
            { r: 60, g: 60, b: 60, luminance: 60 },
            { r: 30, g: 30, b: 30, luminance: 30 }
          ]);
        }
      };
      
      img.onerror = () => {
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
      
      const fallbackColors = [
        { r: 100, g: 100, b: 100 },
        { r: 60, g: 60, b: 60 },
        { r: 30, g: 30, b: 30 }
      ];
      
      const selectedColors = colors.length >= 3 ? colors : fallbackColors;
      
      const color1 = selectedColors[0];
      const color2 = selectedColors[Math.floor(selectedColors.length / 2)];
      const color3 = selectedColors[selectedColors.length - 1];
      
      const bg = `linear-gradient(135deg, rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.9), rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.8), rgba(${color3.r}, ${color3.g}, ${color3.b}, 0.9))`;
      
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
  
  if (!map) return null;

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

  const getMapTypeInfo = (mapType: string) => {
    switch (mapType) {
      case "personal":
        return { title: "My Map", icon: User, color: "text-blue-400" };
      case "classroom":
        return { title: "Classroom Map", icon: School, color: "text-green-400" };
      case "team":
        return { title: "Team Map", icon: Users, color: "text-purple-400" };
      case "forked":
        return { title: "Forked Map", icon: GitBranch, color: "text-orange-400" };
      default:
        return { title: "Public Map", icon: Globe, color: "text-slate-400" };
    }
  };

  const getCompletionRate = () => {
    if (!map.total_students || map.total_students === 0) return 0;
    return Math.round(
      ((map.finished_students || 0) / map.total_students) * 100
    );
  };

  const handlePlay = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to start your learning adventure.",
        variant: "default",
      });
      router.push("/login");
      return;
    }

    if (map.isEnrolled) {
      // Navigate directly to the map
      router.push(`/map/${map.id}`);
    } else if (onStartAdventure) {
      // Open enrollment dialog
      onStartAdventure(map);
      onClose();
    } else {
      // Fallback: navigate to map page
      router.push(`/map/${map.id}`);
    }
  };

  const difficultyBadge = getDifficultyBadge(map.avg_difficulty);
  const mapTypeInfo = getMapTypeInfo(map.map_type);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />


          {/* Animated Disc Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "50%" }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.6
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            style={{ height: "min(140vw, 140vh)", maxHeight: "1600px" }}
          >
            {/* Disc Background */}
            <div 
              className="relative rounded-full"
              style={{ width: "min(140vw, 140vh)", height: "min(140vw, 140vh)", maxWidth: "1600px", maxHeight: "1600px" }}
            >
              {/* Main Disc */}
              <div className={`absolute inset-0 rounded-full shadow-2xl border-4 overflow-hidden ${
                !map.metadata?.coverImage ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 border-slate-600' : 'border-opacity-70'
              }`}>
                
                {/* Cover Image Background */}
                {map.metadata?.coverImage && (
                  <div 
                    className="absolute inset-0 rounded-full bg-cover bg-center bg-no-repeat opacity-90"
                    style={{
                      backgroundImage: `url(${map.metadata.coverImage})`
                    }}
                  />
                )}
                
                {/* Semi-transparent overlay for better text readability */}
                <div className="absolute inset-0 rounded-full bg-black/40" />

                {/* Vinyl Grooves - More spaced out like real vinyl */}
                <div className="absolute inset-12 rounded-full border-2 opacity-60" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.7)' }
                } />
                <div className="absolute inset-24 rounded-full border-2 opacity-55" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.65)' }
                } />
                <div className="absolute inset-36 rounded-full border-2 opacity-50" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.6)' }
                } />
                <div className="absolute inset-48 rounded-full border-2 opacity-45" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.55)' }
                } />
                <div className="absolute inset-60 rounded-full border-2 opacity-40" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.5)' }
                } />
                <div className="absolute inset-72 rounded-full border-2 opacity-35" style={
                  vinylColors?.grooveStyle ? vinylColors.grooveStyle : { borderColor: 'rgba(156, 163, 175, 0.45)' }
                } />

                {/* Close Button */}
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={onClose}
                  className="absolute top-6 right-6 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center backdrop-blur-sm border border-slate-600 transition-all duration-200 hover:scale-110"
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>

                {/* Title and Description Container */}
                <div className="relative z-10 h-full flex flex-col items-center justify-start p-16">
                  
                  {/* Map Title - Top */}
                  <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mt-12 mb-8"
                  >
                    <h2 className="text-5xl font-bold text-white mb-4 tracking-wide text-center drop-shadow-2xl">
                      {map.title}
                    </h2>
                  </motion.div>

                  {/* Description - Below Title */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mb-8"
                  >
                    <p className="text-gray-200 text-xl text-center drop-shadow-lg">
                      {map.description || "Learning adventure awaits"}
                    </p>
                  </motion.div>
                </div>

                {/* Spinning Reflection Effect */}
                <div className="absolute top-8 left-8 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm animate-pulse" />
              </div>

              {/* Center Play Button - Positioned above the disc */}
              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: "spring", damping: 20 }}
                onClick={handlePlay}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full shadow-2xl border-4 border-red-500 flex items-center justify-center transition-all duration-300 hover:scale-105 cursor-pointer group z-[70] bg-red-500"
              >
                {/* Center Play Icon */}
                <Play className="w-16 h-16 text-white ml-1 group-hover:scale-110 transition-transform" />
              </motion.button>
              
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}