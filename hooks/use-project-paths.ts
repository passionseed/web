/**
 * useProjectPaths Hook
 *
 * Manages project path loading, state, and CRUD operations.
 * Handles async data fetching with loading states and error handling.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ProjectPath } from "@/types/journey";
import {
  getAllProjectPaths,
  createProjectPath,
  deleteProjectPath,
  updateProjectPathType,
} from "@/lib/supabase/journey";

export interface UseProjectPathsReturn {
  paths: ProjectPath[];
  isLoading: boolean;
  error: Error | null;
  loadPaths: () => Promise<void>;
  createPath: (
    sourceId: string,
    destId: string,
    pathType: ProjectPath["path_type"]
  ) => Promise<ProjectPath | null>;
  deletePath: (pathId: string) => Promise<void>;
  updatePathType: (
    pathId: string,
    newType: ProjectPath["path_type"]
  ) => Promise<void>;
}

/**
 * Hook for managing project paths data
 */
export function useProjectPaths(): UseProjectPathsReturn {
  const [paths, setPaths] = useState<ProjectPath[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPaths = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pathsData = await getAllProjectPaths();
      setPaths(pathsData);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load project paths");
      setError(error);
      console.error("Error loading project paths:", err);
      toast.error("Failed to load project connections");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPath = useCallback(
    async (
      sourceId: string,
      destId: string,
      pathType: ProjectPath["path_type"]
    ): Promise<ProjectPath | null> => {
      // Optimistic update
      const optimisticPath: ProjectPath = {
        id: `temp-${Date.now()}`,
        source_project_id: sourceId,
        destination_project_id: destId,
        path_type: pathType,
        created_at: new Date().toISOString(),
      };
      setPaths((prev) => [...prev, optimisticPath]);

      try {
        const newPath = await createProjectPath(sourceId, destId, pathType);

        // Replace optimistic path with real one
        setPaths((prev) =>
          prev.map((p) => (p.id === optimisticPath.id ? newPath : p))
        );

        toast.success("Project connection created");
        return newPath;
      } catch (err) {
        // Rollback optimistic update
        setPaths((prev) => prev.filter((p) => p.id !== optimisticPath.id));

        console.error("Error creating project path:", err);
        toast.error("Failed to create project connection");
        return null;
      }
    },
    []
  );

  const deletePath = useCallback(
    async (pathId: string) => {
      // Optimistic update
      const previousPaths = paths;
      setPaths((prev) => prev.filter((p) => p.id !== pathId));

      try {
        await deleteProjectPath(pathId);
        toast.success("Project connection removed");
      } catch (err) {
        // Rollback optimistic update
        setPaths(previousPaths);

        console.error("Error deleting project path:", err);
        toast.error("Failed to remove project connection");
      }
    },
    [paths]
  );

  const updatePathType = useCallback(
    async (pathId: string, newType: ProjectPath["path_type"]) => {
      // Optimistic update
      const previousPaths = paths;
      setPaths((prev) =>
        prev.map((p) => (p.id === pathId ? { ...p, path_type: newType } : p))
      );

      try {
        const updatedPath = await updateProjectPathType(pathId, newType);

        // Update with server response
        setPaths((prev) =>
          prev.map((p) => (p.id === pathId ? updatedPath : p))
        );

        toast.success("Connection type updated");
      } catch (err) {
        // Rollback optimistic update
        setPaths(previousPaths);

        console.error("Error updating project path type:", err);
        toast.error("Failed to update connection type");
      }
    },
    [paths]
  );

  return {
    paths,
    isLoading,
    error,
    loadPaths,
    createPath,
    deletePath,
    updatePathType,
  };
}
