"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { 
  GraduationCap, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
  BarChart3,
  Download,
  PieChart,
  TrendingDown,
  Award,
  AlertCircle
} from "lucide-react";

interface Student {
  user_id: string;
  username: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  submissions: Submission[];
  total_submissions: number;
  graded_submissions: number;
  pending_submissions: number;
  average_grade: number | null;
}

interface Submission {
  id: string;
  student_user_id: string;
  student_name: string;
  assignment_title?: string;
  map_title: string;
  node_title: string;
  assessment_type: string;
  text_answer: string | null;
  file_urls: string[] | null;
  image_url: string | null;
  quiz_answers: Record<string, string> | null;
  submitted_at: string;
  grade: "pass" | "fail" | null;
  points_awarded: number | null;
  comments: string | null;
  graded_at: string | null;
  graded_by: string | null;
  status: "ungraded" | "graded";
  is_grading_enabled: boolean;
}

interface ClassroomGradingProps {
  classroomId: string;
  canManage: boolean;
}

export function ClassroomGrading({ classroomId, canManage }: ClassroomGradingProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "graded" | "ungraded">("all");
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grading, setGrading] = useState(false);
  const [viewMode, setViewMode] = useState<"students" | "submissions" | "analytics">("students");
  const { toast } = useToast();

  // Analytics calculations
  const analytics = {
    totalSubmissions: submissions.length,
    gradedSubmissions: submissions.filter(s => s.status === "graded").length,
    pendingSubmissions: submissions.filter(s => s.status === "ungraded").length,
    passRate: submissions.length > 0 
      ? Math.round((submissions.filter(s => s.grade === "pass").length / submissions.filter(s => s.grade !== null).length) * 100) || 0
      : 0,
    failRate: submissions.length > 0 
      ? Math.round((submissions.filter(s => s.grade === "fail").length / submissions.filter(s => s.grade !== null).length) * 100) || 0
      : 0,
    averagePoints: submissions.length > 0 
      ? Math.round(submissions.filter(s => s.points_awarded !== null).reduce((sum, s) => sum + (s.points_awarded || 0), 0) / submissions.filter(s => s.points_awarded !== null).length) || 0
      : 0,
    gradingProgress: submissions.length > 0 
      ? Math.round((submissions.filter(s => s.status === "graded").length / submissions.length) * 100)
      : 0,
    topPerformers: students
      .filter(s => s.average_grade !== null)
      .sort((a, b) => (b.average_grade || 0) - (a.average_grade || 0))
      .slice(0, 5),
    strugglingStudents: students
      .filter(s => s.pending_submissions > 0 || (s.average_grade !== null && s.average_grade < 70))
      .sort((a, b) => (a.average_grade || 0) - (b.average_grade || 0))
      .slice(0, 5),
    submissionsByAssessmentType: submissions.reduce((acc, sub) => {
      acc[sub.assessment_type] = (acc[sub.assessment_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentActivity: submissions
      .filter(s => s.status === "graded")
      .sort((a, b) => new Date(b.graded_at!).getTime() - new Date(a.graded_at!).getTime())
      .slice(0, 10)
  };

  // Grading form state
  const [gradingForm, setGradingForm] = useState({
    grade: "pass" as "pass" | "fail",
    points: 100,
    comments: ""
  });

  const [bulkGrading, setBulkGrading] = useState({
    selectedSubmissions: new Set<string>(),
    grade: "pass" as "pass" | "fail",
    points: 100,
    comments: "Good work!"
  });

  useEffect(() => {
    if (canManage) {
      loadGradingData();
    }
  }, [classroomId, canManage]);

  const loadGradingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classrooms/${classroomId}/grading`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setSubmissions(data.submissions || []);
      } else {
        throw new Error("Failed to fetch grading data");
      }
    } catch (error) {
      console.error("Error loading grading data:", error);
      toast({
        title: "Error",
        description: "Failed to load grading data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, grade: "pass" | "fail", points: number | null, comments: string) => {
    try {
      setGrading(true);
      const response = await fetch(`/api/classrooms/${classroomId}/grading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          grade,
          points_awarded: points,
          comments
        })
      });

      if (response.ok) {
        toast({
          title: "Graded Successfully",
          description: "Submission has been graded",
        });
        loadGradingData(); // Refresh data
        setSelectedSubmission(null);
      } else {
        throw new Error("Failed to grade submission");
      }
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Grading Failed",
        description: "Failed to grade submission",
        variant: "destructive",
      });
    } finally {
      setGrading(false);
    }
  };

  const handleBulkGrading = async () => {
    if (bulkGrading.selectedSubmissions.size === 0) return;

    try {
      setGrading(true);
      
      // Only include points if at least one selected submission has grading enabled
      const hasGradingEnabled = Array.from(bulkGrading.selectedSubmissions).some(subId => {
        const submission = submissions.find(s => s.id === subId);
        return submission?.is_grading_enabled;
      });
      
      const response = await fetch(`/api/classrooms/${classroomId}/grading/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_ids: Array.from(bulkGrading.selectedSubmissions),
          grade: bulkGrading.grade,
          points_awarded: hasGradingEnabled ? bulkGrading.points : null,
          comments: bulkGrading.comments
        })
      });

      if (response.ok) {
        toast({
          title: "Bulk Grading Complete",
          description: `Graded ${bulkGrading.selectedSubmissions.size} submissions`,
        });
        setBulkGrading(prev => ({ ...prev, selectedSubmissions: new Set() }));
        loadGradingData();
      } else {
        throw new Error("Failed to perform bulk grading");
      }
    } catch (error) {
      console.error("Error in bulk grading:", error);
      toast({
        title: "Bulk Grading Failed",
        description: "Failed to grade submissions",
        variant: "destructive",
      });
    } finally {
      setGrading(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.node_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.map_title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || submission.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredStudents = students.filter(student => {
    return !searchTerm || 
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleSubmissionSelection = (submissionId: string) => {
    setBulkGrading(prev => {
      const newSelected = new Set(prev.selectedSubmissions);
      if (newSelected.has(submissionId)) {
        newSelected.delete(submissionId);
      } else {
        newSelected.add(submissionId);
      }
      return { ...prev, selectedSubmissions: newSelected };
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>;
      case "ungraded":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getGradeBadge = (grade: "pass" | "fail" | null) => {
    if (grade === "pass") {
      return <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>;
    } else if (grade === "fail") {
      return <Badge variant="destructive">Fail</Badge>;
    }
    return <Badge variant="outline">Not Graded</Badge>;
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">You don't have permission to access grading.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading grading data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Classroom Grading
          </CardTitle>
          <CardDescription>
            Grade student submissions and track progress across all assignments and learning maps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Grading Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{submissions.length}</div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{submissions.filter(s => s.status === "graded").length}</div>
                <p className="text-sm text-muted-foreground">Graded</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{submissions.filter(s => s.status === "ungraded").length}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-sm text-muted-foreground">Students</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students, assignments, or nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(value: "all" | "graded" | "ungraded") => setFilterStatus(value)}>
              <SelectTrigger className="md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ungraded">Ungraded</SelectItem>
                <SelectItem value="graded">Graded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(value: "students" | "submissions" | "analytics") => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students View
              </TabsTrigger>
              <TabsTrigger value="submissions" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Submissions View
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Students View */}
            <TabsContent value="students" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Total Submissions</TableHead>
                      <TableHead>Graded</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Average Grade</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.full_name || student.username}</div>
                            <div className="text-sm text-muted-foreground">{student.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{student.total_submissions}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {student.graded_submissions}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {student.pending_submissions}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.average_grade ? `${student.average_grade}%` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterAssignment("all");
                              setSearchTerm(student.username);
                              setViewMode("submissions");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Work
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Submissions View */}
            <TabsContent value="submissions" className="space-y-4">
              {/* Bulk Grading Controls */}
              {bulkGrading.selectedSubmissions.size > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {bulkGrading.selectedSubmissions.size} submissions selected
                        </span>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={bulkGrading.grade} 
                            onValueChange={(value: "pass" | "fail") => setBulkGrading(prev => ({ ...prev, grade: value }))}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pass">Pass</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                            </SelectContent>
                          </Select>
                          {Array.from(bulkGrading.selectedSubmissions).some(subId => {
                            const submission = submissions.find(s => s.id === subId);
                            return submission?.is_grading_enabled;
                          }) && (
                            <Input
                              type="number"
                              placeholder="Points"
                              value={bulkGrading.points}
                              onChange={(e) => setBulkGrading(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                              className="w-20"
                            />
                          )}
                          <Input
                            placeholder="Comments"
                            value={bulkGrading.comments}
                            onChange={(e) => setBulkGrading(prev => ({ ...prev, comments: e.target.value }))}
                            className="w-40"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setBulkGrading(prev => ({ ...prev, selectedSubmissions: new Set() }))}
                        >
                          Clear Selection
                        </Button>
                        <Button
                          onClick={handleBulkGrading}
                          disabled={grading}
                        >
                          {grading ? "Grading..." : "Grade Selected"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={bulkGrading.selectedSubmissions.size === filteredSubmissions.filter(s => s.status === "ungraded").length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkGrading(prev => ({
                                ...prev,
                                selectedSubmissions: new Set(filteredSubmissions.filter(s => s.status === "ungraded").map(s => s.id))
                              }));
                            } else {
                              setBulkGrading(prev => ({ ...prev, selectedSubmissions: new Set() }));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Assignment/Map</TableHead>
                      <TableHead>Node</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          {submission.status === "ungraded" && (
                            <input
                              type="checkbox"
                              checked={bulkGrading.selectedSubmissions.has(submission.id)}
                              onChange={() => toggleSubmissionSelection(submission.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.student_name}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {submission.assignment_title && (
                              <div className="font-medium text-sm">{submission.assignment_title}</div>
                            )}
                            <div className="text-sm text-muted-foreground">{submission.map_title}</div>
                          </div>
                        </TableCell>
                        <TableCell>{submission.node_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.assessment_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{new Date(submission.submitted_at).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>{getGradeBadge(submission.grade)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setGradingForm({
                                    grade: submission.grade || "pass",
                                    points: submission.points_awarded || 100,
                                    comments: submission.comments || ""
                                  });
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {submission.status === "graded" ? "Review" : "Grade"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {submission.status === "graded" ? "Review Submission" : "Grade Submission"}
                                </DialogTitle>
                                <DialogDescription>
                                  {submission.student_name} - {submission.node_title}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedSubmission && (
                                <div className="space-y-6">
                                  {/* Submission Content */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">Student Work</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {selectedSubmission.text_answer && (
                                        <div>
                                          <Label className="font-medium">Text Answer:</Label>
                                          <div className="mt-2 p-3 bg-gray-50 rounded-md text-gray-900">
                                            {selectedSubmission.text_answer}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {selectedSubmission.file_urls && selectedSubmission.file_urls.length > 0 && (
                                        <div>
                                          <Label className="font-medium">File Uploads:</Label>
                                          <div className="mt-2 space-y-2">
                                            {selectedSubmission.file_urls.map((url, index) => (
                                              <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 hover:underline"
                                              >
                                                <Download className="h-4 w-4" />
                                                File {index + 1}
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {selectedSubmission.quiz_answers && (
                                        <div>
                                          <Label className="font-medium">Quiz Answers:</Label>
                                          <div className="mt-2 space-y-2">
                                            {Object.entries(selectedSubmission.quiz_answers).map(([question, answer]) => (
                                              <div key={question} className="p-3 bg-gray-50 rounded-md">
                                                <div className="font-medium text-sm">{question}</div>
                                                <div className="text-sm text-muted-foreground mt-1">{answer}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>

                                  {/* Grading Form */}
                                  {submission.status === "ungraded" && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Grade Submission</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label>Grade</Label>
                                            <Select 
                                              value={gradingForm.grade} 
                                              onValueChange={(value: "pass" | "fail") => setGradingForm(prev => ({ ...prev, grade: value }))}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pass">Pass</SelectItem>
                                                <SelectItem value="fail">Fail</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {selectedSubmission?.is_grading_enabled && (
                                            <div>
                                              <Label>Points</Label>
                                              <Input
                                                type="number"
                                                value={gradingForm.points}
                                                onChange={(e) => setGradingForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                              />
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <Label>Comments</Label>
                                          <Textarea
                                            value={gradingForm.comments}
                                            onChange={(e) => setGradingForm(prev => ({ ...prev, comments: e.target.value }))}
                                            placeholder="Provide feedback to the student..."
                                          />
                                        </div>
                                        <Button
                                          onClick={() => handleGradeSubmission(
                                            submission.id,
                                            gradingForm.grade,
                                            selectedSubmission?.is_grading_enabled ? gradingForm.points : null,
                                            gradingForm.comments
                                          )}
                                          disabled={grading}
                                          className="w-full"
                                        >
                                          {grading ? "Grading..." : "Submit Grade"}
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Existing Grade Display */}
                                  {submission.status === "graded" && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Current Grade</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-2">
                                          <div>Grade: {getGradeBadge(submission.grade)}</div>
                                          <div>Points: {submission.points_awarded}</div>
                                          {submission.comments && (
                                            <div>
                                              <Label className="font-medium">Comments:</Label>
                                              <div className="mt-1 p-3 bg-gray-50 rounded-md">{submission.comments}</div>
                                            </div>
                                          )}
                                          <div className="text-sm text-muted-foreground">
                                            Graded on {new Date(submission.graded_at!).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Analytics View */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Overview Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Grade Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Pass Rate</span>
                        <span className="font-bold text-green-600">{analytics.passRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full" 
                          style={{ width: `${analytics.passRate}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fail Rate</span>
                        <span className="font-bold text-red-600">{analytics.failRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-red-500 h-3 rounded-full" 
                          style={{ width: `${analytics.failRate}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Grading Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{analytics.gradingProgress}%</div>
                        <p className="text-sm text-muted-foreground">Complete</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-blue-500 h-4 rounded-full transition-all duration-300" 
                          style={{ width: `${analytics.gradingProgress}%` }}
                        />
                      </div>
                      <div className="text-sm text-center text-muted-foreground">
                        {analytics.gradedSubmissions} of {analytics.totalSubmissions} submissions graded
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Average Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{analytics.averagePoints}</div>
                        <p className="text-sm text-muted-foreground">Points</p>
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        Based on {submissions.filter(s => s.points_awarded !== null).length} graded submissions
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Performers
                    </CardTitle>
                    <CardDescription>Students with highest average scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topPerformers.length > 0 ? (
                        analytics.topPerformers.map((student, index) => (
                          <div key={student.user_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-green-700">#{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium">{student.full_name || student.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.graded_submissions}/{student.total_submissions} graded
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {student.average_grade}%
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No graded submissions yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Students Needing Attention
                    </CardTitle>
                    <CardDescription>Students with pending work or low scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.strugglingStudents.length > 0 ? (
                        analytics.strugglingStudents.map((student, index) => (
                          <div key={student.user_id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-orange-700" />
                              </div>
                              <div>
                                <div className="font-medium">{student.full_name || student.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.pending_submissions} pending submissions
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-orange-600">
                              {student.average_grade ? `${student.average_grade}%` : 'No grades'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          All students are doing well!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assessment Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Submissions by Assessment Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.submissionsByAssessmentType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(count / analytics.totalSubmissions) * 100}%` }}
                            />
                          </div>
                          <span className="font-bold w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Grading Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Grading Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentActivity.length > 0 ? (
                      analytics.recentActivity.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getGradeBadge(submission.grade)}
                            <div>
                              <div className="font-medium">{submission.student_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {submission.node_title} - {submission.map_title}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(submission.graded_at!).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent grading activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}