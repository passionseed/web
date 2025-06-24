"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Link2 } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { getReflectionTimeline } from "@/lib/supabase/reflection";
import { EmotionType, ReflectionTimelineNode } from "@/types/reflection";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { findReflectionConnections, getConnectionColor } from "@/lib/utils/reflection-connections";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<ReflectionTimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredReflection, setHoveredReflection] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [parent] = useAutoAnimate();
  
  // Calculate connections between reflections
  const connections = useMemo(() => {
    return findReflectionConnections(reflections);
  }, [reflections]);
  
  // Track reflections positions for drawing connections
  const [reflectionPositions, setReflectionPositions] = useState<Record<string, DOMRect>>({});

  const fetchReflections = useCallback(async () => {
    try {
      console.log("Starting to fetch reflections...");
      setLoading(true);

      // Use the client-side version of getReflectionTimeline
      const data = await getReflectionTimeline();
      console.log("Reflections data received:", data);

      if (Array.isArray(data)) {
        setReflections(data);
      } else {
        console.error("Unexpected data format:", data);
        throw new Error("Invalid data format received");
      }
    } catch (error) {
      console.error("Error fetching reflections:", error);
      toast({
        title: "Error",
        description: "Failed to load reflections. Please try again.",
        variant: "destructive",
      });
      // Reset to empty array on error
      setReflections([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // For trackpad pinch-to-zoom (Mac)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        setScale((prev) => {
          const newScale = Math.min(Math.max(0.5, prev + delta), 3);
          return newScale;
        });
      }
    };

    // For trackpad pinch-to-zoom (Mac)
    const handleGesture = (e: any) => {
      if (e.scale) {
        e.preventDefault();
        setScale((prev) => {
          // Subtle scaling for better control
          const scaleChange = (e.scale - 1) * 0.5;
          const newScale = Math.min(Math.max(0.5, prev + scaleChange), 3);
          return newScale;
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('gesturechange', handleGesture as EventListener);
    container.addEventListener('gesturestart', (e) => e.preventDefault());
    container.addEventListener('gestureend', (e) => e.preventDefault());

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturechange', handleGesture as EventListener);
      container.removeEventListener('gesturestart', (e) => e.preventDefault());
      container.removeEventListener('gestureend', (e) => e.preventDefault());
    };
  }, []);

  // Update reflection positions when reflections or scale changes
  useEffect(() => {
    if (reflections.length === 0) return;
    
    const updatePositions = () => {
      const newPositions: Record<string, DOMRect> = {};
      reflections.forEach(reflection => {
        const element = document.querySelector(`[data-reflection-id="${reflection.id}"]`);
        if (element) {
          newPositions[reflection.id] = element.getBoundingClientRect();
        }
      });
      setReflectionPositions(newPositions);
    };
    
    // Initial update
    updatePositions();
    
    // Update on window resize
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [reflections, scale, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on a reflection card
    const target = e.target as HTMLElement;
    if (target.closest('[data-reflection-id]')) {
      return;
    }
    
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    const startX = e.pageX - position.x;
    const startY = e.pageY - position.y;

    const onMouseMove = (e: MouseEvent) => {
      const newX = e.pageX - startX;
      const newY = e.pageY - startY;
      setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp, { once: true });
  };
  
  // Handle mouse enter/leave for connection highlighting
  const handleReflectionHover = (reflectionId: string | null) => {
    setHoveredReflection(reflectionId);
  };

  const getEmojiForEmotion = (emotion: string): string => {
    const emotionEmojiMap: Record<string, string> = {
      happy: "😊",
      excited: "🎉",
      grateful: "🙏",
      content: "😌",
      hopeful: "🌟",
      sad: "😢",
      anxious: "😟",
      frustrated: "😤",
      overwhelmed: "😵‍💫",
      tired: "😴",
      neutral: "😐",
      calm: "😌",
      proud: "🦁",
      motivated: "💪",
      creative: "🎨",
      confused: "😕",
      stuck: "🧗",
      bored: "🥱",
      stressed: "😫",
      energized: "⚡",
    };
    return emotionEmojiMap[emotion] || "📝";
  };

  const getEmotionColor = (emotion: string) => {
    // Type assertion to handle potential undefined values
    const emotionKey = emotion as EmotionType;
    const emotionColors: Record<string, string> = {
      happy: "bg-yellow-100 border-yellow-300",
      excited: "bg-pink-100 border-pink-300",
      grateful: "bg-green-100 border-green-300",
      content: "bg-blue-100 border-blue-300",
      hopeful: "bg-purple-100 border-purple-300",
      sad: "bg-gray-100 border-gray-300",
      anxious: "bg-orange-100 border-orange-300",
      frustrated: "bg-red-100 border-red-300",
      overwhelmed: "bg-indigo-100 border-indigo-300",
      tired: "bg-gray-100 border-gray-300",
      neutral: "bg-gray-100 border-gray-300",
      calm: "bg-blue-50 border-blue-200",
      proud: "bg-purple-100 border-purple-300",
      motivated: "bg-green-100 border-green-300",
      creative: "bg-pink-100 border-pink-300",
      confused: "bg-yellow-100 border-yellow-300",
      stuck: "bg-orange-100 border-orange-300",
      bored: "bg-gray-100 border-gray-300",
      stressed: "bg-red-100 border-red-300",
      energized: "bg-yellow-100 border-yellow-300",
    };
    return emotionColors[emotionKey] || "bg-gray-100 border-gray-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && reflections.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Reflections</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Reflection Journey</h1>
        <Button
          onClick={() => router.push("/me/reflection/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Today's Reflection
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
        {/* SVG overlay for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "top left",
          } as React.CSSProperties}
        >
          {connections.map((conn, index) => {
            const sourcePos = reflectionPositions[conn.source];
            const targetPos = reflectionPositions[conn.target];
            
            if (!sourcePos || !targetPos) return null;
            
            // Calculate center points of the reflection cards
            const sourceX = sourcePos.left + sourcePos.width / 2;
            const sourceY = sourcePos.top + sourcePos.height / 2;
            const targetX = targetPos.left + targetPos.width / 2;
            const targetY = targetPos.top + targetPos.height / 2;
            
            // Only draw line if both points are visible
            const isVisible = 
              sourceX > 0 && sourceY > 0 && 
              targetX > 0 && targetY > 0;
              
            if (!isVisible) return null;
            
            // Highlight connections to/from hovered reflection
            const isHighlighted = 
              hoveredReflection && 
              (conn.source === hoveredReflection || conn.target === hoveredReflection);
            
            // Get the first shared tag for coloring
            const sharedTag = reflections
              .find(r => r.id === conn.source)
              ?.tags?.find(tag => conn.tags.includes(tag.id));
            
            const strokeColor = isHighlighted 
              ? sharedTag?.color || '#3b82f6' 
              : '#e2e8f0';
            
            const strokeWidth = isHighlighted ? 2.5 : 1.5;
            const opacity = isHighlighted ? 0.8 : 0.4;
            
            return (
              <line
                key={`${conn.source}-${conn.target}-${index}`}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={isHighlighted ? '0' : '4,4'}
                opacity={opacity}
                className="transition-all duration-200 ease-in-out"
              />
            );
          })}
        </svg>
        
        <motion.div
          className="absolute inset-0 p-8 z-10"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
            width: "100%",
            height: "100%",
            x: position.x,
            y: position.y,
          }}
          animate={{
            x: position.x,
            y: position.y,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex-1 overflow-hidden relative">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-8">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={`skeleton-${i}`} className="h-64">
                      <CardHeader>
                        <Skeleton className="h-6 w-24 mb-2" />
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6 mb-2" />
                        <Skeleton className="h-4 w-4/6 mb-4" />
                        <div className="flex gap-2 mt-4">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : reflections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" x2="8" y1="13" y2="13" />
                    <line x1="16" x2="8" y1="17" y2="17" />
                    <line x1="10" x2="8" y1="9" y2="9" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No reflections yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Start your reflection journey by adding your first entry.
                  Reflect on your day, track your emotions, and discover
                  patterns over time.
                </p>
                <Button onClick={() => router.push("/me/reflection/new")}>
                  <Plus className="mr-2 h-4 w-4" /> Add Reflection
                </Button>
              </div>
            ) : (
              <motion.div
                ref={containerRef}
                className="p-8 w-max"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "top left",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onMouseDown={handleMouseDown}
              >
                <AnimatePresence>
                  {reflections.map((reflection) => (
                    <motion.div
                      key={reflection.id}
                      data-reflection-id={reflection.id}
                      className="w-64 relative group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      layout
                      onMouseEnter={() => handleReflectionHover(reflection.id)}
                      onMouseLeave={() => handleReflectionHover(null)}
                    >
                      {/* Connection indicator dot */}
                      {connections.some(conn => 
                        (conn.source === reflection.id || conn.target === reflection.id) &&
                        (hoveredReflection === null || 
                         conn.source === hoveredReflection || 
                         conn.target === hoveredReflection)
                      ) && (
                        <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></div>
                        </div>
                      )}
                      <Card className="h-full flex flex-col hover:shadow-md transition-shadow group-hover:ring-2 group-hover:ring-blue-400">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">
                                {new Date(reflection.date).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </CardTitle>
                              {connections.some(conn => 
                                (conn.source === reflection.id || conn.target === reflection.id) &&
                                (hoveredReflection === null || 
                                 conn.source === hoveredReflection || 
                                 conn.target === hoveredReflection)
                              ) && (
                                <Link2 className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            {reflection.emotion && (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 ${getEmotionColor(reflection.emotion)}`}
                                title={reflection.emotion}
                              >
                                {getEmojiForEmotion(reflection.emotion)}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-4">
                            {reflection.contentPreview}
                          </p>
                          {reflection.tags && reflection.tags.length > 0 && (
                            <div className="mt-auto flex flex-wrap gap-1">
                              {reflection.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                                  style={{
                                    backgroundColor: `${tag.color}15`,
                                    borderColor: `${tag.color}40`,
                                    color: tag.color,
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {reflection.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{reflection.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="border-t p-2 flex items-center justify-between text-sm text-muted-foreground bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-medium">Zoom:</span>{" "}
            <span>{Math.round(scale * 100)}%</span>
          </div>
          {connections.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/50"></div>
              <span>{connections.length} connection{connections.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="h-8"
          >
            Reset View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Auto-arrange reflections in a grid
              const cols = Math.ceil(Math.sqrt(reflections.length));
              const cardWidth = 288; // w-72 = 288px
              const cardHeight = 200; // Approximate card height
              const padding = 24; // p-6 = 24px
              
              // Center the grid
              const container = containerRef.current;
              if (!container) return;
              
              const containerWidth = container.clientWidth;
              const containerHeight = container.clientHeight;
              
              const gridWidth = cols * (cardWidth + padding);
              const startX = (containerWidth - gridWidth) / 2;
              const startY = (containerHeight - (Math.ceil(reflections.length / cols) * (cardHeight + padding))) / 2;
              
              setPosition({
                x: -startX,
                y: -startY
              });
              
              // Set a good zoom level to see the grid
              setScale(0.8);
            }}
            className="h-8"
          >
            Arrange Grid
          </Button>
        </div>
      </div>
    </div>
  );
}
