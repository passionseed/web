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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createRequest } from "@/actions/ps-requests";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateRequestDialogProps {
    currentProject: {
        id: string;
        name: string;
        type: string;
    };
    availableProjects: {
        id: string;
        name: string;
        type: string;
    }[];
}

export function CreateRequestDialog({
    currentProject,
    availableProjects,
}: CreateRequestDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        try {
            await createRequest(formData);
            toast.success("Request created successfully");
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast.error("Failed to create request");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Request</DialogTitle>
                    <DialogDescription>
                        Request help or resources from another department.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onFormSubmit} className="space-y-6">
                    {/* Hidden field for requesting project */}
                    <input
                        type="hidden"
                        name="requesting_project_id"
                        value={currentProject.id}
                    />

                    <div className="grid gap-4">
                        {/* Title */}
                        <div className="grid items-center gap-2">
                            <Label htmlFor="title">
                                Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Brief summary of the request"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div className="grid items-center gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Detailed description of what you need..."
                                rows={4}
                                disabled={loading}
                            />
                        </div>

                        {/* To Department */}
                        <div className="grid items-center gap-2">
                            <Label htmlFor="receiving_project_id">
                                To Department <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                name="receiving_project_id"
                                required
                                disabled={loading}
                            >
                                <SelectTrigger id="receiving_project_id">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProjects
                                        .filter((p) => p.id !== currentProject.id && p.type === "hackathon")
                                        .map((project) => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority & Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid items-center gap-2">
                                <Label htmlFor="priority">
                                    Priority <span className="text-destructive">*</span>
                                </Label>
                                <Select name="priority" required disabled={loading}>
                                    <SelectTrigger id="priority">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                        <SelectItem value="normal">🔵 Normal</SelectItem>
                                        <SelectItem value="low">⚪ Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid items-center gap-2">
                                <Label htmlFor="date_needed">
                                    Date Needed <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="date_needed"
                                    name="date_needed"
                                    type="date"
                                    required
                                    disabled={loading}
                                    min={new Date().toISOString().split("T")[0]}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Request"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
