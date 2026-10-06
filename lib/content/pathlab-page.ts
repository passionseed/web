/**
 * Copy and imagery for the public /pathlab page.
 *
 * Kept out of the components so the Thai copy can be edited without touching
 * layout. Thai body uses Bai Jamjuree; display headings use Kodchasan — same
 * pairing as /me. Latin display stays Instrument Serif where titles are English.
 */

/**
 * Teen-first Thai phrases. The previous set ("Build in public", "Ship
 * something real") was Twitter/startup jargon that ม.4–5 readers outside
 * the dev bubble do not relate to.
 */
export const MARQUEE_PHRASES = [
  "ทำ Project ติดพอร์ตจริง",
  "ไม่ต้องมีพื้นฐาน",
  "Mentor พาทำทีละสเต็ป",
  "เริ่มจากศูนย์ได้",
  "เพื่อนได้ใช้ของที่เราทำจริง",
] as const;

/**
 * The free Micro Pathlab tier plays on the standalone map viewer at
 * /map/<id>. The id comes from NEXT_PUBLIC_MICRO_PATHLAB_MAP_ID so the CTA
 * can be pointed at the current sample case without a code change. When it
 * is unset, play-now CTAs fall back to the pricing section instead of a
 * dead link, and the free tier's card falls back to a LINE OA button so it
 * never sits without an action.
 */
const MICRO_MAP_ID = process.env.NEXT_PUBLIC_MICRO_PATHLAB_MAP_ID;

export const MICRO_PATHLAB = {
  /** Null until a sample map is configured — never render a dead /map link. */
  mapHref: MICRO_MAP_ID ? `/map/${MICRO_MAP_ID}` : null,
  /** Where "ลองฟรี" lands while no sample map is configured. */
  fallbackHref: "#pathlab-price",
  cta: "ลองฟรี 10 นาที",
  tierCta: "เริ่มทำเคสตัวอย่าง 10 นาที →",
} as const;

export interface HeroCard {
  src: string;
  alt: string;
  /** Short field label shown on the interactive fan card. */
  label: string;
  /** Position in the fan: the front card sits highest in the stack. */
  variant: "left" | "right" | "front";
}

/** Three overlapping cards, angled, in the hero. */
export const HERO_CARDS: HeroCard[] = [
  {
    src: "/pathlab/webdev.jpg",
    alt: "หน้าจอโค้ด HTML ของงานพัฒนาเว็บ",
    label: "Web Dev",
    variant: "left",
  },
  {
    src: "/pathlab/medical.jpg",
    alt: "อุปกรณ์ทางการแพทย์",
    label: "Medical",
    variant: "right",
  },
  {
    src: "/pathlab/architect.webp",
    alt: "แบบแปลนสถาปัตยกรรมพร้อมเครื่องเขียน",
    label: "Architect",
    variant: "front",
  },
];

export interface PortfolioItem {
  src: string;
  alt: string;
  /** Two or three short lines. Kept as an array so line breaks are authored. */
  lines: string[];
  /**
   * "photo" means the file is already an opaque card and fills the frame.
   * "logo" means a bare transparent mark, so the frame supplies the white
   * plate and insets the mark. Judged by the file, not by the subject: the
   * NSC logo ships as a finished card and so counts as "photo".
   */
  kind: "photo" | "logo";
}

/** "Port ที่ดีต้องการอะไร" — what belongs in a strong portfolio. */
export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    src: "/pathlab/project.webp",
    alt: "แอปพลิเคชันแผนที่บนมือถือที่ใช้งานจริง",
    lines: ["Project", "ที่ได้รับการยอมรับ", "หรือเอาไปใช้งานจริง"],
    kind: "photo",
  },
  {
    src: "/pathlab/nsc.webp",
    // The NSC file is already an opaque card, so it fills the frame like the
    // photographs. Only สอวน. is a bare transparent mark.
    alt: "โลโก้การแข่งขัน National Software Contest",
    lines: ["ชนะการแข่งขัน", "ระดับประเทศ/นานาชาติ"],
    kind: "photo",
  },
  {
    src: "/pathlab/research.webp",
    alt: "ตัวอย่างบทความวิจัยทางวิทยาศาสตร์",
    lines: ["Research Paper", "ที่ได้รับการตีพิมพ์"],
    kind: "photo",
  },
  {
    src: "/pathlab/posn.webp",
    alt: "ตราสัญลักษณ์ สอวน.",
    lines: ["สอวน."],
    kind: "logo",
  },
];

/**
 * The missing piece after the four port ingredients — Passion Seed's formula
 * that makes a portfolio actually stick: storytelling, interview, mindset.
 */
export const PORTFOLIO_FORMULA = {
  eyebrow: "สิ่งที่ขาดไม่ได้",
  title: "สูตรลับติดPort",
  body: "ชิ้นงานดีอย่างเดียวไม่พอ ต้องมีสูตรที่ทำให้พอร์ตติดตาและคุยในห้องสัมภาษณ์ได้",
  badge: "เราให้คุณ",
  pillars: [
    {
      label: "Storytelling",
      detail: "ผูกทุกชิ้นงานเป็นเส้นเรื่อง คนอ่านรู้ว่าคุณเป็นใคร",
    },
    {
      label: "Interview",
      detail: "ซ้อมเล่าโปรเจกต์ให้มั่น ตอบคำถามยากได้",
    },
    {
      label: "Mindset",
      detail: "มุมคิดนักสร้าง ที่พอร์ตและสัมภาษณ์อ่านออก",
    },
  ],
} as const;

export const HERO = {
  /* No leading slash: "/Pathlab" read as a terminal path to the teens this
     page is for. */
  title: "Pathlab",
  subtitleLines: [
    "ทำ Project ที่ออกแบบร่วมกับผู้เชี่ยวชาญของสายนั้นๆ",
    "ภายในเวลา 4-6 วัน",
  ],
  /**
   * Above-the-fold actions. Mobile visitors decide within seconds, so the
   * hero cannot be a scroll cue alone.
   */
  ctas: {
    primary: { label: "สำรวจสายที่เปิด", href: "#pathlab-fields" },
    secondary: { label: MICRO_PATHLAB.cta },
  },
  scrollCue: "[Scroll down]",
} as const;

export const PORTFOLIO_HEADING = "Port ที่ดีต้องการอะไร";

/**
 * Sits under the portfolio heading: the สอวน./NSC/research examples set a
 * high bar, so this answers the intimidation directly before it becomes
 * imposter syndrome.
 */
