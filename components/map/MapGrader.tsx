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
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  Calendar,
  HelpCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { 
  updateTeamNodeStatus, 
  assignTeamMemberToNode, 
  requestHelpForTeamNode,
  scheduleTeamMeeting 
} from "@/lib/supabase/maps";

interface MapGraderProps {
  teamId: string;
  nodeId: string;
  teamProgress: any;
  onProgressUpdate: () => void;
  userRole: string;
}

export function MapGrader({ 
  teamId, 
  nodeId, 
  teamProgress, 
  onProgressUpdate, 
  userRole 
}: MapGraderProps) {
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [helpMessage, setHelpMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const isInstructorOrTA = userRole === "instructor" || userRole === "TA";
  const currentProgress = teamProgress[nodeId];

  useEffect(() => {
    loadTeamMembers();
  }, [teamId]);

  const loadTeamMembers = async () => {
    const supabase = createClient();
    const { data: members } = await supabase
      .from("team_memberships")
      .select(
        `
        user_id,
        profiles:user_id(username, full_name, avatar_url)
      `
      )
      .eq("team_id", teamId)
      .is("left_at", null);

    setTeamMembers(members || []);
  };

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

  const handleAssignMember = async () => {
    if (!assignedTo) return;
    
    setIsLoading(true);
    try {
      await assignTeamMemberToNode(teamId, nodeId, assignedTo);
      onProgressUpdate();
      setAssignedTo("");
    } catch (error) {
      console.error("Error assigning team member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!helpMessage.trim()) return;
    
    setIsLoading(true);
    try {
      await requestHelpForTeamNode(teamId, nodeId, helpMessage);
      onProgressUpdate();
      setHelpMessage("");
    } catch (error) {
      console.error("Error requesting help:", error);
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
    <div className="space-y-4">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Team Status
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
            {currentProgress?.assigned_to && (
              <Badge variant="outline" className="text-xs">
                Assigned to: {teamMembers.find(m => m.user_id === currentProgress.assigned_to)?.profiles?.username || "Unknown"}
              </Badge>
            )}
          </div>
          
          {currentProgress?.help_request_message && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium text-yellow-800">Help Request:</p>
              <p className="text-yellow-700">{currentProgress.help_request_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Member Assignment */}
      {isInstructorOrTA && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Assign Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.profiles?.username || member.profiles?.full_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAssignMember} 
                disabled={!assignedTo || isLoading}
                size="sm"
              >
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Request */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Request Help</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              placeholder="Describe what help you need..."
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleRequestHelp} 
              disabled={!helpMessage.trim() || isLoading}
              variant="outline"
              size="sm"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Request Help
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grading (Instructor/TA only) */}
      {isInstructorOrTA && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Grade Submission</CardTitle>
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
                Submit Grade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Member Progress */}
      {currentProgress?.member_progress && currentProgress.member_progress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Team Member Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentProgress.member_progress.map((member: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{member.profiles?.username || "Unknown"}</span>
                  <Badge variant="outline">{member.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}