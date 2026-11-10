import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { UniversityManagement } from "@/components/admin/UniversityManagement";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function UniversitiesArchivePage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { data: universities, error: universitiesError } = await supabase
    .from("universities")
    .select("*")
    .order("name");

  if (universitiesError) {
    console.error("Error fetching universities:", universitiesError);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Archive"
        title="Universities"
        description="Manage the universities archive for the educational pathway system."
      />
      {universitiesError && (
        <AdminErrorState
          title="Could not load universities"
          message="The list below may be empty or out of date. Reload the page to try again."
        />
      )}
      <UniversityManagement
        initialUniversities={universities || []}
        // Only the id is used; the full auth user stays on the server.
        user={{ id: user.id }}
      />
    </div>
  );
}
