/**
 * SHIFT Island words. Thai first, one place, same house rules as ../copy.ts:
 * no em dashes, never talk down, never promise rewards that are not live.
 */
import { bkkDate, safe } from "../copy";

/** Tree stage = number of milestones a mentor has confirmed (0..7). */
export const STAGE_NAMES = ["ที่ดินว่าง", "เมล็ด", "ต้นกล้า", "ต้นอ่อน", "ต้นไม้", "ต้นใหญ่", "ออกผล", "ผลิดอก"];

export const I = {
  header: "🏝️ **เกาะ SHIFT**",
  noPlot:
    "คุณยังไม่มีที่ดินบนเกาะ จับจองด้วยการสร้างโปรเจกต์ (ทำเรื่องอะไรก็ได้ที่คุณใส่ใจ) หรือให้เพื่อนชวนเข้าโปรเจกต์ของเขาก็ได้ ต้นไม้ของคุณจะเริ่มจากเมล็ด",
  plot: (n: number | undefined, stage: number, name: string) =>
    `🌳 **${safe(name, 60)}**${n ? ` · แปลง #${n}` : ""} · ${STAGE_NAMES[stage] ?? STAGE_NAMES[7]} (${stage}/7)`,
  next: (title: string) => `ขั้นต่อไปที่แนะนำ: **${safe(title, 80)}** (จะทำขั้นไหนก่อนก็ได้)`,
  allDone: "ครบ 7 ขั้นแล้ว ต้นไม้ผลิดอกเต็มต้น ทำขั้นไหนซ้ำเพื่อเรียนรู้ต่อก็ได้",
  inFlight: (title: string, state: string) => `⏳ ${safe(title, 80)}: ${state}`,
  /** A teammate holds the project's one open quest for this milestone. */
  inFlightHeld: (title: string, state: string, owner: string | null) =>
    `⏳ ${safe(title, 80)}: ${state} (${owner ? safe(owner, 40) : "เพื่อนร่วมทีม"} ถืองานนี้อยู่ ช่วยกันได้)`,
  heldBy: (owner: string | null) => `${owner ? owner : "เพื่อนร่วมทีม"} ถืองานขั้นนี้อยู่`,
  /** Every milestone that could be picked is held by a teammate or waits for an appeal. */
  nothingToPick: "ตอนนี้ทุกขั้นมีงานเปิดอยู่แล้ว รอผลรีวิวหรือช่วยเพื่อนร่วมทีมในงานที่เขาถืออยู่ได้เลย",
  resting: "🌙 กำลังพัก ต้นไม้ไม่ตาย ไม่มีอะไรหาย กด ☀️ เมื่อพร้อมกลับมา",
  tappedToday: "🔨 วันนี้คุณลงมือแล้ว",
  growthRule: "ต้นไม้โตเมื่อพี่เลี้ยงมาเยี่ยมและยืนยันขั้นที่ทำได้จริง ไม่ได้โตจากจำนวนครั้งที่กดหรือเวลาออนไลน์",
  signs: "🪧 ป้ายชื่อบนเกาะ:",
  /** The picture failed; the text view still works. The reference matches one log line. */
  pictureFailed: (ref: string) => `🖼️ รูปเกาะโหลดไม่ขึ้นรอบนี้ งานและต้นไม้ของคุณยังอยู่ครบ (อ้างอิง ${ref})`,

  btnTap: "🔨 วันนี้ทำต่อ",
  btnMilestone: "🌟 ถึงขั้นต่อไปแล้ว",
  btnStuck: "🧱 ติด",
  btnRest: "🌙 ขอพัก",
  btnWake: "☀️ กลับมาแล้ว",
  btnWork: "📋 งานที่ส่งไว้",
  btnClaim: "🌱 จับจองที่ดิน",
  btnHow: "📖 เกาะนี้ทำงานยังไง",
  btnBack: "🏝️ กลับเกาะ",
  btnShowName: "🪧 โชว์ชื่อบนเกาะ",
  btnHideName: "🪧 ซ่อนชื่อ",
  btnNote: "✏️ เพิ่มโน้ตสั้นๆ",

  how: [
    "**เกาะ SHIFT ทำงานยังไง**",
    "• หนึ่งโปรเจกต์คือต้นไม้หนึ่งต้น โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้",
    "• ถึงขั้นไหนแล้ว กด 🌟 ส่งหลักฐานสั้นๆ กับคำตอบหนึ่งข้อ พี่เลี้ยงจะมาดูแล้วยืนยัน",
    "• ต้นไม้โตจากงานที่พี่เลี้ยงยืนยันเท่านั้น ไม่ได้โตจากจำนวนครั้งที่กดหรือความเร็ว",
    "• ต้นไม้ไม่เหี่ยว ไม่หดเล็กลง และไม่มีการนับวันต่อเนื่อง จะพักนานแค่ไหนก็ได้",
    "• ไม่มีการจัดอันดับ ของปลดล็อก ทุกคนที่ถึงเกณฑ์ได้เท่ากัน",
    "• เริ่มได้สองทาง: จับจองที่ดินด้วยการสร้างโปรเจกต์ หรือให้เพื่อนชวนเข้าโปรเจกต์ของเขา",
  ].join("\n"),

  tapped: "บันทึกแล้ว ขอให้สนุกกับการสร้าง 🔨",
  tapAgain: "วันนี้บันทึกไว้แล้ว อยากเล่าเพิ่มก็เพิ่มโน้ตได้",
  noteTitle: "โน้ตสั้นๆ",
  noteLabel: "วันนี้ทำอะไรไป (สั้นๆ)",
  noteSaved: "เก็บโน้ตแล้ว (ส่วนตัว เห็นแค่คุณ)",

  pickMilestone: "ถึงขั้นไหนแล้ว",
  doneRepeat: "ผ่านแล้ว ส่งซ้ำได้ถ้าได้เรียนรู้อะไรใหม่ (ต้นไม้นับขั้นนี้แล้ว)",
  criteria: (text: string) => `**พี่เลี้ยงดูอะไร**\n${safe(text, 600)}`,
  proof: "หลักฐาน: ลิงก์ หรือเล่าสั้นๆ",
  proofHint: "ห้ามระบุชื่อคนที่คุยด้วยหรือคนที่ทดสอบ ห้ามใส่รหัสผ่าน โทเคน หรือข้อมูลลูกค้า",
  portfolio: "โน้ตพอร์ต",
  portfolioHint: "ตอบสั้นๆ ข้อเดียว เก็บไว้ใช้ในพอร์ตได้",
  sent: "ส่งแล้ว พี่เลี้ยงจะมาดูงานนี้ ผลแจ้งใน /inbox ถ้าผ่าน ต้นไม้โตขึ้นหนึ่งขั้น",
  /** A repeat never grows the tree: the stage is already counted. */
  sentRepeat:
    "ส่งแล้ว ขั้นนี้นับให้ต้นไม้ไปแล้ว ครั้งนี้พี่เลี้ยงจะดูว่าคุณได้เรียนรู้อะไรใหม่ต่างจากครั้งก่อน ผลแจ้งใน /inbox",

  rested: (n: number) => `พักแล้ว (พักงาน ${n} อย่าง) ต้นไม้ไม่ตาย ไม่มีอะไรหาย`,
  /** Rest with nothing open: there is nothing to pause, and no resting state is shown. */
  nothingToRest: "ตอนนี้ไม่มีงานที่เปิดอยู่ให้พัก ไม่ต้องทำอะไรเพิ่ม ต้นไม้ไม่เหี่ยวและไม่มีอะไรหาย กลับมาเมื่อไหร่ก็ได้",
  woke: (n: number) => `กลับมาแล้ว ☀️${n ? ` (เปิดงาน ${n} อย่างต่อ)` : ""}`,
  nameShown: (visible: boolean) =>
    visible ? "ชื่อโปรเจกต์ขึ้นป้ายบนเกาะแล้ว" : "บันทึกแล้ว ชื่อจะขึ้นป้ายเมื่อเพื่อนร่วมทีมทุกคนยินยอม",
  nameHidden: "ซ่อนชื่อโปรเจกต์แล้ว บนเกาะจะเห็นเป็นต้นไม้ไม่มีป้าย",
};

