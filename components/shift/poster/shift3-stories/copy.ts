import { shiftApplyUrl } from "@/lib/dm-leads/shift-comment-copy";
import {
  SHIFT_COHORT_3,
  SHIFT_PAYMENT,
  cohortDayCount,
  cohortPath,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

/**
 * Copy for the SHIFT[3] Instagram Story series (1080x1920, cosmos look).
 * Every date, price, seat count and time is a template over the cohort
 * record, so one edit in lib/content/shift-cohort.ts moves every sheet and
 * every posting note. `**accent**` marks the one coloured span in a line.
 *
 * Stickers (link, poll, slider) are placed by hand in Instagram on the empty
 * glass slot each sheet leaves; `note` says which sticker and what to type.
 */

export type StickerKind = "link" | "poll" | "slider";

export interface StoryNote {
  /** When to post, Bangkok. */
  postOn: string;
  sticker: StickerKind;
  /** What to set on the sticker, for the person posting. */
  setup: string;
}

/** Bangkok calendar arithmetic on ISO dates, no timezone maths. */
function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

/** The poll options, in the order the answer sheet takes them. */
export const POLL_OPTIONS = ["ไม่มีไอเดีย", "ไม่กล้าคุยกับคนแปลกหน้า", "เขียนโค้ดไม่เป็น"] as const;

export const STORY_UTM = "ig-story";

export function shift3StoryCopy(c: ShiftCohort = SHIFT_COHORT_3) {
  const price = priceLabel(c);
  const pair = pairPriceBaht(c);
  const pairPrice = pair === null ? price : baht(pair);
  const deadline = formatThaiDate(c.applyDeadline);
  const start = formatThaiDate(c.startDate);
  const end = formatThaiDate(c.endDate);
  const range = formatThaiDateRange(c.startDate, c.endDate);
  const [startTime] = c.sessionTime.split("–");
  const days = cohortDayCount(c);
  const team = teamSizeLabel(c);
  const roundUrl = `passionseed.org${cohortPath(c)}`;
  const applyLink = shiftApplyUrl(c, STORY_UTM);
  const roundNo = String(c.round).padStart(2, "0");
  const firstDay = c.schedule[0];
  const lastDay = c.schedule[c.schedule.length - 1];
  const linkSetup = (label: string) => `Link sticker: ${applyLink} · sticker text "${label}"`;
  const whileOpen = `any day until ${deadline} (${c.applyDeadline})`;

  return {
    open: {
      chip: `Round ${roundNo} · Open`,
      headline: "เปิดรับแล้ว",
      sub: `${days} เย็น ลงมือสร้างของจริง\n**แล้วชวนคนนอกมาลองใช้**`,
      facts: [
        { label: "When", value: range },
        { label: "Live", value: `ไลฟ์บน Discord ทุกเย็น ${c.sessionTime} น.` },
        { label: "Keep", value: "ของจริงที่ทำเอง + พอร์ต 1 หน้า" },
        { label: "Price", value: price, unit: "ต่อคน" },
      ],
      cta: "แตะลิงก์ กรอกใบสมัคร 2 นาทีเสร็จ",
      foot: `ปิดรับ ${deadline} · รับ ${c.seats} คน · ${roundUrl}`,
      note: {
        postOn: `launch day, then again ${whileOpen}`,
        sticker: "link",
        setup: linkSetup(`สมัคร ${c.name}`),
      } satisfies StoryNote,
    },

    poll: {
      chip: "Quick poll",
      lead: "อะไรทำให้",
      big: ["ยังไม่เริ่ม", "**โปรเจกต์แรก?**"],
      sub: "เลือกข้อที่ตรงกับตัวเองที่สุด",
      after: "โหวตแล้วแตะไปสตอรี่ถัดไป มีเฉลย",
      note: {
        postOn: whileOpen,
        sticker: "poll",
        setup: `Poll sticker, question left blank (the sheet asks it). Options in this order: ${POLL_OPTIONS.join(" / ")}. Post shift3-story-answer right after it.`,
      } satisfies StoryNote,
    },

    answer: {
      chip: "The answer",
      lead: "เฉลยโพล",
      big: ["ติดข้อไหน", "**ก็เริ่มได้**"],
      rows: [
        {
          block: POLL_OPTIONS[0],
          fix: "คืนแรกช่วยกันหาโจทย์ แล้วตัดให้เหลือเรื่องเดียว",
          aside: "รุ่นก่อนหลายคนบอกว่าข้อนี้ยากที่สุด",
        },
        {
          block: POLL_OPTIONS[1],
          fix: "มีสคริปต์ให้ เริ่มทักจากคนเดียวก่อน",
          aside: "รุ่นก่อนก็รู้สึกว่ายากเหมือนกัน",
        },
        {
          block: POLL_OPTIONS[2],
          fix: "ให้ AI ช่วยทำได้ สั่งภาษาไทยได้เลย แต่เราเป็นคนคุมทิศทางเอง",
          aside: "รุ่นก่อนเคยติด เพราะ AI ตอบเป็นภาษาอังกฤษ",
        },
      ],
      cta: `แตะลิงก์ สมัคร ${c.name}`,
      foot: `ปิดรับ ${deadline}`,
      note: {
        postOn: "right after shift3-story-poll",
        sticker: "link",
        setup: linkSetup(`สมัคร ${c.name}`),
      } satisfies StoryNote,
    },

    pair: {
      chip: "Bring a friend",
      lead: "สมัครเป็นคู่",
      big: "มากับเพื่อน",
      per: "คนละ",
      pairPrice,
      compare: [
        { label: "มาคนเดียว", value: price },
        { label: "มาเป็นคู่", value: `คนละ ${pairPrice}` },
      ],
      team: `ทำเป็นทีม ${team} มาสองคนก็ตั้งทีมได้เลย`,
      howLabel: "สมัครคู่ยังไง",
      how: ["กดสมัครคนละฟอร์มจากลิงก์เดียวกันได้เลย", `ส่งสลิปทาง LINE ${SHIFT_PAYMENT.lineId} แล้วบอกชื่อเพื่อน`],
      cta: "แชร์สตอรี่นี้ไปชวนเพื่อน แล้วสมัครคู่กันเลย",
      note: {
        postOn: whileOpen,
        sticker: "link",
        setup: linkSetup("สมัครกับเพื่อน"),
      } satisfies StoryNote,
    },

    lastcall: {
      chip: "Last call",
      big: ["ปิดรับ", "**พรุ่งนี้**"],
      date: deadline,
      facts: [
        `${c.name} เริ่ม ${start}`,
        `ไลฟ์บน Discord ทุกเย็น ${c.sessionTime} น.`,
        `${days} เย็น ลงมือสร้างของจริง + พอร์ต 1 หน้า`,
        `${price} · สมัครคู่ 2 คน คนละ ${pairPrice}`,
      ],
      cta: "ยังทัน แตะลิงก์ กรอกใบสมัคร 2 นาทีเสร็จ",
      note: {
        postOn: formatThaiDate(addDays(c.applyDeadline, -1)),
        sticker: "link",
        setup: `${linkSetup(`สมัคร ${c.name}`)}. Optional: a countdown sticker to the close, if a cut-off time is confirmed.`,
      } satisfies StoryNote,
    },

    tonight: {
      chip: "Tonight",
      big: ["ปิดรับ", "**คืนนี้**"],
      sub: `วันนี้ ${deadline} คือวันสุดท้าย`,
      facts: [
        `${c.name} เริ่ม ${start} ${startTime} น.`,
        `${days} เย็น ลงมือสร้างของจริง แล้วชวนคนนอกมาลองใช้`,
        `${price} · สมัครคู่ 2 คน คนละ ${pairPrice}`,
      ],
      cta: "แตะลิงก์ สมัครให้ทันคืนนี้",
      note: {
        postOn: `${deadline}, morning`,
        sticker: "link",
        setup: linkSetup(`สมัคร ${c.name}`),
      } satisfies StoryNote,
    },

    day1: {
      chip: `Day ${firstDay.day} · Tonight`,
      headline: "เริ่มคืนนี้",
      time: startTime,
      sub: `คืนแรก: ${firstDay.title}`,
      track: c.schedule.map((d) => ({ day: d.day, label: d.label })),
      demo: `${lastDay.label} ${end}`,
      goal: `${days} เย็น ลงมือสร้าง แล้ว**ชวนคนนอกมาลองใช้จริง**\nพร้อมสรุปเป็นพอร์ต 1 หน้า`,
      cheer: "ส่งกำลังใจให้ทุกทีมตรงนี้",
      note: {
        postOn: `${start}, before ${startTime}`,
        sticker: "slider",
        setup: "Emoji slider (rocket) or a question sticker, prompt ส่งกำลังใจให้ทุกทีม. No apply link: applications are closed.",
      } satisfies StoryNote,
    },

    demoday: {
      chip: `Day ${lastDay.day} · ${lastDay.label}`,
      word: lastDay.label,
      headline: "คืนนี้",
      lead: `เย็นที่ ${days} แล้ว เดโมต่อหน้าทั้งรุ่น`,
      itemsLabel: "แต่ละทีมเอามาเดโม",
      items: ["ต้นแบบที่เอาไปให้คนนอกลองใช้", "จุดที่พัง และสิ่งที่แก้", "พอร์ต 1 หน้า ไว้เล่าในห้องสัมภาษณ์"],
      next: "อยากมารอบหน้า เลือกช่วงที่ว่างไว้ก่อน ลงชื่อฟรี",
      nextUrl: "passionseed.org/shift/next",
      note: {
        postOn: `${end}, before ${startTime}`,
        sticker: "link",
        setup: `Link sticker: https://passionseed.org/shift/next?utm_source=${STORY_UTM} · sticker text "SHIFT รอบหน้า"`,
      } satisfies StoryNote,
    },
  };
}

export type Shift3StoryCopy = ReturnType<typeof shift3StoryCopy>;

/** Every human-readable string on the sheets, for the copy-rule test. */
export function storySheetStrings(copy: Shift3StoryCopy): string[] {
  const out: string[] = [];
  const walk = (value: unknown, key = "") => {
    if (key === "note") return;
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => walk(v));
    else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, k));
  };
  walk(copy);
  return out;
}
