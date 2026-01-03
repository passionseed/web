"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Controls,
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnSelectionChangeParams,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { NodeViewPanel } from "@/components/map/NodeViewPanel";
import { FullLearningMap } from "@/lib/supabase/maps";
import {
  getStudentProgress,
  loadAllProgress as loadMapProgress,
  type StudentProgress,
} from "@/lib/supabase/progresses";
import { MapNode } from "@/types/map";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import { CommentNode } from "@/components/map/CommentNode";
import { SubmissionList } from "./SubmissionList";
import { InlineGradingForm } from "./InlineGradingForm";
import { getSubmissionsForMap } from "@/lib/supabase/grading";
import {
  getTeamMapClassroomInfo,
  getUserClassroomRoleClient,
  getUserTeamForMap,
} from "@/lib/supabase/maps";
import { getTeamProgressForInstructor } from "@/lib/supabase/team-progress";
import { getAllSeedRoomClaims, getStudentLocationsInRoom } from "@/app/actions/team-actions";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Lock,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import FloatingEdge from "@/components/map/FloatingEdge";
import { SeedCompletionModal } from "@/components/seeds/SeedCompletionModal";
import { SeedLeaderboard } from "@/components/seeds/SeedLeaderboard";
import { markSeedRoomCompleted, checkSeedRoomCompletion, isEndNode } from "@/lib/supabase/seed-completion";
import { isEditable } from "@/lib/dom/is-editable";

interface MapViewerProps {
  map: FullLearningMap;
  seedRoomId?: string;
  seedTitle?: string;
  seedId?: string;
  roomSettingsComponent?: React.ReactNode;
}

const edgeTypes = {
  floating: FloatingEdge,
};

const miniMapConfig = {
  position: "bottom-right" as const,
  nodeBorderRadius: 8,
  nodeStrokeWidth: 2,
  nodeColor: (node: any) => {
    const progress = node.data?.progress;
    if (!progress) return "#94a3b8"; // Default slate-400

    switch (progress.status) {
      case "passed":
        return "#22c55e"; // Green-500
      case "failed":
        return "#ef4444"; // Red-500
      case "submitted":
        return "#3b82f6"; // Blue-500
      case "in_progress":
        return "#f59e0b"; // Amber-500
      default:
        return "#94a3b8"; // Slate-400
    }
  },
  style: {
    transform: "scale(0.8)",
    transformOrigin: "bottom right",
  },
  nodeStrokeColor: "#ffffff",
  bgColor: "rgba(15, 23, 42, 0.8)", // slate-900 with opacity
  maskColor: "rgba(255, 255, 255, 0.1)",
  maskStrokeColor: "#ffffff",
  maskStrokeWidth: 1,
  pannable: true,
  zoomable: true,
  ariaLabel: "Learning map overview",
  offsetScale: 5,
};

