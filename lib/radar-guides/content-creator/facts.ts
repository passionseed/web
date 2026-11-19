/**
 * Fact registry for the Content Creator guide (Level 1). Every fact was
 * re-read at its source on 2026-11-20. The older DB deck research (market
 * size, salaries, rate cards) stays on Level 2 and is not repeated here:
 * docs/radar-guide/factsheets/content-creator.md says why.
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; an organisation's own numbers about
 * itself carry the vendor badge; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-20" as const;

export const CONTENT_CREATOR_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.cc-moodeng-keeper",
    claimEn:
      "AP (Sep 19, 2024): zookeeper Atthapon Nundee at Khao Kheow Open Zoo (สวนสัตว์เปิดเขาเขียว) 'has been posting cute moments of the animals in his care for about five years'; he says 'I wanted people to know her'. Thai PBS (Sep 18, 2024): เบนซ์ cares for all the zoo's hippos and is the admin of the page ขาหมู แอนด์ เดอะแก๊ง; when he became permanent staff he said he would make the pygmy hippo about to be born famous (เดี๋ยวจะปั้นลูกฮิปโปแคระที่กำลังจะเกิดให้ดังให้ได้). Moo Deng was born on Jul 10, 2024 and went viral in Sep 2024 (ก.ย. 2567).",
    values: ["5", "2567"],
    sources: [
      {
        outlet: "Associated Press (via PBS NewsHour)",
        url: "https://www.pbs.org/newshour/world/thailands-adorable-baby-hippo-moo-deng-has-the-kind-of-face-that-launches-a-thousand-memes",
        publishedAt: "2024-09-19",
      },
      { outlet: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/344334", publishedAt: "2024-09-18" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "AP's 'about five years' is as of Sep 2024: say มาราว 5 ปี ก่อนหมูเด้งจะดัง, not 5 ปีแล้ว.",
  },
  {
    id: "f.cc-moodeng-visitors",
    claimEn:
      "AP (Sep 19, 2024), quoting the zoo director Narongwit Chodchoy: since Moo Deng's fame the zoo has had over 4,000 visitors on a weekday, up from around 800, and more than 10,000 on a weekend, up from around 3,000 (ก.ย. 2567).",
    values: ["800", "4,000", "3,000", "10,000", "2567"],
    sources: [
      {
        outlet: "Associated Press (via PBS NewsHour)",
        url: "https://www.pbs.org/newshour/world/thailands-adorable-baby-hippo-moo-deng-has-the-kind-of-face-that-launches-a-thousand-memes",
        publishedAt: "2024-09-19",
      },
      {
        outlet: "Associated Press (via CBS News)",
        url: "https://www.cbsnews.com/news/moo-deng-baby-hippo-thailand-zoo-bouncy-pork-goes-viral",
        publishedAt: "2024-09-19",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "The zoo's own counts, quoted by AP. Say ราว 800 and กว่า 4,000: the source says around and over.",
  },
  {
    id: "f.cc-moodeng-award",
    claimEn:
      "Thai PBS (Nov 3, 2024): on Nov 2, 2024 (2 พ.ย. 2567) TikTok gave Moo Deng's keeper เบนซ์ (admin of the page ขาหมู แอนด์ เดอะแก๊ง) a TikTok Awards prize in the Video of the year category. The page joked that the director washed the pool so Benz could go to the ceremony.",
    values: ["2", "2567"],
    sources: [{ outlet: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/345912", publishedAt: "2024-11-03" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Thai PBS spells the name อรรพล; AP spells Atthapon. Copy says พี่เบนซ์ only.",
  },
  {
    id: "f.cc-moodeng-brand",
    claimEn:
      "AP (Sep 19, 2024): the zoo director said the zoo has started copyrighting and trademarking 'Moo Deng the hippo' to stop others profiting from her image. AP (Sep 22, 2024): the zoo started a 24-hour live feed of the baby hippo for fans who cannot make the trip (ก.ย. 2567).",
    values: ["24", "2567"],
    sources: [
      {
        outlet: "Associated Press (via PBS NewsHour)",
        url: "https://www.pbs.org/newshour/world/thailands-adorable-baby-hippo-moo-deng-has-the-kind-of-face-that-launches-a-thousand-memes",
        publishedAt: "2024-09-19",
      },
      {
        outlet: "Associated Press (via Local 12)",
        url: "https://local12.com/news/offbeat/plans-to-start-24-hour-live-feed-of-thailands-adorable-pygmy-hippo-moo-deng-watch-clips-famous-tiktok-celebrity-animal-meme-famous-megastar-cute-big-small-zoo",
        publishedAt: "2024-09-22",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.cc-moodeng-birthday",
    claimEn:
      "กรุงเทพธุรกิจ (Jul 2026): Khao Kheow Open Zoo held 'หมูเด้ง HAPPY เด้ง DAY' for Moo Deng's 2nd birthday on Jul 10 to 12, 2026 (10 ถึง 12 ก.ค. 2569), with free entry for children and older people for the 3 days.",
    values: ["2", "10", "12", "2569"],
    sources: [{ outlet: "กรุงเทพธุรกิจ", url: "https://www.bangkokbiznews.com/news/news-update/1241866", publishedAt: "2026-07" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The page shows no publication date; its images are dated Jul 2026, before the event.",
  },
  {
    id: "f.cc-moodeng-fade",
    claimEn:
      "AP (Jul 10, 2025), quoting the zoo director: over the past few months the zoo had about 2,000 visitors on a weekday and around 5,000 on weekends, about half its peak (กลางปี 2568). Thai PBS (Sep 18, 2024): the keeper already had plans to make other baby animals stars if Moo Deng's buzz faded (ถ้าหมูเด้งความปังแผ่วลง ก็ยังมีลูกสัตว์ตัวอื่นๆ ที่เตรียมปั้นอีกหลายตัว).",
    values: ["2,000", "5,000", "2568"],
    sources: [
      {
        outlet: "Associated Press (via KSAT)",
        url: "https://www.ksat.com/news/weird-news/2025/07/10/thousands-celebrate-baby-hippo-moo-dengs-first-birthday-at-thailand-zoo/",
        publishedAt: "2025-07-10",
      },
      { outlet: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/344334", publishedAt: "2024-09-18" },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "Visitor counts are the zoo's own. The keeper's plan was said in Sep 2024, before the drop: do not write it as a reaction to the drop.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "f.cc-roles",
    claimEn:
      "TruePlookpanya (Jan 3, 2025), on rising communication and digital media careers: content creator work includes writing articles, making videos and producing podcasts; a social media manager plans and oversees posts, replies to followers and uses analytics tools to improve campaigns.",
    sources: [
      {
        outlet: "TruePlookpanya",
        url: "https://www.trueplookpanya.com/knowledge/content/95674-careeroverview-careerdevelopment-",
        publishedAt: "2025-01-03",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.cc-live-host",
    claimEn:
      "jobbkk.com job listing 'MC LIVE | Live Commerce Host' (T G SNEAKER Co.,Ltd., Pathum Wan, Bangkok, posted Nov 17, 2026): host lives that present and sell the shop's products, answer viewers' questions, prepare product information and the presentation plan with the team, coordinate with the admin and marketing team during the live, and follow up live results and feedback to improve the next presentation.",
    sources: [
      { outlet: "jobbkk.com", url: "https://jobbkk.com/jobs/detail/247473/1397872", publishedAt: "2026-11-17" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "One real listing, cited only to show the job exists and what it involves. No salary is printed.",
  },
  {
    id: "f.cc-yt-retention",
    claimEn:
      "YouTube Help (Thai, read Nov 20, 2026), 'วัดประสิทธิภาพของช่วงสำคัญที่มีผลต่อการคงผู้ชมไว้': the key moments for audience retention report shows how well each moment of a video holds viewers; a declining segment means viewers skipped or left during it; the intro shows the share of viewers still watching after the first 30 seconds.",
    sources: [{ outlet: "YouTube Help", url: "https://support.google.com/youtube/answer/9314415?hl=th", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "sim.cc-roti-clip",
    claimEn:
      "Simulated: the student's first brief, a 15-second clip for their regular roti shop (deliberately not one at their school, so the clip does not show where they study). They filmed 6 shots and pick which to keep (the roti close-up, the shop sign and a friend who agreed to be filmed, yes; a stranger at the next table, a blurry shot and a 10-second walk from school, no). After posting they read the results: viewers dropped at second 9, where the shop-sign shot is held still too long, comments asking where the shop is, small subtitles, a mean comment, a stranger asking for their school and phone number, an idea for the next clip, and the owner asking to call the roti the best in the country. Shop, shots, numbers and comments are invented for the game.",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.cc-phone-trim",
    claimEn:
      "Apple Support (Thai, published May 6, 2026, read Nov 20, 2026), 'วิธีแก้ไขวิดีโอบน iPhone, iPad หรือ Mac': in the Photos app, open the video, tap Edit, move the sliders on both sides of the timeline to change the start and end, then save. Google Photos Help (Thai, read Nov 20, 2026), 'แก้ไขวิดีโอ': on Android, open the video, touch and hold the trim handle and drag to choose the part to keep, then tap บันทึก. Neither page lists a new account as a requirement for trimming.",
    values: ["20", "2026", "2569"],
    sources: [
      { outlet: "Apple Support", url: "https://support.apple.com/th-th/104968", publishedAt: "2026-05-06" },
      {
        outlet: "Google Photos Help",
        url: "https://support.google.com/photos/answer/10729480?hl=th&co=GENIE.Platform%3DAndroid",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Google says some non-Pixel phones on Android 9 cannot edit video in Google Photos; many phones' own gallery app can trim too.",
  },
];
