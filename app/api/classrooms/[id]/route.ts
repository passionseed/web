import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroomId = params.id;

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroomId = params.id;
    const body = await request.json();

    // Validate permissions - only instructor can update classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", data.user.id)
      .single();

    if (membershipError || membership?.role !== "instructor") {
      return NextResponse.json(
        { error: "Only instructors can modify classroom settings" },
        { status: 403 }
      );
    }

    // Validate and sanitize input
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

    // Validate constraints
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== "string" || updateData.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name is required and must be a valid string" },
          { status: 400 }
        );
      }
      if (updateData.name.length > 500) {
        return NextResponse.json(
          { error: "Name must be 500 characters or less" },
          { status: 400 }
        );
      }
      updateData.name = updateData.name.trim();
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
    const { data: updatedClassroom, error: updateError } = await supabase
      .from("classrooms")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classroomId)
      .select()
      .single();

    if (updateError) {
      console.error("Classroom update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update classroom" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Classroom updated successfully",
      classroom: updatedClassroom,
    });
  } catch (error) {
    console.error("Classroom update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classroomId = params.id;

    // Validate permissions - only instructor can delete classroom
    const { data: membership, error: membershipError } = await supabase
      .from("classroom_memberships")
      .select("role")
      .eq("classroom_id", classroomId)
      .eq("user_id", data.user.id)
      .single();

    if (membershipError || membership?.role !== "instructor") {
      return NextResponse.json(
        { error: "Only instructors can delete classrooms" },
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