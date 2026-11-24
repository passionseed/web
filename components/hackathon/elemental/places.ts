/**
 * Real places that were damaged and came back. Each paid ticket opens on one
 * of them, and people in the same team each get a different one (by the order
 * they signed up). Photos are cropped to 4:5 and credited on the ticket.
 */
export type RecoveredPlace = {
  src: string;
  nameTh: string;
  storyTh: string;
  altTh: string;
  credit: string;
  creditUrl: string;
};

export const PLACES: readonly RecoveredPlace[] = [
  {
    src: "/hackathon/elemental/places/maya-bay-2022.webp",
    nameTh: "อ่าวมาหยา กระบี่",
    storyTh: "ปิดให้ธรรมชาติฟื้น 2561 ถึง 2565",
    altTh: "น้ำทะเลสีมรกตและหาดทรายขาวที่อ่าวมาหยา เกาะพีพีเล ปี 2565",
    credit: "ภาพ: Janjira Jane, CC BY-SA 4.0",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Emerald_water_at_Maya_Bay_Ko_Phi_Phi_Le.jpg",
  },
  {
    src: "/hackathon/elemental/places/cheonggyecheon-2024.webp",
    nameTh: "คลองชองกเยชอน โซล",
    storyTh: "รื้อทางด่วนออก คืนลำธารให้เมือง 2546 ถึง 2548",
    altTh: "ลำธารชองกเยชอนกลางกรุงโซลยามเช้า มีต้นไม้สองฝั่ง",
    credit: "ภาพ: Basile Morin, CC BY-SA 4.0",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Cheonggyecheon_stream_at_sunrise_with_trees_in_Seoul.jpg",
  },
  {
    src: "/hackathon/elemental/places/bishan-2022.webp",
    nameTh: "แม่น้ำกัลลัง สวนบิชาน สิงคโปร์",
    storyTh: "จากรางคอนกรีต กลับเป็นแม่น้ำ 2552 ถึง 2555",
    altTh: "แม่น้ำกัลลังไหลผ่านทุ่งหญ้าในสวนบิชาน อังโมเกียว",
    credit: "ภาพ: Wzhkevin, CC BY-SA 4.0",
    creditUrl: "https://commons.wikimedia.org/wiki/File:Looking_north_up_Kallang_River_at_Bishan-Ang_Mo_Kio_Park.jpg",
  },
  {
    src: "/hackathon/elemental/places/isar-2015.webp",
    nameTh: "แม่น้ำอิซาร์ มิวนิก",
    storyTh: "รื้อตลิ่งคอนกรีต คืนแม่น้ำ 2543 ถึง 2554",
    altTh: "แม่น้ำอิซาร์ไหลผ่านหาดกรวดและต้นไม้สีใบไม้ร่วงในมิวนิก",
    credit: "ภาพ: Achim Lammerts, CC BY-SA 4.0",
    creditUrl: "https://commons.wikimedia.org/wiki/File:2015-10-24_D300-3666_Achim-Lammerts_Munich-Isar-Flaucher.jpg",
  },
  {
    src: "/hackathon/elemental/places/lamar-valley.webp",
    nameTh: "หุบเขาลามาร์ เยลโลว์สโตน",
    storyTh: "นำหมาป่ากลับคืนป่าในปี 2538",
    altTh: "ทุ่งหญ้าเขียวและป่าสนในหุบเขาลามาร์",
    credit: "ภาพ: NPS / Jacob W. Frank, สาธารณสมบัติ",
    creditUrl: "https://www.nps.gov/yell/",
  },
];

/** FNV-1a: a small, stable hash of the pay token. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Teammates get places in sign-up order; anyone alone gets one from their token. */
export function placeFor(token: string, teamPosition: number | null): RecoveredPlace {
  const i = teamPosition ?? hash(token);
  return PLACES[i % PLACES.length];
}

/** A short number printed on the ticket, e.g. "No. 4K7Q2M". Not the token itself. */
export function ticketNumber(token: string): string {
  return hash(`ticket:${token}`).toString(36).toUpperCase().padStart(6, "0").slice(-6);
}
