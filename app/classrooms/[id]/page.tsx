import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ClassroomDetailsDashboard } from "@/components/classroom/ClassroomDetailsDashboard";

interface ClassroomPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: ClassroomPageProps) {
  const supabase = await createClient();
  const { id } = await params; // Destructure the id after awaiting

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Fetch classroom details with membership info
  const { data: classroom, error } = await supabase
    .from("classrooms")
    .select(
      `
      *,
      classroom_memberships!inner(
        role,
        joined_at
      )
    `
    )
    .eq("id", id)
    .eq("classroom_memberships.user_id", user.id)
    .single();

  if (error || !classroom) {
    notFound();
  }

  // Check if user is instructor or TA
  const userRole = classroom.classroom_memberships[0]?.role;
  const canManage = userRole === "instructor" || userRole === "ta";

  return (
    <div className="container mx-auto p-6">
      <ClassroomDetailsDashboard
        classroom={classroom}
        userRole={userRole}
        canManage={canManage}
      />
    </div>
  );
}
