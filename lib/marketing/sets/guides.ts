import type { StudioSet } from "../types";

/**
 * Value-first guides for students: each one teaches a skill SHIFT teaches,
 * so the post is worth saving even for someone who never applies. Cream
 * paper theme, 3:4 so the profile grid shows them uncropped.
 */

const BASE = {
  channel: "instagram",
  format: "ig-tall",
  theme: "paper",
  audience: "student",
  created: "2026-10-11",
} as const;

const SHIFT_TAGS = ["PassionSeed", "พอร์ตTCAS", "ทำพอร์ต", "ม4", "ม5"];

export const TESTER_HUNT: StudioSet = {
  ...BASE,
  slug: "guide-tester-hunt",
  title: "Guide: find testers by asking one person at a time",
  angle: "Story posts get no testers (bystander effect); direct, specific asks do. DM script to copy.",
  sources: [
    "lib/content/shift-voices.ts SHIFT_CHANGES (เคเค: หาคนนอกมาลองใช้ ต้องใช้เวลา)",
    "lib/content/shift-cohort.ts SHIFT_SKILL_CARDS Tester Hunt, testerTarget (target, not a result)",
  ],
  caption: [
    "โพสต์สตอรี่ขอให้ลองแอป แล้วเงียบ ไม่มีใครกด",
    "",
    "ไม่ใช่เพราะไม่มีใครอยากช่วย แต่พอขอทุกคนพร้อมกัน ก็ไม่มีใครรู้สึกว่าต้องเป็นคนตอบ",
    "",
    "ใน SHIFT เราเลยสอนหาคนลองใช้แบบทักทีละคน ทุกคนเขียนรายชื่อคนที่จะทักตั้งแต่วันแรก แล้วทักวันละไม่กี่คน",
    "",
    "สไลด์ 4 มีข้อความทักให้ก๊อปไปแก้ใช้ได้เลย",
    "เซฟไว้ใช้ตอนต้องหาคนลองของ ส่งให้เพื่อนที่กำลังทำโปรเจกต์ด้วย",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "Tester Hunt",
      icon: "send",
      title: ["โพสต์สตอรี่แล้ว", "ไม่มีใคร", "ลองใช้?"],
      note: "รุ่นก่อนก็เจอแบบนี้ทั้งรุ่น",
      sub: "ทักทีละคน ได้ผลกว่าประกาศให้ทุกคนเห็น นี่คือวิธีที่เราสอนใน SHIFT",
    },
    {
      kind: "statement",
      tag: "Why",
      big: ["คนไม่ได้ไม่อยากช่วย", "แค่ไม่รู้ว่า", "**เราขอเขา**"],
      body: "โพสต์สตอรี่คือการขอทุกคนพร้อมกัน เลยไม่มีใครรู้สึกว่าต้องเป็นคนตอบ ทักตรงทีละคน บอกชื่อเขา บอกว่าทำไมต้องเป็นเขา แล้วขอแค่ 5 นาที",
    },
    {
      kind: "points",
      tag: "Who to ask",
      title: "ทักใครดี",
      numbered: true,
      points: [
        { title: "คนที่เจอปัญหานั้นจริง", body: "ไม่ใช่เพื่อนสนิทที่ตอบว่าดีทุกอย่าง" },
        { title: "คนที่ห่างออกไป 1 ขั้น", body: "เพื่อนของเพื่อน รุ่นพี่ ญาติ คนในกลุ่มที่คุยเรื่องนี้" },
        { title: "เขียนเป็นรายชื่อ", body: "ลิสต์ชื่อคนที่จะทักตั้งแต่วันแรก แล้วทักวันละ 3-5 คน" },
      ],
    },
    {
      kind: "chat",
      tag: "Copy this",
      title: "ข้อความทักที่เอาไปแก้ใช้ได้",
      lines: [
        { from: "me", text: "สวัสดีครับ พี่[ชื่อ] ผมชื่อ[ชื่อ] กำลังทำ[สิ่งที่ทำ] ให้คนที่[เจอปัญหาอะไร]" },
        { from: "me", text: "เห็นว่าพี่[เหตุผลที่เป็นเขา] เลยอยากขอให้ลองใช้ 5 นาที แล้วบอกว่าติดตรงไหน" },
        { from: "me", text: "ไม่ต้องชมนะครับ ติตรงๆ ช่วยผมมากที่สุด" },
        { from: "them", text: "ได้สิ ส่งลิงก์มาเลย" },
      ],
      footnote: "เปลี่ยน [ ] เป็นของจริงทุกครั้ง ข้อความที่เขียนถึงเขาคนเดียว อ่านแล้วรู้ว่าไม่ได้ก๊อปส่งทุกคน",
    },
    {
      kind: "points",
      tag: "After they try",
      title: "ลองแล้ว ถามต่อแบบนี้",
      points: [
        { title: "ตรงไหนที่ทำให้ช้าหรืองง" },
        { title: "ถ้าไม่มีของเรา ตอนนี้ทำยังไงอยู่" },
        { title: "จะส่งต่อให้ใครไหม ทำไม" },
      ],
      footnote: "จดเป็น**คำพูดของเขา** ไม่ใช่สรุปของเรา คำพูดจริงคือหลักฐานที่ใส่พอร์ตได้",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nใช้ตอนหา\nคนลองของ",
      icon: "people",
      action: "save",
      body: "อยากฝึกกับเพื่อนร่วมรุ่น 7 วัน ดู SHIFT ที่ลิงก์ในไบโอ",
    },
  ],
};

