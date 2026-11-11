import { ShiftHighBlocks } from "@/components/shift/high/ShiftHighBlocks";
import { HomeHeading, tint } from "./homeTheme";
import { SHIFT_HIGH } from "@/lib/content/shift-high";
import { MarginNote } from "./MarginNote";

/** What happens after day 7: the SHIFT High community, its goals and prizes. */
export function HomeHigh({ sessionLine }: { sessionLine: string }) {
  return (
    <section className="py-10 sm:py-20">
      <HomeHeading eyebrow={SHIFT_HIGH.eyebrow}>{SHIFT_HIGH.heading}</HomeHeading>
      <p className="mt-5 max-w-2xl text-base leading-relaxed [text-wrap:balance] sm:text-lg" style={{ color: tint("b3") }}>
        {SHIFT_HIGH.lede}
      </p>
      <div className="mt-12">
        <ShiftHighBlocks sessionLine={sessionLine} />
      </div>
      <div className="mt-8">
        <MarginNote>{SHIFT_HIGH.note}</MarginNote>
      </div>
    </section>
  );
}
