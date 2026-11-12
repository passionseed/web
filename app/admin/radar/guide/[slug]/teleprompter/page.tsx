import { notFound } from "next/navigation";
import { RadarTeleprompter } from "@/components/admin/radar/RadarTeleprompter";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { clipScriptHash } from "@/lib/radar-guide/guide-lint";
import { teleprompterPages } from "@/lib/radar-guide/teleprompter";
import { RADAR_SLUG_PATTERN } from "@/lib/radar-guide/types";
import { loadGuide, readClipManifest } from "@/lib/radar-guides/registry.server";
import { PrintableScripts } from "./PrintableScripts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Teleprompter",
  robots: { index: false, follow: false },
};

/**
 * Teleprompter for a code guide's cutscene clips (docs/features/radar-guides-in-code.md
 * section 3). Scripts come from the guide's code (any status, drafts included);
 * clip status from the committed clips.json. No database reads beyond the admin check.
 */
export default async function GuideTeleprompterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!RADAR_SLUG_PATTERN.test(slug)) notFound();
  const guide = loadGuide(slug);
  if (!guide) notFound();

  const pages = teleprompterPages(guide, { manifest: readClipManifest(slug), hash: clipScriptHash });
  const guideName = guide.meta.nameTh || guide.meta.nameEn || slug;

  if (query.all === "1") {
    return <PrintableScripts slug={slug} guideName={guideName} pages={pages} />;
  }
  return (
    <RadarTeleprompter
      slug={slug}
      guideName={guideName}
      pages={pages}
      initialKey={typeof query.page === "string" ? query.page : null}
    />
  );
}
