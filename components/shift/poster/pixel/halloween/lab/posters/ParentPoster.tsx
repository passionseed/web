import { REFUND_PROMISE } from "../../../../riso";
import { SHIFT3 } from "../../../../shift3/facts";
import { LATIN } from "../../../../shift3/parts";
import { CAT, CAT_PALETTE, HX, PUMPKIN, PUMPKIN_PALETTE } from "../../halloweenKit";
import { COIN, COIN_PALETTE } from "../labArt";
import { MONO, Night, Poster, Skyline, Sprite } from "../kit";

/**
 * The parent: the whole cost of trying, as a receipt tilted toward you
 * with a refund stamp on it, and coins dropping into a jack-o'-lantern
 * piggy bank.
 */

/** \u00a0 keeps "พอร์ต 1 หน้า" on one line if the row wraps. */
const ROWS = [
  { label: "เวลา", value: `${SHIFT3.days} เย็น · ${SHIFT3.time} น. · ออนไลน์` },
  { label: "ที่ทำงาน", value: "ห้องกลุ่มบน Discord มี mentor ดูแล" },
  { label: "ได้กลับมา", value: "ต้นแบบที่คนนอกลองใช้ + พอร์ต\u00a01\u00a0หน้า" },
  { label: "ถ้าไม่คุ้ม", value: REFUND_PROMISE },
];

/** Torn top and bottom edges, as stepped zigzags. */
const TORN = (() => {
  const teeth = 16;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    top.push(`${x}% ${i % 2 === 0 ? 0 : 14}px`);
    bottom.unshift(`${x}% calc(100% - ${i % 2 === 0 ? 0 : 14}px)`);
  }
  return `polygon(${[...top, ...bottom].join(", ")})`;
})();

function Receipt() {
  return (
    <div
      className="absolute left-[64px] top-[92px] w-[570px]"
      style={{ transform: "perspective(1300px) rotateX(12deg) rotate(-6deg)", filter: `drop-shadow(16px 16px 0 ${HX.ink})` }}
    >
      <div className="px-[34px] pb-[56px] pt-[34px]" style={{ backgroundColor: HX.bone, clipPath: TORN }}>
        <p className="text-[18px] font-bold tracking-[0.12em]" style={{ fontFamily: MONO, color: HX.woodDark }}>
          RECEIPT · {SHIFT3.name} LAB
        </p>
        <p className="font-kodchasan text-[38px] font-bold leading-[1.3]" style={{ color: HX.ink }}>
          ค่าลองเป็น Founder
        </p>
        <div className="mt-[10px] border-t-[3px] border-dashed" style={{ borderColor: HX.stoneDark }} />
        <dl className="mt-[14px] flex flex-col gap-[12px]">
          {ROWS.map((row) => (
            <div key={row.label} className="flex gap-[14px]">
              <dt className="w-[108px] shrink-0 font-kodchasan text-[22px] font-bold leading-[1.6]" style={{ color: HX.woodDark }}>
                {row.label}
              </dt>
              <dd className="min-w-0 text-[24px] font-semibold leading-[1.45]" style={{ color: HX.ink }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-[16px] border-t-[3px] border-dashed" style={{ borderColor: HX.stoneDark }} />
        <div className="mt-[10px] flex items-baseline justify-between">
          <span className="font-kodchasan text-[32px] font-bold" style={{ color: HX.ink }}>
            รวม
          </span>
          <span className="text-[76px] font-bold leading-none" style={{ fontFamily: LATIN, color: HX.pumpkinDark }}>
            {SHIFT3.price}
          </span>
        </div>
        {SHIFT3.pairPrice && (
          <p className="mt-[8px] text-right text-[21px] font-semibold" style={{ color: HX.woodDark }}>
            สมัครคู่กับเพื่อน จ่ายคนละ {SHIFT3.pairPrice}
          </p>
        )}
      </div>
    </div>
  );
}

/** Rubber stamp with the refund line running around the rim. */
function Stamp({ uid }: { uid: string }) {
  const ring = `${uid}-stamp-ring`;
  return (
    <svg className="absolute left-[560px] top-[70px]" width={240} height={240} viewBox="0 0 290 290" style={{ transform: "rotate(14deg)" }} aria-hidden="true">
      <defs>
        <path id={ring} d="M145,145 m-106,0 a106,106 0 1,1 212,0 a106,106 0 1,1 -212,0" />
      </defs>
      <circle cx="145" cy="145" r="138" fill={`${HX.ink}cc`} stroke={HX.pumpkin} strokeWidth="9" />
      <circle cx="145" cy="145" r="80" fill="none" stroke={HX.pumpkin} strokeWidth="5" />
      <text fill={HX.pumpkin} fontSize="25" fontWeight="700" style={{ fontFamily: "var(--font-kodchasan)" }}>
        <textPath href={`#${ring}`} textLength="660" lengthAdjust="spacing">
          {`${REFUND_PROMISE} ★ FULL REFUND ★`}
        </textPath>
      </text>
      <text x="145" y="136" textAnchor="middle" fill={HX.flame} fontSize="38" fontWeight="700" style={{ fontFamily: MONO }}>
        FULL
      </text>
      <text x="145" y="176" textAnchor="middle" fill={HX.flame} fontSize="30" fontWeight="700" style={{ fontFamily: MONO }}>
        REFUND
      </text>
    </svg>
  );
}

export function ParentPoster({ id }: { id: string }) {
  return (
    <Poster id={id} headline={"ลองเป็น Founder\n==ก่อนลงทุนจริง=="} sub="สำหรับผู้ปกครอง: นี่คือต้นทุนทั้งหมดของการลอง">
      <Night light={[830, 520]} />
      <Skyline top={600} bottom={800} />
      <div className="absolute left-[640px] top-[380px] h-[400px] w-[420px] rounded-full" style={{ background: `radial-gradient(closest-side, ${HX.pumpkin}50, transparent)` }} />
      <Sprite grid={PUMPKIN} palette={PUMPKIN_PALETTE} cell={30} x={700} y={460} glow={`${HX.pumpkin}77`} />
      <div className="absolute left-[821px] top-[494px] h-[12px] w-[78px]" style={{ backgroundColor: HX.ink }} />
      <Sprite grid={CAT} palette={CAT_PALETTE} cell={10} x={978} y={560} flip />
      <Sprite grid={COIN} palette={COIN_PALETTE} cell={11} x={926} y={196} rotate={18} />
      <Sprite grid={COIN} palette={COIN_PALETTE} cell={11} x={896} y={296} rotate={-12} />
      <Sprite grid={COIN} palette={COIN_PALETTE} cell={11} x={848} y={392} rotate={8} />
      <Receipt />
      <Stamp uid={id} />
    </Poster>
  );
}
