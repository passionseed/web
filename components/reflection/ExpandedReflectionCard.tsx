import { motion } from "framer-motion";
import { X, HeartPulse, Zap, Tags, Mountain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReflectionTimelineNode, EmotionType, ReflectionWithMetrics } from "@/types/reflection";
import { getEmotionColor, getEmojiForEmotion } from "@/lib/emotions";
import { useEffect, useState } from "react";
import { getReflectionById } from "@/lib/supabase/reflection";
import { toast } from "@/components/ui/use-toast";

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
    console.error("Error formatting date:", error);
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
    console.error("Error formatting time:", error);
    return "";
  }
};

// --- COMPONENT INTERFACE ---
interface ExpandedReflectionCardProps {
  reflection: ReflectionTimelineNode;
  onClose: () => void;
}

// --- THE COMPONENT ---
export function ExpandedReflectionCard({
  reflection,
  onClose,
}: ExpandedReflectionCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fullReflection, setFullReflection] = useState<ReflectionWithMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch full reflection data when component mounts
  useEffect(() => {
    const fetchFullReflection = async () => {
      if (!reflection.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getReflectionById(reflection.id);
        if (data) {
          setFullReflection(data);
        } else {
          setError('Failed to load reflection content');
          toast({
            title: 'Error',
            description: 'Could not load reflection content',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Error fetching reflection:', err);
        setError('An error occurred while loading the reflection');
        toast({
          title: 'Error',
          description: 'An error occurred while loading the reflection',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullReflection();
  }, [reflection.id]);

  // Use full reflection data if available, otherwise fall back to the preview data
  const displayReflection = fullReflection || reflection;
  const emotion = displayReflection.emotion as EmotionType;
  
  // Use robust data access: prefer metrics object, fallback to top-level property
  const satisfactionValue =
    displayReflection.metrics?.satisfaction ?? displayReflection.satisfaction ?? 0;
  const engagementValue =
    displayReflection.metrics?.engagement ?? displayReflection.engagement ?? 0;
  const challengeValue = 
    displayReflection.metrics?.challenge ?? displayReflection.challenge ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
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
                {formatDate(reflection.date)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(reflection.date)}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`inline-flex items-center justify-center w-12 h-12 text-2xl rounded-full border-2 shadow-sm transition-transform hover:scale-105 ${getEmotionColor(emotion)}`}
                title={emotion}
              >
                {getEmojiForEmotion(emotion)}
              </span>
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
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed whitespace-pre-line">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading reflection...</span>
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                <p className="mb-2 font-medium">Error loading content</p>
                <p className="text-sm">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Showing preview instead
                </p>
                <p className="mt-2 text-muted-foreground">{reflection.contentPreview}</p>
              </div>
            ) : (
              <p>{fullReflection?.content || reflection.contentPreview}</p>
            )}
          </div>

          <div className="mt-8 space-y-4">
            {/* Satisfaction Level */}
            {satisfactionValue !== undefined && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" /> Satisfaction Level
                </h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      How you felt overall
                    </span>
                    <span className="text-xs font-semibold">
                      {satisfactionValue}/10
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(satisfactionValue / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Level */}
            {engagementValue !== undefined && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Engagement Level
                </h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      How engaged you were
                    </span>
                    <span className="text-xs font-semibold">
                      {engagementValue}/10
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(engagementValue / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Challenge Level */}
            {challengeValue !== undefined && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Mountain className="h-4 w-4" /> Challenge Level
                </h4>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      How challenging it was
                    </span>
                    <span className="text-xs font-semibold">
                      {challengeValue}/10
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-orange-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(challengeValue / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {reflection.tags && reflection.tags.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Tags className="h-4 w-4" /> Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reflection.tags.map((tag) => (
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
        </CardContent>
      </motion.div>
    </div>
  );
}
