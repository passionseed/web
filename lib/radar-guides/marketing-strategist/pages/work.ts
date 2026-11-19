/**
 * Level 1 · work. What the job feels like: the student's first client is a
 * toast shop in front of a school (invented) that wants more students after
 * school. Two steps of the marketing loop, as two quick sorts:
 * 1. pick ideas through the dream level's lens: right people and place, wrong
 *    people, or wrong place;
 * 2. a week later, judge each idea's results: keep, tweak, or stop. Likes are
 *    not customers; an idea nobody sees can't work; measure against the goal.
 * Then the kinds of marketer, with this one (brand and campaigns) first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.mkt-shop" as const;
const PLAN = "f.mkt-plan" as const;
const BUZZ = "f.mkt-butterbear-buzz" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือรู้ว่าพูดกับใคร แล้วนับผล",
  questionTh: "นักการตลาดแค่คิดโฆษณาเจ๋งๆ หรือเปล่า แล้วทั้งวันทำอะไรกันแน่",
  navLabelTh: "ร้านปังหน้าโรงเรียน",
  asOf: "2026-11-20",
  minutes: 2.5,
  factIds: [SIM, PLAN, BUZZ],
  og: { headlineTh: "ไอเดียเจ๋งใครก็คิดได้ แต่รู้ว่ามันได้ผลจริงไหม นั่นแหละงานนักการตลาด" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้ลูกค้าเจ้าแรกแล้วนะ", { mood: "wow" }),
      host("ร้านปังปิ้งหน้าโรงเรียน อยากให้นักเรียนแวะหลังเลิกเรียนเยอะขึ้น", { facts: [SIM] })
    ),
    choice(
      "start",
      host("ถ้าเป็นเธอ จะเริ่มจากตรงไหนดี"),
      answer(
        "ad",
        "คิดโฆษณาเจ๋งๆ ก่อนเลย",
        host("ไอเดียเจ๋งช่วยได้จริง แต่ถ้ายิงผิดคน ก็เสียของนะ"),
        host("นักการตลาดเริ่มจากดูคนก่อนเสมอ", { mood: "wink" })
      ),
      answer("look", "ไปส่องก่อนว่าใครเดินผ่านร้านบ้าง", host("เป๊ะเลย เริ่มจากคน ไม่ได้เริ่มจากโฆษณา", { mood: "wow" })),
      answer(
        "discount",
        "ลดราคาเลย ง่ายสุดละ",
        host("เรียกคนได้ไวจริง แต่ร้านก็ได้เงินน้อยลงทุกชิ้นนะ"),
        host("ลองหาทางที่ไม่ต้องลดราคาก่อนดีกว่า", { mood: "wink" })
      )
    ),
    dialogue("steps", host("ทำเป็นขั้นๆ: เลือกไอเดียให้ตรงคน ลองจริง แล้วค่อยนับผล")),
    beat(
      "beat-ideas",
      "ขั้นแรก: เลือกไอเดีย",
      dialogue(
        "ideas-intro",
        host("ไปยืนส่องหน้าร้านมาแล้ว นักเรียนเดินออกประตูหลังไปรอรถกัน", { facts: [SIM] }),
        host("ไอเดียไหนตรงคน ตรงที่ อันไหนพลาด ลองแยกดูเลย")
      ),
      {
        kind: "game",
        id: "ideas",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "เลือกไอเดียให้ร้าน",
            goalTh: "ไอเดียไหนตรงคน ตรงที่ ไอเดียไหนพลาด",
            bins: [
              { id: "fit", labelTh: "ใช่เลย" },
              { id: "who", labelTh: "ผิดคน" },
              { id: "where", labelTh: "ผิดที่" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "back-gate",
                labelTh: "ป้ายเล็กๆ ที่ประตูหลังโรงเรียน ทางที่นักเรียนเดินไปรอรถ",
                answer: "fit",
                revealTh: "ตรงคน ตรงที่ เห็นทุกวันตอนท้องเริ่มร้องพอดี",
              },
              {
                id: "flyers",
                labelTh: "แจกใบปลิวที่ตลาดเช้า",
                answer: "who",
                revealTh: "ตลาดเช้ามีแต่ผู้ใหญ่ ไม่ใช่นักเรียนที่ร้านอยากได้",
              },
              {
                id: "share-set",
                labelTh: "ชุดแชร์สำหรับกลุ่มที่นั่งติวหลังเลิกเรียน",
                answer: "fit",
                revealTh: "ตรงความรู้สึก: หิว อยากนั่งกับเพื่อน แชร์กันได้ทั้งกลุ่ม",
              },
              {
                id: "morning-post",
                labelTh: "โพสต์ในเพจร้านตอน 10 โมงเช้าวันจันทร์",
                answer: "where",
                nearTh: { who: "คนดูเพจอาจใช่ แต่ตอนนั้นนักเรียนนั่งเรียนอยู่ ไม่มีใครเห็น" },
                revealTh: "ถูกคน แต่ผิดเวลา ตอนนั้นนักเรียนอยู่ในห้องเรียน",
              },
              {
                id: "charger",
                labelTh: "มุมนั่งรอผู้ปกครองมารับ มีที่ชาร์จมือถือ",
                answer: "fit",
                revealTh: "ตรงความรู้สึก: รอนาน เบื่อ แบตใกล้หมด",
              },
              {
                id: "elderly",
                labelTh: "ป้ายเขียนว่า ปังนุ่ม เคี้ยวง่าย เหมาะกับผู้สูงอายุ",
                answer: "who",
                revealTh: "ข้อความนี้พูดกับคนอื่น นักเรียนอ่านแล้วไม่รู้สึกว่าเกี่ยวกับตัวเอง",
              },
            ],
            resultTh: "เลือกถูก {score}/{total}",
          },
        },
        track: { done: "work:ideas", value: "score" },
        answersTh: [
          "ใช่เลย: ป้ายที่ประตูหลัง, ชุดแชร์สำหรับกลุ่มติว, มุมนั่งรอผู้ปกครองมีที่ชาร์จ",
          "ผิดคน: ใบปลิวที่ตลาดเช้า, ป้ายที่พูดกับผู้สูงอายุ",
          "ผิดที่: โพสต์ตอน 10 โมงเช้าวันจันทร์ ที่นักเรียนยังเรียนอยู่",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "ideas.item-back-gate" },
          { at: 1400, action: "tap", target: "ideas.bin-fit" },
          { at: 3200, action: "wait" },
        ],
      },
      dialogue(
        "ideas-after",
        host("ไอเดียเดียวกันเลยนะ แต่ถ้าผิดคนหรือผิดที่ ก็เหมือนไม่ได้ทำ", { mood: "wink" }),
        host("เลือกเสร็จแล้ว ลองลุยจริงสักสัปดาห์ แล้วไปนับผลกัน")
      )
    ),
    beat(
      "beat-results",
      "ขั้นสอง: นับผล",
      dialogue(
        "results-intro",
        host("ครบสัปดาห์แล้ว ผลออกแล้วนะ", { facts: [SIM] }),
        host("แต่ละไอเดีย จะทำต่อ ปรับ หรือเลิก เธอฟันธงเลย")
      ),
      {
        kind: "game",
        id: "results",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "นับผล แล้วตัดสิน",
            goalTh: "ดูผลสัปดาห์แรก แล้วตัดสินทีละไอเดีย",
            bins: [
              { id: "keep", labelTh: "ทำต่อ" },
              { id: "tweak", labelTh: "ปรับแล้วลองใหม่" },
              { id: "stop", labelTh: "เลิก" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "gate-sign",
                labelTh: "ป้ายที่ประตูหลังโรงเรียน",
                meta: { sender: "ผลสัปดาห์แรก" },
                detailTh: "ก่อนติดป้าย: นักเรียนแวะวันละ 8 คน · หลังติด: วันละ 13 คน",
                answer: "keep",
                revealTh: "คนมาเพิ่มจริง แถมนับได้ด้วย แบบนี้ทำต่อเลย",
              },
              {
                id: "cat-clip",
                labelTh: "คลิปแมวประจำร้าน ลง TikTok",
                meta: { sender: "ผลสัปดาห์แรก" },
                detailTh: "ไลก์ 2,400 · นักเรียนที่แวะร้าน: ไม่เพิ่มเลย",
                answer: "tweak",
                nearTh: { stop: "อย่าเพิ่งทิ้ง คนสนใจแล้ว แค่ยังไม่รู้ว่าร้านอยู่ตรงไหน" },
                flags: ["ไลก์เยอะ แต่คนไม่มา"],
                revealTh: "ไลก์เยอะไม่ได้แปลว่าคนมาร้าน ลองบอกในคลิปด้วยว่าร้านอยู่ตรงไหน",
              },
              {
                id: "market-flyers",
                labelTh: "ใบปลิวที่ตลาดเช้า",
                meta: { sender: "ผลสัปดาห์แรก" },
                detailTh: "แจกไป 200 ใบ · มีคนถือใบปลิวมาร้าน 1 คน",
                answer: "stop",
                nearTh: { tweak: "ปรับยังไงก็ยังผิดคนอยู่ดี เอาแรงไปทำอย่างอื่นดีกว่า" },
                revealTh: "ผิดคนตั้งแต่แรก เลิกได้เลย ไม่ต้องเสียดาย",
              },
              {
                id: "share-sets",
                labelTh: "ชุดแชร์สำหรับกลุ่มติว",
                meta: { sender: "ผลสัปดาห์แรก" },
                detailTh: "ขายได้ 25 ชุด · ส่วนใหญ่มากันเป็นกลุ่ม",
                answer: "keep",
                revealTh: "ตรงความรู้สึกจริง แถมพาเพื่อนมาด้วย",
              },
              {
                id: "birthday",
                labelTh: "ของแถมวันเกิด",
                meta: { sender: "ผลสัปดาห์แรก" },
                detailTh: "มีคนมาใช้ 0 คน · ถามแล้ว ไม่มีใครรู้ว่ามีด้วย",
                answer: "tweak",
                nearTh: { stop: "ไอเดียไม่ได้แย่ แค่ยังไม่มีใครเห็น" },
                flags: ["ไม่มีใครเห็น"],
                revealTh: "ปัญหาคือเห็นจากที่ไหน ลองเขียนไว้ที่ป้ายประตูหลังด้วย",
              },
            ],
            resultTh: "ตัดสินถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ทำต่อ: ป้ายประตูหลัง (คนแวะเพิ่ม), ชุดแชร์สำหรับกลุ่มติว",
          "ปรับแล้วลองใหม่: คลิปแมว (ไลก์เยอะแต่คนไม่มา), ของแถมวันเกิด (ไม่มีใครเห็น)",
          "เลิก: ใบปลิวที่ตลาดเช้า (ผิดคน)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "results.item-cat-clip" },
          { at: 1600, action: "tap", target: "results.item-cat-clip-bin-tweak" },
          { at: 3200, action: "tap", target: "results.item-market-flyers" },
          { at: 4200, action: "tap", target: "results.item-market-flyers-bin-stop" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำไปเมื่อกี้ คืองานจริงของนักการตลาดเลยนะ", { mood: "wow" }),
        host("ดูคน เลือกไอเดีย ลองจริง นับผล แล้ววนมาปรับต่อ"),
        host("วัดผลคือเอาผลจริงมาเทียบเป้าที่ตั้งไว้ ไม่ใช่ดูแค่ยอดไลก์", { facts: [PLAN], mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "นักการตลาด",
      facts: [BUZZ],
      tiles: [
        { id: "brand", icon: "megaphone", titleTh: "ดูแลแบรนด์", lineTh: "คิดว่าแบรนด์ควรพูดอะไร กับใคร แบบที่เธอเพิ่งทำให้ร้าน", played: true },
        { id: "performance", icon: "funnel", titleTh: "ยิงแอดออนไลน์", lineTh: "ลงโฆษณาออนไลน์ แล้วเช็กตัวเลขทุกวันว่าได้ลูกค้าจริงไหม" },
        { id: "insight", icon: "magnifier", titleTh: "เจาะอินไซต์", lineTh: "คอยฟังว่าคนพูดถึงแบรนด์ยังไง แบบที่มีคนนับเรื่องหมีเนย" },
        { id: "product", icon: "box", titleTh: "การตลาดสินค้า", lineTh: "ช่วยทีมปั้นของใหม่ ขายใครดี เปิดตัวยังไงให้คนอยากลอง" },
        { id: "social", icon: "phone", titleTh: "ดูแลโซเชียล", lineTh: "ทำคลิป ปั้นเพจ ตอบคอมเมนต์ ให้คนอยากกดตามแบรนด์" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้ลองวางแผนให้ร้านจริงใกล้โรงเรียนเธอ")),
  ],
  reel: {
    format: "motion",
    hook: { th: "ไอเดียเจ๋งใครก็คิดได้ แต่รู้ว่ามันได้ผลจริงไหม นั่นแหละงานนักการตลาด" },
    variantsTh: ["ไลก์เยอะ ไม่ได้แปลว่าขายได้", "ใบปลิวแจกผิดคน ต่อให้สวยแค่ไหนก็ไม่มีใครมา"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบคิดแคมเปญ",
    visual: [
      "ร้านปังปิ้งพิกเซลหน้าประตูโรงเรียนตอนเย็น การ์ดไอเดียบินลงช่อง ใช่เลย ผิดคน ผิดที่",
      "หัวใจไลก์พุ่งขึ้นเต็มจอ แต่ตัวนับคนเข้าร้านไม่ขยับ",
      "วงกลมหมุน ดูคน เลือกไอเดีย ลองจริง นับผล วนกลับมาที่เดิม",
    ],
  },
};
