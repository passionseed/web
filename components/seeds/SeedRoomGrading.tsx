"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GradeCell } from "@/components/classroom/GradeCell";
import {
  Search,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

interface Student {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  total_submissions: number;
  graded_submissions: number;
  pending_submissions: number;
}

interface AssessmentNode {
  id: string;
  node_id: string;
  node_title: string;
  assessment_type: string;
  points_possible: number | null;
}

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  node_title: string;
  assessment_id: string;
  assessment_type: string;
  submitted_at: string;
  status: "ungraded" | "graded";
  grade: "pass" | "fail" | null;
  points_awarded: number | null;
  points_possible: number | null;
  text_answer: string | null;
  file_urls: string[] | null;
  image_url: string | null;
  is_grading_enabled: boolean;
}

interface GradebookMatrix {
  [studentId: string]: {
    [assessmentId: string]: Submission | undefined;
  };
}

interface SeedRoomGradingProps {
  roomId: string;
  mapId: string;
}

export function SeedRoomGrading({ roomId, mapId }: SeedRoomGradingProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assessmentNodes, setAssessmentNodes] = useState<AssessmentNode[]>([]);
  const [gradebookMatrix, setGradebookMatrix] = useState<GradebookMatrix>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "email">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingForm, setGradingForm] = useState({
    grade: "pass" as "pass" | "fail",
    points: "" as string,
    comments: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadGradingData();
  }, [roomId, mapId]);

  useEffect(() => {
    if (students.length > 0 && assessmentNodes.length > 0) {
      createGradebookMatrix();
    }
  }, [students, submissions, assessmentNodes]);

  const loadGradingData = async () => {
    try {
      setLoading(true);

      // Get room details to identify mentor/host
      const { data: roomData, error: roomError } = await supabase
        .from("seed_rooms")
        .select("host_id, mentor_id")
        .eq("id", roomId)
        .single();

      if (roomError) throw roomError;

      const mentorIds = [roomData.host_id, roomData.mentor_id].filter(Boolean);

      // Get room member IDs
      const { data: memberIds, error: membersError } = await supabase
        .from("seed_room_members")
        .select("user_id")
        .eq("room_id", roomId);

      if (membersError) throw membersError;

      // Determine who to hide (The functionality Instructor)
      // 1. If a mentor is explicitly assigned, hide the mentor (Host might be the student in self-paced/test modes).
      // 2. If no mentor is assigned, hide the host (Creator is assumed to be instructor).
      const instructorIdToHide = roomData.mentor_id || roomData.host_id;

      const userIds =
        memberIds
          ?.map((m) => m.user_id)
          .filter((id) => id !== instructorIdToHide) || [];

      if (userIds.length === 0) {
        setStudents([]);
        setSubmissions([]);
        setAssessmentNodes([]);
        return;
      }

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get all assessments for this map
      const { data: assessments, error: assessmentsError } = await supabase
        .from("node_assessments")
        .select(
          `
          id,
          node_id,
          assessment_type,
          points_possible,
          map_nodes!inner(
            id,
            title,
            map_id
          )
        `,
        )
        .eq("map_nodes.map_id", mapId);

      if (assessmentsError) throw assessmentsError;

      // Transform to assessment nodes
      const nodes: AssessmentNode[] = (assessments || []).map((a: any) => ({
        id: a.id,
        node_id: a.node_id,
        node_title: a.map_nodes?.title || "Unknown",
        assessment_type: a.assessment_type,
        points_possible: a.points_possible,
      }));

      // Get submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("assessment_submissions")
        .select(
          `
          id,
          progress_id,
          assessment_id,
          text_answer,
          file_urls,
          image_url,
          submitted_at,
          student_node_progress!inner(
            id,
            user_id,
            node_id,
            status,
            map_nodes!inner(
              id,
              title,
              map_id
            )
          ),
          node_assessments(
            id,
            assessment_type,
            points_possible
          ),
          submission_grades(
            grade,
            points_awarded,
            comments
          )
        `,
        )
        .in("student_node_progress.user_id", userIds)
        .eq("student_node_progress.map_nodes.map_id", mapId)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      // Transform submissions
      const transformedSubmissions: Submission[] = (submissionsData || []).map(
        (sub: any) => {
          const userId = sub.student_node_progress?.user_id;
          const profile = profiles?.find((p) => p.id === userId);
          const grade = sub.submission_grades?.[0];
          const hasGradingEnabled =
            sub.node_assessments?.points_possible !== null;

          return {
            id: sub.id,
            student_id: userId,
            student_name: profile?.full_name || "Unknown",
            student_email: profile?.email || "",
            node_title:
              sub.student_node_progress?.map_nodes?.title || "Unknown Node",
            assessment_id: sub.assessment_id,
            assessment_type: sub.node_assessments?.assessment_type || "unknown",
            submitted_at: sub.submitted_at,
            status: grade ? "graded" : "ungraded",
            grade: grade?.grade || null,
            points_awarded: grade?.points_awarded || null,
            points_possible: sub.node_assessments?.points_possible,
            text_answer: sub.text_answer,
            file_urls: sub.file_urls,
            image_url: sub.image_url,
            is_grading_enabled: hasGradingEnabled,
          };
        },
      );
      setSubmissions(transformedSubmissions);

      // Sort assessment nodes by earliest submission date
      const sortedNodes = [...nodes].sort((a, b) => {
        // Find earliest submission for each assessment
        const aSubmissions = transformedSubmissions.filter(
          (s) => s.assessment_id === a.id,
        );
        const bSubmissions = transformedSubmissions.filter(
          (s) => s.assessment_id === b.id,
        );

        // Get earliest submission time for each
        const aEarliest =
          aSubmissions.length > 0
            ? Math.min(
                ...aSubmissions.map((s) => new Date(s.submitted_at).getTime()),
              )
            : Infinity;
        const bEarliest =
          bSubmissions.length > 0
            ? Math.min(
                ...bSubmissions.map((s) => new Date(s.submitted_at).getTime()),
              )
            : Infinity;

        // Sort by earliest submission time (ascending)
        return aEarliest - bEarliest;
      });
      setAssessmentNodes(sortedNodes);

      // Create student list with stats
      const studentList: Student[] = (profiles || []).map((profile: any) => {
        const studentSubmissions = transformedSubmissions.filter(
          (s) => s.student_id === profile.id,
        );
        return {
          user_id: profile.id,
          full_name: profile.full_name || "Unknown",
          email: profile.email || "",
          avatar_url: profile.avatar_url,
          total_submissions: studentSubmissions.length,
          graded_submissions: studentSubmissions.filter(
            (s) => s.status === "graded",
          ).length,
          pending_submissions: studentSubmissions.filter(
            (s) => s.status === "ungraded",
          ).length,
        };
      });
      setStudents(studentList);
    } catch (error) {
      console.error("Error loading grading data:", error);
      toast.error("Failed to load grading data");
    } finally {
      setLoading(false);
    }
  };

  const createGradebookMatrix = () => {
    const matrix: GradebookMatrix = {};

    // Initialize empty matrix for each student to ensure consistent object shape
    students.forEach((student) => {
      matrix[student.user_id] = {};
      assessmentNodes.forEach((node) => {
        matrix[student.user_id][node.id] = undefined;
      });
    });

    // ⚡ Bolt Optimization: Replace O(S*N^2) nested loops + .find() with O(S) single pass
    // Populate matrix directly from submissions list.
    // Submissions are ordered descending by date, so we only want the FIRST one we encounter.
    submissions.forEach((submission) => {
      if (
        matrix[submission.student_id] &&
        matrix[submission.student_id][submission.assessment_id] === undefined
      ) {
        matrix[submission.student_id][submission.assessment_id] = submission;
      }
    });

    setGradebookMatrix(matrix);
  };

  const handleGradeSubmission = async (
    submissionId: string,
    grade: "pass" | "fail",
    points: number | null,
    comments: string,
  ) => {
    try {
      setGrading(true);

      // Validate points don't exceed maximum
      if (
        selectedSubmission?.is_grading_enabled &&
        points !== null &&
        selectedSubmission.points_possible !== null
      ) {
        if (points > selectedSubmission.points_possible) {
          toast.error(
            `Points cannot exceed maximum of ${selectedSubmission.points_possible}`,
          );
          setGrading(false);
          return;
        }
        if (points < 0) {
          toast.error("Points cannot be negative");
          setGrading(false);
          return;
        }
      }

      // Call grading API
      const response = await fetch(`/api/seeds/rooms/${roomId}/grading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          grade,
          points_awarded: points,
          comments,
        }),
      });

      if (response.ok) {
        toast.success(
          selectedSubmission?.status === "graded"
            ? "Grade updated"
            : "Submission graded",
        );
        loadGradingData();
        setSelectedSubmission(null);
        setShowGradingModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to grade submission");
      }
    } catch (error) {
      console.error("Error grading submission:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to grade submission",
      );
    } finally {
      setGrading(false);
    }
  };

  const handleCellClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradingForm({
      grade: submission.grade || "pass",
      points: submission.points_awarded?.toString() || "",
      comments: "",
    });
    setShowGradingModal(true);
  };

  const filteredStudents = students
    .filter((student) => {
      return (
        !searchTerm ||
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aValue =
        sortBy === "name" ? a.full_name.toLowerCase() : a.email.toLowerCase();
      const bValue =
        sortBy === "name" ? b.full_name.toLowerCase() : b.email.toLowerCase();

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  const stats = {
    total: submissions.length,
    ungraded: submissions.filter((s) => s.status === "ungraded").length,
    graded: submissions.filter((s) => s.status === "graded").length,
    passed: submissions.filter((s) => s.grade === "pass").length,
    failed: submissions.filter((s) => s.grade === "fail").length,
  };

  if (loading) {
    return (
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-8">
          <div className="h-64 animate-pulse bg-neutral-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Award className="w-8 h-8 text-neutral-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Need Grading</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stats.ungraded}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Graded</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.graded}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Passed</p>
                <p className="text-2xl font-bold text-green-400">
                  {stats.passed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Failed</p>
                <p className="text-2xl font-bold text-red-400">
                  {stats.failed}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-neutral-800 border-neutral-700 text-white"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select
                value={sortBy}
                onValueChange={(value: "name" | "email") => setSortBy(value)}
              >
                <SelectTrigger className="w-32 bg-neutral-800 border-neutral-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="px-2 bg-neutral-800 border-neutral-700"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gradebook Grid */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">
            Gradebook ({filteredStudents.length} students,{" "}
            {assessmentNodes.length} assignments)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 || assessmentNodes.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {students.length === 0 ? "No students" : "No assignments"}
              </h3>
              <p className="text-neutral-400">
                {students.length === 0
                  ? "No students have joined this seed room yet."
                  : "This map has no assessments configured."}
              </p>
            </div>
          ) : (
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div
                  className="min-w-full"
                  style={{ display: "table", width: "100%" }}
                >
                  {/* Header Row */}
                  <div
                    className="flex bg-neutral-900 border-b border-neutral-700 sticky top-0 z-10"
                    style={{ minWidth: "max-content" }}
                  >
                    <div className="w-48 p-3 border-r border-neutral-700 bg-neutral-900 font-semibold text-sm sticky left-0 z-20 text-neutral-100 flex-shrink-0">
                      Student
                    </div>
                    {assessmentNodes.map((node) => (
                      <div
                        key={node.id}
                        className="w-32 p-2 border-r border-neutral-700 text-center flex-shrink-0"
                      >
                        <div
                          className="font-medium text-xs line-clamp-2 text-neutral-100"
                          title={node.node_title}
                        >
                          {node.node_title}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 capitalize">
                          {node.assessment_type.replace(/_/g, " ")}
                        </div>
                        {node.points_possible && (
                          <div className="text-xs text-blue-400">
                            Max: {node.points_possible}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Student Rows */}
                  {filteredStudents.map((student) => (
                    <div
                      key={student.user_id}
                      className="flex hover:bg-neutral-800 border-b border-neutral-700"
                      style={{ minWidth: "max-content" }}
                    >
                      <div className="w-48 p-3 border-r border-neutral-700 bg-neutral-900 sticky left-0 z-10 flex-shrink-0">
                        <div className="font-medium text-sm text-neutral-100">
                          {student.full_name}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {student.email}
                        </div>
                      </div>
                      {assessmentNodes.map((node) => {
                        const submission =
                          gradebookMatrix[student.user_id]?.[node.id];
                        return (
                          <div
                            key={`${student.user_id}-${node.id}`}
                            className="w-32 border-r border-neutral-700 py-3 relative flex-shrink-0"
                          >
                            <GradeCell
                              submission={submission}
                              onClick={() => {
                                if (submission) {
                                  handleCellClick(submission);
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Modal */}
      <Dialog open={showGradingModal} onOpenChange={setShowGradingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedSubmission?.status === "graded"
                ? "Review Submission"
                : "Grade Submission"}
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {selectedSubmission?.student_name} -{" "}
              {selectedSubmission?.node_title}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Content */}
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">
                    Student Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSubmission.text_answer && (
                    <div>
                      <Label className="font-medium text-neutral-300">
                        Text Answer:
                      </Label>
                      <div className="mt-2 p-3 bg-neutral-900 rounded-md text-neutral-100">
                        {selectedSubmission.text_answer}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.file_urls &&
                    selectedSubmission.file_urls.length > 0 && (
                      <div>
                        <Label className="font-medium text-neutral-300">
                          File Uploads:
                        </Label>
                        <div className="mt-2 space-y-3">
                          {selectedSubmission.file_urls.map((url, index) => {
                            // Check if the file is an image based on extension
                            const isImage =
                              /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);

                            return (
                              <div key={index}>
                                {isImage ? (
                                  <div className="space-y-2">
                                    <img
                                      src={url}
                                      alt={`Submission file ${index + 1}`}
                                      className="max-w-full rounded-md border border-neutral-700"
                                      style={{
                                        maxHeight: "400px",
                                        objectFit: "contain",
                                      }}
                                    />
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-400 hover:underline text-sm"
                                    >
                                      <Download className="h-3 w-3" />
                                      Download File {index + 1}
                                    </a>
                                  </div>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-400 hover:underline"
                                  >
                                    <Download className="h-4 w-4" />
                                    File {index + 1}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {selectedSubmission.image_url && (
                    <div>
                      <Label className="font-medium text-neutral-300">
                        Image:
                      </Label>
                      <div className="mt-2">
                        <img
                          src={selectedSubmission.image_url}
                          alt="Submission"
                          className="max-w-full rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grading Form */}
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">
                    {selectedSubmission.status === "graded"
                      ? "Edit Grade"
                      : "Grade Submission"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-neutral-300">Grade</Label>
                      <Select
                        value={gradingForm.grade}
                        onValueChange={(value: "pass" | "fail") =>
                          setGradingForm((prev) => ({ ...prev, grade: value }))
                        }
                      >
                        <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedSubmission.is_grading_enabled && (
                      <div>
                        <Label className="text-neutral-300">
                          Points
                          {selectedSubmission.points_possible
                            ? ` (Max: ${selectedSubmission.points_possible})`
                            : ""}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={gradingForm.points}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseInt(value);

                            // Allow empty string for clearing
                            if (value === "") {
                              setGradingForm((prev) => ({
                                ...prev,
                                points: "",
                              }));
                              return;
                            }

                            // Validate against max and min
                            if (!isNaN(numValue)) {
                              if (
                                selectedSubmission.points_possible !== null &&
                                numValue > selectedSubmission.points_possible
                              ) {
                                toast.error(
                                  `Points cannot exceed ${selectedSubmission.points_possible}`,
                                );
                                return;
                              }
                              if (numValue < 0) {
                                toast.error("Points cannot be negative");
                                return;
                              }
                            }

                            setGradingForm((prev) => ({
                              ...prev,
                              points: value,
                            }));
                          }}
                          min={0}
                          max={selectedSubmission.points_possible || undefined}
                          placeholder="Enter points"
                          className={`bg-neutral-900 border-neutral-700 text-white ${
                            gradingForm.points &&
                            selectedSubmission.points_possible &&
                            parseInt(gradingForm.points) >
                              selectedSubmission.points_possible
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                        {gradingForm.points &&
                          selectedSubmission.points_possible &&
                          parseInt(gradingForm.points) >
                            selectedSubmission.points_possible && (
                            <p className="text-xs text-red-400 mt-1">
                              Points cannot exceed maximum of{" "}
                              {selectedSubmission.points_possible}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-neutral-300">Comments</Label>
                    <Textarea
                      value={gradingForm.comments}
                      onChange={(e) =>
                        setGradingForm((prev) => ({
                          ...prev,
                          comments: e.target.value,
                        }))
                      }
                      placeholder="Provide feedback to the student..."
                      className="bg-neutral-900 border-neutral-700 text-white"
                    />
                  </div>

                  <Button
                    onClick={() =>
                      handleGradeSubmission(
                        selectedSubmission.id,
                        gradingForm.grade,
                        selectedSubmission.is_grading_enabled
                          ? gradingForm.points
                            ? parseInt(gradingForm.points)
                            : null
                          : null,
                        gradingForm.comments,
                      )
                    }
                    disabled={
                      grading ||
                      (selectedSubmission.is_grading_enabled &&
                        !gradingForm.points.trim())
                    }
                    className="w-full"
                  >
                    {grading
                      ? "Grading..."
                      : selectedSubmission.status === "graded"
                        ? "Update Grade"
                        : "Submit Grade"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
