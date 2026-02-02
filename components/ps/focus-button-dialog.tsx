"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FocusTimer } from "./focus-timer";
import { PSTask } from "@/actions/ps";
import { Play, CheckSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface FocusButtonDialogProps {
    tasks: PSTask[];
    children?: React.ReactNode;
}

export function FocusButtonDialog({ tasks = [], children }: FocusButtonDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<"select" | "timer">("select");
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedTaskIds, setDraggedTaskIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const hoverTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const filteredTasks = tasks.filter(t =>
        t.status !== 'done' &&
        (t.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));

    const handleStart = () => {
        if (selectedTaskIds.size > 0) {
            setStep("timer");
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setTimeout(() => {
                setStep("select");
                setSelectedTaskIds(new Set());
                setDraggedTaskIds(new Set());
            }, 300);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setIsDragging(true);
        setDraggedTaskIds(new Set([taskId]));
        setCursorPos({ x: e.clientX, y: e.clientY });

        // Calculate the offset from cursor to the top-left of the element
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        // Hide the default browser drag ghost by using an invisible element
        if (typeof document !== 'undefined') {
            const dragGhost = document.getElementById('drag-ghost');
            if (dragGhost) {
                e.dataTransfer.setDragImage(dragGhost, 0, 0);
            }
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        if (e.clientX === 0 && e.clientY === 0) return;
        setCursorPos({ x: e.clientX, y: e.clientY });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedTaskIds(new Set());
        // Clear all pending hover timeouts
        hoverTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        hoverTimeoutsRef.current.clear();
    };

    const handleDragEnter = (taskId: string) => {
        // Don't create a new timeout if one already exists for this task
        if (!hoverTimeoutsRef.current.has(taskId)) {
            // Set a new timeout to collect the task after 0.6 seconds
            const timeout = setTimeout(() => {
                setDraggedTaskIds(prev => {
                    // Check if task should be collected
                    if (!prev.has(taskId)) {
                        return new Set([...prev, taskId]);
                    }
                    return prev;
                });
                hoverTimeoutsRef.current.delete(taskId);
            }, 600);

            hoverTimeoutsRef.current.set(taskId, timeout);
        }
    };

    const handleDragLeave = (e: React.DragEvent, taskId: string) => {
        // Only clear timeout if we're actually leaving the element (not going to a child)
        const rect = e.currentTarget.getBoundingClientRect();
        const isLeavingElement =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;

        if (isLeavingElement) {
            const timeout = hoverTimeoutsRef.current.get(taskId);
            if (timeout) {
                clearTimeout(timeout);
                hoverTimeoutsRef.current.delete(taskId);
            }
        }
    };
    return (
        <>
            {/* Hidden element for drag ghost */}
            <div id="drag-ghost" className="fixed opacity-0 pointer-events-none w-1 h-1" aria-hidden="true" />

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {children || (
                        <Button className="gap-2">
                            <Play className="w-4 h-4" /> Start Focus
                        </Button>
                    )}
                </DialogTrigger>
            <DialogContent className={`max-w-2xl ${step === 'timer' ? 'max-h-[85vh]' : ''} flex flex-col p-6`}>
                {step === "select" ? (
                    <div className="flex flex-col h-full">
                        <div className="mb-4">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <CheckSquare className="w-5 h-5" /> Select Tasks to Focus On
                            </DialogTitle>
                        </div>

                        <div className="overflow-y-auto mb-3 p-2" style={{ maxHeight: '320px' }}>
                            {filteredTasks.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No active tasks found.
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {filteredTasks.map(task => {
                                        const isSelected = selectedTaskIds.has(task.id);
                                        const isBeingDragged = draggedTaskIds.has(task.id);

                                        // Check if task is overdue
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

                                        // Format date as DD MMM (e.g., "06 Jan")
                                        const formatDate = (dateStr: string) => {
                                            const date = new Date(dateStr);
                                            const day = date.getDate().toString().padStart(2, '0');
                                            const month = date.toLocaleDateString('en-US', { month: 'short' });
                                            return `${day} ${month}`;
                                        };

                                        return (
                                            <div
                                                key={task.id}
                                                draggable={!isSelected}
                                                onDragStart={(e) => {
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    handleDragStart(e, task.id);
                                                }}
                                                onDrag={handleDrag}
                                                onDragEnd={handleDragEnd}
                                                onDragEnter={() => handleDragEnter(task.id)}
                                                onDragLeave={(e) => handleDragLeave(e, task.id)}
                                                className={`
                                                    relative p-3 rounded-lg border-2 cursor-move transition-all duration-200
                                                    ${isSelected || isBeingDragged
                                                        ? 'opacity-50 cursor-not-allowed border-dashed border-muted scale-95'
                                                        : 'bg-card border-border hover:border-primary/50 hover:shadow-sm hover:scale-105 active:scale-95'
                                                    }
                                                `}
                                            >
                                                {/* Difficulty Badge */}
                                                <div className="absolute top-2 right-2">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                                        {task.difficulty}
                                                    </Badge>
                                                </div>

                                                {/* Content */}
                                                <div className="pt-2 pb-1">
                                                    <h4 className="font-semibold text-sm leading-tight mb-2 pr-1 line-clamp-2">{task.goal}</h4>

                                                    {/* Due date and status */}
                                                    {task.due_date && (
                                                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${isOverdue
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                            {isOverdue ? 'Overdue' : 'Due'}: {formatDate(task.due_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>


                        {/* Drop Zone - Hands */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                // Add all collected tasks from the drag operation
                                if (draggedTaskIds.size > 0) {
                                    setSelectedTaskIds(prev => {
                                        const newSelected = new Set([...prev, ...draggedTaskIds]);
                                        // Auto-start session after a brief delay
                                        setTimeout(() => {
                                            if (newSelected.size > 0) {
                                                setStep("timer");
                                            }
                                        }, 300);
                                        return newSelected;
                                    });
                                }
                                handleDragEnd();
                            }}
                            className="border-2 border-dashed border-primary/50 rounded-lg p-4 bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-4xl">🙌</div>
                                <p className="text-sm font-medium text-center">
                                    Drop tasks here to focus on them
                                </p>
                                {selectedTaskIds.size > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2 w-full">
                                        {Array.from(selectedTaskIds).map(taskId => {
                                            const task = tasks.find(t => t.id === taskId);
                                            if (!task) return null;
                                            return (
                                                <div
                                                    key={taskId}
                                                    className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                                                >
                                                    {task.goal}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTaskIds(prev => {
                                                                const next = new Set(prev);
                                                                next.delete(taskId);
                                                                return next;
                                                            });
                                                        }}
                                                        className="hover:text-primary-foreground"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Custom Drag Preview - Rendered via Portal */}
                        {isDragging && draggedTaskIds.size > 0 && cursorPos.x !== 0 && typeof document !== 'undefined' &&
                            createPortal(
                                <div
                                    className="fixed pointer-events-none z-[9999]"
                                    style={{
                                        left: cursorPos.x - dragOffset.x,
                                        top: cursorPos.y - dragOffset.y,
                                        willChange: 'transform',
                                    }}
                                >
                                    {Array.from(draggedTaskIds).map((taskId, index) => {
                                        const task = tasks.find(t => t.id === taskId);
                                        if (!task) return null;

                                        // Check if task is overdue
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date();

                                        // Format date as DD MMM (e.g., "06 Jan")
                                        const formatDate = (dateStr: string) => {
                                            const date = new Date(dateStr);
                                            const day = date.getDate().toString().padStart(2, '0');
                                            const month = date.toLocaleDateString('en-US', { month: 'short' });
                                            return `${day} ${month}`;
                                        };

                                        return (
                                            <div
                                                key={taskId}
                                                className="absolute bg-card border-2 border-border shadow-xl rounded-lg p-3 w-[200px]"
                                                style={{
                                                    left: index * 4,
                                                    top: index * 4,
                                                    zIndex: 9999 - index,
                                                    transform: `rotate(${index * 2}deg)`,
                                                }}
                                            >
                                                {/* Difficulty Badge */}
                                                <div className="absolute top-2 right-2">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                                        {task.difficulty}
                                                    </Badge>
                                                </div>

                                                {/* Content */}
                                                <div className="pt-2 pb-1">
                                                    <h4 className="font-semibold text-sm leading-tight mb-2 pr-1 line-clamp-2">{task.goal}</h4>

                                                    {/* Due date and status */}
                                                    {task.due_date && (
                                                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${isOverdue
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                            {isOverdue ? 'Overdue' : 'Due'}: {formatDate(task.due_date)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Show count badge for multiple tasks */}
                                                {index === 0 && draggedTaskIds.size > 1 && (
                                                    <div className="absolute -top-2 -right-2">
                                                        <Badge className="text-[10px] px-2 py-1 bg-primary text-primary-foreground">
                                                            +{draggedTaskIds.size - 1}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>,
                                document.body
                            )
                        }
                    </div>
                ) : (
                    <div className="h-full">
                        <DialogTitle className="sr-only">Focus Timer</DialogTitle>
                        {/* Header to go back? Optional. FocusTimer usually takes over. */}
                        <FocusTimer
                            tasks={selectedTasks}
                            onSessionSaved={() => {
                                setIsOpen(false);
                                setStep("select");
                                setSelectedTaskIds(new Set());
                            }}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}
