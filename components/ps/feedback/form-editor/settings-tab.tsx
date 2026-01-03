"use client";

import { PSForm, updateForm } from "@/actions/ps-feedback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransition } from "react";
import { toast } from "@/components/ui/use-toast";
import { Check } from "lucide-react";

interface SettingsTabProps {
  form: PSForm;
  projectId: string;
  tasks: { id: string; goal: string; status: string }[];
}

export function SettingsTab({ form, projectId, tasks }: SettingsTabProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (updates: Partial<PSForm>) => {
    startTransition(async () => {
      try {
        await updateForm(form.id, projectId, updates);
        toast({
          title: "Settings saved",
          description: "Your changes have been saved.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save settings.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Manage basic form details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Form Title</Label>
            <Input
              defaultValue={form.title}
              onBlur={(e) => {
                if (e.target.value !== form.title)
                  handleUpdate({ title: e.target.value });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              defaultValue={form.description || ""}
              placeholder="Public facing description"
              onBlur={(e) => {
                if (e.target.value !== (form.description || ""))
                  handleUpdate({ description: e.target.value });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Access & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
            <div className="space-y-0.5">
              <Label>Require Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Only logged-in users can submit feedback.
              </p>
            </div>
            <Switch
              checked={form.require_auth}
              onCheckedChange={(c) => handleUpdate({ require_auth: c })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Link to Task</CardTitle>
          <CardDescription>
            Associate this form with a specific task in the project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project Task</Label>
            <Select
              value={form.task_id || "none"}
              onValueChange={(val) =>
                handleUpdate({ task_id: val === "none" ? null : val })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- No Task Linked --</SelectItem>
                {tasks?.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <span className="flex items-center gap-2">
                      {task.status === "done" && (
                        <Check className="w-3 h-3 text-green-500" />
                      )}
                      {task.goal}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Submissions will be automatically linked to this task.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
