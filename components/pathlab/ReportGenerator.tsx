"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PathReportData } from "@/types/pathlab";
import { buildPathReportTemplate } from "@/lib/pathlab/report-template";
import { toast } from "sonner";

interface ReportGeneratorProps {
  enrollmentId: string;
  reportData: PathReportData;
}

interface ReportHistoryItem {
  id: string;
  share_token: string;
  created_at: string;
}

export function ReportGenerator({ enrollmentId, reportData }: ReportGeneratorProps) {
  const templateText = useMemo(() => buildPathReportTemplate(reportData), [reportData]);
  const [reportText, setReportText] = useState(templateText);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setReportText(templateText);
    setShareUrl(null);
  }, [templateText]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const response = await fetch(
          `/api/pathlab/reports?enrollmentId=${encodeURIComponent(enrollmentId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load reports");
        }
        if (mounted) {
          setHistory(Array.isArray(payload?.reports) ? payload.reports : []);
        }
      } catch {
        if (mounted) {
          setHistory([]);
        }
      } finally {
        if (mounted) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [enrollmentId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pathlab/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, reportText }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create report");
      }

      const token = payload?.report?.share_token;
      if (token) {
        setShareUrl(`/report/${token}`);
      }
      if (payload?.report?.id) {
        setHistory((prev) => {
          const next = [payload.report as ReportHistoryItem, ...prev];
          return next.filter(
            (item, index) => next.findIndex((candidate) => candidate.id === item.id) === index,
          );
        });
      }
      toast.success("Report generated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-white">Generate Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-neutral-400">
          This template is prefilled from student trend and reflection data. Edit before sharing.
        </p>
        <Textarea
          value={reportText}
          onChange={(event) => setReportText(event.target.value)}
          placeholder="Add your narrative summary for the parent report..."
          className="min-h-28 border-neutral-700 bg-neutral-950 text-white"
        />
        <div className="flex items-center justify-between">
          <Button onClick={handleGenerate} disabled={loading} className="bg-white text-black hover:bg-neutral-200">
            {loading ? "Generating..." : "Create shareable report"}
          </Button>
          {shareUrl && (
            <a href={shareUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-300 hover:text-blue-200">
              Open report
            </a>
          )}
        </div>
        <div className="space-y-2 pt-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Generated links</p>
          {historyLoading ? (
            <p className="text-sm text-neutral-400">Loading report history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-neutral-400">No reports generated yet.</p>
          ) : (
            history.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded border border-neutral-800 px-3 py-2">
                <span className="text-xs text-neutral-300">{new Date(report.created_at).toLocaleString()}</span>
                <a
                  href={`/report/${report.share_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  Open link
                </a>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
