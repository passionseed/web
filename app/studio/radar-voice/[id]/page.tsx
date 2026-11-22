import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VoiceStudioClient } from "@/components/studio/radar-voice/VoiceStudioClient";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { storyById } from "@/lib/radar-stories";
import { summarizeStoryVoice } from "@/lib/radar-stories/voice";
import {
  isMissingRadarVoiceTableError,
  listVoiceTakes,
  type RadarVoiceTake,
} from "@/lib/supabase/radar-voice";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const script = ID_PATTERN.test(id) ? storyById(id) : null;
  return {
    title: script ? `Voice Studio · ${script.id}` : "Radar Voice Studio",
    robots: { index: false, follow: false },
  };
}

export default async function RadarVoiceStoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!ID_PATTERN.test(id)) notFound();

  const script = storyById(id);
  if (!script) notFound();

  let takes: RadarVoiceTake[] = [];
  let migrationMissing = false;

  try {
    const service = createAdminClient();
    takes = await listVoiceTakes(service, script.id);
  } catch (error) {
    if (isMissingRadarVoiceTableError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const summary = summarizeStoryVoice(script, takes);
  const rawLine = typeof query.line === "string" ? Number(query.line) : NaN;
  const initialLineIndex =
    Number.isInteger(rawLine) && rawLine >= 0 && rawLine < summary.totalLines
      ? rawLine
      : summary.nextLineIndex;

  return (
    <VoiceStudioClient
      script={script}
      initialTakes={takes}
      initialLineIndex={initialLineIndex}
      migrationMissing={migrationMissing}
    />
  );
}
