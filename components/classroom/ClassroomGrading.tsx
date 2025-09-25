"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { GradeCell } from "./GradeCell";
import { 
  GraduationCap, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  BarChart3,
  PieChart,
  Award,
  TrendingDown,
  AlertCircle,
  FileSpreadsheet
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
  assessment_id: string;
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
  points_possible: number | null;
  submitted_for_group: boolean;
  assessment_group_id: string | null;
  group_number: number | null;
  group_name: string | null;
}

interface AssignmentNode {
  id: string;
  title: string;
  assignment_title?: string;
  map_title: string;
  assessment_type: string;
  is_grading_enabled: boolean;
  points_possible?: number;
}

interface GradebookMatrix {
  [studentId: string]: {
    [nodeId: string]: Submission | undefined;
  };
}

interface ClassroomGradingProps {
  classroomId: string;
  canManage: boolean;
}

export function ClassroomGrading({ classroomId, canManage }: ClassroomGradingProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignmentNodes, setAssignmentNodes] = useState<AssignmentNode[]>([]);
  const [allAssessments, setAllAssessments] = useState<AssignmentNode[]>([]);
  const [gradebookMatrix, setGradebookMatrix] = useState<GradebookMatrix>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grading, setGrading] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [viewMode, setViewMode] = useState<"gradebook" | "analytics">("gradebook");
  const [sortBy, setSortBy] = useState<"name" | "id" | "email">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedMapFilter, setSelectedMapFilter] = useState<string>("all");
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [updateTeamGrades, setUpdateTeamGrades] = useState(false);
  const [fixingGroups, setFixingGroups] = useState(false);
  const [debuggingGroups, setDebuggingGroups] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
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
    points: "" as string,
    comments: ""
  });


  useEffect(() => {
    if (canManage) {
      loadGradingData();
    }
  }, [classroomId, canManage]);

  // Create a mapping of group IDs to sequential numbers
  const groupIdToNumber = React.useMemo(() => {
    const groupIds = new Set<string>();
    submissions.forEach(submission => {
      if (submission.submitted_for_group && submission.assessment_group_id) {
        groupIds.add(submission.assessment_group_id);
      }
    });
    
    const mapping = new Map<string, number>();
    Array.from(groupIds).sort().forEach((groupId, index) => {
      mapping.set(groupId, index + 1);
    });
    
    return mapping;
  }, [submissions]);

  useEffect(() => {
    if (students.length > 0 && allAssessments.length > 0) {
      createGradebookMatrix();
    }
  }, [students, submissions, allAssessments, selectedMapFilter]);

  const loadGradingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classrooms/${classroomId}/grading`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        setSubmissions(data.submissions || []);
        setAllAssessments(data.all_assessments || []);
      } else {
        const errorData = await response.text();
        console.error("Grading API error response:", response.status, errorData);
        throw new Error(`Failed to fetch grading data: ${response.status} - ${errorData}`);
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

  const createGradebookMatrix = () => {
    // Use filtered assessments instead of all assessments
    const nodes = filteredAssessments;
    setAssignmentNodes(nodes);

    console.log("Creating gradebook matrix:", {
      studentsCount: students.length,
      nodesCount: nodes.length,
      submissionsCount: submissions.length,
      sampleNode: nodes[0],
      sampleSubmission: submissions[0]
    });

    // Create matrix: student -> node -> submission
    const matrix: GradebookMatrix = {};
    
    students.forEach(student => {
      matrix[student.user_id] = {};
      nodes.forEach(node => {
        // Find submission for this student and assessment
        const submission = submissions.find(sub => 
          sub.student_user_id === student.user_id && 
          sub.assessment_id === node.id
        );
        matrix[student.user_id][node.id] = submission;
      });
    });

    console.log("Gradebook matrix created:", matrix);
    setGradebookMatrix(matrix);
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
          comments,
          update_team_grades: selectedSubmission?.submitted_for_group ? updateTeamGrades : false
        })
      });

      if (response.ok) {
        const successMessage = selectedSubmission?.submitted_for_group && updateTeamGrades 
          ? `Grade updated for all ${groupMembers.length} team members`
          : selectedSubmission?.status === "graded" 
            ? "Grade updated successfully"
            : "Submission has been graded";
            
        toast({
          title: selectedSubmission?.status === "graded" ? "Grade Updated" : "Graded Successfully",
          description: successMessage,
        });
        loadGradingData(); // Refresh data
        setSelectedSubmission(null);
        setShowGradingModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Grading failed:", { 
          status: response.status, 
          statusText: response.statusText,
          errorData 
        });
        throw new Error(`Failed to grade submission: ${response.status} ${response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
      }
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Grading Failed",
        description: error instanceof Error ? error.message : "Failed to grade submission",
        variant: "destructive",
      });
    } finally {
      setGrading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      setLoadingGroupMembers(true);
      console.log("Loading group members for group:", groupId);
      const response = await fetch(`/api/classrooms/${classroomId}/grading/group-members?groupId=${groupId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("Group members data:", data);
        setGroupMembers(data.members || []);
      } else {
        const errorText = await response.text();
        console.error("Failed to load group members:", response.status, errorText);
        setGroupMembers([]);
      }
    } catch (error) {
      console.error("Error loading group members:", error);
      setGroupMembers([]);
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExportingExcel(true);
      
      // Prepare data for export
      const exportData = filteredStudents.map(student => {
        const studentData: any = {
          'Student Name': student.full_name || student.username,
          'Email': student.email,
          'Total Submissions': student.total_submissions,
          'Graded Submissions': student.graded_submissions,
          'Pending Submissions': student.pending_submissions,
          'Average Grade': student.average_grade ? `${student.average_grade}%` : 'No grades yet'
        };

        // Add each assignment as a column
        assignmentNodes.forEach(node => {
          const submission = gradebookMatrix[student.user_id]?.[node.id];
          const columnName = `${node.title} (${node.map_title})`;
          
          if (submission) {
            let cellValue = '';
            if (submission.is_grading_enabled && submission.points_awarded !== null) {
              cellValue = `${submission.grade?.toUpperCase() || 'Not Graded'} (${submission.points_awarded}pts)`;
            } else {
              cellValue = submission.grade?.toUpperCase() || 'Not Graded';
            }
            // Add group info only for submitted group work
            if (submission.submitted_for_group && submission.group_number) {
              cellValue += ` [G${submission.group_number}]`;
            }
            studentData[columnName] = cellValue;
          } else {
            studentData[columnName] = 'Not Submitted';
          }
        });

        return studentData;
      });

      // Convert to CSV (simple Excel-compatible format)
      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No student data available to export",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes for CSV
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `classroom-grades-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Export Successful",
        description: "Grades have been exported to CSV file",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export grades",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const debugGroupSubmissions = async () => {
    try {
      setDebuggingGroups(true);
      const response = await fetch(`/api/classrooms/${classroomId}/debug-groups`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Debug info:", data);
        toast({
          title: "Debug Info",
          description: `Found ${data.groups?.length || 0} groups and ${data.submissions?.length || 0} submissions`,
        });
      } else {
        const errorData = await response.text();
        console.error("Debug API Error:", response.status, errorData);
        throw new Error(`Debug API Error: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error("Error debugging group submissions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to debug group submissions",
        variant: "destructive",
      });
    } finally {
      setDebuggingGroups(false);
    }
  };

  const fixGroupSubmissions = async () => {
    try {
      setFixingGroups(true);
      const response = await fetch(`/api/classrooms/${classroomId}/debug-groups`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Group Submissions Fixed",
          description: `Fixed ${data.result?.fixed_submissions || 0} group submissions`,
        });
        // Reload grading data to see the changes
        loadGradingData();
      } else {
        // Get the actual error message from the response
        const errorData = await response.text();
        console.error("API Error:", response.status, errorData);
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error("Error fixing group submissions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix group submissions",
        variant: "destructive",
      });
    } finally {
      setFixingGroups(false);
    }
  };

  const handleCellClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradingForm({
      grade: submission.grade || "pass",
      points: submission.points_awarded?.toString() || "",
      comments: submission.comments || ""
    });
    
    // Load group members if this is a group submission
    if (submission.submitted_for_group && submission.assessment_group_id) {
      loadGroupMembers(submission.assessment_group_id);
      // Set default based on whether it's already graded or not
      setUpdateTeamGrades(submission.status === "ungraded");
    } else {
      setGroupMembers([]);
      setUpdateTeamGrades(false);
    }
    
    setShowGradingModal(true);
  };

  // Get unique maps from assessments
  const availableMaps = Array.from(new Set(allAssessments.map(assessment => assessment.map_title)));

  // Filter assessments by selected map
  const filteredAssessments = selectedMapFilter === "all" 
    ? allAssessments 
    : allAssessments.filter(assessment => assessment.map_title === selectedMapFilter);

  const filteredStudents = students
    .filter(student => {
      return !searchTerm || 
        student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      let aValue: string, bValue: string;
      
      switch (sortBy) {
        case "name":
          aValue = (a.full_name || a.username).toLowerCase();
          bValue = (b.full_name || b.username).toLowerCase();
          break;
        case "id":
          aValue = a.user_id.toLowerCase();
          bValue = b.user_id.toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        default:
          aValue = (a.full_name || a.username).toLowerCase();
          bValue = (b.full_name || b.username).toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return <Badge variant="default" className="bg-green-900 text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>;
      case "ungraded":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getGradeBadge = (grade: "pass" | "fail" | null) => {
    if (grade === "pass") {
      return <Badge variant="default" className="bg-green-900 text-green-200">Pass</Badge>;
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
            Classroom Gradebook
          </CardTitle>
          <CardDescription>
            Grade student submissions in an interactive gradebook format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{allAssessments.length}</div>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {submissions.filter(s => s.status === "ungraded").length}
                </div>
                <p className="text-sm text-muted-foreground">Need Grading</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Map Filter */}
            <div className="w-48">
              <Select value={selectedMapFilter} onValueChange={setSelectedMapFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Maps</SelectItem>
                  {availableMaps.map((mapTitle) => (
                    <SelectItem key={mapTitle} value={mapTitle}>
                      {mapTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sorting Controls */}
            <div className="flex gap-2 items-center">
              <Select value={sortBy} onValueChange={(value: "name" | "id" | "email") => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="id">User ID</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-2"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === "gradebook" ? "default" : "outline"}
                onClick={() => setViewMode("gradebook")}
                size="sm"
              >
                Gradebook
              </Button>
              <Button
                variant={viewMode === "analytics" ? "default" : "outline"}
                onClick={() => setViewMode("analytics")}
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={exportingExcel}
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                {exportingExcel ? "Exporting..." : "Export Excel"}
              </Button>
              <Button
                variant="outline"
                onClick={debugGroupSubmissions}
                disabled={debuggingGroups}
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
              >
                {debuggingGroups ? "Debugging..." : "Debug Groups"}
              </Button>
              <Button
                variant="outline"
                onClick={fixGroupSubmissions}
                disabled={fixingGroups}
                size="sm"
                className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white"
              >
                {fixingGroups ? "Fixing..." : "Fix Groups"}
              </Button>
            </div>
          </div>

          {/* Main Content */}
          {viewMode === "gradebook" ? (
            <div className="space-y-4">
              {/* Gradebook Grid */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-full" style={{ display: 'table', width: '100%' }}>
                    {/* Header Row */}
                    <div className="flex bg-gray-900 border-b border-gray-700 sticky top-0 z-10" style={{ minWidth: 'max-content' }}>
                      {/* Student Column Header */}
                      <div className="w-48 p-3 border-r border-gray-700 bg-gray-900 font-semibold text-sm sticky left-0 z-20 text-gray-100 flex-shrink-0">
                        Student
                      </div>
                      {/* Assignment Headers */}
                      {assignmentNodes.map((node) => (
                        <div key={node.id} className="w-32 p-2 border-r border-gray-700 text-center flex-shrink-0">
                          <div className="font-medium text-xs line-clamp-2 text-gray-100" title={node.title}>{node.title}</div>
                          <div className="text-xs text-gray-400 mt-1" title={node.map_title}>{node.map_title}</div>
                          {node.is_grading_enabled && (
                            <div className="text-xs text-blue-400">
                              Points{node.points_possible ? ` (Max: ${node.points_possible})` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Student Rows */}
                    {filteredStudents.map((student) => (
                      <div key={student.user_id} className="flex hover:bg-gray-800 border-b border-gray-700" style={{ minWidth: 'max-content' }}>
                        {/* Student Info */}
                        <div className="w-48 p-3 border-r border-gray-700 bg-gray-900 sticky left-0 z-10 flex-shrink-0">
                          <div className="font-medium text-sm text-gray-100">{student.full_name || student.username}</div>
                        </div>
                        {/* Grade Cells */}
                        {assignmentNodes.map((node) => {
                          const submission = gradebookMatrix[student.user_id]?.[node.id];
                          return (
                            <div key={`${student.user_id}-${node.id}`} className="w-32 border-r border-gray-700 py-3 relative flex-shrink-0">
                              <GradeCell
                                submission={submission}
                                onClick={() => {
                                  if (submission) {
                                    handleCellClick(submission);
                                  }
                                }}
                              />
                              {/* Show group badge only for submitted group work */}
                              {submission?.submitted_for_group && (
                                <div className="absolute bottom-1 right-1 z-10">
                                  <Badge variant="secondary" className="px-1 py-0 text-xs bg-blue-600 border-blue-400 text-white font-bold" style={{ fontSize: '8px', lineHeight: '12px' }}>
                                    {submission.group_number ? `G${submission.group_number}` : (submission.assessment_group_id ? `G${groupIdToNumber.get(submission.assessment_group_id) || '?'}` : 'G')}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Analytics View
            <div className="space-y-6">
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
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full" 
                          style={{ width: `${analytics.passRate}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fail Rate</span>
                        <span className="font-bold text-red-600">{analytics.failRate}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
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
                      <div className="w-full bg-gray-700 rounded-full h-4">
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
                          <div key={student.user_id} className="flex items-center justify-between p-3 bg-green-900 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-green-200">#{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium">{student.full_name || student.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.graded_submissions}/{student.total_submissions} graded
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-green-300">
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
                          <div key={student.user_id} className="flex items-center justify-between p-3 bg-orange-900 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-800 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-orange-200" />
                              </div>
                              <div>
                                <div className="font-medium">{student.full_name || student.username}</div>
                                <div className="text-sm text-muted-foreground">
                                  {student.pending_submissions} pending submissions
                                </div>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-orange-300">
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
                          <div className="w-32 bg-gray-700 rounded-full h-2">
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
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Modal */}
      <Dialog open={showGradingModal} onOpenChange={setShowGradingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission?.status === "graded" ? "Review Submission" : "Grade Submission"}
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission?.student_name} - {selectedSubmission?.node_title}
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
                      <div className="mt-2 p-3 bg-gray-800 rounded-md text-gray-100">
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
                          <div key={question} className="p-3 bg-gray-800 rounded-md">
                            <div className="font-medium text-sm text-gray-100">{question}</div>
                            <div className="text-sm text-gray-400 mt-1">{answer}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Group Information */}
              {selectedSubmission.submitted_for_group && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge variant="secondary">Group Assessment</Badge>
                      Group Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingGroupMembers ? (
                      <div className="text-center py-4">Loading group members...</div>
                    ) : groupMembers.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          When you grade this submission, all group members will receive the same grade automatically.
                        </p>
                        <div className="space-y-2">
                          {groupMembers.map((member) => (
                            <div key={member.user_id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-md">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {member.display_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{member.display_name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No group members found
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Grading Form */}
              {selectedSubmission.status === "ungraded" && (
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
                          <Label>
                            Points{selectedSubmission?.points_possible ? ` (Max: ${selectedSubmission.points_possible})` : ''} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            value={gradingForm.points}
                            onChange={(e) => setGradingForm(prev => ({ ...prev, points: e.target.value }))}
                            max={selectedSubmission?.points_possible || undefined}
                            placeholder="Enter points"
                            className={!gradingForm.points.trim() ? "border-red-500" : ""}
                          />
                          {!gradingForm.points.trim() && (
                            <p className="text-sm text-red-500 mt-1">Points are required</p>
                          )}
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
                    
                    {/* Team Grade Option for Initial Grading */}
                    {selectedSubmission?.submitted_for_group && groupMembers.length > 0 && (
                      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="applyToTeam"
                            checked={updateTeamGrades}
                            onChange={(e) => setUpdateTeamGrades(e.target.checked)}
                            className="rounded"
                            defaultChecked={true}
                          />
                          <Label htmlFor="applyToTeam" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Apply this grade to all team members ({groupMembers.length} members)
                          </Label>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                          This is a team submission. By default, all team members will receive this grade.
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => handleGradeSubmission(
                        selectedSubmission.id,
                        gradingForm.grade,
                        selectedSubmission?.is_grading_enabled ? (gradingForm.points ? parseInt(gradingForm.points) : null) : null,
                        gradingForm.comments
                      )}
                      disabled={grading || (selectedSubmission?.is_grading_enabled && !gradingForm.points.trim())}
                      className="w-full"
                    >
                      {grading ? "Grading..." : "Submit Grade"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Edit Grade Form for Already Graded Submissions */}
              {selectedSubmission.status === "graded" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Edit Grade</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Originally graded on {new Date(selectedSubmission.graded_at!).toLocaleDateString()}
                    </div>
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
                          <Label>
                            Points{selectedSubmission?.points_possible ? ` (Max: ${selectedSubmission.points_possible})` : ''} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            value={gradingForm.points}
                            onChange={(e) => setGradingForm(prev => ({ ...prev, points: e.target.value }))}
                            max={selectedSubmission?.points_possible || undefined}
                            placeholder="Enter points"
                            className={!gradingForm.points.trim() ? "border-red-500" : ""}
                          />
                          {!gradingForm.points.trim() && (
                            <p className="text-sm text-red-500 mt-1">Points are required</p>
                          )}
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
                    
                    {/* Team Grade Update Option */}
                    {selectedSubmission.submitted_for_group && groupMembers.length > 0 && (
                      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="updateTeamGrades"
                            checked={updateTeamGrades}
                            onChange={(e) => setUpdateTeamGrades(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="updateTeamGrades" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Update grade for all team members ({groupMembers.length} members)
                          </Label>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                          When checked, this grade change will be applied to all members of this group
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => handleGradeSubmission(
                        selectedSubmission.id,
                        gradingForm.grade,
                        selectedSubmission?.is_grading_enabled ? (gradingForm.points ? parseInt(gradingForm.points) : null) : null,
                        gradingForm.comments
                      )}
                      disabled={grading || (selectedSubmission?.is_grading_enabled && !gradingForm.points.trim())}
                      className="w-full"
                    >
                      {grading ? "Updating Grade..." : "Update Grade"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}