export const PORTFOLIO_REASSURE =
  "ไม่มีสอวน.? ไม่เคยเขียนโค้ด? ไม่เป็นไรเลย เราพาเริ่มจากศูนย์จนมีผลงานที่คนใช้จริง";

export interface ProofProject {
  src: string;
  alt: string;
  /** Two short lines: what it was, then where it landed. */
  lines: string[];
}

/**
 * Social-proof strip under the journey. The figure is a placeholder pending
 * verified numbers — swap PROOF.figure before quoting it in ads.
 */
export const PROOF = {
  figure: "200+",
  headline: "นักเรียนติดมหาวิทยาลัยที่ใช่ ด้วยซัพพอร์ทจาก Passion Seed",
  sub: "ตัวเลขจากนักเรียนที่ผ่าน Pathlab แล้วนำ Project ไปต่อยอดเป็น Port",
} as const;

/**
 * One real outcome per open field, labelled with who made it and where it
 * landed — never ship "รอใส่เคสจริง" again, an obvious placeholder kills
 * trust instantly. Verify each case with the team before paid traffic.
 */
export const PROOF_PROJECTS: ProofProject[] = [
  {
    src: "/pathlab/field-webdev.webp",
    alt: "เว็บ Flashcard ทบทวนบทเรียนของนักเรียน Pathlab สาย Web Dev",
    lines: ["น้อง ป. (ม.5)", "เว็บ Flashcard ที่เพื่อนในห้องใช้อ่านสอบจริง 120+ คน"],
  },
  {
    src: "/pathlab/field-gamedev.webp",
    alt: "เกมสั้นจากทีม Game Dev ของนักเรียน Pathlab",
    lines: ["ทีม Game Dev (ม.4-5)", "เกมสั้นที่เพื่อนต่างโรงเรียนเล่นจบ แล้วกดเล่นซ้ำ"],
  },
  {
    src: "/pathlab/field-business.webp",
    alt: "ทีม Business ทดสอบขายจริงกับลูกค้าในย่านโรงเรียน",
    lines: ["ทีม Business (ม.4)", "ทดสอบขายจริงในย่านโรงเรียน ได้ออเดอร์แรกใน 5 วัน"],
  },
];

export const JOURNEY = {
  heading: "Learning journey เป็นยังไง",
  body: "นี่คือแผนที่จริงจาก PathLab ที่นักเรียนกำลังเดินอยู่ตอนนี้ ลาก ซูม แล้วแตะแต่ละจุดดูได้เลยว่าแต่ละก้าวทำอะไร",
  src: "/pathlab/journey.webp",
  alt: "หน้าจอ Pathlab learning journey แสดงแผนที่โปรเจกต์และรายละเอียดกิจกรรมของนักเรียน",
} as const;

/**
 * Labels for the live journey map. The map itself is a real published
 * PathLab fetched from /api/maps/public-preview, so the preview can never
 * drift from the product.
 */
export const JOURNEY_MAP = {
  mapLabel: "แผนที่จริง",
  hint: "ลากเล่นได้เลย แตะแต่ละจุดว่าก้าวนั้นทำอะไร",
  ctaLabel: "ลองเดินแผนที่นี้จริง ๆ →",
} as const;

export const STATS_HEADING = "แต่การเริ่มต้นยากสุดเสมอ";

export const OFFER_HEADING = "Pathlab เลยจะช่วยเริ่มต้นให้?";

export const REVIEWS_HEADING = "Review จากรุ่นพี่";

export interface AlumniReview {
  /** The quote itself, verbatim as sent by the alumnus. */
  quote: string;
  /** Instagram handle, shown as written. */
  ig: string;
  /** Who is speaking — school year and faculty. Omitted when not given. */
  by?: string;
}

/** "Review จากรุ่นพี่" — alumni comments. More are added as they come in. */
export const REVIEWS: AlumniReview[] = [
  {
    quote:
      "ถ้าไม่มีพื้นฐาน แค่พกใจมาก็พอ เริ่มจากศูนย์ ได้ลงมือเขียนโค้ดจริง ทำโปรเจกต์จริง และใช้ได้จริง",
    ig: "IG:xn_z96x",
    by: "รุ่นพี่ ม.บูรพา สาขาวิทยาการคอมพิวเตอร์",
  },
  {
    quote:
      "สอนเข้าใจง่ายมาก เรียนสนุก นอกจากนี้ยังได้เจอเพื่อนๆ และรุ่นพี่ในสายในวงการเดียวกัน เรียนเสร็จเลยได้กำลังใจ แรงบันดาลใจมาเต็มเลย",
    ig: "IG:cathatput_02",
    by: "รุ่นพี่จุฬา CEDT",
  },
  {
    quote:
      "ถ้าอยากแลของหรอย ๆ อยากเรียน Tech แบบเข้าใจง่าย ๆ แนะนำให้มาแล Techseed กันตะพี่บ่าวทั้งหลาย เขาสอนดีนิ อธิบายเข้าใจง่าย",
    ig: "IG:victorchenspec",
    by: "รุ่นพี่บางมด วิศวะกรรมระบบปัญญาประดิษฐ์",
  },
  {
    quote:
      "มีอะไรสงสัยก็ช่วยกันเต็มที่ ไม่ปล่อยให้เรานั่งงงอยู่คนเดียว ใครกำลังหาที่เรียน Tech ดี ๆ ลองมาแล Techseed กันหล่าว",
    ig: "IG:victorchenspec",
    by: "รุ่นพี่บางมด วิศวะกรรมระบบปัญญาประดิษฐ์",
  },
  {
    quote: "โคตรโหดโคตรมันส์โคตรฮา💯",
    ig: "IG:_ppangkorn",
  },
  {
    quote: "ของดีคับ 🤫 🤫 🤫 🐄",
    ig: "IG:how_to_fried_a_chicken",
  },
];

export const FIELDS_HEADING = "สายที่เปิดในตอนนี้";

/** Tells the reader the cards open, before they hover or tap one. Written
    like a note from a friend, not an instruction manual. */
export const FIELDS_HINT = "กดดูแต่ละสายได้เลย เล่าให้หมดว่า 5 วันทำอะไรบ้าง";

