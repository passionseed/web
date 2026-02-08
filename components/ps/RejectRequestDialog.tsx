"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PSRequest, rejectRequest } from "@/actions/ps-requests";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RejectRequestDialogProps {
    request: PSRequest;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function RejectRequestDialog({
    request,
    open,
    onOpenChange,
    onSuccess,
}: RejectRequestDialogProps) {
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        setLoading(true);
        try {
            await rejectRequest(request.id, reason);
            toast.success("Request rejected");
            onSuccess();
            setReason("");
        } catch (error) {
            toast.error("Failed to reject request");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject Request</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this request. This will be
                        visible to the requesting department.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="reason">
                            Rejection Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this request cannot be fulfilled..."
                            rows={4}
                            required
                            disabled={loading}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                onOpenChange(false);
                                setReason("");
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={loading || !reason.trim()}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reject Request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
