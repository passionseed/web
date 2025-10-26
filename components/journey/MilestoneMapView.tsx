/**
 * MilestoneMapView - Full-screen view for project milestones
 * Shows milestone nodes and paths with progress tracking
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
  Panel,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, Target } from "lucide-react";
import { toast } from "sonner";

import { MilestoneNode } from "./nodes/MilestoneNode";
import { CreateMilestoneDialog } from "./CreateMilestoneDialog";
import { MilestoneProgressDialog } from "./MilestoneProgressDialog";

import {
  getProjectById,
  getProjectMilestones,
  getMilestoneJournals,
} from "@/lib/supabase/journey";
import {
  ProjectWithMilestones,
  MilestoneWithJournals,
  ProjectMilestone,
} from "@/types/journey";

interface MilestoneMapViewProps {
  projectId: string;
  onBack: () => void;
}

const nodeTypes = {
  milestone: MilestoneNode,
};

export function MilestoneMapView({ projectId, onBack }: MilestoneMapViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] =
    useState<ProjectMilestone | null>(null);

  // Dialog states
  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  const handleOpenProgress = useCallback((milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setProgressDialogOpen(true);
  }, []);

  const buildMilestoneMap = useCallback(
    async (milestonesData: MilestoneWithJournals[]) => {
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Check if milestones have positions set
      const hasPositions = milestonesData.some(
        (m) => m.position_x !== null && m.position_x !== undefined
      );

      // Create milestone nodes
      for (let i = 0; i < milestonesData.length; i++) {
        const milestone = milestonesData[i];

        // Get latest journal for preview
        const journals = await getMilestoneJournals(milestone.id);
        const latestJournal = journals.length > 0 ? journals[0] : null;

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
            onOpenProgress: () => handleOpenProgress(milestone),
          },
          draggable: true,
          selectable: true,
        });
      }

      // Create sequential edges if no positions (auto-layout)
      if (!hasPositions && milestonesData.length > 1) {
        for (let i = 0; i < milestonesData.length - 1; i++) {
          newEdges.push({
            id: `edge-${i}`,
            source: milestonesData[i].id,
            target: milestonesData[i + 1].id,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#3b82f6",
            },
          });
        }
      }

      console.log(
        "✅ Built milestone nodes:",
        newNodes.length,
        "edges:",
        newEdges.length
      );
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges, handleOpenProgress]
  );

  const loadMilestoneMap = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectData, milestonesData] = await Promise.all([
        getProjectById(projectId),
        getProjectMilestones(projectId),
      ]);

      setProject(projectData);
      setMilestones(milestonesData);

      if (projectData && milestonesData) {
        await buildMilestoneMap(milestonesData);
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
  }, [loadMilestoneMap]);

  const handleMilestoneCreated = () => {
    loadMilestoneMap();
  };

  const handleProgressUpdated = () => {
    loadMilestoneMap();
  };

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
    <div className="w-full h-screen relative bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.3,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        panOnDrag={[1, 2]}
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
          className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-4 m-4"
        >
          <div className="flex items-start gap-4">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-slate-100">
                  {project.title}
                </h2>
              </div>
              {project.description && (
                <p className="text-sm text-slate-400 mb-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {completedCount} / {totalCount} milestones
                </Badge>
                <Badge
                  variant={
                    project.status === "in_progress" ? "default" : "secondary"
                  }
                >
                  {project.status}
                </Badge>
              </div>
            </div>
            <Button onClick={() => setCreateMilestoneOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </Panel>

        {/* Empty state */}
        {milestones.length === 0 && (
          <Panel position="top-center" className="mt-32">
            <div className="bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg p-8 text-center max-w-md">
              <Target className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                No milestones yet
              </h3>
              <p className="text-slate-400 mb-4">
                Break down your project into milestones to track progress and
                stay organized.
              </p>
              <Button onClick={() => setCreateMilestoneOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Milestone
              </Button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Dialogs */}
      <CreateMilestoneDialog
        open={createMilestoneOpen}
        onOpenChange={setCreateMilestoneOpen}
        projectId={projectId}
        existingMilestones={milestones}
        onSuccess={handleMilestoneCreated}
      />

      <MilestoneProgressDialog
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
        milestone={selectedMilestone}
        onSuccess={handleProgressUpdated}
      />
    </div>
  );
}
