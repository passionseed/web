/**
 * Level 9 · terminal. Design: docs/radar-guide/cybersecurity-guide.md, Page 9.
 * Scope-first fake terminal: a pure client-side whitelist of commands with
 * canned output. No eval, no network, no real filesystem. Nothing typed is
 * stored or sent. All IPs come from RFC 5737. No cutscene (demo-mode reel).
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "./_story";

const SIM = "sim.terminal" as const;
const ATTACKER = "203.0.113.45";

/** Deterministic 60-line auth.log: 41 failures, then the 42nd attempt gets in. */
function authLog(): string[] {
  const lines: string[] = [];
  const routine = (i: number) => {
    const host = i % 2 === 0 ? "192.0.2.10" : "192.0.2.11";
    const kind = i % 3 === 0 ? "session closed" : "session opened";
    return `Nov 10 01:${String(10 + i).padStart(2, "0")}:07 lab sshd[${2100 + i}]: pam_unix(sshd:${kind}) for user staff from ${host}`;
  };
  for (let i = 0; i < 5; i++) lines.push(routine(i));
  for (let i = 0; i < 41; i++) {
    const sec = String(i % 60).padStart(2, "0");
    lines.push(`Nov 10 02:${String(14 + Math.floor(i / 20)).padStart(2, "0")}:${sec} lab sshd[${3300 + i}]: Failed password for intern01 from ${ATTACKER} port ${50100 + i * 7} ssh2`);
  }
  lines.push(`Nov 10 02:16:44 lab sshd[3399]: Accepted password for intern01 from ${ATTACKER} port 51122 ssh2`);
  const admin = (t: string, pid: number) => `Nov 10 ${t} lab sshd[${pid}]: Accepted publickey for admin from 192.0.2.10 port 40022 ssh2`;
  for (let i = 5; i < 15; i++) {
    lines.push(routine(i));
    if (i === 6) lines.push(admin("08:02:11", 4101));
    if (i === 10) lines.push(admin("12:30:40", 4180));
    if (i === 13) lines.push(admin("17:45:03", 4233));
  }
  return lines;
}

const AUTH_LOG = authLog();
const OUT_OF_SCOPE = ["หยุด: นอกขอบเขต", "ไม่มีใครอนุญาต แปลว่าผิดกฎหมาย ต่อให้เจตนาดี"];

