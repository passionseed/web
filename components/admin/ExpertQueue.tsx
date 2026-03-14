"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface ExpertRow {
  id: string;
  name: string;
  title: string;
  company: string;
  field_category: string;
  status: string;
  mentoring_preference: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  claimed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

interface ExpertQueueProps {
  onSelectExpert: (id: string) => void;
}

export function ExpertQueue({ onSelectExpert }: ExpertQueueProps) {
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 20;

  const fetchExperts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
      const response = await fetch(`/api/admin/experts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setExperts(data.experts || []);
        setTotal(data.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchExperts();
  }, [status, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} total</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchExperts}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No experts found with status: {status}
        </div>
      ) : (
        <div className="space-y-2">
          {experts.map((expert) => (
            <button
              key={expert.id}
              onClick={() => onSelectExpert(expert.id)}
              className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{expert.name}</span>
                  <Badge className={STATUS_COLORS[expert.status] || ""} variant="outline">
                    {expert.status}
                  </Badge>
                  {expert.mentoring_preference !== "none" && (
                    <Badge variant="outline" className="text-xs">
                      {expert.mentoring_preference} mentoring
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {expert.title} at {expert.company} · {expert.field_category}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(expert.created_at), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
