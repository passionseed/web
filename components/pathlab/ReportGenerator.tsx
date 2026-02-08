"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReportGeneratorProps {
  enrollmentId: string;
}

export function ReportGenerator({ enrollmentId }: ReportGeneratorProps) {
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

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
      </CardContent>
    </Card>
  );
}