export function MapViewer({ map, seedRoomId, seedTitle, seedId, roomSettingsComponent }: MapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  // Allow both individual (Record<string, StudentProgress>) and team summaries
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showGradingOverview, setShowGradingOverview] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [classroomRole, setClassroomRole] = useState<string | null>(null);
  const [isTeamMap, setIsTeamMap] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamClaims, setTeamClaims] = useState<Record<string, any>>({});
  const [studentLocations, setStudentLocations] = useState<Record<string, any[]>>({});
  const reactFlowInstance = useReactFlow();

  // Seed completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasCompletedSeed, setHasCompletedSeed] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [completionData, setCompletionData] = useState<{
    completionId: string;
    completionDate: string;
    nodeId: string;
  } | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Role detection for instructor/TA functionality
  const { user: authUser, userRoles, isAuthenticated } = useAuth();

  // Use a strict union for roles to satisfy prop typing
  type UserRole = "instructor" | "TA" | "student" | "admin";
  const globalUserRole: UserRole = useMemo(() => {
    return userRoles?.includes("admin")
      ? "admin"
      : userRoles?.includes("instructor")
        ? "instructor"
        : userRoles?.includes("TA")
          ? "TA"
          : "student";
  }, [userRoles]);

  // Normalize classroom role into the union or ignore if unknown
  const roleFromClassroom = useMemo(() => {
    return classroomRole === "instructor" ||
      classroomRole === "TA" ||
      classroomRole === "student"
      ? (classroomRole as UserRole)
      : null;
  }, [classroomRole]);

  // Use classroom role if available, otherwise fall back to global role
  const userRole: UserRole = roleFromClassroom ?? globalUserRole;
  const isInstructorOrTA = useMemo(() => {
    return (
      userRole === "instructor" || userRole === "TA" || userRole === "admin"
    );
  }, [userRole]);

  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);

  // Toggle panel minimize/maximize
  const togglePanelSize = useCallback(() => {
    if (!rightPanelRef.current || !leftPanelRef.current) return;

    if (isPanelMinimized) {
      // Maximize: restore to appropriate size based on selection
      if (selectedNode) {
        rightPanelRef.current.resize(65);
        leftPanelRef.current.resize(35);
      } else {
        rightPanelRef.current.resize(30);
        leftPanelRef.current.resize(70);
      }
      setIsPanelMinimized(false);
    } else {
      // Minimize: shrink right panel to minimal size
      rightPanelRef.current.resize(5);
      leftPanelRef.current.resize(95);
      setIsPanelMinimized(true);
    }
  }, [isPanelMinimized, selectedNode]);

  // Keyboard navigation (scoped to non-editable contexts)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!reactFlowInstance) return;

      // Do not handle when user is typing or during IME composition
      if (event.isComposing) return;
      if (isEditable(event.target)) return;

      const key = event.key?.toLowerCase?.() ?? event.key;
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

      // Do not intercept plain character keys like "f" without a modifier
      if (key && key.length === 1 && !hasModifier) {
        return;
      }

      // Escape to clear selection
      if (key === "escape") {
        setSelectedNode(null);
        if (rightPanelRef.current && leftPanelRef.current) {
          leftPanelRef.current.resize(70);
          rightPanelRef.current.resize(30);
        }
        return;
      }

      // Only manage Tab-based map navigation outside of editable elements
      if (key === "tab" && !hasModifier) {
        event.preventDefault();
        navigateToAdjacentNode(event.shiftKey ? -1 : 1);
        return;
      }

      // Example global shortcut: toggle navigation guide with Cmd/Ctrl+K
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setIsNavigationExpanded((v) => !v);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlowInstance, selectedNode]);

  // Function to navigate to adjacent unlocked nodes
  const navigateToAdjacentNode = (direction: 1 | -1) => {
    // Only navigate through learning nodes, not text nodes
    const learningNodes = map.map_nodes.filter(
      (node) => (node as any)?.node_type !== "text"
    );
    const unlockedNodes = learningNodes.filter((node) =>
      isNodeUnlocked(node.id)
    );
    if (unlockedNodes.length === 0) return;

    const currentIndex = selectedNode
      ? unlockedNodes.findIndex((node) => node.id === selectedNode.id)
      : -1;

    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = direction === 1 ? 0 : unlockedNodes.length - 1;
    } else {
      nextIndex =
        (currentIndex + direction + unlockedNodes.length) %
        unlockedNodes.length;
    }

    const nextNode = unlockedNodes[nextIndex];
    if (nextNode && reactFlowInstance) {
      // Select the node
      reactFlowInstance.setCenter(
        (nextNode.metadata as any)?.position?.x || 0,
        (nextNode.metadata as any)?.position?.y || 0,
        { zoom: 1.2, duration: 600 }
      );

      // Update selection
      setSelectedNode({
        id: nextNode.id,
        data: nextNode,
        position: (nextNode.metadata as any)?.position || { x: 0, y: 0 },
      });
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // Check if user has already completed this seed
  useEffect(() => {
    const checkCompletion = async () => {
      if (seedRoomId && currentUser) {
        const { completed, completion } = await checkSeedRoomCompletion(
          seedRoomId,
          currentUser.id
        );
        if (completed && completion) {
          setHasCompletedSeed(true);
          setShowCompletionBanner(true);
          setCompletionData({
            completionId: completion.id,
            completionDate: completion.completed_at,
            nodeId: completion.completed_node_id || "",
          });
        }
      }
    };
    checkCompletion();
  }, [seedRoomId, currentUser]);

  // Watch for end node completion when progressMap updates
  useEffect(() => {
    const checkEndNodeCompletion = async () => {
      // Only check for seed completion if this is a seed room
      if (seedRoomId && currentUser && selectedNode && !hasCompletedSeed) {
        const nodeData = selectedNode.data;

        // Check if the current node is an end node
        if (isEndNode(nodeData.node_type)) {
          // Check if the node has been passed (for nodes with assessments) or just visited
          const nodeProgress = progressMap[selectedNode.id];

          // Check for multiple possible completion statuses
          const isNodeCompleted =
            nodeProgress?.status === "passed" ||
            nodeProgress?.status === "submitted" ||
            nodeProgress?.status === "failed"; // Include failed to show completion modal even if they didn't pass

          if (isNodeCompleted) {
            // Mark the seed as completed
            const { data, error } = await markSeedRoomCompleted(
              seedRoomId,
              currentUser.id,
              selectedNode.id
            );

            if (error) {
              console.error("❌ [MapViewer] Error marking seed complete:", error);
            } else if (data) {
              setHasCompletedSeed(true);
              setCompletionData({
                completionId: data.id,
                completionDate: data.completed_at,
                nodeId: data.completed_node_id || "",
              });
              setShowCompletionModal(true);
            }
          }
        }
      }
    };

    checkEndNodeCompletion();
  }, [progressMap, seedRoomId, currentUser, selectedNode, hasCompletedSeed]);


  const loadAllProgress = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log("🗺️ [MapViewer] Loading progress for map:", map.id);

      let progressData;

      // For instructors viewing team maps, load team progress instead of individual progress
      if (isTeamMap && isInstructorOrTA && teamId) {
        console.log("👥 [MapViewer] Loading TEAM progress for instructor");
        progressData = await getTeamProgressForInstructor(map.id, teamId);

        console.log(
          "✅ [MapViewer] Loaded team progress for",
          Object.keys(progressData).length,
          "nodes"
        );
      } else {
        // Use the standard individual progress loading
        progressData = await loadMapProgress(map.id);

        console.log(
          "✅ [MapViewer] Loaded individual progress for",
          Object.keys(progressData).length,
          "nodes"
        );
      }

      setProgressMap(progressData);
    } catch (error) {
      console.error("❌ [MapViewer] Error loading progress:", error);
      setProgressMap({}); // Fallback to empty progress
    }
  }, [currentUser, map.id, isTeamMap, isInstructorOrTA, teamId]);

  const loadAllSubmissions = useCallback(async () => {
    if (!isInstructorOrTA) return;

    setIsLoadingSubmissions(true);
    try {
      const submissions = await getSubmissionsForMap(map.id);
      setAllSubmissions(submissions);
    } catch (error) {
      console.error("Error loading submissions:", error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [isInstructorOrTA, map.id]);

  useEffect(() => {
    if (currentUser) {
      loadAllProgress();

      // Load team claims and locations if in a seed room
      if (seedRoomId) {
        const fetchData = async () => {
          try {
            const [claims, locations] = await Promise.all([
              getAllSeedRoomClaims(seedRoomId),
              getStudentLocationsInRoom(seedRoomId)
            ]);
            setTeamClaims(claims);
            setStudentLocations(locations);
          } catch (err) {
            console.error("Error loading room data:", err);
          }
        };
        fetchData();
      }

      if (isInstructorOrTA) {
        loadAllSubmissions();

        // Set up periodic refresh for real-time updates (every 30 seconds)
        const interval = setInterval(() => {
          loadAllSubmissions();
          if (seedRoomId) {
            Promise.all([
              getAllSeedRoomClaims(seedRoomId),
              getStudentLocationsInRoom(seedRoomId)
            ]).then(([claims, locations]) => {
              setTeamClaims(claims);
              setStudentLocations(locations);
            });
          }
        }, 30000);

        return () => clearInterval(interval);
      } else if (seedRoomId) {
        // For students, also refresh locations periodically
        const interval = setInterval(() => {
          Promise.all([
            getAllSeedRoomClaims(seedRoomId),
            getStudentLocationsInRoom(seedRoomId)
          ]).then(([claims, locations]) => {
            setTeamClaims(claims);
            setStudentLocations(locations);
          });
        }, 10000); // More frequent updates for students (10s) to see movement
        return () => clearInterval(interval);
      }
    }
  }, [currentUser, map, isInstructorOrTA, seedRoomId]);

  // Check if map is a team map and get classroom role
  useEffect(() => {
    const checkTeamMapAndRole = async () => {
      if (!currentUser) return;

      try {
        // Check if this map is a team map
        const teamMapInfo = await getTeamMapClassroomInfo(map.id);
        setIsTeamMap(teamMapInfo.isTeamMap);
        setTeamId(teamMapInfo.teamId || null);

        if (teamMapInfo.isTeamMap && teamMapInfo.classroomId) {
          // Get user's role in the classroom
          const role = await getUserClassroomRoleClient(
            teamMapInfo.classroomId
          );
          if (role) {
            setClassroomRole(role);
            console.log(
              "👥 [MapViewer] User role in classroom:",
              role,
              "for classroom:",
              teamMapInfo.classroomId
            );
          }
        }
      } catch (error) {
        console.error(
          "❌ [MapViewer] Error checking team map or classroom role:",
          error
        );
      }
    };

    checkTeamMapAndRole();
  }, [currentUser, map.id]);

  // Check if node is unlocked based on prerequisites
  const isNodeUnlocked = (nodeId: string): boolean => {
    // Find the node data
    const nodeData = map.map_nodes.find((n) => n.id === nodeId);

    // Text nodes are always "unlocked" (visible) since they're just annotations
    if ((nodeData as any)?.node_type === "text") {
      return true;
    }

    // Instructors/TAs can see all nodes (both team and personal maps)
    if (isInstructorOrTA) {
      return true;
    }

    // Find all nodes that have paths leading to this node
    const prerequisites = map.map_nodes.filter((node) =>
      node.node_paths_source.some((path) => path.destination_node_id === nodeId)
    );

    // If no prerequisites, node is unlocked (starting node)
    if (prerequisites.length === 0) return true;

    // Check if ALL prerequisites are passed OR submitted (pending grade)
    return prerequisites.every((prereq) => {
      const progress = progressMap[prereq.id];
      return progress?.status === "passed" || progress?.status === "submitted";
    });
  };

  // Get submission requirement for a node (single or all team members)
  const getSubmissionRequirement = (nodeId: string): "single" | "all" => {
    const nodeData = map.map_nodes.find((n) => n.id === nodeId);
    return nodeData?.metadata?.submission_requirement || "single";
  };

  // Check if node is completed based on submission requirements
  const isNodeCompleted = (nodeId: string, progress: any): boolean => {
    const requirement = getSubmissionRequirement(nodeId);

    if (requirement === "single") {
      // Single requirement: any team member completion counts
      return progress?.status === "passed" || progress?.status === "submitted";
    } else {
      // All requirement: check if all team members have submitted
      if (progress?.member_progress) {
        return progress.member_progress.every(
          (member: any) =>
            member.status === "passed" || member.status === "submitted"
        );
      }
      return progress?.status === "passed" || progress?.status === "submitted";
    }
  };

  // Calculate progress statistics by requirement type
  const getProgressStats = () => {
    const stats = {
      singleRequirement: { completed: 0, total: 0 },
      allRequirement: { completed: 0, total: 0 },
      totalCompleted: 0,
      totalNodes: map.map_nodes.filter((n) => (n as any)?.node_type !== "text")
        .length,
    };

    map.map_nodes.forEach((node) => {
      // Skip text nodes
      if ((node as any)?.node_type === "text") return;

      const requirement = getSubmissionRequirement(node.id);
      const progress = progressMap[node.id];
      const completed = isNodeCompleted(node.id, progress);

      if (requirement === "single") {
        stats.singleRequirement.total++;
        if (completed) stats.singleRequirement.completed++;
      } else {
        stats.allRequirement.total++;
        if (completed) stats.allRequirement.completed++;
      }

      if (completed) stats.totalCompleted++;
    });

    return stats;
  };

  // Custom node component with sprite-based gamified design and floating animations
  const nodeTypes = {
    default: ({
      data,
      selected,
    }: {
      data: MapNode & { progress?: StudentProgress | any };
      selected?: boolean;
    }) => {
      const progress = data.progress;
      const isUnlocked = isNodeUnlocked(data.id);
      const spriteUrl = data.sprite_url || "/islands/crystal.png";

      // Determine node state and styling
      const overlayColor = "";
      let statusIcon = null;
      let glowEffect = "";
      let brightness = "brightness(1)";
      let animationClass = "";

      // Base floating animation for all unlocked nodes
      if (isUnlocked) {
        animationClass = "animate-float";
      }

      if (!isUnlocked) {
        brightness = "brightness(0.3) grayscale(1)";
        statusIcon = null;
      } else if (progress) {
        // Handle both individual progress (StudentProgress) and team progress (any) structures
        const status = progress.status || (progress as any)?.status;
        const isCompleted = isNodeCompleted(data.id, progress);

        if (isCompleted) {
          // Node is completed based on submission requirements
          glowEffect = "drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]";
          statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
          animationClass = "animate-float-success";
        } else {
          switch (status) {
            case "failed":
              glowEffect = "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]";
              statusIcon = <AlertTriangle className="h-4 w-4 text-red-500" />;
              animationClass = "animate-float-failed";
              break;
            case "submitted":
              glowEffect = "drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]";
              statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
              animationClass = "animate-float-submitted";
              break;
            case "in_progress":
              glowEffect = "drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]";
              statusIcon = (
                <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
              );
              animationClass = "animate-float-progress";
              break;
            case "not_started":
              if (isUnlocked) {
                statusIcon = <Play className="h-4 w-4 text-blue-400" />;
                animationClass = "animate-float";
              }
              break;
            case "passed":
              // This should be handled by isCompleted above
              break;
          }
        }
      } else if (isUnlocked) {
        statusIcon = <Play className="h-4 w-4 text-blue-400" />;
        animationClass = "animate-float";
      }

      // Add grading indicators for instructors/TAs
      let gradingIndicator = null;
      let submissionCount = 0;
      let pendingCount = 0;
      let memberProgressInfo = null;

      // Submission requirement indicator
      const requirement = getSubmissionRequirement(data.id);
      let requirementBadge = null;

      if (isTeamMap && isUnlocked) {
        requirementBadge = (
          <div className="absolute -top-2 -left-2 z-50">
            <div
              className={`rounded-full p-1 text-xs font-bold shadow-lg ${requirement === "all"
                ? "bg-purple-500 text-white"
                : "bg-blue-500 text-white"
                }`}
              title={`Submission requirement: ${requirement === "all" ? "All team members" : "Any team member"}`}
            >
              {requirement === "all" ? "👥" : "👤"}
            </div>
          </div>
        );
      }

      if (isInstructorOrTA && data.id) {
        if (isTeamMap && progress && progress.member_progress) {
          // Show team member progress for team maps
          const memberProgress = progress.member_progress;
          const passedCount = memberProgress.filter(
            (mp: any) => mp.status === "passed"
          ).length;
          const submittedCount = memberProgress.filter(
            (mp: any) => mp.status === "submitted"
          ).length;
          const inProgressCount = memberProgress.filter(
            (mp: any) => mp.status === "in_progress"
          ).length;

          memberProgressInfo = (
            <div className="absolute -top-2 -right-2 z-50">
              <div
                className="rounded-full p-1 text-xs font-bold shadow-lg bg-blue-500 text-white"
                title={`Team progress: ${passedCount} passed, ${submittedCount} submitted, ${inProgressCount} in progress`}
              >
                {memberProgress.length}
              </div>
            </div>
          );
        } else {
          // Count submissions for individual progress
          const nodeSubmissions = allSubmissions.filter(
            (sub) => sub.node_assessments?.map_nodes?.id === data.id
          );
          submissionCount = nodeSubmissions.length;
          pendingCount = nodeSubmissions.filter(
            (sub) => sub.submission_grades.length === 0
          ).length;

          // Add grading badge if there are submissions
          if (submissionCount > 0) {
            gradingIndicator = (
              <div className="absolute -top-2 -right-2 z-50">
                <div
                  className={`rounded-full p-1 text-xs font-bold shadow-lg ${pendingCount > 0
                    ? "bg-orange-500 text-white animate-pulse"
                    : "bg-green-500 text-white"
                    }`}
                >
                  {pendingCount > 0 ? pendingCount : submissionCount}
                </div>
              </div>
            );
          }
        }
      }

      // Team Member Avatar Bubble (Assigned)
      let claimAvatar = null;
      if (teamClaims[data.id]) {
        const claimant = teamClaims[data.id];
        const initial = claimant.full_name ? claimant.full_name.charAt(0).toUpperCase() : "?";

        claimAvatar = (
          <div className="absolute -top-3 -right-3 z-50 animate-bounce-slow">
            <div
              className="relative rounded-full border-2 border-white shadow-lg overflow-hidden w-8 h-8 bg-blue-100 flex items-center justify-center"
              title={`Assigned to: ${claimant.full_name || claimant.username}`}
            >
              {claimant.avatar_url ? (
                <img src={claimant.avatar_url} alt={claimant.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-blue-800">{initial}</span>
              )}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" title="Owner"></div>
            </div>
          </div>
        );
      }

      // Visiting Students Avatars
      // Show up to 3 visiting students, then +N count
      let visitingAvatars = null;
      if (studentLocations[data.id] && studentLocations[data.id].length > 0) {
        const visitors = studentLocations[data.id].filter(p => !teamClaims[data.id] || p.id !== teamClaims[data.id].user_id); // Filter out owner if they are visiting their own node (optional, duplicate avatar check)

        if (visitors.length > 0) {
          visitingAvatars = (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-40 flex -space-x-2 pointer-events-none">
              {visitors.slice(0, 3).map((visitor: any, i: number) => (
                <div
                  key={visitor.id}
                  className="relative w-6 h-6 rounded-full border border-white shadow-md overflow-hidden bg-slate-100 z-10 transition-transform hover:z-20 hover:scale-125"
                  style={{ zIndex: 10 - i }}
                  title={`Visiting: ${visitor.full_name || visitor.username}`}
                >
                  {visitor.avatar_url ? (
                    <img src={visitor.avatar_url} alt={visitor.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {(visitor.full_name || visitor.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {visitors.length > 3 && (
                <div className="relative w-6 h-6 rounded-full border border-white shadow-md bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 z-0">
                  +{visitors.length - 3}
                </div>
              )}
            </div>
          );
        }
      }

      return (
        <div className="relative inline-block group w-fit h-fit">
          {/* Connection handles - visible but non-interactive in viewer mode */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none", display: "none" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none", display: "none" }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 bg-blue-500/20 border-2 border-blue-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none", display: "none" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 bg-green-500/20 border-2 border-green-400/50 shadow-sm opacity-60"
            style={{ pointerEvents: "none", display: "none" }}
          />
          <div
            className={`relative ${selected ? "scale-110 translate-y-3" : ""} transition-transform duration-300 cursor-pointer ${animationClass}`}
            role="button"
            tabIndex={isUnlocked ? 0 : -1}
            aria-label={`${data.title} - ${isUnlocked ? "Available" : "Locked"} - Difficulty: ${data.difficulty} stars`}
            aria-describedby={progress ? `progress-${data.id}` : undefined}
          >
            {/* Selection Shadow - Enhanced for flying islands */}
            {selected && (
              <div className="absolute inset-0 -z-10">
                {/* Main shadow image */}
                <img
                  src={spriteUrl}
                  alt=""
                  className="w-auto h-auto object-contain absolute opacity-60"
                  style={{
                    filter: "brightness(0) blur(4px)",
                    transform: "scale(1.3)",
                  }}
                />
                {/* Secondary softer shadow for depth */}
                <img
                  src={spriteUrl}
                  alt=""
                  className="w-max h-max object-contain absolute opacity-30"
                  style={{
                    filter: "brightness(0) blur(8px)",
                    transform: "translateY(16px) scale(1.2)",
                  }}
                />
                {/* Ground shadow for flying island effect */}
                <div
                  className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-black/20 rounded-full blur-md"
                  style={{
                    animation: selected
                      ? "shadow-pulse 2s ease-in-out infinite"
                      : "none",
                  }}
                />
              </div>
            )}

            {/* Progress Glow Effect */}
            {glowEffect && (
              <div
                className={`absolute inset-0 ${glowEffect} rounded-full animate-pulse-slow`}
              />
            )}

            {/* Assigned Member Avatar */}
            {claimAvatar}

            {/* Visiting Students Avatars */}
            {visitingAvatars}

            {/* Grading Indicator for Instructors/TAs */}
            {gradingIndicator}
            {memberProgressInfo}

            {/* Submission Requirement Badge */}
            {requirementBadge}

            {/* Sprite Image */}
            <img
              src={spriteUrl}
              alt={data.title}
              className={`w-auto h-auto object-contain z-20 drop-shadow-lg hover:drop-shadow-xl transition-all duration-300 ${glowEffect}`}
              style={{
                filter: selected
                  ? `${brightness} brightness(1.15) saturate(1.3)`
                  : brightness,
              }}
            />

            {/* Floating Label with Enhanced Animation */}
            <div
              className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 ${selected ? "scale-105 -translate-y-1" : ""} transition-all duration-300 group/label`}
            >
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg hover:shadow-xl transition-all duration-200 min-w-[100px] max-w-[240px]">
                <div className="text-xs font-bold text-card-foreground text-center break-words line-clamp-2 leading-snug">
                  {data.title}
                </div>
                <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1 mt-0.5">
                  ⭐ {data.difficulty}
                  {statusIcon && <span className="ml-1">{statusIcon}</span>}
                </div>
              </div>
              {/* Full title tooltip on hover - only if truncated */}
              {data.title && data.title.length > 20 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/label:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <div className="bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal max-w-xs backdrop-blur-sm break-words">
                    {data.title}
                    {/* Arrow pointing down */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                  </div>
                </div>
              )}
            </div>

            {/* Lock Overlay for locked nodes */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm animate-pulse">
                  <Lock className="h-6 w-6 text-white drop-shadow-sm" />
                </div>
              </div>
            )}

            {/* Hover Effect for Unlocked Nodes */}
            {isUnlocked && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-transparent rounded-full blur-sm" />
              </div>
            )}

            {/* Screen Reader Description */}
            {progress && (
              <div id={`progress-${data.id}`} className="sr-only">
                Progress: {progress.status.replace("_", " ")}
                {progress.submitted_at &&
                  `, Submitted: ${new Date(progress.submitted_at).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      );
    },
    text: ({
      data,
      selected,
    }: {
      data: MapNode & { node_type?: string };
      selected?: boolean;
    }) => {
      // Text nodes are read-only in the viewer, so no onDataChange
      return (
        <TextNode
          data={data}
          selected={selected}
          // Disable editing and double-click in viewer mode
          allowEdit={false}
          allowDoubleClick={false}
          showHint={false}
        />
      );
    },
    comment: ({
      data,
      selected,
    }: {
      data: MapNode & { node_type?: string };
      selected?: boolean;
    }) => {
      // Comment nodes can be edited by instructors/TAs
      return (
        <CommentNode
          data={data}
          selected={selected}
          userRole={userRole}
          // Allow editing for instructors/TAs, read-only for students
          allowEdit={isInstructorOrTA}
          allowDoubleClick={isInstructorOrTA}
          showHint={true}
          showEditButton={true}
          onDataChange={(updatedData) => {
            // Handle comment node updates
            if (isInstructorOrTA && updatedData) {
              // TODO: Persist comment changes to database
              console.log("Comment node updated:", updatedData);
            }
          }}
        />
      );
    },
  };

  useEffect(() => {
    const transformedNodes = map.map_nodes.map((node) => {
      // Determine node type - check for node_type property
      let nodeType = "default"; // learning node
      if ((node as any)?.node_type === "text") {
        nodeType = "text";
      } else if ((node as any)?.node_type === "comment") {
        nodeType = "comment";
      }

      return {
        id: node.id,
        type: nodeType,
        data: { ...node, progress: progressMap[node.id] },
        position: (node.metadata as any)?.position || {
          x: Math.random() * 400,
          y: Math.random() * 400,
        },
        draggable: false, // Disable dragging in viewer mode
        connectable: false,
        selectable: true,
        selected: selectedNode?.id === node.id,
        style: {
          backgroundColor: "#ffffff00",
          border: "2px solid #cccccc00",
          flexGrow: 1,
          aspectRatio: "1 / 1",
        },
      };
    });

    const transformedEdges: Edge[] = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source.forEach((path) => {
        // Add visual indicators for path states
        const sourceProgress = progressMap[path.source_node_id];
        const isPathActive =
          sourceProgress?.status === "passed" ||
          sourceProgress?.status === "in_progress" ||
          sourceProgress?.status === "submitted";

        transformedEdges.push({
          id: path.id,
          type: "floating",
          source: path.source_node_id,
          target: path.destination_node_id,
          animated: isPathActive,
          style: {
            stroke: isPathActive ? "#10b981" : "#6b7280",
            strokeWidth: isPathActive ? 3 : 2,
            opacity: isPathActive ? 1 : 0.6,
          },
        });
      });
    });

    setNodes(transformedNodes as any);
    setEdges(transformedEdges);
  }, [map, progressMap, setNodes, setEdges]);

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selected = params.nodes[0];
      const newSelectedNode = selected || null;

      setSelectedNode(newSelectedNode);

      // Don't resize panels if currently minimized - let user control that
      if (isPanelMinimized) return;

      // Animate panel resize based on selection
      if (newSelectedNode && rightPanelRef.current && leftPanelRef.current) {
        // Only resize if panel is not minimized
        if (!isPanelMinimized) {
          // Node selected: expand right panel to 45%, shrink left to 55%
          rightPanelRef.current.resize(45);
          leftPanelRef.current.resize(55);
        }

        // Center the selected node accounting for the expanded panel
        setTimeout(() => {
          if (reactFlowInstance && newSelectedNode) {
            // Get the current viewport
            const viewport = reactFlowInstance.getViewport();

            // Calculate the center position accounting for the 55/45 panel split
            // We want to center in the left panel (55% of total width) but shift slightly left for visual balance
            const containerRect = document
              .querySelector(".react-flow")
              ?.getBoundingClientRect();
            if (containerRect) {
              const leftPanelWidth = containerRect.width * 0.55; // 55% for left panel after resize
              const targetX = leftPanelWidth * 0.5; // Center in the left panel
              const targetY = containerRect.height * 0.5; // Center vertically

              // Use fitView to center on the selected node with padding
              reactFlowInstance.fitView({
                nodes: [{ id: newSelectedNode.id }],
                duration: 600,
                padding: 0.15,
                // Custom center point accounting for panel layout
                minZoom: viewport.zoom * 0.9, // Slightly zoom out for better view
                maxZoom: viewport.zoom * 1.1, // Allow slight zoom in
              });
            }
          }
        }, 350); // Wait for panel animation to complete
      } else if (
        !newSelectedNode &&
        rightPanelRef.current &&
        leftPanelRef.current
      ) {
        // Node deselected: restore default sizes (70% left, 30% right)
        leftPanelRef.current.resize(70);
        rightPanelRef.current.resize(30);
      }
    },
    [reactFlowInstance, isPanelMinimized]
  );

  if (!isMounted) {
    return <div className="h-full w-full bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
    </div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Completion Banner */}
      {showCompletionBanner && hasCompletedSeed && seedTitle && (
        <div
          onClick={() => setShowCompletionModal(true)}
          className="mt-[64px] bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-yellow-500/20 border-b-2 border-yellow-500/50 px-6 py-3 cursor-pointer hover:from-yellow-500/30 hover:via-yellow-400/30 hover:to-yellow-500/30 transition-colors z-50 flex-none"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-100 font-medium">
                🎉 Congratulations! You completed <span className="font-bold">{seedTitle}</span>
              </span>
            </div>
            <button className="text-yellow-300 hover:text-yellow-100 text-sm font-medium">
              View Certificate →
            </button>
          </div>
        </div>
      )}

      <ResizablePanelGroup id="map-viewer-panels" direction="horizontal" className="flex-1">
        <ResizablePanel
          id="map-viewer-left-panel"
          ref={leftPanelRef}
          defaultSize={70}
          minSize={35}
          maxSize={85}
          className="transition-all duration-300 ease-in-out relative flex flex-col"
        >
          {/* Instructor View Indicator */}
          {isInstructorOrTA && (
            <div className="absolute bottom-0 left-0 z-10 bg-gray-800 text-muted-foreground px-4 py-2 rounded-tr-lg shadow-lg flex items-center gap-2 ">
              <Info className="h-4 w-4" />
              <span className="text-xs font-medium">
                Instructor View - All Nodes Unlocked
              </span>
            </div>
          )}

          {/* Seed Leaderboard - Only show in seed rooms */}
          {seedRoomId && authUser?.id && (
            <SeedLeaderboard roomId={seedRoomId} userId={authUser.id} />
          )}

          {/* Map Container - Takes up full space */}
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              panOnScroll
              panOnDrag={[0, 1, 2]}
              attributionPosition="bottom-left"
              aria-label="Interactive learning map"
            >
              <Background gap={20} size={1} color="#94a3b8" />
              <MiniMap
                {...miniMapConfig}
                style={{
                  ...miniMapConfig.style,
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
            </ReactFlow>
          </div>

          {/* Navigation Guide & Progress Stats - Bottom */}
          {isNavigationExpanded && (
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Navigation Guide & Progress
                </h3>
                <button
                  onClick={() => setIsNavigationExpanded(false)}
                  className="p-1 hover:bg-muted/50 rounded transition-colors"
                  aria-label="Hide navigation guide"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Progress Statistics */}
              <div className="mb-4 bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  {isTeamMap && isInstructorOrTA
                    ? "Team Progress Overview"
                    : "Progress Overview"}
                </div>

                {isTeamMap && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-blue-500">👤</span>
                        Single requirement
                      </span>
                      <span className="font-medium">
                        {getProgressStats().singleRequirement.completed}/
                        {getProgressStats().singleRequirement.total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-purple-500">👥</span>
                        All requirement
                      </span>
                      <span className="font-medium">
                        {getProgressStats().allRequirement.completed}/
                        {getProgressStats().allRequirement.total}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${(getProgressStats().totalCompleted / getProgressStats().totalNodes) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>{getProgressStats().totalCompleted} Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>
                      {
                        Object.values(progressMap).filter(
                          (p) =>
                            p.status === "submitted" ||
                            (p as any)?.status === "submitted"
                        ).length
                      }{" "}
                      Submitted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span>
                      {
                        Object.values(progressMap).filter(
                          (p) =>
                            p.status === "in_progress" ||
                            (p as any)?.status === "in_progress"
                        ).length
                      }{" "}
                      In Progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-muted-foreground">
                      {getProgressStats().totalNodes} Total
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Instructions */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Select Node</span>
                    <span className="text-muted-foreground">Click</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Node</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                      Tab
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous Node</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                      Shift+Tab
                    </kbd>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pan Map</span>
                    <span className="text-muted-foreground">Drag</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom</span>
                    <span className="text-muted-foreground">Mouse Wheel</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deselect</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Navigation Guide Button - Fixed Bottom Right */}
          <button
            onClick={() => setIsNavigationExpanded(!isNavigationExpanded)}
            className="absolute bottom-4 right-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
            aria-expanded={isNavigationExpanded}
            title={
              isNavigationExpanded
                ? "Hide navigation guide"
                : "Show navigation guide"
            }
          >
            {isNavigationExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </button>

          {/* Room Settings Component - Rendered LAST in panel to ensure z-index stacking above map */}
          {roomSettingsComponent}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="map-viewer-right-panel"
          ref={rightPanelRef}
          defaultSize={30}
          minSize={5}
          maxSize={65}
          className="transition-all duration-300 ease-in-out relative"
        >
          {/* Panel Minimize/Maximize Button */}
          <button
            onClick={togglePanelSize}
            className="absolute top-2 right-2 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg hover:bg-muted/50 transition-colors"
            title={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
            aria-label={isPanelMinimized ? "Maximize panel" : "Minimize panel"}
          >
            {isPanelMinimized ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <div className="h-full flex flex-col overflow-hidden">
            {!isPanelMinimized && (
              <NodeViewPanel
                key={selectedNode?.id || "no-selection"} // Force remount on node change
                selectedNode={selectedNode}
                mapId={map.id}
                seedRoomId={seedRoomId} // Pass seedRoomId here
                onProgressUpdate={loadAllProgress}
                isNodeUnlocked={
                  selectedNode ? isNodeUnlocked(selectedNode.id) : true
                }
                userRole={userRole}
                isInstructorOrTA={isInstructorOrTA}
              />
            )}
          </div>
        </ResizablePanel>

        {/* Seed Completion Modal */}
        {showCompletionModal && seedTitle && seedRoomId && completionData && currentUser && (
          <SeedCompletionModal
            open={showCompletionModal}
            onOpenChange={(open) => {
              setShowCompletionModal(open);
              // Show banner when modal is closed
              if (!open && hasCompletedSeed) {
                setShowCompletionBanner(true);
              }
            }}
            seedTitle={seedTitle}
            seedId={seedId || ""}
            roomId={seedRoomId}
            completionId={completionData.completionId}
            userId={currentUser.id}
            userName={currentUser.user_metadata?.full_name || currentUser.email || "Student"}
            completionDate={completionData.completionDate}
          />
        )}
      </ResizablePanelGroup>
    </div>
  );
}

// Wrapper component that provides ReactFlow context
export function MapViewerWithProvider({ map, seedRoomId, seedTitle, seedId, roomSettingsComponent }: MapViewerProps) {
  return (
    <ReactFlowProvider>
      <style jsx global>{`
        /* ================================
     Tunables
     ================================ */
        :root {
          --island-ease: cubic-bezier(0.33, 1, 0.68, 1);
          --island-amp: 6px; /* vertical travel of islands */
          --island-amp-sm: 3px; /* for micro motions (rope/knot) */
          --island-rot: 0.6deg;

          --edge-active: #10b981; /* active path color */
          --edge-idle: #475569; /* idle path color (slate-600) */
          --edge-width: 2.25;
          --edge-width-active: 2.75;
          --edge-opacity: 0.55;
          --edge-opacity-active: 0.85;
        }

        /* ================================
     Islands — calmer motion
     ================================ */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp)))
              rotate(var(--island-rot));
          }
        }
        @keyframes float-success {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(1) saturate(1.12);
          }
          50% {
            transform: translateY(calc(-1.2 * var(--island-amp)))
              rotate(calc(-1 * var(--island-rot)));
            filter: brightness(1.04) saturate(1.16);
          }
        }
        @keyframes float-failed {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(0.98) saturate(1.05);
          }
          50% {
            transform: translateY(calc(-0.7 * var(--island-amp))) rotate(0.3deg);
            filter: brightness(0.99) saturate(1.08);
          }
        }
        @keyframes float-submitted {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
            filter: brightness(1) saturate(1.08);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp))) rotate(-0.3deg);
            filter: brightness(1.02) saturate(1.12);
          }
        }
        @keyframes float-progress {
          0%,
          100% {
            transform: translateY(0) rotate(0deg) scale(1);
            filter: brightness(1) saturate(1.08);
          }
          50% {
            transform: translateY(calc(-0.8 * var(--island-amp))) rotate(0.3deg)
              scale(1.01);
            filter: brightness(1.01) saturate(1.12);
          }
        }

        .animate-float {
          animation: float 5s var(--island-ease) infinite;
        }
        .animate-float-success {
          animation: float-success 5.5s var(--island-ease) infinite;
        }
        .animate-float-failed {
          animation: float-failed 6s var(--island-ease) infinite;
        }
        .animate-float-submitted {
          animation: float-submitted 5.5s var(--island-ease) infinite;
        }
        .animate-float-progress {
          animation: float-progress 4.5s var(--island-ease) infinite;
        }

        /* Hover tempo: barely faster */
        .react-flow__node:hover .animate-float,
        .react-flow__node:hover .animate-float-success,
        .react-flow__node:hover .animate-float-progress {
          animation-duration: 80%;
        }

        /* ================================
     Bridge / Rope — subtle micro-motion
     ================================ */
        @keyframes float-bridge {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(calc(-1 * var(--island-amp-sm)));
          }
        }
        @keyframes rope-sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(1.2deg);
          }
        }
        @keyframes float-knot {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(calc(-0.5 * var(--island-amp-sm))) scale(1.03);
          }
        }
        .animate-float-bridge {
          animation: float-bridge 7s var(--island-ease) infinite;
        }
        .animate-float-rope {
          animation: rope-sway 6.5s var(--island-ease) infinite;
        }
        .animate-float-knot {
          animation: float-knot 6s var(--island-ease) infinite;
        }

        /* ================================
     Edges — no dashes, no dots
     ================================ */
        /* Kill the default dashed animation that looks like dots */
        .react-flow__edge-path.animated {
          stroke-dasharray: none !important;
          animation: none !important;
        }
        /* Smoother, consistent look */
        .react-flow__edge-path {
          stroke-linecap: round;
          transition:
            stroke 200ms ease,
            opacity 200ms ease,
            stroke-width 200ms ease;
        }
        /* Use className on edges to toggle these: edge--active / edge--idle */
        .edge--idle .react-flow__edge-path {
          stroke: var(--edge-idle);
          stroke-width: var(--edge-width);
          opacity: var(--edge-opacity);
        }
        .edge--active .react-flow__edge-path {
          stroke: var(--edge-active);
          stroke-width: var(--edge-width-active);
          opacity: var(--edge-opacity-active);
        }

        /* ================================
     Focus / Accessibility
     ================================ */
        .react-flow__node:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }
        .react-flow__edge:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
        }

        @media (prefers-contrast: high) {
          .react-flow__edge {
            stroke-width: 4px !important;
          }
          .react-flow__node {
            border: 2px solid currentColor !important;
          }
        }

        @media (min-resolution: 2dppx) {
          /* High DPI adjustments could go here if needed */
        }

        /* Reduced motion: stop all animations */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-success,
          .animate-float-failed,
          .animate-float-submitted,
          .animate-float-progress,
          .animate-float-bridge,
          .animate-float-rope,
          .animate-float-knot {
            animation: none !important;
          }
          .react-flow__edge-path {
            transition: none !important;
          }
        }
      `}</style>

      <MapViewer
        map={map}
        seedRoomId={seedRoomId}
        seedTitle={seedTitle}
        seedId={seedId}
        roomSettingsComponent={roomSettingsComponent}
      />
    </ReactFlowProvider>
  );
}
