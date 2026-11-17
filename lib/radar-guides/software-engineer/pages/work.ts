/**
 * Level 2 · work. What the real job feels like: not typing code all day, but
 * reading what users report, deciding what to fix first, and checking code
 * (including code an AI wrote) before it reaches people. The game is a
 * simulated support inbox for a made-up school app.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host, item, me, sys } from "../../_shared/story";

const SIM = "sim.school-bugs" as const;
const ONET = "f.onet-swdev" as const;
const AI_DAILY = "f.so2026-ai-daily" as const;
const TRUST = "f.so2026-trust" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือฟังคนใช้ แล้วแก้ที่พัง",
  questionTh: "คนสายนี้นั่งพิมพ์โค้ดทั้งวันจริงเหรอ",
  navLabelTh: "งานจริง",
  asOf: "2026-11-18",
  minutes: 1.5,
  factIds: [SIM, ONET, AI_DAILY, TRUST],
  og: {
    headlineTh: "งานจริงของสายโค้ด ไม่ใช่พิมพ์ทั้งวัน แต่คือรู้ว่าอะไรต้องแก้ก่อน",
    stat: { th: "คนแจ้งปัญหามา 7 ข้อความ ข้อไหนต้องแก้ก่อน", factIds: [SIM], badge: "simulated" },
  },
  blocks: [
    dialogue(
      "intro",
      host("ในหนัง โปรแกรมเมอร์ใส่หูฟัง นั่งพิมพ์โค้ดรัวๆ คนเดียวทั้งคืน"),
      host("แต่ของจริง งานใหญ่คือฟังว่าคนใช้เจออะไร แล้วแก้จุดที่มันพัง", { mood: "wink" })
    ),
    item(
      "intel-onet",
      "intel",
      "ฐานข้อมูลอาชีพของสหรัฐฯ เขียนงานข้อแรกของสายนี้ไว้ว่า วิเคราะห์ว่าผู้ใช้ต้องการอะไร และอีกข้อคือแก้ซอฟต์แวร์ที่มีอยู่ให้หายพัง",
      { title: "งานจริงตามเอกสาร", facts: [ONET], labels: ["usOnly"] }
    ),
    beat(
      "beat-inbox",
      "ลองเปิดกล่องแจ้งปัญหา",
      dialogue(
        "inbox-intro",
        host("สมมติเธอดูแลแอปของโรงเรียน ที่ใช้ดูตารางสอบ ส่งการบ้าน และดูคะแนน"),
        host("เช้านี้มีแจ้งปัญหาเข้ามา 7 ข้อความ แต่เธอแก้ได้แค่ทีละอย่าง", { facts: [SIM] }),
        host("อันไหนแก้ก่อน อันไหนรอได้ แล้วอันไหนไม่ใช่บั๊กเลย", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "inbox",
        game: {
          engine: "SortGame",
          data: {
            layout: "chat",
            goalTh: "กล่องแจ้งปัญหา: แอปของโรงเรียน",
            bins: [
              { id: "now", labelTh: "แก้ก่อน" },
              { id: "later", labelTh: "แก้ทีหลัง" },
              { id: "notbug", labelTh: "ไม่ใช่บั๊ก" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "b1",
                labelTh: "กดส่งการบ้านไปแล้ว แอปขึ้นว่าส่งแล้ว แต่ครูบอกว่าไม่เห็นงานของหนูเลย",
                meta: { sender: "นักเรียน ม.4" },
                answer: "now",
                nearTh: { later: "ลองคิดอีกที ถ้าครูไม่เห็นงาน เพื่อนอาจโดนหักคะแนนทั้งห้องเลยนะ" },
                revealTh: "แก้ก่อนเลย งานคนใช้หายจริง แถมไม่รู้ตัวด้วย นี่แหละบั๊กที่หนักสุด",
              },
              {
                id: "b2",
                labelTh: "อยากให้เปลี่ยนแอปเป็นสีชมพูทั้งแอปเลยค่ะ",
                meta: { sender: "นักเรียน ม.6" },
                answer: "notbug",
                revealTh: "ไม่ใช่บั๊ก แค่คำขอ จดไว้ก่อนได้ ไม่ต้องรีบ ไม่มีอะไรพัง",
              },
              {
                id: "b3",
                labelTh: "ตารางสอบ ม.5/3 ดันขึ้นเป็นของ ม.5/2 ครับ สอบพรุ่งนี้แล้วด้วย",
                meta: { sender: "นักเรียน ม.5" },
                answer: "now",
                revealTh: "แก้ก่อนเลย ข้อมูลผิดแบบนี้ เดี๋ยวไปผิดห้องสอบกันทั้งห้อง พรุ่งนี้สอบแล้วด้วย",
              },
              {
                id: "b4",
                labelTh: "ตัวหนังสือโหมดมืดออกเทาไปหน่อย อ่านยาก",
                meta: { sender: "นักเรียน ม.4" },
                answer: "later",
                nearTh: { notbug: "เกือบใช่ แต่นี่ทำมาไม่ดีจริง แค่ยังไม่มีใครเดือดร้อน" },
                revealTh: "แก้ทีหลัง มันใช้ยากจริง แต่ยังไม่มีใครเสียหาย จดไว้ทำรอบหน้า",
              },
              {
                id: "b5",
                labelTh: "หน้าอันดับคะแนนสอบย่อย คนได้ 100 ดันไปอยู่ล่างสุด ใต้คนได้ 95 กับ 80",
                meta: { sender: "ครูประจำชั้น" },
                detailTh: "ฟีเจอร์นี้เพิ่งให้ AI เขียนเมื่อวาน ยังไม่มีใครลองกับคะแนนเต็มเลย",
                answer: "now",
                nearTh: { later: "ลองคิดใหม่ คะแนนโชว์ผิดก็คือข้อมูลผิดนะ ทุกคนในห้องเห็นกันอยู่" },
                revealTh: "แก้ก่อนเลย โค้ดดันเรียงเลขแบบตัวอักษร ดูแค่ตัวแรก 100 เลยหล่นไปท้ายสุด AI เขียนไวจริง แต่คนต้องเป็นคนลอง",
              },
              {
                id: "b6",
                labelTh: "ปุ่มส่งการบ้านวิชาสังคมหายไปเฉยเลย",
                meta: { sender: "นักเรียน ม.6" },
                detailTh: "ครูปิดรับงานชิ้นนี้ไปตั้งแต่เมื่อคืน ตามกำหนดส่งเลย",
                answer: "notbug",
                nearTh: { later: "เกือบถูก ระบบทำงานถูกแล้ว แค่ข้อความยังไม่ชัด ค่อยปรับทีหลังได้" },
                revealTh: "ไม่ใช่บั๊ก ครูปิดรับงานแล้วแต่คนใช้ไม่รู้ แปลว่าแอปต้องบอกให้ชัดว่าปิดรับแล้ว",
              },
              {
                id: "b7",
                labelTh: "รูปโปรไฟล์โหลดช้ามากเวลาใช้เน็ตมือถือ",
                meta: { sender: "นักเรียน ม.5" },
                answer: "later",
                revealTh: "แก้ทีหลัง น่ารำคาญจริงแหละ แต่ส่วนหลักยังใช้ได้ปกติ",
              },
            ],
            resultTh: "จัดลำดับถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "แก้ก่อน: ส่งการบ้านแล้วงานหาย, ตารางสอบสลับห้อง, อันดับคะแนนเรียงผิดจากโค้ดที่ AI เขียน",
          "แก้ทีหลัง: ตัวหนังสือโหมดมืดอ่านยาก, รูปโปรไฟล์โหลดช้า",
          "ไม่ใช่บั๊ก: อยากได้สีชมพู, ปุ่มส่งงานหายเพราะครูปิดรับแล้ว (แต่แอปควรบอกให้ชัด)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "inbox.next" },
          { at: 1400, action: "tap", target: "inbox.item-b1-bin-now" },
          { at: 3000, action: "tap", target: "inbox.next" },
          { at: 3800, action: "tap", target: "inbox.item-b2-bin-notbug" },
          { at: 5600, action: "wait" },
        ],
      },
      { kind: "shareCard", id: "share-work" }
    ),
    beat(
      "beat-ai",
      "แล้ว AI ล่ะ",
      dialogue(
        "ai-intro",
        me("ถ้า AI เขียนโค้ดได้แล้ว เรายังต้องใช้คนอีกเหรอ"),
        host("ดูข้อความที่ 5 เมื่อกี้สิ AI เขียนไวมาก แต่ไม่มีใครลองกับเลข 100", { facts: [SIM] })
      ),
      item("stat-ai-daily", "stat", "ผลสำรวจนักพัฒนาทั่วโลกปี 2569: คนตอบ 73% ใช้ AI ช่วยเขียนโค้ดทุกวัน", {
        title: "Stack Overflow",
        facts: [AI_DAILY],
      }),
      item("stat-trust", "stat", "48% บอกว่าไว้ใจ AI ได้เมื่อเช็กคำตอบเองได้ง่าย มีแค่ 16% ที่ไว้ใจมันกับงานส่วนใหญ่ที่ไม่ใช่เรื่องตัดสินใจสำคัญ", {
        title: "Stack Overflow",
        facts: [TRUST],
      }),
      dialogue(
        "ai-after",
        host("คนในวงการใช้ AI ทุกวันจริง แต่ไม่ได้เชื่อมันทุกบรรทัดหรอก"),
        host("งานของคนเลยย้ายมาที่การตัดสิน ว่าอะไรถูก อะไรพัง อะไรต้องทำก่อน", { mood: "serious" }),
        host("เหมือนที่เธอเพิ่งทำในกล่องข้อความเมื่อกี้เลย", { mood: "wink" })
      ),
      item("stat-team", "stat", "71% ของคนสายนี้ในสหรัฐฯ บอกว่าการทำงานเป็นทีม สำคัญอย่างยิ่ง", {
        title: "ไม่ได้ลุยคนเดียวหรอก",
        facts: [ONET],
        labels: ["usOnly"],
      })
    ),
    dialogue(
      "exit",
      host("ถ้าเธอชอบจัดลำดับว่าอะไรสำคัญ แถมอยากรู้ว่าทำไมของมันพัง"),
      host("สายนี้มีที่ให้เธอ", { mood: "wink" }),
      sys("ด่านต่อไป: ทางเข้ามหาวิทยาลัยที่หลายคนยังไม่รู้")
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "ปัญหาเด้งเข้ามา 7 ข้อความ เธอจะแก้อันไหนก่อน", factIds: [SIM] },
    variantsTh: ["โปรแกรมเมอร์ไม่ได้นั่งพิมพ์โค้ดทั้งวัน งานจริงคือนี่ต่างหาก", "AI เขียนโค้ดเร็ว แต่ใครเป็นคนลอง"],
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่าโปรแกรมเมอร์วันๆ แค่นั่งพิมพ์โค้ดดูเลย",
    visual: [
      "หน้าจอแชตแจ้งปัญหาเด้งขึ้นทีละข้อความ",
      "ข้อความแต่ละอันบินลงช่อง แก้ก่อน แก้ทีหลัง ไม่ใช่บั๊ก",
      "ตาราง 95, 80, 100 สลับกลับเป็น 100, 95, 80",
    ],
  },
};
