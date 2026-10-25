import { CalendarDays } from "lucide-react";

import { CalendarPlugin } from "./CalendarPlugin";
import type { BoardPlugin } from "./types";

/** Every board window. Add one here and it shows up in the Apps menu. */
export const PLUGINS: BoardPlugin[] = [
  {
    id: "calendar",
    name: "ปฏิทินชุมชน · Calendar",
    description: "นัดเจอ นั่งทำงานด้วยกัน เดดไลน์ แล้วกดไปด้วย",
    icon: <CalendarDays size={16} />,
    width: 360,
    height: 520,
    widget: { width: 380, height: 540 },
    Component: CalendarPlugin,
  },
];

export const pluginById = (id: string) => PLUGINS.find((p) => p.id === id);
