/**
 * Words the website and the Discord bot share for the team's tree: seeds,
 * gift, wardrobe and the close-up. One source, so the two cannot drift. Pure
 * strings and functions: no DOM, Node or Discord imports (the bot deploys this
 * file, see FILES in bot/deploy.sh). Gifts belong to the team; nothing here
 * names a student. Thai reviewed (agy, Codex, Cursor), 2026-11-14.
 */
export const TREE_SEEDS = {
  oak: { name: "ต้นโอ๊ก", blurb: "พุ่มกลมสีเขียวป่า เปลือกไม้โอ๊ก" },
  sakura: { name: "ซากุระ", blurb: "พุ่มทรงหัวใจ เปลือกสีซีดาร์แดง ดอกซากุระ" },
  pine: { name: "สน", blurb: "ทรงสนเรียวแหลม ใบสีมิ้นต์ ปลายกิ่งมีน้ำแข็งเกาะ" },
  maple: { name: "เมเปิล", blurb: "ใบเมเปิลสีแดง เปลือกสีขาวแบบเบิร์ช ดอกโคมไฟสีส้ม" },
};

export const TREE_PLANTED = "ทีมเลือกเมล็ดแล้ว ต้นไม้เริ่มจากตรงนี้";

/** Above the four seeds. */
export const TREE_SEED_PICK = "เลือกเมล็ดหนึ่งแบบ ต้นไม้ของทีมจะเริ่มจากเมล็ดนี้";

/**
 * DRAFT (Thai review in progress): the idea line's hint when it starts from
 * the ambition the team wrote when it made the project. The planted line
 * becomes the ambition, so an edit here changes it.
 */
export const TREE_IDEA_PREFILLED = "ทีมเขียนไว้ตอนสร้างโปรเจกต์ แก้ให้ตรงกับตอนนี้ได้";

/** Which part of the tree a look changes, shown with its name (สีใบ ทอง). */
export const TREE_SLOTS = { shape: "ทรงพุ่ม", leaf: "สีใบ", bark: "เปลือกไม้", bloom: "ดอก" };

export const TREE_GIFT = {
  roundHeading: "จบรอบแล้ว ทีมได้ของขวัญหนึ่งชิ้น",
  questHeading: "ส่งเควสต์นี้ครั้งแรกแล้ว ทีมได้ของขวัญหนึ่งชิ้น",
  sub: "เลือกลุคให้ต้นไม้ของทีม 1 จาก 3 แบบ ทุกคนเห็นบนเกาะ",
  /** DRAFT (not yet through the Thai review): the team owns all but one or two items, so fewer than 3 options are left. */
  subFew: "เลือกลุคให้ต้นไม้ของทีม 1 แบบ ทุกคนเห็นบนเกาะ",
  keep: "เก็บไว้ก่อน",
  picked: (name: string) => `ต้นไม้ของทีมได้ ${name} แล้ว`,
};

export const TREE_WARDROBE = {
  heading: "ลุคของต้นไม้",
  sub: "สลับลุคที่ทีมมี ทุกคนในทีมเปลี่ยนได้",
  changed: "เปลี่ยนลุคต้นไม้แล้ว",
};

export const TREE_CLOSEUP = {
  caption: "เหนือดินคือต้นไม้ของทีม ใต้ดินคือราก รากแต่ละเส้นมาจากบันทึกที่ทีมเขียนหลังจบรอบ",
  roots: (n: number) => (n > 0 ? `ตอนนี้มีราก ${n} เส้น` : "ยังไม่มีราก รากเส้นแรกมาจากบันทึกของทีมหลังจบรอบ"),
};
