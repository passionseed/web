import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId } = await params;

    // Get classroom with user's membership to check permissions
    const { data: classroom, error: classroomError } = await supabase
      .from("classrooms")
      .select(`
        *,
        classroom_memberships!inner (
          role
        )
      `)
      .eq("id", classroomId)
      .eq("classroom_memberships.user_id", data.user.id)
      .single();

    if (classroomError) {
      console.error("Classroom fetch error:", classroomError);
      return NextResponse.json(
        { error: "Classroom not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(classroom);
  } catch (error) {
    console.error("Classroom fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔵 [PATCH Classroom] Starting update request");
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.log("❌ [PATCH Classroom] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔵 [PATCH Classroom] User:", data.user.id);

    const { id: classroomId } = await params;
    console.log("🔵 [PATCH Classroom] Classroom ID:", classroomId);
    const body = await request.json();
    console.log("🔵 [PATCH Classroom] Request body:", body);

    // Validate permissions - instructors, TAs, and global admins can update classroom
    console.log("🔵 [PATCH Classroom] Checking membership...");
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", data.user.id)
      .single();

    console.log("🔵 [PATCH Classroom] Membership result:", { membership, membershipError });

    // Check if user is a global admin
    console.log("🔵 [PATCH Classroom] Checking admin role...");
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    console.log("🔵 [PATCH Classroom] User roles:", userRoles);

    const isAdmin = userRoles?.some(r => r.role === "admin") || false;
    const canManage = membership?.role === "instructor" || membership?.role === "ta" || isAdmin;

    console.log("🔵 [PATCH Classroom] Permission check:", { isAdmin, role: membership?.role, canManage });

    if (membershipError && !isAdmin) {
      console.log("❌ [PATCH Classroom] Not a member");
      return NextResponse.json(
        { error: "You must be a member of this classroom" },
        { status: 403 }
      );
    }

    if (!canManage) {
      console.log("❌ [PATCH Classroom] No permission to manage");
      return NextResponse.json(
        { error: "Only instructors, TAs, and admins can modify classroom settings" },
        { status: 403 }
      );
    }

    console.log("✅ [PATCH Classroom] Permission granted, proceeding with update");

    // Validate and sanitize input
    console.log("🔵 [PATCH Classroom] Validating input fields...");
    const allowedFields = {
      name: body.name,
      description: body.description,
      max_students: body.max_students,
      is_active: body.is_active,
      enable_assignments: body.enable_assignments,
    };

    // Remove undefined fields
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    console.log("🔵 [PATCH Classroom] Update data:", updateData);

    // Validate constraints
    if (updateData.name !== undefined) {
      console.log("🔵 [PATCH Classroom] Validating name:", updateData.name);
      if (typeof updateData.name !== "string" || updateData.name.trim().length === 0) {
        console.log("❌ [PATCH Classroom] Invalid name");
        return NextResponse.json(
          { error: "Name is required and must be a valid string" },
          { status: 400 }
        );
      }
      if (updateData.name.length > 500) {
        console.log("❌ [PATCH Classroom] Name too long");
        return NextResponse.json(
          { error: "Name must be 500 characters or less" },
          { status: 400 }
        );
      }
      updateData.name = updateData.name.trim();
      console.log("✅ [PATCH Classroom] Name validated:", updateData.name);
    }

    if (updateData.description !== undefined && updateData.description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less" },
        { status: 400 }
      );
    }

    if (updateData.max_students !== undefined) {
      const maxStudents = parseInt(updateData.max_students as any);
      if (isNaN(maxStudents) || maxStudents < 1 || maxStudents > 1000) {
        return NextResponse.json(
          { error: "Maximum students must be between 1 and 1000" },
          { status: 400 }
        );
      }
      updateData.max_students = maxStudents;
    }

    if (updateData.is_active !== undefined) {
      if (typeof updateData.is_active !== "boolean") {
        return NextResponse.json(
          { error: "Active status must be a boolean value" },
          { status: 400 }
        );
      }
    }

    if (updateData.enable_assignments !== undefined) {
      if (typeof updateData.enable_assignments !== "boolean") {
        return NextResponse.json(
          { error: "Assignment setting must be a boolean value" },
          { status: 400 }
        );
      }
    }

    // Update the classroom
    console.log("🔵 [PATCH Classroom] Updating classroom in database...");
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    console.log("🔵 [PATCH Classroom] Update payload:", updatePayload);

    const { data: updatedClassroom, error: updateError } = await supabase
      .from("classrooms")
      .update(updatePayload)
      .eq("id", classroomId)
      .select()
      .single();

    console.log("🔵 [PATCH Classroom] Database update result:", { updatedClassroom, updateError });

    if (updateError) {
      console.error("❌ [PATCH Classroom] Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update classroom", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ [PATCH Classroom] Classroom updated successfully!");
    return NextResponse.json({
      message: "Classroom updated successfully",
      classroom: updatedClassroom,
    });
  } catch (error) {
    console.error("❌ [PATCH Classroom] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classroomId } = await params;

    // Validate permissions - instructors, TAs, and global admins can delete classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", data.user.id)
      .single();

    // Check if user is a global admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const isAdmin = userRoles?.some(r => r.role === "admin") || false;
    const canManage = membership?.role === "instructor" || membership?.role === "ta" || isAdmin;

    if (membershipError && !isAdmin) {
      return NextResponse.json(
        { error: "You must be a member of this classroom" },
        { status: 403 }
      );
    }

    if (!canManage) {
      return NextResponse.json(
        { error: "Only instructors, TAs, and admins can delete classrooms" },
        { status: 403 }
      );
    }

    // Delete the classroom (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from("classrooms")
      .delete()
      .eq("id", classroomId);

    if (deleteError) {
      console.error("Classroom delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete classroom" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Classroom deleted successfully"
    });
  } catch (error) {
    console.error("Classroom delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}