/**
 * Squads: opt-in, a short sprint, celebrated together, never ranked. Always
 * "สควอด", never "ทีม": students already say ทีม for their project team.
 */
export const SQ = {
  /** /admin feature squads is off (the default until founder decision 5). */
  notOpen: "สควอดยังไม่เปิดให้ใช้ตอนนี้ ระหว่างนี้ลงมือกับโปรเจกต์ของคุณบน /island ได้ตามปกติ เปิดเมื่อไหร่ใช้ /squad ได้เลย",
  created: "ตั้งสควอดแล้ว ชวนเพื่อนอีก 2 ถึง 3 คนด้วย /squad invite (เพื่อนต้องกดตอบรับเอง) ครบ 3 คนเมื่อไหร่ สควอดเริ่มนับขั้นด้วยกัน",
  none: "ยังไม่มีสควอด ตั้งสควอดเล็กๆ กับเพื่อนด้วย /squad new ไม่บังคับ",
  invited: (who: string) =>
    `ส่งคำชวนเข้าสควอดให้ ${who} แล้ว เขาจะเห็นใน /inbox หรือ /squad view คำชวนอยู่ได้ 3 วัน ถอนคืนได้ด้วย /squad withdraw`,
  inviteLine: (name: string, expiresAt?: string | null) =>
    `👥 มีคนชวนคุณเข้าสควอด **${safe(name, 60)}**${expiresAt ? ` (ตอบได้ถึง ${bkkDate(expiresAt)})` : ""}`,
  /** Fewer than 3 active members: no progress number yet, only who is in. */
  forming: (n: number) =>
    `🌱 สควอดกำลังรวมคน: ตอนนี้ ${n} คน ครบ 3 คนเมื่อไหร่เริ่มนับขั้นด้วยกัน ชวนเพื่อนได้ด้วย /squad invite`,
  together: (total: number) => `ทั้งสควอดโตไปแล้ว ${total} ขั้นในรอบนี้ 🌱`,
  ended: (total: number) => `รอบนี้จบแล้ว ทั้งสควอดโตไป ${total} ขั้นด้วยกัน ขอบคุณที่ลงมือด้วยกัน 🌳`,
  /** A squad that ends below three members shows no number: it would be someone's own count. */
  endedQuiet: "รอบนี้จบแล้ว ขอบคุณที่ลงมือด้วยกัน 🌳",
  private: "เห็นเฉพาะคนในสควอด ไม่มีการจัดอันดับ",
  withdrawHint: "ถอนคำชวนที่ยังไม่ตอบได้ด้วย /squad withdraw",
  withdrawn: (who: string) => `ถอนคำชวนเข้าสควอดของ ${who} แล้ว ไม่มีอะไรค้างในกล่องข้อความของเขา`,
  btnView: "👥 ดูสควอด",
  btnLeave: "ออกจากสควอด",
  left: "ออกจากสควอดแล้ว โปรเจกต์และต้นไม้ของคุณยังอยู่ครบ",
};

