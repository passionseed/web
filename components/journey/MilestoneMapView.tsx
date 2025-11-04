/**
 * MilestoneMapView - Full-screen view for project milestones
 * Shows milestone nodes and paths with progress tracking
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useContext,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  Node,
  Edge,
  Panel,
  MarkerType,
  OnSelectionChangeParams,
  ReactFlowProvider,
  addEdge,
  Connection,
  EdgeChange,
  applyEdgeChanges,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Target,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { MilestoneNode } from "./nodes/MilestoneNode";
import { MilestoneNorthStarNode } from "./nodes/MilestoneNorthStarNode";
import { MilestoneProgressDialog } from "./MilestoneProgressDialog";
import { MilestoneDetailsPanel } from "./MilestoneDetailsPanel";
import { AddMilestoneModal } from "./milestone-details/AddMilestoneModal";
import { CreateMilestoneNorthStarDialog } from "./CreateMilestoneNorthStarDialog";
import FloatingEdge from "../map/FloatingEdge";

import {
  getProjectById,
  getProjectMilestones,
  getMilestoneJournals,
  getProjectMilestonePaths,
  createMilestonePath,
  deleteMilestonePath,
  updateMilestone,
  updateProject,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
  MilestonePath,
} from "@/types/journey";
import {
  getPositionSyncManager,
  SyncStatus,
} from "@/lib/sync/PositionSyncManager";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { MilestoneBreadcrumbContext } from "@/app/me/journey/journey-page-client";

interface MilestoneMapViewProps {
  projectId: string;
  onBack: () => void;
}

const nodeTypes = {
  milestone: MilestoneNode,
  milestoneNorthStar: MilestoneNorthStarNode,
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

function MilestoneMapViewInner({ projectId, onBack }: MilestoneMapViewProps) {
  const { setMilestoneTitle, setOnBackToOverview } = useContext(
    MilestoneBreadcrumbContext
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<ProjectMilestone | null>(null);
  const [milestonePaths, setMilestonePaths] = useState<MilestonePath[]>([]);
  
  // Zoom state management
  const [zoomLevel, setZoomLevel] = useState<"low" | "medium" | "high">("medium");
  const [numericZoom, setNumericZoom] = useState<number>(1);

  // North Star dialog state
  const [showNorthStarDialog, setShowNorthStarDialog] = useState(false);
  const [hasCheckedNorthStar, setHasCheckedNorthStar] = useState(false);

  // Panel management
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  // Dialog states
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [addMilestoneModalOpen, setAddMilestoneModalOpen] = useState(false);

  // Sync manager and status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | undefined>(undefined);
  const syncManager = getPositionSyncManager();

  // Register the onBack callback with the breadcrumb context
  useEffect(() => {
    setOnBackToOverview(() => onBack);
  }, [onBack, setOnBackToOverview]);

  // Edge types
  const edgeTypes = useMemo(
    () => ({
      floating: FloatingEdge,
    }),
    []
  );

  // Edge change handler with deletion support
  const onEdgesChange = useCallback(async (changes: EdgeChange[]) => {
    const deletedEdges = changes.filter(change => change.type === 'remove');
    
    // Handle edge deletions (including backspace)
    if (deletedEdges.length > 0) {
      for (const change of deletedEdges) {
        const edgeId = change.id;
        const edge = edges.find(e => e.id === edgeId);
        
        if (edge?.data?.pathId) {
          try {
            const pathId = edge.data.pathId as string;
            await deleteMilestonePath(pathId);
            setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
            toast.success("Connection deleted");
          } catch (error) {
            console.error("Error deleting connection:", error);
            toast.error("Failed to delete connection");
            return; // Don't apply the edge change if deletion failed
          }
        } else if (edge?.data?.isNorthStarConnection) {
          try {
            const milestoneId = edge.data.milestoneId as string;
            
            // Remove from project metadata
            if (project) {
              const currentConnections = project.metadata?.north_star_connections || [];
              const newConnections = currentConnections.filter((id) => id !== milestoneId);
              
              await updateProject(projectId, {
                metadata: {
                  ...project.metadata,
                  north_star_connections: newConnections,
                },
              });
              
              // Update local state
              setProject(prev => prev ? {
                ...prev,
                metadata: {
                  ...prev.metadata,
                  north_star_connections: newConnections,
                }
              } : null);
            }
            
            toast.success("North Star connection deleted");
          } catch (error) {
            console.error("Error deleting North Star connection:", error);
            toast.error("Failed to delete North Star connection");
            return; // Don't apply the edge change if deletion failed
          }
        }
      }
    }
    
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [edges, project, projectId, setProject]);

  const handleOpenProgress = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setProgressDialogOpen(true);
  }, []);

  const handleUpdateMilestone = useCallback(async (milestoneId: string, updates: Partial<ProjectMilestone>) => {
    try {
      console.log("🔄 Updating milestone:", milestoneId, updates);
      const updatedMilestone = await updateMilestone(milestoneId, updates);
      
      // Update the milestones array
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, ...updatedMilestone } : m
      ));
      
      // Update the node data in place
      setNodes(prev => prev.map(node => {
        if (node.id === milestoneId) {
          return {
            ...node,
            data: {
              ...node.data,
              milestone: { ...node.data.milestone, ...updatedMilestone }
            }
          };
        }
        return node;
      }));
      
      toast.success("Milestone updated successfully!");
    } catch (error) {
      console.error("Error updating milestone:", error);
      toast.error("Failed to update milestone");
    }
  }, []);

  // Handle zoom changes from the canvas with throttling
  const handleZoomChange = useCallback(
    (zoomLevel: "low" | "medium" | "high", numericZoom: number) => {
      // Only update if zoom level actually changed to reduce lag
      setZoomLevel(prev => prev !== zoomLevel ? zoomLevel : prev);
      setNumericZoom(prev => Math.abs(prev - numericZoom) > 0.05 ? numericZoom : prev);
    },
    []
  );

  // Update nodes when zoom changes - debounced for performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            numericZoom,
          },
        }))
      );
    }, 50); // 50ms debounce to reduce lag

    return () => clearTimeout(timeoutId);
  }, [numericZoom, setNodes]);

  const buildMilestoneMap = useCallback(
    async (milestonesData: MilestoneWithJournals[], projectData?: ProjectWithMilestones) => {
      try {
        const newNodes: Node[] = [];

        // Check if milestones have positions set
        const hasPositions = milestonesData.some(
          (m) => m.position_x !== null && m.position_x !== undefined
        );

        // Add North Star node if it exists - use projectData parameter if provided, otherwise fallback to state
        const currentProject = projectData || project;
        if (currentProject?.metadata?.milestone_north_star) {
          const northStar = currentProject.metadata.milestone_north_star;
          if (process.env.NODE_ENV === 'development') {
            console.log("🌟 Creating North Star node:", northStar);
          }
          
          // Use saved position or default position
          const savedPosition = currentProject.metadata?.north_star_position;
          const position = savedPosition ? {
            x: savedPosition.x,
            y: savedPosition.y,
          } : {
            x: -400, // Default position to the left of milestones
            y: -100, // Default slightly above center
          };
          
          newNodes.push({
            id: "milestone-north-star",
            type: "milestoneNorthStar",
            position,
            data: {
              northStar,
              project: currentProject,
              numericZoom,
              onEdit: () => setShowNorthStarDialog(true),
            },
            draggable: true,
            selectable: true,
          });
        }

        // Create milestone nodes without fetching journals individually (performance improvement)
        for (let i = 0; i < milestonesData.length; i++) {
          const milestone = milestonesData[i];

          // Use existing journal data from milestone object instead of fetching
          const latestJournal = milestone.journals && milestone.journals.length > 0 
            ? milestone.journals[0] 
            : null;

          // Position logic - use position_x/position_y from database
          let position;
          if (hasPositions) {
            position = {
              x: milestone.position_x || 0,
              y: milestone.position_y || 0,
            };
          } else {
            // Auto-layout horizontally
            const horizontalSpacing = 350;
            const verticalVariation = (i % 2) * 100 - 50;
            position = {
              x: i * horizontalSpacing,
              y: verticalVariation,
            };
          }

          newNodes.push({
            id: milestone.id,
            type: "milestone",
            position,
            data: {
              milestone,
              latestJournalPreview: latestJournal
                ? latestJournal.content.slice(0, 100)
                : undefined,
              numericZoom,
              onOpenProgress: () => handleOpenProgress(milestone),
              onUpdateMilestone: handleUpdateMilestone,
            },
            draggable: true,
            selectable: true,
          });
        }

        if (process.env.NODE_ENV === 'development') {
          console.log("✅ Built milestone nodes:", newNodes.length);
          console.log("🎯 All nodes created:", newNodes.map(n => ({ id: n.id, type: n.type, position: n.position })));
        }
        setNodes(newNodes);
        
        // Store North Star connection data for later edge creation
        // (edges will be created after nodes are fully set)
      } catch (error) {
        console.error("Error building milestone map:", error);
        toast.error("Failed to update milestone view");
      }
    },
    [setNodes, setEdges, numericZoom, setShowNorthStarDialog, handleOpenProgress, handleUpdateMilestone]
  );

  // Build edges from milestone paths (separate useEffect to avoid timing issues)
  useEffect(() => {
    const pathEdges: Edge[] = milestonePaths.map((path) => ({
      id: path.id,
      source: path.source_milestone_id,
      target: path.destination_milestone_id,
      type: "floating",
      animated: path.path_type === "linear",
      selectable: true,
      deletable: true,
      focusable: true,
      style: {
        stroke:
          path.path_type === "linear"
            ? "#3b82f6"
            : path.path_type === "conditional"
              ? "#f59e0b"
              : "#10b981",
        strokeWidth: 3,
        cursor: "pointer",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color:
          path.path_type === "linear"
            ? "#3b82f6"
            : path.path_type === "conditional"
              ? "#f59e0b"
              : "#10b981",
      },
      data: {
        pathType: path.path_type,
        pathId: path.id,
      },
    }));

    // Create North Star edges if project and nodes exist
    const northStarEdges: Edge[] = [];
    if (project?.metadata?.north_star_connections && nodes.length > 0) {
      const northStarConnections = project.metadata.north_star_connections;
      
      if (process.env.NODE_ENV === 'development') {
        console.log("🌟 Creating North Star edges:", northStarConnections);
        console.log("🎯 Available nodes:", nodes.map(n => n.id));
      }
      
      northStarConnections.forEach((milestoneId) => {
        // Only create edges if both North Star and milestone nodes exist
        const northStarExists = nodes.some(n => n.id === "milestone-north-star");
        const milestoneExists = nodes.some(n => n.id === milestoneId);
        
        if (northStarExists && milestoneExists) {
          northStarEdges.push({
            id: `north-star-milestone-north-star-${milestoneId}`,
            source: "milestone-north-star",
            target: milestoneId,
            type: "floating",
            animated: false,
            selectable: true,
            deletable: true,
            style: {
              stroke: "#F59E0B", // Amber color for North Star connections
              strokeWidth: 3,
              strokeDasharray: "5,5", // Dashed line to show it's different
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#F59E0B",
            },
            data: {
              isNorthStarConnection: true,
              milestoneId: milestoneId,
            },
          });
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Cannot create edge - North Star: ${northStarExists}, Milestone ${milestoneId}: ${milestoneExists}`);
        }
      });
    }

    const allEdges = [...pathEdges, ...northStarEdges];
    console.log("✅ Built all edges:", allEdges.length, "- Paths:", pathEdges.length, "North Star:", northStarEdges.length);
    setEdges(allEdges);
  }, [milestonePaths, project?.metadata?.north_star_connections, nodes]);

  const loadMilestoneMap = useCallback(async () => {    
    setIsLoading(true);
    try {
      const [projectData, milestonesData, pathsData] = await Promise.all([
        getProjectById(projectId),
        getProjectMilestones(projectId),
        getProjectMilestonePaths(projectId),
      ]);

      setProject(projectData);
      setMilestones(milestonesData);
      setMilestonePaths(pathsData);

      // Check if project needs a milestone North Star (only check once per session)
      if (projectData && !hasCheckedNorthStar) {
        const hasMilestoneNorthStar = projectData.metadata?.has_milestone_north_star === true;
        
        if (!hasMilestoneNorthStar) {
          console.log("🌟 Project has no milestone North Star, showing dialog");
          setShowNorthStarDialog(true);
        }
        setHasCheckedNorthStar(true);
      }

      if (projectData && milestonesData) {
        await buildMilestoneMap(milestonesData, projectData);
      }
    } catch (error) {
      console.error("Error loading milestone map:", error);
      toast.error("Failed to load milestone map");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, buildMilestoneMap]);

  useEffect(() => {
    loadMilestoneMap();

    // Cleanup: clear breadcrumb when unmounting or returning to overview
    return () => {
      setMilestoneTitle(null);
    };
  }, [projectId, setMilestoneTitle]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((event) => {
      setSyncStatus(event.status);
      setSyncMessage(event.message);

      // Show error toast if sync fails
      if (event.status === "error") {
        toast.error(event.message || "Failed to save position changes");
      }
    });

    // Cleanup: flush pending changes and unsubscribe
    return () => {
      syncManager.flush();
      unsubscribe();
    };
  }, [syncManager]);

  const handleProgressUpdated = useCallback(async (updatedMilestone?: ProjectMilestone) => {
    try {
      if (updatedMilestone) {
        console.log("📝 Updating milestone data in place:", updatedMilestone.id);
        
        // Update milestones array
        setMilestones(prev => prev.map(m => 
          m.id === updatedMilestone.id 
            ? { ...m, ...updatedMilestone, journals: m.journals } 
            : m
        ));
        
        // CRITICAL: Update the selected milestone to maintain selection
        if (selectedMilestone && selectedMilestone.id === updatedMilestone.id) {
          console.log("📝 Updating selected milestone to maintain selection");
          setSelectedMilestone({ ...selectedMilestone, ...updatedMilestone });
        }
        
        // Update the node data directly - PRESERVE the selection state
        setNodes(prev => prev.map(node => {
          if (node.id === updatedMilestone.id) {
            return {
              ...node,
              selected: node.selected, // PRESERVE selection state
              data: {
                ...node.data,
                milestone: { ...node.data.milestone, ...updatedMilestone }
              }
            };
          }
          return node;
        }));
        
        console.log("📝 Milestone updated without losing selection");
      } else {
        // Fallback: only use if really necessary
        console.log("📝 Fallback: fetching fresh data");
        const milestonesData = await getProjectMilestones(projectId);
        setMilestones(milestonesData);
        await buildMilestoneMap(milestonesData);
      }
    } catch (error) {
      console.error("Error updating milestone progress:", error);
      toast.error("Failed to refresh milestones");
    }
  }, [projectId, buildMilestoneMap, selectedMilestone]);

  const handleMilestoneCreated = useCallback(async () => {
    // For new milestones, we do need to fetch fresh data
    try {
      const milestonesData = await getProjectMilestones(projectId);
      setMilestones(milestonesData);
      await buildMilestoneMap(milestonesData);
    } catch (error) {
      console.error("Error refreshing after milestone creation:", error);
      toast.error("Failed to refresh milestones");
    }
  }, [projectId, buildMilestoneMap]);

  const handleNorthStarCreated = useCallback(async () => {
    // Refresh project data to get the updated North Star link
    try {
      const projectData = await getProjectById(projectId);
      setProject(projectData);
      
      // Rebuild the map to include the new North Star node
      if (milestones.length > 0) {
        await buildMilestoneMap(milestones);
      }
      
      console.log("🔄 Project data refreshed after North Star creation");
    } catch (error) {
      console.error("Error refreshing project after North Star creation:", error);
    }
  }, [projectId, milestones, buildMilestoneMap]);

  const handleNodeDragStop = useCallback(
    async (_event: any, node: Node) => {
      // Handle North Star position saving separately
      if (node.id === "milestone-north-star") {
        console.log("🌟 Saving North Star position:", node.position);
        try {
          if (project) {
            await updateProject(projectId, {
              metadata: {
                ...project.metadata,
                north_star_position: {
                  x: node.position.x,
                  y: node.position.y,
                },
              },
            });
            
            // Update local state
            setProject(prev => prev ? {
              ...prev,
              metadata: {
                ...prev.metadata,
                north_star_position: {
                  x: node.position.x,
                  y: node.position.y,
                },
              }
            } : null);
          }
        } catch (error) {
          console.error("Error saving North Star position:", error);
        }
        return;
      }
      
      // Mark milestone as dirty for batched sync
      syncManager.markMilestoneDirty(node.id, node.position.x, node.position.y);
    },
    [syncManager, project, projectId]
  );

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes;
      const selectedEdges = params.edges;
      
      console.log("🔄 Selection changed - nodes:", selectedNodes.length, "edges:", selectedEdges.length);
      
      // Only handle node selection for milestone details, ignore edge selection
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        const milestone = milestones.find((m) => m.id === node.id);
        if (milestone) {
          console.log("🎯 Selecting milestone:", milestone.title);
          setSelectedMilestone(milestone);
          // Update breadcrumb to show milestone title
          setMilestoneTitle(milestone.title);
          // Expand right panel if minimized
          if (isPanelMinimized && rightPanelRef.current) {
            rightPanelRef.current.resize(PANEL_SIZES.RIGHT_DEFAULT);
            setIsPanelMinimized(false);
          }
        }
      } else if (selectedEdges.length === 0 && selectedNodes.length === 0) {
        // Only clear milestone selection if nothing is selected
        console.log("🔄 Clearing milestone selection");
        setSelectedMilestone(null);
        // Clear breadcrumb when deselecting
        setMilestoneTitle(null);
      }
    },
    [milestones, isPanelMinimized, setMilestoneTitle]
  );

  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) {
      toast.error("Cannot connect a milestone to itself");
      return;
    }

    // Check if either source or target is the North Star node
    if (connection.source === "milestone-north-star" || connection.target === "milestone-north-star") {
      console.log("🌟 Creating North Star connection");
      
      try {
        // Determine the milestone ID (the one that's not the North Star)
        const milestoneId = connection.source === "milestone-north-star" 
          ? connection.target 
          : connection.source;
        
        // Save North Star connection to project metadata
        if (project) {
          const currentConnections = project.metadata?.north_star_connections || [];
          const newConnections = [...currentConnections];
          
          // Avoid duplicates
          if (!newConnections.includes(milestoneId)) {
            newConnections.push(milestoneId);
            
            await updateProject(projectId, {
              metadata: {
                ...project.metadata,
                north_star_connections: newConnections,
              },
            });
            
            // Update local state
            setProject(prev => prev ? {
              ...prev,
              metadata: {
                ...prev.metadata,
                north_star_connections: newConnections,
              }
            } : null);
          }
        }
        
        // Create a visual edge for North Star connections
        const visualEdge: Edge = {
          id: `north-star-${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: "floating",
          animated: false,
          selectable: true,
          deletable: true,
          style: {
            stroke: "#F59E0B", // Amber color for North Star connections
            strokeWidth: 3,
            strokeDasharray: "5,5", // Dashed line to show it's different
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#F59E0B",
          },
          data: {
            isNorthStarConnection: true,
            milestoneId: milestoneId,
          },
        };
        
        // Add visual edge directly to edges state
        setEdges((prev) => [...prev, visualEdge]);
        toast.success("North Star connection created");
      } catch (error) {
        console.error("Error saving North Star connection:", error);
        toast.error("Failed to save North Star connection");
      }
      return;
    }

    console.log("🔗 Creating milestone path:", connection);

    try {
      // Create the path in database
      const newPath = await createMilestonePath(
        connection.source,
        connection.target,
        "linear"
      );

      // Add to local state
      setMilestonePaths((prev) => [...prev, newPath]);

      // Create edge
      const newEdge: Edge = {
        id: newPath.id,
        source: newPath.source_milestone_id,
        target: newPath.destination_milestone_id,
        type: "floating",
        animated: true,
        selectable: true,
        deletable: true,
        focusable: true,
        style: { 
          stroke: "#3b82f6", 
          strokeWidth: 3,
          cursor: "pointer"
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#3b82f6",
        },
        data: {
          pathType: newPath.path_type,
          pathId: newPath.id,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      toast.success("Connection created");
    } catch (error) {
      console.error("Error creating connection:", error);
      toast.error("Failed to create connection");
    }
  }, [project, projectId, setProject]);

  const onEdgeClick = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();

      if (!edge.data?.pathId) return;

      const confirmed = window.confirm("Delete this connection?");

      if (!confirmed) return;

      try {
        const pathId = edge.data.pathId as string;
        await deleteMilestonePath(pathId);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
        toast.success("Connection deleted");
      } catch (error) {
        console.error("Error deleting connection:", error);
        toast.error("Failed to delete connection");
      }
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();

      if (!edge.data?.pathId) return;

      const confirmed = window.confirm("Delete this connection?");

      if (!confirmed) return;

      try {
        const pathId = edge.data.pathId as string;
        await deleteMilestonePath(pathId);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setMilestonePaths((prev) => prev.filter((p) => p.id !== pathId));
        toast.success("Connection deleted");
      } catch (error) {
        console.error("Error deleting connection:", error);
        toast.error("Failed to delete connection");
      }
    },
    []
  );



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

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading milestones...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950">
        <p className="text-slate-400 mb-4">Project not found</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Journey
        </Button>
      </div>
    );
  }

  const completedCount = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const totalCount = milestones.length;

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-screen bg-slate-950"
      >
        {/* Left Panel - Milestone Canvas */}
        <ResizablePanel
          ref={leftPanelRef}
          defaultSize={PANEL_SIZES.LEFT_DEFAULT}
          minSize={PANEL_SIZES.LEFT_MIN}
          maxSize={PANEL_SIZES.LEFT_MAX}
          className="transition-all duration-300 ease-in-out relative"
        >
          <div className="w-full h-full relative bg-slate-950">
            <style jsx>{`
              .react-flow__edge-path {
                transition: stroke 200ms ease-in-out !important;
              }
            `}</style>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={handleSelectionChange}
              onNodeDragStop={handleNodeDragStop}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode={ConnectionMode.Loose}
              onViewportChange={(viewport) => {
                // Calculate zoom level based on viewport zoom - 3 states only
                const zoom = viewport.zoom;
                let level: "low" | "medium" | "high";
                if (zoom < 1.0) {
                  level = "low";
                } else if (zoom < 1.5) {
                  level = "medium";
                } else {
                  level = "high";
                }
                handleZoomChange(level, zoom);
              }}
              fitView
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1.5,
              }}
              minZoom={0.3}
              maxZoom={2}
              defaultEdgeOptions={{
                type: "floating",
                animated: false,
                selectable: true,
                deletable: true,
                focusable: true,
              }}
              nodesDraggable
              nodesConnectable
              elementsSelectable
              edgesReconnectable={false}
              deleteKeyCode={["Delete", "Backspace"]}
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
              <Controls
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />

              {/* Header panel */}
              <Panel
                position="top-left"
                className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-2 m-2 max-w-3xl"
              >
                <div className="flex items-center gap-2">
                  <Button onClick={onBack} variant="outline" size="sm" className="flex-shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <h2 className="text-sm font-bold text-slate-100 truncate">
                        {project.title}
                      </h2>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {completedCount}/{totalCount}
                      </Badge>
                      <Badge
                        variant={
                          project.status === "in_progress"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    
                    {/* Milestone Goal Display */}
                    {project.metadata?.milestone_north_star && (
                      <div className="flex items-center gap-2 text-xs text-amber-200">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="truncate">
                          Goal: {project.metadata.milestone_north_star.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setAddMilestoneModalOpen(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex-shrink-0"
                      title="Add Milestone"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setShowNorthStarDialog(true)}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg flex-shrink-0"
                      title={project?.metadata?.has_milestone_north_star ? "Edit Milestone North Star" : "Create Milestone North Star"}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Panel>

              {/* Empty state */}
              {milestones.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
                  <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-6 text-center max-w-sm pointer-events-auto">
                    <Target className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <h3 className="text-lg font-bold text-slate-100 mb-2">
                      No milestones yet
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Break down your project into milestones to track progress
                      and stay organized.
                    </p>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Button clicked, opening modal...');
                        setAddMilestoneModalOpen(true);
                      }} 
                      size="sm"
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer relative z-[101]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Milestone
                    </Button>
                  </div>
                </div>
              )}
            </ReactFlow>

            {/* Linking Help Text */}
            <div className="absolute bottom-20 left-4 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg max-w-sm">
              <p className="text-xs text-slate-200">
                <span className="font-semibold">💡 Tip:</span> Drag from the green dot on one milestone to the blue dot on another to create a connection. Click edges to select them, then press Backspace or Delete to remove.
              </p>
            </div>

            {/* Dialogs */}
            <MilestoneProgressDialog
              open={progressDialogOpen}
              onOpenChange={setProgressDialogOpen}
              milestone={selectedMilestone}
              onSuccess={handleProgressUpdated}
            />

            {/* Sync Status Indicator */}
            <SyncStatusIndicator status={syncStatus} message={syncMessage} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Milestone Details */}
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
              <MilestoneDetailsPanel
                milestone={selectedMilestone}
                projectId={projectId}
                project={project || undefined}
                allMilestones={milestones}
                onMilestoneUpdated={handleProgressUpdated}
                onMilestoneSelect={setSelectedMilestone}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        isOpen={addMilestoneModalOpen}
        onOpenChange={(open) => {
          console.log('Modal state changing to:', open);
          setAddMilestoneModalOpen(open);
        }}
        projectId={projectId}
        allMilestones={milestones}
        onMilestoneCreated={handleMilestoneCreated}
      />

      {/* Milestone North Star Creation Dialog */}
      {project && (
        <CreateMilestoneNorthStarDialog
          open={showNorthStarDialog}
          onOpenChange={setShowNorthStarDialog}
          onSuccess={handleNorthStarCreated}
          projectId={projectId}
          projectTitle={project.title}
          existingMilestoneNorthStar={project.metadata?.milestone_north_star || undefined}
        />
      )}
    </>
  );
}

// Wrapper component with ReactFlowProvider
export function MilestoneMapView(props: MilestoneMapViewProps) {
  return (
    <ReactFlowProvider>
      <MilestoneMapViewInner {...props} />
    </ReactFlowProvider>
  );
}
