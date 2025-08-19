import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getTeamById,
  updateTeam,
  deleteTeam,
  joinTeam,
  leaveTeam,
  removeMemberFromTeam,
  updateMemberRole,
  transferTeamLeadership,
} from "@/lib/supabase/teams";
import {
  TeamError,
  TeamValidationError,
  TeamPermissionError,
} from "@/types/teams";

// GET /api/classrooms/[id]/teams/[teamId] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; teamId: string } }
) {
  try {
    const team = await getTeamById(params.teamId);
    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching team:", error);

    if (error instanceof TeamError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "TEAM_NOT_FOUND" ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// PATCH /api/classrooms/[id]/teams/[teamId] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; teamId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "update_details": {
        const { name, description, max_members, team_metadata, is_active } =
          body;
        const team = await updateTeam(params.teamId, {
          name,
          description,
          max_members,
          team_metadata,
          is_active,
        });
        return NextResponse.json({ team });
      }

      case "join": {
        const { message } = body;
        const result = await joinTeam({
          team_id: params.teamId,
          message,
        });
        return NextResponse.json(result);
      }

      case "leave": {
        await leaveTeam(params.teamId);
        return NextResponse.json({ success: true });
      }

      case "remove_member": {
        const { user_id } = body;
        await removeMemberFromTeam(params.teamId, user_id);
        return NextResponse.json({ success: true });
      }

      case "update_member_role": {
        console.log("🔄 API: update_member_role action received:", body);
        const { user_id, role, is_leader, member_metadata } = body;
        console.log("📋 API: Extracted params:", {
          user_id,
          role,
          is_leader,
          member_metadata,
          teamId: params.teamId,
        });

        try {
          const membership = await updateMemberRole(params.teamId, user_id, {
            role,
            is_leader,
            member_metadata,
          });
          console.log("✅ API: updateMemberRole succeeded:", membership);
          return NextResponse.json({ membership });
        } catch (error) {
          console.error("❌ API: updateMemberRole failed:", error);
          throw error; // Re-throw to be handled by outer catch
        }
      }

      case "transfer_leadership": {
        const { new_leader_user_id } = body;
        await transferTeamLeadership(params.teamId, new_leader_user_id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating team:", error);

    if (error instanceof TeamValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          field: error.field,
        },
        { status: 400 }
      );
    }

    if (error instanceof TeamPermissionError) {
      return NextResponse.json(
        { error: error.message, action: error.action },
        { status: 403 }
      );
    }

    if (error instanceof TeamError) {
      const statusCode =
        error.code === "TEAM_NOT_FOUND"
          ? 404
          : error.code === "ALREADY_IN_TEAM"
            ? 409
            : error.code === "TEAM_FULL"
              ? 409
              : 400;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/[id]/teams/[teamId] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; teamId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await deleteTeam(params.teamId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);

    if (error instanceof TeamPermissionError) {
      return NextResponse.json(
        { error: error.message, action: error.action },
        { status: 403 }
      );
    }

    if (error instanceof TeamError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
