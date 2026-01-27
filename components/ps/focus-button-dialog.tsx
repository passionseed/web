"use client";

import { useState } from "react";
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
            setTimeout(() => setStep("select"), 300);
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="gap-2">
                        <Play className="w-4 h-4" /> Start Focus
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className={`max-w-2xl ${step === 'timer' ? 'max-h-[85vh]' : 'h-[600px]'} flex flex-col p-6`}>
                {step === "select" ? (
                    <div className="flex flex-col h-full space-y-4">
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <CheckSquare className="w-5 h-5" /> Select Tasks to Focus On
                            </DialogTitle>
                            <p className="text-muted-foreground text-sm">
                                Choose the tasks you want to work on during this session.
                            </p>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 border rounded-md p-2">
                            {filteredTasks.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No active tasks found.
                                </p>
                            ) : (
                                filteredTasks.map(task => {
                                    const isSelected = selectedTaskIds.has(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                                                ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent bg-card'}
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded border flex items-center justify-center transition-colors
                                                ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}
                                            `}>
                                                {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate leading-snug">{task.goal}</p>
                                                {task.due_date && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Due: {task.due_date}
                                                    </span>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">
                                                {task.difficulty}
                                            </Badge>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="pt-2 flex justify-between items-center border-t">
                            <span className="text-sm font-medium">
                                {selectedTaskIds.size} selected
                            </span>
                            <Button onClick={handleStart} disabled={selectedTaskIds.size === 0}>
                                Start Session <Play className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
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
    );
}
