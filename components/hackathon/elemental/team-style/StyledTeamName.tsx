import type { CSSProperties } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { nameStyleCss, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";

/**
 * A team's name in its own style. The style is the students' own content, so
 * it may be loud; the page around it stays calm. Needs teamStyleFonts on a
 * wrapper (./fonts.ts). A team without a name shows a quiet placeholder.
 */
export function StyledTeamName({
  name,
  style,
  placeholder = "ยังไม่ตั้งชื่อ",
  className,
  sizeStyle,
}: {
  name: string | null;
  style: TeamNameStyle;
  placeholder?: string;
  className?: string;
  sizeStyle?: CSSProperties;
}) {
  if (!name) {
    return (
      <span className={className} style={{ color: EL.inkSoft, fontStyle: "italic", fontWeight: 300, ...sizeStyle }}>
        {placeholder}
      </span>
    );
  }
  // The styled part is inline, so a gradient or a marker hugs the text, not the whole row.
  return (
    <span className={className} style={{ ...sizeStyle, overflowWrap: "anywhere" }}>
      <span style={nameStyleCss(style)}>{name}</span>
    </span>
  );
}
