"use client";

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Import existing journey components
import { 
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  OnSelectionChangeParams,
  Connection,
  ConnectionMode,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { JourneyActionBar, JourneyStats } from "@/components/journey/JourneyActionBar";
import { NavigationGuide } from "@/components/journey/NavigationGuide";
import { SyncStatusIndicator } from "@/components/journey/SyncStatusIndicator";
import {
  FLOW_CONFIG,
  BACKGROUND_CONFIG,
} from "@/components/journey/constants/journeyMapConfig";

// Import node types
import { UserCenterNode } from "@/components/journey/nodes/UserCenterNode";
import { NorthStarProjectNode } from "@/components/journey/nodes/NorthStarProjectNode";
import { NorthStarNode } from "@/components/journey/nodes/NorthStarNode";
import { ShortTermProjectNode } from "@/components/journey/nodes/ShortTermProjectNode";
import { MainQuestFloatingPath } from "@/components/journey/edges/MainQuestFloatingPath";
import { NorthStarFloatingLink } from "@/components/journey/edges/NorthStarFloatingLink";
import { ProjectFloatingEdge } from "@/components/journey/ProjectFloatingEdge";
import FloatingEdge from "@/components/map/FloatingEdge";
import { CreateUniversityMilestoneDialog } from "./CreateUniversityMilestoneDialog";
import { EditProjectDialog } from "@/components/journey/EditProjectDialog";
import { ProjectDetailsPanel } from "@/components/journey/ProjectDetailsPanel";
import { PANEL_SIZES, VIEW_MODES } from "@/components/journey/constants/journeyMapConfig";

// Import types
import { University } from "@/types/education";
import { NorthStar, JourneyProject, ProjectWithMilestones } from "@/types/journey";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Custom hooks (we'll adapt these for university context)
import { useJourneyProjects } from "@/hooks/use-journey-projects";
import { useProjectPaths } from "@/hooks/use-project-paths";
import { useJourneyMapState } from "@/hooks/use-journey-map-state";
import { usePositionSync } from "@/hooks/use-position-sync";
import { buildJourneyMap, MapBuilderCallbacks } from "@/components/journey/utils/journeyMapBuilder";
import { calculateJourneyStats } from "@/components/journey/utils/journeyCalculations";
import { getUniversityExampleMaps } from "@/lib/supabase/education";
import { Edit, Trash2, Users } from "lucide-react";
import { StudentPersona } from "./PersonaFormDialog";

interface UniversityExampleJourneyCanvasProps {
  university: University;
  user: any;
  persona?: StudentPersona | null;
  onEditPersona?: () => void;
  existingMapId?: string;
  initialMapData?: {
    title: string;
    description: string;
    target_audience: string;
  };
  initialExampleData?: any;
}

interface ExampleMapMetadata {
  title: string;
  description: string;
  target_audience: string;
}

// University Example Milestone Panel Component
interface UniversityExampleMilestonePanelProps {
  projectId: string;
  projects: ProjectWithMilestones[];
  university: University;
  onEdit: () => void;
}

function UniversityExampleMilestonePanel({
  projectId,
  projects,
  university,
  onEdit,
}: UniversityExampleMilestonePanelProps) {
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <div className="bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Milestone Not Found
        </h3>
        <p className="text-slate-400 text-sm">
          The selected milestone could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{project.icon || "📚"}</span>
              <h2 className="text-lg font-semibold text-white line-clamp-2">
                {project.title}
              </h2>
            </div>
            <Badge className="bg-blue-700 text-blue-200 text-xs">
              University Example
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-slate-400 hover:text-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Description */}
        {project.description && (
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Description</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {project.description}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Milestone Details</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Category</span>
              <Badge variant="outline" className="text-xs">
                {project.metadata?.category || 'Academic'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Importance</span>
              <Badge variant="outline" className="text-xs">
                {project.metadata?.importance || 'Important'}
              </Badge>
            </div>
            
            {project.metadata?.target_timeframe && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Timeframe</span>
                <span className="text-xs text-slate-400">
                  {project.metadata.target_timeframe}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Target University</span>
              <span className="text-xs text-slate-400">
                {university.name}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-800">
          <Button
            onClick={onEdit}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Milestone
          </Button>
        </div>

        {/* Example Note */}
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">
            💡 This is an example milestone for university pathway planning.
            Edit to customize the details for your specific requirements.
          </p>
        </div>
      </div>
    </div>
  );
}

// Build university example journey map in current format (North Star at top, projects flowing down)
function buildUniversityExampleJourneyMap(
  projects: ProjectWithMilestones[],
  northStar: NorthStar,
  callbacks: MapBuilderCallbacks,
  paths: any[],
  numericZoom: number = 1,
  savedNorthStarPosition: {x: number, y: number} | null = null
): { nodes: Node[]; edges: Edge[] } {
  const newNodes: Node[] = [];
  const newEdges: Edge[] = [];

  // Create North Star entity node - use saved position if available, otherwise default
  const northStarPosition = savedNorthStarPosition || { x: 0, y: -300 };
  newNodes.push({
    id: northStar.id,
    type: "northStarEntity",
    position: northStarPosition,
    data: {
      northStar,
      linkedProjectCount: projects.length,
      hasRecentActivity: false,
      numericZoom,
      onEdit: () => callbacks.onEditNorthStar?.(northStar),
      onViewDetails: () => callbacks.onViewNorthStarDetails?.(northStar.id),
      onUpdateProgress: () => {
        console.log("Update progress for:", northStar.title);
      },
      onCreateProject: () => callbacks.onCreateProjectForNorthStar?.(northStar.id),
      onQuickStatusChange: (newStatus: NorthStar["status"]) =>
        callbacks.onQuickStatusChange?.(northStar, newStatus),
    },
    draggable: true,
    selectable: true,
  });


  // Create milestone project nodes flowing down from North Star
  projects.forEach((project, index) => {
    // Use saved positions if available, otherwise use default layout
    const position = {
      x: project.position_x || 0,
      y: project.position_y || (-100 + (index * 200)) // Start below North Star, space 200px apart
    };

    newNodes.push({
      id: project.id,
      type: "shortTerm",
      position,
      data: {
        project,
        icon: project.icon || "🎯",
        hasRecentActivity: false,
        isMainQuest: false,
        northStarTitle: northStar.title,
        numericZoom,
        onViewMilestones: () => callbacks.onViewMilestones(project.id),
        onEdit: () => callbacks.onEditProject(project.id),
      },
      draggable: true,
      selectable: true,
    });

    // Create edge from North Star to first project, or project to project
    if (index === 0) {
      // First project: connect from North Star
      newEdges.push({
        id: `${northStar.id}-${project.id}`,
        source: northStar.id,
        target: project.id,
        type: "floating",
        animated: true,
        style: {
          stroke: "#9B59B6",
          strokeWidth: 2.5,
          strokeDasharray: "8,4",
        },
      });
    } else {
      // Subsequent projects: connect from previous project
      const previousProject = projects[index - 1];
      newEdges.push({
        id: `${previousProject.id}-${project.id}`,
        source: previousProject.id,
        target: project.id,
        type: "floating",
        animated: true,
        style: {
          stroke: "#9B59B6",
          strokeWidth: 2.5,
          strokeDasharray: "8,4",
        },
      });
    }
  });

  return { nodes: newNodes, edges: newEdges };
}

export function UniversityExampleJourneyCanvas({
  university,
  user,
  persona,
  onEditPersona,
  existingMapId,
  initialMapData,
  initialExampleData,
}: UniversityExampleJourneyCanvasProps) {
  const supabase = createClient();
  const router = useRouter();
  const panelRef = useRef<ImperativePanelHandle>(null);
  
  // Example map metadata
  const [exampleMapData, setExampleMapData] = React.useState<ExampleMapMetadata>({
    title: initialMapData?.title || '',
    description: initialMapData?.description || '',
    target_audience: initialMapData?.target_audience || ''
  });
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Track if this is an existing map being edited
  const [existingMapIdState, setExistingMapIdState] = React.useState<string | null>(existingMapId || null);

  // Create a synthetic North Star for this university
  const universityNorthStar = useMemo<NorthStar>(() => ({
    id: `university-${university.id}`,
    user_id: user.id,
    title: `Get into ${university.name}`,
    description: `Academic and personal journey toward admission to ${university.name}`,
    why: `To achieve my goal of studying at ${university.name} and pursuing my academic dreams.`,
    icon: "🎓",
    sdg_goals: [],
    career_path: null,
    north_star_shape: "star",
    north_star_color: "blue",
    status: "active",
    is_public: false,
    position_x: 400,
    position_y: 200,
    progress_percentage: 0,
    priority: 1,
    metadata: {
      isUniversityExample: true,
      universityId: university.id
    },
    created_at: "2024-01-01T00:00:00.000Z", // Static for SSR consistency
    updated_at: "2024-01-01T00:00:00.000Z", // Static for SSR consistency
    completed_at: null
  }), [university, user]);

  // Mock projects data for university example (we'll call them milestones in the UI)
  const [projects, setProjects] = React.useState<ProjectWithMilestones[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Start with loading=true to load existing data
  const [milestoneCounter, setMilestoneCounter] = React.useState(1);
  const [savedNorthStarPosition, setSavedNorthStarPosition] = React.useState<{x: number, y: number} | null>(null);
  
  // Load existing map data if editing
  React.useEffect(() => {
    if (initialExampleData) {
      try {
        // Load existing milestones
        if (initialExampleData.milestones && Array.isArray(initialExampleData.milestones)) {
          const loadedProjects = initialExampleData.milestones.map((milestone: any, index: number) => ({
            id: `milestone-${index + 1}`,
            user_id: user.id,
            title: milestone.title || '',
            description: milestone.description || '',
            project_type: 'short_term' as const,
            color: '#3B82F6',
            icon: '📚',
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            position_x: milestone.position_x || 0,
            position_y: milestone.position_y || 0,
            metadata: {
              category: milestone.category || 'academic',
              importance: milestone.importance || 'important',
              target_timeframe: milestone.target_timeframe || ''
            },
            milestones: []
          }));
          setProjects(loadedProjects);
          setMilestoneCounter(loadedProjects.length + 1);
        }
        
        // Load saved north star position
        if (initialExampleData.metadata?.north_star) {
          const northStar = initialExampleData.metadata.north_star;
          if (northStar.position_x !== undefined && northStar.position_y !== undefined) {
            setSavedNorthStarPosition({ 
              x: northStar.position_x, 
              y: northStar.position_y 
            });
          }
        }
      } catch (error) {
        console.error('Error loading existing map data:', error);
      }
    }
    setIsLoading(false);
  }, [initialExampleData, user.id]);
  
  // Journey map state
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedNorthStarId,
    setSelectedNorthStarId,
    handleSelectionChange,
    viewMode,
    createProjectOpen,
    editProjectOpen,
    editingProject,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    isPanelMinimized,
    setIsPanelMinimized,
    isNavigationExpanded,
    setIsNavigationExpanded,
  } = useJourneyMapState();

  // React Flow node and edge state
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  // Paths (connections between milestones)
  const [paths, setPaths] = React.useState<any[]>([]);
  
  // Zoom level
  const [zoomLevel, setZoomLevel] = React.useState<"low" | "medium" | "high">("medium");
  const [numericZoom, setNumericZoom] = React.useState<number>(1);

  // Load existing example maps on mount
  React.useEffect(() => {
    const loadExistingExampleMaps = async () => {
      try {
        setIsLoading(true);
        const existingMaps = await getUniversityExampleMaps(university.id);
        
        if (existingMaps.length > 0) {
          // Load the most recent example map
          const latestMap = existingMaps[0];
          setExistingMapIdState(latestMap.id);
          
          console.log('Loading existing map:', latestMap);
          
          // Set the example map metadata
          setExampleMapData({
            title: latestMap.title,
            description: latestMap.description || '',
            target_audience: latestMap.target_audience || ''
          });
          
          // Convert saved milestones back to project format
          if (latestMap.example_data?.milestones) {
            const loadedProjects = latestMap.example_data.milestones.map((milestone: any, index: number) => ({
              id: `milestone-${index + 1}`,
              user_id: user.id,
              title: milestone.title,
              description: milestone.description || null,
              goal: null,
              why: null,
              project_type: "learning",
              north_star_id: universityNorthStar.id,
              is_main_quest: false,
              position_x: milestone.position_x !== undefined ? milestone.position_x : 0,
              position_y: milestone.position_y !== undefined ? milestone.position_y : (-100 + (index * 200)),
              status: "not_started",
              color_theme: null,
              start_date: null,
              target_end_date: null,
              actual_end_date: null,
              priority: index + 1,
              tags: null,
              color: null,
              icon: "📚",
              cover_image_url: null,
              cover_image_blurhash: null,
              cover_image_key: null,
              progress_percentage: 0,
              is_public: false,
              metadata: {
                isUniversityMilestone: true,
                universityId: university.id,
                category: milestone.category || "academic",
                importance: milestone.importance || "important",
                target_timeframe: milestone.target_timeframe || ""
              },
              linked_north_star_id: universityNorthStar.id,
              created_at: "2024-01-01T00:00:00.000Z",
              updated_at: "2024-01-01T00:00:00.000Z",
              completed_at: null,
              milestones: [],
              milestone_count: 0,
              completed_milestone_count: 0,
              reflection_count: 0
            }));
            
            setProjects(loadedProjects);
            setMilestoneCounter(loadedProjects.length + 1);
            console.log('Loaded projects:', loadedProjects);
          }
          
          // Load saved north star position if available
          if (latestMap.example_data?.metadata?.north_star) {
            const northStarData = latestMap.example_data.metadata.north_star;
            if (northStarData.position_x !== undefined && northStarData.position_y !== undefined) {
              setSavedNorthStarPosition({
                x: northStarData.position_x,
                y: northStarData.position_y
              });
              console.log('Loaded north star position:', { x: northStarData.position_x, y: northStarData.position_y });
            }
          }
        } else {
          console.log('No existing maps found for university:', university.id);
        }
      } catch (error) {
        console.error('Error loading existing example maps:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingExampleMaps();
  }, [university.id, user.id, universityNorthStar.id]);

  // Set the university north star as selected by default
  React.useEffect(() => {
    setSelectedNorthStarId(universityNorthStar.id);
  }, [universityNorthStar.id, setSelectedNorthStarId]);

  // Build university example journey map and sync with React Flow state
  useEffect(() => {
    // Ensure projects is always an array
    const projectsArray = Array.isArray(projects) ? projects : [];
    
    const result = buildUniversityExampleJourneyMap(
      projectsArray,
      universityNorthStar,
      {
        onViewMilestones: () => {},
        onEditProject: (project) => {
          openEditDialog(project);
        },
        onAddReflection: () => {},
        onEditNorthStar: () => {},
        onCreateProjectForNorthStar: () => {
          openCreateDialog(universityNorthStar.id);
        },
        onViewNorthStarDetails: () => {},
        onQuickStatusChange: () => {},
      },
      paths,
      numericZoom,
      savedNorthStarPosition
    );
    
    setNodes(result.nodes);
    setEdges(result.edges);
  }, [
    projects,
    universityNorthStar,
    paths,
    openEditDialog,
    openCreateDialog,
    numericZoom,
    savedNorthStarPosition?.x,
    savedNorthStarPosition?.y,
    setNodes,
    setEdges,
  ]);

  // Mock project creation for university examples
  const handleCreateProject = useCallback(async (projectData: any) => {
    const newProject: ProjectWithMilestones = {
      id: `milestone-${milestoneCounter}`,
      user_id: user.id,
      title: projectData.title,
      description: projectData.description || null,
      goal: projectData.goal || null,
      why: projectData.why || null,
      project_type: projectData.projectType || "learning",
      north_star_id: universityNorthStar.id,
      is_main_quest: false,
      position_x: 0,
      position_y: -100 + (milestoneCounter * 200),
      status: "not_started",
      color_theme: null,
      start_date: null,
      target_end_date: null,
      actual_end_date: null,
      priority: milestoneCounter,
      tags: null,
      color: null,
      icon: projectData.icon || "📚",
      cover_image_url: null,
      cover_image_blurhash: null,
      cover_image_key: null,
      progress_percentage: 0,
      is_public: false,
      metadata: {
        isUniversityMilestone: true,
        universityId: university.id,
        category: projectData.category || "academic",
        importance: projectData.importance || "important",
        target_timeframe: projectData.target_timeframe || ""
      },
      linked_north_star_id: universityNorthStar.id,
      created_at: "2024-01-01T00:00:00.000Z", // Static for SSR consistency
      updated_at: "2024-01-01T00:00:00.000Z", // Static for SSR consistency
      completed_at: null,
      milestones: [], // Empty for now
      milestone_count: 0,
      completed_milestone_count: 0,
      reflection_count: 0
    };

    setProjects(prev => [...prev, newProject]);
    setMilestoneCounter(prev => prev + 1);
    closeCreateDialog();
    toast.success(`Milestone "${newProject.title}" added to example`);
  }, [user.id, universityNorthStar.id, milestoneCounter, closeCreateDialog, university.id]);

  // Mock project update
  const handleUpdateProject = useCallback(async (projectId: string, updateData: any) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? { 
            ...project, 
            ...updateData, 
            metadata: { 
              ...project.metadata, 
              category: updateData.category || project.metadata?.category,
              importance: updateData.importance || project.metadata?.importance,
              target_timeframe: updateData.target_timeframe || project.metadata?.target_timeframe
            },
            updated_at: "2024-01-01T00:00:00.000Z" // Static for SSR consistency
          }
        : project
    ));
    closeEditDialog();
    toast.success("Milestone updated");
  }, [closeEditDialog]);

  // Mock project deletion
  const handleDeleteProject = useCallback(async (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    toast.success("Milestone removed from example");
  }, []);

  // Mock path creation for university examples (just prevent errors)
  const handlePathCreate = useCallback(async (fromId: string, toId: string, pathType: string) => {
    // For university examples, we don't create real database paths
    // Just prevent the error and show a message
    console.log('Path creation disabled for university examples');
    return Promise.resolve();
  }, []);

  // Mock path deletion for university examples  
  const handlePathDelete = useCallback(async (pathId: string) => {
    // For university examples, we don't delete real database paths
    console.log('Path deletion disabled for university examples');
    return Promise.resolve();
  }, []);

  // Handle node position updates for drag functionality
  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    if (node.id === universityNorthStar.id) {
      // Update north star position in state if needed
      // For university examples, we can just log the position change
      console.log('North star position updated:', node.position);
    } else {
      // Update project position in local state
      setProjects(prev => prev.map(project => 
        project.id === node.id 
          ? { 
              ...project, 
              position_x: node.position.x,
              position_y: node.position.y,
              updated_at: "2024-01-01T00:00:00.000Z" // Static for SSR consistency
            }
          : project
      ));
      console.log(`Milestone position updated:`, node.position);
    }
  }, [universityNorthStar.id]);

  // Handle selection changes
  const handleCanvasSelectionChange = useCallback((params: any) => {
    if (params.nodes.length > 0) {
      const selectedNode = params.nodes[0];
      if (selectedNode.type === 'northStarEntity') {
        setSelectedNorthStarId(selectedNode.id);
        setSelectedProjectId(null);
      } else {
        setSelectedProjectId(selectedNode.id);
        setSelectedNorthStarId(null);
      }
    } else {
      setSelectedProjectId(null);
      setSelectedNorthStarId(null);
    }
  }, [setSelectedNorthStarId, setSelectedProjectId]);

  // Calculate journey stats
  const journeyStats = useMemo(() => {
    // Ensure projects is always an array with safe fallback
    const projectsArray = Array.isArray(projects) ? projects : [];
    // Additional safety check to ensure all array elements are valid
    const validProjectsArray = projectsArray.filter(p => p && typeof p === 'object');
    return calculateJourneyStats(validProjectsArray);
  }, [projects]);

  // Node and edge types for ReactFlow
  const nodeTypes = {
    userCenter: UserCenterNode,
    northStar: NorthStarProjectNode,
    northStarEntity: NorthStarNode,
    shortTerm: ShortTermProjectNode,
  };

  const edgeTypes = {
    mainQuest: MainQuestFloatingPath,
    northStar: NorthStarFloatingLink,
    projectLink: ProjectFloatingEdge,
    floating: FloatingEdge,
  };

  // Save example map
  const handleSaveExampleMap = async () => {
    if (!exampleMapData.title.trim()) {
      toast.error("Example map title is required");
      return;
    }

    if (projects.length === 0) {
      toast.error("At least one milestone is required");
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('Starting save process...', { university, projects, exampleMapData });
      
      // Convert projects to milestone format for saving (including positions)
      const milestonesData = projects.map(project => {
        // Find the current node position for this project
        const currentNode = nodes.find(node => node.id === project.id);
        const position = currentNode ? currentNode.position : { x: project.position_x || 0, y: project.position_y || 0 };
        
        return {
          title: project.title,
          description: project.description || "",
          target_timeframe: project.metadata?.target_timeframe || "",
          category: project.metadata?.category || "academic",
          importance: project.metadata?.importance || "important",
          position_x: position.x,
          position_y: position.y
        };
      });

      // Get north star position from current nodes
      const northStarNode = nodes.find(node => node.id === universityNorthStar.id);
      const northStarPosition = northStarNode ? northStarNode.position : { x: 0, y: -300 };

      const exampleData = {
        milestones: milestonesData,
        persona: persona || null,
        metadata: {
          created_with: "journey_canvas",
          milestone_count: projects.length,
          north_star: {
            title: universityNorthStar.title,
            description: universityNorthStar.description,
            position_x: northStarPosition.x,
            position_y: northStarPosition.y
          }
        }
      };

      const insertData = {
        university_id: university.id,
        title: exampleMapData.title,
        description: exampleMapData.description || null,
        target_audience: exampleMapData.target_audience || null,
        example_data: exampleData
      };

      console.log('Insert/Update data:', insertData);

      let data, error;

      if (existingMapIdState) {
        // Update existing map
        console.log('Updating existing map with ID:', existingMapIdState);
        const result = await supabase
          .from('university_example_maps')
          .update(insertData)
          .eq('id', existingMapIdState)
          .select();
        data = result.data;
        error = result.error;
      } else {
        // Create new map
        console.log('Creating new map');
        const result = await supabase
          .from('university_example_maps')
          .insert(insertData)
          .select();
        data = result.data;
        error = result.error;
        
        // Set the existing map ID for future updates
        if (!error && data && data.length > 0) {
          setExistingMapIdState(data[0].id);
        }
      }
      
      if (error) {
        console.error('Database error:', error);
        toast.error(`Database error: ${error.message}`);
        return;
      }
      
      console.log('Save successful:', data);
      toast.success(existingMapIdState ? 'Example journey map updated successfully' : 'Example journey map created successfully');
      
      // Close dialog and wait a moment before redirecting to ensure the toast is visible
      setShowSaveDialog(false);
      setTimeout(() => {
        router.push('/admin/archive/universities');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving example map:', error);
      toast.error(`Failed to save example map: ${error.message || error}`);
      setShowSaveDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/archive/universities')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-px h-6 bg-slate-600" />
            <div>
              <h1 className="text-xl font-semibold text-white">
                Create Example Journey Map
              </h1>
              <p className="text-sm text-slate-400">
                {university.name} • {projects.length} milestones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {persona && onEditPersona && (
              <Button
                variant="outline"
                onClick={onEditPersona}
                className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
              >
                <Users className="w-4 h-4 mr-2" />
                Edit Persona
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              disabled={projects.length === 0}
              className="border-green-600 text-green-400 hover:bg-green-600/10"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Example Map
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 h-full">
        <ReactFlowProvider>
          <ResizablePanelGroup id="university-journey-panels" direction="horizontal" className="h-full">
            {/* Main Journey Canvas */}
            <ResizablePanel
              id="university-journey-left-panel"
              defaultSize={isPanelMinimized ? 85 : 70}
              minSize={50}
              className="relative h-full"
            >
              <div className="h-full flex flex-col relative">
                {/* Action Bar */}
                <JourneyActionBar
                  stats={journeyStats}
                  onCreateProject={() => openCreateDialog(universityNorthStar.id)}
                  onCreateNorthStar={() => {}} // Not needed for examples
                />
                
                {/* Navigation Toggle */}
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNavigationExpanded(!isNavigationExpanded)}
                    className="bg-slate-900/80 border border-slate-700 hover:bg-slate-800"
                  >
                    {isNavigationExpanded ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {/* Main ReactFlow Canvas */}
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading university example map...</p>
                      </div>
                    </div>
                  ) : (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={(changes) => {
                      setNodes((nds) => applyNodeChanges(changes, nds));
                    }}
                    onEdgesChange={(changes) => {
                      setEdges((eds) => applyEdgeChanges(changes, eds));
                    }}
                    onSelectionChange={handleCanvasSelectionChange}
                    onNodeDragStop={handleNodeDragStop}
                    onConnect={() => {
                      // Disable path creation for university examples
                      console.log('Path creation disabled for university examples');
                    }}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={FLOW_CONFIG.FIT_VIEW_OPTIONS}
                    minZoom={FLOW_CONFIG.MIN_ZOOM}
                    maxZoom={FLOW_CONFIG.MAX_ZOOM}
                    defaultEdgeOptions={{
                      type: "straight",
                      animated: false,
                    }}
                    connectionMode={ConnectionMode.Loose}
                    connectionLineType="smoothstep"
                    nodesDraggable={true}
                    nodesConnectable={false} // Disable connections for university examples
                    connectOnClick={false}
                    elementsSelectable={true}
                    edgesReconnectable={false}
                    deleteKeyCode={["Delete", "Backspace"]}
                    panOnScroll={true}
                    panOnDrag={FLOW_CONFIG.PAN_ON_DRAG}
                    attributionPosition="bottom-left"
                    onlyRenderVisibleElements={true}
                    elevateEdgesOnSelect={false}
                    disableKeyboardA11y={true}
                  >
                    <Background
                      gap={BACKGROUND_CONFIG.GAP}
                      size={BACKGROUND_CONFIG.SIZE}
                      color={BACKGROUND_CONFIG.COLOR}
                      style={{ backgroundColor: BACKGROUND_CONFIG.BG_COLOR }}
                    />
                    <Controls
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                  </ReactFlow>
                  )}
                </div>
                
                {/* Navigation Guide */}
                {isNavigationExpanded && (
                  <NavigationGuide />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Side Panel */}
            <ResizablePanel
              id="university-journey-right-panel"
              ref={panelRef}
              defaultSize={isPanelMinimized ? 15 : 30}
              minSize={15}
              maxSize={50}
              className="border-l border-slate-700"
            >
              <div className="h-full bg-slate-900">
                {selectedProjectId ? (
                  <UniversityExampleMilestonePanel
                    projectId={selectedProjectId}
                    projects={projects}
                    university={university}
                    onEdit={() => {
                      const project = projects.find(p => p.id === selectedProjectId);
                      if (project) openEditDialog(project);
                    }}
                  />
                ) : (
                  <div className="p-6 space-y-6">
                    <Card className="bg-slate-800 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">
                          🎓 {university.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-slate-300 text-sm">
                          Create milestones that guide students toward admission to this university.
                        </p>
                        
                        <Button
                          onClick={() => openCreateDialog(universityNorthStar.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Add Milestone
                        </Button>

                        <div className="text-xs text-slate-400">
                          <div>Milestones: {projects.length}</div>
                          <div>Target: {university.name}</div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {projects.length > 0 && (
                      <Card className="bg-slate-800 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-sm text-white">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onClick={() => setShowSaveDialog(true)}
                            className="w-full"
                            variant="outline"
                          >
                            Save Example Map
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ReactFlowProvider>
      </div>

      {/* Create Milestone Dialog */}
      <CreateUniversityMilestoneDialog
        open={createProjectOpen}
        onOpenChange={closeCreateDialog}
        onSuccess={handleCreateProject}
        university={university}
      />

      {/* Edit Milestone Dialog */}
      <EditProjectDialog
        open={editProjectOpen}
        onOpenChange={closeEditDialog}
        project={editingProject}
        onSuccess={(updatedProject) => {
          if (editingProject) {
            handleUpdateProject(editingProject.id, updatedProject);
          }
        }}
      />

      {/* Save Example Map Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save Example Journey Map</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map_title">Title *</Label>
              <Input
                id="map_title"
                value={exampleMapData.title}
                onChange={(e) => setExampleMapData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`e.g., CS Major Path to ${university.name}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map_target_audience">Target Audience</Label>
              <Input
                id="map_target_audience"
                value={exampleMapData.target_audience}
                onChange={(e) => setExampleMapData(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="e.g., Computer Science, AI/ML, Game Development"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map_description">Description</Label>
              <Textarea
                id="map_description"
                value={exampleMapData.description}
                onChange={(e) => setExampleMapData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this example journey map..."
                rows={3}
              />
            </div>

            <div className="bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
              <div><strong>University:</strong> {university.name}</div>
              <div><strong>Milestones:</strong> {projects.length}</div>
              <div><strong>North Star:</strong> Get into {university.name}</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveExampleMap}
              disabled={isSaving || !exampleMapData.title.trim() || projects.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Saving..." : "Save Example Map"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}