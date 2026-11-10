import { SHIFT3 } from "../../../../shift3/facts";
import { PixelIcon } from "../../../PixelRects";
import { GHOST, GHOST_DIM_PALETTE, HX, PUMPKIN, PUMPKIN_PALETTE } from "../../halloweenKit";
import { HEAD, WITCH, WITCH_PALETTE } from "../labArt";
import { MONO, Night, Poster, Sprite } from "../kit";

/**
 * The Demo Day audience: you sit in the crowd. Two spotlights cross on the
 * student at the podium, the screen asks the only question the room cares
 * about, and the backs of heads fill the foreground.
 */

const CURTAIN = `repeating-linear-gradient(90deg, ${HX.hat} 0 26px, #43296b 26px 34px, ${HX.hat} 34px 40px)`;
const STAGE = 590;

function Curtains() {
  return (
    <>
      <div className="absolute left-0 top-0 h-[760px] w-[200px]" style={{ background: CURTAIN, clipPath: "polygon(0 0, 100% 0, 55% 40%, 34% 70%, 28% 100%, 0 100%)" }} />
      <div className="absolute right-0 top-0 h-[760px] w-[200px]" style={{ background: CURTAIN, clipPath: "polygon(0 0, 100% 0, 100% 100%, 72% 100%, 66% 70%, 45% 40%)" }} />
    </>
  );
}

/** Hard-edged light cone from above down to the stage. */
function Beam({ points }: { points: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{ clipPath: `polygon(${points})`, background: `linear-gradient(180deg, ${HX.flame}55, ${HX.flame}0d 85%)`, mixBlendMode: "screen" }}
    />
  );
}

function Screen() {
  return (
    <div
      className="absolute left-[170px] top-[70px] w-[740px] px-[36px] pb-[26px] pt-[16px]"
      style={{ backgroundColor: HX.cream, border: `8px solid ${HX.ink}`, boxShadow: `0 0 90px ${HX.cream}40, 14px 14px 0 ${HX.ink}`, transform: "perspective(1400px) rotateX(8deg) rotate(-2deg)" }}
    >
      <p className="text-right text-[18px] font-bold tracking-[0.1em]" style={{ fontFamily: MONO, color: HX.stoneDark }}>
        DEMO DAY · NIGHT {SHIFT3.demoDay}
      </p>
      <p className="text-center font-kodchasan text-[124px] font-bold leading-[1.15]" style={{ color: HX.ink }}>
        ใครใช้แล้ว<span style={{ color: HX.pumpkin }}>?</span>
      </p>
    </div>
  );
}

/** Backs of heads, nearest biggest, one ghost in the seats. */
const CROWD = [
  { x: -60, y: 560, cell: 28 },
  { x: 180, y: 612, cell: 22 },
  { x: 600, y: 616, cell: 21 },
  { x: 800, y: 566, cell: 28 },
];

function Crowd() {
  return (
    <>
      {CROWD.map((h) => (
        <Sprite key={h.x} grid={HEAD} palette={{ K: "#07040e" }} cell={h.cell} x={h.x} y={h.y} />
      ))}
      <Sprite grid={GHOST} palette={GHOST_DIM_PALETTE} cell={15} x={420} y={590} />
      {/* A raised phone, filming the pitch. */}
      <div
        className="absolute left-[760px] top-[424px] h-[160px] w-[96px] p-[8px]"
        style={{ backgroundColor: HX.ink, border: "4px solid #2a2140", transform: "rotate(9deg)", boxShadow: `0 0 50px ${HX.screen}77` }}
      >
        <div className="flex h-full flex-col justify-between p-[6px]" style={{ backgroundColor: HX.screen }}>
          <span className="text-[13px] font-bold" style={{ fontFamily: MONO, color: HX.pumpkinDark }}>
            ● REC
          </span>
          <span className="mx-auto h-[40px] w-[30px]" style={{ backgroundColor: HX.hat }} />
        </div>
      </div>
    </>
  );
}

export function DemoDayPoster({ id }: { id: string }) {
  return (
    <Poster id={id} headline={"คนดูไม่ซื้อไอเดีย\nเขาซื้อ==หลักฐาน=="} sub={`คืนที่ ${SHIFT3.demoDay} ทุกคนขึ้นพิตช์ เปิดลิงก์ให้คนในห้องกดลองจริง`}>
      <Night light={[540, 360]} count={40} />
      <Screen />
      <Beam points="80px -40px, 230px -40px, 650px 590px, 420px 590px" />
      <Beam points="850px -40px, 1000px -40px, 660px 590px, 430px 590px" />
      <div className="absolute left-[310px] top-[540px] h-[100px] w-[460px] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${HX.flame}66, transparent)` }} />
      <div className="absolute inset-x-0 h-[22px]" style={{ top: STAGE, backgroundColor: HX.wood, borderTop: `4px solid ${HX.bone}` }} />
      <div className="absolute inset-x-0 h-[300px]" style={{ top: STAGE + 22, backgroundColor: HX.woodDark }} />
      <Sprite grid={WITCH} palette={WITCH_PALETTE} cell={12} x={540 - 72} y={STAGE - 222} />
      <div
        className="absolute left-[436px] flex h-[118px] w-[208px] items-center justify-center"
        style={{ top: STAGE - 116, backgroundColor: HX.wood, border: `5px solid ${HX.ink}`, boxShadow: `inset -10px 0 0 ${HX.woodDark}` }}
      >
        <PixelIcon grid={PUMPKIN} palette={PUMPKIN_PALETTE} scale={8} />
      </div>
      <Curtains />
      <Crowd />
    </Poster>
  );
}
