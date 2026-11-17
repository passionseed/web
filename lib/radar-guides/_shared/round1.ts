/**
 * Level 1 · round1, shared by every career: "TCAS round 1 is for you".
 *
 * For the student who doesn't know round 1 exists, or thinks university only
 * means exam scores. The level says it plainly (a round where what you've
 * built speaks for you), lets them sort their own kind of work into the
 * TCASfolio categories, then says what each grade can do now.
 *
 * Rules (company-brain marketing.md): never promise admission, never say
 * round 3 is hopeless. Each career passes its own examples; the frame and
 * facts are the same everywhere.
 */
import type { FactId, GuidePage, SortItem } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "./round1-meta";
import { beat, dialogue, host, item, sys } from "./story";

const ROUNDS = "f.tcas70-rounds" as const;
const FOLIO = "f.tcasfolio" as const;

/** TCASfolio categories from the PPTV report (f.tcasfolio), as sort bins. */
export const ROUND_ONE_BINS = [
  { id: "project", labelTh: "โครงงาน" },
  { id: "activity", labelTh: "กิจกรรม" },
  { id: "award", labelTh: "เกียรติบัตร รางวัล" },
] as const;
export type RoundOneBin = (typeof ROUND_ONE_BINS)[number]["id"];

export interface RoundOneItem extends Omit<SortItem, "answer"> {
  answer: RoundOneBin;
}

export interface RoundOneOptions {
  order: number;
  asOf: GuidePage["asOf"];
  /** The career as students say it: "สายไซเบอร์", "สาย AI". */
  careerTh: string;
  /**
   * 4 to 5 things a student into this career could do in high school, to sort
   * into the TCASfolio bins. At least one of each bin, and at least two
   * projects: the point is that what they build themselves counts.
   */
  items: readonly RoundOneItem[];
  /** Where programmes for this career are listed, e.g. a course.mytcas.com search. */
  mytcasHref: `https://${string}`;
  /** Faculty names for the mytcas link label, e.g. "วิศวะคอม วิทย์คอม". */
  facultiesTh: string;
  /** Career facts behind the items (a named competition, a practice site), listed in the sources sheet. */
  extraFactIds?: readonly FactId[];
}

export function roundOnePage(opts: RoundOneOptions): GuidePage {
  const { careerTh } = opts;
  return {
    key: "round1",
    order: opts.order,
    titleTh: ROUND_ONE_TITLE_TH,
    questionTh: "เข้ามหาลัยด้วยสิ่งที่ทำเอง ไม่ใช่แค่คะแนนสอบ จริงเหรอ",
    navLabelTh: ROUND_ONE_NAV_TH,
    asOf: opts.asOf,
    minutes: ROUND_ONE_MINUTES,
    factIds: [ROUNDS, FOLIO, "f.ssru-r1", ...(opts.extraFactIds ?? [])],
    og: {
      headlineTh: "TCAS รอบ 1 ใช้ผลงานของเธอยื่นได้ เริ่มเก็บตั้งแต่ตอนนี้เลย",
      stat: { th: "TCAS70 มี 4 รอบ รอบแรกคือ Portfolio", factIds: [ROUNDS] },
    },
    blocks: [
      dialogue(
        "intro",
        host("ก่อนไปต่อ มีเรื่องหนึ่งที่แทบไม่มีใครเคยบอก"),
        host("เข้ามหาลัยไม่ได้มีแค่ทางสอบอย่างเดียวนะ", { mood: "wow" })
      ),
      item("rounds", "stat", "TCAS70 มี 4 รอบ รอบแรกชื่อ Portfolio มหาลัยดูจากสิ่งที่เธอทำมา", {
        title: "mytcas",
        facts: [ROUNDS],
      }),
      dialogue(
        "folio-intro",
        host(`ถ้าเธอเคยลองทำอะไรใน${careerTh} ด้วยตัวเอง นั่นแหละ เอาไปใส่ได้เลย`),
        host("ปีนี้ ทปอ. มีระบบ TCASfolio ให้ทำแฟ้มผลงานได้สูงสุด 40 รายการ", { facts: [FOLIO] })
      ),
      beat(
        "beat-sort",
        "ลองจัดแฟ้มดู",
        dialogue("sort-intro", host("ลองดูสิ ของพวกนี้ควรไปอยู่ช่องไหนในแฟ้ม", { facts: [FOLIO] })),
        {
          kind: "game",
          id: "folio",
          game: {
            engine: "SortGame",
            data: {
              layout: "cards",
              tagTh: "จัดแฟ้มผลงาน",
              goalTh: "จัดของใส่แฟ้ม TCASfolio",
              bins: ROUND_ONE_BINS,
              items: opts.items,
              resultTh: "จัดถูก {score}/{total}",
            },
          },
          track: { done: "round1:done", value: "score" },
          answersTh: [
            `โครงงาน: ${opts.items.filter((i) => i.answer === "project").map((i) => i.labelTh).join(", ")}`,
            `กิจกรรม: ${opts.items.filter((i) => i.answer === "activity").map((i) => i.labelTh).join(", ")}`,
            `เกียรติบัตร รางวัล: ${opts.items.filter((i) => i.answer === "award").map((i) => i.labelTh).join(", ")}`,
          ],
          demoScript: [
            { at: 600, action: "tap", target: `folio.item-${opts.items[0].id}-bin-${opts.items[0].answer}` },
            { at: 2400, action: "wait" },
          ],
        },
        dialogue(
          "sort-after",
          host("เห็นไหม ของที่เธอลงมือทำเองนับได้จริง", { mood: "wink" }),
          host("ไม่ต้องรอใครมาจัดค่าย หรือออกใบเกียรติบัตรให้ก่อนเลย")
        )
      ),
      beat(
        "beat-grade",
        "แล้วตอนนี้ฉันอยู่ ม.ไหนล่ะ",
        dialogue(
          "grade",
          host("ถ้าอยู่ ม.6 รอบ 1 ปีนี้บางที่ยังเปิดรับอยู่ แต่ละคณะปิดไม่พร้อมกันนะ", { facts: [ROUNDS] }),
          host("ถ้าอยู่ ม.5 เธอยังมีเวลาอีกเกือบปี ลองทำชิ้นแรกให้เสร็จก่อนเลย"),
          host("ถ้าอยู่ ม.4 เวลาเยอะสุด ลองได้หลายอย่างเลย ไม่ต้องรีบเลือก", { mood: "wink" })
        ),
        item(
          "ssru",
          "notification",
          "อย่างเช่น สวนสุนันทาเปิดรับรอบ 1 ถึง 9 ก.พ. 2570",
          { title: "ยังเปิดอยู่", meta: "Eduzones", facts: ["f.ssru-r1"], badge: "pending" }
        ),
        item(
          "honesty",
          "intel",
          "รอบ 1 ไม่ได้ง่ายกว่ารอบอื่น แต่ละคณะมีเกณฑ์อย่างเกรดขั้นต่ำ เช็กประกาศของคณะที่สนใจทุกครั้งนะ",
          { title: "พูดตรงๆ" }
        ),
        {
          kind: "link",
          id: "mytcas",
          labelTh: `ดูหลักสูตร ${opts.facultiesTh} ใน mytcas`,
          href: opts.mytcasHref,
          cta: "first-step",
        }
      ),
      dialogue(
        "bridge",
        sys("ผลงานชิ้นแรกไม่ต้องใหญ่โตเลย"),
        host("ด่านต่อไป เริ่มลุยได้คืนนี้เลย", { mood: "wow" })
      ),
    ],
  };
}