/** Labels inside an opened path. */
export const FIELD_DETAIL_LABELS = {
  back: "← กลับไปดูสายอื่น",
  reality: "คนสายนี้ทำอะไรจริง ๆ",
  brief: "โจทย์ของเรารอบนี้",
  /** Suffixed with the path's own day count, which differs between paths. */
  daysPrefix: "วันนี้เป็นยังไง",
  outcomes: "จบแล้วคุณจะ…",
  basis: "ต้องมีพื้นฐานไหม?",
  basisAnswer: "ไม่ต้อง เริ่มจากศูนย์ได้",
  /** Suffixed with the field label so the DM arrives with context. */
  ctaPrefix: "ทัก IG ถามเรื่องสาย",
  price: "โปร ส.ค. 299฿ (ปกติ 699฿) ฟรี Community + Mentoring · เลื่อนลงดูรายละเอียดราคา",
  /** Appended to the card's accessible name. */
  cardAction: "ดูรายละเอียด 5 วัน",
  cardCue: "ดู 5 วันนี้ →",
} as const;

export const PRICE_HEADING = "เลือกทางเริ่มต้น";

export const CONTACT = {
  line: "สนใจทักมาคุยกันได้เลย",
  handle: "passion_seed.th",
  /** Instagram deep link, so the handle is a real destination not just text. */
  href: "https://instagram.com/passion_seed.th",
  /**
   * LINE OA sits next to IG: rich menu and instant bot replies make booking
   * lower-friction than a cold DM. Same destination as lib/my-path/consult.ts.
   */
  lineLabel: "LINE OA",
  lineHref: "https://lin.ee/uFruUqa",
} as const;

/** The two actions pinned to the bottom of the screen on touch devices. */
export const MOBILE_CTA = {
  primary: MICRO_PATHLAB.cta,
  chat: "ทักแชทปรึกษาฟรี",
} as const;

/**
 * Basecamp-style margin notes: short, warm asides set in highlighter at a
 * casual angle (.pathlab-note). One per section, never more. They are the
 * seasoning, not the meal — each says the quiet human thing the section
 * copy cannot say formally.
 */
export const NOTES = {
  shiftGallery: "ยังไม่ต้องมีไอเดียเป๊ะ ๆ แค่พร้อมลงมือก็เริ่มได้",
  hero: "ไม่ใช่คอร์สดูคลิปนะ ได้ลงมือทำจริง",
  stats: "คนที่เริ่ม ม.5 ไม่ได้เก่งกว่า แค่เริ่มก่อน",
  offer: "กลุ่มละ 4 คนเท่านั้น mentor อยู่ใกล้จริง",
  proof: "ทุกคนเริ่มจากไม่มีพอร์ตเหมือนกัน",
  journey: "แผนที่จริงที่น้อง ๆ ใช้อยู่ตอนนี้เลย",
  reviews: "รุ่นพี่เขียนเองทุกคน ไม่ได้จ้างนะ",
  price: "ราคานี้เฉพาะช่วงทดสอบ Beta เท่านั้น ได้ทั้งโปรเจกต์ทั้งคอมมูนิตี้",
  contact: "ทักมาเล่น ๆ ก่อนก็ได้ ยังไม่ต้องสมัคร",
  parentsWhat: "ลูกไม่ต้องเก่งมาก่อน แค่พร้อมลองทำจริง",
  parentsProof: "เราดูที่ของที่เด็กทำได้ ไม่ได้ดูแค่ชั่วโมงเรียน",
  parentsPrice: "มีคำถามเรื่องรอบหรือเวลา ทักมาถามก่อนได้เลย",
  /* /pathlab/partner — the expert invitation. These talk to the expert the
     link was forwarded to, not to students. */
  partnerHero: "ถ้าเพื่อนส่งลิงก์นี้มาให้ แปลว่าเขานับถือฝีมือคุณนะ",
  partnerGoal: "เด็กท่องสูตรเก่ง แต่ไม่เคยเห็นหน้างานจริงสักครั้ง",
  partnerModes: "เลือกอันที่ใกล้ตัวคุณที่สุดได้เลย ไม่ต้องมีครบทุกแบบ",
  partnerProof: "ทุกตัวอย่างเริ่มจากคนที่ทำงานจริง",
  partnerExchange: "งานของคุณ คุณคุมเองได้เสมอ",
  partnerContact: "คุยกันก่อนได้ ยังไม่ต้องตัดสินใจ",
} as const;

/**
 * Poster-only copy for /pathlab/poster. The poster is a dated print
 * artifact, not a mirror of the live sections: it names real round dates and
 * curates its own comment picks, so that wording lives here. Amounts,
 * currencies and field labels are still pulled from PRICE_TIERS / FIELDS at
 * render time so the numbers can never drift from the site.
 */
export const POSTER = {
  headline: "หาสายที่ใช่ ผ่านการทำ Professional Project",
  subline: "5 วัน เลือก 1 สายที่อยากลองทำ Project",
  /** The four fields the poster promotes, matched against FIELDS by label. */
  fieldLabels: ["Web Dev", "Game Dev", "Business Innovation", "Medical"],
  /** The round's actual meeting times, under the fields. */
  schedule: "เจอกัน เสาร์-อาทิตย์ 22-23 และ พุธ-ศุกร์ 26-28 · 19:00-21:00",
  /** Rubber-stamp badge tossed beside the hero: the number-one worry, answered.
      The space is deliberate, it sets the line break inside the stamp. */
  stamp: "ไม่ต้องมี พื้นฐาน",
  commentsHeading: "Comment จากรุ่นพี่",
  /**
   * Verbatim as sent. The first two also live in REVIEWS; ohm_kyzz is
   * poster-only. Not rendered on the poster right now (it went image-first),
   * kept here as the curated quote bank for print material.
   */
  comments: [
    {
      quote:
        "สอนเข้าใจง่ายมาก เรียนสนุก นอกจากนี้ยังได้เจอเพื่อน ๆ และรุ่นพี่ในสายในวงการเดียวกัน เรียนเสร็จเลยได้กำลังใจ แรงบันดาลใจมาเต็มเลย",
      ig: "IG:cathatput_02",
      by: "รุ่นพี่จุฬา CEDT",
    },
    {
      quote:
        "ถ้าอยากแลของหรอย ๆ อยากเรียน Tech แบบเข้าใจง่าย ๆ แนะนำให้มาแล Techseed กันตะพี่บ่าวทั้งหลาย เขาสอนดีนิ อธิบายเข้าใจง่าย",
      ig: "IG:victorchenspec",
      by: "รุ่นพี่บางมด วิศวะกรรมระบบปัญญาประดิษฐ์",
    },
    {
      quote: "งานที่จะทำให้น้องๆเข้าใจการทำงานในสาย tech มากขึ้น",
      ig: "IG:ohm_kyzz",
      by: "รุ่นพี่ลาดกระบัง IT",
    },
  ],
  /**
   * The poster's price rows keep only what a reader needs; the amounts and
   * currency still come from PRICE_TIERS, keyed by tone.
   */
  priceUnits: { solo: "ต่อคน", group: "ทั้งกลุ่ม 4 คน · private class" },
  /** 999 ÷ 4 — the group deal quietly beats going solo. */
  priceNote: "มาเป็นกลุ่ม ตกคนละไม่ถึง 250 เอง",
} as const;

