import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSeedEnrollmentDetail, getSeedPathEnrollments } from "@/lib/supabase/pathlab-reports";
import { StudentDetail } from "@/components/pathlab/StudentDetail";

interface PathLabReportsPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    enrollment?: string;
  }>;
}

export default async function PathLabReportsPage({ params, searchParams }: PathLabReportsPageProps) {
  const { id: seedId } = await params;
  const { enrollment: selectedEnrollmentId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/seeds/${seedId}/reports`);
  }

  const [{ data: seed }, { data: roles }] = await Promise.all([
    supabase
      .from("seeds")
      .select("*")
      .eq("id", seedId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "instructor"]),
  ]);

  if (!seed || seed.seed_type !== "pathlab") {
    notFound();
  }

  const isAdminOrInstructor = !!roles?.length;
  const isCreator = seed.created_by === user.id;
  if (!isAdminOrInstructor && !isCreator) {
    notFound();
  }

  const enrollments = await getSeedPathEnrollments(seedId);
  const selectedId = selectedEnrollmentId || enrollments[0]?.id || null;
  let selectedDetail: any = null;
  if (selectedId) {
    try {
      selectedDetail = await getSeedEnrollmentDetail(seedId, selectedId);
    } catch {
      selectedDetail = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">PathLab Reports</p>
          <h1 className="text-3xl font-bold text-white">{seed.title}</h1>
        </div>
        <Link href={`/seeds/${seed.id}/pathlab-builder`}>
          <Button variant="outline" className="border-neutral-700 bg-neutral-900/70 text-white hover:bg-neutral-800">
            Open Builder
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {enrollments.length === 0 && <p className="text-sm text-neutral-400">No students enrolled yet.</p>}
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/seeds/${seed.id}/reports?enrollment=${enrollment.id}`}
                className={`block rounded-md border p-3 transition-colors ${
                  selectedId === enrollment.id
                    ? "border-white/50 bg-white/10"
                    : "border-neutral-800 bg-neutral-950/70 hover:bg-neutral-800"
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {enrollment.profile?.full_name || enrollment.profile?.username || "Student"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {enrollment.status} · day {enrollment.current_day} ·{" "}
                  {new Date(enrollment.enrolled_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        {selectedDetail ? (
          <StudentDetail
            enrollment={selectedDetail.enrollment}
            profile={selectedDetail.profile}
            reflections={selectedDetail.reflections}
            exitReflection={selectedDetail.exitReflection}
            endReflection={selectedDetail.endReflection}
          />
        ) : (
          <Card className="border-neutral-800 bg-neutral-900/80">
            <CardContent className="p-6 text-neutral-300">Select a student to view analytics.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
