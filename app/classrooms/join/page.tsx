import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { JoinClassroomForm } from "@/components/classroom/JoinClassroomForm";

export const dynamic = "force-dynamic";

export default async function JoinClassroomPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Join Classroom</h1>
          <p className="text-muted-foreground">
            Enter the 6-character join code provided by your instructor
          </p>
        </div>

        <JoinClassroomForm />
      </div>
    </div>
  );
}
