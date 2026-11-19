/**
 * "This career is a broad name": one short beat in every career's Level 1, so
 * a student who hasn't chosen yet knows the name covers several different
 * jobs. A job-select grid of pixel tiles (the `kinds` block): the student
 * taps the kinds they're curious about and the host says one line for each.
 * Nothing to read unless they tap. The kind the level's game showed is
 * tagged "เพิ่งลอง".
 */
import type { CareerKindTile, FactId, GuideBlock } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host } from "./story";

export interface CareerKindsOptions {
  /** The career as the student knows it: "วิศวกร AI", "สายไซเบอร์". */
  nameTh: string;
  /** 4 to 5 tiles. Mark the one the level's game showed `played`. */
  tiles: readonly CareerKindTile[];
  /** Facts behind any example named in a line. */
  facts?: readonly FactId[];
}

export function careerKindsBeat(opts: CareerKindsOptions): GuideBlock {
  return beat(
    "beat-kinds",
    "สายนี้มีกี่แบบ",
    dialogue("kinds-intro", host(`จริงๆ ${opts.nameTh} เป็นชื่อเรียกกว้างๆ นะ ข้างในแยกได้อีกหลายสาย`, { mood: "wow" })),
    {
      kind: "kinds",
      id: "kinds",
      headTh: `${opts.nameTh} มีสายไหนบ้าง`,
      tiles: opts.tiles,
      ...(opts.facts?.length ? { factIds: opts.facts } : {}),
    },
    dialogue("kinds-after", host("ยังไม่ต้องรีบเลือกนะ ค่อยๆ ลองไปทีละสายก็ได้", { mood: "wink" }))
  );
}
