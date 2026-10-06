import type { PosterCopy } from "./poster";

/** Public copy only. Dynamic identifiers and private record data never enter artwork. */
const PAGES: Record<string, PosterCopy> = {
  "/": { title: "PASSIONSEED", subtitle: "เลือกทางของตัวเอง เริ่มจากลงมือทำ", label: "YOUR NEXT CHAPTER" },
  "/shift": { title: "SHIFT", subtitle: "7 วัน ปั้น 1 โปรเจกต์จริง", label: "7 DAYS / REAL PROJECTS", footer: "Live Project · Pivot Log · 1-Page Case Study" },
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
  const title = words(visible.at(-1) ?? "PassionSeed");
  const prefix = visible.length > 1 ? words(visible[0]) : "PassionSeed";
  return {
    title: title.toUpperCase(),
    subtitle: family?.subtitle ?? "พื้นที่สำหรับก้าวต่อไปของคุณ",
    label: `${prefix.toUpperCase()} / ${visible.length > 1 ? "YOUR NEXT CHAPTER" : "EXPLORE"}`,
    theme: visible[0] === "admin" || visible[0] === "work" ? "dusk" : family?.theme,
  };
}
