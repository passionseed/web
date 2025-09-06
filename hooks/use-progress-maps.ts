"use client";

import { useEffect, useState } from "react";
import { getMapsWithStats } from "@/lib/supabase/maps";
// TODO: Create API route for enrolled maps with progress
// import { getUserEnrolledMapsWithProgress } from "@/lib/supabase/enrollment";
import { LearningMap, UserMapEnrollment } from "@/types/map";

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

type EnrolledMapWithProgress = MapWithStats & {
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

export function useProgressMaps() {
  const [enrolledMaps, setEnrolledMaps] = useState<EnrolledMapWithProgress[]>(
    []
  );
  const [availableMaps, setAvailableMaps] = useState<MapWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMaps = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Start both requests in parallel for better performance
        const [enrolledMapsPromise, availableMapsPromise] =
          await Promise.allSettled([
            // TODO: Implement API route for enrolled maps with progress
            // getUserEnrolledMapsWithProgress(),
            Promise.resolve([]), // Temporary empty array
            // Get all available maps (faster)
            getMapsWithStats(),
          ]);

        if (!isMounted) return;

        // Handle enrolled maps result
        let userEnrolledMaps: EnrolledMapWithProgress[] = [];
        if (enrolledMapsPromise.status === "fulfilled") {
          userEnrolledMaps = enrolledMapsPromise.value.map(
            (enrolledMap: any) => ({
              ...enrolledMap,
              isEnrolled: true as const,
            })
          );
          setEnrolledMaps(userEnrolledMaps);
        } else {
          console.warn(
            "Could not fetch enrolled maps with progress:",
            enrolledMapsPromise.reason
          );
          // Try fallback without progress calculation
          try {
            // This would be the basic getUserEnrolledMaps without progress calculation
            setEnrolledMaps([]);
          } catch (fallbackError) {
            console.log("User may not be logged in:", fallbackError);
          }
        }

        // Handle available maps result
        if (availableMapsPromise.status === "fulfilled") {
          const allMaps = availableMapsPromise.value;

          // Filter out enrolled maps from available maps
          const enrolledMapIds = new Set(userEnrolledMaps.map((map) => map.id));
          const availableNonEnrolledMaps = allMaps.filter(
            (map) => !enrolledMapIds.has(map.id)
          );

          setAvailableMaps(availableNonEnrolledMaps.slice(0, 3));
        } else {
          console.error(
            "Error fetching available maps:",
            availableMapsPromise.reason
          );
          throw new Error("Failed to fetch available maps");
        }
      } catch (err) {
        if (!isMounted) return;

        const errorMessage =
          err instanceof Error ? err.message : "Failed to load maps";
        setError(errorMessage);
        console.error("Error in fetchMaps:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    enrolledMaps,
    availableMaps,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      setError(null);
      // Re-trigger the effect by updating a state that would cause re-render
    },
  };
}
