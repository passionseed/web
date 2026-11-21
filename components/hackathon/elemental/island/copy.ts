/**
 * Labels on /hackathon/island. Functional placeholders: every Thai line waits
 * for a native review before the event ([TH-REVIEW]). No marketing copy and no
 * em dashes. Element names come from lib/elemental/core ELEMENT_LABELS.
 */
export const ISLAND_COPY = {
  // [TH-REVIEW] page title (browser tab and heading).
  title: "เกาะ Elemental",
  // [TH-REVIEW] one line under the heading: what the picture is.
  lede: "ทุกแปลงคือโปรเจกต์ของหนึ่งทีม ต้นไม้โตขึ้นเมื่อมีคนลองใช้งาน",
  // [TH-REVIEW] alt text for the island picture with teams on it.
  pictureAlt: (teams: number) => `ภาพเกาะ Elemental มี ${teams} ทีม`,
  // [TH-REVIEW] alt text for the island picture before any team has a plot.
  plazaAlt: "ภาพเกาะ Elemental ยังมีแค่ลานกลางเกาะ",
  // [TH-REVIEW] link that opens the full-size picture (for zooming on a phone).
  openPicture: "เปิดภาพเต็ม",
  // [TH-REVIEW] heading over the five element level bars.
  levelsHeading: "ระดับของแต่ละธาตุ",
  // [TH-REVIEW] under a bar: counted testers and teams for that element.
  levelLine: (level: number, teams: number) => `${level} คนลองใช้ · ${teams} ทีม`,
  // [TH-REVIEW] heading over the plot legend.
  legendHeading: "แปลงบนเกาะ",
  // [TH-REVIEW] legend column headers.
  legendPlot: "แปลง",
  legendProject: "โปรเจกต์",
  legendElement: "ธาตุ",
  // [TH-REVIEW] the legend before any team has a plot.
  legendEmpty: "ยังไม่มีทีมบนเกาะ ตอนนี้มีแค่ลานกลางเกาะ",
  // [TH-REVIEW] the island cannot be read right now.
  unavailable: "ตอนนี้ยังแสดงเกาะไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่",
  // [TH-REVIEW] screen mode: the page refreshes itself.
  screenNote: "อัปเดตทุก 60 วินาที",
} as const;
