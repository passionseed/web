import type { ReactNode } from "react";

import { POSTER_COHORT, formatThaiDate, priceLabel } from "@/lib/content/shift-cohort";

import { MissionPatch } from "./MissionPatch";
import {
  ChromeWordmark,
  CohortBadge,
  INK,
  MISREG_TEXT,
  OrbitSky,
  PAPER_MARGIN,
  PassionSeedMark,
} from "./riso";

/**
 * LINE OA compact rich menu (2500x843) in the SHIFT[2] riso dawn. One sky
 * seen through three windows, one per tap area:
 * [ apply (0-1250) | last round's projects (1250-1875) | ask / send slip (1875-2500) ].
 * The tap areas are set in LINE OA Manager; this only draws them.
 */

export const LINE_MENU_W = 2500;
export const LINE_MENU_H = 843;
/** Tap-area right edges. Mirror these in LINE OA Manager. */
export const LINE_MENU_SPLITS = [1250, 1875] as const;

const COHORT = POSTER_COHORT;
/** Paper gutter between windows, centred on each tap boundary. */
const GUTTER = 20;
/** Same horizon in every window so the dawn reads as one continuous sky. */
const HORIZON_Y = 560;
const PATCH = 300;

function Window({ left, right, children, rising }: { left: number; right: number; children: ReactNode; rising?: ReactNode }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left,
        top: PAPER_MARGIN,
        width: right - left,
        height: LINE_MENU_H - PAPER_MARGIN * 2,
        backgroundColor: INK.black,
        transform: "rotate(-0.18deg)",
      }}
    >
      <OrbitSky horizon={HORIZON_Y} rising={rising} />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/** Title and caption set on the planet, below the horizon. */
function PlanetLabel({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="absolute inset-x-0 text-center" style={{ top: HORIZON_Y + 34 }}>
      <p className="font-kodchasan text-[84px] font-bold leading-[1.15]" style={MISREG_TEXT}>
        {title}
      </p>
      <p className="mt-1 font-kodchasan text-[42px] font-semibold leading-[1.3]" style={{ color: INK.yellow }}>
        {sub}
      </p>
    </div>
  );
}

/** "12–18 ต.ค.": the full range with weekdays wraps at this size. Every round so far starts and ends in one month. */
function shortRange(): string {
  return `${Number(COHORT.startDate.slice(8))}–${formatThaiDate(COHORT.endDate, false)}`;
}

function ApplyWindow() {
  const right = LINE_MENU_SPLITS[0] - GUTTER / 2;
  return (
    <Window left={PAPER_MARGIN} right={right}>
      <div className="absolute left-[64px] top-[44px]">
        <div className="flex items-center gap-6">
          <PassionSeedMark size={64} />
          <CohortBadge size={32} cohort={COHORT} />
        </div>
        <h1 className="mt-6 font-kodchasan text-[80px] font-bold leading-[1.25] tracking-tight" style={MISREG_TEXT}>
          7 วัน ปั้น 1 โปรเจกต์จริง
        </h1>
        <div className="-ml-[44px] -mt-2">
          <ChromeWordmark size={236} name={COHORT.name} />
        </div>
      </div>
      <div
        className="absolute inset-x-[64px] flex items-center justify-between gap-8"
        style={{ top: HORIZON_Y + 40 }}
      >
        <div>
          <p className="whitespace-nowrap font-kodchasan text-[72px] font-bold leading-[1.15]" style={MISREG_TEXT}>
            {shortRange()} · {priceLabel(COHORT)}
          </p>
          <p className="mt-2 inline-flex items-center gap-4 whitespace-nowrap font-kodchasan text-[38px] font-semibold" style={{ color: INK.yellow }}>
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: INK.orange }} />
            ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)} · ม.4–ม.6
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-12 py-6 font-kodchasan text-[64px] font-bold leading-none"
          style={{ backgroundColor: INK.orange, color: INK.paper, boxShadow: `6px 6px 0 ${INK.pink}` }}
        >
          สมัครเลย →
        </span>
      </div>
    </Window>
  );
}

/** A side window: one patch rising out of the dawn, label on the planet. */
function SideWindow({
  left,
  right,
  patch,
  title,
  sub,
}: {
  left: number;
  right: number;
  patch: { ink: string; top: string; bottom: string; center: string; tilt: number };
  title: string;
  sub: string;
}) {
  const width = right - left;
  return (
    <Window
      left={left}
      right={right}
      rising={
        <MissionPatch
          size={PATCH}
          ink={patch.ink}
          top={patch.top}
          bottom={patch.bottom}
          center={patch.center}
          centerSize={patch.center.length > 3 ? 0.17 : 0.3}
          style={{ left: (width - PATCH) / 2, top: HORIZON_Y - PATCH - 70, rotate: `${patch.tilt}deg` }}
        />
      }
    >
      <PlanetLabel title={title} sub={sub} />
    </Window>
  );
}

export function ShiftLineMenu() {
  const [a, b] = LINE_MENU_SPLITS;
  return (
    <div
      id="shift-line-menu"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: LINE_MENU_W, height: LINE_MENU_H, backgroundColor: INK.paper }}
    >
      <ApplyWindow />
      <SideWindow
        left={a + GUTTER / 2}
        right={b - GUTTER / 2}
        patch={{ ink: INK.orange, top: "ผลงานจริง", bottom: "SHIFT[0]", center: "[0]", tilt: -8 }}
        title="ผลงานรุ่น 0"
        sub="เว็บจริง คนใช้จริง"
      />
      <SideWindow
        left={b + GUTTER / 2}
        right={LINE_MENU_W - PAPER_MARGIN}
        patch={{ ink: INK.pink, top: "LINE", bottom: "@passionseed", center: "?", tilt: 7 }}
        title="ถามพี่"
        sub="ส่งสลิป / สงสัยอะไร"
      />
    </div>
  );
}
