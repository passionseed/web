import type { CSSProperties } from "react";

import { INK } from "./riso";

/**
 * The cover's hero object: a student's live project on a phone, rising out
 * of the horizon like the sun. The phone is photo-real on purpose, a real
 * screenshot pasted onto the riso print, so it reads as a thing that exists.
 * The project is an illustrative example, and the hand note says so.
 */

const UI_FONT =
  'var(--font-noto-sans-thai), -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif';

const IOS = {
  blue: "#007aff",
  green: "#34c759",
  label: "#1c1c1e",
  secondary: "#8e8e93",
  fill: "#f2f2f7",
  separator: "#e5e5ea",
};

const APP = {
  name: "BadmintonQ",
  // A free vercel.app subdomain is the tell of a scrappy student build.
  url: "badmintonq.vercel.app",
  club: "ชมรมแบดมินตัน ม.ปลาย",
  version: "beta v0.3",
  users: 23,
  slots: [
    { time: "16:00", court: "คอร์ท 1", open: false },
    { time: "17:00", court: "คอร์ท 2", open: true },
    { time: "18:00", court: "คอร์ท 1", open: true },
  ],
};

export const PHONE_W = 320;
export const PHONE_H = 640;

function StatusIcons() {
  return (
    <svg width="68" height="12" viewBox="0 0 68 12" aria-hidden="true">
      {[3, 5.5, 8, 10.5].map((h, i) => (
        <rect key={i} x={i * 4.5} y={11 - h} width="3" height={h} rx="0.8" fill={IOS.label} />
      ))}
      <path
        d="M27 4.2a8 8 0 0 1 11 0M29.2 6.6a4.8 4.8 0 0 1 6.6 0M31.4 9a1.6 1.6 0 0 1 2.2 0"
        stroke={IOS.label}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="43" y="1" width="21" height="10" rx="3" stroke={`${IOS.label}66`} fill="none" />
      <rect x="45" y="3" width="15" height="6" rx="1.5" fill={IOS.label} />
      <rect x="65" y="4.5" width="1.6" height="3" rx="0.8" fill={`${IOS.label}66`} />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="relative flex h-[44px] items-center justify-between px-6 pt-1">
      <span className="text-[14px] font-semibold" style={{ color: IOS.label }}>
        9:41
      </span>
      <span className="absolute left-1/2 top-[10px] h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
      <StatusIcons />
    </div>
  );
}

function UrlBar() {
  return (
    <div
      className="mx-3 flex items-center justify-center gap-1.5 rounded-[11px] py-[7px] text-[13px]"
      style={{ backgroundColor: IOS.fill, color: IOS.label }}
    >
      <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true">
        <rect x="0.5" y="4.5" width="8" height="6" rx="1.2" fill={IOS.secondary} />
        <path d="M2.3 4.5V3a2.2 2.2 0 0 1 4.4 0v1.5" stroke={IOS.secondary} strokeWidth="1.2" fill="none" />
      </svg>
      {APP.url}
    </div>
  );
}

/** iOS notification banner, dropped in above the page. */
function Notification() {
  return (
    <div
      className="relative z-10 mx-2 mb-2 flex items-center gap-2.5 rounded-[18px] px-3 py-2.5"
      style={{
        backgroundColor: "rgba(246,246,248,0.94)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
      }}
    >
      <AppIcon size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold" style={{ color: IOS.label }}>
            {APP.name}
          </p>
          <p className="text-[11px]" style={{ color: IOS.secondary }}>
            เมื่อกี้
          </p>
        </div>
        <p className="text-[12.5px] leading-[1.35]" style={{ color: IOS.label }}>
          มีคนใหม่จองคอร์ท 2 เวลา 17:00
        </p>
      </div>
    </div>
  );
}

function AppIcon({ size }: { size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        fontSize: size * 0.5,
        background: `linear-gradient(145deg, ${INK.orange}, #ff3d6e)`,
      }}
    >
      Q
    </span>
  );
}

function AppHeader() {
  return (
    <div className="flex items-center gap-3 px-4">
      <AppIcon size={40} />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[19px] font-bold leading-tight" style={{ color: IOS.label }}>
            {APP.name}
          </p>
          <span
            className="rounded-[5px] px-1.5 py-[1px] text-[10px] font-semibold uppercase"
            style={{ backgroundColor: "#fff1c2", color: "#9a6b00" }}
          >
            {APP.version}
          </span>
        </div>
        <p className="text-[12px]" style={{ color: IOS.secondary }}>
          {APP.club}
        </p>
      </div>
    </div>
  );
}

function SlotRow({ time, court, open }: (typeof APP.slots)[number]) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-[15px] font-semibold" style={{ color: IOS.label }}>
          {time}
        </p>
        <p className="text-[12px]" style={{ color: IOS.secondary }}>
          {court}
        </p>
      </div>
      {open ? (
        <span
          className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-white"
          style={{ backgroundColor: IOS.blue }}
        >
          จอง
        </span>
      ) : (
        <span className="text-[13px]" style={{ color: IOS.secondary }}>
          เต็มแล้ว
        </span>
      )}
    </div>
  );
}

