import type { ReactNode } from "react";

import { ShiftTopBar } from "@/components/shift/ShiftTopBar";

import { BoardNav } from "./BoardNav";
import board from "./board.module.css";

/** The alumni board's frame: the /shift/alumni night sky, the top bar and the tabs. */
export function BoardShell({ children, mentor = false }: { children: ReactNode; mentor?: boolean }) {
  return (
    <div className={`${board.page} font-bai-jamjuree antialiased`} lang="th">
      <ShiftTopBar back={{ href: "/shift/alumni", label: "Alumni" }} />
      <div className={board.shell}>
        <BoardNav mentor={mentor} />
        {children}
      </div>
    </div>
  );
}