export const terminal: GuidePage = {
  key: "terminal",
  order: 9,
  titleTh: "ลองเป็นนักป้องกันในเครื่องจำลอง",
  questionTh: "งานนี้รู้สึกยังไงตอนลงมือจริง",
  navLabelTh: "ลองเป็นนักป้องกัน",
  asOf: "2026-11-11",
  minutes: 3,
  showsHacking: true,
  factIds: [SIM, "f.gpt6-cyber", "f.jadepuffer"],
  og: { headlineTh: "ลองเป็นนักป้องกัน ในเครื่องจำลอง" },
  blocks: [
    dialogue(
      "intro",
      host("ในหนัง แฮกเกอร์พิมพ์รัวๆ จอเขียว"),
      host("ในชีวิตจริง งานแรกๆ คืออ่าน log แล้วหาบรรทัดที่ผิดปกติให้เจอ"),
      host("และสิ่งแรกที่มืออาชีพทำ คืออ่านขอบเขตงานก่อน", { mood: "serious" })
    ),
    {
      kind: "safety",
      id: "safety",
      lineTh: "ฝึกเฉพาะในแล็บหรือระบบที่ได้รับอนุญาตเท่านั้น ระบบของคนอื่น ห้ามลอง ผิดกฎหมาย",
    },
    {
      kind: "game",
      id: "lab",
      game: {
        engine: "FakeTerminal",
        data: {
          labelTh: "เครื่องจำลองในหน้านี้ ไม่ได้ต่อกับเครื่องหรือเว็บจริงเครื่องไหนเลย",
          simulatedFactId: SIM,
          files: {
            "README.txt": ["เธอคือนักศึกษาฝึกงานทีมป้องกันของแล็บ เมื่อคืนมีสัญญาณแปลกๆ ที่เครื่อง lab.local"],
            "scope.txt": [
              "ได้รับอนุญาต: lab.local (เครื่องในแล็บนี้)",
              "ห้ามแตะ: ระบบอื่นทั้งหมด รวมถึงเว็บโรงเรียน เว็บเพื่อน เว็บธนาคาร",
            ],
            "auth.log": AUTH_LOG,
            ".flag": ["FLAG{read_the_scope_first}"],
          },
          commands: [
            {
              match: ["help"],
              output: [
                "คำสั่งในแล็บนี้:",
                "ls, ls -a          ดูไฟล์ (รวมไฟล์ซ่อน)",
                "cat <ไฟล์>          เปิดอ่านไฟล์",
                "head auth.log      ดู 10 บรรทัดแรก",
                "grep -c \"Failed\" auth.log   นับบรรทัด",
                "grep \"Accepted\" auth.log    หาบรรทัด",
                "whoami, clear, scan <เครื่อง>",
              ],
            },
            { match: ["ls"], output: ["README.txt  scope.txt  auth.log"] },
            {
              match: ["ls -a"],
              output: [".  ..  .flag  README.txt  scope.txt  auth.log"],
              noteTh: "ไฟล์ที่ขึ้นต้นด้วยจุดถูกซ่อนไว้",
            },
            { match: ["cat README.txt"], output: { file: "README.txt" } },
            { match: ["cat scope.txt"], output: { file: "scope.txt" }, effect: "scopeRead" },
            { match: ["head auth.log"], output: { file: "auth.log", head: 10 } },
            {
              match: ['grep -c "Failed" auth.log', "grep -c Failed auth.log", "grep -c 'Failed' auth.log"],
              output: { file: "auth.log", grep: "Failed", count: true },
            },
            {
              match: ['grep "Accepted" auth.log', "grep Accepted auth.log", "grep 'Accepted' auth.log"],
              output: { file: "auth.log", grep: "Accepted" },
            },
            { match: ["cat .flag"], output: { file: ".flag" }, effect: "flag" },
            { match: ["whoami"], output: ["student (ได้รับอนุญาตในแล็บนี้เท่านั้น)"] },
            {
              match: ["scan lab.local"],
              output: ["พบพอร์ต 80 เปิดอยู่ (จำลอง)"],
              requiresScope: true,
              noteTh: "ต่อจากนี้ไปฝึกในห้องจริงได้ ด่านถัดไป",
            },
            {
              match: ["scan school-web"],
              output: OUT_OF_SCOPE,
              effect: "outOfScope",
              requiresScope: true,
              noteTh: "สแกนเว็บโรงเรียน ที่ดูหละหลวมมาก",
            },
            { match: ["scan bank.example"], output: OUT_OF_SCOPE, effect: "outOfScope", requiresScope: true },
            { match: ["clear"], output: [], effect: "clear" },
          ],
          unknownTh: "ไม่มีคำสั่งนี้ในแล็บ ลอง help",
          missions: [
            { id: 1, titleTh: "อ่านขอบเขตก่อน", doneWhen: "ran:cat scope.txt" },
            {
              id: 2,
              titleTh: "นับว่ามีคนเดารหัสผิดกี่ครั้ง",
              doneWhen: "ran:grep -c Failed auth.log",
              question: { promptTh: "กี่ครั้ง", options: ["4", "41", "410"], answer: "41" },
            },
            {
              id: 3,
              titleTh: "หาว่าเดาสำเร็จไหม",
              doneWhen: "ran:grep Accepted auth.log && tap:Accepted password for intern01",
              feedbackTh: "บรรทัดนี้แหละ เดาผิด 41 ครั้ง แล้วครั้งที่ 42 เข้าได้",
            },
            { id: 4, titleTh: "หาไฟล์ที่ซ่อน", doneWhen: "flag" },
            { id: 5, titleTh: "ตัดสินใจ", doneWhen: "decision" },
          ],
          decision: {
            options: [
              {
                id: "block-ip",
                labelTh: "บล็อก IP อย่างเดียว",
                correct: false,
                feedbackTh: "ยังไม่พอ คนร้ายเข้ามาแล้ว เปลี่ยน IP ก็ใช้รหัสเดิมเข้าได้อีก",
              },
              {
                id: "lock-reset",
                labelTh: "ล็อกบัญชี intern01 + รีเซ็ตรหัส + เปิดเคส + บล็อก IP",
                correct: true,
                feedbackTh: "ใช่ ปิดทางเข้า เปลี่ยนกุญแจ และจดบันทึกให้ทีมตามต่อ",
              },
              {
                id: "nothing",
                labelTh: "ไม่ต้องทำอะไร",
                correct: false,
                feedbackTh: "บัญชีนี้โดนยึดแล้ว ถ้าไม่ทำอะไร คนร้ายจะขยับไปเครื่องอื่น",
              },
            ],
          },
          poll: {
            prompt: {
              th: "AI สายเจาะระบบตัวหนึ่ง ในการทดสอบของบริษัทเอง ออกนอกขอบเขต 0.07% เท่ากับราว 7 ครั้งในการรัน 10,000 ครั้ง ถ้าเป็นเครือข่ายโรงพยาบาล รับได้ไหม",
              factIds: ["f.gpt6-cyber"],
              badge: "vendor",
              labels: ["ourMath"],
            },
            options: [
              { id: "ok", labelTh: "รับได้" },
              { id: "no", labelTh: "ไม่ได้" },
              { id: "depends", labelTh: "แล้วแต่ว่าออกไปทำอะไร" },
            ],
            reveal: {
              th: "OpenAI เองพักแผนโมเดลรุ่นถัดไปตัวหนึ่งไว้ เพราะมันเก่งขึ้น แต่อยู่ในขอบเขตได้แย่ลง ในงานนี้ เก่งอย่างเดียวไม่พอ ต้องคุมให้อยู่ในขอบเขตได้ด้วย",
              factIds: ["f.gpt6-cyber"],
              badge: "vendor",
            },
          },
        },
      },
      track: {
        done: "terminal:done",
        value: "count",
        milestones: {
          mission: "terminal:mission",
          flag: "terminal:flag",
          scopeTry: "terminal:scope-try",
          poll: "terminal:poll",
        },
      },
      answersTh: [
        "ภารกิจ 1: cat scope.txt อ่านขอบเขตก่อน ได้รับอนุญาตแค่ lab.local",
        "ภารกิจ 2: grep -c \"Failed\" auth.log ได้ 41 ครั้ง",
        `ภารกิจ 3: grep "Accepted" auth.log บรรทัดที่น่าสงสัยคือ intern01 จาก ${ATTACKER} เดาผิด 41 ครั้ง แล้วครั้งที่ 42 เข้าได้`,
        "ภารกิจ 4: ls -a แล้ว cat .flag ได้ FLAG{read_the_scope_first}",
        "ภารกิจ 5: ล็อกบัญชี intern01 รีเซ็ตรหัส เปิดเคส และบล็อก IP",
        "สแกนเว็บโรงเรียนหรือเว็บธนาคาร: หยุด นอกขอบเขต ผิดกฎหมาย ต่อให้เจตนาดี",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "lab.cmd-cat_scope.txt" },
        { at: 2400, action: "tap", target: "lab.cmd-scan_school-web" },
        { at: 4600, action: "tap", target: "lab.cmd-grep_-c_Failed_auth.log" },
        { at: 6200, action: "tap", target: "lab.answer-41" },
        { at: 7800, action: "tap", target: "lab.cmd-grep_Accepted_auth.log" },
        { at: 9400, action: "tap", target: "lab.hit-0" },
        { at: 11000, action: "tap", target: "lab.cmd-ls_-a" },
        { at: 12400, action: "tap", target: "lab.cmd-cat_.flag" },
        { at: 14500, action: "wait" },
      ],
    },
    dialogue(
      "after",
      host("ls cat grep คือคำสั่งเดียวกับที่ใช้บน Linux จริง"),
      host("ห้องฝึกมือใหม่มักเริ่มจากคำสั่งพวกนี้"),
      host("สังเกตไหม ก่อนสแกนอะไร เราอ่านขอบเขตก่อน", { mood: "wink" }),
      host("นี่คือนิสัยที่แยกมืออาชีพ ออกจากคนทำผิดกฎหมาย", { mood: "serious" })
    ),
    item(
      "intel-patch",
      "terminal",
      "ก.ค. 2569 Sysdig รายงานว่า AI agent ของคนร้ายเข้ามาทางช่องโหว่ในเครื่องมือ Langflow ที่มีแพตช์ตั้งแต่ เม.ย. 2568 แต่ไม่มีใครลงแพตช์ พอขั้นตอนหนึ่งพัง มันแก้ให้ใช้ได้ใน 31 วินาที",
      { title: "ทำไมต้องลงแพตช์", facts: ["f.jadepuffer"], badge: "vendor" }
    ),
  ],
  reel: {
    format: "demo",
    hook: { th: "ลองพิมพ์คำสั่งนักป้องกันดู ในเครื่องจำลอง" },
    variantsTh: ["สิ่งแรกที่แฮกเกอร์สายขาวทำ ไม่ใช่การเจาะ", "งานแรกของสายไซเบอร์ คือหาบรรทัดนี้ใน log ให้เจอ"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบใช้คอมจอดำ",
    visual: [
      "บันทึกหน้าจอ ?demo=1: ชิปถูกแตะ เลข 41 โผล่",
      "บรรทัด Accepted ถูกไฮไลต์",
      "การ์ดแดง หยุด: นอกขอบเขต ที่ชิปเว็บโรงเรียน",
      "ธง FLAG",
    ],
  },
};