export interface SeasonUnlock {
  id: string;
  label: string;
  milestone_count: number;
  deadline: string;
  earned: boolean;
  /** Its deadline (Bangkok) has passed: the database's own clock. Wins over the date check below. */
  expired?: boolean;
  /** Still earnable today (Bangkok). When the database sends it, it wins over the date check below. */
  live?: boolean;
}

export interface SeasonView {
  name: string;
  demo_day: string;
  days_to_demo: number;
  table_bar: number;
  stage_bar: number;
  /** Counted milestones this season (submitted from the start to the end of demo day, approved). */
  stage_at_cutoff: number;
  /** Which milestones were counted: a table needs 2 among them, a stage slot needs 3. */
  season_milestones?: number[];
  qualifies: "stage" | "table" | null;
  /** Also counting work sent in the season that a mentor has not decided yet (never grants anything). */
  stage_with_pending?: number;
  qualifies_with_pending?: "stage" | "table" | null;
  goal: {
    milestone: number;
    target: number;
    count: number;
    deadline: string;
    unlock: string | null;
    reached: boolean;
    reached_at?: string | null;
  } | null;
  unlocks: SeasonUnlock[];
}

/** The milestone a gallery table needs among the counted ones, and the one a stage slot needs. */
export const TABLE_MILESTONE = 2;
export const STAGE_MILESTONE = 3;

/**
 * The student qualifies only with work a mentor has not decided yet. It was
 * sent in time, so review time never costs the slot; a decline would.
 */
export const PENDING_SLOT = {
  table: "⏳ ได้โต๊ะโชว์งานใน Demo Day เมื่อพี่เลี้ยงยืนยันงานที่ส่งไว้: รอพี่เลี้ยงยืนยัน (ส่งทันกำหนดแล้ว ตรวจทีหลังก็ยังนับ)",
  stage: "⏳ ได้ขึ้นเวทีใน Demo Day เมื่อพี่เลี้ยงยืนยันงานที่ส่งไว้: รอพี่เลี้ยงยืนยัน (ส่งทันกำหนดแล้ว ตรวจทีหลังก็ยังนับ)",
};

const SLOT_RANK = { stage: 2, table: 1 } as const;

/** The better slot that pending work would give, or null when it gives nothing more than the confirmed one. */
export function pendingSlot(season: Pick<SeasonView, "qualifies" | "qualifies_with_pending">): "stage" | "table" | null {
  const pending = season.qualifies_with_pending ?? null;
  if (!pending) return null;
  return SLOT_RANK[pending] > (season.qualifies ? SLOT_RANK[season.qualifies] : 0) ? pending : null;
}

/** Open to every builder below the bars; the bars decide only gallery tables and stage slots. */
export const WIP_CORNER = "🛠️ Demo Day มีมุมงานที่ยังทำอยู่ เปิดให้ทุกคน เอางานมาให้คนลองและรับฟีดแบ็กได้ ไม่ต้องรอถึงเกณฑ์";