function SlotList({ showUsers }: { showUsers: boolean }) {
  return (
    <div className="mx-4 rounded-[14px] px-4 py-1" style={{ backgroundColor: IOS.fill }}>
      <div className="flex items-center justify-between pb-0.5 pt-2.5">
        <p className="text-[13px] font-semibold" style={{ color: IOS.label }}>
          คอร์ทวันนี้
        </p>
        {showUsers && (
          <p className="flex items-center gap-1 text-[12px]" style={{ color: IOS.green }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: IOS.green }} />
            {APP.users} คนใช้แล้ว
          </p>
        )}
      </div>
      {APP.slots.map((slot, i) => (
        <div key={slot.time} style={i > 0 ? { borderTop: `1px solid ${IOS.separator}` } : undefined}>
          <SlotRow {...slot} />
        </div>
      ))}
    </div>
  );
}

function Screen({ showUsers }: { showUsers: boolean }) {
  return (
    <div
      className="relative h-full overflow-hidden rounded-[40px] bg-white antialiased"
      style={{ fontFamily: UI_FONT }}
    >
      <StatusBar />
      <Notification />
      <UrlBar />
      <div className="mt-5 space-y-4">
        <AppHeader />
        <SlotList showUsers={showUsers} />
      </div>
      {/* Glass: a faint diagonal reflection across the screen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0) 58%)",
        }}
      />
    </div>
  );
}

function SideButton({ style }: { style: CSSProperties }) {
  return (
    <span
      className="absolute w-[4px] rounded-[2px]"
      style={{ background: "linear-gradient(90deg, #2a2a2e, #55555c)", ...style }}
    />
  );
}

/** Positioned by the caller; `style` carries left/top. */
export function PosterPhone({
  style,
  showUsers = true,
}: {
  style: CSSProperties;
  /** The mock user count. Off where a stranger could read it as a real result. */
  showUsers?: boolean;
}) {
  return (
    <div className="absolute" style={{ width: PHONE_W, height: PHONE_H, rotate: "7deg", ...style }}>
      {/* Pink plate still lands behind it, tying the photo to the print */}
      <div
        className="absolute inset-0 rounded-[52px]"
        style={{ backgroundColor: INK.pink, translate: "10px 7px", opacity: 0.4, filter: "blur(2px)" }}
      />
      <SideButton style={{ left: -3, top: 120, height: 34 }} />
      <SideButton style={{ left: -3, top: 170, height: 58 }} />
      <SideButton style={{ right: -3, top: 150, height: 86 }} />
      <div
        className="relative h-full rounded-[52px] p-[11px]"
        style={{
          background: "linear-gradient(145deg, #6b6b73 0%, #2b2b30 18%, #1b1b1f 60%, #4a4a52 100%)",
          boxShadow:
            "inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 0 0 5px #0b0b0d, 0 30px 60px rgba(8,4,20,0.55)",
        }}
      >
        <Screen showUsers={showUsers} />
      </div>
    </div>
  );
}

/** Marker yellow of .pathlab-note, so the arrow reads as the same pen. */
const NOTE_INK = "rgb(255, 219, 115)";

/** Hand-drawn arrow that curls once before pointing down-right at the phone. */
function LoopArrow({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg
      className="absolute overflow-visible"
      width={size * 4.4}
      height={size * 4}
      viewBox="0 0 140 128"
      fill="none"
      stroke={NOTE_INK}
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ left: "8%", top: "88%", filter: "drop-shadow(0 4px 8px rgba(8,4,20,0.35))", ...style }}
      aria-hidden="true"
    >
      <path d="M18 4 C4 38 10 76 44 78 C72 80 70 46 52 50 C34 54 40 96 72 108 C92 115 110 115 126 108" />
      <path d="M110 98 L127 108 L111 121" />
    </svg>
  );
}

/**
 * Yellow marker note slapped across the top of the phone. Worded as what a
 * student can build, since the app is an example, not a past result.
 */
export function StickerNote({
  style,
  size = 30,
  arrowStyle,
  text = "แอปแบบนี้ ม.5 ทำเองได้",
}: {
  style: CSSProperties;
  size?: number;
  /** Nudge where the arrow leaves the note so it lands on the phone. */
  arrowStyle?: CSSProperties;
  text?: string;
}) {
  return (
    <div className="absolute z-10" style={{ rotate: "5deg", ...style }}>
      <LoopArrow size={size} style={arrowStyle} />
      <p
        className="pathlab-note pathlab-note--tilt-r relative whitespace-nowrap"
        style={{ fontSize: size, boxShadow: "0 8px 18px rgba(8,4,20,0.35)" }}
      >
        {text}
      </p>
    </div>
  );
}
