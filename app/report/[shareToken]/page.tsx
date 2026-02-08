import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportByToken } from "@/lib/supabase/pathlab-reports";
import { TrendSummary } from "@/components/pathlab/TrendSummary";

interface PublicReportPageProps {
  params: Promise<{
    shareToken: string;
  }>;
}

export default async function PublicReportPage({ params }: PublicReportPageProps) {
  const { shareToken } = await params;
  const report = await getReportByToken(shareToken);

  if (!report) {
    notFound();
  }

  const reportData = report.report_data as any;

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl space-y-4 px-4 py-8">
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader>
          <CardTitle className="text-white">PathLab Direction Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-neutral-200">
          <p>Student: {reportData?.student_name || report.profile?.full_name || "Student"}</p>
          <p>Path: {reportData?.seed_title || report.enrollment?.path?.seed?.title}</p>
          <p>
            Progress: {reportData?.days_completed || 0}/{reportData?.total_days || 0} days
          </p>
          <p>Total time: {reportData?.total_time_minutes || 0} minutes</p>
          <p>Status: {reportData?.status || report.enrollment?.status}</p>
        </CardContent>
      </Card>

      {report.report_text && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Narrative Summary</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-neutral-200">{report.report_text}</CardContent>
        </Card>
      )}

      {Array.isArray(reportData?.trend) && reportData.trend.length > 0 && <TrendSummary trend={reportData.trend} />}

      {reportData?.exit_reflection && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Exit Reflection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-neutral-200">
            <p>Reason: {reportData.exit_reflection.reason_category}</p>
            <p>Interest change: {reportData.exit_reflection.interest_change}</p>
            {reportData.exit_reflection.open_response && <p>Note: {reportData.exit_reflection.open_response}</p>}
          </CardContent>
        </Card>
      )}

      {reportData?.end_reflection && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">End Reflection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-neutral-200">
            <p>Overall interest: {reportData.end_reflection.overall_interest}/5</p>
            <p>Fit level: {reportData.end_reflection.fit_level}/5</p>
            <p>Explore deeper: {reportData.end_reflection.would_explore_deeper}</p>
            {reportData.end_reflection.surprise_response && <p>Surprise: {reportData.end_reflection.surprise_response}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
