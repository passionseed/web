"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  HelpCircle,
  Crown
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { 
  updateTeamNodeStatus 
} from "@/lib/supabase/maps";

interface MapGraderProps {
  teamId: string;
  nodeId: string;
  teamProgress: any;
  onProgressUpdate: () => void;
  userRole: string;
}

// DEPRECATED: This component is being replaced by InstructorTeamGradingPanel
// It's kept for backward compatibility but should not be used for new implementations
export function MapGrader({ 
  teamId, 
  nodeId, 
  teamProgress, 
  onProgressUpdate, 
  userRole 
}: MapGraderProps) {
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const isInstructorOrTA = userRole === "instructor" || userRole === "TA";
  const currentProgress = teamProgress[nodeId];

  // Only allow instructors and TAs to use this component
  if (!isInstructorOrTA) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>This grading interface is only available to instructors and TAs.</p>
        <p className="text-sm mt-2">Students should use the TeamNodeViewPanel for submissions.</p>
      </div>
    );
  }

  const handleGradeSubmission = async () => {
    if (!grade) return;
    
    setIsLoading(true);
    try {
      await updateTeamNodeStatus(teamId, nodeId, grade as any);
      onProgressUpdate();
      setGrade("");
      setFeedback("");
    } catch (error) {
      console.error("Error grading team submission:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      not_started: { label: "Not Started", variant: "secondary", icon: Clock },
      assigned: { label: "Assigned", variant: "outline", icon: Users },
      in_progress: { label: "In Progress", variant: "default", icon: Clock },
      submitted: { label: "Submitted", variant: "default", icon: MessageSquare },
      passed: { label: "Passed", variant: "success", icon: CheckCircle },
      passed_late: { label: "Passed (Late)", variant: "warning", icon: CheckCircle },
      passed_zero_grade: { label: "Passed (Zero Grade)", variant: "warning", icon: CheckCircle },
      failed: { label: "Failed", variant: "destructive", icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Deprecation Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Deprecated Component
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700">
            This MapGrader component is deprecated. Please use the new InstructorTeamGradingPanel 
            which provides a more comprehensive grading interface with better team submission management.
          </p>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Status (Legacy View)
            {currentProgress?.help_requested && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Help Requested
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {getStatusBadge(currentProgress?.status || "not_started")}
          </div>
          
          {currentProgress?.help_request_message && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium text-yellow-800">Help Request:</p>
              <p className="text-yellow-700">{currentProgress.help_request_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Grading Interface (Instructor/TA only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Grade (Legacy)</CardTitle>
          <CardDescription>
            For full grading features, use the InstructorTeamGradingPanel component
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="passed_late">Passed (Late)</SelectItem>
                <SelectItem value="passed_zero_grade">Passed (Zero Grade)</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Textarea
              placeholder="Add feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            
            <Button 
              onClick={handleGradeSubmission} 
              disabled={!grade || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Submit Grade
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Best Submission Info */}
      {currentProgress?.best_submission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Best Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p><strong>Submitted by:</strong> {currentProgress.best_submission.profiles?.username}</p>
              <p><strong>Submitted at:</strong> {new Date(currentProgress.best_submission.submitted_at).toLocaleString()}</p>
              <p><strong>Status:</strong> {currentProgress.best_submission.grade_status}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}