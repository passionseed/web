import { FORMATS, slideId } from "@/lib/marketing/formats";
import { getShiftCohort } from "@/lib/content/shift-cohort";
import type { StudioSet, StudioSlide } from "@/lib/marketing/types";

import { CompareView, CoverView, PointsView, StatementView } from "./slidesCore";
import { ChatView, CtaView, QuoteView } from "./slidesSocial";
import { OfferView, ScheduleView } from "./slidesShift";
import { StudioSheet } from "./StudioSheet";
import { STUDIO_INKS, type StudioInks } from "./studioTheme";

/** Renders every slide of a set at export size, one sheet per slide. */

interface BodyProps {
  slide: StudioSlide;
  inks: StudioInks;
  tall: boolean;
  wordmark?: string;
}

function SlideBody({ slide, inks, tall, wordmark }: BodyProps) {
  switch (slide.kind) {
    case "cover":
      return <CoverView slide={slide} inks={inks} tall={tall} wordmarkName={wordmark} />;
    case "points":
      return <PointsView slide={slide} inks={inks} tall={tall} />;
    case "compare":
      return <CompareView slide={slide} inks={inks} tall={tall} />;
    case "statement":
      return <StatementView slide={slide} inks={inks} tall={tall} />;
    case "chat":
      return <ChatView slide={slide} inks={inks} />;
    case "quote":
      return <QuoteView slide={slide} inks={inks} />;
    case "cta":
      return <CtaView slide={slide} inks={inks} />;
    case "offer":
      return <OfferView slide={slide} inks={inks} />;
    case "schedule":
      return <ScheduleView slide={slide} inks={inks} />;
  }
}

export function StudioSetView({ set }: { set: StudioSet }) {
  const inks = STUDIO_INKS[set.theme];
  const tall = FORMATS[set.format].height > 1350;
  const wordmark = set.shiftRound !== undefined ? getShiftCohort(set.shiftRound)?.name : undefined;
  const offset = set.pageOffset ?? 0;
  const total = set.slides.length + offset;
  return (
    <>
      {set.slides.map((slide, i) => (
        <StudioSheet
          key={i}
          id={slideId(set.slug, i + 1)}
          format={set.format}
          theme={set.theme}
          page={i + 1 + offset}
          total={total}
          wordmark={slide.kind === "cover" && slide.wordmark ? undefined : wordmark}
          sky={slide.kind === "cover" && slide.sky}
        >
          <SlideBody slide={slide} inks={inks} tall={tall} wordmark={wordmark} />
        </StudioSheet>
      ))}
    </>
  );
}
