/**
 * Words for the 18:50 campfire call in #island-news (call.ts), the evening
 * guest on the round messages (rounds.ts) and the guest's private answer
 * (handlers/rounds.ts rd_guest). DRAFT for the three-model Thai review
 * (AGENTS.md: Antigravity drafts, Cursor proofreads, Codex checks the logic).
 *
 * House rules, checked by call.test.ts: no em or en dashes, never น้องๆ or
 * เด็กๆ, no streak wording, no "you missed" (พลาด, ยังไม่ได้), nothing about
 * yesterday, other students or how many nights anyone came, no coins, never
 * anyone's minutes. The call never names a student; counts of people are
 * floored at PEOPLE_FLOOR and count everyone at the fire (staff too). The
 * count of teams that got a look comes from the database only when it cannot
 * tell anyone's result (shift_quest__guest_reveal), else it is withheld
 * (null) and the line has no number. A look never grows a tree, and the copy
 * says so. 1 ทุ่ม is 19:00, 3 ทุ่ม 21:00.
 */
import { FOCUS_MINUTES, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import { thaiDay } from "./digestCopy";
import { PEOPLE_FLOOR } from "./newsCopy";

/** The evening guests, in the database's rotation order (shift_quest__guest_of). */
export const GUEST_KEYS = ["boat", "gull", "fireflies", "turtle"] as const;
export type GuestKey = (typeof GUEST_KEYS)[number];

export interface Guest {
  emoji: string;
  /** The guest's name, used inside sentences ("เรือเร่ทิ้งของไว้ให้ 3 ทีม"). */
  name: string;
  /** The call's title once the guest is here. */
  here: string;
  /** The arrival, on the first rest's round message and in the call. */
  arrive: string;
  /** On the round messages after the first rest, while the guest stays. */
  still: string;
}

/**
 * Real island creatures and a trader's boat from the lore
 * (docs/designs/shift-high-island-lore.md): no magic, and never a mentor, so
 * a gift never reads like an approval. Each brings two looks of its own
 * (lib/shift-island/tree-style.ts TREE_ITEMS, guest).
 */
export const GUESTS: Record<GuestKey, Guest> = {
  boat: {
    emoji: "⛵",
    name: "เรือเร่",
    here: "⛵ เรือเร่แวะเข้าท่าแล้ว",
    arrive: "⛵ เรือเร่ลำเล็กแวะเข้าท่า คนเรือยกลังไม้มาวางข้างกองไฟ ในลังมีของจากทะเลไกล",
    still: "⛵ เรือเร่ยังจอดอยู่ที่ท่า",
  },
  gull: {
    emoji: "🪶",
    name: "นกนางนวล",
    here: "🪶 นกนางนวลร่อนลงข้างกองไฟแล้ว",
    arrive: "🪶 นกนางนวลตัวหนึ่งร่อนลงข้างกองไฟ คาบของที่เก็บมาจากชายหาดมาเต็มปาก",
    still: "🪶 นกนางนวลยังเกาะอยู่ข้างกองไฟ",
  },
  fireflies: {
    emoji: "✨",
    name: "หิ่งห้อย",
    here: "✨ หิ่งห้อยมาวนรอบกองไฟแล้ว",
    arrive: "✨ หิ่งห้อยฝูงหนึ่งบินออกมาจากพุ่มไม้หลังลาน มาวนอยู่รอบกองไฟ",
    still: "✨ หิ่งห้อยยังวนอยู่รอบกองไฟ",
  },
  turtle: {
    emoji: "🐢",
    name: "เต่าทะเล",
    here: "🐢 เต่าทะเลขึ้นหาดมาแล้ว",
    arrive: "🐢 เต่าทะเลค่อยๆ คลานขึ้นหาดใต้แสงจันทร์ ห่างกองไฟไปไม่ไกล ตามรอยบนทรายมีของเล็กๆ ที่ทะเลพัดมา",
    still: "🐢 เต่าทะเลยังนอนพักอยู่ริมหาด",
  },
};

export function isGuestKey(value: unknown): value is GuestKey {
  return typeof value === "string" && (GUEST_KEYS as readonly string[]).includes(value);
}

/**
 * The guest's drop, as everyone may read it: how many teams got a look, never
 * which. Null: withheld (1 or 2 teams at the fire, or all or none of them
 * won, would tell who won), so no number. 0: no team was there to roll. The
 * button answers about the presser's own team only.
 */
function dropped(g: Guest, teams: number | null): string {
  if (teams === null) return `🎁 ${g.name}แวะมาที่กองไฟแล้ว ทีมคุณได้อะไรไหม กดดูได้ที่ปุ่มด้านล่าง เห็นแค่คุณ`;
  return teams > 0
    ? `🎁 ${g.name}ทิ้งของไว้ให้ **${teams}** ทีม ทีมคุณได้อะไร กดดูได้ที่ปุ่มด้านล่าง เห็นแค่คุณ`
    : `🌙 คืนนี้${g.name}แค่แวะมานั่งพักข้างกองไฟ`;
}

/**
 * The call in #island-news, edited through the evening: invite (18:50), lit
 * (19:00), the guest (19:25, during a season), embers (21:00).
 */
export const CALL = {
  title: "🔥 คืนนี้ 1 ทุ่ม เจอกันที่กองไฟ",
  /** One line a day, picked by the day (call.ts openerOf): never the guest, so the reveal stays a surprise. */
  openers: [
    "🪵 ฟืนกองไว้พร้อมแล้ว คืนนี้จุดไฟตอน 1 ทุ่ม",
    "🌅 ฟ้าเริ่มมืดแล้ว อีกเดี๋ยวลานกลางเกาะจะสว่างด้วยกองไฟ",
    "🪶 ลมทะเลเริ่มเย็น ได้เวลาล้อมวงกันที่กองไฟ",
    "🌊 คลื่นเบาลงแล้ว คืนนี้นั่งทำงานข้างกองไฟกัน",
  ],
  invite: "เอางานของตัวเองมานั่งทำข้างๆ เพื่อน ไม่ต้องเปิดไมค์ ไม่ต้องพูดก็ได้",
  /** When the first round starts, as a Discord timestamp (each reader sees their own clock). */
  round: (lit: number) =>
    `รอบแรกเริ่ม <t:${lit}:t> (<t:${lit}:R>) · โฟกัส ${FOCUS_MINUTES} นาที พัก ${REST_MINUTES} นาที · มาตอนไหนก็นั่งได้`,
  /** Before the guest arrives (a season night only): something is coming, never what. */
  teaser: (at: number) => `🔭 ไกลๆ ที่ขอบทะเลมีอะไรกำลังมาทางเกาะ จะถึงกองไฟตอนพักรอบแรก <t:${at}:t>`,
  /** How the drop works, before the guest arrives: one roll per team, however many come. */
  drop: "🎁 ตอนแขกมาถึง ทุกทีมที่มีคนนั่งอยู่ที่กองไฟได้ลุ้นลุคใหม่ให้ต้นไม้ ทีมละครั้ง มากี่คนก็ลุ้นเท่ากัน",
  litTitle: "🔥 ไฟติดแล้ว",
  lit: "รอบโฟกัสแรกเริ่มแล้ว เข้ามาตอนไหนก็ได้ นั่งลงแล้วเริ่มงานของตัวเองเลย",
  /** Once the drop is made: how many teams got a look (or a warm line for none). */
  dropped,
  /** While the guest stays (until 21:00). */
  stay: (g: Guest, until: number) => `${g.name}อยู่ถึง <t:${until}:t> มานั่งทำงานด้วยกันต่อได้`,
  embersTitle: "🌙 กองไฟคืนนี้มอดแล้ว",
  embers: "พรุ่งนี้จุดใหม่ 1 ทุ่ม ห้องกองไฟเปิดอยู่ตลอด อยากนั่งทำงานตอนไหนก็เข้ามาได้",
  /** Staff switched the call off (/admin feature campfire_call off): the last call, edited once. Never a promise of tomorrow. */
  offTitle: "🌙 กองไฟพักก่อน",
  off: "ช่วงนี้งดเรียกรวมตอน 1 ทุ่มไปก่อน ห้องกองไฟเปิดอยู่ตลอด อยากนั่งทำงานตอนไหนก็เข้ามาได้",
  /** Everyone at the fire now (staff too), floored: 1 or 2 could point at one person. Never a name. */
  people: (n: number) =>
    n >= PEOPLE_FLOOR ? `👥 รอบกองไฟตอนนี้ **${n}** คน` : n > 0 ? "👥 มีคนนั่งอยู่ที่กองไฟแล้ว" : "👥 กองไฟยังว่าง มานั่งเป็นคนแรกได้",
  fine: "ไม่บังคับ · ไม่มีใครนับเวลาของคุณ · ลุคไม่ทำให้ต้นไม้โต ต้นไม้โตเมื่อพี่เลี้ยงยืนยันเควสต์เท่านั้น",
  /**
   * Only on a call that pinged: how to stop it. Muting the channel is not
   * enough: Discord still notifies a muted channel's mentions, a role
   * mention included. "Suppress All Role @mentions" (server notification
   * settings) stops it, for every role in the server. Test on a phone before
   * the three-model review.
   */
  mute: "ไม่อยากได้แจ้งเตือนทุกวัน: ปิดเสียงห้องนี้อย่างเดียวยังเด้งอยู่ ให้เปิด Suppress All Role @mentions ในการแจ้งเตือนของเซิร์ฟเวอร์ (ปิดการแท็กบทบาททั้งเซิร์ฟเวอร์)",
  /** The issue line, also how a restarted bot finds its own call. Never the news card's "ฉบับ" or the digest's "ข่าวของ". */
  dayLine: (day: string) => `เรียกรวมกองไฟ ${thaiDay(day)}`,
  /** The private check button, on the call and the round messages once the guest is here. */
  btnCheck: "🎁 ทีมเราได้อะไรไหม",
  pictureAlt: "กองไฟบนเกาะ SHIFT",
};

/** The guest on the campfire's round messages (rounds.ts). */
export const ROUND_GUEST = {
  /** On the 19:00 focus round of a guest night. */
  teaser: "🔭 พักรอบนี้จะมีแขกแวะมาที่กองไฟ",
  dropped,
  /** Never "nobody sees which team": a picked look shows on a shown team's tree (shift_quest_island_styles). */
  fine: "ทุกทีมที่อยู่ที่กองไฟตอนแขกมาถึงลุ้นเท่ากัน ทีมละครั้ง · บอทไม่ประกาศว่าทีมไหนได้ · ลุคไม่ทำให้ต้นไม้โต",
};

/** The guest's private answer to 🎁 (handlers/rounds.ts rd_guest), about the presser's own team only. */
export const REVEAL = {
  wonTitle: (g: Guest) => `🎁 ${g.name}ทิ้งของไว้ให้ทีมคุณ`,
  won: (look: string) => `ในของมี **${look}** สำหรับต้นไม้ของทีม`,
  wonWaiting: "รับได้เลยด้านล่าง หรือเพื่อนในทีมคนไหนก็เปิดได้จากปุ่ม 🎁 เปิดของขวัญ",
  wonTaken: "ทีมรับไปแล้ว ลุคนี้อยู่กับต้นไม้ของทีม",
  lostTitle: (g: Guest) => `${g.emoji} คืนนี้${g.name}แค่แวะมาทักทายทีมคุณ`,
  lost: "คืนนี้ของไม่ได้ตกถึงทีมคุณ แขกเวียนกันมาที่กองไฟ แต่ละตัวมีของของตัวเอง",
  fullTitle: (g: Guest) => `${g.emoji} ทีมคุณมีของจาก${g.name}ครบแล้ว`,
  full: (g: Guest) => `คืนนี้${g.name}เลยแวะมานั่งพักข้างกองไฟด้วยกัน`,
  awayTitle: (g: Guest) => `${g.emoji} ${g.name}แวะมาที่กองไฟคืนนี้`,
  away: "ของจากแขกตกถึงทีมที่มีคนนั่งอยู่ที่กองไฟตอนแขกมาถึง ตอนพักรอบแรกหลัง 1 ทุ่ม แขกเวียนกันมาเรื่อยๆ ไม่ต้องรีบ",
  arrivingTitle: "👀 แขกเพิ่งมาถึง",
  arriving: "กำลังวางของอยู่ ลองกดอีกครั้งในอีกสักครู่",
  /** The guest's first rest passed with no drop (the bot was away): no team got anything, never "your team was not there". */
  quietTitle: (g: Guest) => `${g.emoji} คืนนี้${g.name}แค่แวะมานั่งพัก`,
  quiet: "คืนนี้แขกไม่ได้ทิ้งของไว้ให้ทีมไหน แขกเวียนกันมาที่กองไฟ แต่ละตัวมีของของตัวเอง",
  noPlot: "ของจากแขกเป็นลุคแต่งต้นไม้ของทีม จับจองที่ดินก่อน แล้วทีมของคุณก็ได้ลุ้นด้วย",
  goneTitle: "🌙 แขกกลับไปแล้ว",
  gone: "แขกแวะมาที่กองไฟตอนพักรอบแรกหลัง 1 ทุ่ม ปุ่มนี้ดูได้ถึงเที่ยงคืนของคืนนั้น",
  /** What the guest brought, by the looks' names. */
  looks: (names: string[]) => `ของที่แขกพกมา: ${names.join(" · ")}`,
  /** The gift card's heading (handlers/tree.ts offerGift). */
  heading: (g: Guest) => `ของจาก${g.name}`,
  fine: ROUND_GUEST.fine,
};