export const QUESTIONS_THAT_LIE: StudioSet = {
  ...BASE,
  slug: "guide-questions-that-lie",
  title: "Guide: 3 interview questions that get polite lies",
  angle: "Customer discovery: why 'would you use it?' gets fake yeses; ask about the past instead.",
  sources: [
    "lib/content/shift-cohort.ts schedule Day 2 (คุยกับคนที่เจอปัญหาจริง 3 คน)",
    "SHIFT_SKILL_CARDS Customer Discovery; general interview practice, no outcome claim",
  ],
  caption: [
    "ถามคนว่า \"ถ้ามีแอปนี้ จะใช้ไหม\" ทุกคนตอบว่าใช้ แล้วก็ไม่มีใครใช้",
    "",
    "เขาไม่ได้โกหกเพราะใจร้าย แค่เกรงใจ และคำถามนั้นให้เขาเดาอนาคต ซึ่งไม่มีใครเดาถูก",
    "",
    "3 คำถามที่ควรเลิกถาม พร้อมคำถามที่ใช้แทนได้ ใช้ได้กับทุกโปรเจกต์",
    "เซฟไว้ก่อนไปคุยกับคนแรก",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "Customer Discovery",
      icon: "mic",
      title: ["3 คำถาม", "ที่ทำให้คน", "ตอบไม่จริง"],
      note: "เขาไม่ได้ใจร้าย แค่เกรงใจ",
      sub: "ถามแบบนี้ ทุกคนจะบอกว่าไอเดียเราดี แล้วก็ไม่มีใครใช้",
    },
    {
      kind: "compare",
      tag: "01",
      title: "“ถ้ามีแอปนี้ จะใช้ไหม?”",
      left: { label: "ทำไมพัง", items: ["ตอบว่าใช้ ไม่ต้องจ่ายอะไรเลย", "ให้เขาเดาอนาคต ซึ่งเดาไม่ได้"] },
      right: { label: "ถามแทน", items: ["ครั้งล่าสุดที่เจอปัญหานี้ คือเมื่อไหร่", "ตอนนั้นแก้ยังไง"] },
    },
    {
      kind: "compare",
      tag: "02",
      title: "“ไอเดียนี้ดีไหม?”",
      left: { label: "ทำไมพัง", items: ["เขาเกรงใจ เลยตอบว่าดี", "เราได้ความรู้สึก ไม่ได้ข้อมูล"] },
      right: { label: "ถามแทน", items: ["ตอนนี้ใช้อะไรแก้ปัญหานี้อยู่", "อะไรน่ารำคาญที่สุดของวิธีนั้น"] },
    },
    {
      kind: "compare",
      tag: "03",
      title: "“จะจ่ายเท่าไหร่?”",
      left: { label: "ทำไมพัง", items: ["ตัวเลขที่ตอบ ไม่มีใครต้องจ่ายจริง", "ราคาในหัวกับในกระเป๋า คนละเรื่อง"] },
      right: { label: "ถามแทน", items: ["เคยจ่ายเงินหรือเวลาให้เรื่องนี้ไหม", "ถ้าเคย จ่ายไปเท่าไหร่ ให้อะไร"] },
    },
    {
      kind: "statement",
      tag: "Rule of thumb",
      big: ["ถามสิ่งที่เขา**ทำ**", "ไม่ใช่สิ่งที่เขา", "คิดว่าจะทำ"],
      body: "ฟังมากกว่าพูด อย่าเพิ่งขายไอเดีย และจดคำพูดของเขาตรงๆ ไม่ต้องสรุป",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nก่อนไปคุยกับคนแรก",
      icon: "chat",
      action: "save",
      body: "ใน SHIFT วันที่ 2 คือวันคุยกับคนที่เจอปัญหาจริง 3 คน",
    },
  ],
};