/**
 * Poster-only copy for the IG Hero poster (`/pathlab/poster/instagram-hero`).
 * A 10x rebuild of the A4 markered sheet, refitted for an Instagram feed
 * thumb-stop. Lives here so the hero sheet never has to reach into the
 * landing-page copy. Three variants (4:5 portrait, 1:1 square, 9:16 story)
 * share the same word bank: tier-1 name, tier-2 promise, tier-3 proof,
 * tier-4 alumni, tier-5 schedule, tier-6 CTA.
 */
export const POSTER_HERO = {
  /** Tiny eyebrow above the name, set in gold for warmth on dark hero. */
  eyebrow: "Pathlab × Passion Seed",
  /** Tier 1: the brand line a teen reads first. */
  name: "Pathlab",
  /** Tier 2: the single promise that fits a 4-second thumb-stop. */
  promise: "ทำ Project จริง จบใน 4-6 วัน",
  /** Tier 2b: the consequence, the moment the eye stays. */
  consequence: "ได้ผลงานลง Port ทันที",
  /** Three short lines that earn the promise. Read as one breath. */
  proofLines: [
    "ทำ Project ออกแบบร่วมกับผู้เชี่ยวชาญของสายนั้น",
    "มี Mentor ดูแลใกล้ชิด กลุ่มละ 4 คน",
    "เลือกสายที่อยากลอง ไม่ต้องมีพื้นฐาน",
  ],
  /** Two alumni quotes, the line under the proof. */
  alumni: [
    {
      quote: "เริ่มจากศูนย์ ได้ลงมือเขียนโค้ดจริง ทำโปรเจกต์จริง",
      ig: "IG:xn_z96x",
    },
    {
      quote: "เรียนสนุก ได้ทั้งเพื่อน รุ่นพี่ และแรงบันดาลใจ",
      ig: "IG:cathatput_02",
    },
  ],
  /** Tier 4: dates, so the reader knows the window. */
  schedule: "เสาร์-อาทิตย์ 22-23 และ พุธ-ศุกร์ 26-28",
  /** Tier 5: the next step. Quiet, two lines. */
  ctaEyebrow: "สนใจทักมาคุยกันได้เลย",
  ctaHandle: "IG @passion_seed.th",
  /** The stamp message that lives in the corner seal. */
  stamp: "ไม่ต้องมีพื้นฐาน",
  /** The single margin note tucked into a top corner. */
  note: "Project ที่ออกแบบร่วมกับผู้เชี่ยวชาญของสายนั้น",
} as const;

/**
 * Poster-only copy for /pathlab/poster/how-we-learn — the print artifact
 * that explains how a Pathlab actually runs. Same editorial rule as POSTER:
 * wording lives here, but the example days and field labels are pulled from
 * FIELDS at render time so the example can never drift away from the
 * product.
 *
 * The page shows a live zigzag island trail fetched from
 * /api/maps/public-preview (so the islands are real PathLab nodes), then
 * pulls three example days from the Web Dev path so a reader can see what
 * "ทำ Project จริง" actually looks like, day by day.
 */
export const POSTER_HOW = {
  /** The big Tier 1 title. Reads from across the room. */
  title: "เรียนยังไง?",
  /** The Tier 2 promise under the title. One sentence, no list. */
  promise:
    "ทำ Project จริงทีละเกาะ เริ่มจากโจทย์ แล้วเดินต่อจนได้ของที่คนใช้ได้จริง",
  /** The single margin note tucked into a top corner. */
  note: "แผนที่นี้คือ PathLab ที่น้อง ๆ กำลังเดินอยู่ตอนนี้",
  /** Section eyebrow over the island trail. */
  islandEyebrow: "แผนที่จริง",
  islandHint: "แต่ละเกาะคือขั้นที่น้อง ๆ ต้องเดินผ่าน",
  /** Section eyebrow over the example days. */
  daysEyebrow: "ตัวอย่าง 3 วันจากสาย Web Dev",
  /** Three sample days — Web Dev's actual days, picked to show the arc:
      setup → first working thing → ship. The component pulls these from
      FIELDS so the wording never drifts from the live product. */
  daysIndices: [0, 1, 4] as const,
  /** Footer CTA on the sheet. */
  ctaEyebrow: "อยากลองเดินเอง",
  ctaHandle: "IG: @passion_seed.th",
} as const;

/**
 * Poster-only copy for /pathlab/poster/med and its social sibling. Mirrors
 * the editorial rule of POSTER/POSTER_HOW: wording lives here so the sheet
 * is dated, but the deal panel and field labels stay shared with the rest
 * of the site. Medical doesn't have a published `detail.days` block yet,
 * so a representative 5-day arc lives here as a teaser of what running a
 * Med round looks like.
 */
