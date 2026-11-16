import type { ReactNode } from "react";

import { ShiftTopBar } from "@/components/shift/ShiftTopBar";

import { BoardNav } from "./BoardNav";
import board from "./board.module.css";

/**
 * The alumni board's frame: the /shift/alumni night sky, the top bar and the tabs.
 * `nav={false}` drops the board tabs, for pages outside the retired board (the
 * board routes redirect to the island, so its tabs would loop).
 */
export function BoardShell({
  children,
  mentor = false,
  nav = true,
}: {
  children: ReactNode;
  mentor?: boolean;
  nav?: boolean;
}) {
  return (
    <div className={`${board.page} font-bai-jamjuree antialiased`} lang="th">
      <ShiftTopBar back={{ href: "/shift/alumni", label: "Alumni" }} />
      <div className={board.shell}>
        {nav && <BoardNav mentor={mentor} />}
        {children}
      </div>
    </div>
  );
}
