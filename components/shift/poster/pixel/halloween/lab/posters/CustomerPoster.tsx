import { LATIN } from "../../../../shift3/parts";
import { PIXEL_FONT } from "../../../PixelRects";
import { BAT, BAT_PALETTE, GHOST, GHOST_PALETTE, HX } from "../../halloweenKit";
import { MONO, Moon, Night, Poster, Skyline, Sprite } from "../kit";

/**
 * The customer: a phone tilts toward you with "0 USERS" on the screen and
 * a ghost climbing out of it. The product nobody opened.
 */

/** Flat line chart: thirty days, zero people. */
function FlatChart() {
  return (
    <svg className="mx-auto mt-[24px] block" width={340} height={110} aria-hidden="true">
      <path d="M10 6 V100 H330" fill="none" stroke={HX.stone} strokeWidth="4" />
      {[60, 120, 180, 240, 300].map((x) => (
        <line key={x} x1={x} y1={100} x2={x} y2={106} stroke={HX.stone} strokeWidth="4" />
      ))}
      <path d="M14 94 H320" stroke={HX.pumpkin} strokeWidth="6" />
      <rect x="312" y="86" width="16" height="16" fill={HX.pumpkin} />
    </svg>
  );
}

function GhostPhone() {
  return (
    <div
      className="absolute left-[500px] top-[96px] h-[820px] w-[430px]"
      style={{ transform: "perspective(1600px) rotateY(-20deg) rotateX(6deg) rotate(5deg)" }}
    >
      <div
        className="absolute inset-0 rounded-[56px]"
        style={{ backgroundColor: "#2a2140", border: `6px solid ${HX.ink}`, boxShadow: `0 0 140px ${HX.screen}44, 26px 26px 0 ${HX.ink}` }}
      />
      <div className="absolute inset-[22px] overflow-hidden rounded-[38px]" style={{ background: "linear-gradient(180deg, #172440, #251a3b)" }}>
        <div className="mx-auto mt-[14px] h-[26px] w-[120px] rounded-full" style={{ backgroundColor: HX.ink }} />
        <div className="mx-[16px] mt-[22px] rounded-[18px] px-[16px] py-[10px]" style={{ backgroundColor: `${HX.cream}ee` }}>
          <p className="text-[15px] font-bold" style={{ fontFamily: MONO, color: HX.stoneDark }}>
            MY_STARTUP · now
          </p>
          <p className="font-kodchasan text-[23px] font-bold leading-[1.3]" style={{ color: HX.ink }}>
            วันที่ 30: ยังไม่มีใครเปิดเลย
          </p>
        </div>
        <p className="mt-[34px] text-center text-[240px] leading-[0.9]" style={{ ...PIXEL_FONT, color: HX.screen, textShadow: `0 0 46px ${HX.screen}` }}>
          0
        </p>
        <p className="text-center text-[30px] font-bold tracking-[0.24em]" style={{ fontFamily: LATIN, color: HX.lavender }}>
          USERS
        </p>
        <FlatChart />
      </div>
      <svg className="absolute right-[6px] top-[6px]" width={120} height={120} aria-hidden="true">
        <g stroke={HX.ghostShade} strokeWidth="3" fill="none" opacity="0.85">
          <path d="M118 2 L30 4 M118 2 L50 60 M118 2 L116 90" />
          <path d="M70 3 Q84 26 84 31 Q100 38 117 50" />
          <path d="M44 4 Q66 40 68 48 Q96 60 117 72" />
        </g>
      </svg>
    </div>
  );
}

export function CustomerPoster({ id }: { id: string }) {
  return (
    <Poster id={id} headline={"ของที่ไม่มีใครใช้\nคือ==โปรดักต์ผี=="} sub="ลูกค้าไม่ได้อยากได้ไอเดียเรา เขาอยากให้ปัญหาของเขาหายไป">
      <Night light={[700, 420]} />
      <Moon x={190} y={170} r={80} cell={8} />
      <Sprite grid={BAT} palette={BAT_PALETTE} cell={6} x={300} y={120} rotate={-10} />
      <Skyline top={620} bottom={800} />
      <GhostPhone />
      <Sprite grid={GHOST} palette={GHOST_PALETTE} cell={24} x={236} y={270} rotate={-14} glow={`${HX.screen}99`} />
    </Poster>
  );
}
