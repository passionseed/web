/**
 * Level 1 · mythos. Design: docs/radar-guide/cybersecurity-guide.md, Page 1.
 * Cold open: a bug older than the player, find the dangerous line, guess the
 * Firefox bar. Cutscene after the find-the-line beat.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { CLIP, beat, dialogue, host, item, sys } from "./_story";

const GLASS = "f.glasswing-launch" as const;
const FIREFOX = "f.firefox-mozilla" as const;

export const mythos: GuidePage = {
  key: "mythos",
  order: 1,
  titleTh: "AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ",
  questionTh: "AI เก่งเรื่องหาช่องโหว่แค่ไหนแล้วจริงๆ",
  navLabelTh: "บั๊กอายุมากกว่าเธอ",
  asOf: "2026-11-11",
  minutes: 2,
  legacyHashes: ["hook"],
  factIds: [GLASS, FIREFOX, "f.mythos52", "f.aisle-caveat", "sim.mythos-snippet"],
  og: {
    headlineTh: "AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ",
    stat: { th: "บั๊กที่ซ่อนอยู่ราว 27 ปี", factIds: [GLASS] },
  },
  blocks: [
    dialogue(
      "intro",
      host("เริ่มรันสายไซเบอร์กัน ด่านแรกเปิดด้วยบั๊กตัวเดียว", { mood: "wow" }),
      host("บั๊กตัวนี้อยู่ในโค้ดมานานกว่าอายุเธออีก"),
      host("ไม่เชื่อใช่ไหม ลองเทียบกับปีเกิดตัวเองดู", { mood: "wink" })
    ),
    {
      kind: "bespoke",
      id: "birthyear",
      component: "BirthYearTimeline",
      factIds: [GLASS],
      props: {
        promptTh: "เธอเกิดปีไหน",
        years: [2550, 2551, 2552, 2553, 2554, 2555, 2556],
        skipTh: "ไม่บอก",
        bugYear: 2542,
        nowYear: 2569,
        bugLabelTh: "บั๊กเกิดราวปีนี้",
        youLabelTh: "เธอเกิด",
        nowLabelTh: "วันนี้",
        resultTh: "บั๊กนี้อยู่ในโค้ดมาก่อนเธอเกิดราว {n} ปี",
        resultNoYearTh: "บั๊กนี้อยู่ในโค้ดมาราว 27 ปี",
        privacyTh: "เราไม่เก็บปีเกิด และไม่ส่งไปไหน",
      },
      fallbackTh: ["บั๊กใน OpenBSD ตัวนี้อยู่ในโค้ดมาราว 27 ปี นานกว่าอายุคนอ่านหน้านี้ส่วนใหญ่"],
      track: { done: "mythos:birthyear", value: "none" },
      demoScript: [
        { at: 600, action: "tap", target: "birthyear.year-2552" },
        { at: 2600, action: "wait" },
      ],
    },
    beat(
      "beat-find",
      "ลองหาบั๊กเอง",
      dialogue(
        "find-intro",
        host("นี่คือโค้ดจำลองแนวเดียวกัน เขียนโค้ดไม่เป็นก็เล่นได้"),
        host("ข้อมูลวิ่งมาจากเครือข่าย แตะบรรทัดที่อันตรายที่สุด", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "findline",
        game: {
          engine: "FindLine",
          data: {
            captionTh: "โค้ดจำลองแนวคิด ไม่ใช่โค้ดจริงของ OpenBSD",
            simulatedFactId: "sim.mythos-snippet",
            lines: [
              { n: 1, code: "// รับข้อมูลที่ส่งมาจากเครือข่าย" },
              { n: 2, code: "void handle_packet(uint8_t *buf, int n) {" },
              { n: 3, code: "  uint8_t name[64];            // ที่ว่าง 64 ไบต์" },
              { n: 4, code: "  if (n < 1) return;           // ข้อมูลว่าง ข้าม" },
              { n: 5, code: "  int len = buf[0];            // ความยาว: คนส่งเป็นคนบอก" },
              { n: 6, code: '  log("got packet", n);' },
              { n: 7, code: "  copy(name, buf + 1, len);    // คัดลอกตามความยาวที่เขาบอก" },
              { n: 8, code: "  if (len > 64) {              // เช็กขนาด" },
              { n: 9, code: "    return;" },
              { n: 10, code: "  }" },
              { n: 11, code: "  greet(name);" },
              { n: 12, code: "}" },
            ],
            answer: 7,
            nearMissTh: {
              8: "ใกล้แล้ว เช็กขนาดตรงนี้ถูก แต่ดูว่ามันเช็กก่อนหรือหลังคัดลอก",
              5: "ใช่ ค่านี้มาจากคนนอก แล้วโค้ดเอาไปใช้ต่อที่บรรทัดไหน",
            },
            hintsTh: ["ค่าไหนมาจากคนนอก", "name จุได้เท่าไหร่ แล้วเช็กขนาดก่อนหรือหลังคัดลอก"],
            outlineOnHint2: [5, 7, 8],
            onFound: {
              counter: {
                to: 5000000,
                captionTh:
                  "จำนวนครั้งที่เทสต์อัตโนมัติวิ่งผ่านบรรทัดที่มีบั๊กใน FFmpeg โดยไม่เคยจับได้ (บั๊กอายุ 16 ปี)",
                factId: GLASS,
              },
              explanationTh:
                "บรรทัด 7 คัดลอกข้อมูลตามความยาวที่คนส่งเป็นคนบอก ซึ่งใหญ่ได้ถึง 255 ไบต์ แต่ name มีที่แค่ 64 ไบต์ แล้วโค้ดค่อยมาเช็กทีหลัง ข้อมูลเลยล้นไปทับหน่วยความจำส่วนอื่น บั๊กตระกูลนี้แหละที่ AI ไล่หาในโค้ดจริง",
            },
          },
        },
        track: { done: "mythos:found", value: "attempts" },
        answersTh: [
          "บรรทัดอันตรายคือบรรทัด 7: คัดลอกข้อมูลตามความยาวที่คนส่งบอก (ได้ถึง 255 ไบต์) ลงในที่ว่างแค่ 64 ไบต์",
          "การเช็กขนาดอยู่บรรทัด 8 ซึ่งมาหลังการคัดลอก ข้อมูลเลยล้นไปทับหน่วยความจำส่วนอื่นก่อน",
        ],
        demoScript: [
          { at: 800, action: "tap", target: "findline.line-3" },
          { at: 2200, action: "tap", target: "findline.line-8" },
          { at: 3800, action: "tap", target: "findline.line-7" },
          { at: 6500, action: "wait" },
        ],
      },
      item("intel-mythos", "intel", "เม.ย. 2569 Anthropic เปิดตัว AI ชื่อ Claude Mythos Preview แต่ไม่เปิดให้คนทั่วไปใช้ เพราะมันหาช่องโหว่เก่งเกินไป", {
        title: "แฟ้มลับ: Mythos Preview",
        facts: [GLASS],
        badge: "vendor",
      }),
      item("stat-openbsd", "stat", "บั๊กใน OpenBSD ซ่อนอยู่ราว 27 ปี แค่เชื่อมต่อเข้าเครื่องได้ ก็สั่งเครื่องล่มได้เลย", {
        title: "บั๊กตัวแรก",
        facts: [GLASS],
        badge: "vendor",
      }),
      item("stat-ffmpeg", "stat", "บั๊กใน FFmpeg อายุ 16 ปี อยู่ในบรรทัดที่เทสต์อัตโนมัติวิ่งผ่านมาแล้ว 5,000,000 ครั้ง", {
        title: "บั๊กตัวที่สอง",
        facts: [GLASS],
        badge: "vendor",
      }),
      CLIP
    ),
    beat(
      "beat-firefox",
      "แล้วโลกจริงเปลี่ยนแค่ไหน",
      dialogue(
        "firefox-intro",
        host("ปกติ Firefox แก้ช่องโหว่เดือนละ 20 ถึง 30 ตัว", { facts: [FIREFOX] }),
        host("ลองทายว่าเดือนเมษายน 2569 แก้ไปกี่ตัว", { facts: [FIREFOX], mood: "wink" })
      ),
      {
        kind: "game",
        id: "firefox",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "เม.ย. 2569 Firefox แก้ช่องโหว่ไปกี่ตัว",
            min: 0,
            max: 500,
            step: 10,
            unit: "count",
            answer: 423,
            answerFactId: FIREFOX,
            buckets: [50, 150, 300, 501],
            chart: {
              kind: "bars",
              band: { from: 20, to: 30, labelTh: "2568: ปกติเดือนละ 20 ถึง 30" },
              bars: [
                { labelTh: "มี.ค. 2569 (สถิติเดิม)", value: 76 },
                { labelTh: "เม.ย. 2569", value: 423, segment: { value: 271, labelTh: "เจอด้วย Mythos Preview" } },
              ],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไป {d} ตัว",
            underTh: "เธอเดาต่ำไป {d} ตัว",
            nearWithin: 20,
            revealTh: "เธอเดา {g} ของจริงคือ 423",
          },
        },
        track: { done: "mythos:firefox-guess", value: "bucket" },
        answersTh: [
          "เม.ย. 2569 Firefox แก้ช่องโหว่ 423 ตัว สถิติเดิมคือ 76 ตัวเมื่อ มี.ค. 2569",
          "Mozilla บอกว่าในนั้น 271 ตัวเจอด้วย Mythos Preview",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "firefox.plus" },
          { at: 900, action: "tap", target: "firefox.plus" },
          { at: 1200, action: "tap", target: "firefox.plus" },
          { at: 2000, action: "tap", target: "firefox.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-firefox", "stat", "Firefox แก้ไป 423 ตัว Mozilla บอกว่า 271 ตัวเจอด้วย Mythos Preview และในกลุ่มนี้ 180 ตัวร้ายแรงสูง", {
        title: "ผลจริงจาก Mozilla",
        facts: [FIREFOX],
        badge: "confirmed",
      }),
      item("notif-mythos52", "notification", "9 พ.ย. 2569 รุ่นใหม่ Mythos 5.2 ออกแล้ว และยังไม่เปิดให้ทุกคนใช้", {
        title: "อัปเดตล่าสุด",
        facts: ["f.mythos52"],
      }),
      item(
        "intel-caveat",
        "intel",
        "ตัวเลขส่วนใหญ่มาจาก Anthropic เอง มีทีมวิจัยอื่นแย้งว่าโมเดลเล็กกว่าก็เจอบางบั๊กได้ ถ้ามีคนตัดเฉพาะโค้ดส่วนที่มีปัญหามาให้ดู",
        { title: "อีกฝั่งของเรื่อง", facts: ["f.aisle-caveat", GLASS] }
      ),
      dialogue(
        "exit",
        host("ถ้า AI หาช่องโหว่เก่งขนาดนี้", { mood: "serious" }),
        sys("คำถามต่อไป: ใครได้ใช้มัน")
      )
    ),
  ],
  clip: {
    seconds: 20,
    hookTh: "AI เจอบั๊กที่แก่กว่าเธอ",
    scriptLinesTh: [
      "เมษาที่ผ่านมา Anthropic สร้าง AI ชื่อ Mythos",
      "แล้วไม่ยอมปล่อยให้คนทั่วไปใช้ เพราะมันหาช่องโหว่เก่งเกินไป",
      "บริษัทบอกว่ามันเจอบั๊กที่ซ่อนอยู่ในระบบมาราว 27 ปี",
      "แก่กว่าเธออีก",
      "แต่นี่ไม่ได้แปลว่าคนหมดความหมายนะ",
      "ไกด์นี้จะพาไปดูว่าตรงไหนที่ยังต้องใช้คน",
      "และเธอเริ่มลงมือได้ตั้งแต่คืนนี้",
    ],
    required: false,
    safety: false,
    factIds: [GLASS],
  },
  reel: {
    format: "founder",
    hook: { th: "AI เพิ่งเจอบั๊กที่ซ่อนอยู่ 27 ปี แก่กว่าเธออีก" },
    variantsTh: ["บรรทัดนี้ถูกเทสต์ 5 ล้านครั้ง ไม่มีใครเห็นบั๊ก", "AI ที่บริษัทไม่กล้าปล่อยให้คนทั่วไปใช้"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบแกะว่าระบบพังตรงไหน",
    visual: [
      "ตัวเลขปีหมุนย้อนจาก 2569 ไป 2542 แล้วไอคอนบั๊กตกลงมา",
      "บรรทัด 7 เรืองแดง",
      "ตัวนับวิ่งถึง 5,000,000",
      "แท่ง Firefox พุ่งจากแถบ 20 ถึง 30 ผ่าน 76 ไปถึง 423",
    ],
  },
};