export const POSTER_MED = {
  /** The big Tier 1 title on the A4 sheet. */
  title: "เรียนยังไง?",
  /** The Tier 2 promise under the title. */
  promise:
    "ทำงานจริงทีละวัน เริ่มจากคนไข้จำลอง แล้วเดินต่อจนได้ของที่ใช้ในสายแพทย์ได้จริง",
  /** Big Tier 3 headline under the marker note. */
  headline: "หาว่าสายแพทย์ใช่เราไหม ผ่านการทำงานจริง",
  /** Smaller Tier 4 subline. */
  subline: "5 วัน เลือก 1 สายที่อยากลองทำงาน",
  /** Single margin note tucked into a top corner. */
  note: "แผนที่นี้คือตัวอย่าง 5 วันจากสายแพทย์ที่น้อง ๆ จะได้เดิน",
  /** Rubber-stamp badge beside the hero: the number-one worry, answered. */
  stamp: "ไม่ต้องมี พื้นฐาน",
  /** Section eyebrow over the day map. */
  daysEyebrow: "ตัวอย่าง 5 วันจากสายแพทย์",
  daysHint: "แต่ละวันคือขั้นที่น้อง ๆ จะเดินผ่าน",
  /** Five representative days that show the arc of a Med round: setup →
      first patient encounter → analysis → research → presentation. The
      component reads these directly so the wording is the only source of
      truth on the print sheet. */
  days: [
    {
      title: "ตั้งเครื่องมือ + ทบทวนพื้นฐาน",
      doing:
        "อ่านเคสผู้ป่วยจำลอง ทบทวน anatomy เบื้องต้น ลงเครื่องมือวัดสัญญาณชีพและฝึกใช้",
      gets: "ชุดเครื่องมือพร้อมใช้",
    },
    {
      title: "เจอคนไข้ตัวจริง",
      doing:
        "นั่งฟังอาการจากคนไข้จำลอง ถามประวัติ ตรวจร่างกายเบื้องต้น จดบันทึกอาการสำคัญ",
      gets: "ประวัติคนไข้ 1 เคส",
    },
    {
      title: "วิเคราะห์อาการ",
      doing:
        "รวบอาการ + ผลตรวจ ตั้งสมมติฐานโรคที่เป็นไปได้ เทียบกับเกณฑ์วินิจฉัย เลือกแนวทางตรวจเพิ่ม",
      gets: "แผนวิเคราะห์ 1 เคส",
    },
    {
      title: "ค้นงานวิจัยจริง",
      doing:
        "ค้นงานวิจัยจาก PubMed เทียบวิธีรักษา เลือกแนวทางที่หลักฐานหนุน สรุปเป็นสไลด์สั้น ๆ",
      gets: "Evidence-based plan",
    },
    {
      title: "นำเสนอแผนรักษา",
      doing:
        "นำเสนอแผนรักษาต่อแพทย์ที่ปรึกษา รับฟีดแบ็ก แก้ตามที่ได้ยิน แล้วส่งต่อให้คนไข้จำลองดูจริง",
      gets: "แผนรักษาที่ส่งต่อได้",
    },
  ] as const,
  /** Footer CTA on the sheet. */
  ctaEyebrow: "อยากลองเดินเอง",
  ctaHandle: "IG: @passion_seed.th",
} as const;

export interface PriceTier {
  /** Who it is for / tier name. */
  label: string;
  /** The figure alone, so it can be coloured without markup in the string. */
  amount: string;
  /** Original regular price shown with strikethrough when discounted. */
  originalAmount?: string;
  /** Currency or free marker shown before/with amount. */
  currency?: string;
  /** What the figure covers. */
  unit: string;
  /** One-line pitch under the price. */
  blurb: string;
  /** Key perks / bonuses included in this tier. */
  perks?: string[];
  /** Visual weight: free is soft, featured is the highlighted deal. */
  tone: "free" | "solo" | "featured" | "group";
  /** Optional chip above the amount. */
  chip?: string;
  /** Optional in-card action — the free tier plays straight into the product. */
  cta?: { label: string; href: string };
}

export const PRICE_TIERS: PriceTier[] = [
  {
    label: "Micro Pathlab",
    amount: "ฟรี",
    unit: "วันละ 1 ครั้ง · ~10 นาที",
    blurb: "ลองโปรเจกต์จิ๋วทุกวัน ไม่เสียค่าใช้จ่าย รู้เร็วว่าสายนี้ดึงดูดไหม",
    tone: "free",
    chip: "เริ่มวันนี้",
    /* Zero-friction lead into the product once a sample map exists; until
       then the card points at LINE OA rather than sitting without an action. */
    cta: MICRO_PATHLAB.mapHref
      ? { label: MICRO_PATHLAB.tierCta, href: MICRO_PATHLAB.mapHref }
      : { label: "ทัก LINE OA →", href: CONTACT.lineHref },
  },
  {
    label: "Pathlab รอบเต็ม",
    originalAmount: "699",
    amount: "299",
    currency: "฿",
    unit: "ต่อคน · รอบ 4-6 วัน (ราคาปกติ 699฿)",
    blurb: "ราคาพิเศษเฉพาะเดือนสิงหาคม ช่วงทดสอบระบบ Beta เพื่อนำฟีดแบ็กจริงมาพัฒนาโปรดักต์",
    tone: "featured",
    chip: "โปรพิเศษ ส.ค. (Beta Launch)",
    perks: [
      "+ ฟรี! 1 เดือน Project Community (มูลค่า 679฿ / เดือน)",
      "+ ฟรี! Interview Hack Mentoring ซ้อมสัมภาษณ์พอร์ต",
      "ทำ Project จริง 1 ชิ้น จบใน 4-6 วัน มีผลงานลง Port ทันที",
      "มี Mentor ดูแลใกล้ชิดตลอดทั้งรอบ",
    ],
  },
];

/** How the rounds work. Authored as lines so the breaks are deliberate. */
export const PRICE_NOTES: string[] = [
  "ราคาพิเศษ 299฿ (จากปกติ 699฿) เฉพาะเดือนสิงหาคมนี้ สำหรับช่วงทดสอบระบบ Beta เพื่อนำฟีดแบ็กจริงมาพัฒนาต่อ",
  "รับฟรีทันที! สิทธิ์เข้า Project Community 1 เดือน (มูลค่า 679฿) และ Interview Hack Mentoring ซ้อมสัมภาษณ์พอร์ตกับ Mentor",
  "Pathlab จัดรอบละ 4 คน เราจัดกลุ่มและหาเวลาร่วมให้ พร้อม mentor ดูแลใกล้ชิดตลอด 4-6 วัน",
];

/** Booking actions under the price notes: IG first, LINE as the easier door. */
export const PRICE_CTAS = {
  ig: "ทัก IG เพื่อจองรอบ →",
  line: "ทัก LINE OA →",
} as const;

/** One day of a path: what you do, and what you walk away holding. */
export interface FieldDay {
  title: string;
  /** One line on the day's work. */
  doing: string;
  /** The artefact the day produces, shown as a chip. */
  gets: string;
}

/**
 * The expanded view of a path. Optional on FieldCard: a field without one
 * renders as a plain tile and cannot be opened, so copy can land field by
 * field without a code change.
 */
