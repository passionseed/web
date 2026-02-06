"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PSRequest } from "@/actions/ps-requests";
import { RequestDetailsDialog } from "@/components/ps/RequestDetailsDialog";
import {
    Calendar,
    Clock,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface RequestsListProps {
    incomingRequests: PSRequest[];
    outgoingRequests: PSRequest[];
    projectId: string;
    isMember: boolean;
}

export function RequestsList({
    incomingRequests,
    outgoingRequests,
    projectId,
    isMember,
}: RequestsListProps) {
    const [selectedRequest, setSelectedRequest] = useState<PSRequest | null>(
        null
    );

    // Filter out completed and cancelled requests
    const activeIncoming = incomingRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
    const activeOutgoing = outgoingRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
    const completedRequests = [
        ...incomingRequests.filter(r => r.status === 'completed'),
        ...outgoingRequests.filter(r => r.status === 'completed')
    ].sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime());

    const cancelledRequests = [
        ...incomingRequests.filter(r => r.status === 'cancelled'),
        ...outgoingRequests.filter(r => r.status === 'cancelled')
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
        const variants = {
            pending: "outline",
            accepted: "default",
            rejected: "destructive",
            in_progress: "secondary",
            completed: "secondary",
            cancelled: "outline",
        } as const;
        const colors = {
            pending: "text-yellow-600 border-yellow-600",
            accepted: "bg-green-600 hover:bg-green-700 text-white border-transparent",
            rejected: "text-red-600 border-red-600",
            in_progress: "text-blue-600 border-blue-600",
            completed: "text-gray-600 border-gray-600",
            cancelled: "text-gray-400 border-gray-400 decoration-slice line-through",
        };
        return (
            <Badge
                variant={status === 'accepted' ? 'secondary' : (variants[status as keyof typeof variants] || 'outline')}
                className={colors[status as keyof typeof colors]}
            >
                {status.replace("_", " ").toUpperCase()}
            </Badge>
        );
    };

    const RequestCard = ({
        request,
        type,
    }: {
        request: PSRequest;
        type: "incoming" | "outgoing";
    }) => {
        const otherProject =
            type === "incoming"
                ? request.requesting_project
                : request.receiving_project;

        return (
            <div
                className="p-4 border rounded-lg hover:shadow-md hover:bg-accent/50 transition-all cursor-pointer bg-card"
                onClick={() => setSelectedRequest(request)}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{request.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {type === "incoming" ? (
                                <>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>From: {otherProject?.name}</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="h-4 w-4" />
                                    <span>To: {otherProject?.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                    </div>
                </div>

                {request.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {request.description}
                    </p>
                )}

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(request.date_needed), "MMM d, yyyy")}</span>
                        </div>
                        <Badge variant="outline">{request.category}</Badge>
                    </div>

                    {request.assigned_user && type === "outgoing" && (
                        <div className="text-xs text-muted-foreground">
                            Assigned to: {request.assigned_user.full_name}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                    <TabsTrigger value="incoming">
                        Incoming {isMember && `(${activeIncoming.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="outgoing">
                        Outgoing {isMember && `(${activeOutgoing.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed {isMember && `(${completedRequests.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="cancelled">
                        Cancelled {isMember && `(${cancelledRequests.length})`}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="space-y-4 mt-6">
                    {activeIncoming.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No incoming requests</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeIncoming.map((request) => (
                                <RequestCard
                                    key={request.id}
                                    request={request}
                                    type="incoming"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="outgoing" className="space-y-4 mt-6">
                    {activeOutgoing.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No outgoing requests</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {activeOutgoing.map((request) => (
                                <RequestCard
                                    key={request.id}
                                    request={request}
                                    type="outgoing"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 mt-6">
                    {completedRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No completed requests</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedRequests.map((request) => {
                                const isIncoming = request.receiving_project_id === projectId;
                                return (
                                    <RequestCard
                                        key={request.id}
                                        request={request}
                                        type={isIncoming ? "incoming" : "outgoing"}
                                    />
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="cancelled" className="space-y-4 mt-6">
                    {cancelledRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No cancelled requests</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {cancelledRequests.map((request) => {
                                const isIncoming = request.receiving_project_id === projectId;
                                return (
                                    <RequestCard
                                        key={request.id}
                                        request={request}
                                        type={isIncoming ? "incoming" : "outgoing"}
                                    />
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {selectedRequest && (
                <RequestDetailsDialog
                    request={selectedRequest}
                    open={!!selectedRequest}
                    onOpenChange={(open: boolean) => !open && setSelectedRequest(null)}
                    projectId={projectId}
                />
            )}
        </>
    );
}
