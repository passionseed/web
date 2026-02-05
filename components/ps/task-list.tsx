"use client";

import { useState, useMemo, useOptimistic, startTransition } from "react";
import {
    PSTask,
    deleteTask,
    updateTask,
    updateTaskStatus,
    createTask,
    updateTaskDate,
    updateTaskPartial,
    PSProjectMember,
} from "@/actions/ps";
import { PSRequest } from "@/actions/ps-requests";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    Edit2,
    Trash2,
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
import { RequestDetailsDialog } from "./RequestDetailsDialog";
import { useToast } from "@/components/ui/use-toast";
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    isToday,
    startOfDay,
    isBefore,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
} from "date-fns";

interface TaskListProps {
    tasks: PSTask[];
    requests?: PSRequest[]; // Optional requests to display on calendar
    projectId?: string; // Optional if global view
    themeColor?: any;
    initialDate?: Date;
    isMember?: boolean;
    members?: PSProjectMember[];
    currentUserId?: string;
}

interface CommonTaskProps {
    onStatusChange: (taskId: string, status: string) => void;
    onDelete: (taskId: string) => void;
    onEdit: (task: PSTask) => void;
    onView: (task: PSTask) => void;
    onFocus: (task: PSTask) => void;
    onViewRequest?: (request: PSRequest) => void;
    getDifficultyColor: (diff: number) => string;
    getStatusIcon: (status: string) => React.ReactNode;
    members?: PSProjectMember[];
    currentUserId?: string;
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
    requests = [],
    isOver,
    onAddTask,
    onFocusDay,
    commonProps,
}: {
    date: Date;
    tasks: PSTask[];
    requests?: PSRequest[];
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
    const isFirstDayOfMonth = date.getDate() === 1;

    return (
        <div
            ref={setNodeRef}
            className={`
        flex flex-col gap-1 p-2 transition-all duration-300 min-h-[120px] bg-background
        ${isOver ? "bg-accent/50" : ""}
      `}
        >
            <div className="flex justify-between items-start px-1">
                <span className={`text-xs font-semibold ${isCurrentDay ? "bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full" : "text-muted-foreground"}`}>
                    {isFirstDayOfMonth ? format(date, "MMM d") : format(date, "d")}
                </span>
            </div>

            <div className="flex flex-col gap-1">
                {tasks.map((task) => {
                    const isOverdue = isPastDay && task.status !== "done";
                    return (
                        <div key={task.id} className="h-auto">
                            <DraggableTask
                                task={task}
                                isCollected={false}
                                isOverdue={isOverdue}
                                compact={true}
                                {...commonProps}
                            />
                        </div>
                    );
                })}
                {requests.map((request) => (
                    <div
                        key={request.id}
                        className="text-[10px] px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 cursor-pointer hover:bg-purple-500/30 transition-colors"
                        title={`Request: ${request.title} (${request.status})`}
                        onClick={(e) => {
                            e.stopPropagation();
                            commonProps.onViewRequest?.(request);
                        }}
                    >
                        <div className="font-medium truncate">{request.title}</div>
                        <div className="text-purple-400 text-[8px] truncate">
                            {request.status === "pending"
                                ? "⏳ Pending"
                                : request.status === "accepted"
                                    ? "✓ Accepted"
                                    : request.status === "in_progress"
                                        ? "▶ In Progress"
                                        : request.status === "completed"
                                            ? "✓ Done"
                                            : request.status}
                        </div>
                    </div>
                ))}
            </div>
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

export function TaskList({ tasks, requests = [], projectId, themeColor, initialDate, isMember = true, members = [], currentUserId }: TaskListProps) {
    const [currentMonth, setCurrentMonth] = useState(() =>
        startOfMonth(initialDate || new Date())
    );


    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        tasks,
        (state: PSTask[], action: { type: 'update'; taskId: string; date: string | null }) => {
            return state.map((task) => {
                if (task.id === action.taskId) {
                    return { ...task, due_date: action.date };
                }
                return task;
            });
        }
    );


    const [activeTasksForFocus, setActiveTasksForFocus] = useState<PSTask[]>([]);
    const [editingTask, setEditingTask] = useState<PSTask | null>(null);
    const [viewingTask, setViewingTask] = useState<PSTask | null>(null);
    const [viewingRequest, setViewingRequest] = useState<PSRequest | null>(null);

    // Create Task State
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [addTaskDate, setAddTaskDate] = useState<Date | null>(null); // null means unscheduled

    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const [newDifficulty, setNewDifficulty] = useState([1]);
    const [editDifficulty, setEditDifficulty] = useState([1]);
    const [assignee, setAssignee] = useState<string>(currentUserId || "");

    const { toast } = useToast();



    // Handlers
    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            // Use task's project_id if available (global view), fallback to prop
            await updateTaskStatus(taskId, newStatus, task.project_id || projectId!);
        } catch (e) {
            toast({ variant: "destructive", description: "Failed to update status." });
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm("Delete this task?")) return;
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            await deleteTask(taskId, task.project_id || projectId!);
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
            setAssignee(task.assigned_to || task.user_id || "");
        },
        onView: (task) => setViewingTask(task),
        onFocus: (task) => setActiveTasksForFocus([task]),
        onViewRequest: (request) => setViewingRequest(request),
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
        },
        members,
        currentUserId
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
            if (task.due_date !== null) {
                // Optimistic Update
                startTransition(() => {
                    addOptimisticTask({ type: 'update', taskId: task.id, date: null });
                });
                try {
                    await updateTaskDate(task.id, null, task.project_id || projectId!);
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
            if (task.due_date !== dateStr) {
                // Optimistic Update
                startTransition(() => {
                    addOptimisticTask({ type: 'update', taskId: task.id, date: dateStr });
                });
                try {
                    await updateTaskDate(task.id, dateStr, task.project_id || projectId!);
                    toast({ description: `Moved to ${dateStr}` });
                } catch (e) {
                    toast({ variant: "destructive", description: "Failed to move task" });
                }
            }
        }
    };

    // Render Logic
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({
            start: startDate,
            end: endDate
        });
    }, [currentMonth]);

    const { tasksByDate, unscheduledTasks } = useMemo(() => {
        const grouped = new Map<string, PSTask[]>();
        calendarDays.forEach(date => {
            grouped.set(format(date, "yyyy-MM-dd"), []);
        });

        const unscheduled: PSTask[] = [];

        // Use optimistic tasks for rendering
        optimisticTasks.forEach(task => {
            if (!task.due_date) {
                unscheduled.push(task);
            } else if (grouped.has(task.due_date)) {
                grouped.get(task.due_date)?.push(task);
            }
        });

        return { tasksByDate: grouped, unscheduledTasks: unscheduled };
    }, [optimisticTasks, calendarDays]);

    // Group requests by date_needed
    const requestsByDate = useMemo(() => {
        const grouped = new Map<string, PSRequest[]>();
        calendarDays.forEach(date => {
            grouped.set(format(date, "yyyy-MM-dd"), []);
        });

        requests.forEach(request => {
            if (request.date_needed) {
                // Convert ISO timestamp to yyyy-MM-dd format to match calendar dates
                const requestDate = format(new Date(request.date_needed), "yyyy-MM-dd");

                if (grouped.has(requestDate)) {
                    grouped.get(requestDate)?.push(request);
                }
            }
        });

        return grouped;
    }, [requests, calendarDays]);

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
            <div className="flex flex-col gap-2 pb-4">
                {/* Navigation */}
                <div className="flex items-center justify-between px-4">
                    <Button variant="ghost" onClick={() => setCurrentMonth(d => subMonths(d, 1))}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous Month
                    </Button>
                    <span className="font-semibold text-lg capitalize">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <Button variant="ghost" onClick={() => setCurrentMonth(d => addMonths(d, 1))}>
                        Next Month <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* Unscheduled Pool */}
                <UnscheduledArea
                    tasks={unscheduledTasks}
                    isOver={overId === "unscheduled-pool"}
                    onAddTask={() => {
                        if (!isMember) return;
                        setAddTaskDate(null);
                        setAssignee(currentUserId || "");
                        setIsAddTaskOpen(true);
                    }}
                    commonProps={commonTaskProps}
                />

                {/* Weekday Header and Calendar Grid Container */}
                <div>
                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 gap-px border bg-border mb-px sticky top-0 z-10">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                            <div key={day} className="bg-background p-2 text-sm font-medium text-muted-foreground text-center">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Board Grid - Notion-style expanding grid */}
                    <div className="grid grid-cols-7 gap-px bg-border border">
                        {calendarDays.map((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const dayTasks = tasksByDate.get(dateStr) || [];
                            const dayRequests = requestsByDate.get(dateStr) || [];

                            return (
                                <DayColumn
                                    key={dateStr}
                                    date={date}
                                    tasks={dayTasks}
                                    requests={dayRequests}
                                    isOver={overId === `day-${dateStr}`}
                                    onAddTask={(d) => {
                                        if (!isMember) return;
                                        setAddTaskDate(d);
                                        setAssignee(currentUserId || "");
                                        setIsAddTaskOpen(true);
                                    }}
                                    onFocusDay={(tasks) => setActiveTasksForFocus(tasks)}
                                    commonProps={commonTaskProps}
                                />
                            );
                        })}
                    </div>
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
                                if (projectId) formData.append("projectId", projectId);

                                // Use dueDate from the form input if provided, otherwise use addTaskDate (from calendar click)
                                const dueDate = formData.get("dueDate") as string;
                                if (dueDate) {
                                    formData.append("scheduledDate", dueDate);
                                } else if (addTaskDate) {
                                    formData.append("scheduledDate", format(addTaskDate, "yyyy-MM-dd"));
                                }

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
                                    <Label>Assign To</Label>
                                    <Select name="assignedTo" defaultValue={currentUserId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members.map((m) => (
                                                <SelectItem key={m.user_id} value={m.user_id}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={m.user?.avatar_url || ""} />
                                                            <AvatarFallback>{m.user?.username?.[0] || "?"}</AvatarFallback>
                                                        </Avatar>
                                                        {m.user?.full_name || m.user?.username || "Unknown"}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                                    <Input
                                        id="dueDate"
                                        name="dueDate"
                                        type="date"
                                        defaultValue={addTaskDate ? format(addTaskDate, "yyyy-MM-dd") : ""}
                                    />
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
                                formData.append("projectId", editingTask.project_id || projectId!);
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
                                        <Label>Assign To</Label>
                                        <Select name="assignedTo" defaultValue={editingTask.assigned_to || editingTask.user_id || ""}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members.map((m) => (
                                                    <SelectItem key={m.user_id} value={m.user_id}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarImage src={m.user?.avatar_url || ""} />
                                                                <AvatarFallback>{m.user?.username?.[0] || "?"}</AvatarFallback>
                                                            </Avatar>
                                                            {m.user?.full_name || m.user?.username || "Unknown"}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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

                {/* View/Info Dialog */}
                <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="sr-only">Task Details</DialogTitle>
                        </DialogHeader>
                        {viewingTask && (
                            <div className="flex flex-col gap-6">
                                {/* Header - Goal (Editable) */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-4">
                                        <Textarea
                                            className="text-2xl font-bold leading-tight min-h-[60px] resize-none border-transparent hover:border-input focus:border-ring p-2 -ml-2 rounded-md bg-transparent"
                                            defaultValue={viewingTask.goal}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim();
                                                if (val && val !== viewingTask.goal) {
                                                    updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { goal: val });
                                                    setViewingTask({ ...viewingTask, goal: val });
                                                }
                                            }}
                                            placeholder="Task goal..."
                                        />

                                        {/* Properties Grid */}
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            {/* Status */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-20">Status</span>
                                                <Select
                                                    defaultValue={viewingTask.status}
                                                    onValueChange={(val: any) => {
                                                        updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { status: val });
                                                        setViewingTask({ ...viewingTask, status: val });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] border-transparent hover:border-input bg-muted/50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="todo">To Do</SelectItem>
                                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                                        <SelectItem value="done">Done</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Difficulty */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-20">Difficulty</span>
                                                <div className="flex items-center gap-2 w-[130px] px-3 py-1 bg-muted/50 rounded-md hover:bg-muted transition-colors">
                                                    <span className="font-medium">{viewingTask.difficulty}/10</span>
                                                    <Slider
                                                        className="flex-1 w-20"
                                                        defaultValue={[viewingTask.difficulty]}
                                                        max={10} min={1} step={1}
                                                        onValueCommit={(vals) => {
                                                            const val = vals[0];
                                                            updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { difficulty: val });
                                                            setViewingTask({ ...viewingTask, difficulty: val });
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Assignee */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-20">Assign To</span>
                                                <Select
                                                    defaultValue={viewingTask.assigned_to || viewingTask.user_id || "unassigned"}
                                                    onValueChange={(val) => {
                                                        const newVal = val === "unassigned" ? null : val;
                                                        updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { assigned_to: newVal });
                                                        setViewingTask({ ...viewingTask, assigned_to: newVal });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-[130px] border-transparent hover:border-input bg-muted/50">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned" className="text-muted-foreground">Unassigned</SelectItem>
                                                        {members.map((m) => (
                                                            <SelectItem key={m.user_id} value={m.user_id}>
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-5 w-5">
                                                                        <AvatarImage src={m.user?.avatar_url || ""} />
                                                                        <AvatarFallback>{m.user?.username?.[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="truncate max-w-[80px]">{m.user?.username}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Date */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-20">Dates</span>
                                                <div className="flex items-center">
                                                    <Input
                                                        type="date"
                                                        className="h-8 w-auto min-w-[130px] border-transparent hover:border-input bg-muted/50 dark:[color-scheme:dark]"
                                                        defaultValue={viewingTask.due_date || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value || null;
                                                            updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { due_date: val });
                                                            setViewingTask({ ...viewingTask, due_date: val });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                </div>

                                {/* Content - Notes */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Edit2 className="w-4 h-4" />
                                        <h3 className="font-semibold text-sm uppercase tracking-wide">Notes</h3>
                                    </div>
                                    <Textarea
                                        className="min-h-[200px] resize-none border-transparent hover:border-input focus:border-ring p-4 rounded-lg bg-muted/30 leading-relaxed"
                                        defaultValue={viewingTask.notes || ""}
                                        placeholder="Add more details, notes, or context..."
                                        onBlur={(e) => {
                                            const val = e.target.value;
                                            if (val !== viewingTask.notes) {
                                                updateTaskPartial(viewingTask.id, viewingTask.project_id || projectId!, { notes: val });
                                                setViewingTask({ ...viewingTask, notes: val });
                                            }
                                        }}
                                    />

                                    <div className="flex justify-end pt-4 border-t gap-2">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={async () => {
                                                if (!confirm("Are you sure you want to delete this task?")) return;
                                                setViewingTask(null);
                                                await handleDelete(viewingTask.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                        {viewingTask.status !== 'done' && (
                                            <Button size="sm" onClick={() => {
                                                const taskToFocus = viewingTask;
                                                setViewingTask(null);
                                                if (taskToFocus) setActiveTasksForFocus([taskToFocus]);
                                            }}>
                                                <Play className="w-4 h-4 mr-2" />
                                                Start Focus
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Focus Timer */}
                <Dialog open={activeTasksForFocus.length > 0} onOpenChange={(o) => {
                    // Only allow closing via the specific close handlers inside the component which will call setActiveTasksForFocus([])
                    // But onOpenChange is called by generic escape key etc.
                    // We can check if it's strictly necessary.
                    // Actually, if we use onInteractOutside preventDefault, user can't click outside.
                    // We should still allow them to close it if they really want to, maybe via a button inside.
                    if (!o) setActiveTasksForFocus([]);
                }}>
                    <DialogContent onInteractOutside={(e) => e.preventDefault()}>
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

                {/* Request Details Dialog */}
                {viewingRequest && (
                    <RequestDetailsDialog
                        request={viewingRequest}
                        open={!!viewingRequest}
                        onOpenChange={(open) => !open && setViewingRequest(null)}
                        projectId={projectId || ""}
                    />
                )}
            </div >
        </DndContext >
    );
}
