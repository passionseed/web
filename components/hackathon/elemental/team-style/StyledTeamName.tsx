import type { CSSProperties } from "react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { nameStyleCss, type NameSurface, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";

/**
 * A team's name in its own style. The style is the students' own content, so
 * it may be loud; the page around it stays calm. Needs teamStyleFonts on a
 * wrapper (./fonts.ts) and Trirong (../fonts.ts). surface picks the colour
 * variant: "ground" (the board, the editor, the dark slabs; the default) or
 * "paper" (cream). A team without a name shows a quiet placeholder.
 *
 * Thai tone marks: give it a line height of 1.3 or more. When it is cut
 * short (truncate), pass truncate so the box gets 0.1em above and below and
 * the marks aren't clipped.
 */
export function StyledTeamName({
  name,
  style,
  surface = "ground",
  placeholder = "ยังไม่ตั้งชื่อ",
  className,
  sizeStyle,
  truncate = false,
}: {
  name: string | null;
  style: TeamNameStyle;
  surface?: NameSurface;
  placeholder?: string;
  className?: string;
  sizeStyle?: CSSProperties;
  truncate?: boolean;
}) {
  const box: CSSProperties = {
    ...sizeStyle,
    ...(truncate ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingBlock: "0.1em" } : { overflowWrap: "anywhere" }),
  };
  if (!name) {
    return (
      <span
        className={className}
        style={{ fontFamily: EL_FONT.display, fontStyle: "italic", fontWeight: 300, color: "var(--el-secondary, rgba(29,33,31,0.72))", ...box }}
      >
        {placeholder}
      </span>
    );
  }
  // The styled part is inline, so a gradient or a marker hugs the text, not the whole row.
  return (
    <span className={className} style={box}>
      <span style={nameStyleCss(style, surface)}>{name}</span>
    </span>
  );
}
