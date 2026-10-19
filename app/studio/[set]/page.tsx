import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioSetView } from "@/components/marketing/studio/StudioSetView";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { FORMATS } from "@/lib/marketing/formats";
import { getStudioSet } from "@/lib/marketing/sets";

/**
 * One Marketing Studio set at real export size. The export script
 * (scripts/render-marketing.mjs) screenshots #studio-<slug>-<n>.
 */

type Params = Promise<{ set: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { set: slug } = await params;
  const set = getStudioSet(slug);
  return {
    title: set ? `Studio · ${set.title}` : "Studio",
    robots: { index: false, follow: false },
  };
}

export default async function StudioSetPage({ params }: { params: Params }) {
  const { set: slug } = await params;
  const set = getStudioSet(slug);
  if (!set) notFound();
  return (
    <div className="min-h-screen bg-neutral-950 p-10 text-neutral-300">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      <header className="mb-8 max-w-[1080px] space-y-2">
        <p className="font-mono text-sm text-neutral-500">
          {FORMATS[set.format].label} · {set.channel} · {set.audience} · {set.slides.length} slides
        </p>
        <h1 className="text-2xl font-semibold text-white">{set.title}</h1>
        <p className="text-sm text-neutral-400">{set.angle}</p>
      </header>
      <div className="flex flex-wrap gap-10">
        <StudioSetView set={set} />
      </div>
      <section className="mt-12 max-w-[1080px] space-y-3">
        <h2 className="font-mono text-sm uppercase tracking-widest text-neutral-500">Caption</h2>
        <pre className="whitespace-pre-wrap rounded bg-neutral-900 p-6 font-sans text-base leading-relaxed">
          {set.caption}
          {set.hashtags?.length ? `\n\n${set.hashtags.map((h) => `#${h}`).join(" ")}` : ""}
        </pre>
      </section>
    </div>
  );
}
