/**
 * JourneyMapCanvas - Main ReactFlow canvas for journey map visualization
 * Displays user center, projects, and handles interactions
 * Dark mode themed with resizable panels similar to MapViewer
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Target,
  Star,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { UserCenterNode } from "./nodes/UserCenterNode";
import { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
import { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
import { MainQuestPath } from "./edges/MainQuestPath";
import { NorthStarLink } from "./edges/NorthStarLink";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectDetailsPanel } from "./ProjectDetailsPanel";
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

// Panel size constants
const PANEL_SIZES = {
  LEFT_DEFAULT: 70,
  LEFT_MIN: 30,
  LEFT_MAX: 85,
  RIGHT_DEFAULT: 30,
  RIGHT_MIN: 15,
  RIGHT_MAX: 70,
};

function JourneyMapCanvasInner({
  userId,
  userName,
  userAvatar,
}: JourneyMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithMilestones[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"overview" | "milestone">(
    "overview"
  );
  const [milestoneProjectId, setMilestoneProjectId] = useState<string | null>(
    null
  );

  // Panel management
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);

  // Dialog states
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const handleViewMilestones = useCallback(
    (projectId: string) => {
      console.log("🎯 handleViewMilestones called with projectId:", projectId);
      console.log("📊 Current viewMode:", viewMode);
      console.log("📊 Setting milestoneProjectId to:", projectId);
      setMilestoneProjectId(projectId);
      setViewMode("milestone");
      console.log("✅ ViewMode set to milestone");
    },
    [viewMode]
  );

  const handleEditProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const handleAddReflection = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    // TODO: Open reflection dialog
    toast.info("Reflection dialog coming soon!");
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
    [
      userId,
      userName,
      userAvatar,
      handleViewMilestones,
      handleEditProject,
      handleAddReflection,
    ]
  );

  const calculateOverallProgress = (
    projectsData: ProjectWithMilestones[]
  ): number => {
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

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes;
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        if (node.id !== "user-center") {
          setSelectedProjectId(node.id);
          // Expand right panel if minimized
          if (isPanelMinimized && rightPanelRef.current) {
            rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
            setIsPanelMinimized(false);
          }
        }
      } else {
        setSelectedProjectId(null);
      }
    },
    [isPanelMinimized]
  );

  const handleProjectCreated = () => {
    loadProjects();
  };

  const togglePanelSize = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (isPanelMinimized) {
      panel.resize(PANEL_SIZES.RIGHT_DEFAULT);
      setIsPanelMinimized(false);
    } else {
      panel.resize(PANEL_SIZES.RIGHT_MIN);
      setIsPanelMinimized(true);
    }
  }, [isPanelMinimized]);

  const northStarProjects = useMemo(
    () =>
      projects
        .filter((p) => p.metadata?.is_north_star === true)
        .map((p) => ({ id: p.id, title: p.title })),
    [projects]
  );

  // Calculate journey statistics (must be before early return)
  const journeyStats = useMemo(() => {
    const totalProjects = projects.length;
    const northStarCount = projects.filter(
      (p) => p.metadata?.is_north_star
    ).length;
    const activeProjects = projects.filter(
      (p) => p.status === "in_progress"
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;
    const totalMilestones = projects.reduce(
      (sum, p) => sum + (p.milestone_count || 0),
      0
    );
    const completedMilestones = projects.reduce(
      (sum, p) => sum + (p.completed_milestone_count || 0),
      0
    );

    return {
      totalProjects,
      northStarCount,
      activeProjects,
      completedProjects,
      totalMilestones,
      completedMilestones,
      progressPercentage:
        totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : 0,
    };
  }, [projects]);

  if (viewMode === "milestone" && milestoneProjectId) {
    console.log(
      "🚀 Rendering MilestoneMapView for project:",
      milestoneProjectId
    );
    return (
      <div className="h-full w-full bg-slate-950">
        <MilestoneMapView
          projectId={milestoneProjectId}
          onBack={() => {
            console.log("⬅️ Back button clicked, returning to overview");
            setMilestoneProjectId(null);
            setViewMode("overview");
          }}
        />
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full bg-slate-950">
      {/* Left Panel - Main Map Canvas */}
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={PANEL_SIZES.LEFT_DEFAULT}
        minSize={PANEL_SIZES.LEFT_MIN}
        maxSize={PANEL_SIZES.LEFT_MAX}
        className="transition-all duration-300 ease-in-out relative flex flex-col"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-slate-950">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-400">Loading your journey...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top Action Bar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">
                      {journeyStats.totalProjects} Projects
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-300">
                      {journeyStats.northStarCount} North Star
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-300">
                      {journeyStats.progressPercentage}% Complete
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCreateProjectOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            {/* ReactFlow Canvas */}
            <div className="flex-1">
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
                panOnDrag={[1, 2]}
                attributionPosition="bottom-left"
              >
                <Background
                  gap={20}
                  size={1}
                  color="#334155"
                  style={{ backgroundColor: "#0f172a" }}
                />
                <MiniMap
                  nodeColor={(node) => {
                    if (node.type === "userCenter") return "#3b82f6";
                    if (node.type === "northStar") return "#f59e0b";
                    return "#10b981";
                  }}
                  maskColor="rgba(0, 0, 0, 0.3)"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Controls
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
              </ReactFlow>
            </div>

            {/* Navigation Guide - Bottom */}
            {isNavigationExpanded ? (
              <>
                <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border-t border-slate-800 p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-200">
                      <Info className="h-4 w-4" />
                      Journey Statistics
                    </h3>
                    <button
                      onClick={() => setIsNavigationExpanded(false)}
                      className="p-1 hover:bg-slate-800 rounded transition-colors"
                      aria-label="Hide statistics"
                    >
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Journey Stats */}
                  <div className="mb-4 bg-slate-800/30 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-slate-300">
                          {journeyStats.activeProjects} Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-slate-300">
                          {journeyStats.completedProjects} Completed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-slate-300">
                          {journeyStats.completedMilestones}/
                          {journeyStats.totalMilestones} Milestones
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-slate-300">
                          {journeyStats.northStarCount} North Stars
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${journeyStats.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Navigation Instructions */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Select Project</span>
                        <span className="text-slate-500">Click</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Pan Map</span>
                        <span className="text-slate-500">Drag</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Zoom</span>
                        <span className="text-slate-500">Mouse Wheel</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Deselect</span>
                        <kbd className="px-1 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                          Esc
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsNavigationExpanded(false)}
                  className="absolute bottom-4 right-4 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-lg hover:bg-slate-800 transition-colors"
                  aria-expanded={true}
                  title="Hide statistics"
                >
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsNavigationExpanded(true)}
                className="absolute bottom-4 right-4 z-10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-lg hover:bg-slate-800 transition-colors"
                aria-expanded={false}
                title="Show statistics"
              >
                <Info className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </>
        )}
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel - Project Details */}
      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={PANEL_SIZES.RIGHT_DEFAULT}
        minSize={PANEL_SIZES.RIGHT_MIN}
        maxSize={PANEL_SIZES.RIGHT_MAX}
        className="transition-all duration-300 ease-in-out relative bg-slate-900"
      >
        {/* Panel Minimize/Maximize Button */}
        <button
          onClick={togglePanelSize}
          className="absolute top-2 right-2 z-20 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80 border border-slate-700 rounded-lg p-2 shadow-lg hover:bg-slate-700 transition-colors"
          title={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
          aria-label={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
        >
          {isPanelMinimized ? (
            <ChevronLeft className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        <div className="h-full flex flex-col overflow-hidden">
          {!isPanelMinimized && (
            <>
              {selectedProjectId ? (
                <ProjectDetailsPanel
                  projectId={selectedProjectId}
                  onEdit={() => toast.info("Edit dialog coming soon!")}
                  onAddReflection={() =>
                    toast.info("Reflection dialog coming soon!")
                  }
                  onAddMilestone={() =>
                    toast.info("Milestone dialog coming soon!")
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <div>
                    <Target className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">
                      Select a Project
                    </h3>
                    <p className="text-sm text-slate-500">
                      Click on a project node to view details and milestones
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ResizablePanel>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        northStarProjects={northStarProjects}
        onSuccess={handleProjectCreated}
      />
    </ResizablePanelGroup>
  );
}

// Wrapper component with ReactFlowProvider
export function JourneyMapCanvas(props: JourneyMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