export interface FieldDetail {
  /** The field in a sentence, under the title. */
  tagline: string;
  /** Short project name for the grid card, where space is tight. */
  briefShort: string;
  /** The project stated in full, as the brief block's headline. */
  brief: string;
  /** The situation and what gets built. */
  briefDetail: string;
  /** Who the project was designed with. */
  briefBy: string;
  /** Three concrete, non-obvious truths about the work. */
  reality: string[];
  /** One entry per day of the round; length varies by path (5 or 6). */
  days: FieldDay[];
  /** Three outcomes; the first is the self-discovery one and leads. */
  outcomes: string[];
  /**
   * An alumni quote answering "do I need a background for this?". Omitted on
   * a path that has not run yet: inventing a testimonial for a round nobody
   * has taken would be a lie, so the block simply drops it.
   */
  quote?: string;
  /** Attribution for the quote, as written. */
  cite?: string;
}

export interface FieldCard {
  /** Omitted on the "ask us" tile, which is drawn rather than photographed. */
  src?: string;
  alt?: string;
  label: string;
  /**
   * The closing tile: a dark "?" card inviting people to ask about a field
   * that is not listed. Not a path, so it carries no image and its label wraps
   * to two lines.
   */
  ask?: boolean;
  /** Present only on fields whose five-day copy is written. */
  detail?: FieldDetail;
}

