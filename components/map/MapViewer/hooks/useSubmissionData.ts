/**
 * Hook for managing submission data for instructors
 */

import { useState, useEffect } from "react";
import { getSubmissionsForMap } from "@/lib/supabase/grading";
import { ANIMATIONS } from "../constants";

export function useSubmissionData(mapId: string, isInstructorOrTA: boolean) {
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [showGradingOverview, setShowGradingOverview] = useState(false);

  const loadAllSubmissions = async () => {
    if (!isInstructorOrTA) return;

    setIsLoadingSubmissions(true);
    try {
      const submissions = await getSubmissionsForMap(mapId);
      setAllSubmissions(submissions);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (isInstructorOrTA) {
      loadAllSubmissions();

      // Set up periodic refresh for real-time updates
      const interval = setInterval(() => {
        loadAllSubmissions();
      }, ANIMATIONS.SUBMISSION_REFRESH_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [mapId, isInstructorOrTA]);

  return {
    allSubmissions,
    selectedSubmission,
    setSelectedSubmission,
    isLoadingSubmissions,
    showGradingOverview,
    setShowGradingOverview,
    loadAllSubmissions,
  };
}