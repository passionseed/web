"use client";

import { ArrowRight, Link2, TrendingUp, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PROJECT_PATH_STYLES,
  type ProjectPathType,
} from "./utils/projectPathStyles";

interface ProjectPathTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProjectId: string | null;
  destinationProjectId: string | null;
  sourceProjectTitle?: string;
  destinationProjectTitle?: string;
  onSelectType: (
    pathType: "dependency" | "relates_to" | "leads_to"
  ) => Promise<void>;
  isCreating?: boolean;
}

interface PathTypeOption {
  type: ProjectPathType;
  icon: typeof ArrowRight;
  color: string;
  label: string;
  description: string;
}

const PATH_TYPE_OPTIONS: PathTypeOption[] = [
  {
    type: "dependency",
    icon: ArrowRight,
    color: PROJECT_PATH_STYLES.dependency.stroke,
    label: PROJECT_PATH_STYLES.dependency.label,
    description: PROJECT_PATH_STYLES.dependency.description,
  },
  {
    type: "relates_to",
    icon: Link2,
    color: PROJECT_PATH_STYLES.relates_to.stroke,
    label: PROJECT_PATH_STYLES.relates_to.label,
    description: PROJECT_PATH_STYLES.relates_to.description,
  },
  {
    type: "leads_to",
    icon: TrendingUp,
    color: PROJECT_PATH_STYLES.leads_to.stroke,
    label: PROJECT_PATH_STYLES.leads_to.label,
    description: PROJECT_PATH_STYLES.leads_to.description,
  },
];

export function ProjectPathTypeDialog({
  open,
  onOpenChange,
  sourceProjectId,
  destinationProjectId,
  sourceProjectTitle,
  destinationProjectTitle,
  onSelectType,
  isCreating = false,
}: ProjectPathTypeDialogProps) {
  const handleSelectType = async (pathType: ProjectPathType) => {
    if (isCreating) return;
    await onSelectType(pathType);
  };

  const canCreate = sourceProjectId && destinationProjectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-950 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Select Relationship Type
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {canCreate && sourceProjectTitle && destinationProjectTitle ? (
              <>
                Define how{" "}
                <span className="font-medium text-slate-300">
                  {sourceProjectTitle}
                </span>{" "}
                relates to{" "}
                <span className="font-medium text-slate-300">
                  {destinationProjectTitle}
                </span>
              </>
            ) : (
              "Choose how these projects connect to each other"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {PATH_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.type}
                className={`
                  cursor-pointer
                  transition-all
                  duration-200
                  bg-slate-900/50
                  border-slate-800
                  hover:border-[${option.color}]
                  hover:shadow-lg
                  hover:shadow-[${option.color}]/20
                  ${isCreating ? "opacity-50 cursor-not-allowed" : ""}
                `}
                style={{
                  borderColor: isCreating ? undefined : undefined,
                }}
                onClick={() => handleSelectType(option.type)}
                onMouseEnter={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.borderColor = option.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.borderColor = "";
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <Icon
                    className="w-8 h-8 mb-2"
                    style={{ color: option.color }}
                  />
                  <CardTitle className="text-lg text-slate-100">
                    {option.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 mb-4">
                    {option.description}
                  </p>
                  <div
                    className="h-1 rounded-full"
                    style={{
                      background: option.color,
                      opacity: 0.8,
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isCreating && (
          <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Creating connection...</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