export const CERT_VS_PROOF: StudioSet = {
  ...BASE,
  slug: "guide-cert-vs-proof",
  title: "Guide: 10 certificates vs 1 project people used",
  angle: "TCAS portfolio: attendance certificates vs uncopyable proof; กสพท70 as the worked example.",
  sources: [
    "SHIFT_COHORT_0.showcase ปฏิทิน กสพท70 (changed brief after user conversations)",
    "lib/content/shift-cohort.ts schedule Day 5-6 (fix log, one number)",
  ],
  caption: [
    "ใบเซอร์บอกว่าเราไปนั่งฟังมา",
    "งานที่มีคนใช้จริงบอกว่าเราทำอะไรได้",
    "",
    "หลักฐานที่ลอกกันไม่ได้มี 4 อย่าง: คำพูดจริงของคนที่ไปคุยด้วย ลิงก์ที่เปิดได้ บันทึกจุดที่พัง และตัวเลข 1 ตัว",
    "",
    "ตัวอย่างจากรุ่นทดลอง SHIFT[0]: ปฏิทิน กสพท70 เริ่มจากเว็บรวมเกณฑ์พอร์ต คุยกับคนที่จะใช้จริงแล้วเจอว่าเขาอยากรู้วันสอบมากกว่า เลยเปลี่ยนโจทย์",
    "",
    "อยากได้งานแบบนี้ใส่พอร์ต คอมเมนต์ \"SHIFT\" รับลิงก์สมัครทาง DM",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "TCAS Portfolio",
      icon: "cert",
      title: ["ใบเซอร์ 10 ใบ", "กับงาน 1 ชิ้น", "ที่มีคนใช้จริง"],
      sub: "ใบเซอร์บอกว่าเราไปนั่งฟังมา งานที่มีคนใช้จริงบอกว่าเราทำอะไรได้",
    },
    {
      kind: "compare",
      tag: "What it proves",
      title: "บอกอะไรเกี่ยวกับเรา",
      left: { label: "ใบเซอร์ค่ายนั่งฟัง", items: ["เราไปเข้าร่วม", "ทุกคนในค่ายได้ใบเดียวกัน", "เล่าต่อได้ไม่กี่ประโยค"] },
      right: { label: "งานที่มีคนใช้จริง", items: ["เราเลือกปัญหาเอง", "ไม่มีใครมีเรื่องเดียวกับเรา", "มีจุดพังและวิธีแก้ให้เล่า"] },
    },
    {
      kind: "points",
      tag: "Proof checklist",
      title: "หลักฐานที่ลอกกันไม่ได้",
      numbered: true,
      points: [
        { title: "คำพูดจริงของคนที่ไปคุยด้วย", body: "จดคำต่อคำ พร้อมวันที่" },
        { title: "ลิงก์ต้นแบบที่เปิดได้", body: "ไม่สวยก็ได้ ขอให้กดใช้ได้" },
        { title: "บันทึกจุดที่พัง", body: "พังตรงไหน แก้ยังไง เปลี่ยนใจเพราะอะไร" },
        { title: "ตัวเลข 1 ตัว ก่อนและหลัง", body: "เช่น กี่คนใช้จนจบ" },
      ],
    },
    {
      kind: "points",
      tag: "Real example · SHIFT[0]",
      title: "ปฏิทิน กสพท70",
      numbered: true,
      points: [
        { title: "เริ่มจากเว็บรวมเกณฑ์พอร์ต" },
        { title: "คุยกับคนที่จะใช้จริง", body: "เจอว่าเขาอยากรู้วันสอบมากกว่าเกณฑ์" },
        { title: "เลยเปลี่ยนโจทย์", body: "เป็นปฏิทินนับถอยหลัง 11 กำหนดการ กสพท และ TCAS รอบ 3" },
      ],
      footnote: "เรื่องเปลี่ยนโจทย์แบบนี้ คือสิ่งที่ใบเซอร์เล่าแทนไม่ได้ (เป็นงานจริง ไม่ใช่ผลรับเข้ามหาวิทยาลัย)",
    },
    {
      kind: "statement",
      big: ["ตอนสัมภาษณ์", "เรื่องที่**เล่าได้ยาวที่สุด**", "คือเรื่องที่เราทำเอง"],
      body: "ไม่ต้องจำบท เพราะเราอยู่กับมันมาทุกวัน",
    },
    {
      kind: "cta",
      tag: "SHIFT",
      title: "อยากได้งานแบบนี้\nใส่พอร์ตใน 7 วัน",
      icon: "rocket",
      action: "comment",
      body: "แล้วรับลิงก์สมัครทาง DM",
    },
  ],
};

