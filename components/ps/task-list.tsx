"use client";

import { useState } from "react";
import {
  PSTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
  createTask,
} from "@/actions/ps";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit2,
  Plus,
} from "lucide-react";
import { FocusTimer } from "./focus-timer";
import { useToast } from "@/components/ui/use-toast";

interface TaskListProps {
  tasks: PSTask[];
  projectId: string;
}

export function TaskList({ tasks, projectId }: TaskListProps) {
  const [activeTaskForFocus, setActiveTaskForFocus] = useState<PSTask | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<PSTask | null>(null);
  const { toast } = useToast();

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus, projectId);
      toast({ title: "Updated", description: "Task status updated." });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId, projectId);
      toast({ title: "Deleted", description: "Task deleted." });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDifficultyColor = (diff: number) => {
    if (diff >= 8)
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    if (diff >= 5)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  };

  // Group tasks
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-8">
      {/* Create Task Form / Dialog */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                formData.append("projectId", projectId);
                await createTask(formData);
                toast({
                  title: "Created",
                  description: "Task created successfully.",
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Goal / Title</Label>
                  <Input
                    id="goal"
                    name="goal"
                    required
                    placeholder="Fix login bug"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty (1-10)</Label>
                    <Input
                      id="difficulty"
                      name="difficulty"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Initial Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any details..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  Add Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {/* Simple list view for now, could be Kanban later */}
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No tasks yet.
          </p>
        )}

        {tasks.map((task) => (
          <Card key={task.id} className="relative group overflow-hidden">
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === "done" ? "bg-green-500" : task.status === "in_progress" ? "bg-blue-500" : "bg-gray-200"}`}
            />
            <CardContent className="p-4 pl-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() =>
                    handleStatusChange(
                      task.id,
                      task.status === "done" ? "todo" : "done"
                    )
                  }
                  className="flex-shrink-0"
                >
                  {getStatusIcon(task.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                  >
                    {task.goal}
                  </p>
                  <div className="flex gap-2 items-center mt-1 text-xs text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] h-5 ${getDifficultyColor(task.difficulty)}`}
                    >
                      Difficulty: {task.difficulty}
                    </Badge>
                    {task.notes && (
                      <span className="truncate max-w-[200px]">
                        {task.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {task.status !== "done" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                    onClick={() => setActiveTaskForFocus(task)}
                  >
                    <Play className="h-4 w-4 mr-1" /> Focus
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditingTask(task)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "todo")}
                    >
                      <Circle className="mr-2 h-4 w-4" /> Todo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "in_progress")}
                    >
                      <Clock className="mr-2 h-4 w-4" /> In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "done")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Focus Timer Dialog */}
      <Dialog
        open={!!activeTaskForFocus}
        onOpenChange={(open) => !open && setActiveTaskForFocus(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Focus Session</DialogTitle>
          {activeTaskForFocus && (
            <FocusTimer
              taskId={activeTaskForFocus.id}
              taskTitle={activeTaskForFocus.goal}
              onSessionSaved={() => setActiveTaskForFocus(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form
              action={async (formData) => {
                formData.append("taskId", editingTask.id);
                formData.append("projectId", projectId);
                await updateTask(formData);
                setEditingTask(null);
                toast({ title: "Updated", description: "Task updated." });
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-goal">Goal</Label>
                  <Input
                    id="edit-goal"
                    name="goal"
                    required
                    defaultValue={editingTask.goal}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-difficulty">Difficulty</Label>
                  <Input
                    id="edit-difficulty"
                    name="difficulty"
                    type="number"
                    defaultValue={editingTask.difficulty}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingTask.notes || ""}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
