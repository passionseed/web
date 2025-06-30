"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, X, Tags, Zap, HeartPulse } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getReflectionTimeline } from "@/lib/supabase/reflection";
import { ReflectionTimelineNode } from "@/types/reflection";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmotionColor, getEmojiForEmotion } from "@/lib/emotions";
import { ExpandedReflectionCard } from "@/components/reflection/ExpandedReflectionCard";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

// --- TYPE DEFINITIONS ---
// Exported so they can be used by child components if this were split into multiple files
export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type ReflectionWithSatisfaction = ReflectionTimelineNode & {
  satisfaction?: number;
  metrics?: {
    satisfaction: number;
    engagement: number;
  };
  contentPreview: string;
  tags?: Tag[];
  emotion: string;
  date: string;
};

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// --- MAIN PAGE COMPONENT ---
export default function ReflectionHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<ReflectionWithSatisfaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const fetchReflections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReflectionTimeline();
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
      setReflections([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  const handleCloseExpandedCard = useCallback(() => {
    setExpandedCardId(null);
  }, []);

  const expandedCard = expandedCardId
    ? reflections.find((r) => r.id === expandedCardId)
    : undefined;

  // Initial loading state skeleton
  if (loading && reflections.length === 0) {
    return (
      <div className="flex flex-col min-h-screen p-4">
        <div className="border-b pb-4 flex justify-between items-center sticky top-0 bg-background z-10 mb-4">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Skeleton className="h-10 w-48" />
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
    <div className="relative">
      <AnimatePresence>
        {expandedCard && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={handleCloseExpandedCard}
            />
            <ExpandedReflectionCard
              reflection={expandedCard}
              onClose={handleCloseExpandedCard}
            />
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col min-h-screen">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-background z-10">
          <h1 className="text-2xl font-semibold">Reflection Journey</h1>
          <Button
            onClick={() => router.push("/me/reflection/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Reflection
          </Button>
        </div>

        <main className="flex-1 overflow-auto p-4">
          {!loading && reflections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center mt-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No reflections yet</h2>
              <p className="text-muted-foreground mt-2">
                Start your journey by adding your first reflection.
              </p>
              <Button
                onClick={() => router.push("/me/reflection/new")}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" /> Add First Reflection
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reflections.map((reflection) => (
                <motion.div
                  key={reflection.id}
                  layoutId={`card-${reflection.id}`}
                  className="cursor-pointer"
                  onClick={() => setExpandedCardId(reflection.id)}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-medium">
                          {formatDate(reflection.date)}
                        </CardTitle>
                        {reflection.emotion && (
                          <span
                            className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border-2 text-lg ${getEmotionColor(reflection.emotion)}`}
                            title={reflection.emotion}
                          >
                            {getEmojiForEmotion(reflection.emotion)}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-sm text-muted-foreground line-clamp-4 flex-grow">
                        {reflection.contentPreview}
                      </p>
                      {reflection.tags && reflection.tags.length > 0 && (
                        <div className="mt-auto flex flex-wrap gap-1 pt-2">
                          {reflection.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                              style={{
                                backgroundColor: `${tag.color}1A`,
                                borderColor: `${tag.color}40`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {reflection.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{reflection.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
