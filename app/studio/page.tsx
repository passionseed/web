import type { Metadata } from "next";
import Link from "next/link";

import { FORMATS } from "@/lib/marketing/formats";
import { LINKEDIN_POSTS, STUDIO_SETS } from "@/lib/marketing/sets";

/**
 * Marketing Studio index: every drafted set and LinkedIn post. Drafts only;
 * nothing here is published from the site.
 */

export const metadata: Metadata = {
  title: "Marketing Studio",
  robots: { index: false, follow: false },
};

export default function StudioIndexPage() {
  return (
    <div className="min-h-screen bg-neutral-950 p-10 text-neutral-300">
      <h1 className="text-3xl font-semibold text-white">Marketing Studio</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Drafts. Export with <code>node scripts/render-marketing.mjs</code>. Routine: <code>/marketing-studio</code>.
      </p>

      <section className="mt-10">
        <h2 className="font-mono text-sm uppercase tracking-widest text-neutral-500">Sets ({STUDIO_SETS.length})</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {STUDIO_SETS.map((set) => (
            <li key={set.slug} className="rounded border border-neutral-800 p-4">
              <Link href={`/studio/${set.slug}`} className="text-lg font-semibold text-white hover:underline">
                {set.title}
              </Link>
              <p className="mt-1 font-mono text-xs text-neutral-500">
                {FORMATS[set.format].label} · {set.audience} · {set.slides.length} slides · {set.created}
              </p>
              <p className="mt-2 text-sm text-neutral-400">{set.angle}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-sm uppercase tracking-widest text-neutral-500">
          LinkedIn posts ({LINKEDIN_POSTS.length})
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {LINKEDIN_POSTS.map((post) => (
            <article key={post.slug} className="rounded border border-neutral-800 p-6">
              <p className="font-mono text-xs text-neutral-500">
                {post.voice} · {post.created}
                {post.attach ? ` · attach /studio/${post.attach}` : ""}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{post.title}</h3>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{post.body}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
