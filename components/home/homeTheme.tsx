import type { ReactNode } from "react";

import space from "@/components/shift/next/shiftNext.module.css";
import { T, THEME_HAIR, accentFor, tint } from "@/components/shift/theme/tokens";

/**
 * The home page wears the space style of /shift and /shift/next. Colours come
 * from the theme tokens (SPACE_PALETTE is set on the page root), so nothing
 * in components/home names a colour of its own.
 */

export { T, accentFor, tint };

/** Hairline border and divider classes. */
export const HAIR = THEME_HAIR;

const THAI = /[฀-๿]/;

/** Wide Latin tracking wrecks Thai, so a Thai eyebrow is set as plain text. */
function Eyebrow({ children, centered }: { children: string; centered: boolean }) {
  if (THAI.test(children)) {
    return (
      <p className="text-sm font-semibold" style={{ color: T.accent1 }}>
        {children}
      </p>
    );
  }
  return <p className={`${space.eyebrow} ${centered ? "justify-center" : ""}`}>{children}</p>;
}

/** Section heading: starlight type, with an eyebrow only when it adds a fact. */
export function HomeHeading({
  eyebrow,
  children,
  align = "left",
}: {
  eyebrow?: string;
  children: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "text-center" : undefined}>
      {eyebrow && <Eyebrow centered={centered}>{eyebrow}</Eyebrow>}
      <h2 className={`${space.sectionTitle} font-kodchasan ${eyebrow ? "" : "!mt-0"}`}>{children}</h2>
    </div>
  );
}
