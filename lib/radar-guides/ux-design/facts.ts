/**
 * Fact registry for the UX/UI Designer guide (Level 1). Every source below was
 * opened and re-read on 2026-11-19. Research notes:
 * docs/radar-guide/factsheets/ux-design.md. Salary and market figures from
 * the DB deck stay on Level 2 and are not repeated here.
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; an unconfirmed account carries the
 * pending badge; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-19" as const;

export const UX_DESIGN_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.ux-mayday",
    claimEn:
      "Sanook Campus (Nov 10, 2017, 2560): Mayday is a Thai group of graphic designers, content writers and researchers. Its founder Van stood at a Bangkok bus stop and could not find the bus numbers he knew because the numbers on the sign were spaced wrongly (\"เพราะเขาเว้นวรรคผิดหมด\"); he opened the Mayday page to share ideas and get feedback. With TEDx Bangkok volunteers the team surveyed 160 existing bus signs, added colours for colour-blind people, and installed more than 100 new signs on Rattanakosin island, where they saw people, foreigners included (\"ทั้งชาวต่างชาติ\"), checking the signs all the time.",
    values: ["160", "100", "2560"],
    sources: [{ outlet: "Sanook Campus", url: "https://www.sanook.com/campus/1387367/", publishedAt: "2017-11-10" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Feature interview, not a study. Say กว่า 100 (the source says กว่า 100 ป้าย). The year is the article's date; the story itself may be a little older.",
  },
  {
    id: "f.ux-bma-bus-stops",
    claimEn:
      "Bangkokbiznews (Apr 21, 2026) and The Standard (Apr 22, 2026): Bangkok (BMA) has about 5,199 bus stops in use and is upgrading more than 1,100 of them (600 new-format signs and 500 digital signs), designed to be understood at a glance (\"เข้าใจง่ายตั้งแต่แวบแรก\"), with route numbers, a walking map and real-time arrivals on the digital ones; due within 2026 (2569). The project is a collaboration between BMA, Mayday, Grab and the Tourism Authority of Thailand (ททท.).",
    values: ["5,199", "1,100", "600", "500", "2569"],
    sources: [
      { outlet: "กรุงเทพธุรกิจ (Bangkokbiznews)", url: "https://www.bangkokbiznews.com/news/news-update/1230559", publishedAt: "2026-04-21" },
      { outlet: "The Standard", url: "https://thestandard.co/bangkok-bus-stop-digital-upgrade/", publishedAt: "2026-04-22" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Neither article says who designed the new signs: Mayday is named as a partner (budget, technology, travel data), not as the designer. Say กทม. จับมือ Mayday, never ป้ายใหม่ฝีมือ Mayday.",
  },
  {
    id: "f.ux-lineman-stickers",
    claimEn:
      "Marketeer (Oct 9, 2026): LINE MAN's chat has sticker sets riders and customers send each other, such as \"มาถึงแล้วครับ\" from riders and \"ตามหมุดเลย\" from customers. They were made because riders work outdoors in sun and rain, so typing long messages is inconvenient; the team gathered the phrases riders often typed to customers.",
    values: ["2569"],
    sources: [{ outlet: "Marketeer", url: "https://marketeeronline.co/archives/491460", publishedAt: "2026-10-09" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Business media feature. The feature exists (Bangkok Post also covered LINE MAN's English stickers for tourists); the reason is Marketeer's account.",
  },
  {
    id: "f.ux-lineman-intern",
    claimEn:
      "Marketeer (Oct 9, 2026) reports that a person who says they were a UX/UI intern at LINE MAN in 2021 (2564) wrote that the first rider sticker set (about 8 Moon stickers) was their intern brief: the team had gathered the phrases riders typed most, and the intern put the Thai text on the Moon character and chose the font. The article gives no link to that post, and LINE MAN has not confirmed it.",
    values: ["2564"],
    sources: [{ outlet: "Marketeer", url: "https://marketeeronline.co/archives/491460", publishedAt: "2026-10-09" }],
    asOf: AS_OF,
    badge: "pending",
    note: "One person's account retold by Marketeer (\"เรื่องเล่าจากผู้ใช้อินเทอร์เน็ตคนหนึ่ง\"). Always say it is unconfirmed (บริษัทยังไม่ได้ยืนยัน), and the host never answers as if it were true. Never name the person. Re-read 2026-11-20.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "f.ux-nng-watch",
    claimEn:
      "Nielsen Norman Group: \"To design the best UX, pay attention to what users do, not what they say\" and \"watch users as they attempt to perform tasks with the user interface\" (Jakob Nielsen, Aug 4, 2001). In a usability test \"a researcher (called a facilitator or a moderator) asks a participant to perform tasks\" and \"observes the participant's behavior and listens for feedback\" (Kate Moran, Dec 1, 2019, last reviewed Jul 15, 2026).",
    sources: [
      {
        outlet: "Nielsen Norman Group",
        url: "https://www.nngroup.com/articles/first-rule-of-usability-dont-listen-to-users/",
        publishedAt: "2001-08-04",
      },
      { outlet: "Nielsen Norman Group", url: "https://www.nngroup.com/articles/usability-testing-101/", publishedAt: "2026-07-15" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "sim.ux-canteen",
    claimEn:
      "Simulated: a school canteen pre-order app (invented for the game). Three friends try to order one dish while the student only watches; the student sorts six observations (fix first, note for later, no need to fix), then picks a fix for five problems (change size, colour or position; make the words clear; tell the user what happened). Problems are common usability failures: a small button below the fold, no confirmation after ordering (a double order), an unlabelled icon, a vague button label, low-contrast prices; plus one person's taste and one feature idea that block nothing.",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.ux-excalidraw",
    claimEn:
      "Excalidraw's GitHub README (read Nov 19, 2026): Excalidraw is \"Free & open-source\", released under the MIT license; excalidraw.com has \"Local-first support (autosaves to the browser)\" and can \"Export to PNG, SVG & clipboard\".",
    values: ["19", "2569"],
    sources: [{ outlet: "GitHub (excalidraw)", url: "https://github.com/excalidraw/excalidraw", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The README does not say excalidraw.com needs no account, so the copy never says ไม่ต้องสมัคร. Paper and pen is the default; Excalidraw is optional.",
  },

  // ---------------------------------------------------------------- round1 (Level 2)
  {
    id: "f.ux-mytcas-programmes",
    claimEn:
      "The mytcas course feed (TCAS70, read Nov 19, 2026) lists design programmes a student into UX/UI could look at, for example KMITL ศป.บ. การออกแบบประสบการณ์สำหรับสื่อบูรณาการ, KMUTT วท.บ. การออกแบบดิจิทัล (international), Silpakorn ศิลปบัณฑิต การออกแบบนิเทศศิลป์, and UTCC Interaction Design (international BBA), plus many นิเทศศิลป์ and multimedia programmes.",
    sources: [
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10160102800101A", publishedAt: "2026-11" },
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10140136210801E", publishedAt: "2026-11" },
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10080104800106A", publishedAt: "2026-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Programme names from the public feed my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json. No counts are printed: the feed changes during the year.",
  },
];
