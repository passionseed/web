import { CalendarDays, VenetianMask } from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { BoardPlugin, BoardPluginProps } from "./types";

function PluginLoading() {
  return <div className="wb-soft p-4 text-sm">กำลังเปิด...</div>;
}

/** Shown when an app's code fails to download (say, after a deploy), instead of taking the whole board down. */
function PluginLoadFailed() {
  return (
    <div className="space-y-2 p-4 text-sm">
      <p className="wb-soft">เปิดแอปนี้ไม่ได้ ลองโหลดหน้าใหม่ · Could not load this app</p>
      <button
        type="button"
        className="wb-btn min-h-11 px-3"
        onClick={() => window.location.reload()}
      >
        โหลดใหม่ · Reload
      </button>
    </div>
  );
}

const orFallback = (load: Promise<ComponentType<BoardPluginProps>>) =>
  load.catch((error: unknown) => {
    console.warn("Board app failed to load", error);
    return PluginLoadFailed;
  });

// Each app's code downloads only when someone opens it.
const CalendarPlugin = dynamic<BoardPluginProps>(() => orFallback(import("./CalendarPlugin").then((m) => m.CalendarPlugin)), {
  loading: PluginLoading,
});
const SpyfallPlugin = dynamic<BoardPluginProps>(
  () => orFallback(import("./spyfall/SpyfallPlugin").then((m) => m.SpyfallPlugin)),
  { loading: PluginLoading },
);

/** Every board window. Add one here and it shows up in the Apps menu. */
export const PLUGINS: BoardPlugin[] = [
  {
    id: "calendar",
    name: "ปฏิทินชุมชน · Calendar",
    description: "นัดเจอ นั่งทำงานด้วยกัน เดดไลน์ แล้วกดไปด้วย",
    icon: <CalendarDays size={16} />,
    tile: "b",
    width: 360,
    height: 520,
    widget: { width: 380, height: 540 },
    Component: CalendarPlugin,
  },
  {
    // Window only: everyone's card is private, so it never goes on the shared canvas.
    id: "spyfall",
    name: "สายลับ · Spyfall",
    description: "เกมละลายพฤติกรรม ทุกคนรู้สถานที่ ยกเว้นสายลับ ถามกันให้จับได้",
    icon: <VenetianMask size={16} />,
    tile: "a",
    width: 380,
    height: 600,
    Component: SpyfallPlugin,
  },
];

export const pluginById = (id: string) => PLUGINS.find((p) => p.id === id);
