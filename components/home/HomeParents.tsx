import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { HomeHeading, accentFor, tint } from "./homeTheme";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import { HOME_NOTES, HOME_PARENT_ICONS, HOME_PARENT_POINTS } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

export function HomeParents() {
  return (
    <section className="py-10 sm:py-20">
      <HomeHeading eyebrow="สำหรับผู้ปกครอง">สิ่งที่ลูกได้ คือหลักฐาน ไม่ใช่คำโฆษณา</HomeHeading>
      <div className="mt-8 grid gap-3 md:mt-10 md:grid-cols-3 md:gap-5">
        {HOME_PARENT_POINTS.map((point, i) => (
          <div key={point.title} className={`home-card ${revealClass(i)} flex items-start gap-4 p-5 md:block md:p-7`}>
            <RisoIcon flat name={HOME_PARENT_ICONS[i]} ink={accentFor(i)} size={44} className={`${floatClass(i)} shrink-0`} />
            <div>
              <h3 className="font-kodchasan text-lg font-semibold leading-snug md:mt-5 md:text-xl">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed md:mt-3" style={{ color: tint("b8") }}>
                {point.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <MarginNote className="mt-10">{HOME_NOTES.parents}</MarginNote>
    </section>
  );
}
