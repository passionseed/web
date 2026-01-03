"use client";

import {
  PSSubmission,
  updateSubmissionInternal,
  linkSubmissionToTask,
  getProjects,
} from "@/actions/ps-feedback";
// We need to fetch tasks for linking, maybe pass them or fetch dynamically
import { getProject } from "@/actions/ps-feedback";
// wait, we need tasks list. Reuse getProject from ps.ts?
import { getProject as getProjectData } from "@/actions/ps";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Star, Link as LinkIcon, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SubmissionViewerProps {
  submission: PSSubmission;
  projectId: string;
}

export function SubmissionViewer({
  submission,
  projectId,
}: SubmissionViewerProps) {
  const [rating, setRating] = useState(submission.internal_rating || 0);
  const [notes, setNotes] = useState(submission.internal_notes || "");
  const [tasks, setTasks] = useState<any[]>([]);
  const [linkTaskId, setLinkTaskId] = useState("");
  const { toast } = useToast();

  // Fetch tasks for linking
  useEffect(() => {
    // This should probably be done higher up or via a specific action for lighter weight
    getProjectData(projectId).then((p) => {
      if (p) setTasks(p.ps_tasks || []);
    });
  }, [projectId]);

  const handleSaveInternal = async () => {
    try {
      await updateSubmissionInternal(
        submission.id,
        rating === 0 ? null : rating,
        notes,
        projectId
      );
      toast({ title: "Saved", description: "Internal details updated." });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save.",
        variant: "destructive",
      });
    }
  };

  const handleLinkTask = async () => {
    if (!linkTaskId) return;
    try {
      await linkSubmissionToTask(submission.id, linkTaskId, projectId);
      toast({ title: "Linked", description: "Submission linked to task." });
      setLinkTaskId("");
      // Optimistic update or refresh? RevalidatePath handles refresh usually
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to link task.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="bg-muted/40">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              Feedback from{" "}
              {submission.user_id ? "Authenticated User" : "Anonymous"}
            </CardTitle>
            <CardDescription>
              {new Date(submission.created_at).toLocaleString()}
            </CardDescription>
          </div>
          <Badge
            variant={
              submission.internal_rating && submission.internal_rating >= 4
                ? "default"
                : "secondary"
            }
          >
            {submission.internal_rating
              ? `${submission.internal_rating} Stars`
              : "Not Rated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Answers */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Responses
          </h3>
          {submission.ps_submission_answers?.map((ans) => (
            <div key={ans.id} className="border-b pb-2 last:border-0">
              <p className="text-sm font-medium mb-1">
                {ans.field_label || "Question"}
              </p>
              <p className="text-base whitespace-pre-wrap">
                {ans.answer_text ||
                  (ans.answer_boolean !== null
                    ? ans.answer_boolean
                      ? "Yes"
                      : "No"
                    : ans.answer_number)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
          {/* Internal Review */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Team Review
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 rounded-full hover:bg-muted ${rating >= star ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                  >
                    <Star
                      className="w-6 h-6"
                      fill={rating >= star ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add team notes about this feedback..."
              />
            </div>
            <Button onClick={handleSaveInternal} size="sm">
              Save Review
            </Button>
          </div>

          {/* Task Linking */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Linked Tasks
            </h3>
            {/* Display existing links if available in submission object details */}
            {(submission as any).ps_feedback_task_links?.length > 0 ? (
              <div className="space-y-2">
                {(submission as any).ps_feedback_task_links.map((link: any) => (
                  <div
                    key={link.task_id}
                    className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span className="flex-1 truncate">
                      {link.ps_tasks?.goal}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {link.ps_tasks?.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No linked tasks.
              </p>
            )}

            <div className="flex gap-2">
              <Select value={linkTaskId} onValueChange={setLinkTaskId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Link to Task..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleLinkTask}
                disabled={!linkTaskId}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
