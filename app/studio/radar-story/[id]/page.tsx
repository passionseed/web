import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoryReelStudio } from "@/components/radar/reel/story/StoryReelStudio";
import { storyById } from "@/lib/radar-stories";

/**
 * Filming frame for story reels (docs/radar-guide/README.md, "Story reels"):
 * one script from lib/radar-stories in the 432x768 frame that
 * `pnpm radar:story <id>` films at deviceScaleFactor 2.5 (1080x1920).
 * `?render=1` waits for the CLI to drive it frame by frame; without it the
 * reel plays on its own with Instagram's safe zones drawn over it.
 * `?platform=tt` shows the TikTok end card, `?hook=1|2` a Trial Reels hook,
 * `?t=12.5` holds one moment. Content comes from code only: no Supabase.
 * Render only, never served in production.
 */

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Studio · Radar story ${id}`,
    robots: { index: false, follow: false },
  };
}

export default async function RadarStoryStudioPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!ID.test(id)) notFound();
  const script = storyById(id);
  if (!script) notFound();

  const hook = query.hook === "1" ? script.hookVariantsTh[0] : query.hook === "2" ? script.hookVariantsTh[1] : script.hookTh;
  const t = typeof query.t === "string" ? Number(query.t) : NaN;
  const render = query.render === "1";

  return (
    <div className={render ? "" : "min-h-screen bg-neutral-950 p-10"}>
      <StoryReelStudio
        script={script}
        hookTh={hook}
        platform={query.platform === "tt" ? "tt" : "ig"}
        render={render}
        stillSeconds={Number.isFinite(t) && t >= 0 ? t : null}
      />
    </div>
  );
}
