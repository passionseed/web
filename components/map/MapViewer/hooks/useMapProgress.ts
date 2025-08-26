/**
 * Hook for managing map progress data
 */

import { useState, useEffect, useCallback } from "react";
import { loadAllProgress as loadMapProgress } from "@/lib/supabase/progresses";
import { getTeamProgressForInstructor } from "@/lib/supabase/team-progress";
import { ProgressMap, UseMapProgressReturn, UserRole } from "../types";

export function useMapProgress(
  mapId: string,
  currentUser: any,
  isTeamMap: boolean,
  isInstructorOrTA: boolean,
  teamId: string | null
): UseMapProgressReturn {
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllProgress = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("🗺️ [useMapProgress] Loading progress for map:", mapId);

      let progressData;

      // For instructors viewing team maps, load team progress instead of individual progress
      if (isTeamMap && isInstructorOrTA && teamId) {
        console.log("👥 [useMapProgress] Loading TEAM progress for instructor");
        progressData = await getTeamProgressForInstructor(mapId, teamId);

        console.log(
          "✅ [useMapProgress] Loaded team progress for",
          Object.keys(progressData).length,
          "nodes"
        );
      } else {
        // Use the standard individual progress loading
        progressData = await loadMapProgress(mapId);

        console.log(
          "✅ [useMapProgress] Loaded individual progress for",
          Object.keys(progressData).length,
          "nodes"
        );
      }

      setProgressMap(progressData);
    } catch (err) {
      console.error("❌ [useMapProgress] Error loading progress:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load progress";
      setError(errorMessage);
      setProgressMap({}); // Fallback to empty progress
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, mapId, isTeamMap, isInstructorOrTA, teamId]);

  useEffect(() => {
    loadAllProgress();
  }, [loadAllProgress]);

  return {
    progressMap,
    loadAllProgress,
    isLoading,
    error,
  };
}