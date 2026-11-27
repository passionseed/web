import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

/**
 * The line under an Elemental link preview (LINE, Facebook, X) and in search:
 * what it is, when, where, who for, the prize and both prices. All facts come
 * from facts.ts, so the preview changes with them.
 */
export function elementalShareDescription(): string {
  return `${ELEMENTAL.edition} Hackathon: ดิน น้ำ ลม ไฟ ${thaiDateLine()} ${ELEMENTAL.venueTh} สำหรับนักเรียน ${ELEMENTAL.gradesTh} รางวัลรวม ${prizeTotal()} บาท สมัครคนเดียว ฿${ELEMENTAL.priceBaht} มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`;
}
