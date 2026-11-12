/**
 * Copy for /shift/seedstack/guide, the one-page SeedStack guide for SHIFT students.
 * Source of truth for commands and install lines: github.com/passionseed/seedstack README.
 */

const RAW = "https://raw.githubusercontent.com/passionseed/seedstack/main";

export const SEEDSTACK_GUIDE = {
  eyebrow: "SeedStack · คู่มือหน้าเดียว",
  title: "AI ที่ถามเรา ไม่คิดแทนเรา",

  nav: {
    install: "ติดตั้ง",
    start: "เริ่มใช้",
    commands: "คำสั่ง",
    rules: "กติกา",
    privacy: "ข้อมูล",
  },
  intro:
    "SeedStack คือชุดคำสั่งใน OpenCode สำหรับโปรเจกต์ SHIFT มันไม่คิดไอเดียให้ ไม่เลือกให้ว่าจะสร้างอะไร มันถามคำถาม ส่งเราไปคุยกับคนจริง แล้วช่วยเช็กว่าพร้อมไปขั้นต่อไปหรือยัง พอรู้ว่าจะสร้างอะไรแล้ว AI เขียนแอปให้ทีละขั้น และบอกว่าทำไมทุกขั้น",

  install: {
    title: "ติดตั้ง (ประมาณ 1 นาที)",
    lines: [
      { os: "mac", label: "Mac: เปิด Terminal แล้ววาง", value: `curl -fsSL ${RAW}/install.sh | bash` },
      { os: "windows", label: "Windows: เปิด PowerShell (ไม่ใช่ cmd) แล้ววาง", value: `irm ${RAW}/install.ps1 | iex` },
    ],
    steps: [
      ["ปิด OpenCode ให้สนิทก่อน", "Mac: Cmd+Q · Windows: ปิดจาก system tray ด้วย"],
      ["วางบรรทัดด้านบน แล้วพิมพ์ y", "ตัวติดตั้งบอกก่อนว่าจะทำอะไรในเครื่อง แล้วรอเราตอบ"],
      ["เปิด OpenCode ใหม่ เปิดโฟลเดอร์โปรเจกต์", "เลือกโมเดลตามที่พี่บอกใน #อ่านก่อน แล้วพิมพ์ /seedstack ครั้งแรกมันจะพาเชื่อมกับพี่ mentor ก่อน"],
    ],
    note: "ใช้ Codex? พิมพ์ $seedstack แทน /seedstack · ใช้ Claude Code ได้เหมือนกัน",
  },

  start: {
    title: "ไม่รู้จะทำอะไรต่อ? พิมพ์ /seedstack",
    body: "มันดูไฟล์ในโฟลเดอร์โปรเจกต์ บอกว่าเราอยู่ตรงไหน แล้วแนะนำขั้นถัดไป 1 ขั้นพร้อมเหตุผล เราเป็นคนเลือกว่าจะไปทางนั้นไหม",
    board: ["✅ scope card", "✅ ship ticket (ขั้น 2: เว็บหน้าเดียว)", "⏳ เทสต์แล้ว 1 / 3", "⬜ ลิงก์ live"],
    create:
      "รู้แล้วว่าอยากสร้างอะไร? พิมพ์ /seedstack create ตามด้วยไอเดีย เช่น /seedstack create เว็บจองคิวร้านตัดผม แล้ว AI เริ่มสร้างกับเราในแชตนี้เลย",
  },

  commands: {
    title: "คำสั่งทั้งหมด",
    rows: [
      { cmd: "/seedstack-install", when: "เครื่องยังไม่พร้อม (Node, git, โฟลเดอร์)", out: "เครื่องพร้อมสร้าง" },
      { cmd: "/seedstack-scope", when: "ไอเดียยังกว้าง อยากล็อกว่าจะสร้างอะไร", out: "scope-card.md" },
      { cmd: "/seedstack-ship", when: "ก่อนลงมือสร้าง เช็กว่าพร้อมเทสต์กับคนจริงไหม", out: "ship-ticket.md" },
      { cmd: "/seedstack-test", when: "หาคนเทสต์ เทสต์เสร็จ หรือได้ feedback มา", out: "test-log.md" },
      {
        cmd: "/seedstack-build",
        when: "บอกว่าอยากได้อะไร AI ตั้งโปรเจกต์ Next.js แล้วเขียนโค้ดให้ทีละขั้นในแชตเดียว พร้อมบอกว่าทำไม เราดูผลทุกขั้น · หรือพิมพ์ /seedstack create <ไอเดีย>",
        out: "แอป + build-plan.md",
      },
      {
        cmd: "/seedstack-autobuild",
        when: "ทางด่วน: AI ทำเกือบทั้งหมดจนได้ลิงก์ live เราทำแค่ส่วนที่ต้องเป็นเรา คือสมัครบัญชี login พิมพ์รหัสผ่านคอม และวาง secret key · หรือพิมพ์ /seedstack autobuild <ไอเดีย>",
        out: "ลิงก์ live เร็วที่สุด",
      },
      { cmd: "/seedstack-live", when: "ของในเครื่องเวิร์กแล้ว อยากได้ลิงก์ให้คนเปิด", out: "ลิงก์ live" },
      { cmd: "/seedstack-connect", when: "เชื่อมครั้งเดียวก่อนเริ่ม ทุกคำสั่งพามาเองถ้ายังไม่เชื่อม", out: "พี่ mentor เห็นตอนเราติด" },
    ],
    note: "ไม่ต้องเรียงตามนี้ เทสต์กับคนจริงได้ตั้งแต่ยังเป็นกระดาษ",
  },

  rules: {
    title: "3 ข้อที่ต้องรู้",
    items: [
      [
        "AI เขียนแอป เครื่องมือเราติดตั้งเอง",
        "AI ตั้ง Next.js และเขียนโค้ดให้ ส่วน Node, git, Vercel และ Supabase เราติดตั้งและ login เองตอนที่แอปต้องใช้ จะได้รู้ว่าแต่ละตัวมีไว้ทำไม พอตั้งเสร็จ AI ใช้ต่อให้ทั้ง save งานและเอาขึ้นเน็ต และบอกว่าทำไมทุกครั้ง",
      ],
      ["มันถาม ไม่คิดแทน", "จะสร้างอะไร ตัดอะไรออก เทสต์แล้วจะเปลี่ยนอะไร เราเป็นคนตัดสิน scope card กับผลเทสต์เขียนจากคำของเราเอง ไม่ใช่ของ AI"],
      ["ติดแล้วโพสต์เลย", "แคปจอ error มาใน #ถามได้ทุกเรื่อง เพื่อนตอบไวกว่าที่คิด"],
    ],
  },

  privacy: {
    title: "ข้อมูลของเรา",
    items: [
      "SeedStack จดแค่ขั้นที่ทำและเวลาไว้ในเครื่องเรา ไม่เก็บบทสนทนา ไฟล์ หรือโค้ด",
      "ไม่มีอะไรออกจากเครื่อง จนกว่าเราจะ /seedstack-connect และกดยินยอมบนเว็บ",
      "ถ้ายังไม่ถึง 20 ปี ผู้ปกครองต้องกดยินยอมด้วย ระหว่างรอใช้ได้ปกติ ข้อมูลรอในเครื่องก่อน",
      "ถอนความยินยอมได้ทุกเมื่อ ระบบลบข้อมูลที่ส่งไปแล้วทั้งหมด",
    ],
    link: { href: "/shift/seedstack", label: "ดูรายละเอียด / เชื่อมกับพี่ mentor" },
  },

  update:
    "อัปเดต: พิมพ์ /seedstack-update จากนั้นปิด OpenCode ให้สนิทแล้วเปิดใหม่ SeedStack จะบอกเองเมื่อมีเวอร์ชันใหม่ ถ้าอัปเดตไม่ผ่าน รันบรรทัดติดตั้งเดิมอีกครั้งได้เสมอ",
} as const;
