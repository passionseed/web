"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle } from "lucide-react";
import type { PathLabQualityResult } from "@/types/pathlab-generator";

interface ValidationErrorDisplayProps {
  validation: PathLabQualityResult;
  className?: string;
}

const ERROR_EXPLANATIONS: Record<string, string> = {
  DAY_COUNT_MISMATCH:
    "The number of days defined doesn't match the requested total. This needs to be fixed.",
  DAY_NUMBER_SEQUENCE:
    "Days must be numbered continuously starting from 1. Some day numbers are missing or out of order.",
  DAY_REFLECTION_REQUIRED:
    "Each day needs at least one reflection prompt to help learners process what they've learned.",
  DAY_NODE_REQUIRED:
    "Each day must have at least one node (learning activity). Empty days aren't useful.",
  DAY_NODE_OVERLOAD:
    "This day has a lot of nodes, which might overwhelm learners. Consider splitting content across multiple days.",
  DAY_NODE_KEY_NOT_FOUND:
    "A day references a node that doesn't exist. This will cause errors.",
  NODE_ORPHAN:
    "This node isn't assigned to any day, so learners won't be able to access it.",
  ASSESSMENT_QUIZ_NO_QUESTIONS:
    "Quiz assessments need at least one question to be useful.",
  ASSESSMENT_QUIZ_OPTIONS:
    "Quiz questions must have at least two answer options.",
  ASSESSMENT_QUIZ_CORRECT_OPTION:
    "The marked correct answer doesn't match any of the provided options.",
  ASSESSMENT_CHECKLIST_EMPTY:
    "Checklist assessments need at least one item for learners to check off.",
  ASSESSMENT_PROMPT_REQUIRED:
    "This assessment type requires instructions or a prompt to guide learners.",
  EDGE_NODE_KEY_NOT_FOUND:
    "A prerequisite connection references nodes that don't exist.",
  EDGE_SELF_LOOP: "A node can't be a prerequisite for itself.",
  GRAPH_CYCLE_DETECTED:
    "The prerequisite connections create a circular dependency, which makes it impossible to complete all nodes.",
  ASSESSMENT_NONE:
    "No assessments were created. Consider adding quizzes or activities to check understanding.",
};

export function ValidationErrorDisplay({
  validation,
  className,
}: ValidationErrorDisplayProps) {
  const { errors, warnings } = validation;

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-4">
          {/* Critical Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <span>Critical Errors ({errors.length})</span>
                <Badge variant="destructive">Must Fix</Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-3">
                  {errors.map((error, i) => (
                    <div key={i} className="space-y-1">
                      <div className="font-medium text-sm">{error.message}</div>
                      {ERROR_EXPLANATIONS[error.code] && (
                        <div className="text-xs opacity-90">
                          {ERROR_EXPLANATIONS[error.code]}
                        </div>
                      )}
                      {error.field && (
                        <div className="text-xs opacity-75">
                          <span className="font-mono">{error.field}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <span>Warnings ({warnings.length})</span>
                <Badge variant="secondary">Review Recommended</Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-3">
                  {warnings.map((warning, i) => (
                    <div key={i} className="space-y-1">
                      <div className="font-medium text-sm">{warning.message}</div>
                      {ERROR_EXPLANATIONS[warning.code] && (
                        <div className="text-xs opacity-75">
                          {ERROR_EXPLANATIONS[warning.code]}
                        </div>
                      )}
                      {warning.field && (
                        <div className="text-xs opacity-60">
                          <span className="font-mono">{warning.field}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
