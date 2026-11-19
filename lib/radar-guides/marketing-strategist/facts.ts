/**
 * Fact registry for the marketing guide (Level 1). Every fact was re-read at
 * its source on 2026-11-19 and 2026-11-20. Research notes:
 * docs/radar-guide/factsheets/marketing-strategist.md. The DB deck's market
 * and salary figures (mostly US: BLS, ContentGrip) stay on the Level 2 deck
 * and are not repeated here (see banned.ts).
 *
 * Butterbear is a public case told from news reports. We have no tie to the
 * brand: copy says so, and nothing reads as an endorsement.
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-20" as const;

export const MARKETING_STRATEGIST_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.mkt-butterbear-fans",
    claimEn:
      "InfoQuest (Aug 16, 2024), interviewing Asst. Prof. Dr. Nopporn Ruangwanich of Thammasat University's Faculty of Commerce and Accountancy: Butterbear, a small dessert shop at Emsphere, created its mascot (หมีเนย) to shape its brand image. The fans you see are mostly adults, especially Gen Y and Gen X working people, not small children; many call themselves มัมหมี (mum bears). Fans want to escape reality and rest from work stress, and the bear recalls the teddy bears of their childhood. It turns up on every platform people scroll, and fans queue early in the morning at live meet-ups. Thairath (Jul 2, 2024): Butterbear is a Thai dessert brand under Coffee Beans by Dao at EMSPHERE; fans call it a healing (ฮีลใจ) trend.",
    values: ["2024", "2567"],
    sources: [
      { outlet: "InfoQuest (อินโฟเควสท์)", url: "https://www.infoquest.co.th/2024/422085", publishedAt: "2024-08-16" },
      {
        outlet: "ไทยรัฐ (Thairath Money)",
        url: "https://www.thairath.co.th/money/business_marketing/marketing/2797670",
        publishedAt: "2024-07-02",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "An expert's reading of who the fans are, not a survey: say ส่วนใหญ่, never a share or a count.",
  },
  {
    id: "f.mkt-butterbear-china",
    claimEn:
      "A Chinese tourist filmed the mascot dancing outside EmSphere Bangkok; the clip went viral on Chinese social media (Douyin), which first spread the mascot abroad (Inside Retail Asia, Jul 30, 2024; InfoQuest, Aug 16, 2024). Inside Retail: fans line up for the weekly Meet & Greet photo sessions, some arriving as early as 4:30 am.",
    values: ["4:30"],
    sources: [
      {
        outlet: "Inside Retail Asia",
        url: "https://insideretail.asia/2024/07/30/how-a-cute-mascot-turned-thai-bakery-chain-butterbear-into-a-phenomenon/",
        publishedAt: "2024-07-30",
      },
      { outlet: "InfoQuest (อินโฟเควสท์)", url: "https://www.infoquest.co.th/2024/422085", publishedAt: "2024-08-16" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Do not print the Douyin view or like counts: only Inside Retail reports them. The 4:30 am queue is Inside Retail's.",
  },
  {
    id: "f.mkt-butterbear-buzz",
    claimEn:
      "Marketing Oops (Jun 13, 2024), reporting an analysis by Zanroo (แสนรู้), a social data company: from Jun 1 to 12, 2024 (1 to 12 มิ.ย. 2567) Butterbear drew 13,599,968 engagements on social media, about 13.6 million. TikTok had 9,971,877 (73.3%), X 3,554,490 (26.1%); Instagram, Facebook and YouTube under 1% each.",
    values: ["13,599,968", "13.6", "73.3", "1", "12", "2567"],
    sources: [{ outlet: "Marketing Oops", url: "https://www.marketingoops.com/?p=326969", publishedAt: "2024-06-13" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Engagement is Zanroo's count of interactions (likes, comments, shares and so on), not people. Say ราว 13.6 ล้าน.",
  },
  {
    id: "f.mkt-mascot-luck",
    claimEn:
      "Thairath (Jul 2, 2024) quotes a Chulalongkorn University marketing lecturer (ผศ.ดร.เอกก์): a mascot helps a brand build fans, not just customers, because people find it easier to love a mascot than a plain brand; results also depend on timing and luck, so brands must keep investing continuously.",
    sources: [
      {
        outlet: "ไทยรัฐ (Thairath Money)",
        url: "https://www.thairath.co.th/money/business_marketing/marketing/2797670",
        publishedAt: "2024-07-02",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },

  // ---------------------------------------------------------------- work and tonight
  {
    id: "f.mkt-plan",
    claimEn:
      "Marketeer (Aug 22, 2024), column by Dr. Kasem Pipatseritham: a marketing plan comes from the marketing strategy and covers a set period; it states the goal, the target customers, the marketing methods, the budget and the results expected. Measuring results mostly means comparing the actual results with the target that was set. The article was free to read with no log-in when checked on Nov 20, 2026 (20 พ.ย. 2569).",
    sources: [{ outlet: "Marketeer Online", url: "https://marketeeronline.co/archives/371763", publishedAt: "2024-08-22" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "sim.mkt-shop",
    claimEn:
      "Simulated: a toast shop (ร้านปังปิ้ง) in front of a school wants more students to stop by after school. The student sorts 6 ideas (right people and place, wrong people, wrong place), then judges one week of results for 5 of them (keep, tweak, stop). The shop, the ideas and every count (8 then 13 students a day, 2,400 likes, 200 flyers and 1 visitor, 25 sharing sets, 0 birthday treats) are invented for the game, built on the plan-and-measure loop in f.mkt-plan: likes are not customers, and an idea nobody sees can't work.",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
  {
    id: "sim.mkt-tonight",
    claimEn:
      "Practice goal, not data: tonight the student picks a real shop near school, counts the students who stop by after school, asks 3 friends why they do or don't, and writes a one-page plan to bring in 10 more students with ideas that cost nothing. The 10 and the 3 are targets the guide sets for the exercise.",
    values: ["10", "3"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
];