/**
 * Today in Bangkok as YYYY-MM-DD, taken from the database's own count
 * (demo day minus days to demo), so the bot never guesses the day boundary.
 */
export function seasonToday(season: Pick<SeasonView, "demo_day" | "days_to_demo">): string {
  const [y, m, d] = season.demo_day.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - season.days_to_demo)).toISOString().slice(0, 10);
}

/** Still earnable: the database's expired/live flag when it sends one, else the date against today. */
function stillOpen(u: SeasonUnlock, today: string): boolean {
  if (u.live !== undefined) return u.live;
  if (u.expired !== undefined) return !u.expired;
  return u.deadline.slice(0, 10) >= today;
}

/** The next unlock to aim for: the earliest one not yet earned whose deadline has not passed. */
export function nextUnlock(season: SeasonView): SeasonUnlock | undefined {
  const today = seasonToday(season);
  return season.unlocks
    .filter((u) => !u.earned && stillOpen(u, today))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.milestone_count - b.milestone_count)[0];
}

/**
 * Steps still needed for a bar that also needs one particular milestone among
 * the counted ones: the bar's shortfall, or at least one step while that
 * milestone is missing (doing it counts toward the bar too).
 */
function stepsTo(season: SeasonView, bar: number, needed: number): { steps: number; missing: boolean } {
  const missing = Array.isArray(season.season_milestones) && !season.season_milestones.includes(needed);
  return { steps: Math.max(bar - season.stage_at_cutoff, missing ? 1 : 0), missing };
}

/**
 * The season block on /island: a date, an audience, a shared goal. No ranking.
 * titleOf names a milestone for the "needs milestone 2 / 3" hint.
 */
export function seasonLines(
  season: SeasonView,
  goalTitle: string | null,
  titleOf: (milestone: number) => string | null = () => null
): string[] {
  const lines: string[] = [];
  const days = season.days_to_demo;
  const needs = (milestone: number) => ` (ต้องมีขั้น "${safe(titleOf(milestone) ?? String(milestone), 60)}" ด้วย)`;
  lines.push(
    `🎪 **${safe(season.name, 60)}**: Demo Day ${bkkDate(season.demo_day)}${days > 0 ? ` (อีก ${days} วัน)` : days === 0 ? " (วันนี้!)" : ""}`
  );
  const pending = pendingSlot(season);
  if (season.qualifies === "stage") lines.push("✅ ได้ขึ้นเวทีใน Demo Day แล้ว");
  else if (season.qualifies === "table") {
    const stage = stepsTo(season, season.stage_bar, STAGE_MILESTONE);
    if (pending === "stage") {
      lines.push("✅ ได้โต๊ะโชว์งานใน Demo Day แล้ว", PENDING_SLOT.stage);
    } else if (days >= 0) {
      lines.push(`✅ ได้โต๊ะโชว์งานแล้ว อีก ${stage.steps} ขั้นได้ขึ้นเวที${stage.missing ? needs(STAGE_MILESTONE) : ""}`);
    } else {
      lines.push("✅ ได้โต๊ะโชว์งานใน Demo Day");
    }
  } else if (pending) {
    // Below the bars on approved work alone, at a bar once the work already sent is confirmed.
    lines.push(PENDING_SLOT[pending]);
  } else if (days >= 0) {
    const table = stepsTo(season, season.table_bar, TABLE_MILESTONE);
    lines.push(`อีก ${table.steps} ขั้น ได้โต๊ะโชว์งานใน Demo Day${table.missing ? needs(TABLE_MILESTONE) : ""}`);
    lines.push(WIP_CORNER);
  }
  // Earned unlocks stay listed whatever their date; missed ones simply drop out.
  for (const u of season.unlocks.filter((x) => x.earned)) lines.push(`🎁 ปลดล็อกแล้ว: ${safe(u.label, 80)}`);
  const next = nextUnlock(season);
  if (next) lines.push(`🎁 ครบ ${next.milestone_count} ขั้นก่อน ${bkkDate(next.deadline)}: ${safe(next.label, 80)}`);
  if (season.goal) {
    const g = season.goal;
    lines.push(
      `🎯 ทั้งเกาะ: ${g.count}/${g.target} ต้นผ่านขั้น "${safe(goalTitle ?? String(g.milestone), 60)}"${
        g.reached ? " ถึงเป้าแล้ว!" : ` ก่อน ${bkkDate(g.deadline)}`
      }${g.unlock ? ` → ${safe(g.unlock, 80)}` : ""}`
    );
  }
  return lines;
}
