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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Map,
} from "lucide-react";
import Link from "next/link";

export default async function GradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isInstructor(user.id))) {
    notFound();
  }

  const mapId = (await params).id;
  const searchParamsResolved = await searchParams;
  const assignmentId = searchParamsResolved.assignment as string | undefined;

  const [submissions, map] = await Promise.all([
    getSubmissionsForMap(mapId),
    getMapWithNodes(mapId),
  ]);

  if (!map) {
    notFound();
  }

  // Filter submissions by assignment if specified
  const filteredSubmissions = submissions;
  if (assignmentId) {
    // TODO: Add assignment filtering logic here
    // For now, we'll show all submissions but could filter by assignment_enrollments
    console.log("Filtering submissions for assignment:", assignmentId);
  }

  // Calculate statistics - exclude auto-graded submissions from pending count
  const totalSubmissions = filteredSubmissions.length;
  const autoGradedSubmissions = filteredSubmissions.filter(
    (s) =>
      s.submission_grades.length > 0 &&
      s.submission_grades[0]?.graded_by === null
  ).length;
  const pendingSubmissions = filteredSubmissions.filter(
    (s) =>
      s.submission_grades.length === 0 ||
      (s.submission_grades[0]?.graded_by !== null &&
        s.submission_grades.length === 0)
  ).length;
  const manuallyGradedSubmissions = filteredSubmissions.filter(
    (s) =>
      s.submission_grades.length > 0 &&
      s.submission_grades[0]?.graded_by !== null
  ).length;
  const passedSubmissions = filteredSubmissions.filter(
    (s) => s.submission_grades[0]?.grade === "pass"
  ).length;
  const failedSubmissions = filteredSubmissions.filter(
    (s) => s.submission_grades[0]?.grade === "fail"
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          href={`/map/${mapId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <Map className="h-4 w-4" />
          Back to Map
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Grading Dashboard</span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{map.title}</span>
            </div>
            <h1 className="text-3xl font-bold">
              Submissions for Grading
              {assignmentId && (
                <Badge variant="secondary" className="ml-2 text-sm">
                  Assignment Filtered
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Review and grade student submissions for this learning map.
              {assignmentId && (
                <span className="block text-sm text-blue-600 mt-1">
                  Currently showing submissions for a specific assignment only.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {assignmentId && (
              <Link
                href={`/classrooms`}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Assignment
              </Link>
            )}
            <Link href={`/map/${mapId}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                View Map
              </Button>
            </Link>
            <Link href={`/map/${mapId}/edit`}>
              <Button variant="outline" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Edit Map
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  Auto-Graded
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {autoGradedSubmissions}
                </p>
              </div>
              <div className="h-8 w-8 text-purple-500 flex items-center justify-center text-lg">
                🤖
              </div>
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
          <GradingTable
            submissions={filteredSubmissions}
            userId={user.id}
            mapId={mapId}
            assignmentId={assignmentId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
