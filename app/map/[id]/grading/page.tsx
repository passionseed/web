import { notFound } from "next/navigation";
import { getMapWithNodes } from "@/lib/supabase/maps";
import {
  getSubmissionsForMap,
  SubmissionWithDetails,
} from "@/lib/supabase/grading";
import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "@/lib/supabase/roles";
import { GradingTable } from "./grading-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function GradingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isInstructor(user.id))) {
    notFound();
  }

  const mapId = (await params).id;
  const [submissions, map] = await Promise.all([
    getSubmissionsForMap(mapId),
    getMapWithNodes(mapId),
  ]);

  if (!map) {
    notFound();
  }

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(
    (s) => s.submission_grades.length === 0
  ).length;
  const passedSubmissions = submissions.filter(
    (s) => s.submission_grades[0]?.grade === "pass"
  ).length;
  const failedSubmissions = submissions.filter(
    (s) => s.submission_grades[0]?.grade === "fail"
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{map.title}</span>
        </div>
        <h1 className="text-3xl font-bold">Submissions for Grading</h1>
        <p className="text-muted-foreground">
          Review and grade student submissions for this learning map.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Submissions
                </p>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {pendingSubmissions}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Passed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {passedSubmissions}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Failed
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {failedSubmissions}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submissions ({totalSubmissions})</CardTitle>
            <div className="flex items-center gap-2">
              {pendingSubmissions > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pendingSubmissions} pending review
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <GradingTable submissions={submissions} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
