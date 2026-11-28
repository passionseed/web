import { DEFAULT_STYLE, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";
import type { LobbyTeam } from "@/lib/hackathon/elemental/lobby";

import { DEMO_TEAM_KEY } from "../team-style/demo";

/**
 * Made-up teams for /hackathon/elemental/lobby/demo (dev and PR previews
 * only). Names are invented; the styles are a mix of the free default, a
 * colour only, and full styles, as unlocked teams would show them.
 */
type Demo = [key: string, name: string, style: Partial<TeamNameStyle>, solo?: boolean];

const ROOM: Demo[] = [
  ["tdemo0sol", "Solar Squad", { font: "chakra", color: "amber", effect: "offset" }],
  ["tdemo0mtn", "ภูเขาไม่ร้องไห้", { font: "chonburi", color: "earth" }],
  ["tdemo0deep", "Deep Blue", { font: "trirong-italic", color: "water", effect: "gradient", pair: "river" }],
  ["tdemo0sky", "ฟ้าใสไร้ฝุ่น", { color: "air" }],
  ["tdemo0eco", "EcoNerds", { font: "sriracha", color: "leaf", effect: "marker" }],
  ["tdemo0luy", "รักษ์โลกสายลุย", {}],
  ["tdemo0mon", "Team Monsoon", { font: "pattaya", color: "aether" }],
  ["tdemo0zero", "ขยะเป็นศูนย์", { font: "chakra", color: "flame" }],
  ["tdemo0pm", "PM2.5 Hunters", { font: "chakra", color: "ember", effect: "offset" }],
  ["tdemo0mang", "ผู้พิทักษ์ป่าชายเลน", { font: "sriracha", color: "water" }],
  ["tdemo0coral", "Coral Kids", { font: "chonburi", color: "water", effect: "offset" }],
  ["sdemo0wolf", "หมาป่าเดียวดาย", {}, true],
  ["tdemo0404", "404 Not Found", { color: "amber", font: "chakra" }],
  ["tdemo0back", "เด็กหลังห้อง", { font: "sriracha", color: "ember" }],
  ["tdemo0clear", "น้ำใสใจจริง", { color: "water" }],
  ["tdemo0plas", "Plastic Zero", { font: "pattaya", color: "rose", effect: "offset" }],
  ["tdemo0aeth", "สายน้ำไม่หลับ", { font: "trirong-italic", effect: "gradient", pair: "dusk" }],
  ["tdemo0lung", "ลมหายใจเมือง", { font: "sriracha", color: "leaf" }],
  ["tdemo0smog", "Smog Busters", { font: "trirong-italic", color: "air", effect: "offset" }],
  ["tdemo0soil", "ทีมดินดี", { font: "chonburi", color: "earth", effect: "marker" }],
  ["tdemo0mkng", "Mekong Menders", { font: "chakra", color: "water", effect: "offset" }],
  [DEMO_TEAM_KEY, "ไฟป่า", { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" }],
];

/** Teams that walk in one or two at a time with ?sim=1. */
const ARRIVING: Demo[] = [
  ["tdemo0new1", "Green Byte", { font: "chakra", color: "leaf", effect: "gradient", pair: "river" }],
  ["tdemo0new2", "ฝนตกไม่ทั่วฟ้า", { font: "trirong-italic", color: "air" }],
  ["tdemo0new3", "Heatwave", { font: "pattaya", color: "ember", effect: "gradient", pair: "fire" }],
  ["tdemo0new4", "ปลาทูไม่กินพลาสติก", { font: "sriracha", color: "water", effect: "offset" }],
  ["tdemo0new5", "Night Shift", {}],
  ["tdemo0new6", "ดินสอสีเขียว", { font: "chonburi", color: "leaf" }],
];

const team = ([key, name, style, solo]: Demo): LobbyTeam => ({ key, name, style: { ...DEFAULT_STYLE, ...style }, solo: Boolean(solo) });

/** The room, newest first; n trims it to the newest n. */
export function demoLobby(n = ROOM.length): { teams: LobbyTeam[]; people: number } {
  const teams = ROOM.slice(0, Math.max(0, Math.min(n, ROOM.length))).map(team);
  return { teams, people: teams.reduce((sum, t, i) => sum + (t.solo ? 1 : 2 + (i % 3)), 0) };
}

/** The next arrivals for a tick of the demo (1 or 2), or none once they've all come in. */
export function demoArrivals(tick: number): LobbyTeam[] {
  const start = Math.floor(tick * 1.5);
  return ARRIVING.slice(start, Math.floor((tick + 1) * 1.5)).map(team);
}
