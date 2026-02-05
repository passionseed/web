"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PSRequest, cancelRequest, updateRequestStatus } from "@/actions/ps-requests";
import { AcceptRequestDialog } from "@/components/ps/AcceptRequestDialog";
import { RejectRequestDialog } from "@/components/ps/RejectRequestDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Calendar,
    User,
    Building2,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface RequestDetailsDialogProps {
    request: PSRequest;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function RequestDetailsDialog({
    request,
    open,
    onOpenChange,
    projectId,
}: RequestDetailsDialogProps) {
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isIncoming = request.receiving_project_id === projectId;
    const isOutgoing = request.requesting_project_id === projectId;
    const canAccept = isIncoming && request.status === "pending";
    const canReject = isIncoming && request.status === "pending";
    const canCancel = isOutgoing && request.status === "pending";
    const canUpdateStatus =
        isIncoming && ["accepted", "in_progress"].includes(request.status);

    const handleStatusUpdate = async (newStatus: "in_progress" | "completed") => {
        setLoading(true);
        try {
            await updateRequestStatus(request.id, newStatus);
            toast.success(`Request marked as ${newStatus.replace("_", " ")}`);
            router.refresh();
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update status");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this request?")) return;

        setLoading(true);
        try {
            await cancelRequest(request.id);
            toast.success("Request cancelled");
            router.refresh();
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to cancel request");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityBadge = (priority: string) => {
        const variants = {
            urgent: "destructive",
            normal: "default",
            low: "secondary",
        } as const;
        const labels = {
            urgent: "🔴 Urgent",
            normal: "🔵 Normal",
            low: "⚪ Low",
        };
        return (
            <Badge variant={variants[priority as keyof typeof variants]}>
                {labels[priority as keyof typeof labels]}
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: "text-yellow-600 border-yellow-600",
            accepted: "text-green-600 border-green-600",
            rejected: "text-red-600 border-red-600",
            in_progress: "text-blue-600 border-blue-600",
            completed: "text-gray-600 border-gray-600",
        };
        return (
            <Badge variant="outline" className={colors[status as keyof typeof colors]}>
                {status.replace("_", " ").toUpperCase()}
            </Badge>
        );
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {request.title}
                        </DialogTitle>
                        <DialogDescription>Request Details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Status & Priority */}
                        <div className="flex gap-3">
                            {getStatusBadge(request.status)}
                            {getPriorityBadge(request.priority)}
                            <Badge variant="outline">{request.category}</Badge>
                        </div>

                        {/* Description */}
                        {request.description && (
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                    <FileText className="h-4 w-4" />
                                    Description
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {request.description}
                                </p>
                            </div>
                        )}

                        <Separator />

                        {/* Request Info */}
                        <div className="grid gap-4">
                            <div className="flex items-start gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">From</div>
                                    <div className="text-sm text-muted-foreground">
                                        {request.requesting_project?.name}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">To</div>
                                    <div className="text-sm text-muted-foreground">
                                        {request.receiving_project?.name}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">Requested By</div>
                                    <div className="text-sm text-muted-foreground">
                                        {request.creator?.full_name || request.creator?.email}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium">Date Needed</div>
                                    <div className="text-sm text-muted-foreground">
                                        {format(new Date(request.date_needed), "MMMM d, yyyy")}
                                        {request.date_modified && (
                                            <span className="text-xs ml-2">(Modified)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {request.assigned_user && (
                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium">Assigned To</div>
                                        <div className="text-sm text-muted-foreground">
                                            {request.assigned_user.full_name}
                                        </div>
                                        {request.assigned_at && (
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(request.assigned_at), "MMM d, yyyy")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {request.rejection_reason && (
                                <div className="flex items-start gap-3">
                                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium">Rejection Reason</div>
                                        <div className="text-sm text-muted-foreground">
                                            {request.rejection_reason}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex gap-2 justify-end flex-wrap">
                            {canCancel && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Cancel Request
                                </Button>
                            )}

                            {canReject && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setRejectDialogOpen(true)}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                            )}

                            {canAccept && (
                                <Button onClick={() => setAcceptDialogOpen(true)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Accept & Assign
                                </Button>
                            )}

                            {(canUpdateStatus && (request.status === "accepted" || request.status === "in_progress")) && (
                                <Button
                                    variant="default"
                                    onClick={() => handleStatusUpdate("completed")}
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Mark as Completed
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AcceptRequestDialog
                request={request}
                open={acceptDialogOpen}
                onOpenChange={setAcceptDialogOpen}
                onSuccess={() => {
                    setAcceptDialogOpen(false);
                    onOpenChange(false);
                    router.refresh();
                }}
            />

            <RejectRequestDialog
                request={request}
                open={rejectDialogOpen}
                onOpenChange={setRejectDialogOpen}
                onSuccess={() => {
                    setRejectDialogOpen(false);
                    onOpenChange(false);
                    router.refresh();
                }}
            />
        </>
    );
}
