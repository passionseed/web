// Generated from the Elemental screenplay files, then hand-checked. Kept to what
// filming needs: no research notes, no decisions, no outlet or person names.
// Edit freely; there is no generator in the repo.

export type ReelElement = "fire" | "water" | "air" | "earth" | "aether" | "five";
export type ReelShot = "FACE" | "SCREEN" | "CODE";

export interface ReelRow {
  /** Time as written in the screenplay, for example "0:04-0:09". */
  time: string;
  shot: ReelShot;
  /** Picture direction. */
  picture: string;
  /** Thai voice-over. Empty only for CODE shots. Lines are split by newlines. */
  vo: string;
  /** On-screen text. */
  text: string;
}

export interface Reel {
  id: string;
  element: ReelElement;
  title: string;
  /** Posting day, YYYY-MM-DD (Bangkok). */
  day: string;
  /** Linear ticket, if known. */
  ticket: string | null;
  /** Length in seconds. */
  length: number;
  /** Thai hook: the first spoken line. */
  hook: string;
  rows: ReelRow[];
  credits: string[];
  /** The one-line build idea the video ends on. */
  build: string;
  /** Held in reserve for the last two days. */
  backup: boolean;
  /** Alternative to another video on the same day. */
  alt: boolean;
}

export const ELEMENT_LABEL: Record<ReelElement, string> = {
  fire: "ไฟ",
  water: "น้ำ",
  air: "ลม",
  earth: "ดิน",
  aether: "อีเธอร์",
  five: "5 ธาตุ",
};

