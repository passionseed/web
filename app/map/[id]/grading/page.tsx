import { notFound } from "next/navigation";
import {
  getSubmissionsForMap,
  SubmissionWithDetails,
} from "@/lib/supabase/maps";
import { createClient } from "@/utils/supabase/server";
import { isInstructor } from "@/lib/supabase/roles";
import { GradeSubmissionForm } from "./grade-submission-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function GradingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isInstructor(user.id)) {
    notFound();
  }

  const submissions = await getSubmissionsForMap(params.id);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Submissions for Grading</h1>
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage
                          src={
                            submission.student_node_progress.profiles
                              .avatar_url || ""
                          }
                        />
                        <AvatarFallback>
                          {
                            submission.student_node_progress.profiles
                              .username[0]
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {submission.student_node_progress.profiles.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {submission.node_assessments.map_nodes.title}
                  </TableCell>
                  <TableCell>
                    {new Date(submission.submitted_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        submission.submission_grades.length > 0
                          ? submission.submission_grades[0].grade === "pass"
                            ? "default"
                            : "destructive"
                          : "outline"
                      }
                    >
                      {submission.submission_grades.length > 0
                        ? submission.submission_grades[0].grade
                        : "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <GradeSubmissionForm
                      submission={submission}
                      userId={user.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
