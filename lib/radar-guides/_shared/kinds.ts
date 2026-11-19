/**
 * "This career is a broad name": one short beat in every career's Level 1, so
 * a student who hasn't chosen yet knows the name covers several different
 * jobs. The level's game showed one of them; the card lists the others, one
 * line each, and the host says there's no need to pick yet.
 *
 * One card (lines separated by "\n"), not a card per kind: each card is a
 * "ต่อ" press.
 */
import type { FactId, GuideBlock } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host, item } from "./story";

export interface CareerKind {
  /** What people in the field call it, short: "สายสร้างแอป AI". */
  titleTh: string;
  /** What the work is, one short line, ideally with a real example. */
  bodyTh: string;
}

export interface CareerKindsOptions {
  /** The career as the student knows it: "วิศวกร AI", "สายไซเบอร์". */
  nameTh: string;
  /** 4 to 5 kinds. Put the one the level's game showed first. */
  kinds: readonly CareerKind[];
  /** Facts behind any example named in a line. */
  facts?: readonly FactId[];
}

export function careerKindsBeat(opts: CareerKindsOptions): GuideBlock {
  const text = opts.kinds.map((k) => `${k.titleTh}: ${k.bodyTh}`).join("\n");
  return beat(
    "beat-kinds",
    "สายนี้มีกี่แบบ",
    dialogue(
      "kinds-intro",
      host(`${opts.nameTh} เป็นชื่อเรียกกว้างๆ นะ`),
      host("งานจริงแยกได้อีกหลายแบบ แต่ละแบบทำไม่เหมือนกันเลย", { mood: "wow" })
    ),
    item("kinds", "intel", text, {
      title: `${opts.nameTh} มีหลายแบบ`,
      ...(opts.facts?.length ? { facts: opts.facts } : {}),
    }),
    dialogue(
      "kinds-after",
      host("ที่เธอเพิ่งลองไป คือแบบแรก", { mood: "wink" }),
      host("ยังไม่ต้องรีบเลือกตอนนี้ ค่อยๆ ลองไปทีละแบบก็ได้")
    )
  );
}
