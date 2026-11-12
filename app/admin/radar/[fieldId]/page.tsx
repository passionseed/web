import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clapperboard, ScrollText } from "lucide-react";

import { RadarDraftEditor } from "@/components/admin/radar/RadarDraftEditor";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { loadCanonicalRadarField } from "@/lib/radar/admin-canonical";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The deck editor for one Career Radar field. Guide pages are code
 * (lib/radar-guides), so a career with a code guide only gets a link to its
 * clip teleprompter here; there is nothing about the guide to edit in the DB.
 */
export default async function RadarFieldEditorPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  await requireAdmin();
  const { fieldId } = await params;
  const supabase = await createClient();
  const canonical = await loadCanonicalRadarField(supabase, fieldId);

  if (!canonical) notFound();
  const slug = String(canonical.field.slug ?? "");
  const guide = slug ? GUIDE_INDEX[slug] : undefined;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Career Radar content"
        title={String(canonical.field.name_en ?? canonical.field.slug ?? "Field")}
        actions={
          <div className="flex flex-wrap gap-2">
            {guide ? (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={`/admin/radar/guide/${guide.slug}/teleprompter`}>
                  <ScrollText className="h-4 w-4" aria-hidden="true" />
                  Guide clip scripts
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/radar/reels">
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Reels and links
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/radar">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All fields
              </Link>
            </Button>
          </div>
        }
      />
      <RadarDraftEditor canonical={canonical} />
    </div>
  );
}
