import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ClassroomSettingsClient } from "@/components/classroom/ClassroomSettingsClient";

export default async function ClassroomSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    redirect("/login");
  }

  const classroomId = params.id;

  try {
    // Get classroom details and user's membership
    const { data: classroomData, error: classroomError } = await supabase
      .from("classrooms")
      .select(`
        id,
        name,
        description,
        join_code,
        max_students,
        enable_assignments,
        settings,
        instructor_id,
        classroom_memberships!inner (
          role,
          user_id
        )
      `)
      .eq("id", classroomId)
      .eq("classroom_memberships.user_id", data.user.id)
      .single();

    if (classroomError) {
      console.error("Classroom fetch error:", classroomError);
      redirect("/classrooms");
    }

    const userMembership = classroomData.classroom_memberships.find(
      (m: any) => m.user_id === data.user.id
    );

    if (!userMembership) {
      redirect("/classrooms");
    }

    const canManage = userMembership.role === "instructor";

    return (
      <div className="container mx-auto py-6">
        <ClassroomSettingsClient
          classroom={{
            id: classroomData.id,
            name: classroomData.name,
            description: classroomData.description,
            join_code: classroomData.join_code,
            max_students: classroomData.max_students,
            enable_assignments: classroomData.enable_assignments ?? true,
            settings: classroomData.settings || {},
          }}
          canManage={canManage}
        />
      </div>
    );
  } catch (error) {
    console.error("Settings page error:", error);
    redirect("/classrooms");
  }
}