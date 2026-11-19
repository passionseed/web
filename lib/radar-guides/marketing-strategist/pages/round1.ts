/**
 * Level 5 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * marketing could do, to sort into the TCASfolio bins. Faculties checked
 * against the TCAS70 mytcas course feed on 2026-11-20: marketing programmes
 * sit mostly in business administration and management science faculties,
 * advertising in communication arts. course.mytcas.com has no search URL (the
 * search box is client-side), so the link opens its home page.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สายการตลาด",
  facultiesTh: "บริหารธุรกิจ สาขาการตลาด และนิเทศศาสตร์ สาขาโฆษณา",
  mytcasHref: "https://course.mytcas.com",
  items: [
    {
      id: "shop-plan",
      labelTh: "วางแผนช่วยร้านหน้าโรงเรียน แล้วนับว่านักเรียนแวะเพิ่มจริงไหม",
      answer: "project",
      revealTh: "โครงงาน: มีแผน มีตัวเลขก่อนกับหลัง คนอ่านเห็นเลยว่าเธอคิดยังไง",
    },
    {
      id: "survey",
      labelTh: "ถามเพื่อนทั้งระดับว่าเลือกร้านน้ำจากอะไร แล้วสรุปเป็นอินไซต์",
      answer: "project",
      revealTh: "โครงงาน: นี่คืองานวิจัยผู้บริโภคย่อมๆ ที่เธอทำเอง",
    },
    {
      id: "booth",
      labelTh: "ดูแลบูธขายของในงานโรงเรียน ทำป้ายกับโพสต์ชวนคนมาเอง",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าเธอทำอะไร แล้วขายได้ดีขึ้นไหม",
    },
    {
      id: "club-page",
      labelTh: "ดูแลเพจชุมนุม ทำโพสต์ชวนเพื่อนมาสมัคร",
      answer: "activity",
      revealTh: "กิจกรรม: จดไว้ด้วยว่าโพสต์แบบไหนมีคนสมัครเยอะสุด",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากเวทีประกวดแผนการตลาดหรือคลิปโฆษณา",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่แผนที่ส่งแข่งสำคัญกว่าใบเกียรติบัตรเยอะ",
    },
  ],
});
