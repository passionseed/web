"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PSRequest, acceptRequest } from "@/actions/ps-requests";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AcceptRequestDialogProps {
    request: PSRequest;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AcceptRequestDialog({
    request,
    open,
    onOpenChange,
    onSuccess,
}: AcceptRequestDialogProps) {
    const [loading, setLoading] = useState(false);
    const [assignedTo, setAssignedTo] = useState("");
    const [dateNeeded, setDateNeeded] = useState("");
    const [projectMembers, setProjectMembers] = useState<any[]>([]);

    useEffect(() => {
        // Fetch project members when dialog opens
        console.log("[AcceptDialog] Request object:", request);
        console.log("[AcceptDialog] receiving_project_id:", request?.receiving_project_id);
        if (open && request?.receiving_project_id) {
            fetchProjectMembers();
        }
    }, [open, request?.receiving_project_id]);

    const fetchProjectMembers = async () => {
        try {
            console.log("Fetching members for project:", request.receiving_project_id);
            const response = await fetch(
                `/api/ps/projects/${request.receiving_project_id}/members`
            );
            console.log("Response status:", response.status);
            if (response.ok) {
                const data = await response.json();
                console.log("Received members data:", data);
                console.log("Members count:", data?.length);
                setProjectMembers(data);
            } else {
                const errorText = await response.text();
                console.error("API error:", response.status, errorText);
            }
        } catch (error) {
            console.error("Failed to fetch project members:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignedTo) {
            toast.error("Please assign someone to this request");
            return;
        }

        setLoading(true);
        try {
            await acceptRequest(
                request.id,
                assignedTo,
                dateNeeded || undefined
            );
            toast.success("Request accepted and assigned");
            onSuccess();
        } catch (error) {
            toast.error("Failed to accept request");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Accept Request</DialogTitle>
                    <DialogDescription>
                        Assign this request to a team member. You can optionally modify the
                        date needed.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="assigned_to">
                            Assign To <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={assignedTo}
                            onValueChange={setAssignedTo}
                            required
                            disabled={loading}
                        >
                            <SelectTrigger id="assigned_to">
                                <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                            <SelectContent>
                                {projectMembers.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">
                                        No team members found
                                    </div>
                                ) : (
                                    projectMembers.map((member) => (
                                        <SelectItem key={member.user_id} value={member.user_id}>
                                            {member.profiles?.username || member.profiles?.full_name || member.profiles?.email || member.user_id}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid items-center gap-2">
                        <Label htmlFor="date_needed">
                            Date Needed (Optional - Leave blank to keep original)
                        </Label>
                        <Input
                            id="date_needed"
                            type="date"
                            value={dateNeeded}
                            onChange={(e) => setDateNeeded(e.target.value)}
                            disabled={loading}
                            min={new Date().toISOString().split("T")[0]}
                        />
                        <p className="text-xs text-muted-foreground">
                            Original date:{" "}
                            {new Date(request.date_needed).toLocaleDateString()}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !assignedTo}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Accept & Assign
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
