import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftArtKind } from "@/components/shift/theme";
import { RisoHeading } from "@/components/shift/ShiftRiso";
import { accentFor, tint } from "@/components/shift/theme/tokens";
import { SHIFT_SDT } from "@/lib/content/shift-cohort";

import { PixelSdtArt } from "./PixelArt";
import { SdtRingsArt } from "./ShiftArt";
import { ShiftIcon } from "./ShiftIcon";
import { revealClass } from "./motion";

const PILLAR_ICONS: RisoIconName[] = ["compass", "trophy", "people"];

/** Why the week works: three overlapping rings beside the three pillars. */
export function ShiftSdt({ kind }: { kind: ShiftArtKind }) {
  const labels = SHIFT_SDT.map((item) => item.pillar) as [string, string, string];
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="Self-Determination">ทำไมถึงเวิร์ก</RisoHeading>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: tint("99") }}>
        คนจะลงมือเองได้นานเมื่อได้ 3 อย่างนี้พร้อมกัน ทุกส่วนของ 7 วันออกแบบมาจากตรงนี้
      </p>

      <div className="mt-10 grid items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className={`${revealClass(0)} flex justify-center`}>
          {kind === "pixel" ? <PixelSdtArt labels={labels} /> : <SdtRingsArt labels={labels} />}
        </div>
        <ul className="space-y-6">
          {SHIFT_SDT.map((item, i) => (
            <li key={item.pillar} className={`${revealClass(i)} flex gap-5`}>
              <ShiftIcon
                kind={kind}
                name={PILLAR_ICONS[i % PILLAR_ICONS.length]}
                ink={accentFor(i)}
                size={44}
              />
              <div>
                <p
                  className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: accentFor(i) }}
                >
                  {item.pillar}
                </p>
                <h3 className="mt-1 font-kodchasan text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: tint("99") }}>
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
