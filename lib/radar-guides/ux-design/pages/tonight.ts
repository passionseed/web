/**
 * Level 3 · tonight. One evening, free: pick one screen of an app the student
 * uses, screenshot it (before), have someone at home or a friend try one task
 * while the student only watches, redraw the screen on paper or in
 * Excalidraw (after), let them try it again, and write up what changed and
 * why. That write-up is the work level's loop, and the first piece of a
 * round 1 portfolio. The write-up never leaves the device.
 *
 * Minors: the screenshot is of their own app with names, numbers, addresses
 * and chats covered; no photos or recordings of the person testing. Paper is
 * the default tool; the copy never says Excalidraw needs no account (its
 * README does not say so).
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const EXCALIDRAW = "f.ux-excalidraw" as const;
const NNG = "f.ux-nng-watch" as const;
const EXCALIDRAW_URL = "https://excalidraw.com" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ รีดีไซน์หน้าจอเดียว",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานชิ้นแรกใส่พอร์ตเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [EXCALIDRAW, NNG, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้หยิบหน้าจอเดียวในแอปที่ใช้ทุกวัน แล้วทำให้มันใช้ง่ายขึ้น" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอแล้วนะ เป็นภารกิจจริงคืนนี้เลย", { mood: "wow" }),
      host("หยิบหน้าเดียวในแอปที่เธอใช้ แล้วลองออกแบบใหม่ให้ใช้ง่ายขึ้น"),
      host("ดูคนลองใช้ก่อนแก้ แบบตอนแก้แอปโรงอาหารเลย", { mood: "wink" })
    ),
    item(
      "tool",
      "intel",
      "Excalidraw ใช้วาดแบบร่างหน้าจอในเบราว์เซอร์ ฟรีและเปิดโค้ด งานเซฟอยู่ในเบราว์เซอร์เครื่องเธอ ใช้กระดาษกับปากกาแทนก็ได้เหมือนกัน",
      { title: "เครื่องมือ: กระดาษ หรือ Excalidraw", facts: [EXCALIDRAW] }
    ),
    {
      kind: "safety",
      id: "privacy",
      lineTh:
        "แคปเฉพาะจอแอปของเธอเอง ปิดชื่อ เบอร์ ที่อยู่ และแชตก่อนทุกครั้ง ไม่ต้องถ่ายหน้าหรืออัดเสียงคนที่มาลอง จดแค่ว่าเขาติดตรงไหน",
    },
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "Excalidraw · กระดานวาดแบบร่าง",
            href: EXCALIDRAW_URL,
            badgeTh: "ฟรีและเปิดโค้ด ตาม GitHub ของ Excalidraw ณ 19 พ.ย. 2569",
            subTh: "งานเซฟไว้ในเบราว์เซอร์เครื่องเธอ ไม่อยากใช้เว็บไหนเลย ใช้กระดาษกับปากกาก็ได้",
            factIds: [EXCALIDRAW],
          },
          checklistTh: [
            "เลือกหน้าเดียวในแอปที่เธอใช้บ่อย แล้วเคยทำเอาหงุดหงิด",
            "แคปหน้าจอเก็บไว้เป็นภาพก่อน (ปิดข้อมูลส่วนตัวก่อนนะ)",
            "ให้คนในบ้านหรือเพื่อนลองทำหนึ่งอย่างในหน้านั้น เธอแค่ดู ห้ามช่วยนะ",
            "จดไว้ว่าเขาติดหรือลังเลตรงไหน",
            "วาดหน้าใหม่ลงกระดาษหรือใน Excalidraw เป็นภาพหลัง",
            "ให้เขาลองดูหน้าใหม่ แล้วจดไว้ว่าดีขึ้นไหม",
          ],
          fields: [
            { id: "screen", placeholderTh: "หน้าจอไหน ของแอปอะไร" },
            { id: "task", placeholderTh: "ให้เขาลองทำอะไร" },
            { id: "stuck", placeholderTh: "เขาติดหรือลังเลตรงไหน" },
            { id: "change", placeholderTh: "เธอแก้อะไรไป เพราะอะไร" },
            { id: "retry", placeholderTh: "ลองหน้าใหม่แล้วเป็นยังไงบ้าง" },
          ],
          fixedLinesTh: ["ภาพแคปปิดชื่อ เบอร์ และแชตแล้ว ไม่มีรูปหน้าคนที่มาลอง"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เลือกหน้าเดียวในแอปที่ใช้บ่อย แคปเก็บไว้เป็นภาพก่อน (ปิดข้อมูลส่วนตัว)",
        "ให้คนในบ้านหรือเพื่อนลองทำหนึ่งอย่าง เธอแค่ดู ห้ามช่วย แล้วจดว่าเขาติดตรงไหน",
        "วาดหน้าใหม่บนกระดาษหรือใน Excalidraw ให้เขาลองอีกรอบ",
        "เขียนสรุป: หน้าไหน ให้ลองทำอะไร ติดตรงไหน แก้อะไรเพราะอะไร ลองใหม่แล้วเป็นยังไง",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-screen", text: "หน้าเติมเงินในแอปโรงเรียน" },
        { at: 3200, action: "type", target: "writeup.field-stuck", text: "แม่หาปุ่มยืนยันไม่เจอ เพราะมันอยู่ล่างสุด" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ภาพสวยไม่ใช่ของที่มีค่าที่สุดคืนนี้หรอกนะ"),
      host("ของเจ๋งจริงคือบันทึกว่าคนติดตรงไหน แล้วเธอแก้ยังไง", { facts: [NNG], mood: "wink" }),
      host("ทีมเราว่าช่อง เพราะอะไร สำคัญสุดเลย อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue("folio", host("ภาพก่อนหลังกับบันทึกนี้ คือผลงานชิ้นแรกในแฟ้มของเธอเลย", { mood: "wink" })),
    roundOneTeaser(),
    whenChoice("เสร็จแล้ว พรุ่งนี้ชวนอีกคนมาลองหน้าใหม่ดูสิ"),
  ],
};