/** The full catalogue of paths. Artwork is pre-cut to a shared 876x1171 frame. */
export const FIELDS: FieldCard[] = [
  {
    src: "/pathlab/field-webdev.webp",
    alt: "หน้าจอเว็บ Flashcard ทบทวนบทเรียนบนมือถือ",
    label: "Web Dev",
    detail: {
      tagline: "สร้างเว็บที่คนใช้จริงได้ ตั้งแต่หน้าจอจนถึงหลังบ้าน",
      briefShort: "เว็บ Flashcard ทบทวนบทเรียน",
      brief: "ทำเว็บ Flashcard ทบทวนบทเรียน ที่เพื่อนเอาไปใช้อ่านสอบจริง",
      briefDetail:
        "ทุกคนเคยท่องศัพท์หรือสูตรก่อนสอบแล้วลืมหมดในสามวัน คุณจะได้ทำเว็บที่สร้างการ์ดคำถาม-คำตอบเองได้ กดพลิกดูเฉลย แล้วให้ระบบวนการ์ดที่ยังตอบผิดกลับมาถามซ้ำ จบรอบเอาไปให้เพื่อนในห้องใช้อ่านสอบจริง",
      briefBy: "ออกแบบร่วมกับ Software Engineer ตัวจริงในสาย",
      reality: [
        "ถกกับคนใช้จริงว่าปุ่มควรอยู่ตรงไหน ไม่ใช่แค่นั่งเขียนโค้ดคนเดียว",
        "งานพังตอนตีสองเป็นเรื่องปกติ การไล่หาสาเหตุคือทักษะหลักของสายนี้",
        "ของที่ทำเสร็จแล้วมีคนใช้ ดีกว่าของที่สวยแต่ยังไม่ได้ปล่อย",
      ],
      days: [
        {
          title: "ตั้งเครื่องมือ + วางโครง",
          doing:
            "ลง OpenCode ต่อ GitHub แล้วเปิดโปรเจกต์ Next.js ตัวแรก วางโครงหน้าการ์ดด้วย HTML/CSS",
          gets: "โปรเจกต์บน GitHub",
        },
        {
          title: "เขียนโค้ดให้กดได้",
          doing:
            "ใช้ JavaScript ใน React ดักการคลิกแล้วสั่งให้การ์ดพลิกดูเฉลย รู้จัก state และ event",
          gets: "การ์ดที่กดพลิกได้",
        },
        {
          title: "ต่อ Supabase",
          doing:
            "สร้างตารางบน Supabase แล้วเขียนคำสั่งเพิ่ม-อ่าน-ลบการ์ด ปิดเว็บแล้วเปิดใหม่ข้อมูลยังอยู่ครบ",
          gets: "ฐานข้อมูลที่ใช้ได้จริง",
        },
        {
          title: "เขียนระบบทบทวน",
          doing:
            "เขียนเงื่อนไขให้ระบบจำว่าการ์ดไหนตอบผิด แล้ววนกลับมาถามซ้ำถี่กว่าการ์ดที่ตอบถูก",
          gets: "ระบบที่ช่วยจำได้จริง",
        },
        {
          title: "Deploy ด้วย Vercel",
          doing:
            "ต่อ GitHub เข้ากับ Vercel กด deploy จนได้ลิงก์ที่ส่งให้ใครเปิดก็ได้ แล้วซ้อมเล่าโปรเจกต์",
          gets: "ลิงก์จริง + สคริปต์เล่า Port",
        },
      ],
      outcomes: [
        "รู้ว่าสายนี้ใช่ทางคุณไหม",
        "ได้เว็บที่มีลิงก์จริง เพื่อนใช้อ่านสอบได้ ลง Port ได้เลย",
        "รู้ว่าถ้าจะไปต่อสายนี้ ต้องเตรียมอะไร",
      ],
      quote:
        "ถ้าไม่มีพื้นฐาน แค่พกใจมาก็พอ เริ่มจากศูนย์ ได้ลงมือเขียนโค้ดจริง ทำโปรเจกต์จริง และใช้ได้จริง",
      cite: "IG:xn_z96x · รุ่นพี่ ม.บูรพา สาขาวิทยาการคอมพิวเตอร์",
    },
  },
  {
    src: "/pathlab/field-business.webp",
    alt: "การประชุมวิเคราะห์ข้อมูลธุรกิจ",
    label: "Business Innovation",
    detail: {
      tagline: "หาให้เจอว่าคนยอมจ่ายเพื่ออะไร แล้วเล่าให้คนอื่นเชื่อ",
      briefShort: "ปั้นสตาร์ทอัพของตัวเองจนได้พิตช์",
      brief: "เข้า LaunchPad, accelerator จำลอง 6 วัน, ปั้นสตาร์ทอัพจากศูนย์จนได้พิตช์เด็ค",
      briefDetail:
        "เริ่มจากล่าปัญหาที่คุณเจอเองจริง ๆ แล้วไล่ไปทีละวัน, ใครคือลูกค้า, จะเก็บเงินยังไง, ทำ MVP ออกมาให้จับต้องได้, วางแผนหาผู้ใช้ 100 คนแรก, จบที่วันพิตช์, ระหว่างทางมี Founder XP กับ Startup Health Score คอยบอกว่าการตัดสินใจของคุณทำให้ธุรกิจรอดหรือร่วง",
      briefBy: "ออกแบบร่วมกับผู้ก่อตั้งธุรกิจตัวจริง",
      reality: [
        "ถ้าตอบว่าลูกค้าคือ 'ทุกคน' แปลว่ายังไม่มีลูกค้า งานจริงคือเลือกคนให้แคบลง",
        "ไอเดียที่คุณรักที่สุด มักเป็นไอเดียที่ตลาดบอกว่าไม่เอา และต้องยอมทิ้งให้เป็น",
        "ของที่ปล่อยออกมาแบบยังไม่สวย แต่ได้เรียนรู้เร็ว ชนะแผนสวย ๆ ที่ไม่มีใครเคยเห็น",
      ],
      days: [
        {
          title: "ล่าปัญหา",
          doing:
            "ลิสต์ปัญหาที่เจอเองในสัปดาห์นี้, ให้คะแนนความเจ็บกับความถี่ แล้วเลือกอันที่คุ้มแก้ที่สุด",
          gets: "Problem statement ที่ชัด",
        },
        {
          title: "หาลูกค้าให้เจอ",
          doing:
            "ปั้น persona ลูกค้าคนแรกให้ละเอียด แล้วเขียนคำถามปลายเปิดไว้ทดสอบสมมติฐานของตัวเอง",
          gets: "การ์ด persona + คำถามทดสอบ",
        },
        {
          title: "โมเดลธุรกิจ",
          doing:
            "กรอก Lean Canvas เลือกวิธีหารายได้ แล้วคำนวณจริงว่าขายเท่านี้ได้กำไรหรือขาดทุน",
          gets: "Lean Canvas + ตัวเลขรายได้",
        },
        {
          title: "ทำ MVP",
          doing:
            "ลงมือทำของจริงที่เล็กที่สุด, landing page, storyboard หรือ prototype แล้วลองส่งให้คนอื่นดู",
          gets: "MVP ที่จับต้องได้",
        },
        {
          title: "หาผู้ใช้ 100 คนแรก",
          doing:
            "วางแผนหาผู้ใช้โดยห้ามยิงแอดใน 50 คนแรก แล้วทำคอนเทนต์จริงหนึ่งชิ้นลงโซเชียล",
          gets: "แผนโต + คอนเทนต์จริง",
        },
        {
          title: "Pitch Day",
          doing:
            "ทำพิตช์เด็ค 7 สไลด์ แล้วซ้อมพูดสคริปต์ 60 วินาที ให้คนนอกเชื่อในไอเดียของคุณ",
          gets: "พิตช์เด็ค + สคริปต์เล่า Port",
        },
      ],
      outcomes: [
        "รู้ว่าสายนี้ใช่ทางคุณไหม",
        "ได้พิตช์เด็คกับ MVP ที่เล่าเป็นเรื่องได้ ลง Port ได้เลย",
        "รู้ว่าตัวเองชอบบทบาทไหน, โปรดักต์ การตลาด การเงิน หรือขาย",
      ],
      quote:
        "สอนเข้าใจง่ายมาก เรียนสนุก นอกจากนี้ยังได้เจอเพื่อน ๆ และรุ่นพี่ในสายในวงการเดียวกัน",
      cite: "IG:cathatput_02 · รุ่นพี่จุฬา CEDT",
    },
  },
  {
    src: "/pathlab/field-gamedev.webp",
    alt: "นักพัฒนาเกมทำงานกับ Unity",
    label: "Game Dev",
    detail: {
      tagline: "ทำให้คนเล่นรู้สึกบางอย่าง ด้วยระบบที่คุณออกแบบเอง",
      briefShort: "เกมสั้นที่คนอื่นได้เล่นจริง",
      brief: "ทำเกมสั้น ๆ ที่เล่นจบใน 3 นาที แล้วเอาไปให้คนแปลกหน้าเล่น",
      briefDetail:
        "เกมสั้นแต่ต้องจบจริง มีจุดเริ่ม จุดจบ และเหตุผลให้เล่นซ้ำ คุณจะได้นั่งดูคนที่ไม่เคยเห็นเกมคุณมาก่อนลองเล่น แล้วแก้ตามสิ่งที่เห็น ไม่ใช่ตามสิ่งที่คิดเอง",
      briefBy: "ออกแบบร่วมกับ Game Developer ตัวจริงในสาย",
      reality: [
        "เกมสนุกไม่ได้มาจากไอเดีย แต่มาจากการแก้ค่าทีละนิดหลังดูคนเล่นจริง",
        "งานส่วนใหญ่คือทำของเล็ก ๆ ให้จบ ไม่ใช่ทำเกมใหญ่ที่ไม่มีวันเสร็จ",
        "ศิลปะ โค้ด และเสียง ต้องคุยกันรู้เรื่อง ทีมที่คุยกันไม่ได้คือเกมที่ไม่ได้ออก",
      ],
      days: [
        {
          title: "หาแกนสนุก",
          doing: "ลองกลไกหลักบนกระดาษก่อนแตะโปรแกรม",
          gets: "แกนเกมที่ชัด",
        },
        {
          title: "ต่อเป็นเกม",
          doing: "ทำให้เล่นได้จริงแม้จะยังไม่สวย",
          gets: "ตัวเล่นได้ตัวแรก",
        },
        {
          title: "ใส่ความรู้สึก",
          doing: "เสียง เอฟเฟกต์ จังหวะ ที่ทำให้รู้สึกดี",
          gets: "เกมที่มีฟีล",
        },
        {
          title: "ให้คนเล่นจริง",
          doing: "ดูคนเล่นเงียบ ๆ แล้วแก้ตามที่เห็น",
          gets: "เวอร์ชันที่คนเล่นรู้เรื่อง",
        },
        {
          title: "ปล่อยเกม",
          doing: "ปล่อยขึ้นออนไลน์แล้วซ้อมเล่าโปรเจกต์",
          gets: "ลิงก์เล่นได้ + สคริปต์เล่า Port",
        },
      ],
      outcomes: [
        "รู้ว่าสายนี้ใช่ทางคุณไหม",
        "ได้เกมที่คนกดเล่นได้จริง ลง Port ได้เลย",
        "รู้ว่าถ้าจะไปต่อสายนี้ ต้องเตรียมอะไร",
      ],
      quote: "มีอะไรสงสัยก็ช่วยกันเต็มที่ ไม่ปล่อยให้เรานั่งงงอยู่คนเดียว",
      cite: "IG:victorchenspec · รุ่นพี่บางมด วิศวกรรมระบบปัญญาประดิษฐ์",
    },
  },
  {
    src: "/pathlab/field-aviation.webp",
    alt: "วิศวกรกำลังตรวจสอบปีกเครื่องบินพร้อมคลิปบอร์ดจดบันทึก",
    label: "วิศวะการบิน",
    detail: {
      tagline: "ออกแบบสิ่งที่ต้องบินได้จริง แล้วพิสูจน์ด้วยตัวเลขว่ามันไม่ตก",
      briefShort: "ออกแบบปีกเครื่องบินส่งของ",
      brief: "ออกแบบปีกเครื่องบินส่งของข้ามเกาะ ให้บินได้ไกลที่สุดด้วยพลังงานที่มีจำกัด",
      briefDetail:
        "โจทย์คือเครื่องบินส่งของที่ต้องแบกน้ำหนักข้ามเกาะ โดยมีพลังงานจำกัด คุณจะได้ออกแบบปีกใน XFLR5 ซึ่งเป็นโปรแกรมวิเคราะห์อากาศพลศาสตร์ที่วิศวกรและคนทำเครื่องบินเล็กใช้จริง แล้วทดสอบซ้ำจนหาจุดที่บินได้ไกลที่สุด ทุกการตัดสินใจต้องมีตัวเลขรองรับ ไม่ใช่เพราะมันดูสวย",
      briefBy: "ออกแบบจากโจทย์จริงที่วิศวกรการบินต้องเจอ",
      reality: [
        "งานจริงคือคำนวณและทดสอบซ้ำ ๆ ไม่ใช่การได้ขับเครื่องบิน",
        "ทุกอย่างต้องแลกกัน ปีกใหญ่ยกของได้ดีขึ้นแต่ก็ต้านลมมากขึ้นด้วย",
        "ของที่พังตอนทดสอบดีกว่าพังตอนใช้จริง วิศวกรเลยตั้งใจทำให้มันพังก่อน",
      ],
      days: [
        {
          title: "ทำไมมันถึงบินได้",
          doing:
            "เรียนแรงสี่แรง lift drag thrust weight แล้วลงโปรแกรม XFLR5 ลองปีกต้นแบบจนเห็นว่าค่าไหนทำให้มันร่วง",
          gets: "อ่านกราฟการบินเป็น",
        },
        {
          title: "ออกแบบปีก",
          doing:
            "ลองเปลี่ยนรูปทรง airfoil ความยาวปีก และมุมปะทะ แล้วจดว่าแต่ละค่าทำให้แรงยกกับแรงต้านเปลี่ยนยังไง",
          gets: "ปีกที่ยกน้ำหนักได้",
        },
        {
          title: "ชนกำแพง tradeoff",
          doing:
            "เพิ่มน้ำหนักของที่ต้องส่งจนเครื่องบินไม่ไหว แล้วตัดสินใจว่าจะยอมแลกอะไรกับอะไร พร้อมเหตุผล",
          gets: "สเปกที่ยอมแลกอย่างมีเหตุผล",
        },
        {
          title: "ทดสอบจนพัง",
          doing:
            "รันทดสอบหลายรอบ เก็บตัวเลขทุกรอบลงตาราง แล้วไล่หาว่าตัวแปรไหนทำให้ระยะทางตก",
          gets: "ตารางข้อมูลการทดสอบ",
        },
        {
          title: "Design Review",
          doing:
            "ทำเอกสารสรุปแบบพร้อมกราฟ แล้วซ้อมตอบคำถามว่าทำไมถึงเลือกแบบนี้ เหมือนที่วิศวกรต้องป้องกันแบบของตัวเอง",
          gets: "แบบ + กราฟ + สคริปต์เล่า Port",
        },
      ],
      outcomes: [
        "รู้ว่าสายนี้ใช่ทางคุณไหม",
        "ได้แบบปีกพร้อมข้อมูลทดสอบจริง ลง Port ได้",
        "รู้ว่าถ้าจะไปต่อสายนี้ ต้องแข็งฟิสิกส์กับเลขตรงไหน",
      ],
      // No quote: this path has not run, so there is no alumnus to quote.
    },
  },
  {
    src: "/pathlab/field-medical.webp",
    alt: "หูฟังแพทย์วางบนสมุดบันทึก",
    label: "Medical",
  },
  {
    src: "/pathlab/field-architect.webp",
    alt: "แบบแปลนสถาปัตยกรรม",
    label: "Architect",
  },
  {
    src: "/pathlab/field-commarts.webp",
    alt: "ภาพประกอบการออกแบบสีสันสดใส",
    label: "นิเทศ",
  },
  {
    src: "/pathlab/field-civil.webp",
    alt: "วิศวะกำลังสำรวจหน้างานก่อสร้าง",
    label: "วิศวะโยธา",
  },
  {
    src: "/pathlab/field-graphic.webp",
    alt: "งานออกแบบกราฟิกพื้นหลังสีเหลือง",
    label: "กราฟิกและแอนิเมชั่น",
  },
  {
    label: "หากไม่มีสายที่สนใจทัก IG\nพวกเรามาได้เลยนะ",
    ask: true,
  },
];

