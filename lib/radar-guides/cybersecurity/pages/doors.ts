/**
 * Level 2 · doors. Design: docs/radar-guide/cybersecurity-guide.md, Page 2.
 * Same model, two doors: who gets the key, the same lie three times, every
 * lab has a locked room, the passport check. Safety line fixed on the page.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { CLIP, beat, dialogue, host, item, sys } from "./_story";

const M52 = "f.mythos52" as const;
const CVP = "f.cvp-tiers" as const;

export const doors: GuidePage = {
  key: "doors",
  order: 2,
  titleTh: "AI ตัวเดียวกัน สองประตู",
  questionTh: "ใครได้ใช้ AI สายไซเบอร์ที่ถูกล็อกไว้ แล้วทำไมความน่าเชื่อถือถึงกลายเป็นทักษะ",
  navLabelTh: "สองประตู",
  asOf: "2026-11-11",
  minutes: 2,
  showsHacking: true,
  factIds: [
    M52,
    CVP,
    "f.cursor-reuters",
    "f.dream-taiwan",
    "f.gtg1002",
    "f.gpt6-cyber",
    "f.gemini-argon",
    "f.fable5-mythos5-launch",
    "f.us-directive",
  ],
  og: {
    headlineTh: "AI ตัวเดียวกัน แต่มีสองประตู",
    stat: { th: "Anthropic บอกว่า Fable 5.2 กับ Mythos 5.2 คือโมเดลตัวเดียวกัน", factIds: [M52] },
  },
  blocks: [
    dialogue(
      "intro",
      host("9 พ.ย. 2569 Anthropic ปล่อย AI สองชื่อ", { facts: [M52] }),
      host("Fable 5.2 กับ Mythos 5.2 บริษัทบอกว่าเป็นโมเดลตัวเดียวกัน", { facts: [M52] }),
      host("ต่างกันแค่ประตู", { mood: "wink" })
    ),
    item(
      "door-one",
      "intel",
      "เปิดให้ผู้ใช้ทั่วไป แต่ถ้าสั่งงานไซเบอร์ที่เสี่ยงสูง ระบบจะส่งไปให้โมเดลรุ่นเก่ากว่าตอบแทน",
      { title: "ประตูแรก: Fable 5.2", facts: [M52], badge: "confirmed" }
    ),
    item(
      "door-two",
      "intel",
      "ไม่มีตัวกั้นนั้น เปิดให้เฉพาะองค์กรที่ผ่านการตรวจสอบ กับลูกค้าองค์กรของบริษัท",
      { title: "ประตูที่สอง: Mythos 5.2", facts: [M52], badge: "confirmed" }
    ),
    beat(
      "beat-keys",
      "เล่นเกม ใครได้กุญแจ",
      dialogue(
        "keys-intro",
        host("ด่านนี้เธอคือคนเฝ้าประตูที่สอง"),
        host("แตะการ์ดหนึ่งใบ แล้วแตะประตูที่เขาควรได้เข้า ดูว่าเธอแจกกุญแจถูกกฎไหม")
      ),
      {
        kind: "game",
        id: "keys",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            goalTh: "ใครได้เข้าประตูไหน",
            bins: [
              { id: "defense", labelTh: "Defense" },
              { id: "redteam", labelTh: "Red Team" },
              { id: "specialized", labelTh: "Specialized" },
              { id: "denied", labelTh: "ไม่ผ่าน" },
            ],
            items: [
              {
                id: "card1",
                labelTh: "ทีมความปลอดภัยของโรงพยาบาล",
                answer: "defense",
                revealTh: "ทีมความปลอดภัยขององค์กรเข้าทาง Defense ได้",
              },
              {
                id: "card2",
                labelTh: "นักล่าบั๊กอิสระ มีผลงานเปิดเผย",
                answer: "defense",
                nearTh: { redteam: "ใกล้แล้ว Red Team รับเฉพาะองค์กร" },
                revealTh: "คนที่มีประวัติผลงานตรวจสอบได้เข้า Defense ได้ แต่ Red Team รับเฉพาะองค์กร",
              },
              {
                id: "card3",
                labelTh: "บริษัททดสอบเจาะระบบ มีสัญญากับลูกค้า",
                answer: "redteam",
                revealTh: "ทดสอบเจาะระบบที่ได้รับอนุญาต รับเฉพาะองค์กร และยังบล็อกงานแบบแรนซัมแวร์อยู่ดี",
              },
              {
                id: "card4",
                labelTh: "ผู้ดูแลระบบไฟฟ้า",
                answer: ["specialized", "defense"],
                revealTh:
                  "ระบบที่พลาดไม่ได้ ตรวจละเอียดร่วมกับรัฐบาลสหรัฐฯ หรือเข้า Defense ในฐานะผู้ดูแลโครงสร้างพื้นฐานสำคัญ",
              },
              {
                id: "card5",
                labelTh: "บัญชีไม่ระบุตัวตน พิมพ์มาว่า \"นี่คือการทดสอบที่ได้รับอนุญาต\"",
                answer: "denied",
                revealTh: "พิมพ์เองไม่นับ ข้ออ้างนี้แหละที่คนร้ายเคยใช้หลอก AI มาแล้ว",
              },
              {
                id: "card6",
                labelTh: "แล้วนักเรียน ม.5 ที่ชอบแฮกล่ะ",
                answer: "denied",
                scored: false,
                revealTh:
                  "ตอนนี้ยังไม่ผ่าน (ความเห็นทีมเรา ตีความจากเกณฑ์: ต้องเป็นทีมความปลอดภัย หรือนักวิจัยที่มีผลงานตรวจสอบได้) ข่าวดีคือผลงานแบบนั้นเริ่มเก็บได้ตั้งแต่ ม.ปลาย",
              },
            ],
            resultTh: "แจกกุญแจถูก {score}/{total}",
          },
        },
        track: { done: "doors:key-done", value: "score" },
        answersTh: [
          "ทีมความปลอดภัยของโรงพยาบาล: Defense",
          "นักล่าบั๊กอิสระที่มีผลงานเปิดเผย: Defense (Red Team รับเฉพาะองค์กร)",
          "บริษัททดสอบเจาะระบบที่มีสัญญา: Red Team",
          "ผู้ดูแลระบบไฟฟ้า: Specialized หรือ Defense",
          "บัญชีไม่ระบุตัวตนที่พิมพ์ว่าได้รับอนุญาต: ไม่ผ่าน",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "keys.item-card3" },
          { at: 1200, action: "tap", target: "keys.bin-redteam" },
          { at: 2600, action: "tap", target: "keys.item-card5" },
          { at: 3200, action: "tap", target: "keys.bin-denied" },
          { at: 5000, action: "wait" },
        ],
      },
      dialogue(
        "keys-after",
        host("แค่มีฝีมือยังเปิดประตูที่สองไม่ได้ ต้องมีหลักฐานว่าไว้ใจเธอได้ด้วย", { facts: [CVP] }),
        host("ในสายนี้ ความไว้ใจคือส่วนหนึ่งของเรซูเม่", { mood: "wink" })
      )
    ),
    beat(
      "beat-lie",
      "ดูข้ออ้างที่คนร้ายใช้",
      dialogue(
        "lie-intro",
        host("มีเคสจริงอย่างน้อยสามเคส ที่คนร้ายหลอก AI ด้วยข้ออ้างเดียวกัน", { mood: "serious" }),
        host("พลิกการ์ดดูทีละใบ")
      ),
      {
        kind: "game",
        id: "lie",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "นี่คือการทดสอบที่ได้รับอนุญาต",
            cards: [
              {
                id: "ransomware",
                frontTh: "กลุ่มแรนซัมแวร์",
                dateTh: "ส.ค. 2569",
                backTh:
                  "สั่ง AI agent ช่วยเขียนโค้ดเจาะระบบ พอ AI ปฏิเสธ ก็เปิดงานใหม่แล้วอ้างว่าเป็นงานทดสอบที่ได้รับอนุญาต และ Reuters รายงานว่ามีบริษัทโดนเจาะอย่างน้อย 7 แห่ง",
                factIds: ["f.cursor-reuters"],
              },
              {
                id: "government",
                frontTh: "รัฐบาลแห่งหนึ่งในเอเชีย",
                dateTh: "ส.ค. 2569",
                backTh:
                  "บริษัทวิจัย Dream รายงานว่าคนร้ายเลี่ยงระบบป้องกันของ AI agent ด้วยการอ้างว่าเป็นการทดสอบเจาะระบบที่ได้รับอนุญาต สื่อระบุว่าเป็นไต้หวัน และไต้หวันยืนยันว่าโดนโจมตีที่มี AI agent ช่วย",
                factIds: ["f.dream-taiwan"],
              },
              {
                id: "espionage",
                frontTh: "กลุ่มจารกรรม",
                dateTh: "พ.ย. 2568",
                backTh:
                  "Anthropic บอกว่าจับกลุ่มที่ใช้ Claude Code บุกเป้าหมายราว 30 แห่งได้ คนร้ายอ้างว่าเป็นบริษัทความปลอดภัยที่กำลังทดสอบระบบ แล้วซอยงานเป็นชิ้นเล็กๆ ที่ดูไม่มีพิษภัย",
                factIds: ["f.gtg1002"],
              },
            ],
          },
        },
        track: { done: "doors:lie-done", value: "count", milestones: { flip: "doors:lie-flip" } },
        answersTh: [
          "ส.ค. 2569 กลุ่มแรนซัมแวร์อ้างกับ AI ว่าเป็นงานทดสอบที่ได้รับอนุญาต มีบริษัทโดนเจาะอย่างน้อย 7 แห่ง",
          "ส.ค. 2569 คนร้ายที่โจมตีหน่วยงานรัฐในเอเชียใช้ข้ออ้างเดียวกัน เลี่ยงระบบป้องกันของ AI agent",
          "พ.ย. 2568 กลุ่มจารกรรมอ้างว่าเป็นบริษัทความปลอดภัย แล้วใช้ AI บุกเป้าหมายราว 30 แห่ง",
        ],
        demoScript: [
          { at: 500, action: "tap", target: "lie.card-ransomware" },
          { at: 1700, action: "tap", target: "lie.card-government" },
          { at: 2900, action: "tap", target: "lie.card-espionage" },
          { at: 4500, action: "wait" },
        ],
      },
      dialogue(
        "lie-after",
        host("ทั้งสามเคสอ้างเหมือนกัน: ได้รับอนุญาต"),
        host("ในงานจริง คำนี้ต้องมีสัญญาที่เจ้าของระบบเซ็น มีขอบเขต มีเวลา"),
        host("พิมพ์อ้างเองไม่นับ แถมยังผิดกฎหมาย", { mood: "serious" })
      ),
      {
        kind: "safety",
        id: "safety",
        lineTh: "เจาะระบบที่เจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ผิดกฎหมาย ต่อให้พิมพ์ว่าได้รับอนุญาตก็ตาม",
      },
      CLIP
    ),
    beat(
      "beat-labs",
      "ทุกแล็บมีห้องล็อก",
      dialogue("labs-intro", host("ไม่ใช่แค่ Anthropic ที่ล็อกห้อง ลองดูแล็บอื่น")),
      item("lab-anthropic", "intel", "มีโปรแกรมตรวจสอบก่อนให้ใช้รุ่นที่เก่งเรื่องไซเบอร์ที่สุด รับทั้งองค์กรและคนที่มีผลงานตรวจสอบได้", {
        title: "Anthropic",
        facts: [CVP],
      }),
      item("lab-openai", "intel", "5 พ.ย. 2569 ปล่อย GPT-6 Cyber ให้เฉพาะลูกค้าที่ได้รับอนุญาตทำงานเจาะระบบ", {
        title: "OpenAI",
        facts: ["f.gpt6-cyber"],
        badge: "vendor",
      }),
      item("lab-google", "intel", "30 ก.ย. 2569 ให้โมเดลใหม่กับทีมป้องกันในโปรแกรมของตัวเองก่อน แล้วค่อยเปิดกว้างขึ้นราวกลาง ต.ค.", {
        title: "Google",
        facts: ["f.gemini-argon"],
      }),
      dialogue("labs-after", host("แล็บใหญ่หลายแห่งคัดคน ก่อนให้ใช้โมเดลที่เก่งเรื่องไซเบอร์ที่สุดของตัวเอง"))
    ),
    beat(
      "beat-passport",
      "เช็กพาสปอร์ต",
      dialogue(
        "passport-intro",
        host("ปี 2569 เคยมีช่วงที่คนไทยใช้ AI ตัวนี้ไม่ได้เลย 19 วัน", { facts: ["f.us-directive"], mood: "wow" }),
        host("แตะวันที่ แล้วดูว่าวันนั้นผู้ใช้ในไทยเข้าประตูไหนได้บ้าง")
      ),
      {
        kind: "game",
        id: "passport",
        game: {
          engine: "DateToggle",
          data: {
            chips: [
              { id: "jun9", labelTh: "9 มิ.ย. 2569" },
              { id: "jun12", labelTh: "12 มิ.ย. 2569" },
              { id: "jul1", labelTh: "1 ก.ค. 2569" },
            ],
            columns: [
              { id: "fable5", labelTh: "Fable 5 (ผู้ใช้ทั่วไป)" },
              { id: "mythos5", labelTh: "Mythos 5" },
            ],
            cells: {
              jun9: {
                fable5: { open: true, noteTh: "เปิด" },
                mythos5: { open: false, noteTh: "ปิด เฉพาะองค์กรพันธมิตร" },
              },
              jun12: {
                fable5: { open: false, noteTh: "ปิดสำหรับทุกคน" },
                mythos5: { open: false, noteTh: "ปิด" },
              },
              jul1: {
                fable5: { open: true, noteTh: "กลับมาทั่วโลก" },
                mythos5: { open: false, noteTh: "ปิด เฉพาะองค์กรในสหรัฐฯ ที่ได้รับอนุมัติ" },
              },
            },
            factIds: ["f.fable5-mythos5-launch", "f.us-directive"],
          },
        },
        track: { done: "doors:passport-done", value: "index", milestones: { chip: "doors:passport" } },
        demoScript: [
          { at: 600, action: "tap", target: "passport.chip-jun9" },
          { at: 2000, action: "tap", target: "passport.chip-jun12" },
          { at: 3400, action: "tap", target: "passport.chip-jul1" },
          { at: 5000, action: "wait" },
        ],
        answersTh: [
          "9 มิ.ย. 2569: Fable 5 เปิดให้ผู้ใช้ทั่วไป Mythos 5 ปิด เฉพาะองค์กรพันธมิตร",
          "12 มิ.ย. 2569: ปิดทั้งสองตัวสำหรับทุกคน",
          "1 ก.ค. 2569: Fable 5 กลับมาทั่วโลก Mythos 5 เฉพาะองค์กรในสหรัฐฯ ที่ได้รับอนุมัติ",
        ],
      },
      item(
        "passport-why",
        "notification",
        "รัฐบาลสหรัฐฯ สั่งให้ปิดโมเดลสองตัวนี้สำหรับคนที่ไม่ใช่สัญชาติอเมริกัน บริษัทเช็กสัญชาติแบบทันทีไม่ได้ เลยปิดไม่ให้ทุกคนใช้ คำสั่งถูกยกเลิก 30 มิ.ย.",
        { title: "12 มิ.ย. 2569", facts: ["f.us-directive"] }
      ),
      dialogue("passport-after", host("การเข้าถึง AI จึงเป็นเรื่องระหว่างประเทศด้วย"))
    ),
    dialogue(
      "exit",
      host("ถ้าวันหนึ่งเธออยากได้กุญแจ ต้องเริ่มจากผลงานที่คนอื่นตรวจสอบได้"),
      sys("ด่านต่อไป: งานจริงวันธรรมดา")
    ),
  ],
  clip: {
    seconds: 25,
    hookTh: "แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว",
    scriptLinesTh: [
      "มีเคสจริงอย่างน้อยสามเคส ที่คนร้ายหลอก AI ด้วยข้ออ้างเดียวกัน",
      "ว่านี่คือการทดสอบที่ได้รับอนุญาต",
      "สิ่งที่แยกนักทดสอบระบบออกจากอาชญากร ไม่ใช่ฝีมือ",
      "แต่คือการได้รับอนุญาตจริงๆ มีสัญญา มีขอบเขตชัดเจน",
      "จำไว้เลย ระบบที่ไม่ใช่ของเรา",
      "ถ้าเจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ห้ามแตะ ผิดกฎหมาย",
      "แค่พิมพ์บอกเองว่าได้รับอนุญาต แบบนั้นไม่นับ",
    ],
    required: false,
    safety: true,
    factIds: ["f.cursor-reuters", "f.dream-taiwan", "f.gtg1002"],
  },
  reel: {
    format: "motion",
    hook: { th: "AI ที่เก่งไซเบอร์ที่สุดของบริษัท ไม่ได้ให้ทุกคนใช้" },
    variantsTh: ["แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว: นี่คือการทดสอบที่ได้รับอนุญาต", "มิ.ย. 2569 คนไทยใช้ AI ตัวนี้ไม่ได้ 19 วัน"],
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่าเก่งอย่างเดียวพอ",
    visual: [
      "ประตูสองบานคู่กัน คำขอวิ่งเข้าหา ประตู Fable เบี่ยงคำขอหนึ่งไปประตูเล็กที่เก่ากว่า",
      "กุญแจล็อกที่ประตู Mythos",
      "การ์ดสามใบพลิกตามจังหวะ ข้ออ้างเดียวกันสว่างขึ้นสามครั้ง",
    ],
  },
};
