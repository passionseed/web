/**
 * Level 1 · dream. The hook: an app in the student's phone that started
 * because a first-year student kept missing the campus bus. Guess how many
 * people use it now, then see how far it went. No salaries, no market data.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host, item, me, sys } from "../../_shared/story";

const ORIGIN = "f.viabus-origin" as const;
const USERS = "f.viabus-users" as const;
const REACH = "f.viabus-reach" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "แอปที่เริ่มจากคนตกรถ",
  questionTh: "แอปในมือถือเธอ ใครเป็นคนทำ แล้วเขาเริ่มจากตรงไหน",
  navLabelTh: "คนตกรถ",
  asOf: "2026-11-18",
  minutes: 1.5,
  factIds: [ORIGIN, USERS, REACH],
  og: {
    headlineTh: "แอปที่คนใช้กว่า 10 ล้านคน ดันเริ่มจากเด็กปี 1 ที่ตกรถบ่อย",
    stat: { th: "ViaBus มีคนใช้กว่า 10 ล้านคนแล้ว", factIds: [USERS], badge: "vendor" },
  },
  blocks: [
    dialogue(
      "intro",
      host("เริ่มรันสายโค้ดเลย ด่านแรกมีแค่เรื่องเดียว", { mood: "wow" }),
      host("เรื่องของคนที่ตกรถบ่อยจนทนไม่ไหวแล้ว"),
      me("ตกรถมันเกี่ยวอะไรกับการเขียนโค้ด")
    ),
    item(
      "intel-origin",
      "intel",
      "นักศึกษาวิศวะจุฬาฯ ปี 1 ตกรถป๊อปในมหาวิทยาลัยบ่อยมาก เพราะไม่รู้ว่ารถจะมาถึงป้ายตอนไหน เลยทำแอปชื่อ Chula Pop Bus ไว้ใช้เอง",
      { title: "จุดเริ่มต้น", facts: [ORIGIN] }
    ),
    dialogue(
      "origin-after",
      host("ไม่มีใครจ้าง ไม่มีใครสั่ง แค่เบื่อที่ต้องยืนรอแบบไม่รู้อะไรเลย"),
      host("ต่อมาเขากับเพื่อนอีก 2 คน ลุยทำต่อจนกลายเป็น ViaBus", { facts: [ORIGIN] }),
      host("แอปที่บอกว่าตอนนี้รถเมล์คันที่เธอรออยู่ตรงไหนแล้ว", { mood: "wink" })
    ),
    beat(
      "beat-guess",
      "ลองทาย",
      dialogue("guess-intro", host("ลองทายดู วันนี้แอปที่เริ่มจากคนตกรถคนเดียว มีคนใช้กี่คนแล้ว", { mood: "wink" })),
      {
        kind: "game",
        id: "users",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "ตอนนี้ ViaBus มีคนใช้กี่คนแล้วนะ",
            min: 0,
            max: 20000000,
            step: 500000,
            unit: "count",
            answer: 10000000,
            answerFactId: USERS,
            buckets: [1000000, 5000000, 9000000, 20000001],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "ยอดคนใช้ ViaBus (ข้อมูล ส.ค. 2569)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไป {d} คน",
            underTh: "เธอเดาต่ำไป {d} คน",
            nearWithin: 1500000,
            revealTh: "เธอเดา {g} คน ของจริงคือกว่า 10,000,000 คน",
          },
        },
        track: { done: "dream:users-guess", value: "bucket" },
        answersTh: [
          "ส.ค. 2569 มีรายงานว่า ViaBus มีคนใช้กว่า 10 ล้านคน (ตัวเลขจากบริษัทเอง)",
          "แอปนี้เริ่มจาก Chula Pop Bus ที่นักศึกษาปี 1 ทำไว้แก้ปัญหาตกรถของตัวเอง",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "users.plus" },
          { at: 900, action: "tap", target: "users.plus" },
          { at: 1200, action: "tap", target: "users.plus" },
          { at: 2000, action: "tap", target: "users.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-users", "stat", "ViaBus บอกว่ามีคนใช้กว่า 10 ล้านคนแล้ว", {
        title: "คนใช้วันนี้",
        meta: "ส.ค. 2569",
        facts: [USERS],
        badge: "vendor",
      }),
      item(
        "notif-bts",
        "notification",
        "BTS เปิดให้เช็กรถไฟฟ้าสายสีเขียว สีเหลือง และสีชมพู แบบเรียลไทม์ในแอปนี้แล้ว",
        { title: "อัปเดต", meta: "6 ส.ค. 2569", facts: [REACH] }
      ),
      item(
        "intel-reach",
        "intel",
        "จากแอปดูรถป๊อปในมหาวิทยาลัย ตอนนี้เช็กได้ทั้งรถเมล์ เรือ รถไฟฟ้า มีในหลายจังหวัด แถมไปถึงอีก 3 ประเทศ ทั้งมาเลเซีย ลาว และฟิลิปปินส์",
        { title: "ไปไกลแค่ไหน", facts: [REACH] }
      )
    ),
    dialogue(
      "exit",
      host("เขาไม่ได้เริ่มจากความเก่งโค้ด แต่เริ่มจากปัญหาที่เจอเองทุกวัน"),
      host("แล้วปัญหาที่เธอบ่นทุกวันล่ะ มีอะไรบ้าง", { mood: "wink" }),
      sys("ด่านต่อไป: งานจริงของคนสายนี้เป็นยังไงกันแน่")
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "แอปที่คนใช้กว่า 10 ล้านคน ดันเริ่มจากเด็กปี 1 ที่ตกรถบ่อย", factIds: [USERS, ORIGIN] },
    variantsTh: ["ตกรถบ่อยจนต้องเขียนแอปใช้เอง", "แอปในมือถือเธอ อาจเริ่มจากคนที่เจอปัญหาเดียวกับเธอก็ได้"],
    sendToFriendTh: "ส่งต่อให้เพื่อนที่ตกรถเมล์บ่อย",
    visual: [
      "ป้ายรถเมล์ตอนเช้า รถเพิ่งออกไปต่อหน้า",
      "มือถือเปิดแอปเล็กๆ จุดรถป๊อปขยับบนแผนที่มหาวิทยาลัย",
      "แผนที่ซูมออก จุดรถเพิ่มเป็นทั้งเมือง แล้วตัวนับคนใช้วิ่งถึง 10,000,000",
    ],
  },
};