export interface OfferCard {
  /** Short label, Latin or Thai. */
  title: string;
  /** The explanation under it. */
  body: string;
}

/** Three dark cards: what a Pathlab actually gives you. */
export const OFFER_CARDS: OfferCard[] = [
  {
    title: "Project",
    body: "ที่ออกแบบร่วมกับผู้เชี่ยวชาญของสายนั้นๆ ภายในเวลา 4-6 วัน",
  },
  {
    title: "หาสายที่ใช่",
    body: "ได้ทำโปรเจกต์ที่สายนั้นต้องเจอจริง จะช่วยตัดสินใจว่านี้ใช่ทางของเราไหม",
  },
  {
    title: "Mentor",
    body: "จะมี mentor คอยวางแผนเส้นทางหลังจบโปรเจกต์ว่าควรจะเตรียมตัวต่อยังไงให้เข้ามหาลัย",
  },
];

export interface PathlabStat {
  /** Whole percent, 0-100. Drives both the ring and the printed figure. */
  percent: number;
  /** Two short lines under the ring. */
  lines: string[];
}

/**
 * The two numbers that make the case for starting early. Rings are drawn as
 * inline SVG rather than a chart library: two values do not justify the
 * dependency, and SVG stays sharp at any size.
 */
export const STATS: PathlabStat[] = [
  {
    percent: 87,
    lines: ["เริ่มเตรียม Port", "ตอน ม.5"],
  },
  {
    percent: 58,
    lines: ["ที่เริ่มตอน ม.6", "ยอมแพ้กับรอบ Port"],
  },
];
