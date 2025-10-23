/**
 * JourneyMapCanvas - Main ReactFlow canvas for journey map visualization
 * Displays user center, projects, and handles interactions
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UserCenterNode } from "./nodes/UserCenterNode";
import { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
import { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
import { MainQuestPath } from "./edges/MainQuestPath";
import { NorthStarLink } from "./edges/NorthStarLink";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectReflectionPanel } from "./ProjectReflectionPanel";
import { DailyActivityPanel } from "./DailyActivityPanel";
import { MilestoneMapView } from "./MilestoneMapView";

import { getJourneyProjects } from "@/lib/supabase/journey";
import { JourneyProject, ProjectWithMilestones } from "@/types/journey";

interface JourneyMapCanvasProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

const nodeTypes = {
  userCenter: UserCenterNode,
  northStar: NorthStarProjectNode,
  shortTerm: ShortTermProjectNode,
};

const edgeTypes = {
  mainQuest: MainQuestPath,
  northStar: NorthStarLink,
};

export function JourneyMapCanvas({
  userId,
  userName,
  userAvatar,
}: JourneyMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithMilestones[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "milestone">("overview");
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(null);

  // Dialog states
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [reflectionPanelOpen, setReflectionPanelOpen] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsData = await getJourneyProjects();
      setProjects(projectsData);
      buildMapFromProjects(projectsData);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load journey map");
    } finally {
      setIsLoading(false);
    }
  };

  const buildMapFromProjects = useCallback(
    (projectsData: ProjectWithMilestones[]) => {
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Create user center node at origin
      const completionPercentage = calculateOverallProgress(projectsData);
      newNodes.push({
        id: "user-center",
        type: "userCenter",
        position: { x: 0, y: 0 },
        data: {
          userId,
          userName,
          userAvatar,
          projectCount: projectsData.length,
          completionPercentage,
        },
        draggable: false,
        selectable: true,
      });

      // Separate North Star and short-term projects
      const northStarProjects = projectsData.filter(
        (p) => p.metadata?.is_north_star === true
      );
      const shortTermProjects = projectsData.filter(
        (p) => p.metadata?.is_north_star !== true
      );

      // Position North Star projects in a circle around user center
      const northStarRadius = 400;
      northStarProjects.forEach((project, index) => {
        const angle = (index / northStarProjects.length) * 2 * Math.PI;
        const x = Math.cos(angle) * northStarRadius;
        const y = Math.sin(angle) * northStarRadius;

        const linkedProjects = shortTermProjects.filter(
          (p) => p.metadata?.north_star_id === project.id
        );

        newNodes.push({
          id: project.id,
          type: "northStar",
          position: { x, y },
          data: {
            project,
            linkedProjectCount: linkedProjects.length,
            hasRecentActivity: checkRecentActivity(project),
            onViewMilestones: () => handleViewMilestones(project.id),
            onEdit: () => handleEditProject(project.id),
            onReflect: () => handleAddReflection(project.id),
          },
          draggable: true,
          selectable: true,
        });

        // Create edge from user center to North Star
        newEdges.push({
          id: `user-${project.id}`,
          source: "user-center",
          target: project.id,
          type: "northStar",
          animated: false,
        });
      });

      // Position short-term projects
      const shortTermRadius = 600;
      shortTermProjects.forEach((project, index) => {
        const angle = (index / shortTermProjects.length) * 2 * Math.PI;
        const x = Math.cos(angle) * shortTermRadius;
        const y = Math.sin(angle) * shortTermRadius;

        const northStarId = project.metadata?.north_star_id;
        const northStar = northStarProjects.find((p) => p.id === northStarId);

        newNodes.push({
          id: project.id,
          type: "shortTerm",
          position: { x, y },
          data: {
            project,
            hasRecentActivity: checkRecentActivity(project),
            isMainQuest: project.metadata?.is_main_quest === true,
            northStarTitle: northStar?.title,
            onViewMilestones: () => handleViewMilestones(project.id),
            onEdit: () => handleEditProject(project.id),
          },
          draggable: true,
          selectable: true,
        });

        // Create edges
        if (northStarId) {
          // Link to North Star
          newEdges.push({
            id: `${project.id}-northstar-${northStarId}`,
            source: project.id,
            target: northStarId,
            type: "northStar",
            animated: false,
          });
        } else {
          // Link to user center
          newEdges.push({
            id: `user-${project.id}`,
            source: "user-center",
            target: project.id,
            type: project.metadata?.is_main_quest ? "mainQuest" : "default",
            animated: project.metadata?.is_main_quest === true,
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    },
    [userId, userName, userAvatar]
  );

  const calculateOverallProgress = (projectsData: ProjectWithMilestones[]): number => {
    if (projectsData.length === 0) return 0;
    const total = projectsData.reduce(
      (sum, p) => sum + (p.progress_percentage || 0),
      0
    );
    return Math.round(total / projectsData.length);
  };

  const checkRecentActivity = (project: ProjectWithMilestones): boolean => {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    const updatedAt = new Date(project.updated_at);
    return updatedAt > dayAgo;
  };

  const handleViewMilestones = (projectId: string) => {
    setMilestoneProjectId(projectId);
    setViewMode("milestone");
  };

  const handleEditProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setReflectionPanelOpen(true);
  };

  const handleAddReflection = (projectId: string) => {
    setSelectedProjectId(projectId);
    // TODO: Open reflection dialog
    toast.info("Reflection dialog coming soon!");
  };

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

  const handleProjectCreated = () => {
    loadProjects();
  };

  const northStarProjects = useMemo(
    () =>
      projects
        .filter((p) => p.metadata?.is_north_star === true)
        .map((p) => ({ id: p.id, title: p.title })),
    [projects]
  );

  if (viewMode === "milestone" && milestoneProjectId) {
    return (
      <MilestoneMapView
        projectId={milestoneProjectId}
        onBack={() => setViewMode("overview")}
      />
    );
  }

  return (
    <div className="w-full h-screen relative">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{
              padding: 0.2,
              minZoom: 0.5,
              maxZoom: 1.5,
            }}
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: false,
            }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
            panOnDrag
            attributionPosition="bottom-left"
          >
            <Background
              gap={20}
              size={1}
              color="#e5e7eb"
              style={{ backgroundColor: "#fafafa" }}
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "userCenter") return "#3b82f6";
                if (node.type === "northStar") return "#f59e0b";
                return "#10b981";
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Controls
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
          </ReactFlow>

          {/* Floating action button */}
          <Button
            onClick={() => setCreateProjectOpen(true)}
            size="lg"
            className="fixed bottom-24 right-24 rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-8 h-8" />
          </Button>

          {/* Daily activity panel */}
          <DailyActivityPanel
            onQuickJournal={() => toast.info("Quick journal coming soon!")}
            onProjectClick={handleEditProject}
          />

          {/* Dialogs */}
          <CreateProjectDialog
            open={createProjectOpen}
            onOpenChange={setCreateProjectOpen}
            northStarProjects={northStarProjects}
            onSuccess={handleProjectCreated}
          />

          <ProjectReflectionPanel
            open={reflectionPanelOpen}
            onOpenChange={setReflectionPanelOpen}
            projectId={selectedProjectId}
            onEdit={() => toast.info("Edit dialog coming soon!")}
            onAddReflection={() => toast.info("Reflection dialog coming soon!")}
            onAddMilestone={() => toast.info("Milestone dialog coming soon!")}
          />
        </>
      )}
    </div>
  );
}
