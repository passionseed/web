/**
 * useJourneyMapState Hook
 *
 * Manages UI state for the journey map including selection,
 * view modes, dialogs, and panel visibility.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { OnSelectionChangeParams } from "@xyflow/react";
import { ProjectWithMilestones } from "@/types/journey";
import {
  ViewMode,
  VIEW_MODES,
} from "../components/journey/constants/journeyMapConfig";

export interface UseJourneyMapStateReturn {
  // Selection state
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  handleSelectionChange: (params: OnSelectionChangeParams) => void;

  // View mode state
  viewMode: ViewMode;
  milestoneProjectId: string | null;
  switchToMilestoneView: (projectId: string) => void;
  switchToOverviewView: () => void;

  // Dialog state
  createProjectOpen: boolean;
  editProjectOpen: boolean;
  editingProject: ProjectWithMilestones | null;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (project: ProjectWithMilestones) => void;
  closeEditDialog: () => void;

  // Panel state
  isPanelMinimized: boolean;
  setIsPanelMinimized: (minimized: boolean) => void;
  isNavigationExpanded: boolean;
  setIsNavigationExpanded: (expanded: boolean) => void;
}

/**
 * Hook for managing journey map UI state
 */
export function useJourneyMapState(): UseJourneyMapStateReturn {
  // Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.OVERVIEW);
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(
    null
  );

  // Dialog state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectWithMilestones | null>(null);

  // Panel state
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);

  // Selection handlers
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes;
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        if (node.id !== "user-center") {
          setSelectedProjectId(node.id);
        }
      } else {
        setSelectedProjectId(null);
      }
    },
    []
  );

  // View mode handlers
  const switchToMilestoneView = useCallback((projectId: string) => {
    console.log("🎯 Switching to milestone view for project:", projectId);
    setMilestoneProjectId(projectId);
    setViewMode(VIEW_MODES.MILESTONE);
  }, []);

  const switchToOverviewView = useCallback(() => {
    console.log("⬅️ Returning to overview");
    setMilestoneProjectId(null);
    setViewMode(VIEW_MODES.OVERVIEW);
  }, []);

  // Dialog handlers
  const openCreateDialog = useCallback(() => {
    setCreateProjectOpen(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateProjectOpen(false);
  }, []);

  const openEditDialog = useCallback((project: ProjectWithMilestones) => {
    setEditingProject(project);
    setEditProjectOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingProject(null);
    setEditProjectOpen(false);
  }, []);

  return {
    // Selection state
    selectedProjectId,
    setSelectedProjectId,
    handleSelectionChange,

    // View mode state
    viewMode,
    milestoneProjectId,
    switchToMilestoneView,
    switchToOverviewView,

    // Dialog state
    createProjectOpen,
    editProjectOpen,
    editingProject,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,

    // Panel state
    isPanelMinimized,
    setIsPanelMinimized,
    isNavigationExpanded,
    setIsNavigationExpanded,
  };
}
