import type { ReactNode } from "react";

import gallery from "@/components/shift/shiftGallery.module.css";

interface SchoolSectionProps {
  id: string;
  eyebrow: string;
  heading: string;
  /** Short right-aligned aside; "\n" breaks the line. Hidden on phones. */
  aside?: string;
  /** Margin-note copy from NOTES; at most one per section. */
  note?: string;
  noteTilt?: "left" | "right";
  children: ReactNode;
}

/**
 * One editorial block of the /shift/school page: eyebrow, Kodchasan heading
 * and an optional aside, same construction as the /shift gallery sections,
 * so the proposal reads as part of the SHIFT print run.
 */
export function SchoolSection({
  id,
  eyebrow,
  heading,
  aside,
  note,
  noteTilt = "left",
  children,
}: SchoolSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={gallery.section} data-shift-reveal>
      <div className={gallery.sectionHeading}>
        <div>
          <p className={gallery.eyebrow}>{eyebrow}</p>
          <h2 id={headingId} className="font-kodchasan">
            {heading}
          </h2>
        </div>
        {aside && (
          <p className={gallery.sectionAside}>
            {aside.split("\n").map((line, index) => (
              <span key={line} className="block">
                {index > 0 && " "}
                {line}
              </span>
            ))}
          </p>
        )}
      </div>
      {children}
      {note && (
        <p className={gallery.note}>
          <span className={noteTilt === "right" ? "pathlab-note pathlab-note--tilt-r" : "pathlab-note"}>
            {note}
          </span>
        </p>
      )}
    </section>
  );
}
