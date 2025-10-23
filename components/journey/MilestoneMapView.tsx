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
import { ProjectWithMilestones, MilestoneWithJournals, ProjectMilestone } from "@/types/journey";

interface MilestoneMapViewProps {
  projectId: string;
  onBack: () => void;
}

const nodeTypes = {
  milestone: MilestoneNode,
};

export function MilestoneMapView({ projectId, onBack }: MilestoneMapViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithMilestones | null>(null);
  const [milestones, setMilestones] = useState<MilestoneWithJournals[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null);

  // Dialog states
  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  useEffect(() => {
    loadMilestoneMap();
  }, [projectId]);

  const loadMilestoneMap = async () => {
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
  };

  const buildMilestoneMap = async (milestonesData: MilestoneWithJournals[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create milestone nodes
    for (const milestone of milestonesData) {
      // Get latest journal for preview
      const journals = await getMilestoneJournals(milestone.id);
      const latestJournal = journals.length > 0 ? journals[0] : null;

      const position = milestone.position || { x: 0, y: 0 };

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

    // Create edges from milestone paths
    // Note: This assumes paths are stored in milestone dependencies or via separate path records
    milestonesData.forEach((milestone) => {
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        milestone.dependencies.forEach((depId) => {
          newEdges.push({
            id: `${depId}-${milestone.id}`,
            source: depId,
            target: milestone.id,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: {
              type: "arrowclosed",
              color: "#3b82f6",
            },
          });
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleOpenProgress = (milestone: ProjectMilestone) => {
    setSelectedMilestone(milestone);
    setProgressDialogOpen(true);
  };

  const handleMilestoneCreated = () => {
    loadMilestoneMap();
  };

  const handleProgressUpdated = () => {
    loadMilestoneMap();
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500 mb-4">Project not found</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Journey
        </Button>
      </div>
    );
  }

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;

  return (
    <div className="w-full h-screen relative bg-gray-50">
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
        panOnDrag
      >
        <Background
          gap={20}
          size={1}
          color="#e5e7eb"
          style={{ backgroundColor: "#fafafa" }}
        />
        <Controls
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />

        {/* Header panel */}
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4">
          <div className="flex items-start gap-4">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-gray-900">{project.title}</h2>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-2">{project.description}</p>
              )}
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {completedCount} / {totalCount} milestones
                </Badge>
                <Badge
                  variant={project.status === "in_progress" ? "default" : "secondary"}
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
            <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No milestones yet
              </h3>
              <p className="text-gray-600 mb-4">
                Break down your project into milestones to track progress and stay
                organized.
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
