"use client";

import { useEffect, useState } from "react";
import { getUserDashboardMaps } from "@/lib/supabase/maps";
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

        // 🚀 ULTRA FAST: Use optimized dashboard function
        const dashboardData = await getUserDashboardMaps(6);

        if (!isMounted) return;

        // Map enrolled maps to expected format
        const userEnrolledMaps: EnrolledMapWithProgress[] = dashboardData.enrolled.map(
          (map: any) => ({
            ...map,
            isEnrolled: true as const,
            node_count: 0, // Dashboard doesn't need full stats
            avg_difficulty: 1,
            total_assessments: 0,
            map_type: "personal" as const,
            hasStarted: false,
            enrollment: {} as UserMapEnrollment,
            realTimeProgress: {
              progressPercentage: 0,
              completedNodes: 0,
              totalNodes: 0,
              passedNodes: 0,
              failedNodes: 0,
              submittedNodes: 0,
              inProgressNodes: 0,
            },
          })
        );

        // Map recent maps to available format  
        const recentMaps: MapWithStats[] = dashboardData.recent.map((map: any) => ({
          ...map,
          node_count: 0, // Dashboard doesn't need full stats for performance
          avg_difficulty: 1,
          total_assessments: 0,
          map_type: "public" as const,
          isEnrolled: false,
          hasStarted: false,
        }));

        setEnrolledMaps(userEnrolledMaps);
        setAvailableMaps(recentMaps.slice(0, 3));
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
