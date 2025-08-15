import { motion } from "framer-motion";
import {
  X,
  HeartPulse,
  Zap,
  Tags,
  Mountain,
  Target,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ReflectionTimelineNode,
  EmotionType,
  ReflectionWithMetrics,
} from "@/types/reflection";
import { getEmotionColor, getEmojiForEmotion } from "@/lib/emotions";
import { useEffect, useState } from "react";
// TODO: Fix reflection system to use client-side API
// import { getReflectionById } from "@/lib/supabase/reflection";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid Date";
  }
};

const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "";
  }
};

// --- COMPONENT INTERFACE ---
interface ExpandedReflectionCardProps {
  reflection: ReflectionWithMetrics;
  onClose: () => void;
}

// --- THE COMPONENT ---
export function ExpandedReflectionCard({
  reflection,
  onClose,
}: ExpandedReflectionCardProps) {
  const [fullReflection, setFullReflection] =
    useState<ReflectionWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFullReflection = async () => {
      if (!reflection.id) return;
      setIsLoading(true);
      try {
        // TODO: Implement client-side reflection API
        // const data = await getReflectionById(reflection.id);
        const data = null; // Temporary
        if (data) {
          setFullReflection(data);
        } else {
          toast({
            title: "Error",
            description: "Could not load reflection content",
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "An error occurred while loading the reflection",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFullReflection();
  }, [reflection.id]);

  const displayReflection = fullReflection || reflection;
  const emotion = displayReflection.emotion as EmotionType;

  const satisfactionValue = displayReflection.metrics?.satisfaction ?? 0;
  const progressValue = displayReflection.metrics?.progress ?? 0;
  const challengeValue = displayReflection.metrics?.challenge ?? 0;
  const projectTags = fullReflection?.project?.tags || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        layoutId={`card-${reflection.id}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-xl shadow-2xl ring-1 ring-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-4 sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b">
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                {formatDate(reflection.created_at)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(reflection.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {emotion && (
                <span
                  className={`inline-flex items-center justify-center w-12 h-12 text-2xl rounded-full border-2 shadow-sm transition-transform hover:scale-105 ${getEmotionColor(emotion)}`}
                  title={emotion}
                >
                  {getEmojiForEmotion(emotion)}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 pt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="mb-6 bg-muted/30 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold mb-2">
                  {fullReflection?.project?.name || "Project Details"}
                </h3>
                {fullReflection?.project?.goal && (
                  <div className="flex items-start gap-3 text-sm">
                    <Target className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Goal:
                      </span>{" "}
                      {fullReflection.project.goal}
                    </p>
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed whitespace-pre-line space-y-4">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-2">
                    What I did today:
                  </h4>
                  <p>{fullReflection?.content}</p>
                </div>
                {fullReflection?.reason && (
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-2">
                      Why I feel this way:
                    </h4>
                    <p>{fullReflection.reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                {/* Metrics Section */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" /> Metrics
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-background rounded-lg">
                      <div className="text-2xl font-bold">
                        {satisfactionValue.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Satisfaction
                      </div>
                    </div>
                    <div className="p-2 bg-background rounded-lg">
                      <div className="text-2xl font-bold">
                        {progressValue.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Progress
                      </div>
                    </div>
                    <div className="p-2 bg-background rounded-lg">
                      <div className="text-2xl font-bold">
                        {challengeValue.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Challenge
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {projectTags.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Tags className="h-4 w-4" /> Project Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {projectTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `${tag.color}1A`,
                            borderColor: `${tag.color}40`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </motion.div>
    </div>
  );
}
("");
