"use client";

import { useState, useRef } from "react";
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
import { Slider } from "@/components/ui/slider";
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
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor, DragOverlay } from "@dnd-kit/core";
import { DraggableTask, TaskCard } from "./draggable-task";
import { FocusDropZone } from "./focus-drop-zone";
import { FocusTimer } from "./focus-timer";
import { useToast } from "@/components/ui/use-toast";

interface TaskListProps {
    tasks: PSTask[];
    projectId: string;
    themeColor?: any;
}

export function TaskList({ tasks, projectId, themeColor }: TaskListProps) {
    const [activeTasksForFocus, setActiveTasksForFocus] = useState<PSTask[]>([]);
    const [collectedTaskIds, setCollectedTaskIds] = useState<Set<string>>(new Set());
    const [editingTask, setEditingTask] = useState<PSTask | null>(null);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newDifficulty, setNewDifficulty] = useState([1]);
    const [editDifficulty, setEditDifficulty] = useState([1]);

    // State to track if we are over the drop zone to disable drop animation
    const [isOverDropZone, setIsOverDropZone] = useState(false);

    const collectionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const currentOverIdRef = useRef<string | null>(null);
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

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        // Start collection with the dragged task
        setCollectedTaskIds(new Set([active.id as string]));
        setIsOverDropZone(false);
    };

    const handleDragOver = (event: DragEndEvent) => {
        const { active, over } = event;
        const overId = over?.id as string | undefined;

        // If invisible drop zone, ignore collection logic but keep valid over
        if (!over) {
            if (collectionTimerRef.current) clearTimeout(collectionTimerRef.current);
            currentOverIdRef.current = null;
            setIsOverDropZone(false);
            return;
        }

        // Optimization: prevent running logic if still over same item
        if (overId === currentOverIdRef.current) return;
        currentOverIdRef.current = overId || null;

        // Update drop zone state
        setIsOverDropZone(overId === "focus-drop-zone");

        // Clear any pending collection if we moved to something else
        if (collectionTimerRef.current) {
            clearTimeout(collectionTimerRef.current);
            collectionTimerRef.current = null;
        }

        if (overId && active.id !== overId && overId !== "focus-drop-zone") {
            const overTask = tasks.find(t => t.id === overId);

            // Only collect if the task is NOT done
            if (overTask && overTask.status !== "done") {
                // Start delay timer before collecting
                collectionTimerRef.current = setTimeout(() => {
                    setCollectedTaskIds(prev => {
                        const newSet = new Set(prev);
                        newSet.add(overId);
                        return newSet;
                    });
                }, 300); // 0.3s delay
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        // Cleanup timer
        if (collectionTimerRef.current) {
            clearTimeout(collectionTimerRef.current);
            collectionTimerRef.current = null;
        }
        currentOverIdRef.current = null;

        if (over && over.id === "focus-drop-zone") {
            // Collect all tasks that were in the set
            const allCollectedTasks = tasks.filter(t => collectedTaskIds.has(t.id));

            // Ensure the dragged task is included even if set logic failed somehow
            if (!allCollectedTasks.find(t => t.id === active.id)) {
                const activeTask = tasks.find(t => t.id === active.id);
                if (activeTask) allCollectedTasks.push(activeTask);
            }

            if (allCollectedTasks.length > 0) {
                setActiveTasksForFocus(allCollectedTasks);
            }
        }

        // Clear collection after drag ends
        setCollectedTaskIds(new Set());
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Group tasks
    const todoTasks = tasks.filter((t) => t.status === "todo");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const doneTasks = tasks.filter((t) => t.status === "done");

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-8 pb-32"> {/* Added padding for drop zone */}
                {/* Create Task Form / Dialog */}
                <div className="flex justify-end items-center">
                    <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                style={themeColor ? {
                                    backgroundColor: themeColor.labelStyle?.borderColor,
                                    color: themeColor.labelStyle?.color || 'white'
                                } : {}}
                            >
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
                                    setIsAddTaskOpen(false);
                                    setNewDifficulty([1]); // Reset slider
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
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <Label htmlFor="difficulty">Difficulty</Label>
                                                <span className="text-sm text-muted-foreground font-medium">{newDifficulty[0]} / 10</span>
                                            </div>
                                            <Slider
                                                id="difficulty-slider"
                                                min={1}
                                                max={10}
                                                step={1}
                                                value={newDifficulty}
                                                onValueChange={setNewDifficulty}
                                                className="py-4"
                                            />
                                            <input type="hidden" name="difficulty" value={newDifficulty[0]} />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Simple list view for now, could be Kanban later */}
                    {tasks.length === 0 && (
                        <p className="text-muted-foreground text-center col-span-full py-8">
                            No tasks yet.
                        </p>
                    )}

                    {tasks.map((task) => (
                        <DraggableTask
                            key={task.id}
                            task={task}
                            isCollected={collectedTaskIds.has(task.id)}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onEdit={(task) => {
                                setEditingTask(task);
                                setEditDifficulty([task.difficulty]);
                            }}
                            onFocus={(task) => setActiveTasksForFocus([task])}
                            getDifficultyColor={getDifficultyColor}
                            getStatusIcon={getStatusIcon}
                        />
                    ))}

                </div>

                <DragOverlay dropAnimation={isOverDropZone ? null : undefined}>
                    {activeId ? (
                        <div className="relative">
                            {/* Render stack effect for collected items */}
                            {Array.from(collectedTaskIds).filter(id => id !== activeId).map((id, index) => {
                                const task = tasks.find(t => t.id === id);
                                if (!task) return null;
                                return (
                                    <div
                                        key={id}
                                        className="absolute top-0 left-0 w-full h-full opacity-90"
                                        style={{
                                            transform: `rotate(${(index + 1) * 3}deg) translate(${(index + 1) * 4}px, ${(index + 1) * 4}px)`,
                                            zIndex: -index
                                        }}
                                    >
                                        <TaskCard
                                            task={task}
                                            isOverlay
                                            // Pass dummy handlers for visual only
                                            onStatusChange={() => { }}
                                            onDelete={() => { }}
                                            onEdit={() => { }}
                                            onFocus={() => { }}
                                            getDifficultyColor={getDifficultyColor}
                                            getStatusIcon={getStatusIcon}
                                        />
                                    </div>
                                );
                            })}

                            {/* Active Dragged Card */}
                            <div className="relative z-10 w-[300px]"> {/* Fixed width for overlay consistency */}
                                {tasks.find(t => t.id === activeId) && (
                                    <TaskCard
                                        task={tasks.find(t => t.id === activeId)!}
                                        isOverlay
                                        onStatusChange={() => { }}
                                        onDelete={() => { }}
                                        onEdit={() => { }}
                                        onFocus={() => { }}
                                        getDifficultyColor={getDifficultyColor}
                                        getStatusIcon={getStatusIcon}
                                    />
                                )}
                            </div>

                            {/* Count Badge if > 1 */}
                            {collectedTaskIds.size > 1 && (
                                <div className="absolute -top-3 -right-3 z-50 bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-background">
                                    {collectedTaskIds.size}
                                </div>
                            )}
                        </div>
                    ) : null}
                </DragOverlay>

                {/* Focus Timer Dialog */}
                <Dialog
                    open={activeTasksForFocus.length > 0}
                    onOpenChange={(open) => !open && setActiveTasksForFocus([])}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogTitle className="sr-only">Focus Session</DialogTitle>
                        {activeTasksForFocus.length > 0 && (
                            <FocusTimer
                                tasks={activeTasksForFocus}
                                onSessionSaved={() => setActiveTasksForFocus([])}
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
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <Label htmlFor="edit-difficulty">Difficulty</Label>
                                            <span className="text-sm text-muted-foreground font-medium">{editDifficulty[0]} / 10</span>
                                        </div>
                                        <Slider
                                            id="edit-difficulty-slider"
                                            min={1}
                                            max={10}
                                            step={1}
                                            value={editDifficulty}
                                            onValueChange={setEditDifficulty}
                                            className="py-4"
                                        />
                                        <input type="hidden" name="difficulty" value={editDifficulty[0]} />
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
            <FocusDropZone isDragging={!!activeId} themeColor={themeColor} />
        </DndContext>
    );
}
