import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RadarDraftEditor } from "@/components/admin/radar/RadarDraftEditor";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { loadCanonicalRadarField } from "@/lib/radar/admin-canonical";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function RadarFieldEditorPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;
  const supabase = await createClient();
  const canonical = await loadCanonicalRadarField(supabase, fieldId);

  if (!canonical) notFound();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Career Radar content"
        title={String(canonical.field.name_en ?? canonical.field.slug ?? "Field")}
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/admin/radar">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All fields
            </Link>
          </Button>
        }
      />
      <RadarDraftEditor canonical={canonical} />
    </div>
  );
}
