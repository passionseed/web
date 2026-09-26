import { HairlineColumns, RisoHeading, RisoNumeral, paper } from "@/components/shift/ShiftRiso";
import { HOME_NOTES, HOME_PARENT_POINTS } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

export function HomeParents() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="สำหรับผู้ปกครอง">สิ่งที่ลูกได้ คือหลักฐาน ไม่ใช่คำโฆษณา</RisoHeading>
      <div className="mt-10">
        <HairlineColumns>
          {HOME_PARENT_POINTS.map((point, i) => (
            <div key={point.title}>
              <RisoNumeral index={i}>{i + 1}</RisoNumeral>
              <h3 className="mt-4 font-kodchasan text-xl font-semibold">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                {point.body}
              </p>
            </div>
          ))}
        </HairlineColumns>
      </div>
      <MarginNote className="mt-10">{HOME_NOTES.parents}</MarginNote>
    </section>
  );
}
