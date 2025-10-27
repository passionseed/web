/**
 * useJourneyProjects Hook
 *
 * Manages journey project loading, state, and CRUD operations.
 * Handles async data fetching with loading states and error handling.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ProjectWithMilestones } from "@/types/journey";
import { getJourneyProjects } from "@/lib/supabase/journey";

export interface UseJourneyProjectsReturn {
  projects: ProjectWithMilestones[];
  isLoading: boolean;
  error: Error | null;
  loadProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

/**
 * Hook for managing journey projects data
 */
export function useJourneyProjects(): UseJourneyProjectsReturn {
  const [projects, setProjects] = useState<ProjectWithMilestones[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectsData = await getJourneyProjects();
      setProjects(projectsData);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load projects");
      setError(error);
      console.error("Error loading projects:", err);
      toast.error("Failed to load journey map");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    isLoading,
    error,
    loadProjects,
    refreshProjects,
  };
}
