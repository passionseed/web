import { rankBoard, type BoardEntry, type PublicBoardEntry } from "@/lib/hackathon/elemental/team-style-board";
import { clampStyle, DEFAULT_STYLE, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";

import { DEMO_TEAM_KEY } from "../team-style/demo";

/**
 * Made-up teams for /hackathon/elemental/leaderboard/demo (dev and PR
 * previews only). Names, schools and numbers are invented; styles go through
 * the same clamp as real teams, so each one shows only what its devices unlock.
 */
type Demo = [key: string, name: string, schools: string[], paid: number, devices: number, style: Partial<TeamNameStyle>, solo?: boolean];

const TEAMS: Demo[] = [
  [DEMO_TEAM_KEY, "ไฟป่า", ["สตรีวิทยา", "เตรียมอุดมศึกษา"], 9, 142, { font: "pattaya", effect: "gradient", pair: "fire" }],
  ["tdemo0mkng", "Mekong Menders", ["ยุพราชวิทยาลัย"], 7, 118, { font: "chakra", color: "water", effect: "offset" }],
  ["tdemo0soil", "ทีมดินดี", ["ขอนแก่นวิทยายน"], 7, 96, { font: "chonburi", color: "earth", effect: "marker" }],
  ["tdemo0smog", "Smog Busters", ["หาดใหญ่วิทยาลัย", "มหาวชิราวุธ"], 5, 88, { font: "trirong-italic", color: "air", effect: "offset" }],
  ["tdemo0lung", "ลมหายใจเมือง", ["สามเสนวิทยาลัย"], 4, 61, { font: "sriracha", color: "leaf" }],
  ["tdemo0aeth", "สายน้ำไม่หลับ", ["มหิดลวิทยานุสรณ์"], 3, 54, { font: "trirong-italic", effect: "gradient", pair: "dusk" }],
  ["tdemo0plas", "Plastic Zero", ["KIS International School"], 3, 54, { font: "pattaya", color: "rose", effect: "offset" }],
  ["tdemo0clear", "น้ำใสใจจริง", ["ภูเก็ตวิทยาลัย"], 2, 27, { color: "water" }],
  ["tdemo0back", "เด็กหลังห้อง", ["อุดรพิทยานุกูล", "อุดรพิชัยรักษ์พิทยา", "สตรีราชินูทิศ"], 1, 25, { font: "sriracha", color: "ember" }],
  ["tdemo0404", "404 Not Found", ["สวนกุหลาบวิทยาลัย"], 1, 12, { color: "amber", font: "chakra" }],
  ["sdemo0wolf", "หมาป่าเดียวดาย", ["บดินทรเดชา (สิงห์ สิงหเสนี)"], 0, 9, {}, true],
  ["tdemo0coral", "Coral Kids", ["ระยองวิทยาคม"], 0, 3, {}],
];

export function demoBoard(): PublicBoardEntry[] {
  const entries: BoardEntry[] = TEAMS.map(([key, name, schools, paid, devices, style, solo]) => ({
    key,
    id: key,
    solo: Boolean(solo),
    name,
    style: clampStyle({ ...DEFAULT_STYLE, ...style }, devices),
    schools,
    devices,
    paid,
    hidden: false,
  }));
  return rankBoard(entries);
}
