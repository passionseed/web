/**
 * Level 1 · tonight. One real first step in under an hour, free: be the
 * accountant for your own money. Look back over last week's spending (bank
 * app slips, receipts, memory) or, with the teacher's OK, a school club's
 * money; put it in a spreadsheet, total each category, find one surprise and
 * say what you'd tell the owner of the money. The write-up never leaves the
 * device.
 *
 * Minors: LibreOffice is free and needs no sign-up; Google Sheets only for a
 * student who already has a Google account. Real amounts stay private.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const SHEETS = "f.acc-sheets" as const;
const LIBRE_URL = "https://www.libreoffice.org/discover/libreoffice/" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ ทำบัญชีเงินตัวเอง แล้วหาเรื่องที่ไม่คาดคิด",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานชิ้นแรกใส่แฟ้มเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [SHEETS, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้ลองเป็นนักบัญชีให้ตัวเอง แล้วหาให้เจอว่าเงินแอบไปไหน" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นบนจอนะ แต่เป็นภารกิจจริงที่ทำได้คืนนี้เลย", { mood: "wow" }),
      host("ลองเป็นนักบัญชีให้ตัวเองดู ย้อนเช็กว่าอาทิตย์ที่แล้วเงินไปไหนบ้าง")
    ),
    item(
      "tool",
      "intel",
      "LibreOffice เป็นโปรแกรมฟรี มี Calc ไว้ทำตาราง โหลดลงคอมได้เลย ถ้ามีบัญชี Google อยู่แล้วจะใช้ Google Sheets ก็ได้ หรือใช้สมุดกับปากกาก็ยังได้",
      { title: "เครื่องมือ: ตารางอะไรก็ได้", facts: [SHEETS] }
    ),
    {
      kind: "safety",
      id: "own-money",
      lineTh:
        "ทำบัญชีจากเงินของตัวเอง หรือเงินชุมนุมที่ครูที่ปรึกษาอนุญาตแล้วเท่านั้น ยอดเงินจริง ชื่อคน เลขบัญชี ไม่ต้องโพสต์ที่ไหน ถ้าจะใส่แฟ้ม เล่าวิธีทำกับสิ่งที่เจอก็พอ",
    },
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "ตารางรายรับรายจ่ายของฉัน",
            href: LIBRE_URL,
            badgeTh: "LibreOffice ฟรี ตามเว็บของ LibreOffice ณ 20 พ.ย. 2569",
            subTh: "มีบัญชี Google อยู่แล้ว ใช้ Google Sheets แทนได้ ไม่ต้องสมัครอะไรใหม่",
            factIds: [SHEETS],
          },
          checklistTh: [
            "ทำช่อง วันที่ รายการ หมวด จำนวนเงิน",
            "ย้อนดูเงินที่ใช้อาทิตย์ที่แล้ว จากสลิปในแอปธนาคาร ใบเสร็จ หรือความจำ",
            "แบ่งหมวด เช่น ของกิน เดินทาง เติมเกม ของใช้",
            "รวมเงินแต่ละหมวด (ในตารางใช้สูตร SUM ได้)",
            "หาเรื่องที่ไม่คาดคิดให้เจอ แล้วเขียนสรุป",
          ],
          fields: [
            { id: "whose", placeholderTh: "บัญชีของใคร (ของฉันเอง หรือของชุมนุม)" },
            { id: "top", placeholderTh: "หมวดไหนใช้เงินเยอะสุด" },
            { id: "surprise", placeholderTh: "เรื่องที่ไม่คาดคิด (เช่น ค่าขนมเล็กๆ รวมแล้วเยอะกว่าค่าเดินทาง)" },
            { id: "gap", placeholderTh: "มีรายการไหนจำไม่ได้ หรือยอดไม่ตรงบ้าง" },
            { id: "advice", placeholderTh: "ถ้าต้องบอกเจ้าของเงินหนึ่งเรื่อง จะบอกว่าอะไร" },
          ],
          fixedLinesTh: ["ทำจากเงินของฉันเอง หรือเงินชุมนุมที่ครูที่ปรึกษาอนุญาตแล้ว"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เปิด LibreOffice Calc (ฟรี) หรือใช้สมุดก็ได้ ถ้ามีบัญชี Google อยู่แล้วใช้ Google Sheets ได้",
        "ย้อนดูเงินที่ใช้อาทิตย์ที่แล้ว ลงวันที่ รายการ หมวด จำนวนเงิน แล้วใช้ SUM รวมแต่ละหมวด",
        "เขียนสรุป: บัญชีของใคร หมวดไหนเยอะสุด เรื่องที่ไม่คาดคิด รายการที่ไม่ตรง และจะบอกเจ้าของเงินว่าอะไร",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-top", text: "ของกิน เยอะกว่าที่คิดไว้มาก" },
        { at: 3200, action: "type", target: "writeup.field-surprise", text: "ชานมหลังเลิกเรียน รวมแล้วเยอะกว่าค่ารถทั้งอาทิตย์" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ช่องที่สำคัญสุดเลยนะ คือเรื่องที่เธอไม่คาดคิด", { mood: "serious" }),
      host("เพราะงานนักบัญชีจริงๆ คือหาสิ่งที่ตัวเลขไม่ได้บอกตรงๆ แหละ"),
      host("ช่องสุดท้าย จะบอกเจ้าของเงินว่าอะไร เราว่าอย่าข้ามเลยนะ", { labels: ["teamView"] })
    ),
    dialogue(
      "folio",
      host("ถ้าลองทำกับเงินชุมนุมยิ่งดีเลย ตารางกับสรุปนี้ใส่แฟ้มได้เลย", { mood: "wink" })
    ),
    roundOneTeaser(),
    whenChoice("พอทำเสร็จ อาทิตย์หน้าลองจดทุกครั้งที่จ่าย แล้วเทียบกับที่จำได้"),
  ],
};
