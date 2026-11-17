/**
 * Level 1 · dream. The hook: the dust number students check every morning was
 * made by people who asked a good question. Guess how many Bangkok schools
 * the number closed on 24 Jan 2025, then flip three Thai cards (DustBoy, the
 * AQI adding PM2.5, GISTDA's app) that share one line: it started with a
 * question.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host, item, sys } from "../../_shared/story";

const SCHOOLS = "f.ds-bma-schools" as const;
const ORIGIN = "f.ds-dustboy-origin" as const;
const AQI = "f.ds-aqi-pm25" as const;
const GISTDA = "f.ds-gistda-app" as const;
const UNITS = "f.ds-dustboy-1000" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "ตัวเลขฝุ่นทุกเช้า มีคนทำขึ้นมา",
  questionTh: "ตัวเลขที่เธอเห็นทุกวัน ใครทำขึ้นมา แล้วมันเปลี่ยนอะไรได้บ้าง",
  navLabelTh: "ตัวเลขฝุ่น",
  asOf: "2026-11-18",
  minutes: 2,
  factIds: [SCHOOLS, ORIGIN, AQI, GISTDA, UNITS],
  og: {
    headlineTh: "ค่าฝุ่นที่เธอเช็กทุกเช้า เริ่มจากมีคนตั้งคำถาม",
    stat: { th: "24 ม.ค. 2568 กทม. สั่งปิดโรงเรียน 352 จาก 437 แห่งเพราะฝุ่น", factIds: [SCHOOLS] },
  },
  blocks: [
    dialogue(
      "intro",
      host("เช้านี้เธอเปิดแอปเช็กสีฝุ่นก่อนออกจากบ้านหรือยัง", { mood: "wow" }),
      host("ส้ม แดง ม่วง เลขพวกนั้นไม่ได้โผล่มาเองนะ"),
      host("เบื้องหลังมีทั้งคนเก็บข้อมูล คนคำนวณ และคนตั้งคำถาม", { mood: "wink" })
    ),
    beat(
      "beat-guess",
      "ตัวเลขนี้มีพลังแค่ไหน",
      dialogue(
        "guess-intro",
        host("24 ม.ค. 2568 กรุงเทพฯ เจอฝุ่นหนักมาก", { facts: [SCHOOLS] }),
        host("โรงเรียนสังกัด กทม. มี 437 แห่ง ลองทายสิว่าวันนั้นปิดไปกี่แห่ง", { facts: [SCHOOLS], mood: "wink" })
      ),
      {
        kind: "game",
        id: "schools",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "24 ม.ค. 2568 กทม. สั่งปิดโรงเรียนในสังกัดเพราะฝุ่นไปกี่แห่ง (จาก 437)",
            min: 0,
            max: 437,
            step: 5,
            unit: "count",
            answer: 352,
            answerFactId: SCHOOLS,
            buckets: [100, 200, 300, 438],
            chart: {
              kind: "bars",
              bars: [
                { labelTh: "โรงเรียนสังกัด กทม. ทั้งหมด", value: 437 },
                { labelTh: "สั่งปิดเพราะฝุ่น 24 ม.ค. 2568", value: null },
              ],
            },
            nearTh: "เกือบเป๊ะเลย",
            overTh: "เธอทายเกินไป {d} แห่ง",
            underTh: "เธอทายน้อยไป {d} แห่ง",
            nearWithin: 20,
            revealTh: "เธอทาย {g} แต่ของจริงคือ 352 แห่ง หรือ 81%",
          },
        },
        track: { done: "dream:schools", value: "bucket" },
        answersTh: [
          "24 ม.ค. 2568 กทม. ปิดโรงเรียนในสังกัด 352 จาก 437 แห่ง หรือ 81% เพราะฝุ่น PM2.5",
          "เช้าวันนั้นค่าฝุ่นเฉลี่ยทั้งกรุงเทพฯ 88.4 มคก./ลบ.ม. และ 48 เขตเป็นสีแดง",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "schools.plus" },
          { at: 900, action: "tap", target: "schools.plus" },
          { at: 1200, action: "tap", target: "schools.plus" },
          { at: 2000, action: "tap", target: "schools.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-day", "stat", "เช้าวันนั้นค่าฝุ่นเฉลี่ยทั้งกรุงเทพฯ อยู่ที่ 88.4 มคก./ลบ.ม. แถมเป็นสีแดงถึง 48 เขต", {
        title: "ไทยพีบีเอส 24 ม.ค. 2568",
        facts: [SCHOOLS],
        badge: "confirmed",
      }),
      dialogue(
        "guess-after",
        host("แค่ตัวเลขชุดเดียว ทำเอาโรงเรียนเกือบทั้งเมืองต้องปิด", { mood: "serious" }),
        host("แต่ย้อนไปไม่กี่ปีก่อน ตัวเลขฝุ่นที่เธอเช็กทุกวันนี้ยังไม่มีด้วยซ้ำ", { mood: "wow" })
      )
    ),
    beat(
      "beat-flip",
      "แล้วใครเป็นคนทำตัวเลขนี้",
      dialogue(
        "flip-intro",
        host("ลองพลิกการ์ดดูทีละใบสิ"),
        host("ทุกใบมีบางอย่างเหมือนกันอยู่", { mood: "wink" })
      ),
      {
        kind: "game",
        id: "question",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "เริ่มจากมีคนถามว่า",
            cards: [
              {
                id: "chiangmai",
                frontTh: "เชียงใหม่ ปีที่ฟ้ากลายเป็นสีเทา",
                dateTh: "มี.ค. 2561",
                backTh:
                  "ทั้งจังหวัดมีสถานีวัดอากาศของรัฐแค่ 2 สถานี แถมค่าที่ประกาศก็ยังไม่นับ PM2.5 เรื่องนี้เริ่มจากมีคนถามว่า อากาศที่เราหายใจอยู่ตอนนี้เป็นยังไงกันแน่ ทีมนักวิจัย มช. กับกลุ่มเมกเกอร์เลยสร้างเครื่องวัดฝุ่นชื่อ DustBoy ที่รายงานผลแบบเรียลไทม์ขึ้นมา",
                factIds: [ORIGIN],
              },
              {
                id: "aqi",
                frontTh: "สีในแอปที่เธอเปิดดูทุกเช้า",
                dateTh: "1 ต.ค. 2561",
                backTh:
                  "ก่อนหน้านั้น ดัชนีคุณภาพอากาศไทยคิดจากสาร 5 ชนิด แต่ไม่มี PM2.5 พอเจอวิกฤตฝุ่นในกรุงเทพฯ ช่วงหน้าหนาว เรื่องนี้เริ่มจากมีคนถามว่า ทำไมไม่เตือนเรื่องฝุ่นจิ๋วด้วย คนเรียกร้องกันเยอะจนกรมควบคุมมลพิษต้องเพิ่ม PM2.5 เข้ามาคำนวณ",
                factIds: [AQI],
              },
              {
                id: "gistda",
                frontTh: "ถ้าแถวบ้านไม่มีสถานีวัดฝุ่น",
                dateTh: "ธ.ค. 2564",
                backTh:
                  "แต่แอปเช็คฝุ่นของ GISTDA ก็ยังบอกค่าได้ทุกชั่วโมง เรื่องนี้เริ่มจากมีคนถามว่า ถ้าจับข้อมูลดาวเทียม สถานีตรวจวัด กรมควบคุมมลพิษ และกรมอุตุฯ มารวมกัน จะประมาณค่าฝุ่นตรงจุดที่เธอยืนอยู่ได้ไหม",
                factIds: [GISTDA],
              },
            ],
          },
        },
        track: { done: "dream:flip-done", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "มี.ค. 2561 เชียงใหม่มีสถานีของรัฐแค่ 2 สถานี และค่าที่ประกาศยังไม่นับ PM2.5 ทีมจาก มช. กับเมกเกอร์จึงสร้าง DustBoy",
          "1 ต.ค. 2561 กรมควบคุมมลพิษเพิ่ม PM2.5 เข้าไปในดัชนีคุณภาพอากาศ หลังมีคนเรียกร้องให้เตือนเรื่องฝุ่นจิ๋ว",
          "ธ.ค. 2564 แอปเช็คฝุ่นของ GISTDA เอาข้อมูลดาวเทียมและข้อมูลจากหลายหน่วยงานมารวมกัน เพื่อบอกค่าฝุ่นรายชั่วโมงตรงที่เธออยู่",
        ],
        demoScript: [
          { at: 500, action: "tap", target: "question.card-chiangmai" },
          { at: 1700, action: "tap", target: "question.card-aqi" },
          { at: 2900, action: "tap", target: "question.card-gistda" },
          { at: 4500, action: "wait" },
        ],
      },
      item("stat-units", "stat", "ปี 2565 DustBoy ถูกติดตั้งไปกว่า 1,000 เครื่องทั่วประเทศ หลายเครื่องอยู่ในโรงเรียนด้วย", {
        title: "จากเครื่องแรกที่เชียงใหม่",
        facts: [UNITS],
        badge: "confirmed",
      }),
      item(
        "quote",
        "intel",
        "การที่มีเครื่องตรวจวัดที่สามารถรู้ค่ามลพิษฝุ่นละออง และมีช่องทางรับข้อมูลข่าวสาร เป็นจุดเริ่มต้นเท่านั้น",
        { title: "รศ.ดร.เศรษฐ์ สัมภัตตะกุล มช.", meta: "วันเปิดตัว DustBoy", facts: [ORIGIN] }
      ),
      dialogue(
        "exit",
        host("นี่แหละงานสายข้อมูล", { mood: "wow" }),
        host("ตั้งคำถามดีๆ หาข้อมูลมาตอบ แล้วเล่าให้คนทั่วไปเข้าใจ"),
        sys("ด่านต่อไป: งานจริงไม่ได้สวยเหมือนกราฟ")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "24 ม.ค. 2568 ตัวเลขฝุ่นสั่งปิดโรงเรียน 352 แห่ง ใครเป็นคนทำตัวเลขนี้", factIds: [SCHOOLS, AQI] },
    variantsTh: [
      "ค่าฝุ่นที่เธอเช็กทุกเช้า ตอนปี 2561 ยังไม่นับ PM2.5 ด้วยซ้ำ",
      "เครื่องวัดฝุ่นที่เริ่มจากคำถามเดียวในเชียงใหม่",
    ],
    sendToFriendTh: "ส่งต่อให้เพื่อนที่เช็กสีฝุ่นทุกเช้า",
    visual: [
      "หน้าจอแอปสีฝุ่นเปลี่ยนจากส้มเป็นแดงเป็นม่วง",
      "ไอคอนโรงเรียน 437 หลัง ดับไฟทีละหลังจนเหลือ 85 หลังที่ยังเปิด",
      "การ์ดสามใบพลิก ประโยค เริ่มจากมีคนถามว่า เรืองแสงทุกใบ",
    ],
  },
};