export const PORT_ONE_PAGE: StudioSet = {
  ...BASE,
  slug: "guide-port-one-page",
  title: "Guide: the 1-page portfolio template",
  angle: "Saveable template: the six blocks of a พอร์ต 1 หน้า, top half what/for whom, bottom half what you learned.",
  sources: ["lib/content/shift-cohort.ts schedule (Day 1 scope, Day 5 fix log, Day 6 one number, Day 7 พอร์ต 1 หน้า)"],
  caption: [
    "พอร์ต 1 หน้า ที่เล่างานได้ใน 1 นาที",
    "",
    "นี่คือโครงที่ใช้สรุปงานตอนจบ SHIFT ใช้กับโปรเจกต์ไหนก็ได้ 6 ช่อง ครึ่งบนบอกว่าทำอะไรให้ใคร ครึ่งล่างบอกว่าเรียนรู้อะไร",
    "",
    "ไม่ต้องสวย ต้องจริง ภาพหน้าจอจริง คำพูดจริง ตัวเลขจริง",
    "เซฟไว้ แล้วลองเติมของตัวเองดู",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "1-Page Portfolio",
      icon: "caseStudy",
      title: ["พอร์ต 1 หน้า", "ที่เล่างาน", "ได้ใน 1 นาที"],
      note: "เซฟไว้ แล้วเติมของตัวเอง",
      sub: "โครงที่ใช้สรุปงานตอนจบ SHIFT ใช้กับโปรเจกต์ไหนก็ได้",
    },
    {
      kind: "points",
      tag: "Top half",
      title: "ครึ่งบน: ทำอะไร ให้ใคร",
      numbered: true,
      points: [
        { title: "ปัญหา 1 ประโยค", body: "ใครเจอ และเจอตอนไหน" },
        { title: "คนที่ไปคุยด้วย", body: "กี่คน และ 1 ประโยคของเขาที่ทำให้เราเปลี่ยนใจ" },
        { title: "สิ่งที่สร้าง", body: "ภาพหน้าจอ 1 ภาพ กับลิงก์ที่เปิดได้" },
      ],
    },
    {
      kind: "points",
      tag: "Bottom half",
      title: "ครึ่งล่าง: เรียนรู้อะไร",
      numbered: true,
      startAt: 4,
      points: [
        { title: "จุดที่พัง", body: "พังตรงไหน เราแก้ยังไง" },
        { title: "ตัวเลข 1 ตัว", body: "ก่อนแก้ กับหลังแก้" },
        { title: "ถ้ามีอีก 7 วัน", body: "จะทำอะไรต่อ และทำไม" },
      ],
    },
    {
      kind: "statement",
      big: ["ไม่ต้องสวย", "ต้อง**จริง**"],
      body: "ภาพหน้าจอจริง คำพูดจริง ตัวเลขจริง ดีกว่ากราฟิกสวยที่ไม่มีอะไรรองรับ",
      note: "กรอกได้แม้งานยังไม่เสร็จ",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nใช้ตอนสรุปโปรเจกต์",
      icon: "target",
      action: "save",
      body: "ส่งต่อให้เพื่อนที่กำลังทำพอร์ตด้วย",
    },
  ],
};

