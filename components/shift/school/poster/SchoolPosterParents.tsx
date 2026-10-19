import { PIXEL_FONT } from "@/components/shift/poster/pixel/PixelRects";
import { PX } from "@/components/shift/poster/pixel/pixelKit";
import { SCHOOL_POSTERS } from "@/lib/content/shift-school";

import { Card, Icon, InnerPoster, Lines, SectionLabel, Tag } from "./SchoolPosterParts";

const COPY = SCHOOL_POSTERS.parents;

function Consent() {
  return (
    <section>
      <SectionLabel en="CONSENT">{COPY.consentLabel}</SectionLabel>
      <ul className="mt-5 grid grid-cols-3 gap-[16px]">
        {COPY.layers.map((layer, i) => (
          <li key={layer.title}>
            <Card strong={i === 0} className="flex h-full min-h-[250px] flex-col px-[20px] py-[22px]">
              <div className="flex items-start justify-between">
                <Icon name="doc" scale={6} />
                <Tag tone={i === 0 ? "light" : "dim"}>{layer.tag}</Tag>
              </div>
              <p className="mt-[16px] font-kodchasan text-[25px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
                <Lines text={layer.title} />
              </p>
              <p className="mt-[8px] text-[19px] leading-[1.45]" style={{ color: `${PX.cream}cc` }}>
                {layer.body}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Checks({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-[14px]">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-[12px] text-[22px] leading-[1.35]" style={{ color: PX.cream }}>
          <span className="h-[10px] w-[10px] shrink-0" style={{ backgroundColor: PX.accent }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Data() {
  return (
    <Card className="grid grid-cols-2 gap-[28px] px-[26px] py-[24px]">
      <div>
        <div className="flex items-center gap-[14px]">
          <Icon name="lock" scale={5} />
          <p className="font-kodchasan text-[26px] font-bold" style={{ color: PX.cream }}>
            {COPY.collectLabel}
          </p>
        </div>
        <Checks items={COPY.collect} />
      </div>
      <div>
        <div className="flex items-center gap-[14px]">
          <Icon name="chart" scale={5} />
          <p className="font-kodchasan text-[26px] font-bold" style={{ color: PX.cream }}>
            {COPY.promisesLabel}
          </p>
        </div>
        <Checks items={COPY.promises} />
      </div>
    </Card>
  );
}

function Safety() {
  return (
    <section>
      <Card strong className="flex items-center gap-[26px] px-[26px] py-[22px]">
        <Icon name="shield" scale={8} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[16px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
            SAFEGUARDING
          </p>
          <p className="mt-[8px] font-kodchasan text-[28px] font-bold" style={{ color: PX.cream }}>
            {COPY.safetyLabel}
          </p>
          <Checks items={COPY.safety} />
        </div>
      </Card>
    </section>
  );
}

/** Poster 4: what a parent signs, what we keep, and how students stay safe. */
export function SchoolPosterParents() {
  return (
    <InnerPoster id="school-poster-4" page={4} kicker={COPY.kicker} heading={COPY.heading}>
      <Consent />
      <Data />
      <Safety />
    </InnerPoster>
  );
}
