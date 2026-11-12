import { RisoIcon } from "@/components/shift/poster/RisoIcons";
import { RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import { HOME_NOTES, HOME_PARENT_ICONS, HOME_PARENT_POINTS } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

export function HomeParents() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="สำหรับผู้ปกครอง">สิ่งที่ลูกได้ คือหลักฐาน ไม่ใช่คำโฆษณา</RisoHeading>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {HOME_PARENT_POINTS.map((point, i) => (
          <div key={point.title} className={`shift-tile ${revealClass(i)} p-6 sm:p-7`}>
            <RisoIcon name={HOME_PARENT_ICONS[i]} ink={inkFor(i)} size={52} className={floatClass(i)} />
            <h3 className="mt-5 font-kodchasan text-xl font-semibold">{point.title}</h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
              {point.body}
            </p>
          </div>
        ))}
      </div>
      <MarginNote className="mt-10">{HOME_NOTES.parents}</MarginNote>
    </section>
  );
}