export const AI_NOT_PROXY: StudioSet = {
  ...BASE,
  slug: "guide-ai-not-proxy",
  title: "Guide: build with AI without becoming a copy-paste proxy",
  angle: "A student said AI made it too easy, so they got lazy; the Anti Meat Proxy card and 4 checks before pasting.",
  sources: [
    "lib/content/shift-voices.ts SHIFT_CHANGES (ป่าน: มันง่ายเกินไป...)",
    "SHIFT_VOICES.founderFishingRod (founder, not a student)",
    "SHIFT_SKILL_CARDS Anti Meat Proxy; SeedStack guide (lib/content/seedstack-guide.ts)",
  ],
  caption: [
    "\"มันง่ายเกินไป แค่สั่ง AI ก็ได้ เลยขี้เกียจ\" นักเรียน SHIFT เล่าให้เราฟังหลังจบรุ่น",
    "",
    "AI ทำให้สร้างต้นแบบได้เร็วขึ้นมาก แต่ถ้าเราแค่ก๊อปคำตอบไปแปะ งานนั้นไม่ใช่ของเรา และเล่าต่อในพอร์ตไม่ได้",
    "",
    "เราเลยเพิ่มการ์ด Anti Meat Proxy: ใช้ AI ได้เต็มที่ แต่ต้องตั้งคำถาม ตัดสิน และรับผิดชอบเอง",
    "",
    "4 คำถามก่อนกดใช้คำตอบจาก AI อยู่ในสไลด์ 4 เซฟไว้ได้เลย",
  ].join("\n"),
  hashtags: [...SHIFT_TAGS.slice(0, 3), "AI"],
  slides: [
    {
      kind: "cover",
      kicker: "Anti Meat Proxy",
      icon: "code",
      title: ["ใช้ AI สร้าง", "แต่อย่าเป็นแค่", "ตัวก๊อปแปะ"],
      sub: "AI ทำให้สร้างต้นแบบได้เร็วขึ้นมาก แต่คนตัดสินใจและรับผิดชอบงาน ต้องเป็นเรา",
    },
    {
      kind: "statement",
      tag: "What a student told us",
      big: ["“มันง่ายเกินไป", "แค่สั่ง AI ก็ได้", "เลยขี้เกียจ”"],
      body: "ป่าน นักเรียน SHIFT เล่าให้เราฟังหลังจบรุ่น เราว่าเขาพูดถูก",
    },
    {
      kind: "quote",
      tag: "ทำไมเรายังให้ใช้ AI",
      voice: "founderFishingRod",
      context: "เราเลยเพิ่มการ์ด Anti Meat Proxy: ไม่ก๊อป AI ไปแปะ ต้องตั้งคำถาม ตัดสิน และรับผิดชอบเอง",
    },
    {
      kind: "points",
      tag: "Before you paste",
      title: "ก่อนใช้คำตอบจาก AI\nถาม 4 ข้อนี้",
      numbered: true,
      points: [
        { title: "อธิบายได้ไหมว่ามันทำอะไร", body: "ถ้าเล่าให้เพื่อนฟังไม่ได้ ยังไม่ใช่ของเรา" },
        { title: "มันตอบโจทย์คนที่เราคุยด้วยไหม", body: "หรือแค่ตอบสิ่งที่ AI เดาว่าเราอยากได้" },
        { title: "ถ้าพัง เรารู้ไหมว่าพังตรงไหน", body: "ลองทำให้มันพังเองดูก่อน" },
        { title: "วันนี้เราตัดสินใจอะไรเอง", body: "จดไว้วันละ 1 เรื่อง เอาไปเล่าในพอร์ตได้" },
      ],
    },
    {
      kind: "points",
      tag: "AI as coach",
      title: "ให้ AI ถาม\nไม่ใช่ให้ AI ทำแทน",
      points: [
        { title: "ให้ AI ถามเราก่อนว่าผู้ใช้คือใคร" },
        { title: "ขอคำอธิบายทีละขั้น แล้วลงมือเอง" },
        { title: "ให้ AI ช่วยหาจุดอ่อนของไอเดียเรา" },
      ],
      footnote: "แนวเดียวกับ SeedStack โค้ช AI ที่นักเรียน SHIFT ใช้ มันถามคำถาม แล้วให้เราเป็นคนลงมือ",
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nเปิดดูก่อนกด Enter",
      icon: "judge",
      action: "save",
      body: "ส่งต่อให้เพื่อนที่ใช้ AI ทำงานทุกวัน",
    },
  ],
};

