import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { ChromeWordmark, INK } from "@/components/shift/poster/riso";
import type { CompareSlide, CoverSlide, PointsSlide, StatementSlide } from "@/lib/marketing/types";

import { RichText } from "./RichText";
import { Body, Footnote, MarginNote, Panel, Stamp, Tag, Title } from "./SlideParts";
import { accentAt, type StudioInks } from "./studioTheme";

/**
 * Text slides: the cover, a list of points, a two-column compare, a
 * statement. Lists and compares sit centred in the space under the title,
 * so a 3:4 sheet never reads as a half-empty page.
 */

interface Props<S> {
  slide: S;
  inks: StudioInks;
  /** Sheet is taller than 4:5 (3:4 or Story), so type can breathe. */
  tall: boolean;
}

/** Fewer lines set bigger; the copy decides the breaks, the slide the size. */
function coverSize(lines: number, tall: boolean): number {
  const bump = tall ? 8 : 0;
  if (lines <= 2) return 112 + bump;
  if (lines === 3) return 98 + bump;
  return 84 + bump;
}

export function CoverView({ slide, inks, tall, wordmarkName = "SHIFT" }: Props<CoverSlide> & { wordmarkName?: string }) {
  return (
    <>
      <Tag inks={inks}>{slide.kicker}</Tag>
      <h1
        className="mt-5 font-kodchasan font-bold leading-[1.2] tracking-tight"
        style={{ fontSize: coverSize(slide.title.length, tall), color: inks.text, textShadow: inks.headingShadow }}
      >
        {slide.title.map((line) => (
          <span key={line} className="block">
            <RichText text={line} accent={inks.kicker} />
          </span>
        ))}
      </h1>
      {slide.wordmark && (
        <div className="-ml-[36px] mt-4">
          <ChromeWordmark size={tall ? 150 : 128} name={wordmarkName} />
        </div>
      )}
      {slide.note && (
        <div className="mt-9">
          <MarginNote text={slide.note} size={36} />
        </div>
      )}
      <div className="mt-auto flex items-end justify-between gap-8 pt-10">
        {slide.sub ? (
          <div className="max-w-[640px]">
            <Body inks={inks} text={slide.sub} size={34} dim={false} />
          </div>
        ) : (
          <span />
        )}
        {slide.icon && (
          <div className="-mb-2 -mr-2 shrink-0" style={{ rotate: "-6deg" }}>
            <RisoIcon name={slide.icon} ink={inks.kicker} size={tall ? 280 : 230} />
          </div>
        )}
      </div>
    </>
  );
}

export function PointsView({ slide, inks, tall }: Props<PointsSlide>) {
  const gap = tall ? "space-y-11" : "space-y-8";
  const start = slide.startAt ?? 1;
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} size={tall ? 72 : 66} />
      <div className="flex flex-1 flex-col justify-center py-8">
        <div className={gap}>
          {slide.points.map((point, i) => (
            <div key={point.title} className="flex items-start gap-7">
              {slide.numbered ? (
                <Stamp n={i + start} ink={i === 0 && start === 1 ? INK.orange : INK.paper} size={tall ? 66 : 58} />
              ) : (
                <span
                  className="mt-[18px] h-[22px] w-[22px] shrink-0 rounded-full"
                  style={{ backgroundColor: accentAt(inks, i), boxShadow: `-2px 1.5px 0 ${INK.blue}` }}
                />
              )}
              <div className="min-w-0">
                <p
                  className="font-kodchasan font-bold leading-[1.3]"
                  style={{ fontSize: tall ? 48 : 42, color: inks.text }}
                >
                  <RichText text={point.title} accent={inks.kicker} />
                </p>
                {point.body && (
                  <div className="mt-2">
                    <Body inks={inks} text={point.body} size={tall ? 34 : 30} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {slide.footnote && <Footnote inks={inks} text={slide.footnote} />}
    </>
  );
}

function CompareColumn({
  inks,
  label,
  items,
  hot,
  tall,
}: {
  inks: StudioInks;
  label: string;
  items: string[];
  hot?: boolean;
  tall: boolean;
}) {
  return (
    <Panel inks={inks} hot={hot} className="!px-10 !py-9">
      <p className="font-kodchasan font-bold leading-tight" style={{ fontSize: tall ? 44 : 40 }}>
        {label}
      </p>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-4 leading-[1.45]" style={{ fontSize: tall ? 38 : 34 }}>
            <span className="shrink-0 font-bold">{hot ? "✓" : "✕"}</span>
            <span style={hot ? undefined : { color: inks.dim }}>
              <RichText text={item} accent={inks.kicker} />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function CompareView({ slide, inks, tall }: Props<CompareSlide>) {
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} size={tall ? 72 : 66} />
      <div className="flex flex-1 flex-col justify-center py-8">
        {/* Stacked, not side by side: full-width lines stay big enough to read on a phone. */}
        <div className="flex flex-col gap-6">
          <CompareColumn inks={inks} label={slide.left.label} items={slide.left.items} tall={tall} />
          <CompareColumn inks={inks} label={slide.right.label} items={slide.right.items} hot tall={tall} />
        </div>
      </div>
      {slide.footnote && <Footnote inks={inks} text={slide.footnote} />}
    </>
  );
}

export function StatementView({ slide, inks, tall }: Props<StatementSlide>) {
  return (
    <>
      {slide.tag && <Tag inks={inks}>{slide.tag}</Tag>}
      <div className="my-auto py-8">
        <p
          className="font-kodchasan font-bold leading-[1.25] tracking-tight"
          style={{ fontSize: tall ? 96 : 84, color: inks.text, textShadow: inks.headingShadow }}
        >
          {slide.big.map((line) => (
            <span key={line} className="block">
              <RichText text={line} accent={inks.kicker} />
            </span>
          ))}
        </p>
        {slide.body && (
          <div className="mt-10 max-w-[880px]">
            <Body inks={inks} text={slide.body} size={tall ? 36 : 32} />
          </div>
        )}
        {slide.note && (
          <div className="mt-10">
            <MarginNote text={slide.note} tilt={1.3} size={34} />
          </div>
        )}
      </div>
    </>
  );
}
