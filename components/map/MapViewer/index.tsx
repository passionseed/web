"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  OnSelectionChangeParams,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TextNode } from "@/components/map/MapEditor/components/TextNode";
import { CommentNode } from "@/components/map/CommentNode";
import {
  getTeamMapClassroomInfo,
  getUserClassroomRoleClient,
} from "@/lib/supabase/maps";

// Import refactored modules
import { MapViewerProps, MapViewerNode, UserRole, PanelRefs } from "./types";
import { PANEL_SIZES } from "./constants";
import { GameNode } from "./components/GameNode";
import { NavigationGuide } from "./components/NavigationGuide";
import { MapCanvas } from "./components/MapCanvas";
import { MapSidebar } from "./components/MapSidebar";
import { useMapProgress } from "./hooks/useMapProgress";
import { useMapNavigation } from "./hooks/useMapNavigation";
import { usePanelManagement } from "./hooks/usePanelManagement";
import { useSubmissionData } from "./hooks/useSubmissionData";
import { getProgressStats, getNodeStatus } from "./utils/mapProgressUtils";
import { SeedCompletionModal } from "@/components/seeds/SeedCompletionModal";
import { markSeedRoomCompleted, checkSeedRoomCompletion, isEndNode } from "@/lib/supabase/seed-completion";

