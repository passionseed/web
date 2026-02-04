"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { deleteProject } from "@/actions/ps";
import { toast } from "sonner";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteProjectDialogProps {
    projectId: string;
    projectName: string;
    projectType?: "project" | "hackathon";
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

export function DeleteProjectDialog({
    projectId,
    projectName,
    projectType = "project",
    open: controlledOpen,
    onOpenChange,
    hideTrigger = false
}: DeleteProjectDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmName, setConfirmName] = useState("");
    const router = useRouter();

    // Use controlled open if provided, otherwise use internal state
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
    const setOpen = onOpenChange || setUncontrolledOpen;

    const isConfirmValid = confirmName === projectName;

    const handleDelete = async () => {
        if (!isConfirmValid) {
            toast.error("Please type the project name correctly to confirm");
            return;
        }

        setLoading(true);
        try {
            await deleteProject(projectId);
            toast.success(`${projectType === "hackathon" ? "Department" : "Project"} deleted successfully`);
            setOpen(false);
            // Redirect to list page
            router.push(projectType === "hackathon" ? "/ps/hackathon" : "/ps/projects");
            router.refresh();
        } catch (error) {
            toast.error("Failed to delete. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!hideTrigger && (
                <DialogTrigger asChild>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete {projectType === "hackathon" ? "Department" : "Project"}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete {projectType === "hackathon" ? "Department" : "Project"}
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="pt-2 space-y-2">
                            <div>
                                This action <strong>cannot be undone</strong>. This will permanently delete the {projectType === "hackathon" ? "department" : "project"} and all associated data:
                            </div>
                            <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                                <li>All tasks and their progress</li>
                                <li>Focus session history</li>
                                <li>Feedback forms and submissions</li>
                                <li>Team member associations</li>
                            </ul>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirm-name">
                            Type <strong className="font-mono text-foreground">{projectName}</strong> to confirm
                        </Label>
                        <Input
                            id="confirm-name"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={`Type "${projectName}"`}
                            className="font-mono"
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setOpen(false);
                            setConfirmName("");
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading || !isConfirmValid}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Permanently
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
