/**
 * Copy for /shift/seedstack/guide, the one-page SeedStack guide for SHIFT students.
 * Source of truth for commands and install lines: github.com/passionseed/seedstack README.
 */

const RAW = "https://raw.githubusercontent.com/passionseed/seedstack/main";

export const SEEDSTACK_GUIDE = {
  eyebrow: "SeedStack · คู่มือหน้าเดียว",
  title: "AI ที่ถามเรา ไม่ทำแทนเรา",
  intro:
    "SeedStack คือชุดคำสั่งใน OpenCode สำหรับโปรเจกต์ SHIFT มันไม่คิดไอเดียให้ ไม่เลือกให้ว่าจะสร้างอะไร มันถามคำถาม ส่งเราไปคุยกับคนจริง แล้วช่วยเช็กว่าพร้อมไปขั้นต่อไปหรือยัง",

  install: {
    title: "ติดตั้ง (ประมาณ 1 นาที)",
    lines: [
      { label: "Mac: เปิด Terminal แล้ววาง", value: `curl -fsSL ${RAW}/install.sh | bash` },
      { label: "Windows: เปิด PowerShell (ไม่ใช่ cmd) แล้ววาง", value: `irm ${RAW}/install.ps1 | iex` },
    ],
    steps: [
      ["ปิด OpenCode ให้สนิทก่อน", "Mac: Cmd+Q · Windows: ปิดจาก system tray ด้วย"],
      ["วางบรรทัดด้านบน แล้วพิมพ์ y", "ตัวติดตั้งบอกก่อนว่าจะทำอะไรในเครื่อง แล้วรอเราตอบ"],
      ["เปิด OpenCode ใหม่ เปิดโฟลเดอร์โปรเจกต์", "เลือกโมเดลตามที่พี่บอกใน #อ่านก่อน แล้วพิมพ์ /seedstack"],
    ],
    note: "ใช้ Codex? พิมพ์ $seedstack แทน /seedstack · ใช้ Claude Code ได้เหมือนกัน",
  },

  start: {
    title: "ไม่รู้จะทำอะไรต่อ? พิมพ์ /seedstack",
    body: "มันดูไฟล์ในโฟลเดอร์โปรเจกต์ บอกว่าเราอยู่ตรงไหน แล้วแนะนำขั้นถัดไป 1 ขั้นพร้อมเหตุผล เราเป็นคนเลือกว่าจะไปทางนั้นไหม",
    board: ["✅ scope card", "✅ ship ticket (ขั้น 2: เว็บหน้าเดียว)", "⏳ เทสต์แล้ว 1 / 3", "⬜ ลิงก์ live"],
  },

  commands: {
    title: "คำสั่งทั้งหมด",
    rows: [
      { cmd: "/seedstack-install", when: "เครื่องยังไม่พร้อม (Node, git, โฟลเดอร์)", out: "เครื่องพร้อมสร้าง" },
      { cmd: "/seedstack-scope", when: "ไอเดียยังกว้าง อยากล็อกว่าจะสร้างอะไร", out: "scope-card.md" },
      { cmd: "/seedstack-ship", when: "ก่อนลงมือสร้าง เช็กว่าพร้อมเทสต์กับคนจริงไหม", out: "ship-ticket.md" },
      { cmd: "/seedstack-test", when: "หาคนเทสต์ เทสต์เสร็จ หรือได้ feedback มา", out: "test-log.md" },
      { cmd: "/seedstack-live", when: "ของในเครื่องเวิร์กแล้ว อยากได้ลิงก์ให้คนเปิด", out: "ลิงก์ live" },
      { cmd: "/seedstack-connect", when: "(ไม่บังคับ) ให้พี่ mentor เห็นว่าเราอยู่ขั้นไหน", out: "พี่เห็นตอนเราติด" },
    ],
    note: "ไม่ต้องเรียงตามนี้ เทสต์กับคนจริงได้ตั้งแต่ยังเป็นกระดาษ",
  },

  rules: {
    title: "3 ข้อที่ต้องรู้",
    items: [
      ["เราพิมพ์ทุกคำสั่งเอง", "AI เปิดหน้าเว็บทางการให้ อธิบายว่าทำไม แล้วอ่าน error ให้ แต่ไม่ติดตั้งแทน"],
      ["มันถาม ไม่ตอบแทน", "ทุกไฟล์ที่ได้มาเขียนจากคำของเราเอง ไม่ใช่ของ AI"],
      ["ติดแล้วโพสต์เลย", "แคปจอ error มาใน #ถามได้ทุกเรื่อง เพื่อนตอบไวกว่าที่คิด"],
    ],
  },

  privacy: {
    title: "ข้อมูลของเรา",
    items: [
      "SeedStack จดแค่ขั้นที่ทำและเวลาไว้ในเครื่องเรา ไม่เก็บบทสนทนา ไฟล์ หรือโค้ด",
      "ไม่มีอะไรออกจากเครื่อง จนกว่าเราจะ /seedstack-connect และทั้งเราและผู้ปกครองยินยอม",
      "ถอนความยินยอมได้ทุกเมื่อ ระบบลบข้อมูลที่ส่งไปแล้วทั้งหมด",
    ],
    link: { href: "/shift/seedstack", label: "ดูรายละเอียด / เชื่อมกับพี่ mentor" },
  },

  update: "อัปเดต: ปิด OpenCode ให้สนิท แล้วรันบรรทัดติดตั้งเดิมอีกครั้ง SeedStack จะบอกเองเมื่อมีเวอร์ชันใหม่",
} as const;
