import { ChromeWordmark, INK, MISREG_TEXT, OrbitSky, PaperSheet, PassionSeedMark } from "./riso";

/**
 * SHIFT[3] date announcement, a plain one-sheet: name, dates, nothing else.
 * Price and seats are not set yet, so they are left off on purpose.
 */

export const SHIFT_3_NAME = "SHIFT[3]";
export const SHIFT_3_DATES = "9 ถึง 14 พ.ย. 2569";
export const SHIFT_3_DATES_EN = "Nov 9 to 14, 2026";

const HORIZON_Y = 760;

export function ShiftThreeDateCover() {
  return (
    <PaperSheet id="shift3-poster-1">
      <OrbitSky horizon={HORIZON_Y} />
      <div className="relative flex h-full flex-col justify-between p-[64px]">
        <PassionSeedMark size={52} />

        <div>
          <ChromeWordmark size={150} name={SHIFT_3_NAME} />
          <p
            className="mt-8 font-kodchasan text-[72px] font-bold leading-[1.2]"
            style={MISREG_TEXT}
          >
            {SHIFT_3_DATES}
          </p>
          <p
            className="mt-3 font-kodchasan text-[34px] font-semibold"
            style={{ color: INK.paper }}
          >
            {SHIFT_3_DATES_EN}
          </p>
        </div>

        <p
          className="font-kodchasan text-[30px] font-semibold"
          style={{ color: INK.yellow }}
        >
          passionseed.org/shift
        </p>
      </div>
    </PaperSheet>
  );
}
