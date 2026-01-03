"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PSTask } from "@/actions/ps";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
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
    GripVertical
} from "lucide-react";

interface DraggableTaskProps {
    task: PSTask;
    isCollected?: boolean;
    onStatusChange: (taskId: string, status: string) => void;
    onDelete: (taskId: string) => void;
    onEdit: (task: PSTask) => void;
    onFocus: (task: PSTask) => void;
    getDifficultyColor: (diff: number) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

// Separated visual component for reuse in DragOverlay
export function TaskCard({ task, isOverlay, isCollected, onStatusChange, onDelete, onEdit, onFocus, getDifficultyColor, getStatusIcon }: DraggableTaskProps & { isOverlay?: boolean }) {
    return (
        <Card
            className={`relative group overflow-hidden h-full flex flex-col transition-all bg-card
            ${isOverlay ? 'shadow-2xl rotate-2 scale-105 cursor-grabbing z-50 ring-2 ring-primary' : 'hover:shadow-md cursor-grab active:cursor-grabbing'}
            ${isCollected && !isOverlay ? 'opacity-0 pointer-events-none' : ''}
            `}
        >
            {/* Status Indicator Bar at Top */}
            <div
                className={`h-1 w-full ${task.status === "done" ? "bg-green-500" : task.status === "in_progress" ? "bg-blue-500" : "bg-gray-200"}`}
            />

            <CardContent className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex justify-between items-start gap-2">
                    <p
                        className={`font-medium text-lg leading-tight line-clamp-3 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                    >
                        {task.goal}
                    </p>

                    <div className="flex gap-1">
                        {!isOverlay && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onEdit(task)}>
                                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
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

                {task.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-4 flex-1 whitespace-pre-wrap">
                        {task.notes}
                    </p>
                )}

                <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/50">
                    <div className="flex gap-2 items-center">
                        <button
                            className="hover:opacity-80 transition-opacity"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onStatusChange(task.id, task.status === "done" ? "todo" : "done")}
                        >
                            {getStatusIcon(task.status)}
                        </button>
                        <Badge
                            variant="secondary"
                            className={`text-[10px] h-5 px-1.5 ${getDifficultyColor(task.difficulty)}`}
                        >
                            Lvl {task.difficulty}
                        </Badge>
                    </div>

                    {task.status !== "done" && !isOverlay && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs hover:bg-blue-50 text-blue-600"
                            onClick={() => onFocus(task)}
                        >
                            <Play className="h-3 w-3 mr-1" /> Focus
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function DraggableTask(props: DraggableTaskProps) {
    const { task, isCollected } = props;

    // Only use draggable hooks if NOT collected (collected items shouldn't be draggable themselves to avoid conflict, 
    // or maybe they should? For now, let's keep them draggable but if they are dimmed it implies they are "in" the stack)
    // Actually, user might want to drag a collected item OUT of a stack? 
    // For simplicity, regular items are draggable.

    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: task
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: task.id,
        data: task
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full" suppressHydrationWarning={true}>
            <TaskCard {...props} />
        </div>
    );
}
