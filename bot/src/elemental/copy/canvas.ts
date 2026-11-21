import { ELEMENT_LABELS, type ElementKey } from "../../../../lib/elemental/core/index";
import { COMMON } from "./common";
import { plot } from "./teams";

/**
 * /canvas link (E17). Functional placeholders only: every Thai line waits for
 * a native review before the event ([TH-REVIEW]). No marketing copy, never a
 * name or a contact. What the person typed is never echoed back: replies show
 * only the canonical link the bot rebuilt from the board and frame ids.
 */

function elementName(element: string | undefined): string {
  const label = element ? ELEMENT_LABELS[element as ElementKey] : undefined;
  return label ? `${label.th} (${label.en})` : "อื่น";
}

/** Why a pasted link could not be read, before any database call (parseCanvasUrl). */
export type CanvasUrlProblem = "garbage" | "host" | "invite" | "not_board" | "missing_focus" | "bad_focus";

// [TH-REVIEW] how to get the right link: the frame's own link ends with ?focus= (or Excalidraw's ?element=).
const HOW_TO_COPY = "คลิกขวาที่กรอบแคนวาสโปรเจกต์ของทีม เลือกคัดลอกลิงก์ของวัตถุ (Copy link to object) แล้ววางลิงก์นั้นใน /canvas link";

export const CANVAS = {
  // [TH-REVIEW] /canvas command description (max 100 characters).
  commandDescription: "แคนวาสโปรเจกต์ของทีมบนไวท์บอร์ด",
  // [TH-REVIEW] /canvas link subcommand description (max 100 characters).
  linkDescription: "เชื่อมแคนวาสโปรเจกต์ของทีมกับบอท (ใช้ในห้องของทีม)",
  // [TH-REVIEW] the url option's description (max 100 characters).
  urlDescription: "ลิงก์แคนวาส เช่น passionseed.org/whiteboard/...?focus=...",

  // [TH-REVIEW] used outside a team channel.
  notTeamChannel: "ใช้ /canvas link ในห้องของทีมคุณเท่านั้น",

  // [TH-REVIEW] one line per problem with the pasted link; the link itself is never repeated.
  url: {
    garbage: "อ่านลิงก์นี้ไม่ออก วางลิงก์แคนวาสของทีม เช่น passionseed.org/whiteboard/...?focus=...",
    host: "ใช้ได้เฉพาะลิงก์ไวท์บอร์ดของ passionseed.org",
    invite: `นี่คือลิงก์ชวนเข้าบอร์ด เปิดลิงก์นี้ก่อน แล้ว${HOW_TO_COPY}`,
    not_board: "ลิงก์นี้ไม่ใช่ลิงก์ไวท์บอร์ด ต้องเป็น passionseed.org/whiteboard/...?focus=...",
    missing_focus: `ลิงก์นี้ยังไม่ชี้ไปที่แคนวาสของทีม ${HOW_TO_COPY}`,
    bad_focus: `ส่วน ?focus= ของลิงก์นี้ไม่ถูกต้อง ${HOW_TO_COPY}`,
  } satisfies Record<CanvasUrlProblem, string>,

  // [TH-REVIEW] ephemeral answer after a new link (or a relink).
  linked: (slot: number | null) => (slot ? `เชื่อมแคนวาสของแปลงที่ ${plot(slot)} แล้ว` : "เชื่อมแคนวาสของทีมแล้ว"),
  // [TH-REVIEW] the team already pointed at this exact canvas.
  alreadyLinked: "แคนวาสนี้เชื่อมกับทีมคุณอยู่แล้ว",
  // [TH-REVIEW] a relink replaced the team's previous canvas.
  replaced: "แทนแคนวาสเดิมแล้ว บันทึก /tester ของทีมจะไปอยู่บนแคนวาสนี้",
  // [TH-REVIEW] the board only shows notes the bot wrote after a page reload.
  reload: "โน้ตใหม่จากบอทจะเห็นบนบอร์ดหลังจากรีโหลดหน้าบอร์ด",
  // [TH-REVIEW] where the link was pinned (pinned, kept), or that pinning failed (the link itself still stands).
  pinned: "ปักหมุดลิงก์ไว้ในห้องนี้แล้ว",
  pinKept: "ลิงก์ปักหมุดอยู่ในห้องนี้แล้ว",
  pinPostedOnly: "โพสต์ลิงก์ในห้องนี้แล้ว แต่ปักหมุดไม่ได้",
  pinFailed: "ปักหมุดลิงก์ในห้องนี้ไม่ได้ แต่แคนวาสเชื่อมแล้วตามปกติ",

  // [TH-REVIEW] the pinned message in the team channel; {who} is a mention that pings nobody.
  pinPost: (o: { slot: number | null; url: string; who: string | null }) =>
    [
      o.slot ? `แคนวาสของทีม แปลงที่ ${plot(o.slot)}` : "แคนวาสของทีม",
      `<${o.url}>`,
      ...(o.who ? [`เชื่อมโดย ${o.who}`] : []),
      "โน้ตใหม่จากบอทจะเห็นบนบอร์ดหลังจากรีโหลดหน้าบอร์ด",
    ].join("\n"),
} as const;

/**
 * SQL refusals (el:<code>) of elemental_bot_canvas_link and
 * elemental_bot_canvas_override, each its own line. DETAIL is only ever the
 * board's element (wrong_element_board), never student text.
 */
// [TH-REVIEW] every line below.
export const CANVAS_ERRORS: Record<string, string | ((detail?: string) => string)> = {
  not_team_channel: CANVAS.notTeamChannel,
  board_not_found: "บอร์ดนี้ไม่ใช่บอร์ดของกิจกรรม เปิดบอร์ดธาตุของทีมจากลิงก์ที่ทีมงานให้ แล้วสร้างแคนวาสบนบอร์ดนั้น",
  wrong_element_board: (element) =>
    `ลิงก์นี้อยู่บนบอร์ดธาตุ${elementName(element)} ซึ่งไม่ใช่ธาตุของทีมคุณ สร้างแคนวาสบนบอร์ดธาตุของทีม แล้วส่งลิงก์ใหม่`,
  frame_not_found: `ไม่พบแคนวาสนี้บนบอร์ด (อาจถูกลบไปแล้ว) ${HOW_TO_COPY}`,
  not_project_frame: "ลิงก์นี้ไม่ได้ชี้ไปที่แคนวาสโปรเจกต์ เพิ่มแคนวาสด้วย + แคนวาสโปรเจกต์ บนบอร์ด แล้วส่งลิงก์ของแคนวาสนั้น",
  not_team_canvas: "ล็อกอิน PassionSeed ด้วย Discord ก่อน แล้วแท็กเพื่อนร่วมทีมในแคนวาสด้วย ทีม จากนั้นใช้ /canvas link อีกครั้ง",
  frame_linked: "แคนวาสนี้เชื่อมกับทีมอื่นอยู่แล้ว ทีมของคุณต้องใช้แคนวาสของตัวเอง",
  team_not_found: "ไม่พบทีมที่ยังเล่นอยู่ในแปลงนี้",
  unknown_guild: COMMON.notSetUp,
};

export function canvasErrorText(code: string, detail?: string): string | null {
  const entry = CANVAS_ERRORS[code];
  if (entry === undefined) return null;
  return typeof entry === "function" ? entry(detail) : entry;
}
