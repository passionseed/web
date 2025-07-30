// app/components/NodeViewPanel/NodeHeaderView.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  FileText,
  Film,
  Image as ImageIcon,
  Pencil,
  Play,
  Clock,
  CheckSquare,
  Upload,
  Star,
  MessageCircle,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { MapNode, StudentNodeProgress } from "@/types/map";

interface NodeHeaderViewProps {
  nodeData: MapNode | undefined;
  progress: StudentNodeProgress | null;
  currentUser: any;
  hasStarted: boolean;
  isStarting: boolean;
  onStartNode: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "passed":
      return "default"; // Default is green
    case "failed":
      return "destructive"; // Destructive is red
    case "submitted":
      return "secondary"; // Secondary is yellow
    case "in_progress":
      return "outline"; // Outline is blue
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "passed":
      return <CheckCircle className="h-3 w-3 mr-1" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 mr-1" />;
    case "submitted":
      return <CheckSquare className="h-3 w-3 mr-1" />;
    case "in_progress":
      return <Clock className="h-3 w-3 mr-1 animate-pulse" />;
    default:
      return null;
  }
};

export function NodeHeaderView({
  nodeData,
  progress,
  currentUser,
  hasStarted,
  isStarting,
  onStartNode,
}: NodeHeaderViewProps) {
  if (!nodeData) return null;

  return (
    <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {nodeData.title}
          </h2>
          {nodeData.instructions && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {nodeData.instructions}
            </p>
          )}
        </div>
        {nodeData.sprite_url && (
          <img
            src={nodeData.sprite_url}
            alt={nodeData.title}
            className="w-12 h-12 object-contain ml-3 opacity-80"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="font-medium">
          <Star className="h-3 w-3 mr-1" />
          Level {nodeData.difficulty}
        </Badge>
        {nodeData.sprite_url && (
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-700 border-purple-200"
          >
            <Trophy className="h-3 w-3 mr-1" />
            Boss Node
          </Badge>
        )}
        {progress && (
          <Badge
            variant={getStatusBadgeVariant(progress.status)}
            className={`font-medium ${
              progress.status === "passed"
                ? "bg-green-100 text-green-700 border-green-200"
                : progress.status === "failed"
                  ? "bg-red-100 text-red-700 border-red-200"
                  : progress.status === "submitted"
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : progress.status === "in_progress"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : ""
            }`}
          >
            {getStatusIcon(progress.status)}
            {progress.status.replace("_", " ").toUpperCase()}
          </Badge>
        )}
      </div>
      {currentUser && !hasStarted && (
        <Button
          onClick={onStartNode}
          disabled={isStarting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
          size="lg"
        >
          {isStarting ? (
            <Clock className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Start Learning Journey
        </Button>
      )}
      {progress && hasStarted && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Progress Timeline
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Started:</span>
              <span className="font-mono">
                {new Date(progress.started_at!).toLocaleString()}
              </span>
            </div>
            {progress.submitted_at && (
              <div className="flex justify-between">
                <span>Submitted:</span>
                <span className="font-mono">
                  {new Date(progress.submitted_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
