/**
 * Level 3 · tonight. One evening, a phone, nothing to install or sign up for:
 * plan a 15-second clip about the thing the student knows best (opening shot,
 * middle, ending), shoot it with the camera, trim it in the phone's own photo
 * app, show it to someone at home or a friend, and note where they stopped
 * watching. The plan and the note are the work from the work level (plan,
 * read results), and they never leave the device.
 *
 * Minors: no posting needed (talk to a parent before posting one day), no
 * faces of people who didn't agree, no school name, uniform name tag, house
 * number or location in the shot.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const TRIM = "f.cc-phone-trim" as const;
const SIM = "sim.cc-roti-clip" as const;
const GOOGLE_PHOTOS_TRIM_URL = "https://support.google.com/photos/answer/10729480?hl=th&co=GENIE.Platform%3DAndroid" as const;
const APPLE_TRIM_URL = "https://support.apple.com/th-th/104968" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ ถ่ายคลิปสั้นเรื่องที่เธอรู้ดี",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานชิ้นแรกใส่พอร์ตเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [TRIM, SIM, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้ วางแผนแล้วถ่ายคลิปสั้นเรื่องที่เธอรู้ดี ใช้แค่มือถือ ไม่ต้องโพสต์" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่เล่นในจอนะ แต่เป็นภารกิจของจริงคืนนี้เลย", { mood: "wow" }),
      host("ถ่ายคลิป 15 วิ เรื่องที่เธอรู้ดีที่สุด แบบพี่เบนซ์ถ่ายสัตว์ที่ตัวเองดูแล", { facts: [SIM] })
    ),
    item(
      "ideas",
      "intel",
      "ขนมที่ทำเป็น ต้นไม้หรือสัตว์ที่เลี้ยง เกมที่เล่นเก่ง วิธีจัดโต๊ะอ่านหนังสือ หรือสูตรที่เพื่อนถามบ่อย",
      { title: "ไอเดียตั้งต้น" }
    ),
    item(
      "tool",
      "intel",
      "ถ่ายด้วยกล้องมือถือ แล้วตัดให้สั้นในแอปรูปภาพของเครื่องได้เลย ไอโฟนใช้แอป Photos แอนดรอยด์ใช้ Google Photos (ถ้าเครื่องไม่รองรับ ลองแอปแกลเลอรีของเครื่อง) แตะไม่กี่ทีก็ลากตัดหัวท้ายได้",
      { title: "เครื่องมือ: มือถือเครื่องเดียว", facts: [TRIM] }
    ),
    {
      kind: "safety",
      id: "privacy",
      lineTh:
        "ถ่ายสิ่งของ มือ หรือมุมในบ้านก็พอ ถ้าจะมีหน้าใครต้องขอเขาก่อน และอย่าให้ติดชื่อโรงเรียน ป้ายชื่อบนเสื้อ บ้านเลขที่ หรืออะไรที่บอกว่าเธออยู่ตรงไหน",
    },
    dialogue(
      "no-post",
      host("ไม่ต้องโพสต์ที่ไหนเลยนะ เก็บไว้ในเครื่องก็นับเป็นผลงานแล้ว"),
      host("ถ้าวันไหนอยากโพสต์ คุยกับที่บ้านก่อนนะ แล้วอย่าให้ติดข้อมูลส่วนตัว")
    ),
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "Google Photos · ตัดวิดีโอให้สั้นลง",
            href: GOOGLE_PHOTOS_TRIM_URL,
            badgeTh: "ตัดคลิปได้ในแอปรูปภาพ ตามคู่มือ Google และ Apple ณ 20 พ.ย. 2569",
            subTh: "คลิปกับแผนอยู่ในเครื่องเธอ ไม่ต้องอัปโหลดไปไหน",
            factIds: [TRIM],
          },
          checklistTh: [
            "เลือกเรื่องที่เธอรู้ดีที่สุด เรื่องเดียวพอ",
            "เขียนแผนสั้นๆ: ช็อตเปิด ช็อตกลาง ช็อตปิด",
            "ช็อตเปิดโชว์ของเด็ดที่สุดก่อน แบบโรตีราดนม",
            "ถ่ายด้วยกล้องมือถือ แล้วตัดให้สั้นในแอปรูปภาพ",
            "ให้คนที่บ้านหรือเพื่อนดู แล้วจดว่าเขาดูจบไหม หลุดตรงไหน",
          ],
          fields: [
            { id: "topic", placeholderTh: "เรื่องที่ฉันรู้ดี" },
            { id: "hook", placeholderTh: "ช็อตเปิด จะโชว์อะไรให้คนหยุดดู" },
            { id: "shots", placeholderTh: "ช็อตกลางกับช็อตปิด" },
            { id: "viewer", placeholderTh: "ให้ใครดู เขาดูจบไหม หลุดตรงไหน" },
            { id: "fix", placeholderTh: "คลิปหน้าจะแก้อะไรก่อน เพราะอะไร" },
          ],
          fixedLinesTh: ["ไม่มีหน้าใครที่ยังไม่ได้ขออนุญาต ไม่มีชื่อโรงเรียนหรือที่อยู่"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เลือกเรื่องที่รู้ดีที่สุด แล้วเขียนแผน: ช็อตเปิด ช็อตกลาง ช็อตปิด",
        "ถ่ายด้วยกล้องมือถือ ตัดให้สั้นในแอปรูปภาพ (ไอโฟนใช้ Photos แอนดรอยด์ใช้ Google Photos หรือแอปแกลเลอรี)",
        "ให้คนที่บ้านหรือเพื่อนดู แล้วจด: เรื่องอะไร เปิดด้วยอะไร ดูจบไหม หลุดตรงไหน คลิปหน้าจะแก้อะไร",
        "ไม่ต้องโพสต์ ไม่มีหน้าใครที่ยังไม่ได้ขออนุญาต ไม่มีชื่อโรงเรียนหรือที่อยู่",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-topic", text: "วิธีชงชาไทยแบบที่ยายสอน" },
        { at: 3200, action: "type", target: "writeup.field-viewer", text: "แม่ดูจบ แต่พี่ชายกดออกตอนเทน้ำร้อน บอกว่ายาวไป" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    {
      kind: "link",
      id: "apple-trim",
      labelTh: "ใช้ไอโฟน ดูวิธีตัดคลิปในแอป Photos (คู่มือภาษาไทยของ Apple)",
      href: APPLE_TRIM_URL,
      cta: "first-step",
    },
    dialogue(
      "writeup-why",
      host("ของมีค่าสุดคืนนี้ไม่ใช่ยอดวิว แต่คือแผนกับโน้ตว่าคนดูหลุดตรงไหน", { mood: "serious" }),
      host("นั่นแหละ วางแผนกับอ่านผล แบบตอนทำคลิปร้านโรตีเป๊ะ", { mood: "wink" }),
      host("ทีมเราว่าช่องสุดท้าย รอบหน้าจะแก้อะไร สำคัญสุดเลย อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue("folio", host("แผน คลิป กับโน้ตนี้ เป็นผลงานชิ้นแรกในแฟ้มของเธอได้เลย", { mood: "wink" })),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้ลองแก้ตรงที่คนดูหลุด แล้วถ่ายใหม่อีกรอบดูสิ"),
  ],
};