function MapViewer({ map, seedRoomId, seedTitle, seedId }: MapViewerProps) {
  // Basic state
  const [selectedNode, setSelectedNode] = useState<MapViewerNode | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);
  const [classroomRole, setClassroomRole] = useState<string | null>(null);
  const [isTeamMap, setIsTeamMap] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Seed completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasCompletedSeed, setHasCompletedSeed] = useState(false);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);

  // Panel refs
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const panelRefs: PanelRefs = {
    left: leftPanelRef,
    right: rightPanelRef,
  };

  // Role detection for instructor/TA functionality
  const { user: authUser, userRoles, isAuthenticated } = useAuth();

  // Normalize user role
  const globalUserRole: UserRole = userRoles?.includes("instructor")
    ? "instructor"
    : userRoles?.includes("TA")
      ? "TA"
      : "student";

  const roleFromClassroom =
    classroomRole === "instructor" ||
      classroomRole === "TA" ||
      classroomRole === "student"
      ? (classroomRole as UserRole)
      : null;

  const userRole: UserRole = roleFromClassroom ?? globalUserRole;
  const isInstructorOrTA = userRole === "instructor" || userRole === "TA";

  // Debug: Check if seed room props are received
  console.log("🌱 [MapViewer] Seed Room Props:", {
    seedRoomId,
    seedTitle,
    hasSeedRoom: !!seedRoomId,
  });

  // Custom hooks
  const { progressMap, loadAllProgress, isLoading: isProgressLoading } = useMapProgress(
    map.id,
    currentUser,
    isTeamMap,
    isInstructorOrTA,
    teamId
  );

  const { isPanelMinimized, togglePanelSize, handleSelectionChange } = usePanelManagement(panelRefs);

  const { allSubmissions } = useSubmissionData(map.id, isInstructorOrTA);

  // Create node types
  const nodeTypes = {
    default: ({ data, selected }: { data: any; selected?: boolean }) => {
      const { isUnlocked, isCompleted, requirement } = getNodeStatus(
        map,
        progressMap,
        data.id,
        isTeamMap,
        userRole
      );

      return (
        <GameNode
          data={data}
          selected={selected}
          isUnlocked={isUnlocked}
          isCompleted={isCompleted}
          requirement={requirement}
          isTeamMap={isTeamMap}
          isInstructorOrTA={isInstructorOrTA}
          allSubmissions={allSubmissions}
        />
      );
    },
    text: ({ data, selected }: { data: any; selected?: boolean }) => (
      <TextNode
        data={data}
        selected={selected}
        allowEdit={false}
        allowDoubleClick={false}
        showHint={false}
      />
    ),
    comment: ({ data, selected }: { data: any; selected?: boolean }) => (
      <CommentNode
        data={data}
        selected={selected}
        userRole={userRole}
        allowEdit={isInstructorOrTA}
        allowDoubleClick={isInstructorOrTA}
        showHint={true}
        showEditButton={true}
        onDataChange={(updatedData) => {
          // Comment node data updated
        }}
      />
    ),
  };

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);

  // Transform and set nodes/edges when dependencies change
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
        draggable: false,
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

    const transformedEdges = [];
    map.map_nodes.forEach((node) => {
      node.node_paths_source.forEach((path) => {
        const sourceProgress = progressMap[path.source_node_id];
        const sourceStatus = sourceProgress?.status || (sourceProgress as any)?.status;
        const isPathActive =
          sourceStatus === "passed" ||
          sourceStatus === "in_progress" ||
          sourceStatus === "submitted";

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

    setNodes(transformedNodes);
    setEdges(transformedEdges);
  }, [map, progressMap, selectedNode?.id, setNodes, setEdges]);

  const { navigateToAdjacentNode } = useMapNavigation(
    map,
    progressMap,
    selectedNode,
    isTeamMap,
    userRole,
    panelRefs,
    setSelectedNode,
    () => setIsNavigationExpanded(prev => !prev)
  );

  // Initialize user
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
        const { completed, completion } = await checkSeedRoomCompletion(seedRoomId, currentUser.id);
        if (completed) {
          setHasCompletedSeed(true);
          console.log("🎉 [MapViewer] User has already completed this seed");
        }
      }
    };
    checkCompletion();
  }, [seedRoomId, currentUser]);

  // Watch for end node completion when progressMap updates
  useEffect(() => {
    const checkEndNodeCompletion = async () => {
      console.log("🔍 [MapViewer] Progress map updated, checking for end node completion", {
        hasSeedRoomId: !!seedRoomId,
        hasCurrentUser: !!currentUser,
        hasSelectedNode: !!selectedNode,
        hasCompletedSeed,
        selectedNodeId: selectedNode?.id,
        selectedNodeTitle: selectedNode?.data?.title,
        nodeType: selectedNode?.data?.node_type,
        progressMapSize: Object.keys(progressMap).length,
      });

      // Only check for seed completion if this is a seed room
      if (seedRoomId && currentUser && selectedNode && !hasCompletedSeed) {
        const nodeData = selectedNode.data;

        // Check if the current node is an end node
        if (isEndNode(nodeData.node_type)) {
          console.log("🏁 [MapViewer] This is an END NODE!");

          // Check if the node has been passed (for nodes with assessments) or just visited
          const nodeProgress = progressMap[selectedNode.id];
          console.log("📊 [MapViewer] Node progress details:", {
            nodeProgress,
            status: nodeProgress?.status,
            statusType: typeof nodeProgress?.status,
            allProgressKeys: nodeProgress ? Object.keys(nodeProgress) : [],
            rawProgress: JSON.stringify(nodeProgress, null, 2),
          });

          // Check for multiple possible completion statuses
          const isNodeCompleted =
            nodeProgress?.status === "passed" ||
            nodeProgress?.status === "submitted" ||
            nodeProgress?.status === "failed"; // Include failed to show completion modal even if they didn't pass

          console.log("✅ [MapViewer] Is node completed?", isNodeCompleted, "| Status:", nodeProgress?.status);

          if (isNodeCompleted) {
            console.log("🎉 [MapViewer] End node completed! Marking seed as complete");

            // Mark the seed as completed
            const { error } = await markSeedRoomCompleted(
              seedRoomId,
              currentUser.id,
              selectedNode.id
            );

            if (error) {
              console.error("❌ [MapViewer] Error marking seed complete:", error);
            } else {
              console.log("✅ [MapViewer] Seed marked as complete, showing modal");
              setHasCompletedSeed(true);
              setShowCompletionModal(true);
            }
          } else {
            console.log("⏳ [MapViewer] End node not yet completed. Current status:", nodeProgress?.status);
          }
        } else {
          console.log("ℹ️ [MapViewer] Not an end node, node type:", nodeData.node_type);
        }
      } else {
        // Log why we're not checking
        if (!seedRoomId) console.log("⚠️ [MapViewer] No seedRoomId");
        if (!currentUser) console.log("⚠️ [MapViewer] No currentUser");
        if (!selectedNode) console.log("⚠️ [MapViewer] No selectedNode");
        if (hasCompletedSeed) console.log("⚠️ [MapViewer] Already completed seed");
      }
    };

    checkEndNodeCompletion();
  }, [progressMap, seedRoomId, currentUser, selectedNode, hasCompletedSeed]);

  // Check if map is a team map and get classroom role
  useEffect(() => {
    const checkTeamMapAndRole = async () => {
      if (!currentUser) return;

      try {
        const teamMapInfo = await getTeamMapClassroomInfo(map.id);
        setIsTeamMap(teamMapInfo.isTeamMap);
        setTeamId(teamMapInfo.teamId || null);

        if (teamMapInfo.isTeamMap && teamMapInfo.classroomId) {
          const role = await getUserClassroomRoleClient(teamMapInfo.classroomId);
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

  // Handle selection changes
  const onSelectionChange = useCallback(
    async (params: OnSelectionChangeParams) => {
      const selected = params.nodes[0];
      const newSelectedNode = selected as MapViewerNode || null;

      setSelectedNode(newSelectedNode);
      handleSelectionChange(newSelectedNode);

      // DEBUG: Log node info when selected
      if (newSelectedNode) {
        const nodeType = newSelectedNode.data.node_type || "learning (default)";
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📍 NODE SELECTED:", newSelectedNode.data.title);
        console.log("🔖 Node Type:", nodeType);
        console.log("🏠 Seed Room ID:", seedRoomId || "NOT IN SEED ROOM");
        console.log("👤 Current User:", currentUser?.email || "Not logged in");
        console.log("✅ Has Completed:", hasCompletedSeed);
        console.log("📦 Assessments:", newSelectedNode.data.node_assessments?.length || 0);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }

      // Check if this is an end node without assessments (text/info end node)
      if (
        seedRoomId &&
        currentUser &&
        newSelectedNode &&
        !hasCompletedSeed &&
        isEndNode(newSelectedNode.data.node_type) &&
        (!newSelectedNode.data.node_assessments || newSelectedNode.data.node_assessments.length === 0)
      ) {
        console.log("🏁 [MapViewer] End node without assessment selected! Marking seed as complete");

        // Mark the seed as completed immediately
        const { error } = await markSeedRoomCompleted(
          seedRoomId,
          currentUser.id,
          newSelectedNode.id
        );

        if (!error) {
          setHasCompletedSeed(true);
          setShowCompletionModal(true);
        }
      }
    },
    [handleSelectionChange, seedRoomId, currentUser, hasCompletedSeed]
  );

  // Calculate progress statistics
  const progressStats = getProgressStats(map, progressMap, isTeamMap, userRole);

  // Check if selected node is unlocked
  const selectedNodeUnlocked = selectedNode
    ? getNodeStatus(map, progressMap, selectedNode.id, isTeamMap, userRole).isUnlocked
    : true;

  // Wrapped callback to trigger progress reload and check for end node completion
  const handleProgressUpdate = useCallback(async () => {
    console.log("🔄 [MapViewer] handleProgressUpdate called - reloading progress");
    await loadAllProgress();

    // Check for end node completion immediately after reload
    if (seedRoomId && currentUser && selectedNode && !hasCompletedSeed) {
      const nodeData = selectedNode.data as MapNode;

      if (isEndNode(nodeData.node_type)) {
        console.log("🏁 [MapViewer] End node detected in handleProgressUpdate!");

        // Give a tiny delay for progressMap to update
        setTimeout(async () => {
          const updatedProgress = progressMap[selectedNode.id];

          // Check for multiple possible completion statuses
          const isCompleted =
            updatedProgress?.status === "passed" ||
            updatedProgress?.status === "submitted" ||
            updatedProgress?.status === "failed"; // Include failed to show completion modal

          console.log("📊 [MapViewer] Node progress after reload:", {
            updatedProgress,
            status: updatedProgress?.status,
            isCompleted,
            rawProgress: JSON.stringify(updatedProgress, null, 2),
          });

          if (isCompleted) {
            console.log("🎉 [MapViewer] Marking seed as complete NOW!");
            const { data, error } = await markSeedRoomCompleted(seedRoomId, currentUser.id, selectedNode.id);

            if (!error && data) {
              setHasCompletedSeed(true);
              setCompletionId(data.id);
              setCompletionDate(data.completed_at);
              setShowCompletionModal(true);
              console.log("✅ [MapViewer] Modal should appear now!");
            } else {
              console.error("❌ [MapViewer] Error marking complete:", error);
            }
          } else {
            console.log("⏳ [MapViewer] Not completed yet. Status:", updatedProgress?.status);
          }
        }, 500);
      }
    }
  }, [loadAllProgress, seedRoomId, currentUser, selectedNode, hasCompletedSeed, progressMap]);

  return (
    <>
      <ResizablePanelGroup id="map-viewer-index-panels" direction="horizontal" className="h-full">
        <ResizablePanel
          id="map-viewer-index-left-panel"
          ref={leftPanelRef}
          defaultSize={PANEL_SIZES.LEFT_DEFAULT}
          minSize={PANEL_SIZES.LEFT_MIN}
          maxSize={PANEL_SIZES.LEFT_MAX}
          className="transition-all duration-300 ease-in-out relative flex flex-col"
        >
          {/* Map Container - Takes up full space */}
          <div className="flex-1">
            <MapCanvas
              nodes={reactFlowNodes}
              edges={reactFlowEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={onSelectionChange}
            />
          </div>

          {/* Navigation Guide */}
          <NavigationGuide
            isExpanded={isNavigationExpanded}
            onToggle={() => setIsNavigationExpanded(!isNavigationExpanded)}
            progressStats={progressStats}
            progressMap={progressMap}
            isTeamMap={isTeamMap}
            isInstructorOrTA={isInstructorOrTA}
          />

          {/* DEBUG: Test button to force modal */}
          {seedRoomId && (
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => {
                  console.log("🧪 TEST: Forcing modal to show");
                  setShowCompletionModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg font-bold"
              >
                TEST MODAL
              </button>
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle id="map-viewer-resize-handle" />

        <ResizablePanel
          id="map-viewer-index-right-panel"
          ref={rightPanelRef}
          defaultSize={PANEL_SIZES.RIGHT_DEFAULT}
          minSize={PANEL_SIZES.RIGHT_MIN}
          maxSize={PANEL_SIZES.RIGHT_MAX}
          className="transition-all duration-300 ease-in-out relative"
        >
          <MapSidebar
            selectedNode={selectedNode}
            mapId={map.id}
            onProgressUpdate={handleProgressUpdate}
            isNodeUnlocked={selectedNodeUnlocked}
            userRole={userRole}
            isInstructorOrTA={isInstructorOrTA}
            isPanelMinimized={isPanelMinimized}
            onTogglePanelSize={togglePanelSize}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Seed Completion Modal - Outside panel structure for proper z-index */}
      {seedRoomId && seedTitle && (
        <SeedCompletionModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          seedTitle={seedTitle}
          seedId={seedId}
          roomId={seedRoomId}
          completionId={completionId || undefined}
          userId={currentUser?.id}
          userName={currentUser?.user_metadata?.full_name || currentUser?.email || "Student"}
          completionDate={completionDate ? new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
          onContinue={() => {
            // Continue exploring
          }}
        />
      )}
    </>
  );
}

// Wrapper component that provides ReactFlow context and includes CSS
export function MapViewerWithProvider({ map, seedRoomId, seedTitle }: MapViewerProps) {
  return (
    <ReactFlowProvider>
      <MapViewer map={map} seedRoomId={seedRoomId} seedTitle={seedTitle} />
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
        .react-flow__edge-path.animated {
          stroke-dasharray: none !important;
          animation: none !important;
        }
        .react-flow__edge-path {
          stroke-linecap: round;
          transition:
            stroke 200ms ease,
            opacity 200ms ease,
            stroke-width 200ms ease;
        }
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
    </ReactFlowProvider>
  );
}

export { MapViewerWithProvider as MapViewer };