export const PROBLEM_AT_HOME: StudioSet = {
  ...BASE,
  slug: "guide-problem-at-home",
  title: "Guide: find a project idea at home (KK and his grandpa)",
  angle: "KK built a QR helper after watching his grandpa struggle; 5 questions to find a real problem around you.",
  sources: ["lib/content/shift-voices.ts kkGrandpa (consent 2026-10-07, nickname + SHIFT only)"],
  caption: [
    "หาไอเดียโปรเจกต์ไม่เจอ ลองดูคนที่บ้าน",
    "",
    "เคเค นักเรียน SHIFT เห็นคุณตาสแกน QR Code ไม่เป็น เลยทำแอปที่สแกนแล้วเด้งเข้าแอปธนาคารได้เลย",
    "",
    "ปัญหาเล็กของคนที่เรารู้จักเป็นโจทย์ที่ดี เพราะเราเห็นมันกับตา และมีคนลองใช้คนแรกรออยู่แล้ว",
    "",
    "5 คำถามหาโจทย์รอบตัว อยู่ในสไลด์ 3 เซฟไว้ แล้วลองตอบดู",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "Find a problem",
      icon: "bulb",
      title: ["หาไอเดียโปรเจกต์", "ไม่เจอ?", "ลองดู**คนที่บ้าน**"],
      note: "ไอเดียดีๆ มักนั่งอยู่ในห้องนั่งเล่น",
    },
    {
      kind: "quote",
      tag: "Real story · SHIFT",
      voice: "kkGrandpa",
      context: "ปัญหาเล็กของคนที่เรารู้จัก เป็นโจทย์ที่ดี เพราะเราเห็นมันกับตา และมีคนลองใช้คนแรกรออยู่แล้ว",
    },
    {
      kind: "points",
      tag: "Try this",
      title: "5 คำถาม หาโจทย์รอบตัว",
      numbered: true,
      points: [
        { title: "ใครที่บ้านขอให้เราช่วยเรื่องเดิมซ้ำๆ" },
        { title: "อะไรที่คนรอบตัวบ่นทุกสัปดาห์" },
        { title: "ตรงไหนที่ใครสักคนต้องรอ หรือต้องถามคนอื่น" },
        { title: "อะไรที่เราทำเองแล้วเสียเวลาที่สุด" },
        { title: "ถ้ามีคนทำสิ่งนี้ให้ ใครจะดีใจที่สุด" },
      ],
    },
    {
      kind: "points",
      tag: "Check",
      title: "โจทย์ดี ต้องผ่าน 3 ข้อ",
      points: [
        { title: "มีคนเจอจริง ไม่ใช่เราคิดเอง", body: "ถามเขาได้ภายในสัปดาห์นี้" },
        { title: "เล็กพอทำต้นแบบได้ใน 7 วัน", body: "ตัดให้เหลือ 1 คน 1 ปัญหา 1 การกระทำ" },
        { title: "เราอยากรู้คำตอบจริงๆ", body: "เพราะจะต้องอยู่กับมันทั้งสัปดาห์" },
      ],
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nแล้วลองตอบดูคืนนี้",
      icon: "search",
      action: "save",
      body: "ได้โจทย์แล้ว อยากลองสร้างจริงใน 7 วัน ดู SHIFT ที่ลิงก์ในไบโอ",
    },
  ],
};

export const INTROVERT_INTERVIEWS: StudioSet = {
  ...BASE,
  slug: "guide-introvert-interviews",
  title: "Guide: user interviews for introverts",
  angle: "Potter (introvert) interviewed strangers because his portfolio needed it; low-energy interview tactics.",
  sources: [
    "lib/content/shift-voices.ts potterIntrovert (consent 2026-10-07)",
    "SHIFT_CHANGES row for พ็อตเตอร์ (solo or team 1-3, nightly room review)",
  ],
  caption: [
    "เป็น introvert ก็สัมภาษณ์คนได้",
    "",
    "พ็อตเตอร์ ม.6 จาก SHIFT[0] บอกเราว่าไปค่ายไหนก็ไม่ค่อย make friend แต่เพราะอยากได้ผลงานเข้าพอร์ต เลยกัดฟันไปสัมภาษณ์คนอื่น",
    "",
    "ไม่ต้องเก่งเข้าสังคม แค่มีคำถามที่เตรียมไว้ และเหตุผลที่อยากรู้จริงๆ",
    "4 วิธีสัมภาษณ์แบบไม่เหนื่อย อยู่ในสไลด์ 3",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "Introvert-friendly",
      icon: "chat",
      title: ["Introvert", "ก็สัมภาษณ์คน", "ได้นะ"],
      sub: "ไม่ต้องเก่งเข้าสังคม แค่มีคำถามที่เตรียมไว้ และเหตุผลที่อยากรู้จริงๆ",
    },
    { kind: "quote", tag: "Real story · SHIFT[0]", voice: "potterIntrovert" },
    {
      kind: "points",
      tag: "Low-energy mode",
      title: "สัมภาษณ์แบบไม่เหนื่อย",
      numbered: true,
      points: [
        { title: "เริ่มจากแชทก่อน", body: "คุยเป็นข้อความ แล้วค่อยขอโทร 10 นาที" },
        { title: "เตรียม 3 คำถามไว้บนจอ", body: "อ่านตามได้ ไม่มีใครว่า" },
        { title: "ไปเป็นคู่", body: "คนหนึ่งถาม อีกคนจด" },
        { title: "บอกเวลาตั้งแต่แรก", body: "ขอแค่ 10 นาที แล้วจบตรงเวลา" },
      ],
    },
    {
      kind: "statement",
      big: ["ความกล้า", "มาหลัง**คนแรก**"],
      body: "คนแรกยากที่สุด พอผ่านไปได้ คนที่สองจะง่ายขึ้นเยอะ",
    },
    {
      kind: "points",
      tag: "In SHIFT",
      title: "ไม่ต้องเก่งเข้าสังคมก่อน",
      points: [
        { title: "ทำเดี่ยวหรือทีม 1-3 คนก็ได้" },
        { title: "ทุกเย็นทั้งห้องช่วยกันดูงาน" },
        { title: "การ์ด Tester Hunt สอนทักทีละคน", body: "ไม่ต้องโพสต์ประกาศให้ทุกคนเห็น" },
      ],
    },
    {
      kind: "cta",
      tag: "SHIFT",
      title: "อยากลองสร้าง\nของจริง\nกับเพื่อนร่วมรุ่น",
      icon: "people",
      action: "comment",
      body: "แล้วรับลิงก์สมัครทาง DM",
    },
  ],
};

