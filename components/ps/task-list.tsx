"use client";

import { useState, useMemo, useOptimistic, startTransition } from "react";
import {
    PSTask,
    deleteTask,
    updateTask,
    updateTaskStatus,
    createTask,
    updateTaskDate,
} from "@/actions/ps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Circle,
    Clock,
    Plus,
    Play,
    Calendar as CalendarIcon,
} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    DragOverlay,
    useDroppable,
    pointerWithin,
} from "@dnd-kit/core";
import { DraggableTask, TaskCard } from "./draggable-task";
import { FocusTimer } from "./focus-timer";
import { useToast } from "@/components/ui/use-toast";
import {
    format,
    startOfWeek,
    addDays,
    isToday,
    startOfDay,
    isBefore,
} from "date-fns";

interface TaskListProps {
    tasks: PSTask[];
    projectId: string;
    themeColor?: any;
    initialDate?: Date;
}

interface CommonTaskProps {
    onStatusChange: (taskId: string, status: string) => void;
    onDelete: (taskId: string) => void;
    onEdit: (task: PSTask) => void;
    onFocus: (task: PSTask) => void;
    getDifficultyColor: (diff: number) => string;
    getStatusIcon: (status: string) => React.ReactNode;
}

const getDayStyles = (date: Date) => {
    const day = date.getDay();
    // Returns { bg: "background class", border: "border class" }
    const styles = [
        { bg: "bg-red-50/80 dark:bg-red-950/30", border: "border-red-200/60" },    // Sun
        { bg: "bg-orange-50/80 dark:bg-orange-950/30", border: "border-orange-200/60" }, // Mon
        { bg: "bg-yellow-50/80 dark:bg-yellow-950/30", border: "border-yellow-200/60" }, // Tue
        { bg: "bg-green-50/80 dark:bg-green-950/30", border: "border-green-200/60" },  // Wed
        { bg: "bg-blue-50/80 dark:bg-blue-950/30", border: "border-blue-200/60" },    // Thu
        { bg: "bg-indigo-50/80 dark:bg-indigo-950/30", border: "border-indigo-200/60" }, // Fri
        { bg: "bg-purple-50/80 dark:bg-purple-950/30", border: "border-purple-200/60" }, // Sat
    ];
    return styles[day];
};

function DayColumn({
    date,
    tasks,
    isOver,
    onAddTask,
    onFocusDay,
    commonProps,
}: {
    date: Date;
    tasks: PSTask[];
    isOver: boolean;
    onAddTask: (date: Date) => void;
    onFocusDay: (tasks: PSTask[]) => void;
    commonProps: CommonTaskProps;
}) {
    const { setNodeRef } = useDroppable({
        id: `day-${format(date, "yyyy-MM-dd")}`,
    });

    const isCurrentDay = isToday(date);
    const isPastDay = isBefore(date, startOfDay(new Date()));
    const dayStyle = getDayStyles(date);

    return (
        <div
            ref={setNodeRef}
            className={`
        flex flex-col gap-2 rounded-xl p-2 transition-all duration-300 h-full border
        ${isCurrentDay
                    ? `${dayStyle.bg} ${dayStyle.border} ring-2 ring-primary/20 shadow-lg`
                    : "bg-muted/5 border-border/40"}
        ${isOver ? "ring-2 ring-primary/60 bg-primary/5" : ""}
      `}
        >
            <div className={`
                flex flex-col gap-1 pb-2 border-b border-black/5 dark:border-white/5
                ${!isCurrentDay ? `${dayStyle.bg} -mx-2 -mt-2 p-3 rounded-t-xl` : ""}
            `}>
                <div className="flex items-center justify-between">
                    <span className={`font-bold truncate ${isCurrentDay ? "text-foreground text-base" : "text-foreground/80 text-sm"}`}>
                        {format(date, "EEEE")}
                    </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                    {format(date, "d MMM")}
                </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-[150px] overflow-y-auto py-2">
                {tasks.map((task) => {
                    const isOverdue = isPastDay && task.status !== "done";
                    return (
                        <div key={task.id} className="h-auto">
                            <DraggableTask
                                task={task}
                                isCollected={false}
                                isOverdue={isOverdue}
                                {...commonProps}
                            />
                        </div>
                    );
                })}
            </div>

            {isCurrentDay && (
                <div className="pt-2 mt-auto border-t border-border/50">
                    <Button
                        size="sm"
                        variant="default"
                        className="w-full gap-2 shadow-sm"
                        onClick={() => onFocusDay(tasks.filter(t => t.status !== 'done'))}
                        disabled={tasks.filter(t => t.status !== 'done').length === 0}
                    >
                        <Play className="w-3 h-3" /> Start Focus
                    </Button>
                </div>
            )}
        </div>
    );
}

