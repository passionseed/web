"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PSTask } from "@/actions/ps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit2,
  GripVertical,
  MessageSquare,
} from "lucide-react";

interface DraggableTaskProps {
    task: PSTask & { feedback_count?: number };
    isCollected?: boolean;
    isOverdue?: boolean;
    onStatusChange: (taskId: string, status: string) => void;
    onDelete: (taskId: string) => void;
    onEdit: (task: PSTask) => void;
    onFocus: (task: PSTask) => void;
    getDifficultyColor: (diff: number) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

// Separated visual component for reuse in DragOverlay
export function TaskCard({ task, isOverlay, isCollected, isOverdue, onStatusChange, onDelete, onEdit, onFocus, getDifficultyColor, getStatusIcon }: DraggableTaskProps & { isOverlay?: boolean }) {
    return (
        <Card
            className={`relative group overflow-hidden flex flex-col transition-all bg-card border-l-4
            ${isOverlay ? 'shadow-2xl rotate-2 scale-105 cursor-grabbing z-50 ring-2 ring-primary w-[220px]' : 'hover:shadow-md cursor-grab active:cursor-grabbing w-full'}
            ${isCollected && !isOverlay ? 'opacity-0 pointer-events-none' : ''}
            ${isOverdue && !isOverlay ? 'border-red-400 dark:border-red-900' : ''}
            `}
            style={{ borderLeftColor: task.status === 'done' ? '#22c55e' : task.status === 'in_progress' ? '#3b82f6' : undefined }}
        >
            <CardContent className="p-2 flex flex-col gap-1.5 relative">
                <div className="flex justify-between items-start gap-1">
                    <p
                        className={`text-sm font-medium leading-snug line-clamp-2 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                    >
                        {task.goal}
                    </p>

                    <div className="flex gap-0.5 shrink-0">
                        {!isOverlay && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onEdit(task)}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onStatusChange(task.id, "todo")}>
                                        <Circle className="mr-2 h-4 w-4" /> Todo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(task.id, "in_progress")}>
                                        <Clock className="mr-2 h-4 w-4" /> In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(task.id, "done")}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(task.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                    <button
                        className="hover:opacity-80 transition-opacity p-0.5"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onStatusChange(task.id, task.status === "done" ? "todo" : "done")}
                    >
                        {getStatusIcon(task.status)}
                    </button>

                    <div className="flex items-center gap-1">
                        <Badge
                            variant="secondary"
                            className={`text-[9px] h-4 px-1 rounded-sm ${getDifficultyColor(task.difficulty)}`}
                        >
                            {task.difficulty}
                        </Badge>

                        {task.feedback_count && task.feedback_count > 0 ? (
                            <Badge
                                variant="outline"
                                className="text-[9px] h-4 px-1 rounded-sm flex gap-0.5 items-center border-orange-200 text-orange-700 bg-orange-50"
                            >
                                <MessageSquare className="h-2.5 w-2.5" /> {task.feedback_count}
                            </Badge>
                        ) : null}

                        {task.status !== "done" && !isOverlay && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => onFocus(task)}
                            >
                                <Play className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function DraggableTask(props: DraggableTaskProps) {
    const { task, isCollected, isOverdue } = props;

  // Only use draggable hooks if NOT collected (collected items shouldn't be draggable themselves to avoid conflict,
  // or maybe they should? For now, let's keep them draggable but if they are dimmed it implies they are "in" the stack)
  // Actually, user might want to drag a collected item OUT of a stack?
  // For simplicity, regular items are draggable.

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: task,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: task.id,
    data: task,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // Hide original when dragging (overlay will show)
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="h-full"
      suppressHydrationWarning={true}
    >
      <TaskCard {...props} />
    </div>
  );
}
