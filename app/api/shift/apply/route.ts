import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      name,
      contact,
      school = "",
      grade = "",
      target_faculty,
      project_idea,
      user_reach_confirmed = false,
      user_reach_group = "",
      source = "shift_page",
    } = body;

    // Basic validation
    if (!name || !contact || !target_faculty || !project_idea) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, ช่องทางติดต่อ, คณะเป้าหมาย, ไอเดียโปรเจกต์)",
        },
        { status: 400 }
      );
    }

    // Insert into shift_applications
    const { data, error } = await supabase
      .from("shift_applications")
      .insert({
        name: name.trim(),
        contact: contact.trim(),
        school: school.trim(),
        grade: grade.trim(),
        target_faculty: target_faculty.trim(),
        project_idea: project_idea.trim(),
        user_reach_confirmed: Boolean(user_reach_confirmed),
        user_reach_group: user_reach_group.trim(),
        cohort: "shift-0",
        source,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving SHIFT application:", error);
      // Even if database has not applied table yet, return helpful response so student is not stranded
      return NextResponse.json(
        {
          success: false,
          error: "ระบบบันทึกขัดข้องชั่วคราว กรุณาติดต่อทาง LINE @passionseed หรือลองใหม่อีกครั้ง",
        },
        { status: 500 }
      );
    }

    // Fire non-blocking telemetry event to track conversion
    try {
      await supabase.from("hackathon_events").insert({
        visitor_fingerprint: "applicant",
        event_type: "shift_application_submitted",
        event_data: {
          application_id: data.id,
          target_faculty: data.target_faculty,
          user_reach_confirmed: data.user_reach_confirmed,
          source,
        },
        page_path: "/shift",
      });
    } catch {
      // Telemetry should never fail the application response
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกใบสมัครเรียบร้อยแล้ว",
      id: data.id,
    });
  } catch (err: unknown) {
    console.error("Unexpected error in /api/shift/apply:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดที่ไม่คาดคิด" },
      { status: 500 }
    );
  }
}
