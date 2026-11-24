import type { Metadata } from "next";

import { VoiceReelList, type ReelProgressRow } from "@/components/studio/radar-voice/VoiceReelList";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { STORY_SCRIPTS } from "@/lib/radar-stories";
import { summarizeStoryVoice } from "@/lib/radar-stories/voice";
import {
  isMissingRadarVoiceTableError,
  listVoiceTakes,
  type RadarVoiceTake,
} from "@/lib/supabase/radar-voice";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Radar Voice Studio",
  robots: { index: false, follow: false },
};

export default async function RadarVoiceStudioIndexPage() {
  await requireAdmin();

  let takes: RadarVoiceTake[] = [];
  let migrationMissing = false;

  try {
    const service = createAdminClient();
    takes = await listVoiceTakes(service);
  } catch (error) {
    if (isMissingRadarVoiceTableError(error)) {
      migrationMissing = true;
    } else {
      throw error;
    }
  }

  const rows: ReelProgressRow[] = STORY_SCRIPTS.map((script) => {
    const summary = summarizeStoryVoice(script, takes);
    return {
      id: script.id,
      series: script.series,
      titleTh: script.titleTh,
      hookTh: script.hookTh,
      totalLines: summary.totalLines,
      pickedCount: summary.pickedCount,
      recordedCount: summary.recordedCount,
      unpickedCount: summary.unpickedCount,
      staleCount: summary.staleCount,
      missingCount: summary.missingCount,
      nextLineIndex: summary.nextLineIndex,
    };
  });

  return <VoiceReelList rows={rows} migrationMissing={migrationMissing} />;
}
