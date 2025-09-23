import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    // Get debug information with corrected relationships
    try {
      // Get assessment groups with members
      const { data: groups, error: groupsError } = await supabase
        .from("assessment_groups")
        .select(`
          id,
          group_name,
          assessment_id
        `);

      // Get group members separately
      const { data: groupMembers, error: membersError } = await supabase
        .from("assessment_group_members")
        .select(`
          group_id,
          user_id
        `);

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          full_name
        `);

      // Get submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("assessment_submissions")
        .select(`
          id,
          submitted_for_group,
          assessment_group_id,
          assessment_id,
          progress_id
        `);

      // Get student progress
      const { data: progress, error: progressError } = await supabase
        .from("student_node_progress")
        .select(`
          id,
          user_id
        `);

      if (groupsError || membersError || profilesError || submissionsError || progressError) {
        const error = groupsError || membersError || profilesError || submissionsError || progressError;
        console.error("Error getting debug info:", error);
        return NextResponse.json({ 
          error: "Failed to get debug info", 
          details: error?.message 
        }, { status: 500 });
      }

      // Combine the data manually
      const enrichedGroups = (groups || []).map(group => ({
        ...group,
        members: (groupMembers || [])
          .filter(member => member.group_id === group.id)
          .map(member => {
            const profile = (profiles || []).find(p => p.id === member.user_id);
            return {
              user_id: member.user_id,
              username: profile?.username,
              full_name: profile?.full_name
            };
          })
      }));

      const enrichedSubmissions = (submissions || []).map(submission => {
        const prog = (progress || []).find(p => p.id === submission.progress_id);
        const profile = prog ? (profiles || []).find(p => p.id === prog.user_id) : null;
        return {
          ...submission,
          user_id: prog?.user_id,
          username: profile?.username,
          full_name: profile?.full_name
        };
      });

      return NextResponse.json({ 
        groups: enrichedGroups,
        submissions: enrichedSubmissions,
        classroom_id: classroomId,
        debug: {
          groups_count: groups?.length || 0,
          members_count: groupMembers?.length || 0,
          profiles_count: profiles?.length || 0,
          submissions_count: submissions?.length || 0,
          progress_count: progress?.length || 0
        }
      });
    } catch (error) {
      console.error("Error in debug info:", error);
      return NextResponse.json({ 
        error: "Failed to get debug info", 
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in debug groups route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    // Implement fix logic directly in the API instead of using database function
    try {
      let fixedCount = 0;

      // Get all group information
      const { data: groups } = await supabase
        .from("assessment_groups")
        .select("id, group_name, assessment_id");

      const { data: groupMembers } = await supabase
        .from("assessment_group_members")
        .select("group_id, user_id");

      const { data: submissions } = await supabase
        .from("assessment_submissions")
        .select(`
          id,
          assessment_id,
          progress_id,
          submitted_for_group,
          assessment_group_id,
          text_answer,
          file_urls,
          image_url,
          quiz_answers,
          submitted_at,
          metadata
        `);

      const { data: progress } = await supabase
        .from("student_node_progress")
        .select("id, user_id, node_id");

      const { data: assessments } = await supabase
        .from("node_assessments")
        .select("id, node_id");

      if (!groups || !groupMembers || !submissions || !progress || !assessments) {
        throw new Error("Failed to fetch required data for fixing");
      }

      // Process each group
      for (const group of groups) {
        const members = groupMembers.filter(m => m.group_id === group.id);
        
        // Find submissions for this group's assessment
        const groupSubmissions = submissions.filter(s => s.assessment_id === group.assessment_id);
        
        // Check if any submission exists but isn't marked as group submission
        for (const submission of groupSubmissions) {
          const submissionProgress = progress.find(p => p.id === submission.progress_id);
          if (!submissionProgress) continue;

          // Check if this user is a group member
          const isGroupMember = members.some(m => m.user_id === submissionProgress.user_id);
          if (!isGroupMember) continue;

          // If this submission isn't marked as group submission, update it
          if (!submission.submitted_for_group || !submission.assessment_group_id) {
            await supabase
              .from("assessment_submissions")
              .update({
                submitted_for_group: true,
                assessment_group_id: group.id
              })
              .eq("id", submission.id);

            console.log(`Updated submission ${submission.id} to be group submission`);
          }

          // Create submissions for other group members who don't have submissions
          const submittingUserId = submissionProgress.user_id;
          const assessment = assessments.find(a => a.id === group.assessment_id);
          
          if (assessment) {
            for (const member of members) {
              if (member.user_id === submittingUserId) continue; // Skip the original submitter

              // Check if this member already has a submission
              const memberHasSubmission = groupSubmissions.some(s => {
                const memberProgress = progress.find(p => p.id === s.progress_id);
                return memberProgress?.user_id === member.user_id;
              });

              if (!memberHasSubmission) {
                // Get or create progress record for this member
                let memberProgress = progress.find(p => 
                  p.user_id === member.user_id && p.node_id === assessment.node_id
                );

                if (!memberProgress) {
                  const { data: newProgress, error: progressError } = await supabase
                    .from("student_node_progress")
                    .insert({
                      user_id: member.user_id,
                      node_id: assessment.node_id,
                      status: 'in_progress',
                      arrived_at: new Date().toISOString(),
                      started_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (progressError || !newProgress) {
                    console.error("Failed to create progress:", progressError);
                    continue;
                  }
                  memberProgress = newProgress;
                }

                // Create submission for this member
                const { error: submissionError } = await supabase
                  .from("assessment_submissions")
                  .insert({
                    progress_id: memberProgress.id,
                    assessment_id: group.assessment_id,
                    text_answer: submission.text_answer,
                    file_urls: submission.file_urls,
                    image_url: submission.image_url,
                    quiz_answers: submission.quiz_answers,
                    assessment_group_id: group.id,
                    submitted_for_group: true,
                    submitted_at: submission.submitted_at,
                    metadata: submission.metadata
                  });

                if (submissionError) {
                  console.error("Failed to create group submission:", submissionError);
                } else {
                  fixedCount++;
                  console.log(`Created group submission for user ${member.user_id}`);
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ 
        result: { fixed_submissions: fixedCount }, 
        message: `Fixed ${fixedCount} group submissions successfully`
      });

    } catch (error) {
      console.error("Error in fix logic:", error);
      return NextResponse.json({ 
        error: "Failed to fix group submissions", 
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in fix groups route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}