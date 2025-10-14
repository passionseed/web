import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Helper function to handle group grading in application layer
async function handleGroupGrading(
  supabase: any,
  submission_id: string,
  grade: "pass" | "fail",
  points_awarded: number | null,
  comments: string,
  graded_by: string,
  update_team_grades: boolean = true
) {
  try {
    // Check if this submission is for a group
    const { data: submission, error: submissionError } = await supabase
      .from("assessment_submissions")
      .select("assessment_group_id, submitted_for_group, assessment_id")
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission || !submission.submitted_for_group || !submission.assessment_group_id || !update_team_grades) {
      // Not a group submission, or team grade update is disabled, nothing to do
      return;
    }

    // Find all other group member submissions for the same assessment
    const { data: groupSubmissions, error: groupError } = await supabase
      .from("assessment_submissions")
      .select("id")
      .eq("assessment_group_id", submission.assessment_group_id)
      .eq("assessment_id", submission.assessment_id)
      .eq("submitted_for_group", true)
      .neq("id", submission_id); // Exclude the submission we just graded

    if (groupError || !groupSubmissions) {
      console.error("Error finding group submissions:", groupError);
      return;
    }

    // Grade each group member submission
    for (const groupSubmission of groupSubmissions) {
      // Check if this submission already has a grade
      const { data: existingGrade, error: gradeCheckError } = await supabase
        .from("submission_grades")
        .select("id")
        .eq("submission_id", groupSubmission.id)
        .single();

      const groupComments = comments + " (Team Grade - Updated Together)";

      if (gradeCheckError && gradeCheckError.code === 'PGRST116') {
        // No existing grade, insert new one
        const { error: insertError } = await supabase
          .from("submission_grades")
          .insert({
            submission_id: groupSubmission.id,
            grade,
            points_awarded,
            comments: groupComments,
            graded_at: new Date().toISOString(),
            graded_by
          });

        if (insertError) {
          console.error("Error creating group grade:", insertError);
        }
      } else if (existingGrade) {
        // Update existing grade
        const { error: updateError } = await supabase
          .from("submission_grades")
          .update({
            grade,
            points_awarded,
            comments: groupComments,
            graded_at: new Date().toISOString(),
            graded_by
          })
          .eq("id", existingGrade.id);

        if (updateError) {
          console.error("Error updating group grade:", updateError);
        }
      }
    }
  } catch (error) {
    console.error("Error in handleGroupGrading:", error);
    // Don't throw error to prevent breaking the main grading flow
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: classroomId } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user can manage this classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["instructor", "ta"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Step 1: Get all relevant map IDs
    const [classroomMapsResult, exclusiveMapsResult] = await Promise.all([
      supabase.from("classroom_maps").select("map_id").eq("classroom_id", classroomId),
      supabase.from("learning_maps").select("id").eq("map_type", "classroom_exclusive").eq("parent_classroom_id", classroomId)
    ]);

    if (classroomMapsResult.error) {
      console.error("Error fetching classroom maps:", classroomMapsResult.error);
      return NextResponse.json({ error: "Failed to fetch classroom maps" }, { status: 500 });
    }

    if (exclusiveMapsResult.error) {
      console.error("Error fetching exclusive maps:", exclusiveMapsResult.error);
      return NextResponse.json({ error: "Failed to fetch exclusive maps" }, { status: 500 });
    }

    const allMapIds = [
      ...(classroomMapsResult.data?.map(cm => cm.map_id) || []),
      ...(exclusiveMapsResult.data?.map(em => em.id) || [])
    ];

    if (allMapIds.length === 0) {
      return NextResponse.json({ submissions: [], students: [], all_assessments: [] });
    }

    // Step 2: Get nodes and assessments
    const { data: allNodes, error: nodesError } = await supabase
      .from("map_nodes")
      .select("id, title, map_id")
      .in("map_id", allMapIds);

    if (nodesError) {
      console.error("Error fetching nodes:", nodesError);
      return NextResponse.json({ error: "Failed to fetch nodes" }, { status: 500 });
    }

    if (!allNodes || allNodes.length === 0) {
      return NextResponse.json({ submissions: [], students: [], all_assessments: [] });
    }

    const nodeIds = allNodes.map(n => n.id);

    const { data: allAssessments, error: assessmentsError } = await supabase
      .from("node_assessments")
      .select(`
        id, node_id, assessment_type, is_graded, points_possible,
        is_group_assessment, group_formation_method, group_submission_mode,
        target_group_size, allow_uneven_groups
      `)
      .in("node_id", nodeIds);

    if (assessmentsError) {
      console.error("Error fetching assessments:", assessmentsError);
      return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
    }

    if (!allAssessments || allAssessments.length === 0) {
      return NextResponse.json({ submissions: [], students: [], all_assessments: [] });
    }

    const assessmentIds = allAssessments.map(a => a.id);
    
    // Identify group assessments
    const groupAssessmentIds = allAssessments.filter(a => a.is_group_assessment).map(a => a.id);
    
    // Step 2.5: Get assessment groups for group assessments
    let allGroups: any[] = [];
    let allGroupMembers: any[] = [];
    
    if (groupAssessmentIds.length > 0) {
      const { data: groups, error: groupsError } = await supabase
        .from("assessment_groups")
        .select(`
          id, assessment_id, group_name, group_number,
          assessment_group_members (
            user_id,
            profiles (
              id, username, full_name, email
            )
          )
        `)
        .in("assessment_id", groupAssessmentIds);
      
      if (groupsError) {
        console.error("Error fetching assessment groups:", groupsError);
      } else {
        allGroups = groups || [];
        // Flatten group members for easy lookup
        allGroupMembers = allGroups.flatMap(group => 
          group.assessment_group_members?.map((member: any) => ({
            user_id: member.user_id,
            group_id: group.id,
            assessment_id: group.assessment_id,
            group_name: group.group_name,
            group_number: group.group_number,
            profile: member.profiles
          })) || []
        );
      }
    }

    // Step 3: Get submissions with group information
    const { data: submissions, error: submissionsError } = await supabase
      .from("assessment_submissions")
      .select(`
        id, submitted_at, text_answer, file_urls, image_url, quiz_answers, 
        submitted_for_group, assessment_group_id, progress_id, assessment_id,
        assessment_groups(id, group_number, group_name)
      `)
      .in("assessment_id", assessmentIds)
      .order("submitted_at", { ascending: false });

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }

    // Step 4: Get related data
    const submissionIds = submissions?.map(s => s.id) || [];
    const progressIds = submissions?.map(s => s.progress_id) || [];

    const [gradesResult, progressResult] = await Promise.all([
      supabase.from("submission_grades").select("*").in("submission_id", submissionIds),
      supabase.from("student_node_progress").select("id, user_id").in("id", progressIds)
    ]);

    const grades = gradesResult.data || [];
    const progressData = progressResult.data || [];

    // Step 5: Get user profiles and classroom members
    const submissionUserIds = progressData.map(p => p.user_id);
    
    const [profilesResult, membersResult] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, email, avatar_url").in("id", submissionUserIds),
      supabase.from("classroom_memberships").select("user_id").eq("classroom_id", classroomId).eq("role", "student")
    ]);

    if (membersResult.error) {
      console.error("Error fetching classroom members:", membersResult.error);
      return NextResponse.json({ error: "Failed to fetch classroom members" }, { status: 500 });
    }

    const submissionProfiles = profilesResult.data || [];
    const classroomMembers = membersResult.data || [];

    // Get additional profiles for members not in submissions
    const classroomUserIds = classroomMembers.map(m => m.user_id);
    const missingUserIds = classroomUserIds.filter(id => !submissionUserIds.includes(id));
    
    let additionalProfiles = [];
    if (missingUserIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, avatar_url")
        .in("id", missingUserIds);
      additionalProfiles = data || [];
    }

    // Step 6: Get map data
    const { data: maps, error: mapsError } = await supabase
      .from("learning_maps")
      .select("id, title")
      .in("id", allMapIds);

    if (mapsError) {
      console.error("Error fetching maps:", mapsError);
      return NextResponse.json({ error: "Failed to fetch maps" }, { status: 500 });
    }

    // Step 7: Create lookup maps for efficient data combination
    const allProfiles = [...submissionProfiles, ...additionalProfiles];
    const gradesMap = new Map(grades.map(g => [g.submission_id, g]));
    const progressMap = new Map(progressData.map(p => [p.id, p]));
    const profilesMap = new Map(allProfiles.map(p => [p.id, p]));
    const assessmentsMap = new Map(allAssessments.map(a => [a.id, a]));
    const nodesMap = new Map(allNodes.map(n => [n.id, n]));
    const mapsMap = new Map((maps || []).map(m => [m.id, m]));

    // Step 8: Transform submissions with group expansion
    const transformedSubmissions: any[] = [];
    
    (submissions || []).forEach((submission: any) => {
      const grade = gradesMap.get(submission.id);
      const progress = progressMap.get(submission.progress_id);
      const originalStudent = progress ? profilesMap.get(progress.user_id) : null;
      const assessment = assessmentsMap.get(submission.assessment_id);
      const node = assessment ? nodesMap.get(assessment.node_id) : null;
      const map = node ? mapsMap.get(node.map_id) : null;

      // Base submission data
      const baseSubmission = {
        id: submission.id,
        map_title: map?.title || 'Unknown Map',
        node_title: node?.title || 'Unknown Node',
        assessment_type: assessment?.assessment_type || 'unknown',
        assessment_id: submission.assessment_id,
        text_answer: submission.text_answer,
        file_urls: submission.file_urls,
        image_url: submission.image_url,
        quiz_answers: submission.quiz_answers,
        submitted_at: submission.submitted_at,
        grade: grade?.grade || null,
        points_awarded: grade?.points_awarded || null,
        comments: grade?.comments || null,
        graded_at: grade?.graded_at || null,
        graded_by: grade?.graded_by || null,
        status: grade ? "graded" : "ungraded",
        is_grading_enabled: assessment?.is_graded || false,
        points_possible: assessment?.points_possible || null,
        submitted_for_group: submission.submitted_for_group || false,
        assessment_group_id: submission.assessment_group_id || null,
        group_number: submission.assessment_groups?.group_number || null,
        group_name: submission.assessment_groups?.group_name || null,
        is_group_assessment: assessment?.is_group_assessment || false
      };

      // Check if this is a group assessment submission
      if (assessment?.is_group_assessment && submission.submitted_for_group && submission.assessment_group_id) {
        // Find all group members for this group
        const groupMembers = allGroupMembers.filter(member => 
          member.group_id === submission.assessment_group_id
        );
        
        if (groupMembers.length > 0) {
          // Create a submission entry for each group member
          groupMembers.forEach((groupMember: any) => {
            const memberStudent = profilesMap.get(groupMember.user_id);
            const isOriginalSubmitter = groupMember.user_id === progress?.user_id;
            
            transformedSubmissions.push({
              ...baseSubmission,
              student_user_id: groupMember.user_id,
              student_name: memberStudent ? (memberStudent.full_name || memberStudent.username) : 
                           (groupMember.profile?.full_name || groupMember.profile?.username || 'Unknown Student'),
              is_original_submitter: isOriginalSubmitter,
              group_member_role: isOriginalSubmitter ? 'submitter' : 'member'
            });
          });
        } else {
          // Fallback: if no group members found, show original submitter only
          transformedSubmissions.push({
            ...baseSubmission,
            student_user_id: progress?.user_id || null,
            student_name: originalStudent ? (originalStudent.full_name || originalStudent.username) : 'Unknown Student',
            is_original_submitter: true,
            group_member_role: 'submitter'
          });
        }
      } else {
        // Regular individual submission
        transformedSubmissions.push({
          ...baseSubmission,
          student_user_id: progress?.user_id || null,
          student_name: originalStudent ? (originalStudent.full_name || originalStudent.username) : 'Unknown Student',
          is_original_submitter: true,
          group_member_role: null
        });
      }
    });

    // Step 9: Build student data
    const studentMap = new Map();
    
    classroomMembers.forEach((membership: any) => {
      const studentId = membership.user_id;
      const profile = profilesMap.get(studentId);
      
      const username = profile?.username || `user_${studentId.slice(-8)}`;
      const fullName = profile?.full_name || username;
      const email = profile?.email || "";
      const avatarUrl = profile?.avatar_url || null;
      
      studentMap.set(studentId, {
        user_id: studentId,
        username: username,
        full_name: fullName,
        email: email,
        avatar_url: avatarUrl,
        submissions: [],
        total_submissions: 0,
        graded_submissions: 0,
        pending_submissions: 0,
        total_points: 0,
        graded_count: 0
      });
    });
    
    // Add submission data to students with group awareness
    transformedSubmissions.forEach((submission: any) => {
      const studentId = submission.student_user_id;
      const student = studentMap.get(studentId);
      
      if (student) {
        // Avoid duplicate submissions for the same assessment (group members share the same submission)
        const existingSubmissionForAssessment = student.submissions.find(
          (s: any) => s.assessment_id === submission.assessment_id && s.id === submission.id
        );
        
        if (!existingSubmissionForAssessment) {
          student.submissions.push({
            ...submission,
            // Add group context for display
            display_status: submission.is_group_assessment ? 
              (submission.is_original_submitter ? 
                `Group ${submission.group_name || 'Member'} (Submitted)` : 
                `Group ${submission.group_name || 'Member'} (Member)`
              ) : submission.status
          });
          student.total_submissions++;
          
          if (submission.status === "graded") {
            student.graded_submissions++;
            if (submission.points_awarded !== null) {
              student.total_points += submission.points_awarded;
              student.graded_count++;
            }
          } else {
            student.pending_submissions++;
          }
        }
      }
    });

    const students = Array.from(studentMap.values()).map((student: any) => ({
      ...student,
      average_grade: student.graded_count > 0 ? Math.round(student.total_points / student.graded_count) : null
    }));

    // Step 10: Build assessments list with group information
    const allAssessmentNodes = allAssessments.map((assessment: any) => {
      const node = nodesMap.get(assessment.node_id);
      const map = node ? mapsMap.get(node.map_id) : null;
      
      return {
        id: assessment.id,
        title: node?.title || 'Unknown Node',
        map_title: map?.title || 'Unknown Map',
        assessment_type: assessment.assessment_type,
        is_grading_enabled: assessment.is_graded,
        points_possible: assessment.points_possible,
        assessment_id: assessment.id,
        node_id: assessment.node_id,
        is_group_assessment: assessment.is_group_assessment || false,
        group_formation_method: assessment.group_formation_method,
        group_submission_mode: assessment.group_submission_mode,
        target_group_size: assessment.target_group_size
      };
    });

    // Add debug information
    const debugInfo = {
      total_assessments: allAssessments.length,
      group_assessments: groupAssessmentIds.length,
      total_groups: allGroups.length,
      total_group_members: allGroupMembers.length,
      total_submissions: submissions?.length || 0,
      transformed_submissions: transformedSubmissions.length,
      students_count: students.length
    };

    console.log("🔧 GRADING DEBUG INFO:", debugInfo);

    return NextResponse.json({
      submissions: transformedSubmissions,
      students: students,
      all_assessments: allAssessmentNodes,
      debug: debugInfo,
      groups: allGroups.map(g => ({
        id: g.id,
        assessment_id: g.assessment_id,
        group_name: g.group_name,
        members: g.assessment_group_members?.map((m: any) => ({
          user_id: m.user_id,
          username: m.profiles?.username,
          full_name: m.profiles?.full_name
        })) || []
      }))
    });

  } catch (error) {
    console.error("Error in grading route:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Basic parsing
    const { id: classroomId } = await params;
    const body = await request.json();
    const { submission_id, grade, points_awarded, comments, update_team_grades } = body;
    
    // Step 2: Create supabase client
    const supabase = await createClient();
    
    // Step 3: Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Step 4: Check classroom membership
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !["instructor", "ta"].includes(membership.role)) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Step 5: Check for existing grade
    const { data: existingGrade, error: gradeCheckError } = await supabase
      .from("submission_grades")
      .select("id")
      .eq("submission_id", submission_id)
      .single();

    if (gradeCheckError && gradeCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if no grade exists
      return NextResponse.json({ 
        error: "Failed to check existing grade", 
        details: gradeCheckError.message 
      }, { status: 500 });
    }

    // Step 6: Insert or update grade
    if (existingGrade) {
      const { error: updateError } = await supabase
        .from("submission_grades")
        .update({
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        })
        .eq("id", existingGrade.id);

      if (updateError) {
        return NextResponse.json({ 
          error: "Failed to update grade", 
          details: updateError.message 
        }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from("submission_grades")
        .insert({
          submission_id,
          grade,
          points_awarded,
          comments,
          graded_at: new Date().toISOString(),
          graded_by: user.id
        });

      if (insertError) {
        return NextResponse.json({ 
          error: "Failed to create grade", 
          details: insertError.message 
        }, { status: 500 });
      }
    }

    // Step 7: Handle group grading in application layer
    await handleGroupGrading(supabase, submission_id, grade, points_awarded, comments, user.id, update_team_grades);

    return NextResponse.json({ message: "Grade submitted successfully" });

  } catch (error) {
    console.error("Error in grading POST route:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}