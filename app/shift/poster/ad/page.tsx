import type { Metadata } from "next";

import { AD_CARD_COUNT, AdCard, AdPanorama } from "@/components/shift/poster/grid/AdCarousel";
import { AD_COHORT, AD_HOOKS, META_COPY, adUrl } from "@/components/shift/poster/grid/adCopy";

/**
 * SHIFT Meta ad carousel: five 1080x1350 cards plus a parent-hook card 1.
 * Export: screenshot #shift-ad-1-student, #shift-ad-1-parent, #shift-ad-{2..5}.
 * The copy sheet below the cards is what goes into Ads Manager.
 */

export const metadata: Metadata = {
  title: `${AD_COHORT.name} Meta Ad Carousel`,
  robots: { index: false, follow: false },
};

function CopySheet() {
  return (
    <div className="max-w-[1100px] space-y-8 font-mono text-[15px] leading-relaxed text-neutral-200">
      {AD_HOOKS.map((hook) => (
        <section key={hook}>
          <h3 className="text-neutral-400">Primary text · {hook} hook</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-neutral-900 p-4">{META_COPY.primaryText[hook]}</pre>
        </section>
      ))}
      <section>
        <h3 className="text-neutral-400">Cards · CTA: {META_COPY.cta}</h3>
        <p>Parent card 1: {META_COPY.parentCard.headline} · {META_COPY.parentCard.description}</p>
        <p className="break-all text-neutral-500">{adUrl(1, "parent")}</p>
        <ol className="mt-2 space-y-3">
          {META_COPY.cards.map((card, i) => (
            <li key={card.headline} className="rounded bg-neutral-900 p-4">
              <p>
                {i + 1}. {card.headline} <span className="text-neutral-500">({card.headline.length} chars, 20 recommended for Facebook Feed)</span>
              </p>
              <p className="text-neutral-400">{card.description}</p>
              <p className="break-all text-neutral-500">{adUrl(i + 1)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default async function ShiftAdCarouselPage({ searchParams }: { searchParams: Promise<{ render?: string; hook?: string }> }) {
  const { render, hook } = await searchParams;
  if (render === "1") return <AdPanorama id="shift-ad-panorama" hook={hook === "parent" ? "parent" : "student"} />;
  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      <pre id="shift-ad-copy" hidden>{JSON.stringify({
          cohort: AD_COHORT,
          ...META_COPY,
          cards: META_COPY.cards.map((card, i) => ({
            ...card,
            studentUrl: adUrl(i + 1, "student"),
            parentUrl: adUrl(i + 1, "parent"),
          })),
        })}</pre>
      <style>{"nextjs-portal{display:none!important}"}</style>
      <div className="flex flex-col gap-16">
        <div className="origin-top-left scale-[0.37]" style={{ height: 500 }}>
          <AdPanorama id="shift-ad-panorama" />
        </div>
        <div className="flex gap-6">
          {Array.from({ length: AD_CARD_COUNT }, (_, i) => (
            <AdCard key={i} index={i} />
          ))}
        </div>
        <AdCard index={0} hook="parent" />
        <CopySheet />
      </div>
    </div>
  );
}