export const SCOPE_CUT: StudioSet = {
  ...BASE,
  slug: "guide-scope-cut",
  title: "Guide: cut your idea to 1 person, 1 problem, 1 action",
  angle: "Day 1 Scope Lock: big ideas don't ship; the 1-1-1 cut and a one-page scope with a hypothesis.",
  sources: [
    "lib/content/shift-cohort.ts schedule Day 1 (ตัดฟีเจอร์ออก 80%, ล็อกสโคป 1 หน้า, สมมติฐาน)",
    "lib/content/shift-voices.ts kkGrandpa (example basis)",
  ],
  caption: [
    "ไอเดียใหญ่ทำไม่เสร็จ ไอเดียเล็กได้ใช้จริง",
    "",
    "วันแรกของ SHIFT คือการตัดฟีเจอร์ออกให้เหลือสิ่งเดียวที่ต้องเวิร์ก: 1 คน 1 ปัญหา 1 การกระทำ",
    "",
    "แล้วเขียนสมมติฐานลงกระดาษแผ่นเดียว ว่าถ้าทำได้ จะเกิดอะไรขึ้นกับใคร",
    "เซฟไว้ใช้ตอนเริ่มโปรเจกต์ถัดไป",
  ].join("\n"),
  hashtags: SHIFT_TAGS,
  slides: [
    {
      kind: "cover",
      kicker: "Scope Lock",
      icon: "target",
      title: ["ไอเดียใหญ่", "ทำไม่เสร็จ", "ไอเดียเล็ก**ได้ใช้จริง**"],
      sub: "วันแรกของ SHIFT คือการตัดฟีเจอร์ออก 80% ให้เหลือสิ่งเดียวที่ต้องเวิร์ก",
    },
    {
      kind: "points",
      tag: "The cut",
      title: "ตัดให้เหลือ 1-1-1",
      numbered: true,
      points: [
        { title: "1 คน", body: "ผู้ใช้คนเดียวที่ชัดที่สุด ไม่ใช่ทุกคน" },
        { title: "1 ปัญหา", body: "เรื่องที่เขาเจอบ่อยที่สุด" },
        { title: "1 การกระทำ", body: "สิ่งเดียวที่เขาต้องทำได้ในต้นแบบ" },
      ],
    },
    {
      kind: "compare",
      tag: "Example",
      title: "ตัดแล้วหน้าตาเป็นยังไง",
      left: { label: "ก่อนตัด", items: ["แอปช่วยผู้สูงอายุทำทุกอย่างบนมือถือ", "สแกน QR จ่ายบิล นัดหมอ วิดีโอคอล"] },
      right: { label: "หลังตัด", items: ["คุณตาสแกน QR จ่ายเงินได้เอง", "สแกนแล้วเด้งเข้าแอปธนาคารเลย"] },
      footnote: "หลังตัด คือโปรเจกต์ที่เคเค นักเรียน SHIFT ทำให้คุณตาของเขา",
    },
    {
      kind: "points",
      tag: "Write it down",
      title: "ล็อกสโคปใน 1 หน้า",
      numbered: true,
      points: [
        { title: "สมมติฐาน", body: "ถ้า___ทำได้ ___จะ___" },
        { title: "สิ่งที่จะไม่ทำรอบนี้", body: "เขียนออกมาเลย จะได้ไม่แอบกลับไปทำ" },
        { title: "วิธีรู้ว่าเวิร์ก", body: "ตัวเลข 1 ตัวที่วัดซ้ำได้" },
      ],
    },
    {
      kind: "cta",
      tag: "Save",
      title: "เซฟไว้\nใช้วันแรก\nของโปรเจกต์หน้า",
      icon: "blocks",
      action: "save",
      body: "ส่งต่อให้เพื่อนที่ไอเดียเยอะแต่ยังไม่ได้เริ่ม",
    },
  ],
};

