"use client";

import type { CSSProperties, ReactNode } from "react";

import { BACKGROUND_SWATCHES, backgroundFor, type BoardSettings, lightCounterpart } from "@/lib/whiteboard/settings";

import type { UpdateBoardSettings } from "./useBoardSettings";

type ControlProps = { settings: BoardSettings; update: UpdateBoardSettings; labelId: string };

/** One row of the Board settings panel. A new setting is one entry in SETTING_ROWS. */
export type SettingRow = {
  id: keyof BoardSettings;
  /** "ไทย · English" */
  label: string;
  hint?: string;
  /** "stack": the control sits under the label (swatches). "inline": at the end of the row (a switch). */
  layout: "stack" | "inline";
  Control: (props: ControlProps) => ReactNode;
};

const isDark = () => typeof document !== "undefined" && !!document.querySelector(".whiteboard-room .excalidraw.theme--dark");

/** A swatch shows the colour as the board will: its light and its dark face, picked by theme in whiteboard.css. */
const faces = (background: string | null) =>
  ({ "--sw-l": backgroundFor({ background, dots: true }, "light"), "--sw-d": backgroundFor({ background, dots: true }, "dark") }) as CSSProperties;

function BackgroundControl({ settings, update, labelId }: ControlProps) {
  const custom = settings.background !== null && !BACKGROUND_SWATCHES.some((s) => s.value === settings.background);
  // The picker works in what is on screen; the setting is kept as the light colour.
  const dark = isDark();
  const shown = backgroundFor(settings, dark ? "dark" : "light");
  return (
    <div className="wb-dots wb-dots--wrap" role="group" aria-labelledby={labelId}>
      {BACKGROUND_SWATCHES.map((s) => (
        <button
          key={s.value ?? "paper"}
          type="button"
          aria-label={s.name}
          aria-pressed={settings.background === s.value}
          title={s.name}
          className="wb-dot wb-dot--lg wb-dot--bg"
          style={faces(s.value)}
          onClick={() => update({ background: s.value })}
        />
      ))}
      <label className={`wb-dot wb-dot--lg wb-dot--custom ${custom ? "wb-dot--on wb-dot--bg" : ""}`} title="เลือกสีเอง · Custom colour" style={custom ? faces(settings.background) : undefined}>
        {!custom && (
          <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden focusable="false">
            <path d="M6 2v8M2 6h8" />
          </svg>
        )}
        <input
          type="color"
          aria-label="เลือกสีเอง · Custom colour"
          value={shown}
          onChange={(e) => update({ background: dark ? lightCounterpart(e.target.value) : e.target.value.toLowerCase() })}
        />
      </label>
    </div>
  );
}

function DotsControl({ settings, update, labelId }: ControlProps) {
  return (
    <button type="button" role="switch" aria-checked={settings.dots} aria-labelledby={labelId} className="wb-switch" onClick={() => update({ dots: !settings.dots })}>
      <span className="wb-switch__thumb" aria-hidden />
    </button>
  );
}

export const SETTING_ROWS: readonly SettingRow[] = [
  { id: "background", label: "สีพื้นหลัง · Background colour", layout: "stack", Control: BackgroundControl },
  { id: "dots", label: "ลายจุด · Dot grid", hint: "จุดเล็กๆ ที่เลื่อนและซูมไปกับบอร์ด", layout: "inline", Control: DotsControl },
];
