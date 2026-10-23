import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { ChromeWordmark, INK } from "@/components/shift/poster/riso";
import type { CompareSlide, CoverSlide, PointsSlide, StatementSlide } from "@/lib/marketing/types";

import { CosmosWordmark, Glass, OrbDot, RingStamp } from "./cosmosParts";
import { Body, Footnote, MarginNote, Panel, Rich, Stamp, Tag, Title, displayFont, isCosmos } from "./SlideParts";
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

/** A riso line icon; on cosmos it gives off a little of its own light. */
function CoverIcon({ inks, name, size }: { inks: StudioInks; name: NonNullable<CoverSlide["icon"]>; size: number }) {
  const icon = <RisoIcon name={name} ink={inks.kicker} size={size} />;
  if (!isCosmos(inks)) return icon;
  return <span style={{ display: "inline-block", filter: `drop-shadow(0 0 22px ${inks.kicker}59)` }}>{icon}</span>;
}

export function CoverView({ slide, inks, tall, wordmarkName = "SHIFT" }: Props<CoverSlide> & { wordmarkName?: string }) {
  const cosmos = isCosmos(inks);
  const face = cosmos ? "font-bai-jamjuree font-bold leading-[1.22]" : "font-kodchasan font-bold leading-[1.2] tracking-tight";
  return (
    <>
      <Tag inks={inks}>{slide.kicker}</Tag>
      <h1
        className={`mt-5 ${face}`}
        style={{ fontSize: coverSize(slide.title.length, tall), color: inks.text, textShadow: inks.headingShadow }}
      >
        {slide.title.map((line) => (
          <span key={line} className="block">
            <Rich inks={inks} text={line} />
          </span>
        ))}
      </h1>
      {slide.wordmark &&
        (cosmos ? (
          <div className="mt-6">
            <CosmosWordmark size={tall ? 168 : 148} name={wordmarkName} />
          </div>
        ) : (
          <div className="-ml-[36px] mt-4">
            <ChromeWordmark size={tall ? 150 : 128} name={wordmarkName} />
          </div>
        ))}
      {slide.note && (
        <div className="mt-9">
          <MarginNote text={slide.note} size={36} inks={inks} />
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
            <CoverIcon inks={inks} name={slide.icon} size={tall ? 280 : 230} />
          </div>
        )}
      </div>
    </>
  );
}

/** One point on cosmos: a glass row led by a ring stamp or a lit orb. */
function CosmosPoint({
  inks,
  point,
  index,
  start,
  numbered,
  tall,
  compact,
}: {
  inks: StudioInks;
  point: PointsSlide["points"][number];
  index: number;
  start: number;
  numbered?: boolean;
  tall: boolean;
  compact: boolean;
}) {
  const first = index === 0 && start === 1;
  return (
    <Glass radius={24} className={`flex items-start gap-6 ${compact ? "px-8 py-5" : "px-8 py-6"}`}>
      <span className="mt-[2px] flex shrink-0 items-center justify-center" style={{ width: tall ? 62 : 56, height: tall ? 62 : 56 }}>
        {numbered ? (
          <RingStamp n={index + start} ink={first ? inks.hot : inks.kicker} lit={first} size={tall ? 62 : 56} />
        ) : (
          <OrbDot ink={accentAt(inks, index)} size={tall ? 36 : 32} />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-[1.3]" style={{ fontSize: tall ? 46 : 40, color: inks.text }}>
          <Rich inks={inks} text={point.title} />
        </p>
        {point.body && (
          <div className="mt-1">
            <Body inks={inks} text={point.body} size={tall ? 32 : 29} />
          </div>
        )}
      </div>
    </Glass>
  );
}

export function PointsView({ slide, inks, tall }: Props<PointsSlide>) {
  const gap = tall ? "space-y-11" : "space-y-8";
  const start = slide.startAt ?? 1;
  if (isCosmos(inks)) {
    const compact = slide.points.length > 3;
    return (
      <>
        <Tag inks={inks}>{slide.tag}</Tag>
        <Title inks={inks} text={slide.title} size={tall ? 72 : 66} />
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className={`flex flex-col ${compact ? "gap-4" : tall ? "gap-6" : "gap-5"}`}>
            {slide.points.map((point, i) => (
              <CosmosPoint
                key={point.title}
                inks={inks}
                point={point}
                index={i}
                start={start}
                numbered={slide.numbered}
                tall={tall}
                compact={compact}
              />
            ))}
          </div>
        </div>
        {slide.footnote && <Footnote inks={inks} text={slide.footnote} />}
      </>
    );
  }
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
                  <Rich inks={inks} text={point.title} />
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
  const cosmos = isCosmos(inks);
  // Riso: the hot panel is solid orange, so marks print in its black ink.
  // Cosmos: glass stays dark, so the marks carry the light (flare out, sol in).
  const markColor = cosmos ? (hot ? inks.hot : inks.accent.pink) : undefined;
  return (
    <Panel inks={inks} hot={hot} className="!px-10 !py-9">
      <p className={`${displayFont(inks)} font-bold leading-tight`} style={{ fontSize: tall ? 44 : 40 }}>
        {label}
      </p>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-4 leading-[1.45]" style={{ fontSize: tall ? 38 : 34 }}>
            <span className="shrink-0 font-bold" style={markColor ? { color: markColor } : undefined}>
              {hot ? "✓" : "✕"}
            </span>
            <span style={hot ? undefined : { color: inks.dim }}>
              <Rich inks={inks} text={item} />
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
  const face = isCosmos(inks) ? "font-bai-jamjuree font-bold leading-[1.25]" : "font-kodchasan font-bold leading-[1.25] tracking-tight";
  return (
    <>
      {slide.tag && <Tag inks={inks}>{slide.tag}</Tag>}
      <div className="my-auto py-8">
        <p className={face} style={{ fontSize: tall ? 96 : 84, color: inks.text, textShadow: inks.headingShadow }}>
          {slide.big.map((line) => (
            <span key={line} className="block">
              <Rich inks={inks} text={line} />
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
            <MarginNote text={slide.note} tilt={1.3} size={34} inks={inks} />
          </div>
        )}
      </div>
    </>
  );
}
