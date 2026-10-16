import type { PosterCopy } from "./poster";
import { SHIFT_COHORTS, formatThaiDateRange } from "@/lib/content/shift-cohort";

/** Public copy only. Dynamic identifiers and private record data never enter artwork. */
const ADMIN_FOOTER = "เฉพาะทีม PassionSeed · ต้องล็อกอินแอดมิน";
const admin = (title: string, subtitle: string, label: string): PosterCopy => ({ title, subtitle, label, footer: ADMIN_FOOTER, theme: "dusk" });

/** Team-only pages: say what the link opens, so a pasted link reads clearly in chat. */
const ADMIN_PAGES: Record<string, PosterCopy> = {
  "/admin": admin("ADMIN", "ห้องทำงานของทีม: ใบสมัคร ลีด และ PathLab", "TEAM WORKSPACE"),
  "/admin/shift": admin("SHIFT TRACKER", "ติดตามน้องทุกรุ่น และจดโน้ตรายสัปดาห์", "ADMIN / SHIFT"),
  "/admin/shift/applications": admin("APPLICATIONS", "ตรวจใบสมัคร เช็กการโอน แล้วส่งน้องเข้า Tracker", "ADMIN / SHIFT"),
  "/admin/shift/camp": admin("LIVE CAMP", "จัดกลุ่ม ดูงานจริง และตอบคำขอช่วยระหว่างแคมป์", "ADMIN / SHIFT"),
  "/admin/shift/companion": admin("COMPANION", "เครื่องมือของพี่เลี้ยงระหว่างแคมป์ SHIFT", "ADMIN / SHIFT"),
  "/admin/shift/seedstack": admin("SEEDSTACK", "ใครติดตั้ง ล็อกสโคป และ ship แล้ว ไม่ต้องไล่ถาม", "ADMIN / SHIFT"),
  "/admin/shift/feedback": admin("FEEDBACK", "คำตอบหลังจบรุ่น คะแนน และวันที่น้องสะดวก", "ADMIN / SHIFT"),
  "/admin/shift/alumni": admin("ALUMNI", "ใครกดไปด้วย ในแต่ละนัดศิษย์เก่า", "ADMIN / SHIFT"),
  "/admin/shift/views": admin("PAGE VIEWS", "คนที่เข้าหน้า SHIFT มาจากช่องทางไหน", "ADMIN / SHIFT"),
};

/** Internal poster studios, one per round, titled with the round they export. */
function shiftPosterPages(): Record<string, PosterCopy> {
  const pages: Record<string, PosterCopy> = {};
  for (const cohort of SHIFT_COHORTS) {
    const footer = `${formatThaiDateRange(cohort.startDate, cohort.endDate)} · Live Project · Pivot Log`;
    pages[`/shift/poster/${cohort.round}`] = { title: cohort.name, subtitle: "สตูดิโอโปสเตอร์ของรุ่นนี้ สำหรับทีม", label: "SHIFT / POSTER STUDIO", footer };
    pages[`/shift/poster/${cohort.round}/grid`] = { title: cohort.name, subtitle: "IG grid สามโพสต์ ที่ปกต่อกันเป็นภาพเดียว", label: "SHIFT / IG GRID", footer };
  }
  return pages;
}