function UnscheduledArea({
    tasks,
    isOver,
    onAddTask,
    commonProps,
}: {
    tasks: PSTask[];
    isOver: boolean;
    onAddTask: () => void;
    commonProps: CommonTaskProps;
}) {
    const { setNodeRef } = useDroppable({
        id: "unscheduled-pool",
    });

    return (
        <div
            ref={setNodeRef}
            className={`
        flex gap-4 p-4 rounded-xl border border-dashed border-border/60 transition-colors
        ${isOver ? "bg-primary/5 border-primary" : "bg-muted/5"}
      `}
        >
            <div className="flex flex-col justify-center items-center min-w-[150px] border-r border-border/30 pr-4 gap-2">
                <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" /> Unscheduled
                </div>
                <Button onClick={onAddTask} size="sm" variant="outline" className="w-full gap-2">
                    <Plus className="w-4 h-4" /> New Task
                </Button>
            </div>

            <div className="flex flex-wrap gap-3 flex-1">
                {tasks.length === 0 && (
                    <div className="flex items-center justify-center w-full text-muted-foreground text-sm italic">
                        No unscheduled tasks. Create one or drag here to unschedule.
                    </div>
                )}
                {tasks.map((task) => (
                    <div key={task.id} className="w-[280px]">
                        <DraggableTask
                            task={task}
                            isCollected={false}
                            {...commonProps}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TaskList({ tasks, projectId, themeColor, initialDate }: TaskListProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(initialDate || new Date(), { weekStartsOn: 1 })
    );


    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        tasks,
        (state: PSTask[], action: { type: 'update'; taskId: string; date: string | null }) => {
            return state.map((task) => {
                if (task.id === action.taskId) {
                    return { ...task, scheduled_date: action.date };
                }
                return task;
            });
        }
    );

    const [activeTasksForFocus, setActiveTasksForFocus] = useState<PSTask[]>([]);
    const [editingTask, setEditingTask] = useState<PSTask | null>(null);

    // Create Task State
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [addTaskDate, setAddTaskDate] = useState<Date | null>(null); // null means unscheduled

    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const [newDifficulty, setNewDifficulty] = useState([1]);
    const [editDifficulty, setEditDifficulty] = useState([1]);

    const { toast } = useToast();



    // Handlers
    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await updateTaskStatus(taskId, newStatus, projectId);
        } catch (e) {
            toast({ variant: "destructive", description: "Failed to update status." });
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm("Delete this task?")) return;
        try {
            await deleteTask(taskId, projectId);
            toast({ title: "Deleted" });
        } catch (e) {
            toast({ variant: "destructive", description: "Failed to delete task." });
        }
    };

    const commonTaskProps: CommonTaskProps = {
        onStatusChange: handleStatusChange,
        onDelete: handleDelete,
        onEdit: (task) => {
            setEditingTask(task);
            setEditDifficulty([task.difficulty]);
        },
        onFocus: (task) => setActiveTasksForFocus([task]),
        getDifficultyColor: (diff: number) => {
            if (diff >= 8) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
            if (diff >= 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
        },
        getStatusIcon: (status: string) => {
            switch (status) {
                case "done": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
                case "in_progress": return <Clock className="h-5 w-5 text-blue-500" />;
                default: return <Circle className="h-5 w-5 text-gray-400" />;
            }
        }
    };

    // Drag Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        setOverId(event.over?.id ? String(event.over.id) : null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setOverId(null);

        if (!over) return;

        const task = tasks.find((t) => t.id === active.id);
        if (!task) return;

        // Drop on Unscheduled Pool
        if (over.id === "unscheduled-pool") {
            if (task.scheduled_date !== null) {
                // Optimistic Update
                startTransition(() => {
                    addOptimisticTask({ type: 'update', taskId: task.id, date: null });
                });
                try {
                    await updateTaskDate(task.id, null, projectId);
                    toast({ description: "Moved to Unscheduled" });
                } catch (e) {
                    toast({ variant: "destructive", description: "Failed to unschedule" });
                }
            }
            return;
        }

        // Drop on Day
        if (over.id.toString().startsWith("day-")) {
            const dateStr = over.id.toString().replace("day-", "");
            if (task.scheduled_date !== dateStr) {
                // Optimistic Update
                startTransition(() => {
                    addOptimisticTask({ type: 'update', taskId: task.id, date: dateStr });
                });
                try {
                    await updateTaskDate(task.id, dateStr, projectId);
                    toast({ description: `Moved to ${dateStr}` });
                } catch (e) {
                    toast({ variant: "destructive", description: "Failed to move task" });
                }
            }
        }
    };

    // Render Logic
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const { tasksByDate, unscheduledTasks } = useMemo(() => {
        const grouped = new Map<string, PSTask[]>();
        weekDays.forEach(date => {
            grouped.set(format(date, "yyyy-MM-dd"), []);
        });

        const unscheduled: PSTask[] = [];

        // Use optimistic tasks for rendering
        optimisticTasks.forEach(task => {
            if (!task.scheduled_date) {
                unscheduled.push(task);
            } else if (grouped.has(task.scheduled_date)) {
                grouped.get(task.scheduled_date)?.push(task);
            }
        });

        return { tasksByDate: grouped, unscheduledTasks: unscheduled };
    }, [optimisticTasks, weekDays]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );



    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-4 pb-24 h-[calc(100vh-100px)]">
                {/* Navigation */}
                <div className="flex items-center justify-between px-4">
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(d => addDays(d, -7))}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous Week
                    </Button>
                    <span className="font-semibold text-lg">
                        {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
                    </span>
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(d => addDays(d, 7))}>
                        Next Week <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* Unscheduled Pool */}
                <UnscheduledArea
                    tasks={unscheduledTasks}
                    isOver={overId === "unscheduled-pool"}
                    onAddTask={() => {
                        setAddTaskDate(null);
                        setIsAddTaskOpen(true);
                    }}
                    commonProps={commonTaskProps}
                />

                {/* Board Grid - Full Width, No Scroll */}
                <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
                    {weekDays.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const dayTasks = tasksByDate.get(dateStr) || [];

                        return (
                            <DayColumn
                                key={dateStr}
                                date={date}
                                tasks={dayTasks}
                                isOver={overId === `day-${dateStr}`}
                                onAddTask={(d) => {
                                    setAddTaskDate(d);
                                    setIsAddTaskOpen(true);
                                }}
                                onFocusDay={setActiveTasksForFocus}
                                commonProps={commonTaskProps}
                            />
                        );
                    })}
                </div>



                {/* Create Task Dialog */}
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {addTaskDate ? `Add Task for ${format(addTaskDate, "eeee, MMM d")}` : "Add Unscheduled Task"}
                            </DialogTitle>
                        </DialogHeader>
                        <form
                            action={async (formData) => {
                                formData.append("projectId", projectId);
                                if (addTaskDate) {
                                    formData.append("scheduledDate", format(addTaskDate, "yyyy-MM-dd"));
                                }
                                // If no date, server handles as unscheduled
                                await createTask(formData);
                                toast({ title: "Created", description: "Task created." });
                                setIsAddTaskOpen(false);
                                setNewDifficulty([1]);
                            }}
                        >
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="goal">Goal</Label>
                                    <Input id="goal" name="goal" required autoFocus />
                                </div>
                                <div className="space-y-4">
                                    <Label>Difficulty: {newDifficulty[0]}/10</Label>
                                    <Slider
                                        value={newDifficulty}
                                        onValueChange={setNewDifficulty}
                                        min={1} max={10} step={1}
                                    />
                                    <input type="hidden" name="difficulty" value={newDifficulty[0]} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea name="notes" placeholder="Details..." />
                                </div>
                                <Button type="submit" className="w-full">Add Task</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
                        {editingTask && (
                            <form action={async (formData) => {
                                formData.append("taskId", editingTask.id);
                                formData.append("projectId", projectId);
                                await updateTask(formData);
                                setEditingTask(null);
                                toast({ title: "Updated" });
                            }}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Goal</Label>
                                        <Input name="goal" defaultValue={editingTask.goal} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Difficulty: {editDifficulty[0]}/10</Label>
                                        <Slider value={editDifficulty} onValueChange={setEditDifficulty} min={1} max={10} step={1} />
                                        <input type="hidden" name="difficulty" value={editDifficulty[0]} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notes</Label>
                                        <Textarea name="notes" defaultValue={editingTask.notes || ""} />
                                    </div>
                                    <Button type="submit" className="w-full">Save Changes</Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Focus Timer */}
                <Dialog open={activeTasksForFocus.length > 0} onOpenChange={(o) => !o && setActiveTasksForFocus([])}>
                    <DialogContent>
                        <DialogTitle className="sr-only">Focus Session</DialogTitle>
                        <FocusTimer tasks={activeTasksForFocus} onSessionSaved={() => setActiveTasksForFocus([])} />
                    </DialogContent>
                </Dialog>

                <DragOverlay dropAnimation={null} style={{ zIndex: 1000 }}>
                    {activeId ? (
                        <div className="w-[220px]">
                            {tasks.find(t => t.id === activeId) && (
                                <TaskCard
                                    task={tasks.find(t => t.id === activeId)!}
                                    isOverlay
                                    {...commonTaskProps}
                                />
                            )}
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}
