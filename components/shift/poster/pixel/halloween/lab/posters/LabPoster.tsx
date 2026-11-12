import { HX } from "../../halloweenKit";
import { CAULDRON, CAULDRON_PALETTE, WITCH, WITCH_PALETTE } from "../labArt";
import { MONO, Night, Poster, Skyline, Sprite, Win } from "../kit";

/**
 * The lab: a student stirs a cauldron, and out of its light fly the two
 * things you leave with, a prototype people tried and a one-page portfolio.
 */

/** The light column rising out of the brew. */
function Beam() {
  return (
    <>
      <div
        className="absolute left-[330px] top-[40px] h-[520px] w-[420px]"
        style={{ background: `linear-gradient(0deg, ${HX.screen}aa, ${HX.screen}00)`, filter: "blur(34px)", mixBlendMode: "screen" }}
      />
      <div
        className="absolute left-[470px] top-[160px] h-[380px] w-[140px]"
        style={{ background: `linear-gradient(0deg, ${HX.cream}, ${HX.screen}00)`, filter: "blur(12px)", mixBlendMode: "screen", opacity: 0.7 }}
      />
    </>
  );
}

/** A few bubbles leaving the brew, as plain pixel squares. */
const BUBBLES = [
  { x: 420, y: 452, s: 18 },
  { x: 610, y: 420, s: 24 },
  { x: 500, y: 380, s: 12 },
  { x: 664, y: 346, s: 12 },
  { x: 446, y: 318, s: 18 },
];

function Prototype() {
  return (
    <Win title="PROTO.EXE" x={226} y={110} w={320} rotate={-8}>
      <div className="px-[16px] pb-[14px] pt-[12px]">
        <div className="flex flex-col gap-[8px] p-[10px]" style={{ backgroundColor: HX.screen, border: `3px solid ${HX.ink}` }}>
          <span className="h-[14px] w-[70%]" style={{ backgroundColor: HX.ink }} />
          <span className="h-[14px] w-[90%]" style={{ backgroundColor: HX.hat }} />
          <span className="h-[14px] w-[55%]" style={{ backgroundColor: HX.hat }} />
          <span
            className="mt-[4px] self-end px-[12px] py-[2px] text-[15px] font-bold"
            style={{ fontFamily: MONO, backgroundColor: HX.pumpkin, border: `3px solid ${HX.ink}`, color: HX.ink }}
          >
            TRY IT
          </span>
        </div>
        <p className="mt-[10px] whitespace-nowrap font-kodchasan text-[24px] font-bold leading-[1.3]" style={{ color: HX.ink }}>
          ต้นแบบที่คนจริงลองใช้
        </p>
      </div>
    </Win>
  );
}

function Portfolio() {
  return (
    <Win title="PORT.PDF" x={566} y={236} w={270} rotate={7}>
      <div className="px-[16px] pb-[14px] pt-[10px]">
        <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={{ color: HX.ink }}>
          พอร์ต 1 หน้า
        </p>
        <div className="mt-[6px] flex flex-col gap-[7px]">
          {["100%", "85%", "92%", "60%"].map((w) => (
            <span key={w} className="h-[10px]" style={{ width: w, backgroundColor: HX.stone }} />
          ))}
        </div>
      </div>
    </Win>
  );
}

export function LabPoster({ id }: { id: string }) {
  return (
    <Poster id={id} headline={"เราไม่ให้ไอเดีย\nเราเปิด==แล็บ==ให้"} sub="คืนแรกหาโจทย์ด้วยกัน แล้วคุณเลือกเอง Mentor ถามให้คิด แต่ไม่คิดแทน">
      <Night light={[540, 560]} />
      <Skyline top={600} bottom={800} />
      <Beam />
      {BUBBLES.map((b) => (
        <span key={`${b.x}-${b.y}`} className="absolute" style={{ left: b.x, top: b.y, width: b.s, height: b.s, backgroundColor: HX.screen }} />
      ))}
      <Prototype />
      <Portfolio />
      <Sprite grid={CAULDRON} palette={CAULDRON_PALETTE} cell={24} x={300} y={476} glow={`${HX.screen}88`} />
      <Sprite grid={WITCH} palette={WITCH_PALETTE} cell={12} x={132} y={520} />
    </Poster>
  );
}