const PAGES: Record<string, PosterCopy> = {
  "/": { title: "PASSIONSEED", subtitle: "เลือกทางของตัวเอง เริ่มจากลงมือทำ", label: "YOUR NEXT CHAPTER" },
  "/shift": { title: "SHIFT", subtitle: "7 วัน ปั้น 1 โปรเจกต์จริง", label: "7 DAYS / REAL PROJECTS", footer: "Live Project · Pivot Log · 1-Page Case Study" },
  "/shift/school": { title: "SHIFT", subtitle: "7 วัน สร้างของจริง ให้คนจริงใช้", label: "FOR SCHOOLS", footer: "Live Project · Pivot Log · 1-Page Case Study" },
  "/techseed": { title: "TECHSEED", subtitle: "จากคนใช้เทคโนโลยี สู่คนสร้างผลงานจริง", label: "MADE BY STUDENTS" },
  "/pathlab": { title: "PATHLAB", subtitle: "ลองทำงานจริง แล้วค้นพบว่าทางนี้ใช่ไหม", label: "TRY A REAL PATH" },
  "/pathlab/for-parents": { title: "PATHLAB", subtitle: "ให้ลูกได้ลอง ก่อนตัดสินใจเลือกอนาคต", label: "FOR PARENTS" },
  "/pathlab/partner": { title: "BUILD WITH US", subtitle: "เปิดโลกงานจริงให้คนรุ่นใหม่", label: "PATHLAB / PARTNERS", theme: "dusk" },
  "/talent": { title: "NEXT GEN", subtitle: "พบคนรุ่นใหม่ ผ่านผลงานที่เขาสร้างเอง", label: "TALENT / REAL WORK", theme: "dusk" },
  "/expert-interview": { title: "YOUR EXPERIENCE", subtitle: "ประสบการณ์ของคุณ เปิดทางให้ใครอีกคนได้", label: "MEET THE EXPERTS", theme: "dusk" },
  "/radar": { title: "RADAR", subtitle: "สำรวจเส้นทาง ค้นพบสิ่งที่อยากลอง", label: "FIND YOUR DIRECTION" },
  "/faculty-radar": { title: "FACULTY RADAR", subtitle: "สำรวจคณะและเส้นทางที่อยากไป", label: "EXPLORE YOUR OPTIONS" },
  "/direction-finder": { title: "FIND YOUR WAY", subtitle: "เริ่มจากตัวคุณ แล้วค่อยเลือกก้าวต่อไป", label: "DIRECTION FINDER" },
  "/hackathon": { title: "HACKATHON", subtitle: "รวมทีม ลงมือสร้าง แก้ปัญหาจริง", label: "THE NEXT DECADE", theme: "bloom" },
  "/hackathon/gallery": { title: "BUILT BY US", subtitle: "ไอเดียของนักเรียน ที่กลายเป็นผลงานจริง", label: "HACKATHON / GALLERY", theme: "bloom" },
  "/seeds": { title: "PLANT A SEED", subtitle: "เลือกสิ่งที่อยากลอง แล้วเริ่มลงมือทำ", label: "EXPLORE / LEARN / BUILD" },
  "/map": { title: "YOUR NEXT STEP", subtitle: "ทุกก้าวที่ลงมือทำ พาคุณไปข้างหน้า", label: "LEARNING MAPS" },
  "/workshops": { title: "LEARN BY DOING", subtitle: "ลองสิ่งใหม่ สร้างอะไรที่เป็นของคุณ", label: "WORKSHOPS" },
  "/communities": { title: "FIND YOUR PEOPLE", subtitle: "เติบโตไปกับคนที่ชอบลงมือทำเหมือนกัน", label: "COMMUNITIES" },
  "/about": { title: "WHY WE BUILD", subtitle: "เราเชื่อว่าคนรุ่นใหม่ควรได้เลือกทางของตัวเอง", label: "ABOUT PASSIONSEED" },
  "/contact": { title: "LET’S TALK", subtitle: "คุยกับเราเรื่องก้าวต่อไปของคุณ", label: "CONTACT" },
  "/link": { title: "START HERE", subtitle: "ทุกทางไปต่อของ PassionSeed อยู่ที่นี่", label: "LINKS / PASSIONSEED" },
  "/tips/[slug]": { title: "YOUR NEXT MOVE", subtitle: "ทิปส์เล็ก ๆ สำหรับก้าวต่อไปของคุณ", label: "TIPS / PASSIONSEED" },
  ...shiftPosterPages(),
  ...ADMIN_PAGES,
};

const WORDS: Record<string, string> = { cs: "Computer Science", csii: "CSII", tcas: "TCAS", tos: "Terms of Service", fi: "Founder Institute", mkt: "Marketing", ps: "PassionSeed", b2b: "Partners", me: "My Space", u: "Builder Profile", "hackathon-old": "Hackathon Archive", "for-parents": "For Parents" };
function words(segment: string) {
  return WORDS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function copyForRoute(route: string): PosterCopy {
  if (PAGES[route]) return PAGES[route];
  const segments = route.split("/").filter(Boolean);
  const visible = segments.filter((s) => !s.startsWith("[") && !s.startsWith("("));
  const family = PAGES[`/${visible[0]}`];
  const title = words(visible.at(-1) ?? "PassionSeed").toUpperCase();
  if (visible[0] === "admin") {
    const section = visible.length > 2 ? `ADMIN / ${words(visible[1]).toUpperCase()}` : "ADMIN";
    return admin(title, "พื้นที่ทำงานของทีม PassionSeed", section);
  }
  return {
    title,
    subtitle: family?.subtitle ?? "พื้นที่สำหรับก้าวต่อไปของคุณ",
    // renderPoster already prefixes PASSIONSEED, so top-level pages stay unprefixed.
    label: visible.length > 1 ? `${words(visible[0]).toUpperCase()} / YOUR NEXT CHAPTER` : "EXPLORE",
    theme: visible[0] === "work" ? "dusk" : family?.theme,
  };
}
