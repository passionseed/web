/**
 * Copy for the student's SeedStack dashboard at /shift/seedstack, shown once
 * a computer is linked. Step names follow lib/content/seedstack-guide.ts.
 */

import type { SeedstackStepStatus } from "@/lib/seedstack/dashboard";
import type { SeedstackEventKind, SeedstackStep } from "@/lib/seedstack/events";

export const SEEDSTACK_DASHBOARD = {
  status: {
    title: "สถานะ",
    devices: (n: number) => `เชื่อมไว้ ${n} เครื่อง`,
    lastSeen: "ส่งข้อมูลล่าสุด",
    neverSynced: "ยังไม่เคยส่ง พิมพ์ /seedstack ใน OpenCode แล้วจะเริ่มส่งเอง",
    sending: "พี่ mentor เห็นขั้นที่เราทำอยู่",
    awaitingParent: "ข้อมูลรอในเครื่องเรา ยังไม่ส่ง จนกว่าผู้ปกครองตอบ",
    parentDeclined: "ผู้ปกครองยังไม่ยินยอม ข้อมูลอยู่ในเครื่องเราอย่างเดียว ไม่ส่งให้ใคร",
  },
  progress: {
    title: "ความคืบหน้า",
    next: "ต่อไป",
    live: "ลิงก์ live",
    held: "ขั้นที่ทำระหว่างรอ เก็บในเครื่องเราก่อน จะขึ้นที่นี่หลังผู้ปกครองยินยอม",
  },
  timeline: {
    title: "สิ่งที่พี่ mentor เห็น",
    intro: "ทุกอย่างที่ส่งไปแล้ว ตามที่เก็บจริง ไม่มีบทสนทนา ไฟล์ หรือโค้ด",
    empty: "ยังไม่มีอะไรส่งไป เปิด OpenCode ในโฟลเดอร์โปรเจกต์ แล้วพิมพ์ /seedstack",
    minutes: (n: number) => `ใช้ไป ${n} นาที`,
    next: "ต่อไป",
  },
  otherDevice: "เชื่อมเครื่องอื่น",
} as const;

export const STEP_LABELS: Record<SeedstackStep, { emoji: string; label: string }> = {
  install: { emoji: "🧰", label: "เตรียมเครื่อง" },
  scope: { emoji: "🎯", label: "ล็อก scope" },
  ship: { emoji: "🎫", label: "ship ticket" },
  test: { emoji: "🧪", label: "เทสต์กับคนจริง" },
};

export const STATUS_LABELS: Record<SeedstackStepStatus, { emoji: string; label: string }> = {
  not_started: { emoji: "⬜", label: "ยังไม่เริ่ม" },
  in_progress: { emoji: "⏳", label: "กำลังทำ" },
  stuck: { emoji: "🆘", label: "ติดอยู่" },
  done: { emoji: "✅", label: "เสร็จ" },
};

export const EVENT_LABELS: Record<SeedstackEventKind, string> = {
  start: "เริ่ม",
  stuck: "ติด",
  changed: "เปลี่ยนแผน",
  ticket: "ได้ ship ticket",
  done: "เสร็จ",
};
