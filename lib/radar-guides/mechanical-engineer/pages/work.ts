/**
 * Level 1 · work. What the job feels like: the student designs a desk fan for
 * hot Thai classrooms the way mechanical engineers work, as two quick sorts:
 * 1. set the brief: which complaints the new fan must fix and which can wait
 *    (every extra feature is one more part that can break);
 * 2. torture-test the prototype and pick each result: it passes, change the
 *    shape, or change the material (a crack at a sharp corner, plastic gone
 *    brittle in the sun, a stand that tips, a finger-sized gap, rust).
 * Then the kinds of mechanical engineer, with this one (cooling) first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.me-fan" as const;
const TRAIN = "f.me-thai-train" as const;
const CARS = "f.me-car-output" as const;
const AIRCON = "f.me-aircon-export" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือทำให้เครื่องไม่พัง",
  questionTh: "วิศวกรเครื่องกลทำอะไรทั้งวัน แค่วาดแบบหรือเปล่า",
  navLabelTh: "ทดสอบพัดลม",
  asOf: "2026-11-20",
  minutes: 2.5,
  factIds: [SIM, TRAIN, CARS, AIRCON],
  og: { headlineTh: "ทำพัดลมให้ห้องเรียน ใครก็วาดได้ แต่ทำให้มันไม่พังนี่สิของจริง" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้งานแรกแล้วนะ", { mood: "wow" }),
      host("โจทย์คือพัดลมตั้งโต๊ะใหม่ สำหรับห้องเรียนร้อนๆ คนทำคือเธอเลย")
    ),
    choice(
      "how",
      host("ก่อนเริ่ม เธอว่าวิศวกรเครื่องกลทำพัดลมใหม่ยังไง"),
      answer(
        "draw",
        "วาดแบบสวยๆ แล้วส่งโรงงานเลย",
        host("ถ้าส่งเลย อาจได้พัดลมพังยกล็อตนะ", { mood: "wink" }),
        host("ของจริงคือปั้นต้นแบบขึ้นมาก่อน แล้วทดสอบให้ชัวร์")
      ),
      answer("break", "ทำมาตัวนึง แล้วแกล้งให้มันพังดู", host("เป๊ะเลย ยอมให้พังในห้องทดสอบตอนนี้ ดีกว่าไปพังในห้องเรียน", { mood: "wow" })),
      answer(
        "copy",
        "ซื้อของเจ้าอื่นมารื้อดูไส้ในก่อนดิ",
        host("วิศวกรทำแบบนั้นจริงนะ รื้อดูว่าเจ้าอื่นทำยังไง"),
        host("แต่สุดท้ายก็ต้องทำต้นแบบเอง แล้วทดสอบอยู่ดี", { mood: "wink" })
      )
    ),
    dialogue("steps", host("ทำเป็นขั้นๆ: ตั้งโจทย์ ทำต้นแบบ ทดสอบ แล้วแก้จุดที่พัง")),
    beat(
      "beat-brief",
      "ขั้นแรก: ตั้งโจทย์",
      dialogue(
        "brief-intro",
        host("ลองฟังก่อนว่าห้องเรียนบ่นอะไรพัดลมตัวเก่าบ้าง", { facts: [SIM] }),
        host("แต่ไม่ใช่ทุกอย่างที่ขอมา ต้องยัดใส่พัดลมตัวนี้นะ", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "brief",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "ตั้งโจทย์",
            goalTh: "เลือกเรื่องที่พัดลมตัวใหม่ต้องแก้",
            bins: [
              { id: "must", labelTh: "ต้องแก้" },
              { id: "later", labelTh: "ไว้ทีหลัง" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "backrow",
                labelTh: "เปิดแรงสุดแล้ว คนหลังห้องยังไม่ได้ลม",
                answer: "must",
                revealTh: "นี่คืองานหลักของพัดลมเลย ต้องแก้ก่อนเรื่องอื่น",
              },
              {
                id: "noise",
                labelTh: "เสียงดังจนครูต้องตะโกนแข่ง",
                answer: "must",
                revealTh: "ห้องเรียนต้องได้ยินกัน เสียงดังเลยเป็นเรื่องใหญ่",
              },
              {
                id: "tips",
                labelTh: "เดินชนนิดเดียวก็ล้ม",
                answer: "must",
                revealTh: "ล้มทีอาจพัง หรือใบพัดไปโดนคน เรื่องปลอดภัยต้องมาก่อน",
              },
              {
                id: "dust",
                labelTh: "ฝุ่นเกาะใบพัดหนา แต่ถอดตะแกรงล้างยาก",
                answer: "must",
                revealTh: "ล้างไม่ได้ ฝุ่นก็เกาะจนลมอ่อน ต้องออกแบบให้ถอดง่าย",
              },
              {
                id: "music",
                labelTh: "อยากให้เปิดเพลงจากมือถือได้",
                answer: "later",
                revealTh: "ใส่ลำโพงก็เพิ่มชิ้นที่พังได้อีก ไม่ใช่งานหลักของพัดลม",
              },
              {
                id: "colours",
                labelTh: "อยากได้หลายสีให้เลือก",
                answer: "later",
                revealTh: "สีค่อยเพิ่มทีหลังได้ ทำให้ลมถึงทุกโต๊ะก่อนดีกว่า",
              },
            ],
            resultTh: "เลือกถูก {score}/{total}",
          },
        },
        track: { done: "work:brief", value: "score" },
        answersTh: [
          "ต้องแก้: ลมไม่ถึงหลังห้อง, เสียงดังจนครูต้องตะโกน, เดินชนแล้วล้ม, ถอดตะแกรงล้างยาก",
          "ไว้ทีหลัง: เปิดเพลงจากมือถือ, หลายสีให้เลือก",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "brief.item-music-bin-later" },
          { at: 2400, action: "wait" },
        ],
      },
      dialogue(
        "brief-after",
        host("ยิ่งใส่ของเยอะ ก็ยิ่งมีชิ้นที่พังได้เยอะ", { mood: "wink" }),
        host("โจทย์ชัดแล้ว ไปทำต้นแบบกัน")
      )
    ),
    beat(
      "beat-test",
      "ขั้นสอง: ทดสอบ แล้วแก้",
      dialogue(
        "test-intro",
        host("ต้นแบบเสร็จแล้ว ทีนี้เอาไปทดสอบแบบจัดเต็มกันเลย", { facts: [SIM] }),
        host("ข้อไหนผ่านก็ปล่อย ข้อไหนพัง เลือกว่าจะแก้รูปทรงหรือเปลี่ยนวัสดุ")
      ),
      {
        kind: "game",
        id: "fantest",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "ทดสอบ แล้วแก้",
            goalTh: "ดูผลทดสอบพัดลม แล้วเลือกวิธีแก้ทีละข้อ",
            bins: [
              { id: "ok", labelTh: "ผ่าน" },
              { id: "shape", labelTh: "แก้รูปทรง" },
              { id: "material", labelTh: "เปลี่ยนวัสดุ" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "motor",
                labelTh: "เปิดแรงสุดทั้งวัน",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "มอเตอร์อุ่นๆ แต่ไม่ร้อนเกินเกณฑ์ที่ตั้งไว้",
                answer: "ok",
                revealTh: "อยู่ในเกณฑ์ที่ตั้งไว้ แบบนี้ผ่านเลย",
              },
              {
                id: "crack",
                labelTh: "หมุนต่อเนื่องหลายวัน",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "ใบพัดร้าว รอยร้าวเริ่มตรงมุมแหลมที่โคนใบ",
                answer: "shape",
                flags: ["รอยร้าว"],
                nearTh: { material: "วัสดุแข็งขึ้นก็ช่วยได้บ้าง แต่ต้นเหตุคือมุมแหลมที่แรงไปกองรวมกัน" },
                revealTh: "มุมแหลมทำให้แรงไปกองที่จุดเดียว ทำโคนใบให้โค้งมนและหนาขึ้น",
              },
              {
                id: "sun",
                labelTh: "วางริมหน้าต่าง โดนแดดทุกวัน",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "ผ่านไปหลายสัปดาห์ ใบพัดพลาสติกซีด แล้วเปราะหักง่าย",
                answer: "material",
                flags: ["แดดทำพลาสติกเสื่อม"],
                nearTh: { shape: "เปลี่ยนรูปทรงยังไง พลาสติกก็ยังเสื่อมเพราะแดดอยู่ดี" },
                revealTh: "เปลี่ยนไปใช้พลาสติกที่ทนแดด รูปทรงเดิมใช้ต่อได้เลย",
              },
              {
                id: "bump",
                labelTh: "เดินชนที่ขาเบาๆ",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "พัดลมล้มทั้งตัว",
                answer: "shape",
                flags: ["ล้มง่าย"],
                revealTh: "ทำฐานให้กว้างขึ้น หรือถ่วงน้ำหนักไว้ที่ฐาน ให้ตั้งได้มั่นคง",
              },
              {
                id: "finger",
                labelTh: "แท่งทดสอบขนาดนิ้วเด็ก",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "ลอดช่องตะแกรงเข้าไปโดนใบพัดได้",
                answer: "shape",
                flags: ["ความปลอดภัย"],
                nearTh: { material: "เปลี่ยนวัสดุ ช่องก็ยังกว้างอยู่ดี นิ้วก็ยังลอดได้" },
                revealTh: "ทำช่องตะแกรงให้ถี่ขึ้นจนนิ้วลอดไม่ได้ ข้อนี้ต้องผ่านก่อนขาย",
              },
              {
                id: "rust",
                labelTh: "เช็ดด้วยผ้าเปียกทุกสัปดาห์",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "ตะแกรงเหล็กขึ้นจุดสนิม",
                answer: "material",
                flags: ["สนิม"],
                nearTh: { shape: "รูปทรงไหน เหล็กเปลือยก็ยังขึ้นสนิมอยู่ดี" },
                revealTh: "เปลี่ยนเป็นสแตนเลส หรือเหล็กที่เคลือบกันสนิม",
              },
              {
                id: "hum",
                labelTh: "เปิดเบาสุดในห้องเงียบ",
                meta: { sender: "ห้องทดสอบ" },
                detailTh: "มีเสียงหึ่งเบาๆ เบากว่าเสียงคนคุยกัน",
                answer: "ok",
                nearTh: { shape: "จะให้เงียบสนิทต้องแลกกับของแพงขึ้น แค่นี้ไม่กวนใครแล้ว" },
                revealTh: "ไม่ต้องเงียบสนิทก็ได้ แค่ไม่กวนห้องเรียนก็ผ่าน",
              },
            ],
            resultTh: "แก้ถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ผ่าน: เปิดแรงสุดทั้งวัน, เสียงหึ่งเบาๆ ตอนเปิดเบาสุด",
          "แก้รูปทรง: ใบพัดร้าวที่มุมแหลม, เดินชนแล้วล้ม, นิ้วลอดช่องตะแกรง",
          "เปลี่ยนวัสดุ: ใบพัดเปราะเพราะแดด, ตะแกรงเหล็กขึ้นสนิม",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "fantest.item-finger" },
          { at: 1600, action: "tap", target: "fantest.item-finger-bin-shape" },
          { at: 3200, action: "tap", target: "fantest.item-sun" },
          { at: 4200, action: "tap", target: "fantest.item-sun-bin-material" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำ คืองานจริงของวิศวกรเครื่องกลเลยนะ", { mood: "wow" }),
        host("ตั้งโจทย์ ออกแบบ ทดสอบ แก้ แล้ววนจนผ่าน"),
        host("ทีมรถไฟไทยทำก็ทำแบบนี้ วิ่งทดสอบกว่า 10,000 กม. ก่อนส่งมอบ", { facts: [TRAIN] }),
        host("ขายออกไปแล้วก็ยังไม่จบนะ ต้องคอยตามแก้จุดที่พังตอนใช้จริง", { mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "วิศวกรเครื่องกล",
      facts: [CARS, AIRCON],
      tiles: [
        { id: "cooling", icon: "fan", titleTh: "ระบบความเย็น", lineTh: "แอร์ พัดลม ตู้เย็น เย็นฉ่ำแต่กินไฟน้อย แบบพัดลมเมื่อกี้", played: true },
        { id: "auto", icon: "car", titleTh: "ยานยนต์และ EV", lineTh: "ออกแบบรถยนต์กับรถ EV ที่โรงงานในไทยประกอบกันทุกวัน" },
        { id: "factory", icon: "gear", titleTh: "โรงงานผลิต", lineTh: "คุมเครื่องจักรในโรงงาน ให้ผลิตทุกชิ้นตรงตามแบบเป๊ะ" },
        { id: "robot", icon: "robot", titleTh: "หุ่นยนต์", lineTh: "สร้างแขนกลกับหุ่นยนต์ ที่ทำงานหนักหรืองานเสี่ยงแทนคน" },
        { id: "energy", icon: "bolt", titleTh: "พลังงาน", lineTh: "ดูแลโรงไฟฟ้า กังหัน ปั๊ม ให้เดินเครื่องได้ทุกวัน" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้ลุยเอง ลองแกะของใกล้ตัวในบ้านดู")),
  ],
  reel: {
    format: "motion",
    hook: { th: "ทำพัดลมให้ห้องเรียน ใครก็วาดได้ แต่ทำให้มันไม่พังนี่สิของจริง" },
    variantsTh: ["วิศวกรเครื่องกลไม่ได้แค่วาดแบบ งานจริงคือนี่", "ให้มันพังในห้องทดสอบ ดีกว่าไปพังในห้องเรียน"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบแกะของดูข้างใน",
    visual: [
      "ข้อความบ่นเรื่องพัดลมเด้งขึ้น ป้าย ต้องแก้ กับ ไว้ทีหลัง ประทับลง ลำโพงถูกเด้งออก",
      "พัดลมต้นแบบบนโต๊ะทดสอบ ผลทดสอบเด้งทีละข้อ ป้าย ผ่าน แก้รูปทรง เปลี่ยนวัสดุ ประทับลง",
      "วงกลมหมุน ตั้งโจทย์ ออกแบบ ทดสอบ แก้ วนกลับมาที่เดิม",
    ],
  },
};
