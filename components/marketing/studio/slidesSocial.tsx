import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { INK } from "@/components/shift/poster/riso";
import { APPLY_KEYWORD } from "@/components/shift/poster/grid/ApplyCta";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";
import type { ChatSlide, CtaSlide, QuoteSlide } from "@/lib/marketing/types";

import { RichText } from "./RichText";
import { Body, Footnote, Panel, Tag, Title } from "./SlideParts";
import type { StudioInks } from "./studioTheme";

/** Slides that talk: a DM script, a student's own words, and the ask. */

interface Props<S> {
  slide: S;
  inks: StudioInks;
}

export function ChatView({ slide, inks }: Props<ChatSlide>) {
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <Title inks={inks} text={slide.title} size={64} />
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        {slide.lines.map((line, i) => {
          const mine = line.from === "me";
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className="max-w-[800px] px-9 py-6 text-[34px] leading-[1.5]"
                style={{
                  borderRadius: mine ? "28px 28px 6px 28px" : "28px 28px 28px 6px",
                  backgroundColor: mine ? INK.orange : inks.panel,
                  color: mine ? INK.black : inks.text,
                  boxShadow: mine ? `-3px 2px 0 ${INK.pink}` : `inset 0 0 0 1.5px ${inks.panelLine}`,
                }}
              >
                <RichText text={line.text} accent={mine ? INK.black : inks.kicker} />
              </p>
            </div>
          );
        })}
      </div>
      {slide.footnote && <Footnote inks={inks} text={slide.footnote} />}
    </>
  );
}

export function QuoteView({ slide, inks }: Props<QuoteSlide>) {
  const voice = SHIFT_VOICES[slide.voice];
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <div className="my-auto py-6">
        <p className="font-kodchasan text-[200px] font-bold leading-[0.8]" style={{ color: inks.kicker }}>
          “
        </p>
        <p
          className="font-kodchasan text-[50px] font-semibold leading-[1.5]"
          style={{ color: inks.text, textShadow: inks.headingShadow }}
        >
          {voice.quote}
        </p>
        <p className="mt-8 font-kodchasan text-[36px] font-bold" style={{ color: inks.text }}>
          {voice.name} <span className="text-[30px] font-semibold" style={{ color: inks.dim }}>· {voice.meta}</span>
        </p>
        {slide.context && (
          <div className="mt-8 max-w-[880px]">
            <Body inks={inks} text={slide.context} />
          </div>
        )}
      </div>
    </>
  );
}

/** The paper speech bubble with the comment keyword. */
function KeywordBubble() {
  return (
    <span className="relative inline-block">
      <span
        className="inline-block rounded-[12px] px-6 pb-2 pt-3 font-kodchasan text-[72px] font-bold leading-none"
        style={{ backgroundColor: INK.paper, color: INK.black, boxShadow: `-3px 2px 0 ${INK.pink}` }}
      >
        {APPLY_KEYWORD}
      </span>
      <span
        className="absolute left-7 top-full h-[16px] w-[16px]"
        style={{ backgroundColor: INK.paper, clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        aria-hidden="true"
      />
    </span>
  );
}

const ACTION_LINE: Record<CtaSlide["action"], string> = {
  comment: "คอมเมนต์",
  save: "กดเซฟไว้",
  share: "ส่งต่อให้",
  link: "อ่านต่อ",
};

export function CtaView({ slide, inks }: Props<CtaSlide>) {
  return (
    <>
      <Tag inks={inks}>{slide.tag}</Tag>
      <div className="flex flex-1 items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Title inks={inks} text={slide.title} size={72} />
        </div>
        {slide.icon && <RisoIcon name={slide.icon} ink={inks.kicker} size={200} className="shrink-0" />}
      </div>
      <div>
        <Panel inks={inks} hot className="!px-11 !py-10">
          {slide.action === "comment" ? (
            <div className="flex items-center gap-7">
              <p className="font-kodchasan text-[64px] font-bold leading-none">{ACTION_LINE.comment}</p>
              <KeywordBubble />
            </div>
          ) : slide.action === "link" ? (
            <p className="font-mono text-[40px] font-bold leading-tight tracking-tight">{slide.link}</p>
          ) : (
            <p className="font-kodchasan text-[64px] font-bold leading-none">{ACTION_LINE[slide.action]}</p>
          )}
          {slide.body && (
            <p className="mt-6 font-kodchasan text-[36px] font-bold leading-[1.4]">
              <RichText text={slide.body} accent={INK.black} />
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
