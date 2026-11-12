import {
  SHIFT_COHORTS,
  SHIFT_COHORT_3,
  cohortDayCount,
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import type { LinkedInPost, StudioSet } from "../types";

/**
 * LinkedIn document carousels and posts for the SHIFT[3] run-up. Readers are
 * educators, school leaders, partners and parents at work, so the thesis
 * (Self-Determination Theory) is said out loud. Every date, price and seat
 * count is a template over SHIFT_COHORT_3: one data edit updates them all.
 */

const C = SHIFT_COHORT_3;
const DAYS = cohortDayCount(C);
const LINK = `passionseed.org${cohortPath(C)}`;
const pair = pairPriceBaht(C);
const CREATED = "2026-10-23";

const COHORT_SOURCE = "lib/content/shift-cohort.ts SHIFT_COHORT_3 (dates, session time, deadline, seats, price)";

const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 9 Nov", built from the ISO parts like formatThaiDate so the date
 *  never slips a day in another timezone. */
function enDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${EN_WEEKDAYS[weekday]} ${day} ${EN_MONTHS[month - 1]}`;
}

const start = enDate(C.startDate);
const end = enDate(C.endDate);
const deadline = enDate(C.applyDeadline);
const demo = C.schedule[C.schedule.length - 1];
const demoDate = enDate(demo.date);

/** Earlier rounds, oldest first, so "largest so far" and "up from N" stay true
 *  if a seat count changes. */
const EARLIER = SHIFT_COHORTS.filter((c) => c.round < C.round);
const PREV = EARLIER[EARLIER.length - 1];
const LARGEST = EARLIER.every((c) => c.seats < C.seats);
const ROUNDS_RUN = EARLIER.length;
const EN_COUNT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const roundsWord = EN_COUNT[ROUNDS_RUN] ?? String(ROUNDS_RUN);
const RoundsWord = roundsWord[0].toUpperCase() + roundsWord.slice(1);

/** "฿690 per student", or "Free" for a free round. */
const enPrice = C.priceBaht > 0 ? `฿${C.priceBaht.toLocaleString("en-US")} per student` : "Free";

/** One closing line every post shares: dates, time, price, seats, deadline. */
const enFacts = `${C.name}: ${start} to ${end}, ${C.sessionTime} Bangkok time, on Discord. ${enPrice}, ${C.seats} seats. Applications close ${deadline}.`;

export const LI_THREE_ROUNDS: StudioSet = {
  slug: "li-three-rounds",
  title: `LinkedIn: what ${roundsWord} rounds of SHIFT changed before ${C.name}`,
  channel: "linkedin",
  format: "linkedin",
  theme: "cosmos",
  audience: "professional",
  shiftRound: C.round,
  angle:
    "One change per round and why: a defined week, no fixed interview method plus a shared progress group, Thai replies on Day 2, the full offer up front for families.",
  sources: [
    "company-brain/shift.md History (first run failed without structure; shift[0] ran with a defined structure)",
    "company-brain/shift.md The 7 days (mentor days and missions on days without a mentor)",
    "company-brain/shift.md Changes for shift[1] (Day 1 homework: own method, example AI prompt; homework in a shared group)",
    "company-brain/shift.md shift[1] debrief: What was hard (English replies) and Ideas to try (tell students on Day 2)",
    "company-brain/marketing.md Lesson from shift[2] (comment DMs, full offer and tracked link); no counts used",
    "lib/dm-leads/shift-comment-copy.ts (tracked apply link and deadline in the comment reply)",
    "components/shift/apply/ApplyGuides.tsx (apply page shows dates, price, refund line)",
    "lib/content/shift-cohort.ts SHIFT_SDT, SHIFT_DAILY_SHOW",
    COHORT_SOURCE,
  ],
  caption: "See LinkedIn post li-post-three-rounds.",
  created: CREATED,
  slides: [
    {
      kind: "cover",
      kicker: `Notes before ${C.name}`,
      icon: "flask",
      title: [`${RoundsWord} rounds,`, "four changes,", "and why"],
      sub: `A ${DAYS}-evening online sprint where Thai high school students build a prototype, test it with real users and leave with portfolio evidence. What each round taught us.`,
    },
    {
      kind: "compare",
      tag: "01 · SHIFT[0]",
      title: "Give the week a shape",
      left: {
        label: "What happened",
        items: ["Our first test run had no fixed plan", "It failed for exactly that reason"],
      },
      right: {
        label: "What we changed",
        items: [`A written plan for each of the ${DAYS} days`, "A mission even on days without a mentor"],
      },
      footnote: "Why: students still choose what to build. The week should not be one more thing to figure out.",
    },
    {
      kind: "points",
      tag: "02 · SHIFT[1]",
      title: "Stop handing out the method",
      numbered: true,
      points: [
        { title: "No fixed interview script", body: "Groups compare ways to understand users, then pick one" },
        { title: "A prompt that asks back", body: "It questions them first, then lays out 2 or 3 methods" },
        { title: "Homework in one shared group", body: "Every student sees the others' progress, not only mentors" },
      ],
      footnote: "Why: the goal is to understand users, not to prove the idea right. Finding the method is part of the work.",
    },
    {
      kind: "compare",
      tag: "03 · SHIFT[1] debrief",
      title: "The AI answered in English",
      left: {
        label: "What a student told us",
        items: ["They asked an AI tool to help pick a topic", "It replied in English, so they gave up on it"],
      },
      right: {
        label: "What we changed",
        items: ["Day 2: we tell everyone it can reply in Thai"],
      },
      footnote: "Why: the hard part should be the problem, not the language of the tool.",
    },
    {
      kind: "compare",
      tag: "04 · SHIFT[2]",
      title: "Show the whole offer up front",
      left: {
        label: "What didn't work",
        items: ["Replies to interested families without the full offer", "No direct link to apply"],
      },
      right: {
        label: "What we changed",
        items: ["Every reply now carries the apply link", "That page shows dates, price, refund terms"],
      },
      footnote: "Why: families decide on facts. Interest turned into seats only once the full offer reached them.",
    },
    {
      kind: "points",
      tag: "The thread · Self-Determination Theory",
      title: "We own the frame. They own the choices.",
      points: [
        { title: "Competence", body: "A clear plan for the week, and AI tools in their own language" },
        { title: "Autonomy", body: "They pick the problem and how to understand their users" },
        { title: "Relatedness", body: "Work happens where peers can see it, every evening" },
      ],
      footnote: "Each change in this deck feeds one of these three needs.",
    },
    {
      kind: "cta",
      // The display face draws [ ] like ( ), so the cohort name stays in the
      // tag and the header wordmark, never in the big title.
      tag: `${C.name} · applications open`,
      title: `${start} to\n${end}`,
      icon: "calendar",
      action: "link",
      link: LINK,
      body: `${DAYS} evenings, ${C.sessionTime} Bangkok time, on Discord. ${enPrice}, ${C.seats} seats. Applications close ${deadline}.`,
    },
  ],
};

export const SHIFT3_LINKEDIN_SETS: StudioSet[] = [LI_THREE_ROUNDS];

export const SHIFT3_LINKEDIN_POSTS: LinkedInPost[] = [
  {
    slug: "li-post-three-rounds",
    title: `What ${roundsWord} rounds of SHIFT changed before ${C.name}`,
    voice: "founder",
    attach: LI_THREE_ROUNDS.slug,
    angle: "Iteration in public: one change per round and the reason, tied together by Self-Determination Theory.",
    sources: LI_THREE_ROUNDS.sources,
    created: CREATED,
    body: [
      "The first time we ran SHIFT, it failed. Not because of the students. Because we hadn't planned the week.",
      "",
      `SHIFT is a ${DAYS}-evening online sprint for Thai high school students. They pick a problem, build a prototype with AI tools, test it with people outside the program, and finish with a one-page portfolio. We've run it ${roundsWord} times since that first test. ${C.name} starts ${start}, so here is what each round changed, and why.`,
      "",
      "1. Give the week a shape.",
      `Our first test run had no fixed plan. SHIFT[0] got a written plan for each of the ${DAYS} days, with a mission even on the days without a mentor. Students still choose what to build. The week is no longer one more thing to figure out.`,
      "",
      "2. Stop handing out the method.",
      "For SHIFT[1] we stopped teaching one interview method on Day 1. The goal is to understand users, not to prove the idea right. Groups compare ways to do that and pick one, with an example AI prompt that asks them questions back instead of handing over a list. Homework goes into one shared group, so every student sees the others' progress.",
      "",
      "3. Say the obvious thing out loud.",
      "In the SHIFT[1] debrief, a student told us they had asked an AI tool to help pick a topic. It answered in English, they couldn't follow it, and they gave up on it. They only learned later that it can answer in Thai. Now we tell everyone on Day 2.",
      "",
      "4. Show the whole offer up front.",
      "In SHIFT[2], interest in the comments turned into seats only once the full offer and a direct apply link reached the people asking. Families decide on facts. Now every reply carries that link, to a page with the dates, the price and the refund terms.",
      "",
      "The thread through the first three is Self-Determination Theory. A clear week builds competence. Choosing the method builds autonomy. A shared group builds relatedness. We own the frame. The choices stay with the students.",
      "",
      enFacts,
      LINK,
      "",
      "If you run a program for teenagers: what did your last round change?",
    ].join("\n"),
  },
  {
    slug: "li-post-30-seats",
    title: `Why ${C.name} opens ${C.seats} seats but stays ${DAYS} evenings`,
    voice: "founder",
    angle:
      "Scaling with care: more seats, same short week, visible group spaces (safeguarding), watching who is left out, honest unknowns.",
    sources: [
      COHORT_SOURCE,
      "lib/content/shift-cohort.ts SHIFT_COHORT_0 / SHIFT_COHORT / SHIFT_COHORT_2 seats (public on /shift)",
      "AGENTS.md Safeguarding (no private 1:1 adult-student channels; work in visible group spaces)",
      "docs/shift-round-ops.md Squads (3 entrants each)",
      "components/shift/round/ShiftSquads.tsx (team Discord room, Daily Show every evening)",
      "lib/content/shift-cohort.ts SHIFT_DAILY_SHOW",
      "company-brain/shift.md Measuring SDT: Relatedness (check every student, two-line note, who seemed left out)",
      "company-brain/shift.md Who it's for and what we promise: What students leave with (prototype, experiment and pivot log, 1-page TCAS case study)",
    ],
    created: CREATED,
    body: [
      `${C.name} opens ${C.seats} seats${LARGEST ? ", our largest round so far" : ""}, up from ${PREV.seats} in ${PREV.name}. It still runs ${DAYS} evenings, and the work still happens where everyone can see it.`,
      "",
      "A bigger round is easy to announce. Here is what we're keeping, what we'll watch, and what we don't know yet.",
      "",
      "What we keep",
      `• ${DAYS} evenings, ${C.sessionTime}, after school. Short enough to hold next to school, long enough to build something, put it in front of strangers, and fix what broke. More seats didn't need more weeks.`,
      "• Squads of up to three. Each squad has its own Discord room, and every evening each squad shows the whole room what shipped, what broke and what it learned.",
      "• The same finish line. Every student leaves with a prototype that people outside the program used, a dated log of what broke and what changed, and a one-page portfolio.",
      "• Visible group spaces. SHIFT students are in high school, so we design for minors: the program doesn't open private one-to-one channels between adults and students. Questions go to the squad room or the whole room, where other students and our team can see them.",
      "",
      "What we watch",
      `Who is left out mid-week. After each mentor session we check every student, not just every squad: is anyone not connected to anyone? Then two lines in our notes: what we saw, and who seemed left out. At ${C.seats}, a quiet student in a quiet squad is easy to miss.`,
      "",
      "What we don't know yet",
      "• Whether the evening show still gives every squad enough time at this size.",
      "• Whether our mentors notice every student when the room is this full.",
      `• How many seats will fill. I'll share what we saw after ${demo.label} on ${demoDate}.`,
      "",
      enFacts,
      LINK,
      "",
      "If you've grown a program for teenagers: what was the first thing that broke when the groups got bigger?",
    ].join("\n"),
  },
  {
    slug: "li-post-interview-fear",
    title: "Students fear the portfolio interview most (Thai, for teachers and parents)",
    voice: "founder",
    angle:
      "For Thai teachers: the TCAS portfolio interview is what students fear most; SHIFT has them tell what broke and what changed, from their own log, every evening.",
    sources: [
      "company-brain/shift.md shift[1] debrief: What they asked us (interview prep; one student fears it most), What we told them (real usage over UI)",
      "lib/content/shift-cohort.ts SHIFT_COHORT_3 schedule (Day 5 Fix Check log with dates, Day 7 Demo Day and 1-page portfolio)",
      "lib/content/shift-cohort.ts SHIFT_DAILY_SHOW (Shipped, Broke, Learned every evening)",
      "lib/content/shift-refund.ts (full refund only if every step was done and it still felt not worth it)",
      COHORT_SOURCE,
    ],
    created: CREATED,
    body: [
      "นักเรียนคนหนึ่งบอกเราตรงๆ ว่า สิ่งที่กลัวที่สุดคือการสัมภาษณ์รอบพอร์ต TCAS",
      "",
      "ถึงคุณครูและผู้ปกครองนักเรียน ม.ปลาย",
      "ตอนจบ SHIFT[1] เราถามนักเรียนว่าทั้งสัปดาห์เป็นยังไง แต่สิ่งที่หลายคนถามกลับมาคือ จะเตรียมตัวสัมภาษณ์พอร์ตยังไงดี",
      "",
      `เราไม่แจกสคริปต์คำตอบ แต่ตลอด ${DAYS} เย็นของ SHIFT นักเรียนจะได้สร้างเรื่องจริงของตัวเองไว้เล่า`,
      "",
      "• ระหว่างสัปดาห์ นักเรียนจดบันทึกทุกจุดที่พังพร้อมวันที่ ว่าเจออะไร และแก้ยังไง",
      "• ทุกเย็น แต่ละทีมเล่าให้ทั้งห้องฟังสั้นๆ ว่าอะไรใช้ได้แล้ว อะไรพัง และวันนี้เรียนรู้อะไร",
      `• วันที่ ${DAYS} เดโมต่อหน้าทั้งรุ่น เล่าจุดพังและสิ่งที่เปลี่ยน แล้วสรุปเป็นพอร์ต 1 หน้า`,
      "",
      "พอถึงวันสัมภาษณ์ นักเรียนจึงเล่าจากบันทึกของตัวเอง ไม่ใช่จากคำตอบที่ท่องมา และเคยเล่าต่อหน้าคนอื่นมาแล้ว",
      "",
      "เราให้นักเรียนเก็บหลักฐานว่ามีคนใช้งานจริงก่อน เพราะช่วยเล่าได้ชัดว่าแก้ปัญหาอะไร แล้วค่อยแต่งหน้าตาชิ้นงานทีหลัง",
      "",
      "เราไม่สัญญาผลสัมภาษณ์ แต่ถ้าทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม เราคืนเงินเต็มจำนวน",
      "",
      C.name,
      `• ${formatThaiDateRange(C.startDate, C.endDate)} ไลฟ์บน Discord ทุกเย็น ${C.sessionTime} น.`,
      `• ทำคนเดียวหรือเป็นทีม ${teamSizeLabel(C)} ไม่ต้องมีพื้นฐานเขียนโค้ด ใช้ AI ช่วยสร้าง แต่นักเรียนเป็นคนตัดสินใจ`,
      `• ${priceLabel(C)} ต่อคน${pair !== null ? ` สมัครเป็นคู่กับเพื่อน จ่ายคนละ ฿${pair}` : ""}`,
      `• รับ ${C.seats} ที่นั่ง ปิดรับสมัคร ${formatThaiDate(C.applyDeadline)}`,
      "",
      "ถ้ารู้จักนักเรียน ม.ปลาย ที่กังวลเรื่องสัมภาษณ์รอบพอร์ต ฝากส่งโพสต์นี้ต่อให้เขาด้วย",
      LINK,
    ].join("\n"),
  },
];
