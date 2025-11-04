/**
 * JourneyMapPreview - Preview-only version of journey map for dashboard
 * Shows the map without panels, click to navigate to full experience
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, Maximize2 } from "lucide-react";

import { UserCenterNode } from "./nodes/UserCenterNode";
import { NorthStarProjectNode } from "./nodes/NorthStarProjectNode";
import { NorthStarNode } from "./nodes/NorthStarNode";
import { ShortTermProjectNode } from "./nodes/ShortTermProjectNode";
import { MainQuestFloatingPath } from "./edges/MainQuestFloatingPath";
import { NorthStarFloatingLink } from "./edges/NorthStarFloatingLink";
import { ProjectFloatingEdge } from "./ProjectFloatingEdge";
import FloatingEdge from "../map/FloatingEdge";

import { getJourneyProjects } from "@/lib/supabase/journey";
import { ProjectWithMilestones } from "@/types/journey";

interface JourneyMapPreviewProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

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

function JourneyMapPreviewInner({
  userId,
  userName,
  userAvatar,
}: JourneyMapPreviewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projectsData = await getJourneyProjects();
      buildMapFromProjects(projectsData);
    } catch (error) {
      console.error("Error loading projects:", error);
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
        selectable: false,
      });

      // Separate North Star and short-term projects
      const northStarProjects = projectsData.filter(
        (p) => p.metadata?.is_north_star === true
      );
      const shortTermProjects = projectsData.filter(
        (p) => p.metadata?.is_north_star !== true
      );

      // Position North Star projects
      const northStarRadius = 400;
      northStarProjects.forEach((project, index) => {
        let x, y;
        if (project.position_x !== null && project.position_y !== null) {
          x = project.position_x;
          y = project.position_y;
        } else {
          const angle = (index / northStarProjects.length) * 2 * Math.PI;
          x = Math.cos(angle) * northStarRadius;
          y = Math.sin(angle) * northStarRadius;
        }

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
            onViewMilestones: () => {},
            onEdit: () => {},
            onReflect: () => {},
          },
          draggable: false,
          selectable: false,
        });

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
        let x, y;
        if (project.position_x !== null && project.position_y !== null) {
          x = project.position_x;
          y = project.position_y;
        } else {
          const angle = (index / shortTermProjects.length) * 2 * Math.PI;
          x = Math.cos(angle) * shortTermRadius;
          y = Math.sin(angle) * shortTermRadius;
        }

        const northStarId = project.metadata?.north_star_id;

        newNodes.push({
          id: project.id,
          type: "shortTerm",
          position: { x, y },
          data: {
            project,
            hasRecentActivity: checkRecentActivity(project),
            isMainQuest: project.metadata?.is_main_quest === true,
            northStarTitle: northStarProjects.find((p) => p.id === northStarId)
              ?.title,
            onViewMilestones: () => {},
            onEdit: () => {},
          },
          draggable: false,
          selectable: false,
        });

        if (northStarId) {
          newEdges.push({
            id: `${project.id}-northstar-${northStarId}`,
            source: project.id,
            target: northStarId,
            type: "northStar",
            animated: false,
          });
        } else {
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

  const handleNavigateToFull = () => {
    window.location.href = "/me/journey";
  };

  return (
    <div
      className="relative w-full h-full cursor-pointer group"
      onClick={handleNavigateToFull}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Overlay with call-to-action */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none transition-all duration-300 ${
          isHovered
            ? "bg-slate-950/60 backdrop-blur-sm"
            : "bg-slate-950/0 backdrop-blur-none"
        }`}
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl px-8 py-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Maximize2 className="w-8 h-8 text-blue-400" />
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Open Full Journey Map
                </h3>
                <p className="text-sm text-slate-400">
                  Explore, edit, and manage your projects
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* ReactFlow Preview */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        attributionPosition="bottom-left"
      >
        <Background
          gap={20}
          size={1}
          color="#334155"
          style={{ backgroundColor: "#0f172a" }}
        />
        <Controls
          showInteractive={false}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function JourneyMapPreview(props: JourneyMapPreviewProps) {
  return (
    <ReactFlowProvider>
      <JourneyMapPreviewInner {...props} />
    </ReactFlowProvider>
  );
}