export const PARENT_QUESTIONS: StudioSet = {
  slug: "parent-camp-questions",
  title: "Parents: 5 questions to ask before paying for any camp",
  channel: "instagram",
  format: "ig-portrait",
  theme: "paper",
  audience: "parent",
  created: "2026-10-11",
  angle: "Useful to any parent comparing camps; SHIFT answers each question with checkable facts, no hype.",
  sources: [
    "lib/content/shift-cohort.ts (SHIFT_SDT autonomy, refund line in posters, SHIFT_COHORT_0 showcase on /shift)",
  ],
  caption: [
    "ก่อนจ่ายค่าค่าย ลองถาม 5 ข้อนี้",
    "",
    "ใช้ได้กับทุกค่าย รวมถึงของเราด้วย: จบแล้วได้อะไรที่เปิดดูได้ ใครเป็นคนเลือกโจทย์ ได้เจอคนจริงนอกค่ายไหม ถ้าไม่ได้ตามที่บอกมีเงื่อนไขอะไร และงานรุ่นก่อนดูได้ที่ไหน",
    "",
    "คำตอบของ SHIFT อยู่ในสไลด์ 3",
    "ผู้ปกครองสอบถามได้ที่ LINE @passionseed",
  ].join("\n"),
  hashtags: ["PassionSeed", "TCAS", "ผู้ปกครอง"],
  slides: [
    {
      kind: "cover",
      kicker: "For parents",
      icon: "search",
      title: ["ก่อนจ่ายค่าค่าย", "ถาม 5 ข้อนี้"],
      sub: "ใช้ได้กับทุกค่าย รวมถึงของเราด้วย",
      note: "เซฟไว้ใช้เทียบหลายค่าย",
    },
    {
      kind: "points",
      tag: "Ask",
      title: "ถามผู้จัดค่าย",
      numbered: true,
      points: [
        { title: "จบค่าย ได้อะไรที่เปิดดูได้", body: "ลิงก์ ผลงาน หรือแค่ใบเซอร์" },
        { title: "ใครเป็นคนเลือกโจทย์", body: "นักเรียนเลือกเอง หรือทำตามใบงาน" },
        { title: "ได้เจอคนจริงนอกค่ายไหม", body: "หรือนำเสนอให้คนในค่ายดูอย่างเดียว" },
        { title: "ถ้าไม่ได้ตามที่บอก เป็นยังไง", body: "ถามเงื่อนไขให้ชัดก่อนจ่าย" },
        { title: "งานรุ่นก่อนดูได้ที่ไหน", body: "ขอดูของจริง ไม่ใช่แค่รีวิว" },
      ],
    },
    {
      kind: "points",
      tag: "How SHIFT answers",
      title: "คำตอบของ SHIFT",
      numbered: true,
      points: [
        { title: "ลิงก์ต้นแบบ + พอร์ต 1 หน้า" },
        { title: "นักเรียนเลือกปัญหาเอง", body: "mentor ช่วยถาม ไม่คิดแทน" },
        { title: "ไปคุยและให้คนนอกลองใช้", body: "ทุกคนลิสต์คนที่จะทักตั้งแต่วันแรก" },
        { title: "==ไม่ได้ชิ้นงาน คืนเงินเต็ม==", body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ" },
        { title: "งานรุ่นทดลองเปิดดูได้", body: "ที่ passionseed.org/shift" },
      ],
    },
    {
      kind: "cta",
      tag: "Ask us",
      title: "มีคำถามเพิ่ม\nถามเราได้ตรงๆ",
      icon: "chat",
      action: "link",
      link: "LINE @passionseed",
      body: "หรือดูรายละเอียดที่ passionseed.org/shift",
    },
  ],
};

export const GUIDE_SETS: StudioSet[] = [
  TESTER_HUNT,
  QUESTIONS_THAT_LIE,
  CERT_VS_PROOF,
  PORT_ONE_PAGE,
  AI_NOT_PROXY,
  PROBLEM_AT_HOME,
  INTROVERT_INTERVIEWS,
  SCOPE_CUT,
  PARENT_QUESTIONS,
];