export const REELS: Reel[] = [
  {
    "id": "fire-1",
    "element": "fire",
    "title": "เตือนไว้แล้ว",
    "day": "2026-11-25",
    "ticket": "HAC-66",
    "length": 45,
    "hook": "ปี 63 มีคนเตือนแล้ว ปี 67 ที่เก็บกากเคมีแห่งนี้ก็ไหม้",
    "rows": [
      {
        "time": "0:00-0:04",
        "shot": "FACE",
        "picture": "Big mid-gesture, handheld, turns to camera in frame 1 (motion from the first frame). Plain wall. Hard cut at the end.",
        "vo": "ปี 63 มีคนเตือนแล้ว ปี 67 ที่เก็บกากเคมีแห่งนี้ก็ไหม้",
        "text": "\"เตือน 2563\" then \"ไหม้ 2567\" slammed as two chunks, \"ไหม้\" on the yellow block"
      },
      {
        "time": "0:04-0:09",
        "shot": "CODE",
        "picture": "Black card. Date stamp slams in, then the number 67 rolls up from 0.",
        "vo": "ที่เก็บกากเคมีแห่งหนึ่งในบ้านค่าย ระยอง ไฟลุกตอน 9 โมงเช้า คนเข้ารักษาจากควัน 67 คน",
        "text": "\"บ้านค่าย ระยอง\" / \"22 เม.ย.; 2567 09.00\" / \"67 คน รักษาจากควัน\".; 2567\""
      },
      {
        "time": "0:09-0:15",
        "shot": "CODE",
        "picture": "Four date stamps stack, one every 1.5 s, each replacing the last (no static frame over 2 s).",
        "vo": "ปี 63 ตรวจพบกากอันตรายกองสะสม ปี 64 ศาลสั่งให้กำจัด ม.ค. 68 ประเมินว่ายังเหลือกากราว 33,800 ตัน แล้วก็ไหม้อีกรอบ",
        "text": "\"ต.ค.; 63 พบกากสะสม\" / \"64 ศาลสั่งให้กำจัด\" / \"ม.ค.; 68 เหลือ 33,800 ตัน\""
      },
      {
        "time": "0:15-0:17.5",
        "shot": "SCREEN",
        "picture": "Fast screen recording of Copernicus Browser: drag the date slider, Sentinel-2 SWIR layer switches on. Cut after 2.5 s.",
        "vo": "ลองดูจากอวกาศ ฟรีทั้งหมด",
        "text": "\"ดูจากอวกาศ ฟรี\""
      },
      {
        "time": "0:17.5-0:22.5",
        "shot": "CODE",
        "picture": "Plate rayong-ban-khai-before-after, top row (SWIR). Scan-front wipe from the 5 Apr frame to the 25 Apr frame (north to south). A white circle (no coordinates) rings the orange roofs, then the dark scar. A tiny label on the dark blobs: \"เงาเมฆ\".",
        "vo": "5 เมษา หลังคาสีส้ม 25 เมษา กลายเป็นรอยไหม้สีเข้ม",
        "text": "\"5 เม.ย.\" then \"25 เม.ย.\".; Credit tag: \"Sentinel-2 SWIR\""
      },
      {
        "time": "0:22.5-0:25",
        "shot": "SCREEN",
        "picture": "NASA FIRMS, VIIRS layer, 22 Apr 2024, wide zoom (province scale). One fire dot, no click. Cut after 2.5 s. Drop this beat first if the cut runs past 45 s.",
        "vo": "ดาวเทียมนาซาจับความร้อนได้ ช่วงบ่ายวันนั้น",
        "text": "\"นาซา จับความร้อน 22 เม.ย.\""
      },
      {
        "time": "0:25-0:29.5",
        "shot": "SCREEN",
        "picture": "Open-Meteo history page, wind direction chart for 22 Apr 2024 sits near 180 degrees (south) all day. Cut to the nopin map the red arrow draws on, pointing north.",
        "vo": "ข้อมูลลมฟรี ลมใต้ทั้งวัน ควันก็ไปทางเหนือ",
        "text": "\"ลมใต้ ทั้งวัน\" then \"ควัน ไปทางเหนือ\".; Source tag: \"Open-Meteo / ERA5\""
      },
      {
        "time": "0:29.5-0:33",
        "shot": "CODE",
        "picture": "Slow push-in on the 5 km ring on the nopin map, ring draws on, then the blue school squares and the yellow health post pop in one by one. Do not point at one school.",
        "vo": "ในรัศมี 5 กิโลเมตร มีบ้าน ไร่ โรงเรียน สถานีอนามัย",
        "text": "\"รัศมี 5 กม.\" Credit: \"OpenStreetMap\""
      },
      {
        "time": "0:33-0:38.5",
        "shot": "FACE",
        "picture": "Big, closer, calm. Half a beat of silence before Big speaks.",
        "vo": "หยุดไฟแบบนี้ไม่ได้ แต่ช่วยให้ครอบครัวหนึ่ง รู้ว่าต้องเดินไปทางไหนได้",
        "text": "\"หยุดไม่ได้ แต่ช่วยได้\" with \"ช่วย\" on the yellow block"
      },
      {
        "time": "0:38.5-0:44.5",
        "shot": "FACE",
        "picture": "Big points at the lens, then end card.",
        "vo": "ส่งให้เพื่อนที่บ้านอยู่ใกล้โรงงาน 5 ถึง 7 ธันวา ลิงก์ในไบโอ ครั้งหน้า ต้องมีคนเตือนทัน",
        "text": "\"ส่งให้เพื่อนที่อยู่ใกล้โรงงาน\" / \"5-7 ธ.ค.; ลิงก์ในไบโอ\" / last card \"ครั้งหน้า เตือนให้ทัน\""
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2024",
      "NASA FIRMS (VIIRS)",
      "Open-Meteo.com (ERA5)",
      "(c) OpenStreetMap contributors"
    ],
    "build": "Downwind: a one-page Thai fire card for one community (5 km ring, downwind arrow, schools and clinics inside the ring).",
    "backup": false,
    "alt": false
  },
  {
    "id": "fire-2",
    "element": "fire",
    "title": "ตีสาม",
    "day": "2026-11-27",
    "ticket": null,
    "length": 36,
    "hook": "ตีสามโรงงานเคมีระเบิด ผมหาเจอว่าควันไปทางไหน ด้วยข้อมูลฟรี",
    "rows": [
      {
        "time": "0:00-0:03.5",
        "shot": "CODE",
        "picture": "Black. Monospace time stamp counts 02:50 to 03:00, then the number 3 slams.",
        "vo": "ตีสามโรงงานเคมีระเบิด ผมหาเจอว่าควันไปทางไหน ด้วยข้อมูลฟรี",
        "text": "\"ตี 3\" with \"3\" on the yellow block, then \"บางพลี 2564\""
      },
      {
        "time": "0:03.5-0:06",
        "shot": "CODE",
        "picture": "Number 1,992 rolls up. Source tag slides in.",
        "vo": "คนถูกสั่งให้อพยพ 1,992 คน",
        "text": "\"1,992 คน อพยพ\".; 2564\""
      },
      {
        "time": "0:06-0:09",
        "shot": "CODE",
        "picture": "The true-colour plate fades in, grey grade. A 5 km ring draws on around the plume base (area, no pin).",
        "vo": "ทุกคนในรัศมี 5 กิโลเมตร ถูกสั่งให้อยู่ห่าง",
        "text": "\"รัศมี 5 กม.\""
      },
      {
        "time": "0:09-0:11.5",
        "shot": "CODE",
        "picture": "A counter runs 0 to 26 h, then holds on \"26+\".",
        "vo": "ไฟคุมได้หลังผ่านไปกว่า 26 ชั่วโมง",
        "text": "\"กว่า 26 ชั่วโมง\""
      },
      {
        "time": "0:11.5-0:14",
        "shot": "SCREEN",
        "picture": "Copernicus Browser, 5 Jul 2021, tile picked, cloud filter on.",
        "vo": "ดาวเทียมฟรี ผ่านตอนสายวันนั้น",
        "text": "\"ดาวเทียมฟรี 10.54 น.\""
      },
      {
        "time": "0:14-0:18",
        "shot": "CODE",
        "picture": "Scan line crosses the plate left to right: true colour becomes the SWIR plate. The hot spot at the plume base shows red. Slow push toward the plume.",
        "vo": "ในภาพอินฟราเรด ควันดำลอยไปทางตะวันออก",
        "text": "\"ควันดำ ไปทางตะวันออก\".; Credit: \"Sentinel-2 SWIR\""
      },
      {
        "time": "0:18-0:21",
        "shot": "SCREEN",
        "picture": "Open-Meteo history chart for 5 Jul 2021 at 02:00: direction about 274 degrees (west). Cut to a white arrow drawn over the plate, pointing east.",
        "vo": "ข้อมูลลมตอนตีสอง พัดมาจากตะวันตก",
        "text": "\"ลมตะวันตก 02.00\".; Tag: \"Open-Meteo / ERA5 (หยาบ)\""
      },
      {
        "time": "0:21-0:23",
        "shot": "CODE",
        "picture": "Hold on the plate, ring pulses once.",
        "vo": "ใครอยู่ใต้ลม ต้องรู้ก่อน",
        "text": "\"ใต้ลม ต้องรู้ก่อน\""
      },
      {
        "time": "0:23-0:29",
        "shot": "FACE",
        "picture": "Big, calm, to camera.",
        "vo": "ห้ามโรงงานระเบิดไม่ได้ แต่ช่วยเพื่อนบ้านให้รู้ว่า ทางไหนปลอดภัยได้",
        "text": "\"หยุดไม่ได้ แต่ช่วยได้\""
      },
      {
        "time": "0:29-0:36",
        "shot": "FACE",
        "picture": "Big points at the lens, end card.",
        "vo": "ส่งให้เพื่อนที่บ้านอยู่ใกล้โรงงาน 5 ถึง 7 ธันวา ลิงก์ในไบโอ ครั้งหน้า ต้องมีคนบอกตั้งแต่ตีสาม",
        "text": "\"5-7 ธ.ค.; ลิงก์ในไบโอ\" / last card \"ตี 3 ต้องมีคนบอก\""
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2021",
      "Open-Meteo.com (ERA5)"
    ],
    "build": "A one-page night-time alert card for a household that wakes at 3 a.m.: where to go across the wind.",
    "backup": false,
    "alt": false
  },
  {
    "id": "fire-3",
    "element": "fire",
    "title": "สองตัวเลข",
    "day": "2026-12-02",
    "ticket": null,
    "length": 36,
    "hook": "ไฟป่ามีสองตัวเลข ไม่ตรงกัน",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "FACE",
        "picture": "Big holds up two fingers, then two phone screens with a number each (props, nothing identifiable).",
        "vo": "ไฟป่ามีสองตัวเลข ไม่ตรงกัน",
        "text": "\"สองตัวเลข ไม่ตรงกัน\""
      },
      {
        "time": "0:03-0:06",
        "shot": "CODE",
        "picture": "Bar 1 grows to full width and the number rolls to 1,008,946. Source tag slides in.",
        "vo": "10 ปี ไฟป่า 1,008,946 ไร่",
        "text": "\"10 ปี: 1,008,946 ไร่\".; 2567\""
      },
      {
        "time": "0:06-0:09",
        "shot": "CODE",
        "picture": "Label under bar 1 appears: crew icon (flat, no stock art) and the words.",
        "vo": "ตัวเลขนี้นับไฟที่เจ้าหน้าที่อุทยานไปดับ",
        "text": "\"นับเฉพาะ ที่เจ้าหน้าที่ไปดับ\""
      },
      {
        "time": "0:09-0:12",
        "shot": "CODE",
        "picture": "Bar 2 grows, one month, on the same scale, to about 2.2 times the length of bar 1 (see sizes below). Number rolls to 2.26 ล้าน.",
        "vo": "เดือนเดียว ม.ค. 2569 ดาวเทียมเห็น 2.26 ล้านไร่",
        "text": "\"1 เดือน: 2.26 ล้านไร่\"."
      },
      {
        "time": "0:12-0:14",
        "shot": "CODE",
        "picture": "Label under bar 2: \"ดาวเทียมเห็นไหม้\".",
        "vo": "ตัวเลขนี้นับที่ดาวเทียมเห็นไหม้",
        "text": "\"นับที่ดาวเทียมเห็น\""
      },
      {
        "time": "0:14-0:16",
        "shot": "CODE",
        "picture": "Both labels stay, a thin white bracket links the two.",
        "vo": "จริงทั้งคู่ แต่วัดคนละอย่าง",
        "text": "\"จริงทั้งคู่ วัดคนละอย่าง\""
      },
      {
        "time": "0:16-0:21",
        "shot": "CODE",
        "picture": "Cut to the NASA Worldview image (cropped to Thailand, no country captions): fire dots on the north, 13 Mar 2024. Slow push.",
        "vo": "ต้นปี 67 เชียงใหม่ ป่าไหม้ 66,685 ไร่ ภายในกลางมีนา",
        "text": "\"เชียงใหม่ 66,685 ไร่\".; 2567\".; Credit: \"NASA Worldview / GIBS, VIIRS\""
      },
      {
        "time": "0:21-0:25",
        "shot": "SCREEN",
        "picture": "NASA FIRMS, VIIRS layer, north Thailand, Mar 2024, wide zoom, then drag the date slider across a week.",
        "vo": "จุดความร้อนจากดาวเทียมฟรี ใครก็ดึงได้",
        "text": "\"จุดความร้อน ฟรี ใครก็ดึงได้\""
      },
      {
        "time": "0:25-0:30",
        "shot": "FACE",
        "picture": "Big.",
        "vo": "ดับไฟป่าภาคเหนือไม่ได้ แต่ช่วยให้คนอ่านตัวเลขไฟป่าออกได้",
        "text": "\"ดับไม่ได้ แต่ช่วยอ่านได้\""
      },
      {
        "time": "0:30-0:36",
        "shot": "FACE",
        "picture": "Big points at the lens, end card.",
        "vo": "ส่งให้เพื่อนที่หายใจฝุ่นควันทุกปี 5 ถึง 7 ธันวา ลิงก์ในไบโอ ครั้งหน้า นับช่องว่างให้ได้",
        "text": "\"5-7 ธ.ค.; ลิงก์ในไบโอ\" / last card \"นับช่องว่างนี้\""
      }
    ],
    "credits": [
      "NASA Worldview / GIBS, VIIRS",
      "NASA FIRMS",
      "Contains modified Copernicus Sentinel data 2024"
    ],
    "build": "\"ตัวเลขนี้วัดอะไร\": a one-page guide for one province showing who counted each fire figure and what it counts.",
    "backup": true,
    "alt": false
  },
  {
    "id": "water-kok",
    "element": "water",
    "title": "เหมืองไหน: แม่น้ำกก",
    "day": "2026-11-26",
    "ticket": "HAC-56",
    "length": 45,
    "hook": "เหมืองไหนปล่อยสารพิษลงแม่น้ำกก? รองนายกฯ ยังต้องถาม",
    "rows": [
      {
        "time": "0:00",
        "shot": "FACE",
        "picture": "Big to camera, news headline on phone",
        "vo": "เหมืองไหนปล่อยสารพิษลงแม่น้ำกก? รองนายกฯ ยังต้องถาม",
        "text": "เหมืองไหน?"
      },
      {
        "time": "0:03",
        "shot": "SCREEN",
        "picture": "news headline",
        "vo": "ปลาในแม่น้ำกกอย่างน้อย 10 ชนิด กรมประมงเตือนอย่ากิน",
        "text": "ปลา 10 ชนิด"
      },
      {
        "time": "0:07",
        "shot": "SCREEN",
        "picture": "map zooms out, follows the river north",
        "vo": "เราเลยตามแม่น้ำขึ้นไป / ข้ามชายแดน",
        "text": "ตามแม่น้ำขึ้นไป"
      },
      {
        "time": "0:11",
        "shot": "SCREEN",
        "picture": "AI chat pulling the images",
        "vo": "ให้ Claude ดึงภาพดาวเทียมฟรีมาให้ ไม่ต้องเขียนโค้ด",
        "text": "ดาวเทียม ฟรี"
      },
      {
        "time": "0:15",
        "shot": "CODE",
        "picture": "compare frame, top half",
        "vo": "มกราคม 2023 ยังเป็นป่า",
        "text": "ม.ค.; 2023"
      },
      {
        "time": "0:18",
        "shot": "CODE",
        "picture": "compare frame, bottom half",
        "vo": "มีนาคม 2026 กลายเป็นแบบนี้",
        "text": "มี.ค.; 2026"
      },
      {
        "time": "0:21",
        "shot": "SCREEN",
        "picture": "satellite globe zoom to pools (only if the imagery terms allow, else cut)",
        "vo": "ซูมเข้าไป บ่อกลมเรียงเป็นแถว",
        "text": ""
      },
      {
        "time": "0:24",
        "shot": "CODE",
        "picture": "pools, then an arrow down the river",
        "vo": "เหมืองแบบนี้เทสารเคมีลงไปในภูเขา / น้ำที่ไหลออกมา ลงแม่น้ำกก",
        "text": ""
      },
      {
        "time": "0:29",
        "shot": "FACE",
        "picture": "Big",
        "vo": "แต่ดาวเทียมมองไม่เห็นสารหนู",
        "text": "มองไม่เห็นสารหนู"
      },
      {
        "time": "0:31",
        "shot": "FACE",
        "picture": "Big",
        "vo": "น้องหยุดเหมืองไม่ได้ / แต่ช่วยคนริมน้ำได้",
        "text": "หยุดไม่ได้ แต่ช่วยได้"
      },
      {
        "time": "0:34",
        "shot": "CODE",
        "picture": "mock chat app screen, labelled ตัวอย่าง",
        "vo": "ทำไลน์บอท ให้ยายถามได้ว่าปลาตัวนี้กินได้ไหม",
        "text": "ตัวอย่าง"
      },
      {
        "time": "0:37",
        "shot": "CODE",
        "picture": "Sentinel before/after",
        "vo": "ทำตัวเฝ้าดาวเทียม / เตือนทุก 5 วันถ้าเหมืองขยาย",
        "text": ""
      },
      {
        "time": "0:40",
        "shot": "FACE",
        "picture": "Big, cards",
        "vo": "5–7 ธันวา ม.3–ม.6 / ทีมละ 2–5 คน",
        "text": "5–7 ธ.ค.; ม.3–ม.6"
      },
      {
        "time": "0:42",
        "shot": "FACE",
        "picture": "Big",
        "vo": "199 บาท มา 2 คนขึ้นไป คนละ 149",
        "text": "199 / 149 บาท"
      },
      {
        "time": "0:44",
        "shot": "FACE",
        "picture": "Big",
        "vo": "ส่งให้เพื่อนริมแม่น้ำกก / มาช่วยกันจับตาเหมือง",
        "text": ""
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2023, 2026"
    ],
    "build": "A chat bot so a grandmother can ask if a fish is safe to eat, plus a satellite watcher that alerts every 5 days if a mine grows.",
    "backup": false,
    "alt": false
  },
  {
    "id": "water-a",
    "element": "water",
    "title": "ก๊อกน้ำแม่สาย",
    "day": "2026-11-30",
    "ticket": "HAC-67",
    "length": 42,
    "hook": "เปิดก๊อกน้ำดู ที่แม่สาย 14 หมู่บ้าน น้ำไม่ไหลแล้ว",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "FACE",
        "picture": "Big at a sink, hand already on the tap in frame 1, water runs, Big looks at the camera. Straight cut, motion from the first frame",
        "vo": "เปิดก๊อกน้ำดู ที่แม่สาย 14 หมู่บ้าน น้ำไม่ไหลแล้ว",
        "text": "ก๊อกน้ำ แม่สาย (colour block on \"ก๊อกน้ำ\")"
      },
      {
        "time": "0:03-0:09",
        "shot": "CODE",
        "picture": "Globe at orbit in true colour, then a log-zoom dive, tilting to nadir on Mae Sai (about 20.43 N, 99.88 E, inside Sentinel tile 47QNC). Reticle snaps at the town. Altitude readout counts down",
        "vo": "พฤศจิกายน 2569 น้ำประปา 14 หมู่บ้านในอำเภอแม่สายถูกระงับ",
        "text": "แม่สาย เชียงราย · พ.ย.; 2569"
      },
      {
        "time": "0:09-0:14",
        "shot": "CODE",
        "picture": "Cut inside the reticle: it opens into three vertical bars. Grey bar \"ค่าปลอดภัย 1x\" first. Amber bar rises to 30 with a rolling counter. 2569",
        "vo": "สารหนูในโรงผลิตน้ำประปา สูงเป็น 30 เท่าของค่าปลอดภัย",
        "text": "30 เท่า (amber block)"
      },
      {
        "time": "0:14-0:18",
        "shot": "CODE",
        "picture": "Second amber bar rises beside it to 25. Label slides on: \"น้ำดิบจากแม่น้ำสาย\"",
        "vo": "น้ำดิบจากแม่น้ำสายเอง 25 เท่า",
        "text": "น้ำดิบแม่น้ำสาย 25 เท่า"
      },
      {
        "time": "0:18-0:23",
        "shot": "CODE",
        "picture": "Bars drop away. A grid of 20,000 tiny dots fills the frame (each dot a household), the counter rolls to 20,000+. Then two small truck icons enter bottom right, alone on the grey. Hold on the contrast",
        "vo": "มากกว่า 20,000 ครัวเรือน แต่รัฐส่งรถน้ำสะอาดไป 2 คัน",
        "text": "20,000+ ครัวเรือน / รถน้ำ 2 คัน"
      },
      {
        "time": "0:23-0:28",
        "shot": "CODE",
        "picture": "Climb back to a Natural Earth map plate. A range line grows from Mae Sai (top) down the Mekong to Nong Khai (bottom), the tip chased by a counter rolling to 177 tested then a second amber number 17",
        "vo": "ปลายน้ำที่หนองคาย ตรวจ 177 คน พบสารหนูในปัสสาวะ 17 คน",
        "text": "หนองคาย: 17 จาก 177 คน"
      },
      {
        "time": "0:28-0:32",
        "shot": "CODE",
        "picture": "Back to the locked Sentinel frame a faint dashed line retraces upstream (hand-traced). Caption block: \"ตามตะกอนขึ้นไป\"",
        "vo": "นักวิจัยมหาวิทยาลัยนเรศวร ใช้เคมีกับแบบจำลองดาวเทียม ตามตะกอนสารหนูขึ้นไปต้นน้ำ",
        "text": "ตามตะกอนด้วยดาวเทียม"
      },
      {
        "time": "0:32-0:36",
        "shot": "SCREEN",
        "picture": "Screen recording: search \"WHO arsenic fact sheet\", the page opens, the line \"10 μg/L\" gets highlighted. A finger-sized cursor, nothing else",
        "vo": "ค่าปลอดภัยคือ 10 ไมโครกรัมต่อลิตร เช็กเองได้ฟรี",
        "text": "WHO: 10 μg/L · เช็กเองได้"
      },
      {
        "time": "0:36-0:41",
        "shot": "FACE",
        "picture": "Big to camera, in a softer light, no sink. As Big says \"ช่วยได้\" a phone mock-up slides in over Big's shoulder: a chat bubble \"น้ำวันนี้ดื่มได้ไหม\" and a reply card with a green/red light. Corner label ตัวอย่าง",
        "vo": "คุณหยุดเหมืองไม่ได้ แต่ช่วยให้คนริมน้ำรู้ได้ ว่าวันนี้น้ำใช้ได้ไหม",
        "text": "หยุดไม่ได้ แต่ช่วยได้"
      },
      {
        "time": "0:41-0:46",
        "shot": "CODE",
        "picture": "Three cards, each swapping every 1.3 s: \"5-7 ธ.ค. ม.3-ม.6 · ทีม 2-5 คน\" → \"199 บาท · มา 2 คน คนละ 149\" → \"ลิงก์ในไบโอ\". Last card holds a creep on the tap running again",
        "vo": "ส่งให้เพื่อนที่ดื่มน้ำก๊อก แล้วสมัครที่ลิงก์ในไบโอ ก๊อกน้ำแม่สายรอคำตอบอยู่",
        "text": "ส่งให้เพื่อน · สมัครลิงก์ไบโอ"
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2026",
      "Map: Natural Earth (public domain)",
      "Blue Marble: NASA"
    ],
    "build": "A one-page site or chat bot for one riverside district: latest published test result, the safe limit beside it, and a green, amber or red light.",
    "backup": false,
    "alt": true
  },
  {
    "id": "water-b",
    "element": "water",
    "title": "กก: ภาพเดียว สามปี",
    "day": "2026-12-03",
    "ticket": null,
    "length": 26,
    "hook": "",
    "rows": [
      {
        "time": "0:00-0:04",
        "shot": "CODE",
        "picture": "Oblique orbit, limb in frame, true colour Southeast Asia, then the camera tilts toward the Thai-Myanmar border and starts the dive. Altitude counts down",
        "vo": "",
        "text": "ที่เดียวกัน สามปี"
      },
      {
        "time": "0:04-0:10",
        "shot": "CODE",
        "picture": "Log-zoom dive through plates: region (the full tile 47QNC) to a 4 km site frame at about 20.334 N, 99.323 E. Reticle snaps on the site scale bar and altitude read out. Colour goes to the analyst's grey on the way down",
        "vo": "",
        "text": "แม่น้ำกก · 20.334 N 99.323 E"
      },
      {
        "time": "0:10-0:15",
        "shot": "CODE",
        "picture": "Locked nadir frame, 2023-01-14 scene, 2% creep. Date in mono bottom-left. Hold, with a thin outline of the river's course",
        "vo": "",
        "text": "14 ม.ค.; 2023"
      },
      {
        "time": "0:15-0:21",
        "shot": "CODE",
        "picture": "A soft scan front sweeps north to south and the March 2026 plate replaces the frame. Behind the front, the ground that changed prints an amber outline (made from the difference between the two scenes). The camera creeps, never freezes",
        "vo": "",
        "text": "26 มี.ค.; 2026"
      },
      {
        "time": "0:21-0:26",
        "shot": "CODE",
        "picture": "Colour returns only inside the amber outline for 1 s, then back to grey. Hairline range-line from one corner to the other as a scale reference. Caption card: \"ดาวเทียมเห็นพื้นที่เปลี่ยน\"",
        "vo": "",
        "text": "ดาวเทียมเห็นว่าพื้นที่เปลี่ยน / มองไม่เห็นสารหนู"
      },
      {
        "time": "0:26-0:28",
        "shot": "CODE",
        "picture": "End card: reticle opens into a title card. \"ดิน น้ำ ลม ไฟ · 5-7 ธ.ค. · ม.3-ม.6 · ลิงก์ในไบโอ\"",
        "vo": "",
        "text": "The Next Decade: Elemental"
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2023, 2026"
    ],
    "build": "A Sentinel-2 watcher that alerts when land near a river changes (a new image about every 5 days, free).",
    "backup": true,
    "alt": false
  },
  {
    "id": "air-1",
    "element": "air",
    "title": "ลมหยุดนิ่ง",
    "day": "2026-11-26",
    "ticket": "HAC-67",
    "length": 45,
    "hook": "ท้องฟ้าดูปกติใช่ไหม แต่ศูนย์อากาศ กทม. คาดว่าพฤหัสนี้ ฝุ่นหนักสุดของสัปดาห์ วันนี้ พฤหัสนี้ พรุ่งนี้",
    "rows": [
      {
        "time": "0:00-0:04",
        "shot": "FACE",
        "picture": "Frame 1 already moving: Big steps to a window or balcony, looks up, camera tilts to the sky. Hard cut on \"แต่\" to a phone screen card (made in code, not a screenshot) showing the forecast line.",
        "vo": "ท้องฟ้าดูปกติใช่ไหม แต่ศูนย์อากาศ กทม. คาดว่าพฤหัสนี้ ฝุ่นหนักสุดของสัปดาห์ วันนี้ พฤหัสนี้ พรุ่งนี้",
        "text": "\"ฝุ่นหนักสุด?\" on a yellow block.; Source tag: \"คาดการณ์ ศูนย์อากาศ กทม.; 20 พ.ย.\""
      },
      {
        "time": "0:04-0:08",
        "shot": "CODE",
        "picture": "High oblique push over a printed Thailand, lines flowing south, then thinning and stalling over Bangkok. Ring on Bangkok.",
        "vo": "เหตุผล คือลมระบายอากาศต่ำสุดของสัปดาห์",
        "text": "\"ลมพัดฝุ่นออกน้อยสุด\""
      },
      {
        "time": "0:08-0:13",
        "shot": "CODE",
        "picture": "Hard cut. Number rolls 0 to 352 in vermilion on paper a row of 437 small school marks, 352 fill in. Source tag slides in.",
        "vo": "มกราคม 2568 ปิดโรงเรียน 352 แห่ง ในวันเดียว",
        "text": "\"352 โรงเรียนปิด\" / \"24 ม.ค.; 2568\".; Tag: \"สังกัด กทม.; 352 จาก 437\""
      },
      {
        "time": "0:13-0:18",
        "shot": "CODE",
        "picture": "Gauge: 108 rolls up beside it a line at 15 (WHO 24-hour limit) bar stretches to 7.2 times the line.",
        "vo": "เช้านั้น PM2.5 ที่ 108 สูงกว่าเกณฑ์ WHO รายวัน 7 เท่า",
        "text": "\"108 = 7 เท่าของเกณฑ์\"; tag \"เกณฑ์ WHO 24 ชม.; = 15\""
      },
      {
        "time": "0:18-0:30",
        "shot": "CODE",
        "picture": "A day counter 18 to 24 ม.ค. runs (about 1.7 s per day). Streamlines over Bangkok crawl. Below, a printed cartouche with two curves drawn on as time runs: air-lid height (collapses to about 100 m every night) and modelled PM2.5 stepping up 49 to 122.",
        "vo": "เจ็ดวันนั้น ลมเฉลี่ยรายวันไม่ถึง 7 กม./ชม. กลางคืนเพดานอากาศเหลือราว 100 เมตร ฝุ่นไม่มีทางไป",
        "text": "\"ลม ต่ำกว่า 7 กม./ชม.\" then \"เพดานอากาศ ~100 ม.\" then \"ฝุ่น (โมเดล) 49 → 122\"; footer \"Open-Meteo / CAMS\""
      },
      {
        "time": "0:30-0:35",
        "shot": "SCREEN",
        "picture": "Screen recording, steps in production list: Open-Meteo URL typed, JSON/sheet fills, a chart of this week appears. Highlight the Thursday wind cell.",
        "vo": "ข้อมูลนี้ฟรี ใครก็ดึงได้ ลองดูของสัปดาห์นี้",
        "text": "\"Open-Meteo ฟรี ไม่ต้องสมัคร\"; if live data supports it: \"สัปดาห์นี้ ยังต่ำกว่า ม.ค.; 68\""
      },
      {
        "time": "0:35-0:41",
        "shot": "FACE",
        "picture": "Big to camera, close, natural, no script feel. Cut on \"ตีหก\" to a quick code card: a school gate at 6:00 with an orange/green dot.",
        "vo": "คุณหยุดลมไม่ได้ แต่ช่วยครูที่ต้องตัดสินใจตอนตีหก ว่าวันนี้เข้าแถวกลางแจ้งได้ไหม",
        "text": "\"ช่วยครูตัดสินใจ ตี 6\""
      },
      {
        "time": "0:41-0:45",
        "shot": "CODE",
        "picture": "Loop back: the first stalled wind map, lines start moving again. Last card slides in.",
        "vo": "ส่งให้เพื่อนที่ยังต้องเข้าแถวกลางแจ้ง แล้วสมัคร Elemental ลิงก์ที่ไบโอ ฝุ่นไม่รอ เราก็ไม่รอ",
        "text": "\"Elemental 5-7 ธ.ค.\" / \"199 บาท หรือ 149 ต่อคน (2+)\" / \"รางวัลรวมมูลค่า 20,000 บาท\"; last frame: \"ฝุ่นไม่รอ\""
      }
    ],
    "credits": [
      "Weather: Open-Meteo.com (CC BY 4.0), Copernicus CAMS",
      "Fire dots: NASA FIRMS"
    ],
    "build": "Dust Day Card for my school: today's PM2.5 colour from the nearest station plus a stagnant-air warning for the next 2 days.",
    "backup": false,
    "alt": false
  },
  {
    "id": "air-2",
    "element": "air",
    "title": "ไฟเยอะขึ้น แต่วันแย่น้อยลง",
    "day": "2026-11-30",
    "ticket": "HAC-67",
    "length": 40,
    "hook": "เชียงใหม่ มกราคมถึงพฤษภาคม 2569 จุดความร้อน 11,023 จุด ปีก่อน 6,314",
    "rows": [
      {
        "time": "0:00-0:04",
        "shot": "CODE",
        "picture": "Frame 1 already moving: white ticks pour onto a grey plate, counter rolls to 11,023 a second smaller counter 6,314 appears at its side with a bar.",
        "vo": "เชียงใหม่ มกราคมถึงพฤษภาคม 2569 จุดความร้อน 11,023 จุด ปีก่อน 6,314",
        "text": "\"11,023 จุด\" / \"ปีก่อน 6,314\"; 2569\""
      },
      {
        "time": "0:04-0:08",
        "shot": "CODE",
        "picture": "Card \"1.7 เท่า\" for fires, then the turn: a bar for bad days drops by 7.",
        "vo": "ไฟมากขึ้น 1.7 เท่า แต่วันที่ฝุ่นเกินมาตรฐาน น้อยกว่าปีก่อน 7 วัน",
        "text": "\"ไฟ +1.7 เท่า\" / \"วันเกินมาตรฐาน -7\""
      },
      {
        "time": "0:08-0:14",
        "shot": "CODE",
        "picture": "Dive (log zoom) to a point near Mae Rim. Reticle snaps on, amber reading rolls to 409.",
        "vo": "แต่ 4 เมษายน 9 โมงเช้า เครื่องวัดที่โรงพยาบาลนครพิงค์ แม่ริม อ่านได้ 409",
        "text": "\"409 µg/m³\" / \"เครื่องเดียว เวลา 9 โมง\"; 2569\""
      },
      {
        "time": "0:14-0:20",
        "shot": "CODE",
        "picture": "Same dive, another dial: bar up to \"27 เท่า\" of the WHO 24-hour limit (15).",
        "vo": "สูงกว่าเกณฑ์ WHO รายวันราว 27 เท่า",
        "text": "\"~27 เท่า WHO (คำนวณเอง)\""
      },
      {
        "time": "0:20-0:27",
        "shot": "CODE",
        "picture": "Locked nadir frame, scan swaps 12 Feb to 29 Mar 2025: maroon patches appear on hillsides. Hairline outlines print around three.",
        "vo": "ดาวเทียมเห็นรอยไหม้บนเนิน รายงานบอกว่าจุดความร้อนส่วนใหญ่อยู่ในป่า",
        "text": "\"รอยไหม้บนเขา\" / \"ภาพตัวอย่าง 2568\"; credit \"Contains modified Copernicus Sentinel data 2025\""
      },
      {
        "time": "0:27-0:31",
        "shot": "CODE",
        "picture": "Strip chart drawn on: wind line 3 km/h flat for 1 to 5 April 2026.",
        "vo": "สัปดาห์นั้น ลมเฉลี่ยแค่ 3 กม./ชม.",
        "text": "\"ลม ~3 กม./ชม.; 1-5 เม.ย.\"; footer \"Open-Meteo\""
      },
      {
        "time": "0:31-0:34",
        "shot": "CODE",
        "picture": "Big question mark card in caption-news style.",
        "vo": "ไฟเยอะขึ้น วันแย่น้อยลง ยังไม่มีใครเผยแพร่คำตอบ",
        "text": "\"ทำไม? ยังไม่มีคำตอบ\""
      },
      {
        "time": "0:34-0:38",
        "shot": "FACE",
        "picture": "Big to camera, outdoors in daylight or at a desk with a map on the wall.",
        "vo": "คุณดับไฟบนภูเขาไม่ได้ แต่บอกหมู่บ้านล่วงหน้าได้ ว่าควันกำลังไปทางไหน",
        "text": "\"ควันกำลังไปทางไหน?\""
      },
      {
        "time": "0:38-0:42",
        "shot": "CODE",
        "picture": "Ticks drift in a direction with wind arrows, then settle end card.",
        "vo": "ส่งให้เพื่อนที่อยู่ภาคเหนือ แล้วสมัคร Elemental ลิงก์ที่ไบโอ ไฟเยอะ ไม่ใช่ทั้งเรื่อง",
        "text": "\"Elemental 5-7 ธ.ค.\" / \"199 บาท หรือ 149 ต่อคน (2+)\" / \"รางวัลรวมมูลค่า 20,000 บาท\""
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2025",
      "Fire data: NASA FIRMS",
      "Wind: Open-Meteo.com (CC BY 4.0)"
    ],
    "build": "Smoke Heading Card for one village: hotspots upwind in the last 48 h plus the nearest station colour, back-tested on 2025.",
    "backup": false,
    "alt": false
  },
  {
    "id": "air-3",
    "element": "air",
    "title": "ตรวจ 752 โรงงาน แต่ไม่มีใครวัดกลิ่น",
    "day": "2026-12-02",
    "ticket": null,
    "length": 38,
    "hook": "ตรวจโรงงานกำจัดกากและรีไซเคิล 752 แห่ง ฝ่าฝืน พ.ร.บ.โรงงาน 375 แห่ง",
    "rows": [
      {
        "time": "0:00-0:04",
        "shot": "CODE",
        "picture": "Frame 1 moving: 752 dots stream in 375 flip to the accent colour counter rolls to 375.",
        "vo": "ตรวจโรงงานกำจัดกากและรีไซเคิล 752 แห่ง ฝ่าฝืน พ.ร.บ.โรงงาน 375 แห่ง",
        "text": "\"752 ตรวจ\" / \"375 ฝ่าฝืน\"; 2569\""
      },
      {
        "time": "0:04-0:08",
        "shot": "CODE",
        "picture": "Date strip: 2 to 9 พ.ย. 2569 fills map of Thailand outline (no basemap) with 5 pilot provinces marked.",
        "vo": "ตรวจทั่วประเทศ 2 ถึง 9 พฤศจิกายน",
        "text": "\"2-9 พ.ย.; 2569 ทั่วประเทศ\""
      },
      {
        "time": "0:08-0:15",
        "shot": "CODE",
        "picture": "Two bars grow side by side: pilot 296 of 380, the rest 79 of 372. Percentages land.",
        "vo": "5 จังหวัดนำร่อง ฝ่าฝืน 296 จาก 380 ที่เหลือ 79 จาก 372",
        "text": "\"78%\" vs \"21%\" with \"(คำนวณเอง)\"; \"ปราจีนบุรี ชลบุรี ฉะเชิงเทรา ระยอง สมุทรปราการ\" small"
      },
      {
        "time": "0:15-0:19",
        "shot": "CODE",
        "picture": "Card slides in hard: a grey empty box labelled \"กลิ่น\" sits beside the filled boxes of the data.",
        "vo": "แต่การตรวจครั้งนี้ ไม่ได้วัดกลิ่น",
        "text": "\"ตรวจกฎหมาย ไม่ได้วัดกลิ่น\""
      },
      {
        "time": "0:19-0:25",
        "shot": "CODE",
        "picture": "Date card: 7 ธ.ค. 2568 a 200-dot cluster in the shape of a crowd, no faces.",
        "vo": "ธันวาคม 2568 ชาวบ้านเกือบ 200 คน ที่ อ.พนัสนิคม ชลบุรี ออกมาประท้วงกลิ่น",
        "text": "\"~200 คน ประท้วงกลิ่น\"; 2568\"; small \"ชาวบ้านระบุ ยังมีการเดินเครื่อง\""
      },
      {
        "time": "0:25-0:31",
        "shot": "SCREEN",
        "picture": "Screen recording: Open-Meteo archive, wind direction by hour for an example point, a sheet columns \"time / smell? / wind from\".",
        "vo": "กลิ่นไม่เก็บบันทึก ถ้าไม่มีใครจดเวลา กับทิศลม",
        "text": "\"เวลา + ทิศลม = ข้อมูล\"; label \"ตัวอย่าง\""
      },
      {
        "time": "0:31-0:35",
        "shot": "FACE",
        "picture": "Big to camera, indoors, close.",
        "vo": "คุณดมแทนเครื่องไม่ได้ แต่ทำสมุดบันทึกกลิ่นให้เป็นข้อมูลได้",
        "text": "\"ทำให้กลิ่นเป็นข้อมูล\""
      },
      {
        "time": "0:35-0:38",
        "shot": "CODE",
        "picture": "End card slides in last frame, the empty \"กลิ่น\" box is filled with a dot.",
        "vo": "ส่งให้เพื่อนที่อยู่ใกล้โรงงาน แล้วสมัคร Elemental ลิงก์ที่ไบโอ ให้กลิ่นมีหลักฐาน",
        "text": "\"Elemental 5-7 ธ.ค.\" / \"199 บาท หรือ 149 ต่อคน (2+)\" / \"รางวัลรวมมูลค่า 20,000 บาท\""
      }
    ],
    "credits": [
      "Wind: Open-Meteo.com (CC BY 4.0)"
    ],
    "build": "Smell Log with Wind: a one-page log of smell hours joined to wind direction, drawn as a wind rose.",
    "backup": true,
    "alt": false
  },
  {
    "id": "earth-a",
    "element": "earth",
    "title": "ดูจากอวกาศ: ปราจีนบุรี",
    "day": "2026-11-28",
    "ticket": "HAC-68",
    "length": 38,
    "hook": "โรงงานกำจัดกากถูกตรวจ 947 แห่ง ผิดกฎหมาย 512",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "FACE",
        "picture": "Big, mid-gesture, looking into lens, phone up. Hard cut at 1.5 s to a counter rolling on grey: 947 lands, then 512 in amber",
        "vo": "โรงงานกำจัดกากถูกตรวจ 947 แห่ง ผิดกฎหมาย 512",
        "text": "947 ตรวจ / 512 ผิดกฎหมาย (colour block on \"512\") / tag: กระทรวงอุตสาหกรรม 2-22 พ.ย.; 2569"
      },
      {
        "time": "0:03-0:07",
        "shot": "CODE",
        "picture": "Orbit, limb in frame, dive to nadir over Prachinburi. 2024 plate, grey grade, instrument line",
        "vo": "นี่ปราจีนบุรี 7 ตุลาคม 2567 ภาพดาวเทียมสาธารณะ ใครก็เปิดดูได้ฟรี",
        "text": "7 ต.ค.; 2567 / ดาวเทียมฟรี"
      },
      {
        "time": "0:07-0:13",
        "shot": "CODE",
        "picture": "Locked nadir, 3% creep. Scan front sweeps N to S, 2026 plate. Amber reading rolls 4.7% to 24.9% and lands with a small pop a thin white outline traces the water edge",
        "vo": "วันเดียวกัน ปี 2569 น้ำในกรอบนี้ จาก 4.7% เป็น 24.9%",
        "text": "4.7% → 24.9% / ของกรอบภาพ / tag: Sentinel-2"
      },
      {
        "time": "0:13-0:19",
        "shot": "CODE",
        "picture": "Hold on 2026 frame, slow push toward the north-west water. Caption card over the picture",
        "vo": "ภาพวันเดียว ยังไม่เห็นบ่อขยะ แต่ปราจีนบุรีน้ำท่วมช่วง ก.ย. ถึง ต.ค. ปีนี้",
        "text": "ภาพวันเดียว / ไม่มีบ่อขยะในภาพ"
      },
      {
        "time": "0:19-0:23",
        "shot": "CODE",
        "picture": "Plain card, one keyword on colour block",
        "vo": "น้ำใกล้บ่อฝังกลบแห่งหนึ่ง ตรวจพบน้ำมันปิโตรเลียมสูงผิดปกติ",
        "text": "สูงผิดปกติ"
      },
      {
        "time": "0:23-0:27",
        "shot": "CODE",
        "picture": "Province outline in grey, dots appear one by one up to a counter",
        "vo": "นักวิจัยนับบ่อทิ้งขยะที่ต้องสงสัยในจังหวัดนี้ กว่า 60 แห่ง",
        "text": "60+ ต้องสงสัย / นักวิจัยนับ"
      },
      {
        "time": "0:27-0:31",
        "shot": "SCREEN",
        "picture": "Screen recording of Copernicus Browser, search \"ปราจีนบุรี\", pick two dates, drag compare slider",
        "vo": "(cut to FACE on the last second)",
        "text": "ฟรี ไม่ต้องสมัคร / copernicus.eu browser"
      },
      {
        "time": "0:31-0:34",
        "shot": "FACE",
        "picture": "Big, direct, turn",
        "vo": "ห้ามน้ำท่วมไม่ได้ แต่ทำให้ทุกหมู่บ้านเห็นรอยน้ำท่วมของตัวเองได้",
        "text": "ช่วยได้"
      },
      {
        "time": "0:34-0:37",
        "shot": "CODE",
        "picture": "Calendar flips to 30, truck icons line up (10+) heading to a Rayong pin",
        "vo": "30 พ.ย. กระทรวงจะไปดูรถกว่า 10 คันขนกากออกจากปราจีนบุรี ติดตามดู",
        "text": "30 พ.ย.; รถกว่า 10 คัน / tag: กระทรวงอุตสาหกรรม 24 พ.ย.; 2569"
      },
      {
        "time": "0:37-0:41",
        "shot": "FACE",
        "picture": "Big points down. Card: send / sign up. Counter \"2,102 โรงงาน\" appears last",
        "vo": "โรงงานอีก 2,102 แห่งยังไม่ถูกตรวจ ส่งให้เพื่อนที่บ้านอยู่ใกล้โรงงาน แล้วกดสมัครที่ลิงก์ในไบโอ",
        "text": "ส่งให้เพื่อน / ลิงก์ในไบโอ / 5-7 ธ.ค.; / 2,102 โรงงาน ยังไม่ถูกตรวจ"
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2024, 2026"
    ],
    "build": "Flood-footprint card: two satellite scenes side by side plus the water share, for a village.",
    "backup": false,
    "alt": false
  },
  {
    "id": "earth-b",
    "element": "earth",
    "title": "ศุลกากรเปิดตู้: นำเข้าเศษโลหะ",
    "day": "2026-12-03",
    "ticket": null,
    "length": 30,
    "hook": "ศุลกากรเปิดตู้ 18 ตู้ 12 ตู้แจ้งว่าเป็นเศษเหล็ก",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "CODE",
        "picture": "Cold open on grey container wall (flat vector, not a photo) opening one by one, 18 doors 12 tint amber",
        "vo": "ศุลกากรเปิดตู้ 18 ตู้ 12 ตู้แจ้งว่าเป็นเศษเหล็ก",
        "text": "18 ตู้ เปิดตรวจ / 12 ตู้ แจ้งเศษเหล็ก / แหลมฉบัง มี.ค.; 2569"
      },
      {
        "time": "0:03-0:06",
        "shot": "CODE",
        "picture": "Cream paper wipes in. First bar rises: 2016",
        "vo": "เศษอะลูมิเนียมนำเข้า ปี 2559 เจ็ดหมื่นเจ็ดพัน ตัน",
        "text": "2559 / 77,493 ตัน / UN Comtrade"
      },
      {
        "time": "0:06-0:10",
        "shot": "CODE",
        "picture": "Bars run 2017 to 2024 with rising pitch camera pulls up to keep the tall bar in frame the 2024 bar lands with a pop",
        "vo": "ปี 2567 เจ็ดแสนเก้าหมื่น ตัน มากขึ้นสิบเท่า",
        "text": "10 เท่า (colour block) / 790,388 ตัน"
      },
      {
        "time": "0:10-0:14",
        "shot": "CODE",
        "picture": "Pencil swaps from blue to red. Note pinned on the 2024 bar",
        "vo": "นี่คือเศษโลหะทั้งหมด ไม่ใช่ขยะอิเล็กทรอนิกส์ทั้งหมด รหัสศุลกากรแยกไม่ออกว่าอันไหนคืออันไหน",
        "text": "นี่คือเศษโลหะ ไม่ใช่ e-waste"
      },
      {
        "time": "0:14-0:19",
        "shot": "CODE",
        "picture": "Pull back to a map pin at Rayong building tiles appear, 9 of 15 tint amber",
        "vo": "เลยต้องมีคนเปิดดูข้างใน ต.ค. ที่ระยอง พบขยะอิเล็กทรอนิกส์กับเศษโลหะกว่า 2,500 ตัน",
        "text": "2,500+ ตัน / นิคมพัฒนา ระยอง 16 ต.ค.; 2569"
      },
      {
        "time": "0:19-0:22",
        "shot": "CODE",
        "picture": "Same tiles 9 tint",
        "vo": "จาก 15 อาคาร 9 อาคารไม่มีใบอนุญาตโรงงาน",
        "text": "9 จาก 15 ไม่มีใบอนุญาต"
      },
      {
        "time": "0:22-0:26",
        "shot": "FACE",
        "picture": "Big, direct (turn)",
        "vo": "เปิดทุกตู้ไม่ได้ แต่ช่วยร้านรับซื้อของเก่ารู้ได้ว่าชิ้นไหนอันตราย",
        "text": "ช่วยได้"
      },
      {
        "time": "0:26-0:30",
        "shot": "FACE",
        "picture": "Card",
        "vo": "ส่งให้เพื่อนที่ที่บ้านรับซื้อของเก่า แล้วสมัครที่ลิงก์ในไบโอ ศุลกากรเปิดตู้ได้ทีละตู้ คุณเปิดดูตัวเลขได้ฟรี",
        "text": "ส่งให้เพื่อน / ลิงก์ในไบโอ / 5-7 ธ.ค."
      }
    ],
    "credits": [
      "UN Comtrade, HS 7602, net weight"
    ],
    "build": "Scrap-shop hazard card: a 1-page Thai guide and phone page telling small scrap shops which items are hazardous and what not to do.",
    "backup": true,
    "alt": false
  },
  {
    "id": "earth-c",
    "element": "earth",
    "title": "10 คันรถ 258 ตัน",
    "day": "2026-12-02",
    "ticket": null,
    "length": 32,
    "hook": "รถ 10 คัน กากแคดเมียม 258 ตัน ขนกลับตาก",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "CODE",
        "picture": "10 truck icons enter in a row on the map and roll toward Tak",
        "vo": "รถ 10 คัน กากแคดเมียม 258 ตัน ขนกลับตาก",
        "text": "10 คัน 258 ตัน"
      },
      {
        "time": "0:03-0:09",
        "shot": "CODE",
        "picture": "Camera pulls back route line draws from Tak down to Samut Sakhon",
        "vo": "ปี 2567 กากราว 13,000 ตันถูกขนออกจากบ่อฝังกลบในตากอย่างผิดกฎหมาย",
        "text": "~13,000 ตัน / ขนออกผิดกฎหมาย / รายงานข่าว เม.ย.-พ.ค.; 2567"
      },
      {
        "time": "0:09-0:16",
        "shot": "CODE",
        "picture": "Route ends at a Samut Sakhon foundry marker 34 person icons, 17 tint",
        "vo": "บางส่วนไปถึงโรงงานในสมุทรสาคร คนในละแวกนั้น 34 คน 17 คนเข้ารักษาตัวในโรงพยาบาล",
        "text": "17 จาก 34 / เข้ารักษา / เนชั่น 18 เม.ย.; 2567"
      },
      {
        "time": "0:16-0:20",
        "shot": "CODE",
        "picture": "5 of the 17 tint amber",
        "vo": "ในนั้น 5 คน มีแคดเมียมในปัสสาวะสูง",
        "text": "5 คนสูง / ไม่ใช่ 17 คนป่วย"
      },
      {
        "time": "0:20-0:25",
        "shot": "CODE",
        "picture": "Truck row returns a \"?\" on each hop in the chain",
        "vo": "เจ้าหน้าที่ตามพบราว 12,400 ตัน ของที่เปลี่ยนมือหลายทอด และไม่มีอะไรตามมันไป",
        "text": "~12,400 ตัน ตามพบ"
      },
      {
        "time": "0:25-0:28",
        "shot": "FACE",
        "picture": "Big, direct (turn)",
        "vo": "ขุดทั้งประเทศไม่ได้ แต่ให้กากหนึ่งกอง มีพาสปอร์ตได้",
        "text": "พาสปอร์ตกาก"
      },
      {
        "time": "0:28-0:32",
        "shot": "FACE",
        "picture": "Card",
        "vo": "ส่งให้เพื่อนที่คิดว่ากากมันหายไปเอง แล้วสมัครที่ลิงก์ในไบโอ",
        "text": "ส่งให้เพื่อน / ลิงก์ในไบโอ / 5-7 ธ.ค."
      }
    ],
    "credits": [],
    "build": "Waste passport demo: a QR page for one fake batch of waste with origin, weight, destination and a red flag if weight in is not weight out.",
    "backup": true,
    "alt": false
  },
  {
    "id": "earth-d",
    "element": "earth",
    "title": "400 เที่ยวรถ",
    "day": "2026-12-03",
    "ticket": null,
    "length": 32,
    "hook": "กาก 6,000 ตัน เท่ากับ 400 เที่ยวรถ ในโกดังเดียว",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "CODE",
        "picture": "Grid starts empty dots fill row by row to 400, one pitch per row",
        "vo": "กาก 6,000 ตัน เท่ากับ 400 เที่ยวรถ ในโกดังเดียว",
        "text": "400 เที่ยว / 6,000+ ตัน ÷ 15 / (คำนวณเอง) / เนชั่น 19 พ.ย.; 2569"
      },
      {
        "time": "0:03-0:08",
        "shot": "CODE",
        "picture": "Zoom into one dot six element tags peel off: As, Cd, Pb, Hg, Ni, Sb",
        "vo": "พฤศจิกายน ตรวจพบที่แปลงยาว ฉะเชิงเทรา เครื่องตรวจเบื้องต้นพบ สารหนู แคดเมียม ตะกั่ว ปรอท",
        "text": "คัดกรองเบื้องต้น (XRF) / ไม่ใช่ผลแล็บ"
      },
      {
        "time": "0:08-0:13",
        "shot": "CODE",
        "picture": "Plain card money icons",
        "vo": "ตามรายงาน คนขนได้เที่ยวละ 10,000 ถึง 15,000 บาท ต่อ 15 ตัน",
        "text": "10,000-15,000 บาท / ตามรายงาน / เนชั่น 19 พ.ย.; 2569"
      },
      {
        "time": "0:13-0:18",
        "shot": "CODE",
        "picture": "Grid shrinks to a corner a second grid fills for 50,000 t (3,333 dots drawn as a dense block)",
        "vo": "ปีก่อน พบกากราว 50,000 ตัน ฝังอยู่ในอำเภอเดียวกัน",
        "text": "~50,000 ตัน / ก.ค.; 2568 / ฝังในอำเภอแปลงยาว"
      },
      {
        "time": "0:18-0:22",
        "shot": "CODE",
        "picture": "Pencil swaps to red note \"ตัวเลขนี้เก่ากว่า ตอนนี้อาจมากกว่า\"",
        "vo": "และนั่นคือตัวเลขเก่า",
        "text": "ตัวเลขเก่า"
      },
      {
        "time": "0:22-0:27",
        "shot": "FACE",
        "picture": "Big (turn)",
        "vo": "ขุดขึ้นมาทั้งหมดไม่ได้ แต่ช่วยให้คนอ่านผลตรวจกากเป็นได้",
        "text": "ช่วยได้"
      },
      {
        "time": "0:27-0:32",
        "shot": "FACE",
        "picture": "Card. Last frame returns to the full grid",
        "vo": "ส่งให้เพื่อนที่บ้านอยู่ใกล้ไร่ แล้วสมัครที่ลิงก์ในไบโอ อีก 400 เที่ยวยังรออยู่",
        "text": "ส่งให้เพื่อน / ลิงก์ในไบโอ / 5-7 ธ.ค."
      }
    ],
    "credits": [],
    "build": "XRF result decoder: a Thai phone page that explains what a quick-screen result can and cannot say about six elements.",
    "backup": true,
    "alt": false
  },
  {
    "id": "five-elements",
    "element": "five",
    "title": "จากแม่น้ำกก สู่ 5 ธาตุ",
    "day": "2026-11-29",
    "ticket": "HAC-61",
    "length": 42,
    "hook": "ปี 2023 ตรงนี้ยังเป็นป่า",
    "rows": [
      {
        "time": "0:00",
        "shot": "CODE",
        "picture": "compare frame, top",
        "vo": "ปี 2023 ตรงนี้ยังเป็นป่า",
        "text": "2023"
      },
      {
        "time": "0:02",
        "shot": "CODE",
        "picture": "compare frame, bottom",
        "vo": "ปี 2026 กลายเป็นแบบนี้",
        "text": "2026"
      },
      {
        "time": "0:04",
        "shot": "SCREEN",
        "picture": "map",
        "vo": "ข้ามชายแดนไป ต้นแม่น้ำกก",
        "text": ""
      },
      {
        "time": "0:07",
        "shot": "FACE",
        "picture": "Big",
        "vo": "หลายคนคิดว่าไกลตัว\nแต่มลพิษไม่เคยรู้จักเส้นแบ่งเขตแดน",
        "text": ""
      },
      {
        "time": "0:12",
        "shot": "CODE",
        "picture": "river map",
        "vo": "สารหนูไหลลงแม่น้ำกก แม่น้ำสาย\nจนเริ่มเจอในแม่น้ำโขง",
        "text": ""
      },
      {
        "time": "0:17",
        "shot": "SCREEN",
        "picture": "news headline",
        "vo": "ปลาอย่างน้อย 10 ชนิด กรมประมงเตือนอย่ากิน",
        "text": "ปลา 10 ชนิด"
      },
      {
        "time": "0:20",
        "shot": "FACE",
        "picture": "Big",
        "vo": "และไม่ใช่แค่น้ำ",
        "text": ""
      },
      {
        "time": "0:22",
        "shot": "CODE",
        "picture": "Earth poster art",
        "vo": "ดิน: โรงงานขยะอิเล็กทรอนิกส์เถื่อน",
        "text": "ดิน"
      },
      {
        "time": "0:24",
        "shot": "CODE",
        "picture": "Air poster art",
        "vo": "ลม: ฝุ่น PM2.5 จากการเผา",
        "text": "ลม"
      },
      {
        "time": "0:26",
        "shot": "CODE",
        "picture": "Fire poster art",
        "vo": "ไฟ: โกดังสารเคมีไฟไหม้หลายวัน",
        "text": "ไฟ"
      },
      {
        "time": "0:28",
        "shot": "CODE",
        "picture": "Aether poster art",
        "vo": "และธาตุที่ 5 ที่มองไม่เห็น: ข่าวปลอม",
        "text": "Aether"
      },
      {
        "time": "0:31",
        "shot": "FACE",
        "picture": "Big",
        "vo": "ถ้าไม่อยากแค่นั่งดู\nเอาไอเดียมาลงสนามจริง",
        "text": ""
      },
      {
        "time": "0:35",
        "shot": "CODE",
        "picture": "end cards",
        "vo": "The Next Decade: Elemental\n5–7 ธ.ค. ม.3–ม.6 ทีม 2–5 คน",
        "text": "5–7 ธ.ค."
      },
      {
        "time": "0:38",
        "shot": "CODE",
        "picture": "end card",
        "vo": "199 บาท มา 2 คนขึ้นไป คนละ 149",
        "text": "199 / 149 บาท"
      },
      {
        "time": "0:40",
        "shot": "CODE",
        "picture": "cut back to the 2023 forest frame",
        "vo": "งานแข่งหาทางออกให้ธรรมชาติ ก่อนธรรมชาติจะให้เราออก",
        "text": ""
      }
    ],
    "credits": [
      "Contains modified Copernicus Sentinel data 2023, 2026"
    ],
    "build": "The Next Decade: Elemental, 5 to 7 Dec. A 3-day build that helps one real person.",
    "backup": false,
    "alt": false
  },
  {
    "id": "aether-1",
    "element": "aether",
    "title": "600,000 ครั้ง: เช็กต้นทางใน 30 วินาที",
    "day": "2026-12-01",
    "ticket": "HAC-69",
    "length": 41,
    "hook": "ดู 600,000 ครั้ง แต่เช็กฟรีก็รู้ว่าปลอม",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "FACE",
        "picture": "Big, close, phone in hand, looks into the lens. Over the shoulder-height third, the counter rolls 0 → 600,000 in 1 s, red box around it. Hard cut at 3.0",
        "vo": "ดู 600,000 ครั้ง แต่เช็กฟรีก็รู้ว่าปลอม",
        "text": "600,000 (counter) then ดู 600,000 ครั้ง"
      },
      {
        "time": "0:03-0:08",
        "shot": "CODE",
        "picture": "Claim card cuts in (typeset, not the clip): \"ผู้สูงอายุทุกคนรับ 10,000\" and red strike-through draws left to right. Under it, the real figure cuts in on a paper card (#E4E0D4, ink #1D1D1B) typed out. Source tag chip above",
        "vo": "คลิปบอกผู้สูงอายุทุกคนได้ 10,000 บาท ของจริงคือ 600 ถึง 1,000 บาท",
        "text": "10,000 struck out; ของจริง 600-1,000 บาท; 2569"
      },
      {
        "time": "0:08-0:11",
        "shot": "CODE",
        "picture": "(CUT IF OVER 45 s.) Two small gauges fill: audio 98.4%, video 76%, then a red label slams on: คำใบ้ ไม่ใช่คำตัดสิน",
        "vo": "ตัวตรวจจับ AI ให้เสียง 98.4% ภาพ 76% แต่นั่นเป็นแค่คำใบ้",
        "text": "เสียง 98.4%, ภาพ 76%, เป็นแค่คำใบ้"
      },
      {
        "time": "0:11-0:19",
        "shot": "SCREEN",
        "picture": "Screen recording of the reverse image search check on a neutral example image (not the scam): upload, results load, scroll to the matches, a red circle (drawn in post) closes around the oldest match and its date. 2 cuts inside the shot so it never holds 4 s",
        "vo": "แล้วเขารู้ได้ไง ใช้ Google Lens ฟรี ค้นจากภาพในคลิป",
        "text": "ค้นภาพ ฟรี; tag Google Lens"
      },
      {
        "time": "0:19-0:24",
        "shot": "CODE",
        "picture": "Two-row sync. Row 1 (original): paper card \"งานแถลงข่าวจริง\" with 7 ก.ย. 2568. Row 2: dashed empty frame \"คลิปปลอม (ไม่แสดง)\" with 26 เม.ย. 2569. A red dashed line connects \"same footage\". Readout changes from view counter to dates",
        "vo": "เจอฉากเดียวกัน จากงานแถลงข่าวจริงเมื่อ 7 กันยายน 2568",
        "text": "ฉากเดียวกัน; 7 ก.ย.; 2568 / 26 เม.ย.; 2569"
      },
      {
        "time": "0:24-0:29",
        "shot": "CODE",
        "picture": "Readout turns into a day counter: T+44 ticks 1 per 0.1 s from 13 มี.ค. 2569 to 26 เม.ย. 2569. Red circle on the channel-age bar",
        "vo": "ช่องนี้เพิ่งสร้างเมื่อ 13 มีนาคม 2569 อายุราว 6 สัปดาห์ตอนโพสต์",
        "text": "ช่องอายุ 6 สัปดาห์; 13 มี.ค.; → 26 เม.ย."
      },
      {
        "time": "0:29-0:34",
        "shot": "FACE",
        "picture": "Big again, calmer, same framing as 0:00 (loop). On \"30 วินาที\" cut to the card \"เช็ก 30 วินาที\": four rows tick in one by one: 1 ค้นภาพ, 2 ดูอายุช่อง, 3 ดูยอดจริงจากหน่วยงาน, 4 ตัวตรวจจับ = คำใบ้",
        "vo": "คุณหยุดคลิปปลอมทุกคลิปไม่ได้ แต่ช่วยให้คนหนึ่งคนเช็กได้ใน 30 วินาที",
        "text": "ช่วยคนหนึ่งคน เช็กใน 30 วินาที then the 4 rows"
      },
      {
        "time": "0:34-0:37",
        "shot": "CODE",
        "picture": "Card turns into a poster-like \"build\" strip: วัน 1 รวม 10 คลิปที่ถูกหักล้างแล้ว, วัน 2 ทำบัตร, วัน 3 ทดสอบ. Wipes in",
        "vo": "ทีมคุณสร้างบัตรนี้ได้ใน 3 วัน",
        "text": "ทำบัตรเช็กใน 3 วัน"
      },
      {
        "time": "0:37-0:41",
        "shot": "FACE",
        "picture": "Big, close. Cut to end card: ดิน น้ำ ลม ไฟ + Aether, 5-7 ธ.ค., ลิงก์ในไบโอ",
        "vo": "ส่งให้คนที่ชอบแชร์คลิปในไลน์ครอบครัว แล้วมาสมัครด้วย ดิน น้ำ ลม ไฟ บวก Aether ห้า ถึงเจ็ดธันวา ลิงก์ในไบโอ เช็กก่อนส่งต่อ",
        "text": "ส่งให้คนที่ชอบแชร์คลิป; ลิงก์ในไบโอ; last card: เช็กก่อนส่งต่อ"
      }
    ],
    "credits": [
      "If a NASA photo is used: ภาพตัวอย่าง: NASA"
    ],
    "build": "30-Second Origin Check: a Thai page or chat rich menu with 4 steps, each tied to a free tool, to check a clip fast.",
    "backup": false,
    "alt": false
  },
  {
    "id": "aether-2",
    "element": "aether",
    "title": "บัญชีม้า: เยาวชนเพิ่ม 70.3%",
    "day": "2026-12-02",
    "ticket": null,
    "length": 42,
    "hook": "มิจฉาชีพไม่ได้อยากได้เงินคุณ อยากได้บัญชีคุณ",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "FACE",
        "picture": "Big, close, hands empty (no card, no phone screen, no account number). Over Big, counter rolls 3,371 → 5,741 in 1 s",
        "vo": "มิจฉาชีพไม่ได้อยากได้เงินคุณ อยากได้บัญชีคุณ",
        "text": "3,371 → 5,741"
      },
      {
        "time": "0:03-0:07",
        "shot": "CODE",
        "picture": "Paper definition card typed out",
        "vo": "บัญชีม้า คือบัญชีที่ถูกใช้รับแล้วโอนเงินต่อให้มิจฉาชีพ",
        "text": "บัญชีม้า = บัญชีรับโอนแทนมิจฉาชีพ"
      },
      {
        "time": "0:07-0:10",
        "shot": "SCREEN",
        "picture": "Scroll the news article to the paragraph a highlighter wipes over 3,371, 5,741, 70.3%",
        "vo": "ธนาคารแห่งประเทศไทยรายงานบัญชีม้าของเยาวชน",
        "text": "tag ธปท.; · 2 ส.ค.; 2569"
      },
      {
        "time": "0:10-0:16",
        "shot": "CODE",
        "picture": "Vertical dumbbell: pencil drops dot 1 (ม.ค. 2568, 3,371) then dot 2 (มี.ค. 2569, 5,741), axis ratchets up handwriting note in blue \"14 เดือน\" a red +70.3% pins to the top",
        "vo": "จาก 3,371 บัญชี เมื่อมกราคม 2568 เป็น 5,741 มีนาคม 2569 เพิ่ม 70.3%",
        "text": "+70.3%"
      },
      {
        "time": "0:16-0:21",
        "shot": "CODE",
        "picture": "Pull back: the dumbbell shrinks into one dot beside a huge dot. Counter: 5,092 cases, then 160 ล้านบาท note \"สัปดาห์เดียว\"",
        "vo": "ในสัปดาห์เดียวเมื่อมิถุนายน ตำรวจรับแจ้ง 5,092 คดี เสียหายราว 160 ล้านบาท",
        "text": "5,092 คดี, 160 ล้านบาท, สัปดาห์เดียว; tag ตำรวจ · 21-27 มิ.ย.; 2569"
      },
      {
        "time": "0:21-0:26",
        "shot": "CODE",
        "picture": "Bar grows to 185 ล้านบาท, pencil circles it",
        "vo": "บัญชีม้าเยาวชนโยงกับคดีที่เสียหายกว่า 185 ล้านบาท",
        "text": "กว่า 185 ล้านบาท; tag ตำรวจ · ต.ค.; 2568-พ.ค.; 2569"
      },
      {
        "time": "0:26-0:30",
        "shot": "CODE",
        "picture": "Staircase by age: bars 3,000, 5,000, 10,000 baht with age brackets tilted label \"วงเงินต่อวัน\"",
        "vo": "ธปท. กำหนดวงเงินต่อวันตามอายุ ตั้งแต่ 3,000 ถึง 10,000 บาท",
        "text": "3,000 / 5,000 / 10,000; tag ธปท."
      },
      {
        "time": "0:30-0:35",
        "shot": "FACE",
        "picture": "Big, calm cut to blue-lead note (the pencil changes lead) \"ช่วยเพื่อนหนึ่งคน\": a card with 3 questions appears",
        "vo": "ปิดทุกบัญชีไม่ได้ แต่ช่วยเพื่อนหนึ่งคนให้ปฏิเสธเป็นได้",
        "text": "ช่วยเพื่อนหนึ่งคน ปฏิเสธเป็น"
      },
      {
        "time": "0:35-0:38",
        "shot": "CODE",
        "picture": "3-day strip (see build)",
        "vo": "ทีมคุณสร้างแบบทดสอบนี้ได้ใน 3 วัน",
        "text": "ทำแบบทดสอบใน 3 วัน"
      },
      {
        "time": "0:38-0:42",
        "shot": "FACE",
        "picture": "Big, close end card as in video 1",
        "vo": "ส่งให้เพื่อนที่เพิ่งมีบัญชีเป็นของตัวเอง แล้วมาสมัครแข่ง ลิงก์ในไบโอ บัญชีนี้ เป็นของคุณ",
        "text": "ส่งให้เพื่อนที่เพิ่งเปิดบัญชี; ลิงก์ในไบโอ; last card บัญชีของคุณ"
      }
    ],
    "credits": [],
    "build": "\"ลองปฏิเสธ\" test: a 60-second quiz of 10 generic messages, answer accept or refuse, then why.",
    "backup": true,
    "alt": false
  },
  {
    "id": "aether-3",
    "element": "aether",
    "title": "9 จาก 42: ศูนย์ข้อมูลที่แผนที่ไม่เห็น",
    "day": "2026-12-03",
    "ticket": null,
    "length": 40,
    "hook": "ศูนย์ข้อมูลในไทย 42 แห่ง แต่บนแผนที่เปิดมีแค่ 9",
    "rows": [
      {
        "time": "0:00-0:03",
        "shot": "CODE",
        "picture": "Cream paper, Thailand outline, dots pop in one by one with pitch steps, counter 1 → 9. Big is not needed for the hook (frame 1 is the motion). Optional: Big's voice only",
        "vo": "ศูนย์ข้อมูลในไทย 42 แห่ง แต่บนแผนที่เปิดมีแค่ 9",
        "text": "9 / 42"
      },
      {
        "time": "0:03-0:08",
        "shot": "CODE",
        "picture": "Camera pushes on the Bangkok-Chonburi cluster (8 of 9), pulls out to show the 9th in the north. Source tag slides in",
        "vo": "นี่คือที่ถูกแท็กไว้ ไม่ใช่ที่สร้างแล้ว",
        "text": "9 จุด ที่แท็กไว้; tag OpenStreetMap · 24 พ.ย.; 2569"
      },
      {
        "time": "0:08-0:14",
        "shot": "SCREEN",
        "picture": "Screen recording of Overpass Turbo: paste the query, press Run, dots appear, the results line shows 10 objects a note says \"1 อยู่ในลาว ตัดออก\" so the viewer reaches 9",
        "vo": "เช็กเองได้ฟรี วางคำค้น กด Run ได้ 9 จุดในไทย (ตัดจุดนอกประเทศออก 1)",
        "text": "เช็กเองฟรี; tag Overpass Turbo"
      },
      {
        "time": "0:14-0:18",
        "shot": "CODE",
        "picture": "Waffle: 42 squares, 9 fill red, 33 stay dashed outline. Note in blue \"ยังไม่ได้จับคู่รายชื่อ\"",
        "vo": "รัฐนับว่ามี 42 แห่งที่เปิดใช้",
        "text": "42 เปิดใช้; tag NESDC · 31 ส.ค.; 2569"
      },
      {
        "time": "0:18-0:25",
        "shot": "CODE",
        "picture": "Three bars to scale, drawn by the pencil: 8.8 (blue), 35 (red, a stamp \"ใบสมัคร\" on it), ประมาณ 40 (ink, hatched). A red note \"ไม่ใช่ที่สร้างแล้ว\"",
        "vo": "ใบสมัครสร้างศูนย์ข้อมูลรวม 35 กิกะวัตต์ ใกล้ยอดใช้ไฟสูงสุดของทั้งประเทศ ประมาณ 40 โฆษกกระทรวงพลังงานบอกแผนร่างคิดไว้ 8.8 และเรียกส่วนที่เกินว่าดีมานด์ผี",
        "text": "ใบสมัคร 35 GW; ยอดสูงสุด ประมาณ 40; แผนร่าง 8.8; tag โฆษก กระทรวงพลังงาน · 16 ก.ย.; 2569"
      },
      {
        "time": "0:25-0:30",
        "shot": "CODE",
        "picture": "Zoom into one tiny square of the waffle, pencil writes \"0.2 GW\" and \"3.3 ล้าน ลบ.ม./ปี\". The number morphs into 36,900 little people dots (unit chart)",
        "vo": "ที่ชลบุรี ศูนย์ขนาด 0.2 กิกะวัตต์ทำสัญญาใช้น้ำปีละ 3.3 ล้านลูกบาศก์เมตร เท่ากับคนราว 36,900 คนใช้ทั้งปี",
        "text": "36,900 คน; 2569"
      },
      {
        "time": "0:30-0:35",
        "shot": "FACE",
        "picture": "Big, calm on \"เห็นว่ามันอยู่ตรงไหน\" cut to the map a new dot lands with a blue ring",
        "vo": "คุณหยุดการใช้ไฟของ AI ไม่ได้ แต่ช่วยให้ทุกคนเห็นได้ว่ามันอยู่ตรงไหน",
        "text": "ช่วยให้แผนที่ตามทัน"
      },
      {
        "time": "0:35-0:38",
        "shot": "CODE",
        "picture": "3-day strip",
        "vo": "ทีมคุณสร้างแผนที่นี้ได้ใน 3 วัน",
        "text": "ทำแผนที่ใน 3 วัน"
      },
      {
        "time": "0:38-0:42",
        "shot": "FACE",
        "picture": "Big close end card",
        "vo": "ส่งให้เพื่อนที่ใช้ AI ทุกวัน แล้วมาสมัครแข่ง ลิงก์ในไบโอ แผนที่นี้ยังมีที่ว่างให้คุณวาด",
        "text": "ส่งให้เพื่อนที่ใช้ AI ทุกวัน; ลิงก์ในไบโอ; last แผนที่ยังมีที่ว่าง"
      }
    ],
    "credits": [
      "ข้อมูลแผนที่ © OpenStreetMap contributors (ODbL)"
    ],
    "build": "Map the Gap: find sites with two public sources that the 9-point map lacks, and put them on one web map.",
    "backup": true,
    "alt": false
  }
];
