/**
 * Data scientist facts (Level 1: dream, work, tonight). Every number a Thai
 * sentence prints is in `claimEn` or `values` (guide-lint rule 2). Ids carry
 * the `ds-` prefix so they never collide with _shared or another career.
 *
 * Research: docs/radar-guide/factsheets/data-scientist.md (2026-11-11). The
 * Level 1 facts below were read on the web on 2026-11-18. Salary and market
 * figures stay on the Level 2 deck and are not repeated here.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

export const DATA_SCIENTIST_FACTS: readonly Fact[] = [
  {
    id: "f.ds-bma-schools",
    claimEn:
      "Thai PBS, Jan 24, 2025 (24 ม.ค. 2568), 07:00 report: Bangkok's average PM2.5 was 88.4 µg/m³, 48 districts were red (75.1 and up), and the Bangkok Metropolitan Administration had closed 352 of its 437 schools (81%) because of the dust. AFP reported the same 352 of 437.",
    values: ["352", "437", "81", "48", "88.4", "75.1", "24", "2568", "2.5"],
    sources: [
      {
        outlet: "Thai PBS",
        url: "https://www.thaipbs.or.th/news/content/348507",
        publishedAt: "2025-01-24",
        title: "กทม.จมฝุ่น PM2.5 พีคสีแดง 48 เขต หนักสุดหนองแขม",
      },
      {
        outlet: "AFP via Gulf Times",
        url: "https://www.gulf-times.com/article/699061/international/record-air-pollution-forces-352-schools-to-close-in-thai-capital",
        publishedAt: "2025-01-24",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
  },
  {
    id: "f.ds-dustboy-origin",
    claimEn:
      "Greenpeace Thailand (Mar 29, 2018, 29 มี.ค. 2561): at the launch of People AQI, Chiang Mai had only 2 Pollution Control Department air stations, and their index left out PM2.5 (it used PM10) and reported only 24-hour averages. A team led by Assoc. Prof. Sate Sampattagul of Chiang Mai University, with northern universities and the Chiang Mai Maker Club, built DustBoy sensors that report PM2.5 in real time. He said having a sensor and a channel for the data 'is only the starting point'.",
    values: ["2", "2.5", "24", "2561"],
    sources: [
      {
        outlet: "Greenpeace Thailand",
        url: "https://www.greenpeace.org/thailand/story/1998/aqi-monitor-by-chiang-mai-people/",
        publishedAt: "2018-03-29",
      },
    ],
    asOf: "2026-11-18",
    badge: "pending",
    note: "Written by a campaign partner at the launch event. The station count is the project's own description of PCD coverage; confirm with PCD's 2018 report before using it in a reel.",
  },
  {
    id: "f.ds-aqi-pm25",
    claimEn:
      "Thai PBS (Sep 20, 2018): from Oct 1, 2018 (1 ต.ค. 2561) Thailand's Pollution Control Department adds PM2.5 to the national air quality index. Before, the index used 5 pollutants (O3, NO2, CO, SO2, PM10). The department cited the previous winter's smog crisis in Bangkok and calls to use PM2.5 to warn the public.",
    values: ["1", "2561", "5", "2.5"],
    sources: [
      {
        outlet: "Thai PBS",
        url: "https://www.thaipbs.or.th/news/content/274681",
        publishedAt: "2018-09-20",
        title: "คพ.เพิ่มค่าฝุ่น PM2.5 คำนวณคุณภาพอากาศใหม่",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
  },
  {
    id: "f.ds-gistda-app",
    claimEn:
      "Thai PBS (Dec 15, 2021, ธ.ค. 2564): GISTDA launched the เช็คฝุ่น app on iOS and Android. It shows PM2.5 at the user's location hour by hour, processed from satellites, weather stations, Pollution Control Department and Thai Meteorological Department data.",
    values: ["2564", "2.5"],
    sources: [
      {
        outlet: "Thai PBS",
        url: "https://www.thaipbs.or.th/news/content/310711",
        publishedAt: "2021-12-15",
        title: "GISTDA ใช้ข้อมูลจากดาวเทียม ผุดแอป เช็คฝุ่น รับมือ PM 2.5",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
  },
  {
    id: "f.ds-dustboy-1000",
    claimEn:
      "ONEP (Office of Natural Resources and Environmental Policy and Planning), Jul 31, 2022 (2565): DustBoy, a PM2.5 sensor innovation from Chiang Mai University supported by NRCT, has over 1,000 units installed nationwide; pilot sites include schools, child development centres and elderly care.",
    values: ["1,000", "2565", "2.5"],
    sources: [
      {
        outlet: "สำนักงานนโยบายและแผนทรัพยากรธรรมชาติและสิ่งแวดล้อม (ONEP)",
        url: "https://www.onep.go.th/?p=68120",
        publishedAt: "2022-07-31",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
  },
  {
    id: "f.ds-onet-tasks",
    claimEn:
      "O*NET OnLine 15-2051.00 Data Scientists (updated Oct 6, 2026) lists as tasks: 'Interview stakeholders to identify questions or problems to address through data analysis', 'Clean and manipulate raw data using statistical software', and 'Deliver oral or written presentations of the results ... to management or other end users'. US task list.",
    sources: [
      {
        outlet: "O*NET OnLine",
        url: "https://www.onetonline.org/link/summary/15-2051.00",
        publishedAt: "2026-10-06",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
    usOnly: true,
  },
  {
    id: "f.ds-nont-data",
    claimEn:
      "data.go.th dataset 'รายงานคุณภาพอากาศ (pm2.5) จังหวัดนนทบุรี' from the Nonthaburi provincial natural resources and environment office: daily PM2.5 from 2 stations (Mueang Nonthaburi, Pak Kret), as CSV and XLSX, Creative Commons Attribution. Checked Nov 18, 2026 (18 พ.ย. 2569): the CSV downloads without an account and covers Jan 1, 2024 to Feb 5, 2026; some cells read 'n/a'.",
    values: ["2", "2.5", "18", "2569"],
    sources: [
      {
        outlet: "data.go.th (Open Government Data of Thailand)",
        url: "https://data.go.th/dataset/nont-pm2-5",
        publishedAt: "2026-09-02",
        title: "รายงานคุณภาพอากาศ (pm2.5) จังหวัดนนทบุรี",
      },
    ],
    asOf: "2026-11-18",
    badge: "confirmed",
    note: "publishedAt is the dataset's last metadata update; the CSV resource was last modified 2026-02-09.",
  },
  {
    id: "sim.ds-school-dust",
    claimEn:
      "Simulated, invented for the game: one week of readings from a school's 2 dust sensors (the flagpole and a clean-air classroom). 4 candidate questions, 2 of which this file can answer. 8 rows to sort, 5 that need fixing or a question (a duplicate row, a 999 error code, a blank, a value stored with its unit, a date in another format). Wednesday 07:00: 158 at the flagpole, 14 in the clean-air room. Times 07:00 to 10:00, readings 41, 55 and 62.",
    values: ["2", "4", "8", "5", "999", "158", "14", "07:00", "08:00", "09:00", "10:00", "41", "55", "62", "28/1/2026"],
    sources: [],
    asOf: "2026-11-18",
    badge: "simulated",
  },
];
